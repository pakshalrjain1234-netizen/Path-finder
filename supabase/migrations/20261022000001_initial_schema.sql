-- ==============================================================================
-- Migration: 20261022000001_initial_schema.sql
-- Description: Core schema for PATH FINDER (MNMJEC) Phase 7A.1 (Hardened)
-- Tables: profiles, maintenance_teams, campus_issues, issue_status_history, visitor_feedback
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. MAINTENANCE TEAMS TABLE
CREATE TABLE IF NOT EXISTS public.maintenance_teams (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Seed initial campus maintenance units
INSERT INTO public.maintenance_teams (name, description) VALUES
    ('Campus Electrical Works', 'Outdoor lighting, cables, power supply, and transformers'),
    ('Civil & Walkways Team', 'Paved walkways, curb stones, drainage covers, and ramps'),
    ('Sanitation & Housekeeping', 'Outdoor waste bins, sanitation, and debris clearance'),
    ('Plumbing & Water Supply Unit', 'Drinking fountains, pipelines, valves, and water drainage'),
    ('Estate & Horticulture Unit', 'Trees, garden walkways, lawns, and perimeter fencing'),
    ('General Maintenance Crew', 'Building exterior paint, signage, and miscellaneous fixtures')
ON CONFLICT (name) DO NOTHING;

-- 3. USER PROFILES TABLE (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL CHECK (char_length(trim(display_name)) >= 2 AND char_length(display_name) <= 120),
    email TEXT NOT NULL CHECK (char_length(trim(email)) >= 5 AND char_length(email) <= 255),
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'student')),
    department TEXT CHECK (department IS NULL OR char_length(department) <= 120),
    student_id TEXT CHECK (student_id IS NULL OR char_length(student_id) <= 50),
    avatar_url TEXT CHECK (avatar_url IS NULL OR char_length(avatar_url) <= 1000),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Helper trigger function for updated_at with locked search path
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile trigger upon Supabase Auth signup
-- HARDENING: Always assigns 'student'. Never trusts user metadata for role.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name, email, role, department, student_id)
    VALUES (
        NEW.id,
        COALESCE(
            NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
            NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''),
            split_part(NEW.email, '@', 1)
        ),
        NEW.email,
        'student', -- Enforce student role on creation. Admin requires separate trusted grant.
        NULLIF(TRIM(NEW.raw_user_meta_data->>'department'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'student_id'), '')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 4. SEQUENCES & FUNCTIONS FOR UNIQUE TRACKING IDS
CREATE SEQUENCE IF NOT EXISTS public.campus_issue_seq START WITH 50;
CREATE SEQUENCE IF NOT EXISTS public.visitor_feedback_seq START WITH 10;

CREATE OR REPLACE FUNCTION public.generate_issue_id()
RETURNS TEXT AS $$
DECLARE
    seq_val INT;
    year_val TEXT;
BEGIN
    seq_val := nextval('public.campus_issue_seq');
    year_val := to_char(NOW(), 'YYYY');
    RETURN 'MNM-' || year_val || '-' || LPAD(seq_val::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.generate_feedback_id()
RETURNS TEXT AS $$
DECLARE
    seq_val INT;
    year_val TEXT;
BEGIN
    seq_val := nextval('public.visitor_feedback_seq');
    year_val := to_char(NOW(), 'YYYY');
    RETURN 'FB-' || year_val || '-' || LPAD(seq_val::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

-- Helper validation function for Stage E3 3D coordinates
CREATE OR REPLACE FUNCTION public.is_valid_model_coordinates(coords JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    IF coords IS NULL OR jsonb_typeof(coords) != 'array' OR jsonb_array_length(coords) != 3 THEN
        RETURN FALSE;
    END IF;
    -- Verify each coordinate is a valid numeric value
    IF jsonb_typeof(coords->0) != 'number' OR
       jsonb_typeof(coords->1) != 'number' OR
       jsonb_typeof(coords->2) != 'number' THEN
        RETURN FALSE;
    END IF;
    -- Sanity check: Ensure coordinate falls within MNMJEC Stage E3 bounding perimeter
    IF (coords->>0)::NUMERIC < -500 OR (coords->>0)::NUMERIC > 500 OR
       (coords->>1)::NUMERIC < -50 OR (coords->>1)::NUMERIC > 150 OR
       (coords->>2)::NUMERIC < -500 OR (coords->>2)::NUMERIC > 500 THEN
        RETURN FALSE;
    END IF;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public, pg_temp;

-- 5. CAMPUS ISSUES TABLE (Stage E3 3D Coordinate Placement)
CREATE TABLE IF NOT EXISTS public.campus_issues (
    id TEXT PRIMARY KEY DEFAULT public.generate_issue_id(),
    reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    category TEXT NOT NULL CHECK (
        category IN (
            'Cleanliness',
            'Garbage accumulation',
            'Electrical / outdoor lighting',
            'Water leakage',
            'Waterlogging',
            'Damaged walkway',
            'Building exterior damage',
            'Accessibility obstruction',
            'General maintenance',
            'Other'
        )
    ),
    description TEXT NOT NULL CHECK (char_length(trim(description)) >= 5 AND char_length(description) <= 3000),
    location_name TEXT NOT NULL CHECK (char_length(trim(location_name)) > 0 AND char_length(location_name) <= 200),
    building_id TEXT CHECK (building_id IS NULL OR char_length(building_id) <= 80),
    model_coordinates JSONB NOT NULL CHECK (public.is_valid_model_coordinates(model_coordinates)),
    photo_url TEXT CHECK (photo_url IS NULL OR char_length(photo_url) <= 1000),
    status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (
        status IN ('SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED')
    ),
    assigned_team TEXT REFERENCES public.maintenance_teams(name) ON UPDATE CASCADE ON DELETE SET NULL,
    resolution_notes TEXT CHECK (resolution_notes IS NULL OR char_length(resolution_notes) <= 3000),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_campus_issues_reporter ON public.campus_issues(reporter_id);
CREATE INDEX IF NOT EXISTS idx_campus_issues_status ON public.campus_issues(status);
CREATE INDEX IF NOT EXISTS idx_campus_issues_category ON public.campus_issues(category);
CREATE INDEX IF NOT EXISTS idx_campus_issues_building ON public.campus_issues(building_id);

CREATE TRIGGER trg_campus_issues_updated_at
    BEFORE UPDATE ON public.campus_issues
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- HARDENING: Enforce authentic reporter_id and initial submission defaults
CREATE OR REPLACE FUNCTION public.enforce_issue_submission_defaults()
RETURNS TRIGGER AS $$
BEGIN
    -- For non-admins, force reporter_id to match authenticated user
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
        NEW.reporter_id = auth.uid();
        NEW.status = 'SUBMITTED';
        NEW.assigned_team = NULL;
        NEW.resolution_notes = NULL;
    ELSE
        -- Admin submitting an issue: defaults to admin's UID if not specified
        IF NEW.reporter_id IS NULL THEN
            NEW.reporter_id = auth.uid();
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE TRIGGER trg_issue_submission_defaults
    BEFORE INSERT ON public.campus_issues
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_issue_submission_defaults();

-- 6. ISSUE STATUS HISTORY (Audit Trail)
CREATE TABLE IF NOT EXISTS public.issue_status_history (
    id BIGSERIAL PRIMARY KEY,
    issue_id TEXT NOT NULL REFERENCES public.campus_issues(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (
        status IN ('SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED')
    ),
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_name TEXT NOT NULL CHECK (char_length(actor_name) <= 120),
    actor_role TEXT NOT NULL CHECK (actor_role IN ('admin', 'student', 'system')),
    assigned_team TEXT CHECK (assigned_team IS NULL OR char_length(assigned_team) <= 120),
    notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 3000),
    is_internal_note BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_issue_history_issue_id ON public.issue_status_history(issue_id);

-- Auto-insert initial history entry on issue creation
CREATE OR REPLACE FUNCTION public.handle_issue_created()
RETURNS TRIGGER AS $$
DECLARE
    v_actor_name TEXT;
    v_actor_role TEXT;
BEGIN
    SELECT display_name, role INTO v_actor_name, v_actor_role
    FROM public.profiles
    WHERE id = NEW.reporter_id;

    INSERT INTO public.issue_status_history (
        issue_id,
        status,
        actor_id,
        actor_name,
        actor_role,
        notes,
        is_internal_note
    ) VALUES (
        NEW.id,
        NEW.status,
        NEW.reporter_id,
        COALESCE(v_actor_name, 'Student Reporter'),
        COALESCE(v_actor_role, 'student'),
        'Initial issue report submitted with Stage E3 campus coordinates.',
        FALSE
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE TRIGGER trg_issue_created_history
    AFTER INSERT ON public.campus_issues
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_issue_created();

-- HARDENING: Ensure audit trail records are strictly IMMUTABLE
CREATE OR REPLACE FUNCTION public.prevent_history_tampering()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit integrity violation: Issue status history records are immutable and cannot be updated or deleted.';
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

CREATE TRIGGER trg_prevent_history_update
    BEFORE UPDATE ON public.issue_status_history
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_history_tampering();

CREATE TRIGGER trg_prevent_history_delete
    BEFORE DELETE ON public.issue_status_history
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_history_tampering();

-- 7. VISITOR FEEDBACK TABLE (Anonymous, isolated from maintenance passport)
CREATE TABLE IF NOT EXISTS public.visitor_feedback (
    id TEXT PRIMARY KEY DEFAULT public.generate_feedback_id(),
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    category TEXT NOT NULL CHECK (
        category IN (
            'Campus 3D experience',
            'Navigation experience',
            'Campus information',
            'Website usability',
            'General suggestion'
        )
    ),
    name TEXT CHECK (name IS NULL OR char_length(name) <= 120),
    comments TEXT CHECK (comments IS NULL OR char_length(comments) <= 2000),
    client_ip_hash TEXT CHECK (client_ip_hash IS NULL OR char_length(client_ip_hash) <= 128),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_visitor_feedback_created_at ON public.visitor_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_feedback_rating ON public.visitor_feedback(rating);
