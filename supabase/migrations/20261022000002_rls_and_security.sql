-- ==============================================================================
-- Migration: 20261022000002_rls_and_security.sql
-- Description: Row Level Security, Column Grants, and Role Security (Hardened)
-- ==============================================================================

-- 1. SECURITY HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_student()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'student'
        )
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- 2. ENABLE ROW LEVEL SECURITY ON ALL TABLES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_feedback ENABLE ROW LEVEL SECURITY;

-- 3. PROFILES POLICIES & COLUMN HARDENING
-- Read: Users read own profile; Admins read all profiles; Visitors read nothing
CREATE POLICY "profiles_select_policy"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (id = auth.uid() OR public.is_admin());

-- Update: Users can update their own info (role cannot be changed due to column grants and trigger)
CREATE POLICY "profiles_update_policy"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid() OR public.is_admin())
    WITH CHECK (id = auth.uid() OR public.is_admin());

-- Secondary trigger defense: Prevent self-elevation to admin
CREATE OR REPLACE FUNCTION public.prevent_role_self_elevation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role != OLD.role AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access Denied: Users cannot change their own security role.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE TRIGGER trg_protect_profile_role
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_role_self_elevation();

-- Trusted procedure to grant admin role
-- HARDENING: Explicitly revoked from public/anon/authenticated. Callable ONLY by service_role/CLI.
CREATE OR REPLACE FUNCTION public.admin_grant_role(target_user_id UUID, new_role TEXT)
RETURNS VOID AS $$
BEGIN
    IF current_user != 'service_role' AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access Denied: Only server administration can execute admin_grant_role.';
    END IF;

    IF new_role NOT IN ('admin', 'student') THEN
        RAISE EXCEPTION 'Invalid role specified: %', new_role;
    END IF;

    UPDATE public.profiles
    SET role = new_role, updated_at = NOW()
    WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.admin_grant_role(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_grant_role(UUID, TEXT) TO service_role;

-- 4. MAINTENANCE TEAMS POLICIES
CREATE POLICY "maintenance_teams_select_authenticated"
    ON public.maintenance_teams FOR SELECT
    TO authenticated
    USING (is_active = TRUE OR public.is_admin());

CREATE POLICY "maintenance_teams_admin_all"
    ON public.maintenance_teams FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 5. CAMPUS ISSUES POLICIES
-- Visitors: ZERO access (anon has no grants or policies)

-- Read: Students read own; Admins read all
CREATE POLICY "campus_issues_select_policy"
    ON public.campus_issues FOR SELECT
    TO authenticated
    USING (reporter_id = auth.uid() OR public.is_admin());

-- Insert: Authenticated users can create reports (trigger forces reporter_id = auth.uid())
CREATE POLICY "campus_issues_insert_authenticated"
    ON public.campus_issues FOR INSERT
    TO authenticated
    WITH CHECK (
        (reporter_id = auth.uid() OR public.is_admin()) AND
        (status = 'SUBMITTED' OR public.is_admin()) AND
        (assigned_team IS NULL OR public.is_admin()) AND
        (resolution_notes IS NULL OR public.is_admin())
    );

-- Update: Strictly ADMIN ONLY. Students CANNOT update campus_issues.
CREATE POLICY "campus_issues_update_admin"
    ON public.campus_issues FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Delete: Strictly ADMIN ONLY
CREATE POLICY "campus_issues_delete_admin"
    ON public.campus_issues FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- Column-level safeguard trigger on campus_issues
CREATE OR REPLACE FUNCTION public.enforce_campus_issue_integrity()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Security Violation: Only campus administrators can modify campus issues.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE TRIGGER trg_issue_column_protection
    BEFORE UPDATE ON public.campus_issues
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_campus_issue_integrity();

-- 6. ISSUE STATUS HISTORY POLICIES
-- Read: Students can read history for their own issues, EXCLUDING internal notes.
-- Admins can read all history including internal notes.
CREATE POLICY "issue_history_select_student"
    ON public.issue_status_history FOR SELECT
    TO authenticated
    USING (
        (
            issue_id IN (
                SELECT id FROM public.campus_issues WHERE reporter_id = auth.uid()
            ) AND is_internal_note = FALSE
        )
        OR public.is_admin()
    );

-- Insert: Admins can manually append history notes
CREATE POLICY "issue_history_insert_admin"
    ON public.issue_status_history FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

-- 7. VISITOR FEEDBACK POLICIES & ANONYMOUS HARDENING
-- HARDENING: Direct table INSERT is revoked from anon. Submissions are mediated via Edge Function.
-- Read: Strictly ADMIN ONLY. Visitors and students have ZERO SELECT access.
CREATE POLICY "visitor_feedback_select_admin"
    ON public.visitor_feedback FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- Admin management
CREATE POLICY "visitor_feedback_admin_manage"
    ON public.visitor_feedback FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 8. REVOKE DANGEROUS GRANTS & IMPLEMENT MINIMAL COLUMN PRIVILEGES
-- Revoke all public access by default
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon;

-- PROFILES GRANTS:
-- Authenticated users cannot INSERT or DELETE profiles (managed by triggers)
-- Authenticated users can only UPDATE specific non-privileged columns
REVOKE ALL ON public.profiles FROM authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (display_name, department, student_id, avatar_url, updated_at) ON public.profiles TO authenticated;

-- MAINTENANCE TEAMS GRANTS:
REVOKE ALL ON public.maintenance_teams FROM authenticated;
GRANT SELECT ON public.maintenance_teams TO authenticated;

-- CAMPUS ISSUES GRANTS:
REVOKE ALL ON public.campus_issues FROM authenticated;
GRANT SELECT, INSERT ON public.campus_issues TO authenticated;
GRANT UPDATE, DELETE ON public.campus_issues TO authenticated; -- RLS restricts to is_admin()

-- ISSUE STATUS HISTORY GRANTS:
REVOKE ALL ON public.issue_status_history FROM authenticated;
GRANT SELECT, INSERT ON public.issue_status_history TO authenticated;

-- SEQUENCES:
GRANT USAGE, SELECT ON SEQUENCE public.campus_issue_seq TO authenticated;

-- VISITOR FEEDBACK:
-- Anon and Student have ZERO table grants. Only Admin can read; service_role has full access.
REVOKE ALL ON public.visitor_feedback FROM anon, authenticated;
GRANT SELECT ON public.visitor_feedback TO authenticated; -- RLS ensures is_admin() only
GRANT ALL ON public.visitor_feedback TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.visitor_feedback_seq TO service_role;

-- Re-grant execute on benign helper functions
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_student() TO authenticated;
