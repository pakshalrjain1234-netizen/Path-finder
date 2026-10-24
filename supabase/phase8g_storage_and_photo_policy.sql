-- ==============================================================================
-- PATH FINDER PHASE 8G: STORAGE & EVIDENCE POLICIES (PROPOSAL & AUDIT)
-- Misrimal Navajee Munoth Jain Engineering College (MNMJEC), Chennai
-- Supabase Project Reference: lqqqrqajeqzdtvkfvrnp
--
-- STATUS: REVIEWABLE PROPOSAL ONLY. DO NOT EXECUTE REMOTELY WITHOUT USER APPROVAL.
--
-- AUDIT OF EXISTING REMOTE DATABASE STATE (Verified 2026-10-24 via read-only inspection):
-- 1. storage.buckets: 'campus-issue-photos' exists.
--    - public: false (PRIVATE BUCKET)
--    - file_size_limit: 5242880 (5 MB)
--    - allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp']
-- 2. storage.objects policies active:
--    - "issue_photos_upload_policy" (INSERT TO authenticated WHERE (storage.foldername(name))[1] = auth.uid()::TEXT)
--    - "issue_photos_student_read" (SELECT TO authenticated WHERE (storage.foldername(name))[1] = auth.uid()::TEXT)
--    - "issue_photos_admin_read" (SELECT TO authenticated WHERE is_admin())
--    - "issue_photos_admin_delete" (DELETE TO authenticated WHERE is_admin())
-- 3. public.campus_issues triggers:
--    - trg_issue_column_protection / enforce_campus_issue_integrity blocks all direct UPDATEs by non-admins.
-- 4. Edge functions:
--    - 'submit-feedback' is undeployed (functions: []). Deployment command:
--      supabase functions deploy submit-feedback --project-ref lqqqrqajeqzdtvkfvrnp
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- PROPOSAL 1: Allow Student to Delete Orphaned Uploads in Their Own Folder
-- Rationale: If a student's upload succeeds to Storage but issue creation fails,
-- the client attempts to clean up the orphaned file. Currently only admins can DELETE.
-- This policy permits students to DELETE objects strictly inside their own user folder.
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "issue_photos_student_delete" ON storage.objects;
CREATE POLICY "issue_photos_student_delete"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'campus-issue-photos' AND
        (storage.foldername(name))[1] = auth.uid()::TEXT
    );

-- ------------------------------------------------------------------------------
-- PROPOSAL 2: Secure Student RPC to Attach Photo to Own Existing Issue
-- Rationale: public.campus_issues has an active BEFORE UPDATE trigger
-- (enforce_campus_issue_integrity) that raises an exception if NOT is_admin().
-- If an issue was initially submitted without a photo (or photo upload was retried),
-- the student cannot directly UPDATE public.campus_issues.
-- This SECURITY DEFINER RPC verifies reporter_id = auth.uid() and only updates photo_url.
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.student_attach_issue_photo(
    p_issue_id TEXT,
    p_photo_url TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_reporter_id UUID;
    v_status TEXT;
BEGIN
    -- 1. Ensure caller is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication Required: You must be signed in to attach photographic evidence.';
    END IF;

    -- 2. Validate issue existence and ownership
    SELECT reporter_id, status INTO v_reporter_id, v_status
    FROM public.campus_issues
    WHERE id = p_issue_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Issue not found: %', p_issue_id;
    END IF;

    IF v_reporter_id != auth.uid() AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access Denied: You can only attach photographic evidence to your own reported issues.';
    END IF;

    -- 3. Validate storage path format: must start with caller's user ID (or admin)
    IF NOT public.is_admin() AND NOT (p_photo_url LIKE auth.uid()::TEXT || '/%') THEN
        RAISE EXCEPTION 'Security Violation: Evidence path must belong to your authenticated user namespace.';
    END IF;

    -- 4. Update the photo_url column
    UPDATE public.campus_issues
    SET
        photo_url = p_photo_url,
        updated_at = NOW()
    WHERE id = p_issue_id;

    -- 5. Record attachment in audit history
    INSERT INTO public.issue_status_history (
        issue_id,
        status,
        actor_id,
        actor_name,
        actor_role,
        notes,
        is_internal_note
    ) VALUES (
        p_issue_id,
        v_status,
        auth.uid(),
        'Student Reporter',
        'student',
        'Photographic evidence attached to existing issue report.',
        FALSE
    );

    RETURN jsonb_build_object(
        'success', true,
        'issue_id', p_issue_id,
        'photo_url', p_photo_url
    );
END;
$$;

-- Grant execution to authenticated users
REVOKE ALL ON FUNCTION public.student_attach_issue_photo(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.student_attach_issue_photo(TEXT, TEXT) TO authenticated;
