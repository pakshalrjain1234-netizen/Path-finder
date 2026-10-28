# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Students:** Enrolled MNMJEC students requiring fast, reliable wayfinding across departments, classrooms, and labs, alongside an interactive spatial passport to report maintenance and facility issues with 3D coordinate pins and photographic evidence.
- **Visitors & Guests:** Prospective students, parents, visiting lecturers, and campus guests seeking self-guided 3D exploration, turn-by-turn walking routes, and cinematic audio-narrated tours without login credentials.
- **Administrators & Estate Managers:** Campus facility and maintenance operations personnel tracking work orders, assigning specialized trade teams (electrical, plumbing, civil, IT), reviewing photo evidence in lightboxes, and reviewing visitor impressions.
- **Developers & Surveyors:** Engineering staff conducting multi-sample GPS ground surveys, verifying 2D Helmert conformal transformation residuals, and validating navigation graph safety.

## Product Purpose

PATH FINDER is an interactive 3D digital twin, algorithmic navigation, and campus facility management platform engineered specifically for Misrimal Navajee Munoth Jain Engineering College (MNMJEC), Thorapakkam, Chennai. The system eliminates campus disorientation, delivers reliable turn-by-turn walking guidance, streamlines physical estate issue reporting with verifiable photographic proof, and ensures total spatial safety through ground-truth calibration benchmarks.

## Positioning

Unlike conventional public map applications (which lack indoor entrance fidelity and architectural precision) or unverified exploratory tools, PATH FINDER pairs an authoritative, lightweight 3D campus digital twin (Stage E3 mesh) with topological Dijkstra pathfinding and strict physical GPS calibration safety locks. It operates with strict role isolation between guests, students, and administrators, maintaining truth in backend readiness and survey validation.

## Operating Context

- **Campus Location:** Misrimal Navajee Munoth Jain Engineering College (MNMJEC), Thorapakkam, OMR, Chennai, Tamil Nadu, India.
- **Physical Environment:** Multi-acre college campus comprising main academic blocks, specialized engineering departments, administrative wings, central library, sports grounds, and student amenities.
- **Device & Field Constraints:** Outdoor mobile use in high-glare Chennai daylight, requiring high-contrast UI, responsive touch targets, and resilient performance across low-end mobile devices and high-end desktop workstations.
- **Connectivity:** Designed as a responsive Progressive Web App (PWA) with offline-resilient route caching, fallback instructions, and honest status indicators during network disruption.

## Capabilities and Constraints

- **3D Digital Twin Engine:** WebGL Three.js and React Three Fiber rendering the authoritative Stage E3 campus model (`/models/MNMJEC_Campus_Stage_E3_Web.glb`), complete with resolved multi-entrance assemblies and floor levels.
- **Topological Navigation:** Dijkstra pathfinding graph with collision-free campus walkways, handicap/step considerations, and safe building entrance approach vectors.
- **GPS Calibration & Safety Guardrail:** 2D Helmert conformal transformation solver for mapping physical GPS coordinates to 3D model space. Production live navigation follower remains strictly locked (`isApprovedForLiveNavigation === false`) until verified against ground physical benchmarks.
- **Role Isolation:** Zero-bleed multi-screen authentication gateway with distinct DOM tree unmounting for Student, Administrator, and credential-free Visitor journeys.
- **Facilities Issue Passport:** 3D coordinate pin picker, multi-category fault logging, camera/gallery photographic capture, Supabase Storage integration (`campus-issue-photos`), and append-only audit trail.
- **Cinematic Audio Tour:** State machine-driven camera traversal synchronized with Web Speech API speech synthesis narration.

## Brand Commitments

- **Institution:** Misrimal Navajee Munoth Jain Engineering College (MNMJEC), Thorapakkam, Chennai.
- **Design System ("Dark University"):**
  - Background Canvas: `#101827`
  - Secondary / Elevated Layers: `#162235`
  - Card & Container Surfaces: `#192638`
  - Structural Borders & Dividers: `#24364D` (and `#293A50`)
  - Primary Accent (Scholastic Blue): `#60A5FA`
  - Success Indicator (Campus Emerald): `#34D399`
  - Typography: `#F1F5F9` (primary text) and `#94A3B8` (muted text)
- **Voice & Tone:** Scholastic, technically authoritative, clear, and transparent. Avoids promotional hyperbole, cybersecurity tropes, or simulated/fake system statuses.

## Evidence on Hand

- **Authoritative 3D Campus Asset:** `public/models/MNMJEC_Campus_Stage_E3_Web.glb` (1.63 MB verified model).
- **Navigation Graph & POI Database:** `src/data/navigationGraph.ts`, `src/data/campusPois.ts`.
- **GPS Field Survey Data:** `src/data/campusGpsSurveyData.ts`, `src/lib/campusCalibration.ts`.
- **Backend Architecture & Storage Policies:** `supabase/migrations/`, `supabase/storage_setup.sql`.
- **Comprehensive Technical Verification:** `docs/PATHFINDER_FRONTEND_BACKEND_AUDIT.md`.
- **Automated Verification:** Passing unit test suite covering route computation, coordinate transformation, and role authorization.

## Product Principles

1. **Ground-Truth Safety & Precision:** Live navigation and location claims must be backed by verified physical benchmarks and authoritative 3D geometry; never present speculative paths as ground truth.
2. **Role Isolation & Clean Boundaries:** Maintain strict isolation between Student, Administrator, and Visitor workflows without credential leakage or ambiguous permission states.
3. **Operational Truthfulness:** Reflect actual system and cloud service states (storage, GPS lock, network) with clarity and integrity rather than disguising errors or simulating unearned success.
4. **Restrained Scholastic Craft:** Maintain the established Dark University design language with intentional hierarchy, legible typography, high contrast, and no gratuitous neon effects.

## Accessibility & Inclusion

- Adherence to WCAG AA color contrast standards against dark background canvases (`#101827`).
- Touch-friendly interactive targets ($\ge 44 \times 44\text{ px}$) across all mobile navigation drawers, map controls, and action triggers.
- Text-based turn-by-turn guidance drawers accompanying 3D camera transitions for users with visual or motion sensitivities.
