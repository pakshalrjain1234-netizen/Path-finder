---
name: Campus Wayfinding Engine
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#3d4947'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#6d7a77'
  outline-variant: '#bcc9c6'
  surface-tint: '#006a60'
  primary: '#00685d'
  on-primary: '#ffffff'
  primary-container: '#008376'
  on-primary-container: '#f4fffb'
  inverse-primary: '#6fd8c8'
  secondary: '#a33d23'
  on-secondary: '#ffffff'
  secondary-container: '#ff8162'
  on-secondary-container: '#731a04'
  tertiary: '#4d5d73'
  on-tertiary: '#ffffff'
  tertiary-container: '#66768d'
  on-tertiary-container: '#fdfcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#8cf5e4'
  primary-fixed-dim: '#6fd8c8'
  on-primary-fixed: '#00201c'
  on-primary-fixed-variant: '#005048'
  secondary-fixed: '#ffdad2'
  secondary-fixed-dim: '#ffb4a2'
  on-secondary-fixed: '#3c0700'
  on-secondary-fixed-variant: '#83260e'
  tertiary-fixed: '#d3e4fe'
  tertiary-fixed-dim: '#b7c8e1'
  on-tertiary-fixed: '#0b1c30'
  on-tertiary-fixed-variant: '#38485d'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
typography:
  display:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: 0em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system delivers an intuitive, premium, and spatially intelligent progressive web app designed for indoor and outdoor academic campus navigation. Taking cues from modern spatial cartography platforms (such as Google Maps) and high-end interactive mall directories, the visual language prioritizes utility, speed, and spatial awareness while remaining welcoming to students, faculty, and first-time campus visitors.

The aesthetic fuses modern minimalism with subtle glassmorphic HUD overlays. Interactive controls float above the three-dimensional viewport as translucent, blur-backed micro-surfaces, minimizing visual obstruction and maximizing real estate for campus exploration. Tactile feedback, crisp vector geometry, and high-legibility typographic hierarchies instill immediate confidence during live transit across departments, lecture halls, and facilities.

## Colors

The palette establishes clear visual weight and operational clarity over complex multi-level 3D maps:

- **Primary Teal (`#2A9D8F`)**: Used for the primary transit route polyline, start pins, primary action buttons, active navigation states, and destination highlights. It offers strong contrast against both outdoor satellite greens and neutral architectural concrete floorplans.
- **Secondary / Accent Coral (`#E76F51`)**: Reserved for live alerts, urgent campus updates, hazard notices, rerouting cues, and primary destination target nodes.
- **Dark Slate (`#1E293B`)**: The primary text tone and structural icon color, ensuring AA/AAA contrast ratios against white and frosted glass surfaces.
- **Secondary Slate (`#64748B`)**: Used for directional metadata, walk duration estimates, floor labels, and secondary supporting copy.
- **Surface & Canvas (`#FFFFFF` and `#F8FAFC`)**: Canvas base remains ultra-clean slate-tinted white (`#F8FAFC`), while interactive floating sheets, cards, and modal dialogs rely on pure white (`#FFFFFF`) with precise structural borders (`#E2E8F0`).

## Typography

Inter serves as the singular typeface across headlines, body copy, and cartographic labels. Its engineered geometric structure and tall x-height guarantee instantaneous legibility at quick glances during outdoor walking or low-light indoor navigation.

- **Display & Headings**: Tightly tracked headlines maintain structural compactness within floating UI cards and bottom sheets.
- **Labels & Micro-copy**: Wayfinding tags, floor level switchers (e.g., `L1`, `L2`, `L3`), and distance metrics use semi-bold and medium weights with slight positive tracking to ensure maximum legibility at small viewport footprints.

## Layout & Spacing

The layout model is mobile-first, relying on an edge-to-edge full-bleed WebGL viewport with a 12-column responsive fluid grid overlay for interface elements.

- **Mobile Viewports (< 768px)**: Floating HUD controls sit within safe-area-inset boundaries with 16px (`1rem`) screen margins. Bottom sheets utilize fluid drawer heights (`peek: 140px`, `mid: 45vh`, `full: 90vh`). Floating elements such as the search bar and compass widget maintain strict 12px to 16px margins from viewport boundaries.
- **Tablet & Desktop (>= 768px)**: Canvas margins widen to 32px (`2rem`). The bottom navigation sheet transitions into a persistent, left-docked floating card panel (width: 400px, max-height: calc(100vh - 64px)) hovering directly over the map canvas. HUD buttons cluster neatly along the top-right and bottom-right edges.

## Elevation & Depth

Depth in this system separates the active 3D canvas from the operational HUD:

- **Level 0 (Map Viewport)**: Base canvas hosting the interactive 3D scene, terrain, building extrusions, and polyline routes.
- **Level 1 (Glassmorphic HUD Overlays)**: Compass widgets, floor switchers, layer toggles, and 2D/3D perspective controls. Styled with `background: rgba(255, 255, 255, 0.82)`, `backdrop-filter: blur(12px)`, a fine 1px border (`rgba(226, 232, 240, 0.8)`), and an ambient drop shadow: `0 4px 16px -2px rgba(30, 41, 59, 0.08), 0 2px 6px -1px rgba(30, 41, 59, 0.04)`.
- **Level 2 (Interactive Floating Sheets & Cards)**: Search results, navigation step cards, and campus building overview bottom sheets. Styled with solid `background: #FFFFFF`, 1px border (`#E2E8F0`), and elevated drop shadow: `0 10px 25px -5px rgba(30, 41, 59, 0.12), 0 8px 10px -6px rgba(30, 41, 59, 0.04)`.
- **Level 3 (Modal Overlays & Critical Alerts)**: Full modal dialogs, emergency alert banners, and facility booking prompts. Features a diffuse dark backdrop scrim (`rgba(15, 23, 42, 0.4)`) and `0 20px 30px -10px rgba(30, 41, 59, 0.2)`.

## Shapes

The interface embraces modern, rounded cartographic conventions to evoke friendliness and frictionless flow:

- **Primary UI Surfaces**: Standard cards, search containers, and floating HUD panels use `rounded-lg` (16px / 1rem).
- **Interactive Controls**: Buttons, segmented floor selectors, and text inputs employ standard rounded corners (8px / 0.5rem).
- **Pill Badges & Circular Buttons**: Campus category filters, verified tags, navigation directional pills, and circular floating action controls (compass widget, re-center button, 2D/3D switch) adopt full capsule/circular geometry (`rounded-full` / 9999px).

## Components

### Buttons & Action Triggers
- **Primary Action (Route Start / Navigate)**: Solid `#2A9D8F` fill, white `#FFFFFF` text, 12px vertical padding, 20px horizontal padding, subtle hover shift (`brightness 0.95`), and active scale down (`scale(0.98)`).
- **Glass HUD Buttons**: Square or circular 44x44px hit-targets with 20px Lucide icons centered. Rendered with translucent white surface, 1px `#E2E8F0` border, and 12px backdrop blur.
- **Floor Stepper / Level Selector**: Vertical stacked segmented pill containing single-character badges (e.g., `G`, `1`, `2`, `3`). Selected floor highlights in `#2A9D8F` with crisp white text; unselected floors remain neutral slate `#64748B`.

### Search & Input Fields
- Floating top search bar with 48px height, rounded-full or rounded-lg styling, integrated leading search icon, trailing voice / filter icon, and soft focus ring with primary teal glow (`0 0 0 3px rgba(42, 157, 143, 0.2)`).

### Chips & Verified Badges
- **Category Filter Chips**: Pill-shaped horizontal scrolling filters (e.g., "Auditorium", "Labs", "Cafeteria", "Admin"). Active chip uses `#2A9D8F` fill with white text; inactive chip features `#FFFFFF` background with 1px `#E2E8F0` border and `#1E293B` text.
- **Verified Facility Badge**: Mini-pill with soft teal background (`rgba(42, 157, 143, 0.12)`), `#2A9D8F` text, and a checkmark icon to confirm verified indoor room mappings.

### Mobile Bottom Sheets & Floating Cards
- Smooth draggable bottom sheet with top-centered grab handle (36x4px, `#CBD5E1`, rounded-full).
- Content zones support swipeable step-by-step turn guidance: high-contrast directional arrow icon in primary teal, bold instruction text (`headline-sm`), and secondary remaining distance/time estimates.

### Compass & Perspective Toggle
- **Compass Widget**: 44x44px circular glass card displaying dynamic rotating compass needle pointing North (`#E76F51` north indicator). Tap resets view to standard North-up orientation.
- **2D / 3D Perspective Switch**: Pill toggle switching between isometric 3D tilt perspective (45-degree angle with extruded block architecture) and top-down planar 2D overview.