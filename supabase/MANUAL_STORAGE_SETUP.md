# MNMJEC PATH FINDER — Private Supabase Storage Configuration Guide

## Objective
Establish the strictly private Supabase Storage bucket `campus-issue-photos` with Row-Level Security (RLS) for the Campus Issue Passport evidence photographs.

---

## Storage Specifications
- **Bucket ID / Name**: `campus-issue-photos`
- **Visibility**: **Private** (Anonymous public CDN reads strictly disabled)
- **File Size Limit**: `5242880` bytes (5 MB per photo)
- **Allowed MIME Types**: `image/jpeg`, `image/png`, `image/webp`
- **Storage Folder Namespace**: `campus-issue-photos/<student_user_id>/<issue_id>_<timestamp>.jpg`

---

## SQL Setup (Run in Supabase Dashboard SQL Editor)

```sql
-- 1. Create Private Storage Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'campus-issue-photos',
    'campus-issue-photos',
    FALSE,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = FALSE,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 2. Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Student & Admin Authenticated Upload into User Subfolder
CREATE POLICY "issue_photos_upload_policy"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'campus-issue-photos' AND
        (storage.foldername(name))[1] = auth.uid()::TEXT
    );

-- 4. Policy: Student Read (Can only access their own uploaded evidence)
CREATE POLICY "issue_photos_student_read"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'campus-issue-photos' AND
        (storage.foldername(name))[1] = auth.uid()::TEXT
    );

-- 5. Policy: Admin Read (Estate administrators can view all campus evidence)
CREATE POLICY "issue_photos_admin_read"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'campus-issue-photos' AND
        public.is_admin()
    );

-- 6. Policy: Admin Delete (Purging evidence when issues are officially resolved/archived)
CREATE POLICY "issue_photos_admin_delete"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'campus-issue-photos' AND
        public.is_admin()
    );
```

---

## Manual UI Configuration in Supabase Dashboard
1. Go to **Supabase Dashboard** > **Storage**.
2. Click **New bucket**.
3. Name: `campus-issue-photos`.
4. Ensure **Public bucket** is toggled **OFF**.
5. Set file size limit to **5 MB**.
6. Under Allowed MIME types, enter: `image/jpeg, image/png, image/webp`.
7. Click **Save bucket**.
8. Go to **Storage Policies** and apply the 4 policies listed above.

---

## Fallback Mechanism
If the remote Supabase bucket has not yet been initialized by the administrator, the PATH FINDER frontend automatically handles the situation safely:
1. Photos are sanitized and saved with the report as local/embedded evidence.
2. The user is informed with a clean status message.
3. No crashes or unhandled exceptions occur.
