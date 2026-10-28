-- ==============================================================================
-- MIGRATION: Phase 9D.2 Hardened Student & Visitor Feedback Center
-- Prepared for Administrative Review prior to production execution.
-- Enhances public.visitor_feedback with strict least-privilege security.
-- Strictly complies with PATH FINDER Admin authorization (public.is_admin()).
-- Completely isolates administrative internal notes from student visibility.
-- Revokes open check policies and direct table mutations.
-- ==============================================================================

-- 0. PREREQUISITE SECURITY & SERVICE ROLE PERMISSIONS (Forward-only correction)
-- Ensure service_role has necessary permissions to read student profiles for identity verification
GRANT ALL ON public.profiles TO service_role;

-- Hardened role self-elevation trigger: Allow service_role and verified administrators
CREATE OR REPLACE FUNCTION public.prevent_role_self_elevation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role != OLD.role 
       AND COALESCE(auth.jwt() ->> 'role', '') != 'service_role' 
       AND COALESCE(current_setting('request.jwt.claim.role', true), '') != 'service_role'
       AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access Denied: Users cannot change their own security role.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Ensure feedback_rate_limits table exists idempotently
CREATE TABLE IF NOT EXISTS public.feedback_rate_limits (
    id BIGSERIAL PRIMARY KEY,
    client_hash TEXT NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_rate_limits_hash_time
    ON public.feedback_rate_limits(client_hash, submitted_at DESC);

ALTER TABLE public.feedback_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.feedback_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.feedback_rate_limits TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.feedback_rate_limits_id_seq TO service_role;

-- Ensure check_and_record_feedback_rate_limit exists idempotently
CREATE OR REPLACE FUNCTION public.check_and_record_feedback_rate_limit(
    p_client_hash TEXT,
    p_max_submissions INT DEFAULT 5,
    p_window_interval INTERVAL DEFAULT INTERVAL '10 minutes'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_recent_count INT;
BEGIN
    IF p_client_hash IS NULL OR trim(p_client_hash) = '' THEN
        RETURN TRUE;
    END IF;

    DELETE FROM public.feedback_rate_limits
    WHERE submitted_at < NOW() - INTERVAL '2 hours';

    SELECT COUNT(*) INTO v_recent_count
    FROM public.feedback_rate_limits
    WHERE client_hash = p_client_hash
      AND submitted_at > NOW() - p_window_interval;

    IF v_recent_count >= p_max_submissions THEN
        RETURN FALSE;
    END IF;

    INSERT INTO public.feedback_rate_limits (client_hash, submitted_at)
    VALUES (p_client_hash, NOW());

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.check_and_record_feedback_rate_limit(TEXT, INT, INTERVAL) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_record_feedback_rate_limit(TEXT, INT, INTERVAL) TO service_role;

-- 1. NON-DESTRUCTIVE COLUMN UPDATES TO VISITOR FEEDBACK TABLE
-- Allow optional rating (Phase 9D.1 Feature 2 & 3)
ALTER TABLE public.visitor_feedback
    ALTER COLUMN rating DROP NOT NULL;

ALTER TABLE public.visitor_feedback
    DROP CONSTRAINT IF EXISTS visitor_feedback_rating_check;

ALTER TABLE public.visitor_feedback
    ADD CONSTRAINT visitor_feedback_rating_check CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5));

-- Add role, status, student metadata and audit columns
ALTER TABLE public.visitor_feedback
    ADD COLUMN IF NOT EXISTS user_type TEXT NOT NULL DEFAULT 'visitor',
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS student_id TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS department TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. ADD CONSTRAINTS FOR ROLE & REVIEW STATUS
ALTER TABLE public.visitor_feedback
    DROP CONSTRAINT IF EXISTS check_visitor_feedback_user_type,
    ADD CONSTRAINT check_visitor_feedback_user_type CHECK (user_type IN ('visitor', 'student'));

ALTER TABLE public.visitor_feedback
    DROP CONSTRAINT IF EXISTS check_visitor_feedback_status,
    ADD CONSTRAINT check_visitor_feedback_status CHECK (status IN ('pending', 'reviewed', 'addressed'));

-- Relax category check constraint to include all Visitor and Student categories
ALTER TABLE public.visitor_feedback
    DROP CONSTRAINT IF EXISTS visitor_feedback_category_check;

ALTER TABLE public.visitor_feedback
    ADD CONSTRAINT visitor_feedback_category_check CHECK (
        category IN (
            'Campus visit experience',
            '3D virtual tour experience',
            'Clarity of college information',
            'General suggestions',
            'Campus facilities',
            'Campus navigation experience',
            'Student services',
            'Suggestions for improvement',
            'Campus 3D experience',
            'Navigation experience',
            'Campus information',
            'Website usability',
            'General suggestion'
        )
    );

-- 3. DEDICATED TABLE FOR ADMINISTRATIVE INTERNAL NOTES (CRITICAL SECURITY ISOLATION)
-- Internal administrative notes are kept strictly separate from the feedback table
-- so ordinary students querying their own feedback records can NEVER read staff notes.
CREATE TABLE IF NOT EXISTS public.feedback_internal_notes (
    id BIGSERIAL PRIMARY KEY,
    feedback_id TEXT NOT NULL REFERENCES public.visitor_feedback(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    admin_name TEXT NOT NULL CHECK (char_length(admin_name) <= 120),
    note TEXT NOT NULL CHECK (char_length(note) <= 3000),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feedback_internal_notes_feedback_id
    ON public.feedback_internal_notes(feedback_id);
CREATE INDEX IF NOT EXISTS idx_feedback_internal_notes_created_at
    ON public.feedback_internal_notes(created_at DESC);

-- Enable RLS on internal notes table
ALTER TABLE public.feedback_internal_notes ENABLE ROW LEVEL SECURITY;

-- Policy: Strictly Verified Administrators ONLY (via public.is_admin())
DROP POLICY IF EXISTS "feedback_internal_notes_admin_only" ON public.feedback_internal_notes;
CREATE POLICY "feedback_internal_notes_admin_only"
    ON public.feedback_internal_notes FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Permissions: Revoke from public & anon; grant to authenticated (restricted by RLS)
REVOKE ALL ON public.feedback_internal_notes FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback_internal_notes TO authenticated;
GRANT ALL ON public.feedback_internal_notes TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.feedback_internal_notes_id_seq TO authenticated, service_role;

-- 4. PERFORMANCE & PRIVACY INDEXES
CREATE INDEX IF NOT EXISTS idx_feedback_user_type ON public.visitor_feedback(user_type);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.visitor_feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.visitor_feedback(user_id);

-- 5. HARDENED ROW LEVEL SECURITY (RLS) FOR VISITOR FEEDBACK
-- Enable RLS on visitor_feedback
ALTER TABLE public.visitor_feedback ENABLE ROW LEVEL SECURITY;

-- Clean up any prior or permissive policies
DROP POLICY IF EXISTS "Public insert feedback" ON public.visitor_feedback;
DROP POLICY IF EXISTS "visitor_feedback_select_admin" ON public.visitor_feedback;
DROP POLICY IF EXISTS "feedback_select_admin" ON public.visitor_feedback;
DROP POLICY IF EXISTS "feedback_select_student_own" ON public.visitor_feedback;
DROP POLICY IF EXISTS "visitor_feedback_admin_manage" ON public.visitor_feedback;
DROP POLICY IF EXISTS "feedback_admin_update" ON public.visitor_feedback;

-- Read Policy 1: Verified Administrators can view all submissions (via public.is_admin())
CREATE POLICY "feedback_select_admin"
    ON public.visitor_feedback FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- Read Policy 2: Authenticated Students can view ONLY their own submissions
-- Strictly prevents cross-student access to private feedback.
CREATE POLICY "feedback_select_student_own"
    ON public.visitor_feedback FOR SELECT
    TO authenticated
    USING (
        auth.uid() IS NOT NULL AND
        user_id = auth.uid()
    );

-- Update Policy: ONLY Verified Administrators can update review status and reviewed_at
CREATE POLICY "feedback_admin_update"
    ON public.visitor_feedback FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Hardening: Direct table INSERT and DELETE are REVOKED from anon and authenticated.
-- Submissions must go through the validated server-side Edge Function.
REVOKE INSERT, DELETE ON public.visitor_feedback FROM anon, authenticated;
GRANT SELECT ON public.visitor_feedback TO authenticated;
GRANT ALL ON public.visitor_feedback TO service_role;

-- 6. ATOMIC SUBMISSION RPC (SERVICE-ROLE ONLY)
-- Revoked from anon and authenticated so browser clients CANNOT bypass the Edge Function.
CREATE OR REPLACE FUNCTION public.submit_unified_feedback(
    p_user_type TEXT DEFAULT 'visitor',
    p_rating INT DEFAULT NULL,
    p_category TEXT DEFAULT NULL,
    p_name TEXT DEFAULT NULL,
    p_student_id TEXT DEFAULT NULL,
    p_department TEXT DEFAULT NULL,
    p_comments TEXT DEFAULT NULL,
    p_client_ip_hash TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_feedback_id TEXT;
BEGIN
    -- Note: Rate limiting is verified and recorded atomically by the server-side Edge Function
    -- prior to invoking this service-role RPC.

    -- Validate Rating if provided
    IF p_rating IS NOT NULL AND (p_rating < 1 OR p_rating > 5) THEN
        RAISE EXCEPTION 'Rating must be an integer between 1 and 5.';
    END IF;

    -- Validate Category
    IF p_category IS NULL OR TRIM(p_category) = '' THEN
        RAISE EXCEPTION 'Feedback category is required.';
    END IF;

    -- Validate Comments length
    IF p_comments IS NOT NULL AND (char_length(TRIM(p_comments)) < 5 OR char_length(p_comments) > 2000) THEN
        RAISE EXCEPTION 'Comments must be between 5 and 2000 characters.';
    END IF;

    -- Insert Feedback safely
    INSERT INTO public.visitor_feedback (
        user_type,
        rating,
        category,
        name,
        student_id,
        department,
        comments,
        client_ip_hash,
        user_id,
        status
    ) VALUES (
        COALESCE(p_user_type, 'visitor'),
        p_rating::SMALLINT,
        TRIM(p_category),
        NULLIF(TRIM(p_name), ''),
        NULLIF(TRIM(p_student_id), ''),
        NULLIF(TRIM(p_department), ''),
        NULLIF(TRIM(p_comments), ''),
        p_client_ip_hash,
        p_user_id,
        'pending'
    )
    RETURNING id INTO v_feedback_id;

    RETURN jsonb_build_object(
        'success', true,
        'id', v_feedback_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- HARDENING: Explicitly deny direct browser execution of submit_unified_feedback
REVOKE ALL ON FUNCTION public.submit_unified_feedback FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_unified_feedback TO service_role;

-- 7. SECURE ATOMIC RPC: ADMIN FEEDBACK REVIEW & INTERNAL NOTES
-- Uses the canonical PATH FINDER is_admin() authorization check.
CREATE OR REPLACE FUNCTION public.admin_review_feedback(
    p_feedback_id TEXT,
    p_status TEXT,
    p_internal_note TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_admin_name TEXT;
BEGIN
    -- Strict Authorization check using canonical PATH FINDER is_admin()
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access Denied: Only verified administrators can review feedback.';
    END IF;

    IF p_status NOT IN ('pending', 'reviewed', 'addressed') THEN
        RAISE EXCEPTION 'Invalid review status. Must be pending, reviewed, or addressed.';
    END IF;

    -- Fetch Admin Name from trusted profiles table
    SELECT display_name INTO v_admin_name
    FROM public.profiles
    WHERE id = auth.uid();

    -- Update review status on visitor_feedback
    UPDATE public.visitor_feedback
    SET status = p_status,
        reviewed_at = NOW()
    WHERE id = p_feedback_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Feedback record not found: %', p_feedback_id;
    END IF;

    -- If internal note provided, insert into isolated feedback_internal_notes
    IF p_internal_note IS NOT NULL AND TRIM(p_internal_note) != '' THEN
        INSERT INTO public.feedback_internal_notes (
            feedback_id,
            admin_id,
            admin_name,
            note
        ) VALUES (
            p_feedback_id,
            auth.uid(),
            COALESCE(v_admin_name, 'Campus Administrator'),
            TRIM(p_internal_note)
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'feedback_id', p_feedback_id,
        'status', p_status
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.admin_review_feedback FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_review_feedback TO authenticated;
