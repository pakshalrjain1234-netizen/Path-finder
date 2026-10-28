-- ==============================================================================
-- PATH FINDER: Phase 9D Real Database RLS & Security Integration Test Suite
-- Target: Disposable local Supabase / PostgreSQL instance with RLS enabled.
-- Simulates distinct security contexts: anon, student, and admin.
-- ==============================================================================

BEGIN;

-- Test Setup: Create disposable test users in auth.users and public.profiles
ALTER TABLE public.profiles DISABLE TRIGGER trg_protect_profile_role;
DO $$
DECLARE
    v_student_a_id UUID := '11111111-1111-1111-1111-111111111111';
    v_student_b_id UUID := '22222222-2222-2222-2222-222222222222';
    v_admin_id     UUID := '99999999-9999-9999-9999-999999999999';
BEGIN
    -- Insert test auth.users records
    INSERT INTO auth.users (id, email)
    VALUES
        (v_student_a_id, 'student_a@mnmjec.ac.in'),
        (v_student_b_id, 'student_b@mnmjec.ac.in'),
        (v_admin_id,     'admin@mnmjec.ac.in')
    ON CONFLICT (id) DO NOTHING;

    -- Insert test profiles if not exists
    INSERT INTO public.profiles (id, email, role, student_id, department, display_name)
    VALUES
        (v_student_a_id, 'student_a@mnmjec.ac.in', 'student', '311822104018', 'Computer Science & Engineering', 'Aditya Sundaram'),
        (v_student_b_id, 'student_b@mnmjec.ac.in', 'student', '311822114009', 'Mechanical Engineering', 'Karthik Raja'),
        (v_admin_id,     'admin@mnmjec.ac.in',     'admin',   NULL,           'Campus Administration',          'Dr. K. Ramanathan')
    ON CONFLICT (id) DO UPDATE SET
        role = EXCLUDED.role,
        student_id = EXCLUDED.student_id;
END $$;
ALTER TABLE public.profiles ENABLE TRIGGER trg_protect_profile_role;

-- -----------------------------------------------------------------------------
-- TEST 1: Direct table INSERT is denied to anon (Must go through Edge Function)
-- -----------------------------------------------------------------------------
SET LOCAL ROLE anon;
DO $$
BEGIN
    BEGIN
        INSERT INTO public.visitor_feedback (category, comments)
        VALUES ('Campus visit experience', 'Malicious direct insertion attempt by anon');
        RAISE EXCEPTION 'TEST 1 FAILED: Anon was able to insert directly into visitor_feedback!';
    EXCEPTION WHEN insufficient_privilege THEN
        RAISE NOTICE 'TEST 1 PASSED: Direct INSERT is strictly denied to anon.';
    END;
END $$;

-- -----------------------------------------------------------------------------
-- TEST 2: Direct execution of submit_unified_feedback is denied to anon and authenticated
-- -----------------------------------------------------------------------------
SET LOCAL ROLE anon;
DO $$
BEGIN
    BEGIN
        PERFORM public.submit_unified_feedback('visitor', 5, 'Campus visit experience', 'Hacker', NULL, NULL, 'Bypass', 'hash', NULL);
        RAISE EXCEPTION 'TEST 2A FAILED: Anon was able to execute submit_unified_feedback directly!';
    EXCEPTION WHEN insufficient_privilege THEN
        RAISE NOTICE 'TEST 2A PASSED: submit_unified_feedback execution denied to anon.';
    END;
END $$;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';
DO $$
BEGIN
    BEGIN
        PERFORM public.submit_unified_feedback('student', 4, 'Campus facilities', 'Student', '311822104018', 'CSE', 'Direct bypass', 'hash', '11111111-1111-1111-1111-111111111111'::UUID);
        RAISE EXCEPTION 'TEST 2B FAILED: Authenticated student was able to execute submit_unified_feedback directly!';
    EXCEPTION WHEN insufficient_privilege THEN
        RAISE NOTICE 'TEST 2B PASSED: submit_unified_feedback execution denied to authenticated clients.';
    END;
END $$;

-- -----------------------------------------------------------------------------
-- TEST 3: Student cannot read internal staff notes (feedback_internal_notes)
-- -----------------------------------------------------------------------------
SET LOCAL ROLE service_role;
-- Seed test feedback and staff internal note
INSERT INTO public.visitor_feedback (id, user_type, category, comments, user_id, student_id, status)
VALUES ('FB-TEST-001', 'student', 'Campus facilities', 'Student A private complaint', '11111111-1111-1111-1111-111111111111', '311822104018', 'reviewed');

INSERT INTO public.feedback_internal_notes (feedback_id, admin_id, admin_name, note)
VALUES ('FB-TEST-001', '99999999-9999-9999-9999-999999999999', 'Estate Officer', 'CONFIDENTIAL STAFF NOTE: Escalated to Dean.');

-- Switch to Student A
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';

DO $$
DECLARE
    v_notes_count INT;
BEGIN
    SELECT COUNT(*) INTO v_notes_count FROM public.feedback_internal_notes WHERE feedback_id = 'FB-TEST-001';
    IF v_notes_count > 0 THEN
        RAISE EXCEPTION 'TEST 3 FAILED: Student was able to view confidential administrative notes!';
    ELSE
        RAISE NOTICE 'TEST 3 PASSED: Student receives 0 rows when attempting to inspect feedback_internal_notes.';
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- TEST 4: Student cannot read peer student's feedback (Cross-Student Isolation)
-- -----------------------------------------------------------------------------
-- Seed Student B feedback
SET LOCAL ROLE service_role;
INSERT INTO public.visitor_feedback (id, user_type, category, comments, user_id, student_id, status)
VALUES ('FB-TEST-002', 'student', 'Student services', 'Student B private complaint', '22222222-2222-2222-2222-222222222222', '311822114009', 'pending');

-- Switch to Student A (11111111-1111-1111-1111-111111111111)
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';

DO $$
DECLARE
    v_peer_count INT;
BEGIN
    SELECT COUNT(*) INTO v_peer_count FROM public.visitor_feedback WHERE id = 'FB-TEST-002';
    IF v_peer_count > 0 THEN
        RAISE EXCEPTION 'TEST 4 FAILED: Student A was able to read Student B feedback!';
    ELSE
        RAISE NOTICE 'TEST 4 PASSED: Student A cannot see peer student feedback under RLS.';
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- TEST 5: Non-admin cannot call admin_review_feedback
-- -----------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';

DO $$
BEGIN
    BEGIN
        PERFORM public.admin_review_feedback('FB-TEST-001', 'addressed', 'Unauthorized note by student');
        RAISE EXCEPTION 'TEST 5 FAILED: Student was able to execute admin_review_feedback!';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM LIKE '%Access Denied%' THEN
            RAISE NOTICE 'TEST 5 PASSED: admin_review_feedback strictly rejects non-admin users with Access Denied.';
        ELSE
            RAISE EXCEPTION 'TEST 5 UNEXPECTED ERROR: %', SQLERRM;
        END IF;
    END;
END $$;

-- -----------------------------------------------------------------------------
-- TEST 6: Administrator can view all feedback and internal notes
-- -----------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '99999999-9999-9999-9999-999999999999';

DO $$
DECLARE
    v_total_fb INT;
    v_total_notes INT;
BEGIN
    SELECT COUNT(*) INTO v_total_fb FROM public.visitor_feedback WHERE id IN ('FB-TEST-001', 'FB-TEST-002');
    SELECT COUNT(*) INTO v_total_notes FROM public.feedback_internal_notes WHERE feedback_id = 'FB-TEST-001';

    IF v_total_fb != 2 OR v_total_notes != 1 THEN
        RAISE EXCEPTION 'TEST 6 FAILED: Admin should see 2 feedbacks and 1 note, got fb=% notes=%', v_total_fb, v_total_notes;
    ELSE
        RAISE NOTICE 'TEST 6 PASSED: Verified administrator can access all feedback and review notes.';
    END IF;
END $$;

-- Rollback the transaction so no test records persist
ROLLBACK;
