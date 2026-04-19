# Design System Documentation: The Precision Naturalist

## 1. Overview & Creative North Star
The core philosophy of this design system is **"The Precision Naturalist."** In a market saturated with clinical, cold health trackers, we move toward a high-end editorial experience that blends rigorous data with organic sophistication. We are moving away from the "generic dashboard" look in favor of a layout that feels like a premium, personalized wellness journal.

The aesthetic is driven by high-contrast typography, intentional asymmetry, and deep tonal layering. We treat data not just as numbers, but as a visual narrative. By utilizing a charcoal-based dark mode punctuated by vibrant emerald tones, we create a focused, low-eye-strain environment that emphasizes "The Vitality Metric."

## 2. Colors & Tonal Depth
Our palette is rooted in the depth of the earth and the vibrancy of growth. We use color to direct the eye, not just to decorate the interface.

### The Palette
*   **Surface (The Canvas):** `surface` (#131313). A deep, charcoal foundation that allows Emerald accents to glow.
*   **Primary (The Life Force):** `primary` (#6EE591) and `primary_container` (#50C878). Used exclusively for progress, success states, and primary actions.
*   **Secondary (The Supporting Data):** `secondary` (#C8C6C5). Used for non-critical information and inactive states.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to section off content. Traditional borders create visual noise and "grid-locking." Boundaries must be defined through:
1.  **Background Color Shifts:** Use `surface_container_low` against a `surface` background to denote a section.
2.  **Vertical Space:** Use the Spacing Scale to create breathing room that implies separation.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. We use Material-style tiers to create "nested" depth:
*   **Base:** `surface` (The lowest layer).
*   **Sectioning:** `surface_container_low` or `surface_container` for large content blocks.
*   **Priority Cards:** `surface_container_high` (#2A2A2A) for interactive tiles.
*   **Overlays:** `surface_container_highest` (#353534) for tooltips and temporary states.

### The "Glass & Gradient" Rule
To elevate the experience beyond "standard dark mode," use Glassmorphism for floating elements (e.g., navigation bars or floating action buttons). Use `surface_bright` with a 60-80% opacity and a 20px `backdrop-blur`. Main CTAs should utilize a subtle linear gradient from `primary` to `primary_container` to add a sense of tactile "glow" and premium polish.

## 3. Typography
Typography is our primary tool for hierarchy. We pair **Manrope** for editorial headers and data displays with **Inter** for high-utility labels.

*   **Display (Display-LG/MD):** Used for the "North Star Metric" (e.g., remaining calories). These should be bold, high-contrast white (#E5E2E1) and typeset with tight letter-spacing (-2%).
*   **Headlines (Headline-SM/MD):** Used for section titles. These should feel authoritative. Use sentence case to maintain a conversational, high-end tone.
*   **Body (Body-LG/MD):** Optimized for readability. Never use pure white for long-form text; use `on_surface_variant` (#BDCABC) to reduce glare.
*   **Labels (Label-MD/SM):** Set in **Inter** with slightly increased letter-spacing (+5%) and all-caps for micro-nutrient headers to provide a "technical" feel against the organic headers.

## 4. Elevation & Depth
In this design system, elevation is conveyed through **Tonal Layering** rather than traditional structural lines.

*   **The Layering Principle:** Depth is achieved by "stacking" surface-container tiers. For instance, a `surface_container_highest` card sitting on a `surface_container_low` background creates a natural lift.
*   **Ambient Shadows:** When an element must "float" (like a Floating Action Button), shadows must be extra-diffused. 
    *   *Specs:* Blur: 32px, Y-Offset: 8px, Opacity: 6% of `#000000`.
*   **The "Ghost Border" Fallback:** If a container requires more definition for accessibility, use a "Ghost Border." This is a 1px stroke using the `outline_variant` token at **15% opacity**. Never use a 100% opaque stroke.
*   **Asymmetric Focus:** Avoid perfectly centered layouts for everything. Use left-aligned headlines with right-aligned data points to create a sophisticated, editorial rhythm.

## 5. Components

### Circular Progress Indicators
The "Daily Goal" ring must be the hero of the dashboard. Use a large-scale stroke (12px+) with rounded caps. The track should be `surface_container_highest`, and the progress should be the `primary` to `primary_container` gradient.

### Micro-Nutrient Tiles
*   **Container:** `surface_container_high`.
*   **Corner Radius:** `xl` (1.5rem / 24px) for a soft, premium feel.
*   **Content:** Avoid labels like "Carbs: 200g." Instead, use an editorial layout: a large `title-lg` for the value and a `label-sm` for the category, positioned asymmetrically.

### Filter Chips
*   **State:** Selected chips use `primary_container` with `on_primary_container` text. Unselected chips use `surface_container_highest` with no border.
*   **Shape:** `full` (pill shape).

### Buttons
*   **Primary:** Filled with the Emerald gradient. No border. Corner radius: `lg` (1rem).
*   **Secondary:** Ghost style using the `outline` token at 20% opacity.
*   **Floating Action Button (FAB):** Circular, `surface_bright` background with a `primary` icon. Use a high-diffusion glow shadow.

### Cards & Lists
*   **The No-Divider Rule:** Explicitly forbid 1px dividers between list items. Separate items using `8px` of vertical space or by alternating background tones (`surface_container_low` vs `surface_container_lowest`).

## 6. Do's and Don'ts

### Do
*   **DO** use whitespace as a functional tool to group related data.
*   **DO** use `display-lg` typography for the most important number on the screen.
*   **DO** ensure all emerald accents meet a 4.5:1 contrast ratio against the charcoal background for accessibility.
*   **DO** lean into glassmorphism for top and bottom navigation bars.

### Don't
*   **DON'T** use 100% black (#000000) for backgrounds; it feels "cheap" and lacks depth. Stick to the `surface` token.
*   **DON'T** use 1px solid dividers or high-contrast borders.
*   **DON'T** use standard system fonts (Arial/Helvetica); stick to the Manrope/Inter pairing.
*   **DON'T** overcrowd the screen. If a piece of data isn't vital to the user's immediate goal, move it to a lower-tier surface or a secondary screen.