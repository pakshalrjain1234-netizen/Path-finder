// ==============================================================================
// Supabase Edge Function: submit-feedback (Phase 9D.4 Hardened & Production Ready)
// Purpose: Secure unified endpoint for Visitor and Student feedback.
// Enforces server-side authentication validation, profile identity derivation,
// anti-impersonation controls, trusted edge IP extraction, and atomic rate limiting.
// ==============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const ALLOWED_CATEGORIES = [
  // Visitor categories (Phase 9D.1 Feature 2)
  'Campus visit experience',
  '3D virtual tour experience',
  'Clarity of college information',
  'General suggestions',
  // Student categories (Phase 9D.1 Feature 3)
  'Campus facilities',
  'Campus navigation experience',
  'Student services',
  'Suggestions for improvement',
  // Legacy categories (backward compatibility)
  'Campus 3D experience',
  'Navigation experience',
  'Campus information',
  'Website usability',
  'General suggestion',
] as const

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Validates IPv4 or IPv6 format to reject header injection or malformed data
function isValidIpAddress(ip: string): boolean {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/
  return ipv4Regex.test(ip) || ipv6Regex.test(ip)
}

// Extracts client IP strictly from trusted edge infrastructure (Cloudflare / Edge proxy).
// Arbitrary client-spoofed headers like X-Forwarded-For are explicitly rejected.
function getTrustedClientIp(req: Request): string {
  // 1. Primary trusted header: Cloudflare Edge (overwritten by Cloudflare, unforgeable by client)
  const cfIp = req.headers.get('cf-connecting-ip')?.trim()
  if (cfIp && isValidIpAddress(cfIp)) {
    return cfIp
  }

  // 2. Secondary trusted header: Verified edge proxy real IP
  const realIp = req.headers.get('x-real-ip')?.trim()
  if (realIp && isValidIpAddress(realIp)) {
    return realIp
  }

  // 3. Fallback for missing or malformed edge headers (safe non-empty fallback)
  return 'unverified-edge-client'
}

// Compute privacy-preserving client hash using server secret salt
async function computeClientHash(trustedIp: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${trustedIp}::${salt}`)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    // 1. Enforce Server-Only FEEDBACK_SALT Configuration (Fail safely if missing or weak)
    const salt = Deno.env.get('FEEDBACK_SALT')
    if (!salt || salt.trim().length < 32) {
      console.error('CRITICAL SECURITY CONFIGURATION ERROR: FEEDBACK_SALT is missing or shorter than 32 characters.')
      return new Response(
        JSON.stringify({
          error: 'Server configuration error: Rate limiting salt is missing or unconfigured.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Enforce body payload size limit (max 10KB to prevent memory exhaustion)
    const contentLength = Number(req.headers.get('content-length') || 0)
    if (contentLength > 10240) {
      return new Response(
        JSON.stringify({ error: 'Payload too large. Maximum size is 10 KB.' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Invalid request body. JSON object expected.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { userType, rating, category, name, comments } = body

    // 3. Rating Validation (Optional, but if provided must be integer 1 to 5)
    let parsedRating: number | null = null
    if (rating !== undefined && rating !== null) {
      parsedRating = Number(rating)
      if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
        return new Response(
          JSON.stringify({ error: 'Rating must be an integer between 1 and 5.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // 4. Category Whitelist Validation
    if (!category || !ALLOWED_CATEGORIES.includes(category)) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing feedback category.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Comments Bounds Validation
    const cleanComments = typeof comments === 'string' ? comments.trim().slice(0, 2000) : ''
    if (cleanComments.length < 5) {
      return new Response(
        JSON.stringify({ error: 'Feedback comments must be at least 5 characters.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // 6. Server-Side Identity Validation & Anti-Impersonation
    let sanitizedUserType: 'visitor' | 'student' = 'visitor'
    let sanitizedStudentId: string | null = null
    let sanitizedDepartment: string | null = null
    let sanitizedName: string | null = null
    let sanitizedUserId: string | null = null

    if (userType === 'student') {
      // Student feedback requires an authenticated session
      const authHeader = req.headers.get('authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(
          JSON.stringify({
            error: 'Authentication required: Student feedback requires an active student session.',
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const token = authHeader.replace('Bearer ', '').trim()
      const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)

      if (userError || !userData?.user) {
        return new Response(
          JSON.stringify({
            error: 'Invalid or expired authentication session. Please log in again.',
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verify role from authoritative public.profiles table (cannot be spoofed by client)
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id, role, student_id, department, display_name')
        .eq('id', userData.user.id)
        .single()

      if (profileError || !profile || profile.role !== 'student') {
        return new Response(
          JSON.stringify({
            error: 'Access Denied: Only verified students can submit student feedback.',
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Authoritative identity derivation from server-side database record
      sanitizedUserType = 'student'
      sanitizedStudentId = profile.student_id || 'STUDENT_UNSPECIFIED'
      sanitizedDepartment = profile.department || 'General'
      sanitizedName = profile.display_name || userData.user.email || 'Student'
      sanitizedUserId = userData.user.id
    } else {
      // Visitor submission: strictly clean and disallow student fields
      sanitizedUserType = 'visitor'
      sanitizedStudentId = null
      sanitizedDepartment = null
      sanitizedUserId = null
      sanitizedName = typeof name === 'string' ? name.trim().slice(0, 120) : null
    }

    // 7. Server-Side Atomic Rate Limiting (Trusted Client IP Hash)
    const trustedIp = getTrustedClientIp(req)
    const clientHash = await computeClientHash(trustedIp, salt)

    const { data: ipAllowed, error: ipRateErr } = await supabaseAdmin.rpc(
      'check_and_record_feedback_rate_limit',
      {
        p_client_hash: clientHash,
        p_max_submissions: 5,
        p_window_interval: '10 minutes',
      }
    )

    if (ipRateErr || ipAllowed === false) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded: Too many feedback submissions. Please wait 10 minutes.',
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If authenticated student, also check per-student rate limit
    if (sanitizedUserId) {
      const { data: studentAllowed, error: studentRateErr } = await supabaseAdmin.rpc(
        'check_and_record_feedback_rate_limit',
        {
          p_client_hash: `student:${sanitizedUserId}`,
          p_max_submissions: 3,
          p_window_interval: '10 minutes',
        }
      )

      if (studentRateErr || studentAllowed === false) {
        return new Response(
          JSON.stringify({
            error: 'Rate limit exceeded: Student submission quota reached. Please wait 10 minutes.',
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // 8. Call PostgreSQL Atomic Submission RPC (Service-Role Only)
    const { data, error } = await supabaseAdmin.rpc('submit_unified_feedback', {
      p_user_type: sanitizedUserType,
      p_rating: parsedRating,
      p_category: category,
      p_name: sanitizedName,
      p_student_id: sanitizedStudentId,
      p_department: sanitizedDepartment,
      p_comments: cleanComments,
      p_client_ip_hash: clientHash,
      p_user_id: sanitizedUserId,
    })

    if (error) {
      console.error('Database RPC error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to record feedback. Please try again later.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        id: data?.id,
        message: 'Thank you! Your feedback has been safely recorded.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('Edge function unexpected exception:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error processing feedback.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
