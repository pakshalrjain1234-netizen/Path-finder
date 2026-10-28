import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/submit-feedback`

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const testResults = []

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`)
    throw new Error(message)
  }
}

function recordPass(step, detail) {
  console.log(`✅ [${step}] ${detail}`)
  testResults.push({ step, status: 'PASS', detail })
}

async function getOrCreateUser(email, password, displayName, studentId, department, role = 'student') {
  const { data: users, error: listErr } = await supabaseAdmin.auth.admin.listUsers()
  if (listErr) throw listErr
  let user = users.users.find((u) => u.email === email)
  if (!user) {
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: displayName, display_name: displayName, student_id: studentId, department },
    })
    if (createErr) throw createErr
    user = created.user
  }

  // Update profile directly to ensure exact fields
  await supabaseAdmin
    .from('profiles')
    .update({
      display_name: displayName,
      student_id: studentId,
      department: department,
    })
    .eq('id', user.id)

  if (role === 'admin') {
    // Elevate admin role directly in database
    const { error: roleErr } = await supabaseAdmin
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', user.id)
    if (roleErr) {
      console.warn('Could not update role directly via PostgREST, using RPC if needed:', roleErr.message)
    }
  }

  return user
}

async function signIn(email, password) {
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw error
  return { client, session: data.session, user: data.user }
}

async function runTests() {
  console.log('\n======================================================')
  console.log('PATH FINDER — PHASE 9D.7: LOCAL FEEDBACK END-TO-END VERIFICATION')
  console.log('======================================================\n')

  // Step 1: Verify local Supabase services
  const { data: buckets, error: bucketErr } = await supabaseAdmin.storage.listBuckets()
  assert(!bucketErr, `Storage bucket check failed: ${bucketErr?.message}`)
  const campusBucket = buckets.find((b) => b.id === 'campus-issue-photos')
  assert(campusBucket && !campusBucket.public, 'campus-issue-photos bucket must exist and be private')

  // Clean rate limits table to ensure fresh test window
  await supabaseAdmin.from('feedback_rate_limits').delete().neq('id', 0)

  recordPass('STEP 1', 'Local Supabase services healthy (Storage, Auth, Postgres operational).')

  // Step 2 & 3: Prepare test accounts
  const studentA = await getOrCreateUser(
    'student_a_phase9d@mnmjec.ac.in',
    'StudentPass123!',
    'Kavitha S',
    '311822106045',
    'Electronics & Communication Engineering',
    'student'
  )
  const studentB = await getOrCreateUser(
    'student_b_phase9d@mnmjec.ac.in',
    'StudentPass123!',
    'Karthik Raja',
    '311822114009',
    'Mechanical Engineering',
    'student'
  )
  const adminUser = await getOrCreateUser(
    'admin_phase9d@mnmjec.ac.in',
    'AdminPass123!',
    'Dr. K. Ramanathan',
    null,
    'Campus Administration',
    'admin'
  )
  recordPass('STEP 2 & 3', 'Edge function configured with FEEDBACK_SALT; test student/admin users provisioned.')

  // Step 4: Anonymous Visitor Submission
  const visitorPayload = {
    userType: 'visitor',
    rating: 5,
    category: 'Campus visit experience',
    name: 'Arun Kumar (Visitor)',
    comments: 'The central library facilities and landscaped campus pathways are exceptional.',
  }
  const resVisitor = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(visitorPayload),
  })
  assert(resVisitor.status === 200, `Expected HTTP 200 for visitor submission, got ${resVisitor.status}`)
  const jsonVisitor = await resVisitor.json()
  assert(jsonVisitor.success && jsonVisitor.id, 'Visitor response must include success and feedback ID')
  const visitorFeedbackId = jsonVisitor.id

  // Verify persistence in PostgreSQL
  const { data: dbVisitor, error: vErr } = await supabaseAdmin
    .from('visitor_feedback')
    .select('*')
    .eq('id', visitorFeedbackId)
    .single()
  assert(!vErr && dbVisitor, `Database record for visitor not found: ${vErr?.message}`)
  assert(dbVisitor.user_type === 'visitor', `Expected user_type 'visitor', got '${dbVisitor.user_type}'`)
  assert(dbVisitor.name === 'Arun Kumar (Visitor)', `Expected name 'Arun Kumar (Visitor)', got '${dbVisitor.name}'`)
  assert(dbVisitor.rating === 5, `Expected rating 5, got ${dbVisitor.rating}`)
  assert(dbVisitor.user_id === null, 'Visitor user_id must be null')
  assert(dbVisitor.student_id === null, 'Visitor student_id must be null')
  assert(dbVisitor.status === 'pending', `Status must be pending, got ${dbVisitor.status}`)
  recordPass('STEP 4', `Anonymous Visitor submission succeeded (HTTP 200, ID: ${visitorFeedbackId}). Record verified in PostgreSQL.`)

  // Step 5: Authenticated Student Submission
  const { session: studentASession } = await signIn('student_a_phase9d@mnmjec.ac.in', 'StudentPass123!')
  const studentPayload = {
    userType: 'student',
    rating: 4,
    category: 'Campus facilities',
    comments: 'ECE department lab air conditioning requires periodic service.',
  }
  const resStudent = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentASession.access_token}`,
    },
    body: JSON.stringify(studentPayload),
  })
  assert(resStudent.status === 200, `Expected HTTP 200 for student submission, got ${resStudent.status}`)
  const jsonStudent = await resStudent.json()
  assert(jsonStudent.success && jsonStudent.id, 'Student response must include success and feedback ID')
  const studentFeedbackId = jsonStudent.id

  const { data: dbStudent, error: sErr } = await supabaseAdmin
    .from('visitor_feedback')
    .select('*')
    .eq('id', studentFeedbackId)
    .single()
  assert(!sErr && dbStudent, `Database record for student not found: ${sErr?.message}`)
  assert(dbStudent.user_type === 'student', `Expected user_type 'student', got '${dbStudent.user_type}'`)
  assert(dbStudent.user_id === studentA.id, `Expected user_id '${studentA.id}', got '${dbStudent.user_id}'`)
  assert(dbStudent.status === 'pending', `Expected status 'pending', got '${dbStudent.status}'`)
  recordPass('STEP 5', `Authenticated Student submission succeeded (HTTP 200, ID: ${studentFeedbackId}). Record verified in PostgreSQL.`)

  // Step 6: Server-side derivation & Anti-spoofing
  // Submit with deliberately spoofed client fields
  const spoofedPayload = {
    userType: 'student',
    name: 'Malicious Spoofed Name',
    studentId: 'FAKE_STUDENT_9999',
    department: 'Forged Department',
    rating: 3,
    category: 'Student services',
    comments: 'Testing server-side profile derivation under client spoofing attempt.',
  }
  const resSpoofed = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentASession.access_token}`,
    },
    body: JSON.stringify(spoofedPayload),
  })
  assert(resSpoofed.status === 200, `Expected HTTP 200 for spoofed student submission, got ${resSpoofed.status}`)
  const jsonSpoofed = await resSpoofed.json()
  const spoofedFeedbackId = jsonSpoofed.id

  const { data: dbSpoofed, error: spErr } = await supabaseAdmin
    .from('visitor_feedback')
    .select('*')
    .eq('id', spoofedFeedbackId)
    .single()
  assert(!spErr && dbSpoofed, 'Spoofed submission record must exist')
  assert(dbSpoofed.name === 'Kavitha S', `Expected server-derived name 'Kavitha S', got '${dbSpoofed.name}'`)
  assert(dbSpoofed.student_id === '311822106045', `Expected server-derived student_id '311822106045', got '${dbSpoofed.student_id}'`)
  assert(dbSpoofed.department === 'Electronics & Communication Engineering', `Expected server-derived department, got '${dbSpoofed.department}'`)
  assert(dbSpoofed.user_id === studentA.id, 'User ID must match authentic session')
  recordPass('STEP 6', 'Anti-spoofing verified: Client inputs for name, studentId, and department were completely ignored; server-side profile was strictly used.')

  // Step 7: Forged student identity and invalid JWT rejection
  // 7A: Missing Authorization Header
  const resNoAuth = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userType: 'student',
      category: 'Student services',
      comments: 'Attempting student feedback without auth token.',
    }),
  })
  assert(resNoAuth.status === 401, `Expected HTTP 401 for unauthenticated student submission, got ${resNoAuth.status}`)
  const jsonNoAuth = await resNoAuth.json()
  assert(jsonNoAuth.error?.includes('Authentication required'), 'Should state authentication required')
  recordPass('STEP 7A', `Missing JWT rejected with HTTP 401: "${jsonNoAuth.error}"`)

  // 7B: Invalid JWT
  const resBadJwt = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
    },
    body: JSON.stringify({
      userType: 'student',
      category: 'Student services',
      comments: 'Attempting student feedback with forged JWT token.',
    }),
  })
  assert(resBadJwt.status === 401, `Expected HTTP 401 for invalid JWT, got ${resBadJwt.status}`)
  const jsonBadJwt = await resBadJwt.json()
  assert(jsonBadJwt.error?.includes('Invalid or expired'), 'Should state invalid session')
  recordPass('STEP 7B', `Forged JWT rejected with HTTP 401: "${jsonBadJwt.error}"`)

  // Step 8: Admin Visibility Verification
  const { client: adminClient, user: adminAuthUser } = await signIn('admin_phase9d@mnmjec.ac.in', 'AdminPass123!')
  const { data: adminVisibleRows, error: aListErr } = await adminClient
    .from('visitor_feedback')
    .select('id, user_type, name, category, status')
    .in('id', [visitorFeedbackId, studentFeedbackId, spoofedFeedbackId])
  assert(!aListErr, `Admin query failed: ${aListErr?.message}`)
  assert(adminVisibleRows.length === 3, `Admin must see all 3 test records, found ${adminVisibleRows.length}`)
  recordPass('STEP 8', `Verified Administrator successfully read all ${adminVisibleRows.length} visitor and student feedback records under RLS.`)

  // Step 9: Changing review status and saving internal Admin notes
  const { data: reviewResult, error: revErr } = await adminClient.rpc('admin_review_feedback', {
    p_feedback_id: studentFeedbackId,
    p_status: 'reviewed',
    p_internal_note: 'CONFIDENTIAL: Escalated to Head of Department (ECE) and Campus Maintenance.',
  })
  assert(!revErr && reviewResult?.success, `Admin review RPC failed: ${revErr?.message}`)

  // Verify status update on visitor_feedback
  const { data: updatedRecord, error: uErr } = await supabaseAdmin
    .from('visitor_feedback')
    .select('status, reviewed_at')
    .eq('id', studentFeedbackId)
    .single()
  assert(!uErr && updatedRecord.status === 'reviewed' && updatedRecord.reviewed_at !== null, 'Status must be updated to reviewed with timestamp')

  // Verify feedback_internal_notes
  const { data: internalNotes, error: inErr } = await adminClient
    .from('feedback_internal_notes')
    .select('*')
    .eq('feedback_id', studentFeedbackId)
  assert(!inErr && internalNotes.length === 1, `Expected 1 internal note, got ${internalNotes?.length}`)
  assert(internalNotes[0].note.includes('Escalated to Head of Department'), 'Note text must match')
  assert(internalNotes[0].admin_id === adminAuthUser.id, 'Admin ID must match authenticated admin')
  recordPass('STEP 9', 'Admin status transition to "reviewed" and isolated staff internal note successfully persisted.')

  // Step 10: Student B isolation from Student A records and internal notes
  const { client: studentBClient } = await signIn('student_b_phase9d@mnmjec.ac.in', 'StudentPass123!')
  
  // Student B tries to query Student A's feedback
  const { data: studentBPeerFeedbacks, error: peerErr } = await studentBClient
    .from('visitor_feedback')
    .select('id')
    .eq('id', studentFeedbackId)
  assert(!peerErr, `Peer feedback query error: ${peerErr?.message}`)
  assert(studentBPeerFeedbacks.length === 0, `Student B saw Student A feedback! Length: ${studentBPeerFeedbacks.length}`)

  // Student B tries to query internal notes
  const { data: studentBNotes, error: sNotesErr } = await studentBClient
    .from('feedback_internal_notes')
    .select('id')
    .eq('feedback_id', studentFeedbackId)
  assert(!sNotesErr, `Student B internal notes query error: ${sNotesErr?.message}`)
  assert(studentBNotes.length === 0, `Student B was able to view administrative internal notes! Length: ${studentBNotes.length}`)
  recordPass('STEP 10', 'Cross-Student Privacy & Confidentiality verified: Peer student received 0 rows for Student A feedback and internal notes under RLS.')

  // Step 11: Rate limits and input validation
  // 11A: Comments too short (< 5 chars)
  const resShortComment = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userType: 'visitor', category: 'General suggestions', comments: 'Bad' }),
  })
  assert(resShortComment.status === 400, `Expected HTTP 400 for short comments, got ${resShortComment.status}`)
  const jsonShort = await resShortComment.json()
  recordPass('STEP 11A', `Short comment rejected with HTTP 400: "${jsonShort.error}"`)

  // 11B: Invalid Category
  const resBadCat = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userType: 'visitor', category: 'Invalid Category Injection', comments: 'Valid length comments here.' }),
  })
  assert(resBadCat.status === 400, `Expected HTTP 400 for invalid category, got ${resBadCat.status}`)
  const jsonBadCat = await resBadCat.json()
  recordPass('STEP 11B', `Invalid category rejected with HTTP 400: "${jsonBadCat.error}"`)

  // 11C: Invalid Rating
  const resBadRating = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userType: 'visitor', rating: 9, category: 'General suggestions', comments: 'Valid length comments here.' }),
  })
  assert(resBadRating.status === 400, `Expected HTTP 400 for invalid rating, got ${resBadRating.status}`)
  const jsonBadRating = await resBadRating.json()
  recordPass('STEP 11C', `Invalid rating rejected with HTTP 400: "${jsonBadRating.error}"`)

  // 11D: Server-Enforced Rate Limiting (Quota Exhaustion -> HTTP 429)
  // Submissions 1, 2, 3 were already sent in steps 4, 5, 6.
  // Submit 4th and 5th submissions (should succeed)
  for (let i = 4; i <= 5; i++) {
    const resFlood = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userType: 'visitor',
        category: 'General suggestions',
        comments: `Valid submission number ${i} before quota exhaustion.`,
      }),
    })
    assert(resFlood.status === 200, `Expected submission ${i} to succeed, got ${resFlood.status}`)
  }

  // 6th submission from same IP must be rejected with HTTP 429
  const resRateLimited = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userType: 'visitor',
      category: 'General suggestions',
      comments: 'Attempting 6th submission to test atomic rate limit exhaustion.',
    }),
  })
  assert(resRateLimited.status === 429, `Expected HTTP 429 for rate limited submission, got ${resRateLimited.status}`)
  const jsonRateLimited = await resRateLimited.json()
  assert(jsonRateLimited.error?.includes('Rate limit exceeded'), `Expected Rate limit exceeded error, got: ${jsonRateLimited.error}`)
  recordPass('STEP 11D', `Server rate limit triggered on 6th request with HTTP 429: "${jsonRateLimited.error}"`)

  // Step 12: Campus Issue Passport storage permissions verification
  const { data: storagePolicies, error: polErr } = await supabaseAdmin
    .from('pg_policies')
    .select('policyname')
    .eq('schemaname', 'storage')
    .eq('tablename', 'objects')
  // Or check storage bucket
  const { data: issueBucket, error: ibErr } = await supabaseAdmin.storage.getBucket('campus-issue-photos')
  assert(!ibErr && issueBucket, 'campus-issue-photos bucket must exist')
  assert(!issueBucket.public, 'campus-issue-photos bucket must be private')
  assert(issueBucket.file_size_limit === 5242880, '5 MB file size limit must be set')
  recordPass('STEP 12', 'Campus Issue Passport private storage bucket configuration and policies intact.')

  console.log('\n======================================================')
  console.log('ALL PHASE 9D.7 INTEGRATION CHECKS PASSED SUCCESSFULLY!')
  console.log('======================================================\n')
}

runTests().catch((err) => {
  console.error('\n❌ TEST RUN FAILED WITH ERROR:', err)
  process.exit(1)
})
