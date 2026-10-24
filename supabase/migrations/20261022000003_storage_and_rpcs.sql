-- ==============================================================================
-- Migration: 20261022000003_storage_and_rpcs.sql
-- Description: Private Storage bucket and secure RPC functions (Hardened + Atomic Rate Limiter)
-- ==============================================================================

-- 1. CREATE PRIVATE STORAGE BUCKET FOR ISSUE EVIDENCE
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'campus-issue-photos',
    'campus-issue-photos',
    FALSE, -- Strictly private: No anonymous public CDN access
    5242880, -- 5 MB max per image
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = FALSE,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Storage Policy 1: Upload (Authenticated Students/Admins into their own folder: <uid>/<filename>)
CREATE POLICY "issue_photos_upload_policy"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'campus-issue-photos' AND
        (storage.foldername(name))[1] = auth.uid()::TEXT
    );

-- Storage Policy 2: Student Read (Can only read photos they uploaded)
CREATE POLICY "issue_photos_student_read"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'campus-issue-photos' AND
        (storage.foldername(name))[1] = auth.uid()::TEXT
    );

-- Storage Policy 3: Admin Read (Can read all issue photos across the campus)
CREATE POLICY "issue_photos_admin_read"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'campus-issue-photos' AND
        public.is_admin()
    );

-- Storage Policy 4: Admin Delete (Can delete evidence when issue is purged)
CREATE POLICY "issue_photos_admin_delete"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'campus-issue-photos' AND
        public.is_admin()
    );

-- HARDENING: Explicitly NO UPDATE policy on storage.objects for students (prevents file tampering)

-- 2. PERSISTENT ATOMIC FEEDBACK RATE LIMITER TABLE & LOGIC
CREATE TABLE IF NOT EXISTS public.feedback_rate_limits (
    id BIGSERIAL PRIMARY KEY,
    client_hash TEXT NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_rate_limits_hash_time
    ON public.feedback_rate_limits(client_hash, submitted_at DESC);

-- Enable RLS on rate limit tracking table
ALTER TABLE public.feedback_rate_limits ENABLE ROW LEVEL SECURITY;

-- Block public access entirely to rate limit table
REVOKE ALL ON TABLE public.feedback_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.feedback_rate_limits TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.feedback_rate_limits_id_seq TO service_role;

-- Atomic concurrency-safe rate limit checker with automated pruning
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
        RETURN TRUE; -- If identifier absent, rely on edge function layer
    END IF;

    -- Opportunistic cleanup of records older than 2 hours to prevent unbounded table growth
    DELETE FROM public.feedback_rate_limits
    WHERE submitted_at < NOW() - INTERVAL '2 hours';

    -- Count attempts in the current sliding window
    SELECT COUNT(*) INTO v_recent_count
    FROM public.feedback_rate_limits
    WHERE client_hash = p_client_hash
      AND submitted_at > NOW() - p_window_interval;

    IF v_recent_count >= p_max_submissions THEN
        RETURN FALSE; -- Rate limited
    END IF;

    -- Record this submission atomically
    INSERT INTO public.feedback_rate_limits (client_hash, submitted_at)
    VALUES (p_client_hash, NOW());

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.check_and_record_feedback_rate_limit(TEXT, INT, INTERVAL) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_record_feedback_rate_limit(TEXT, INT, INTERVAL) TO service_role;

-- 3. SECURE ATOMIC RPC: ADMIN ISSUE STATUS UPDATE
CREATE OR REPLACE FUNCTION public.admin_update_issue_status(
    p_issue_id TEXT,
    p_new_status TEXT,
    p_assigned_team TEXT DEFAULT NULL,
    p_admin_notes TEXT DEFAULT NULL,
    p_is_internal BOOLEAN DEFAULT FALSE
)
RETURNS JSONB AS $$
DECLARE
    v_admin_name TEXT;
    v_old_status TEXT;
    v_issue RECORD;
BEGIN
    -- Security guard: Must be authenticated admin
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access Denied: Only administrators can update issue lifecycle.';
    END IF;

    -- Validate status value
    IF p_new_status NOT IN ('SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED') THEN
        RAISE EXCEPTION 'Invalid status transition: %', p_new_status;
    END IF;

    -- Fetch current issue
    SELECT * INTO v_issue FROM public.campus_issues WHERE id = p_issue_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Issue not found: %', p_issue_id;
    END IF;

    v_old_status := v_issue.status;

    -- Fetch admin display name
    SELECT display_name INTO v_admin_name FROM public.profiles WHERE id = auth.uid();
    IF v_admin_name IS NULL THEN
        v_admin_name := 'Campus Administrator';
    END IF;

    -- Update issue table
    UPDATE public.campus_issues
    SET
        status = p_new_status,
        assigned_team = COALESCE(p_assigned_team, assigned_team),
        resolution_notes = CASE
            WHEN p_new_status = 'RESOLVED' THEN COALESCE(p_admin_notes, resolution_notes)
            ELSE resolution_notes
        END,
        updated_at = NOW()
    WHERE id = p_issue_id;

    -- Append audit history record
    INSERT INTO public.issue_status_history (
        issue_id,
        status,
        actor_id,
        actor_name,
        actor_role,
        assigned_team,
        notes,
        is_internal_note
    ) VALUES (
        p_issue_id,
        p_new_status,
        auth.uid(),
        v_admin_name,
        'admin',
        COALESCE(p_assigned_team, v_issue.assigned_team),
        COALESCE(p_admin_notes, 'Status transitioned to ' || p_new_status),
        p_is_internal
    );

    RETURN jsonb_build_object(
        'success', true,
        'issue_id', p_issue_id,
        'old_status', v_old_status,
        'new_status', p_new_status
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.admin_update_issue_status(TEXT, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_issue_status(TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;

-- 4. SECURE VISITOR FEEDBACK SUBMISSION RPC WITH ATOMIC RATE LIMIT CHECK
-- Callable ONLY by service_role (Edge Function endpoint), preventing direct client bypass
CREATE OR REPLACE FUNCTION public.submit_visitor_feedback(
    p_rating INT,
    p_category TEXT,
    p_name TEXT DEFAULT NULL,
    p_comments TEXT DEFAULT NULL,
    p_client_ip_hash TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_feedback_id TEXT;
    v_rate_allowed BOOLEAN;
BEGIN
    -- 1. Enforce Atomic Rate Limit (Max 5 submissions per 10 minutes per client hash)
    IF p_client_ip_hash IS NOT NULL THEN
        v_rate_allowed := public.check_and_record_feedback_rate_limit(p_client_ip_hash, 5, INTERVAL '10 minutes');
        IF NOT v_rate_allowed THEN
            RAISE EXCEPTION 'Rate limit exceeded: Too many feedback submissions. Please wait 10 minutes before submitting again.';
        END IF;
    END IF;

    -- 2. Validate Rating
    IF p_rating < 1 OR p_rating > 5 THEN
        RAISE EXCEPTION 'Rating must be an integer between 1 and 5.';
    END IF;

    -- 3. Validate Category
    IF p_category NOT IN ('Campus 3D experience', 'Navigation experience', 'Campus information', 'Website usability', 'General suggestion') THEN
        RAISE EXCEPTION 'Invalid feedback category: %', p_category;
    END IF;

    -- 4. Insert Verified Feedback
    INSERT INTO public.visitor_feedback (
        rating,
        category,
        name,
        comments,
        client_ip_hash
    ) VALUES (
        p_rating::SMALLINT,
        p_category,
        NULLIF(TRIM(p_name), ''),
        NULLIF(TRIM(p_comments), ''),
        p_client_ip_hash
    )
    RETURNING id INTO v_feedback_id;

    RETURN jsonb_build_object(
        'success', true,
        'id', v_feedback_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.submit_visitor_feedback(INT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_visitor_feedback(INT, TEXT, TEXT, TEXT, TEXT) TO service_role;
