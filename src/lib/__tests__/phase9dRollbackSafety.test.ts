import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

describe('Phase 9D.9: Final Production Rollback Safety & Data Preservation Invariants', () => {
  const safeRollbackPath = join(process.cwd(), 'supabase', 'phase9d_safe_rollback_strategy.sql')
  const migrationPath = join(process.cwd(), 'supabase', 'migrations', '20261026000001_phase9d_feedback_center.sql')
  const initialSchemaPath = join(process.cwd(), 'supabase', 'migrations', '20261022000001_initial_schema.sql')
  const rlsSecurityPath = join(process.cwd(), 'supabase', 'migrations', '20261022000002_rls_and_security.sql')

  // Helper to extract non-comment executable SQL lines
  const getExecutableSql = (sql: string) =>
    sql
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('--'))
      .join('\n')

  describe('1. Non-Destructive Rollback Invariants (Zero Data Loss Mandate)', () => {
    it('verifies phase9d_safe_rollback_strategy.sql exists in repository', () => {
      assert.ok(existsSync(safeRollbackPath), 'Safe rollback SQL script must exist')
    })

    it('strictly forbids DROP TABLE on public.feedback_internal_notes or visitor_feedback in rollback SQL', () => {
      const sql = readFileSync(safeRollbackPath, 'utf-8')
      const exec = getExecutableSql(sql)
      assert.ok(
        !exec.toUpperCase().includes('DROP TABLE'),
        'Rollback executable SQL must NEVER drop tables'
      )
    })

    it('strictly forbids DROP COLUMN commands on public.visitor_feedback in rollback SQL', () => {
      const sql = readFileSync(safeRollbackPath, 'utf-8')
      const exec = getExecutableSql(sql)
      assert.ok(
        !exec.toUpperCase().includes('DROP COLUMN'),
        'Rollback executable SQL must NEVER drop columns from visitor_feedback'
      )
    })

    it('strictly forbids CASCADE table deletion on any production feedback tables', () => {
      const sql = readFileSync(safeRollbackPath, 'utf-8')
      const exec = getExecutableSql(sql)
      assert.ok(
        !exec.toUpperCase().includes('CASCADE'),
        'Rollback executable SQL must not use CASCADE table deletions'
      )
    })
  })

  describe('2. Data-Preserving Emergency Recovery & Soft Kill Switch', () => {
    it('implements soft kill switch by revoking execute on submit_unified_feedback from service_role', () => {
      const sql = readFileSync(safeRollbackPath, 'utf-8')
      assert.ok(
        sql.includes('REVOKE EXECUTE ON FUNCTION public.submit_unified_feedback') &&
          sql.includes('FROM service_role;'),
        'Soft kill switch must revoke RPC execution from service_role'
      )
    })

    it('freezes admin review mutations by revoking execute on admin_review_feedback', () => {
      const sql = readFileSync(safeRollbackPath, 'utf-8')
      assert.ok(
        sql.includes('REVOKE EXECUTE ON FUNCTION public.admin_review_feedback') &&
          sql.includes('FROM authenticated;'),
        'Rollback must revoke admin review execution from authenticated'
      )
    })

    it('implements quarantine RLS policy protecting feedback_internal_notes with public.is_admin()', () => {
      const sql = readFileSync(safeRollbackPath, 'utf-8')
      assert.ok(
        sql.includes('feedback_internal_notes_quarantine') &&
          sql.includes('USING (public.is_admin())'),
        'Quarantine policy must protect internal notes strictly with public.is_admin()'
      )
    })

    it('provides immutable archival snapshot tables for feedback and internal notes', () => {
      const sql = readFileSync(safeRollbackPath, 'utf-8')
      assert.ok(
        sql.includes('public.feedback_internal_notes_archive') &&
          sql.includes('public.visitor_feedback_archive'),
        'Rollback strategy must provide non-destructive archival snapshot tables'
      )
    })

    it('preserves clean re-enabling path for legacy Phase 8G visitor submissions if de-escalating', () => {
      const sql = readFileSync(safeRollbackPath, 'utf-8')
      assert.ok(
        sql.includes('GRANT EXECUTE ON FUNCTION public.submit_visitor_feedback') &&
          sql.includes('TO service_role;'),
        'Rollback must maintain re-enabling path for legacy submit_visitor_feedback'
      )
    })
  })

  describe('3. Historical Migration Registry Conformance & Idempotency', () => {
    it('verifies Phase 9D migration is 100% idempotent for systems applied outside Supabase registry', () => {
      const sql = readFileSync(migrationPath, 'utf-8')

      // Idempotent column additions
      assert.ok(
        sql.includes('ADD COLUMN IF NOT EXISTS user_type') &&
          sql.includes('ADD COLUMN IF NOT EXISTS status') &&
          sql.includes('ADD COLUMN IF NOT EXISTS student_id') &&
          sql.includes('ADD COLUMN IF NOT EXISTS user_id'),
        'Phase 9D migration columns must use ADD COLUMN IF NOT EXISTS'
      )

      // Idempotent table and index creation
      assert.ok(
        sql.includes('CREATE TABLE IF NOT EXISTS public.feedback_internal_notes'),
        'Internal notes table must use CREATE TABLE IF NOT EXISTS'
      )
      assert.ok(
        sql.includes('CREATE INDEX IF NOT EXISTS idx_feedback_internal_notes_feedback_id'),
        'Indexes must use CREATE INDEX IF NOT EXISTS'
      )

      // Idempotent constraints
      assert.ok(
        sql.includes('DROP CONSTRAINT IF EXISTS check_visitor_feedback_user_type'),
        'Constraints must safely drop prior versions before re-adding'
      )
    })
  })

  describe('4. Security Core Invariants: Admin, Profiles, Service Role & Issue Passport', () => {
    it('confirms public.is_admin() relies strictly on public.profiles with search_path locked', () => {
      const rlsSql = readFileSync(rlsSecurityPath, 'utf-8')
      assert.ok(
        rlsSql.includes('SELECT 1 FROM public.profiles') &&
          rlsSql.includes("WHERE id = auth.uid() AND role = 'admin'"),
        'is_admin() must query public.profiles directly'
      )
      assert.ok(
        rlsSql.includes('SET search_path = public, pg_temp;'),
        'is_admin() must lock search_path against search-path injection'
      )
    })

    it('confirms profile self-elevation to admin is blocked by trigger in Phase 9D', () => {
      const migrationSql = readFileSync(migrationPath, 'utf-8')
      assert.ok(
        migrationSql.includes('CREATE OR REPLACE FUNCTION public.prevent_role_self_elevation()') &&
          migrationSql.includes('Access Denied: Users cannot change their own security role.'),
        'Profile role self-elevation trigger must raise exception for non-admins'
      )
    })

    it('confirms service-role retains least-privilege administrative access to profiles and rate limits', () => {
      const migrationSql = readFileSync(migrationPath, 'utf-8')
      assert.ok(
        migrationSql.includes('GRANT ALL ON public.profiles TO service_role;'),
        'service_role must be granted profile inspection for identity verification'
      )
      assert.ok(
        migrationSql.includes('GRANT ALL ON TABLE public.feedback_rate_limits TO service_role;'),
        'service_role must be granted rate limit table maintenance'
      )
    })

    it('confirms Campus Issue Passport policies and evidence immutability remain strictly preserved', () => {
      const initialSql = readFileSync(initialSchemaPath, 'utf-8')
      const rlsSql = readFileSync(rlsSecurityPath, 'utf-8')

      // Issue immutability trigger
      assert.ok(
        initialSql.includes('CREATE TRIGGER trg_prevent_history_update') &&
          initialSql.includes('CREATE TRIGGER trg_prevent_history_delete'),
        'Issue history immutability triggers must remain intact'
      )

      // Issue integrity trigger
      assert.ok(
        rlsSql.includes('CREATE TRIGGER trg_issue_column_protection') &&
          rlsSql.includes('enforce_campus_issue_integrity'),
        'Campus issue update integrity trigger must be enforced'
      )

      // Storage policies for campus-issue-photos
      assert.ok(
        rlsSql.includes('campus_issues_select_policy') &&
          rlsSql.includes('reporter_id = auth.uid() OR public.is_admin()'),
        'Campus issues read policy must remain reporter_id or is_admin()'
      )
    })
  })
})
