-- ==============================================================================
-- PATH FINDER: Phase 9D.9 Non-Destructive Safe Rollback & Emergency Recovery
-- Institution: Misrimal Navajee Munoth Jain Engineering College (MNMJEC), Chennai
-- Target Supabase Project: lqqqrqajeqzdtvkfvrnp
--
-- CRITICAL SAFETY MANDATE (PHASE 9D.9):
-- 1. STRICT ZERO DATA LOSS: Table public.feedback_internal_notes must be permanently preserved.
-- 2. Schema integrity: Columns on public.visitor_feedback must be permanently preserved.
-- 3. Strict prohibition of table truncation or destructive removal on feedback data.
-- 4. Recovery is achieved via:
--    a) Permission Revocation (Soft Kill Switch)
--    b) Feature Flag / Route Deactivation
--    c) RLS Policy Quarantine
--    d) Re-enabling Legacy Phase 8G Visitor RPC if required
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- STAGE 1: IMMEDIATE SOFT KILL SWITCH (FEATURE DEACTIVATION WITHOUT DATA LOSS)
-- If an emergency occurs post-deployment (e.g. Edge Function regression or abuse),
-- immediately deactivate write paths by revoking RPC execution permissions.
-- All existing feedback and confidential notes remain 100% intact and preserved.
-- ------------------------------------------------------------------------------

-- 1.1 Deactivate Unified Feedback Submissions (Edge Function cannot insert)
REVOKE EXECUTE ON FUNCTION public.submit_unified_feedback(
    TEXT, INT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID
) FROM service_role;

-- 1.2 Deactivate Admin Review Status Mutations (Freezes feedback states)
REVOKE EXECUTE ON FUNCTION public.admin_review_feedback(
    TEXT, TEXT, TEXT
) FROM authenticated;

-- ------------------------------------------------------------------------------
-- STAGE 2: ACCESS QUARANTINE & LEAST-PRIVILEGE LOCKDOWN
-- In the event of a suspected isolation defect or privacy incident:
-- Restrict access to read-only for verified administrators while preventing
-- any further mutation. Students cannot query feedback while in quarantine.
-- ------------------------------------------------------------------------------

-- 2.1 Quarantine internal notes: Strictly verified admins only, read-only
DROP POLICY IF EXISTS "feedback_internal_notes_admin_only" ON public.feedback_internal_notes;
DROP POLICY IF EXISTS "feedback_internal_notes_quarantine" ON public.feedback_internal_notes;

CREATE POLICY "feedback_internal_notes_quarantine"
    ON public.feedback_internal_notes FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- Revoke mutation grants on internal notes during quarantine
REVOKE INSERT, UPDATE, DELETE ON public.feedback_internal_notes FROM authenticated;

-- 2.2 Quarantine visitor feedback: Students temporarily cannot read submissions
DROP POLICY IF EXISTS "feedback_select_student_own" ON public.visitor_feedback;
DROP POLICY IF EXISTS "feedback_admin_update" ON public.visitor_feedback;

-- Only verified administrators can inspect feedback during quarantine
DROP POLICY IF EXISTS "feedback_select_admin" ON public.visitor_feedback;
CREATE POLICY "feedback_select_admin"
    ON public.visitor_feedback FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- STAGE 3: DATA PRESERVATION & SECURE ARCHIVING (OPTIONAL COLD SNAPSHOT)
-- If schema modifications are ever required in a future maintenance window,
-- perform a non-destructive archive snapshot into isolated archival tables.
-- ------------------------------------------------------------------------------

DO $$
BEGIN
    -- Snapshot feedback_internal_notes into an immutable audit table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'feedback_internal_notes') THEN
        CREATE TABLE IF NOT EXISTS public.feedback_internal_notes_archive (
            archive_id BIGSERIAL PRIMARY KEY,
            archived_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            original_id BIGINT,
            feedback_id TEXT,
            admin_id UUID,
            admin_name TEXT,
            note TEXT,
            created_at TIMESTAMPTZ
        );

        INSERT INTO public.feedback_internal_notes_archive (
            original_id, feedback_id, admin_id, admin_name, note, created_at
        )
        SELECT id, feedback_id, admin_id, admin_name, note, created_at
        FROM public.feedback_internal_notes
        ON CONFLICT DO NOTHING;

        -- Lock archive table to service_role only
        ALTER TABLE public.feedback_internal_notes_archive ENABLE ROW LEVEL SECURITY;
        REVOKE ALL ON public.feedback_internal_notes_archive FROM PUBLIC, anon, authenticated;
        GRANT ALL ON public.feedback_internal_notes_archive TO service_role;
    END IF;

    -- Snapshot visitor_feedback into an immutable audit table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'visitor_feedback') THEN
        CREATE TABLE IF NOT EXISTS public.visitor_feedback_archive (
            archive_id BIGSERIAL PRIMARY KEY,
            archived_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            original_id TEXT,
            user_type TEXT,
            rating SMALLINT,
            category TEXT,
            name TEXT,
            student_id TEXT,
            department TEXT,
            comments TEXT,
            client_ip_hash TEXT,
            status TEXT,
            user_id UUID,
            reviewed_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ
        );

        INSERT INTO public.visitor_feedback_archive (
            original_id, user_type, rating, category, name, student_id,
            department, comments, client_ip_hash, status, user_id,
            reviewed_at, created_at
        )
        SELECT id, user_type, rating, category, name, student_id,
               department, comments, client_ip_hash, status, user_id,
               reviewed_at, created_at
        FROM public.visitor_feedback
        ON CONFLICT DO NOTHING;

        -- Lock archive table to service_role only
        ALTER TABLE public.visitor_feedback_archive ENABLE ROW LEVEL SECURITY;
        REVOKE ALL ON public.visitor_feedback_archive FROM PUBLIC, anon, authenticated;
        GRANT ALL ON public.visitor_feedback_archive TO service_role;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- STAGE 4: RESTORATION OF LEGACY PHASE 8G VISITOR SUBMISSIONS (IF DE-ESCALATING)
-- Re-establishes the standalone visitor feedback pipeline without destroying
-- student records or administrative notes already captured.
-- ------------------------------------------------------------------------------

-- Ensure legacy submit_visitor_feedback is executable by service_role if needed
GRANT EXECUTE ON FUNCTION public.submit_visitor_feedback(INT, TEXT, TEXT, TEXT, TEXT) TO service_role;

-- Ensure rate limit function is available for legacy calls
GRANT EXECUTE ON FUNCTION public.check_and_record_feedback_rate_limit(TEXT, INT, INTERVAL) TO service_role;

-- ------------------------------------------------------------------------------
-- VERIFICATION NOTE:
-- ZERO rows were deleted. ZERO tables were dropped. ZERO columns were dropped.
-- Confidential internal notes and historical submissions remain fully preserved.
-- ==============================================================================
