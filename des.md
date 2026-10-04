---
version: "alpha"
name: "Portfolio - Technical System"
description: "Portfolio Technical Feature Section is designed for highlighting product capabilities and value points. Key features include reusable structure, responsive behavior, and production-ready presentation. It is suitable for component libraries and responsive product interfaces."
colors:
  primary: "#2563EB"
  secondary: "#A3A3A3"
  tertiary: "#7628F3"
  neutral: "#A3A3A3"
  background: "#FFFFFF"
  surface: "#D4D4D4"
  text-primary: "#A3A3A3"
  text-secondary: "#737373"
  border: "#E5E5E5"
  accent: "#2563EB"
typography:
  display-lg:
    fontFamily: "Oswald"
    fontSize: "48px"
    fontWeight: 300
    lineHeight: "48px"
    letterSpacing: "-0.05em"
  body-md:
    fontFamily: "System Font"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
  label-md:
    fontFamily: "Inter"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
rounded:
  md: "0px"
spacing:
  base: "4px"
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  gap: "6px"
  card-padding: "12px"
  section-padding: "24px"
components:
  button-primary:
    backgroundColor: "#FAFAFA"
    textColor: "#171717"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: "12px"
  button-link:
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    padding: "0px"
---

## Overview

- **Composition cues:**
  - Layout: Flex
  - Content Width: Full Bleed
  - Framing: Glassy
  - Grid: Minimal

## Colors

The color system uses light mode with #2563EB as the main accent and #A3A3A3 as the neutral foundation.

- **Primary (#2563EB):** Main accent and emphasis color.
- **Secondary (#A3A3A3):** Supporting accent for secondary emphasis.
- **Tertiary (#7628F3):** Reserved accent for supporting contrast moments.
- **Neutral (#A3A3A3):** Neutral foundation for backgrounds, surfaces, and supporting chrome.

- **Usage:** Background: #FFFFFF; Surface: #D4D4D4; Text Primary: #A3A3A3; Text Secondary: #737373; Border: #E5E5E5; Accent: #2563EB

- **Gradients:** bg-gradient-to-b from-white to-transparent, bg-gradient-to-t from-neutral-100/20 to-transparent

## Typography

Typography pairs Oswald for display hierarchy with System Font for supporting content and interface copy.

- **Display (`display-lg`):** Oswald, 48px, weight 300, line-height 48px, letter-spacing -0.05em.
- **Body (`body-md`):** System Font, 16px, weight 400, line-height 24px.
- **Labels (`label-md`):** Inter, 16px, weight 400, line-height 24px.

## Layout

Layout follows a flex composition with reusable spacing tokens. Preserve the flex, full bleed structural frame before changing ornament or component styling. Use 4px as the base rhythm and let larger gaps step up from that cadence instead of introducing unrelated spacing values.

Treat the page as a flex / full bleed composition, and keep that framing stable when adding or remixing sections.

- **Layout type:** Flex
- **Content width:** Full Bleed
- **Base unit:** 4px
- **Scale:** 4px, 6px, 8px, 12px, 16px, 24px, 32px, 40px
- **Section padding:** 24px, 40px
- **Card padding:** 12px, 24px, 40px
- **Gaps:** 6px, 8px, 12px, 16px

## Elevation & Depth

Depth is communicated through glass, border contrast, and reusable shadow or blur treatments. Keep those recipes consistent across hero panels, cards, and controls so the page reads as one material system.

Surfaces should read as glass first, with borders, shadows, and blur only reinforcing that material choice.

- **Surface style:** Glass
- **Borders:** 1px #E5E5E5; 1px #D4D4D4; 1px #F5F5F5
- **Shadows:** rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 1px 2px 0px
- **Blur:** 8px

### Techniques
- **Gradient border shell:** Use a thin gradient border shell around the main card. Wrap the surface in an outer shell with 0px padding and a 0px radius. Drive the shell with none so the edge reads like premium depth instead of a flat stroke. Keep the actual stroke understated so the gradient shell remains the hero edge treatment. Inset the real content surface inside the wrapper with a slightly smaller radius so the gradient only appears as a hairline frame.

## Shapes

Shapes rely on a tight radius system anchored by 9999px and scaled across cards, buttons, and supporting surfaces. Icon geometry should stay compatible with that soft-to-controlled silhouette.

Use the radius family intentionally: larger surfaces can open up, but controls and badges should stay within the same rounded DNA instead of inventing sharper or pill-only exceptions.

- **Corner radii:** 9999px
- **Icon treatment:** Linear
- **Icon sets:** Solar

## Components

Anchor interactions to the detected button styles.

### Buttons
- **Primary:** background #FAFAFA, text #171717, radius 0px, padding 12px, border 1px solid rgb(229, 229, 229).
- **Links:** text #737373, radius 0px, padding 0px, border 0px solid rgb(229, 231, 235).

### Iconography
- **Treatment:** Linear.
- **Sets:** Solar.

## Do's and Don'ts

Use these constraints to keep future generations aligned with the current system instead of drifting into adjacent styles.

### Do
- Do use the primary palette as the main accent for emphasis and action states.
- Do keep spacing aligned to the detected 4px rhythm.
- Do reuse the Glass surface treatment consistently across cards and controls.
- Do keep corner radii within the detected 9999px family.

### Don't
- Don't introduce extra accent colors outside the core palette roles unless the page needs a new semantic state.
- Don't mix unrelated shadow or blur recipes that break the current depth system.
- Don't exceed the detected moderate motion intensity without a deliberate reason.

## Motion

Motion feels controlled and interface-led across text, layout, and section transitions. Timing clusters around 150ms. Easing favors ease and cubic-bezier(0.4. Hover behavior focuses on text and color changes. Scroll choreography uses GSAP ScrollTrigger for section reveals and pacing.

**Motion Level:** moderate

**Durations:** 150ms

**Easings:** ease, cubic-bezier(0.4, 0, 0.2, 1)

**Hover Patterns:** text, color

**Scroll Patterns:** gsap-scrolltrigger
