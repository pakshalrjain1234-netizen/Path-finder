---
name: PATH FINDER
description: Interactive 3D Digital Twin & Autonomous Campus Navigation Platform (Dreamscape Pastel)
colors:
  # Dreamscape Pastel Design System (Phase 9H — Editorial 3D Creative Direction)
  # 1. Main Backgrounds & Elevated Canvases (Zero pure-white backgrounds)
  canvas-lavender: "#E8DDF2"
  surface-lilac: "#D2BEE7"
  surface-lilac-light: "#DFD0EF"
  surface-card: "#FBF8FD"
  border-soft: "#C9B6DF"
  border-subtle: "#D9C9EB"
  
  # 2. Distinctive Warm & Cool Pastel Accents
  peach-feature: "#E8C8B9"
  peach-feature-deep: "#9E563A"
  peach-feature-light: "#F5E6DF"
  
  powder-secondary: "#C6DCE4"
  powder-secondary-deep: "#265A6E"
  powder-secondary-light: "#E4EFF3"
  
  sage-accent: "#BCD8C9"
  sage-accent-deep: "#1E583F"
  sage-accent-light: "#DFEDE5"
  
  # 3. High-Contrast Plum Editorial Typography
  text-primary: "#352A47"
  text-supporting: "#51465F"
  text-muted: "#6E6280"
  text-subtle: "#8C809E"
  
  # 4. Primary Interactive CTAs
  cta-primary: "#352A47"
  cta-primary-hover: "#433659"
  cta-primary-text: "#FAF6FD"
  
  cta-accent: "#E8C8B9"
  cta-accent-hover: "#DEC0B0"
  cta-accent-text: "#352A47"
typography:
  editorial:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "3.75rem"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Syne, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Syne, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0em"
  label:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.02em"
rounded:
  sm: "8px"
  md: "14px"
  lg: "20px"
  xl: "28px"
  2xl: "36px"
  full: "9999px"
shadows:
  dream-soft: "0 4px 20px -4px rgba(53, 42, 71, 0.08), 0 2px 6px -2px rgba(53, 42, 71, 0.04)"
  dream-card: "0 10px 30px -6px rgba(53, 42, 71, 0.1), 0 4px 12px -2px rgba(53, 42, 71, 0.06)"
  dream-elevated: "0 20px 48px -10px rgba(53, 42, 71, 0.14), 0 6px 16px -4px rgba(53, 42, 71, 0.08)"
  dream-floating: "0 24px 60px -12px rgba(53, 42, 71, 0.18), 0 8px 24px -6px rgba(53, 42, 71, 0.1)"
---

# Design System: PATH FINDER

## Creative North Star: "Dreamscape Pastel"

PATH FINDER is an architectural 3D navigation and digital twin experience engineered for **Misrimal Navajee Munoth Jain Engineering College (MNMJEC), Chennai**.

### The Visual Transformation
The previous generic SaaS dashboard and dark navy looks are **completely superseded**. The application embodies the **Dreamscape Pastel** aesthetic:

1. **Atmospheric Lavender & Lilac Foundations (No Pure-White Dominance)**:
   - Primary Background: Soft atmospheric lavender (`#E8DDF2`).
   - Elevated Architecture: Ethereal lilac (`#D2BEE7` / `#DFD0EF`).
   - Cards: Warm porcelain surfaces (`#FBF8FD`) framed with delicate lilac borders (`#C9B6DF`).

2. **Artisanal Secondary Pastels**:
   - **Dusty Peach (`#E8C8B9`)**: Warm terracotta pastel for feature highlights and primary exploration triggers.
   - **Powder Blue (`#C6DCE4`)**: Cool sky pastel for route planning and 3D wayfinding markers.
   - **Muted Sage (`#BCD8C9`)**: Organic garden pastel for campus verified walkways and feedback.

3. **High-Contrast Deep Plum Editorial Typography**:
   - Primary Typography: Deep Plum (`#352A47`) delivering 8.5:1+ contrast on lavender canvas.
   - Supporting Typography: Muted Plum (`#51465F`).
   - No washed-out gray text or illegible pastel-on-pastel combinations.

4. **Editorial Two-Font Architecture**:
   - **Headings & Accents**: `Space Grotesk` — bold, architectural, expressive, and distinctive.
   - **Body & Navigation**: `DM Sans` — elegant, modern, accessible, and comfortable for extended reading.

5. **Integrated 3D Campus Showcase**:
   - The authoritative 3D digital twin (Stage E3 mesh) sits as an artistic architectural jewel inside an organic dreamscape frame (`rounded-3xl` / `rounded-[2rem]`) with soft plum shadows and elegant floating controls.

6. **Universal Curved Pastel Navigation System (Phase 9H — Approved UI Reference)**:
   - **Curved Floating Silhouette**:
     - Distinctive sculpted, flowing right-edge boundary rendered via non-scaling SVG glass geometry (`M 0,0 L 255,0 C 290,120 315,320 305,520 C 292,720 272,870 255,1000 L 0,1000 Z`).
     - Frosted glass surface: `linear-gradient(135deg, rgba(255,255,255,0.94) 0%, rgba(250,244,253,0.88) 25%, rgba(243,231,251,0.84) 65%, rgba(236,224,247,0.92) 100%)`.
     - Luminous pearl contour stroke (`stroke="rgba(255, 255, 255, 0.95)" strokeWidth="1.5"`) with soft lilac shadow (`drop-shadow(0 12px 32px rgba(139,92,246,0.18))`).
     - Ethereal floating pearls and subtle floral petal hints positioned naturally along the outer curve.
   - **Coordinated Pastel Icon Harmonies**:
     - *Welcome / Home*: Soft Lavender (`#EDE7F6` / `#6C5CE7`)
     - *3D Explorer*: Soft Sky Blue (`#E0F2FE` / `#0284C7`)
     - *Navigation*: Warm Peach (`#FFEDD5` / `#EA580C`)
     - *Discover MNMJEC*: Mint Sage (`#D1FAE5` / `#059669`)
     - *Cinematic Tour*: Melon Rose (`#FFE4E6` / `#E11D48`)
     - *Search Directory*: Powder Blue (`#E8EFFE` / `#2563EB`)
     - *Campus Issue Passport*: Royal Violet (`#EDE9FE` / `#7C3AED`)
     - *My Reports*: Cyan Aqua (`#E0F7FA` / `#00838F`)
     - *Feedback Center / Visitor Feedback*: Violet Amethyst (`#F3E8FF` / `#9333EA`)
     - *GPS Calibration*: Amber Gold (`#FEF3C7` / `#D97706`)
     - *Saved Locations*: Blush Rose (`#FCE7F3` / `#DB2777`)
     - *Help & Support*: Ice Blue (`#E0F2FE` / `#0284C7`)
   - **Active Navigation Pill Indicator**:
     - Floating pearl-to-lavender card: `bg-gradient-to-r from-white/95 via-[#F8F1FC]/90 to-[#EDE2F8]/85 border border-white/95 shadow-[0_8px_20px_-4px_rgba(124,92,191,0.2)]`.
     - Rich royal lilac icon badge: `bg-gradient-to-br from-[#7C5CBF] to-[#5B3E9E]` with white icon.
     - Dark plum typography: Primary title (`#2A1D3B`, font-bold), subtitle (`#645378`).
     - Crisp 4-point golden sparkle accent (`✦`, `#E09067`).
   - **Role-Filtered Destination Architecture**:
     - *Student*: 11 permitted modules (Home, 3D Explorer, Navigation, Discover, Tour, Search, Issue Passport, My Reports, Feedback Center, Saved Locations, Help).
     - *Visitor*: 9 public destinations strictly isolated from issue tickets or admin controls (Home, 3D Explorer, Navigation, Discover, Tour, Search, Visitor Feedback, Saved Locations, Help).
     - *Administrator*: 11 command and operations modules (Admin Dashboard, Campus Issues, Feedback Management, 3D Explorer, Navigation, Discover, Search, Tour, GPS Calibration, Saved Locations, Help).
   - **Bottom Profile Card**:
     - Floating porcelain surface with frosted glass finish.
     - Role-colored avatar with verified display name and institutional email / status.
     - Secure session termination (`LogOut`) or role switch (`LogIn`).
     - Persistent live GPS fix status indicator (`#app-sidebar-gps-status`).
   - **Responsive Behavior**:
     - *Desktop (≥ 1024px)*: Complete curved navigation design with manual collapse/expand capability.
     - *Tablet (768px – 1023px)*: Seamlessly adapts to a compact 80px frosted pastel navigation rail with centered pastel icon containers and quick actions, keeping the Stage E3 viewport wide and unobstructed.
     - *Mobile (< 768px)*: Restyled frosted pearl floating bottom navigation bar with safe-area support and min 44×44px touch targets.



## 7. Phase 9I: Rotating Curved Navigation & Immersive 3D Campus Presentation

1. **Rotatable Circular Navigation Arc (`CurvedPastelSidebar.tsx`)**:
   - **Vertical Circular Arc Layout**:
     - Modules are arranged along an elegant circular arc around a subtle central visual axis (`#arcAxisGrad` dashed arc guide with orbital pivot node).
     - Items follow the outward curve of the sculpted frosted-glass silhouette ($x = 18 \cdot \cos(\theta) - 4$), protruding gracefully outward at the apex.
     - Kept strictly horizontal (`rotate(0deg)`) for optimal reading ergonomics and clarity.
   - **User-Controlled Circular Motion**:
     - *Mouse Drag / Touch Swipe*: Direct pointer tracking with smooth velocity and snap-to-item mechanics.
     - *Mouse Wheel*: Smooth rotational scrolling with wheel events.
     - *Previous / Next Controls*: Floating frosted pastel pills with `ChevronUp` and `ChevronDown` for step-by-step rotation.
     - *Keyboard Navigation*: Accessible `ArrowUp`, `ArrowDown`, `PageUp`, `PageDown`, `Home`, and `End` support with visible focus ring.
     - *Auto-Aligning Selection*: Route changes or module activations automatically rotate the active module into center focus.
     - *Reduced Motion Support*: Disables transition animations when `prefers-reduced-motion` is detected.

2. **Immersive Miniature 3D Campus Twin (`Campus3D.tsx`)**:
   - **Atmospheric Dreamscape Pastel Environment**:
     - Canvas clear color transitioned from dark `#101827` to dreamscape pastel lilac `#E8DDF2`.
     - Two-tier volumetric fog (`#E5D9F0`, 360m to 1600m) for depth without obscuring architecture.
     - Refined lighting: Crisp sunlight (`#FFFDF7`, 2.2 intensity), soft sky-to-ground hemisphere light (`#E0F2FE` / `#DFD0EF`), ambient fill (`#F5EDFC`), and soft specular rim.
   - **Elevated Miniature Diorama Pedestal Platform**:
     - Elevated circular platform ($y = -0.11$, $R \approx 135\text{m}-180\text{m}$) in porcelain pearl `#FAF7FD`.
     - Luminous dual-band perimeter rim glow: Soft cyan (`#38BDF8`) and royal lavender (`#C084FC`) emissive rings.
     - Sits strictly below walkway geometry ($y \ge 0.02$) and entrances, never interfering with Dijkstra routing or raycast picking.
   - **Floating Porcelain Building Labels & Pins**:
     - High-contrast porcelain cards (`#FAF6FD`/95) with deep plum typography (`#2A1D3B`).
     - Distinct category icon containers (emerald entrance, purple academic, amber facility, indigo department).
     - Vibrant active selection pill (`bg-gradient-to-r from-[#7C5CBF] to-[#5B3E9E] text-white border-2 border-white ring-4 ring-[#7C5CBF]/30`).
     - Refined connecting stem and purple/lavender roof anchor pins.
   - **Circular Rotation Controller & Camera HUD**:
     - Bottom-right turntable puck: Circular "Orbit Dial" with drag-to-orbit gesture support and left/right step rotation buttons (`RotateCcw` / `RotateCw`).
     - North Compass with dynamic needle and click-to-reset True North orientation (`btn-camera-north-orientation`).
     - Integrated Zoom (`+` / `-`) controls.
     - Expandable **Campus Overview Minimap Card** providing immediate one-click navigation to all 7 primary campus zones (Main Gate, Main Block, First Year Block, Civil, Mechanical, IT, Canteen, Boys Hostel).
   - **Preserved Safety Invariants**:
     - Real Blender-exported Stage E3 geometry is 100% unaltered.
     - Real Dijkstra routing graph, walkway anchors, and waypoints intact.
     - Live navigation approval lock (`isApprovedForLiveNavigation === false`) strictly preserved.
