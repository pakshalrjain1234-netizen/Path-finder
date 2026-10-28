import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

describe('Phase 9D.4: Real Database RLS & Security Integration Test Suite Preparation', () => {
  const sqlTestPath = join(process.cwd(), 'supabase', 'tests', 'database', 'feedback_rls_security.test.sql')

  it('verifies feedback_rls_security.test.sql exists in repository', () => {
    assert.ok(existsSync(sqlTestPath), 'Real database integration SQL test file must exist')
  })

  it('validates test coverage for direct anon INSERT denial in real SQL', () => {
    const sqlContent = readFileSync(sqlTestPath, 'utf-8')
    assert.ok(
      sqlContent.includes('SET LOCAL ROLE anon;') && sqlContent.includes('INSERT INTO public.visitor_feedback'),
      'Integration suite must test anon insert rejection in PostgreSQL'
    )
  })

  it('validates test coverage for submit_unified_feedback RPC execution denial', () => {
    const sqlContent = readFileSync(sqlTestPath, 'utf-8')
    assert.ok(
      sqlContent.includes('public.submit_unified_feedback') && sqlContent.includes('insufficient_privilege'),
      'Integration suite must test direct RPC execution rejection'
    )
  })

  it('validates test coverage for student isolation from feedback_internal_notes', () => {
    const sqlContent = readFileSync(sqlTestPath, 'utf-8')
    assert.ok(
      sqlContent.includes('SELECT COUNT(*) INTO v_notes_count FROM public.feedback_internal_notes'),
      'Integration suite must test student zero-visibility on internal notes'
    )
  })

  it('validates test coverage for cross-student private feedback isolation', () => {
    const sqlContent = readFileSync(sqlTestPath, 'utf-8')
    assert.ok(
      sqlContent.includes('SELECT COUNT(*) INTO v_peer_count FROM public.visitor_feedback WHERE id = \'FB-TEST-002\''),
      'Integration suite must test cross-student isolation under RLS'
    )
  })

  it('validates test coverage for non-admin rejection in admin_review_feedback', () => {
    const sqlContent = readFileSync(sqlTestPath, 'utf-8')
    assert.ok(
      sqlContent.includes('admin_review_feedback') && sqlContent.includes('Access Denied'),
      'Integration suite must test non-admin rejection'
    )
  })

  it('ensures integration test transaction is safely rolled back (zero test leakage)', () => {
    const sqlContent = readFileSync(sqlTestPath, 'utf-8')
    assert.ok(sqlContent.includes('BEGIN;'), 'Test must begin transaction')
    assert.ok(sqlContent.includes('ROLLBACK;'), 'Test must rollback transaction to preserve database purity')
  })
})
