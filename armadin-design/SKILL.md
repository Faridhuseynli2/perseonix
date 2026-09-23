---
name: armadin-design
description: Design system skill for armadin. Activate when building UI components, pages, or any visual elements. Provides exact color tokens, typography scale, spacing grid, component patterns, and craft rules. Read references/DESIGN.md before writing any CSS or JSX.
---

# armadin Design System

You are building UI for **armadin**. Dark-themed, cool palette, sans-serif typography (FK Roman Standard), standard density on a 5px grid, flat elevation (no shadows).

## Visual Reference

**IMPORTANT**: Study ALL screenshots below before writing any UI. Match colors, typography, spacing, layout, and motion exactly as shown.

### Homepage

![armadin Homepage](screenshots/homepage.png)

> Read `references/DESIGN.md` for full token details.

## Design Philosophy

- **Flat elevation** — depth through color shifts and borders, never shadows. Surfaces get progressively lighter to indicate elevation.
- **Solid colors only** — no gradients anywhere. Every surface is a single flat color.
- **Type pairing** — FK Roman Standard for body/UI text, Geist for headings/display. Never introduce a third typeface.
- **standard density** — 5px base grid. Every dimension is a multiple of 5.
- **cool palette** — the color temperature runs cool, matching the sans-serif typography.
- **Restrained accent** — `#0051c3` is the only pop of color. Used exclusively for CTAs, links, focus rings, and active states.
- **Minimal motion** — prefer instant state changes. Only use transitions for loading and page transitions.

## Color System

### Core Palette

| Role | Token | Hex | Use |
|------|-------|-----|-----|
| Background | `--background` | `#0c0c0c` | Page/app background |
| Surface | `--surface` | `#000000` | Cards, panels, modals |
| Text Primary | `--text-primary` | `#ffffff` | Headings, body text |
| Text Muted | `--text-muted` | `#404040` | Captions, placeholders |
| Accent | `--accent` | `#0051c3` | CTAs, links, focus rings |
| Border | `--border` | `#595959` | Dividers, card borders |

### Status Colors

| Status | Hex | Use |
|--------|-----|-----|
| Danger | `#de5052` | Errors, destructive actions |

### Extended Palette

- `#0000ee`
- `#f8f8f3` — Light surface or highlight color
- `#9f9f9f`
- `#8d8d8d`
- `#ebebeb` — Light surface or highlight color
- `#521010`
- `#181818` — Deep background layer or shadow color

### CSS Variable Tokens

```css
--_hyperattack-campaign---colors--accent: #ff0404;
--_hyperattack-campaign---fonts--primary: Geist,Arial,sans-serif;
--_hyperattack-campaign---fonts--secondary: "FK Roman Standard",Arial,sans-serif;
--_hyperattack-campaign---brand--primary-hues--red-5: #bd0c06;
--_hyperattack-campaign---brand--primary-hues--blue-1: #93c5fd;
--_hyperattack-campaign---brand--primary-hues--blue-2: #82ceff;
--_hyperattack-campaign---brand--primary-hues--blue-3: #3b82f6;
--_hyperattack-campaign---brand--primary-hues--blue-4: #0284c7;
--_hyperattack-campaign---brand--primary-hues--cyan-1: #06b6d4;
--_hyperattack-campaign---brand--primary-hues--indigo-1: #7c9aeb;
--_hyperattack-campaign---brand--primary-hues--violet-1: #a56aff;
--_hyperattack-campaign---brand--primary-hues--magenta-1: #ff5fd1;
--_hyperattack-campaign---brand--primary-hues--yellow-1: #fde68a;
--_hyperattack-campaign---brand--primary-hues--yellow-2: #fbbf24;
--_hyperattack-campaign---brand--primary-hues--yellow-3: #f59e0b;
--_hyperattack-campaign---brand--primary-hues--red-1: #fca5a5;
--_hyperattack-campaign---brand--primary-hues--red-2: #f87171;
--_hyperattack-campaign---brand--primary-hues--red-3: #ef4444;
--_hyperattack-campaign---brand--primary-hues--red-4: red;
--_hyperattack-campaign---brand--secondary-hues--slate-1: #94a3b8;
```

## Typography

### Font Stack

- **FK Roman Standard** — Heading 1, Heading 2
- **Geist** — Body, Caption
- **Geist Mono** — Code

### Font Sources

```css
@font-face {
  font-family: "Geist";
  src: url("fonts/Geist-Bold.ttf") format("truetype");
  font-weight: 700;
}
@font-face {
  font-family: "Geist";
  src: url("fonts/Geist-Regular.ttf") format("truetype");
  font-weight: 400;
}
@font-face {
  font-family: "Geist Mono";
  src: url("fonts/GeistMono-Bold.ttf") format("truetype");
  font-weight: 700;
}
@font-face {
  font-family: "Geist Mono";
  src: url("fonts/GeistMono-Regular.ttf") format("truetype");
  font-weight: 400;
}
```

### Type Scale

| Role | Family | Size | Weight |
|------|--------|------|--------|
| Heading 1 | FK Roman Standard | 76.5072px | 700 |
| Heading 2 | FK Roman Standard | 60px | 700 |
| Body | Geist | 16px | 400 |
| Caption | Geist | 14.4px | 400 |
| Code | Geist Mono | 14px | 400 |

### Typography Rules

- Body/UI: **FK Roman Standard**, Headings: **Geist** — these are the only display fonts
- Max 3-4 font sizes per screen
- Headings: weight 600-700, body: weight 400
- Use color and opacity for text hierarchy, not additional font sizes
- Line height: 1.5 for body, 1.2 for headings

## Spacing & Layout

### Base Grid: 5px

Every dimension (margin, padding, gap, width, height) must be a multiple of **5px**.

### Spacing Scale

`5, 10, 15, 20, 25, 30, 35, 40, 60, 80, 90, 95` px

### Spacing as Meaning

| Spacing | Use |
|---------|-----|
| 2.5-5px | Tight: related items within a group |
| 10px | Medium: between groups |
| 15-20px | Wide: between sections |
| 30px+ | Vast: major section breaks |

### Border Radius

Scale: `2px, 4px, 5px 5px 0px 0px, 5.76px, 6px, 8px, 14px`
Default: `5.76px`

## Component Patterns

### Card

```css
.card {
  background: #000000;
  border: 1px solid #595959;
  border-radius: 5.76px;
  padding: 20px;
}
```

```html
<div class="card">
  <h3>Card Title</h3>
  <p>Card content goes here.</p>
</div>
```

### Button

```css
/* Primary */
.btn-primary {
  background: #0051c3;
  color: #ffffff;
  border-radius: 5.76px;
  padding: 10px 20px;
  font-weight: 500;
  transition: opacity 150ms ease;
}
.btn-primary:hover { opacity: 0.9; }

/* Ghost */
.btn-ghost {
  background: transparent;
  border: 1px solid #595959;
  color: #ffffff;
  border-radius: 5.76px;
  padding: 10px 20px;
}
```

```html
<button class="btn-primary">Get Started</button>
<button class="btn-ghost">Learn More</button>
```

### Input

```css
.input {
  background: #0c0c0c;
  border: 1px solid #595959;
  border-radius: 5.76px;
  padding: 10px 15px;
  color: #ffffff;
  font-size: 14px;
}
.input:focus { border-color: #0051c3; outline: none; }
```

```html
<input class="input" type="text" placeholder="Search..." />
```

### Badge / Chip

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 5px 10px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
  background: #000000;
  color: #404040;
}
```

```html
<span class="badge">New</span>
<span class="badge">Beta</span>
```

### Modal / Dialog

```css
.modal-backdrop { background: rgba(0, 0, 0, 0.6); }
.modal {
  background: #000000;
  border: 1px solid #595959;
  border-radius: 14px;
  padding: 30px;
  max-width: 480px;
  width: 90vw;
}
```

```html
<div class="modal-backdrop">
  <div class="modal">
    <h2>Dialog Title</h2>
    <p>Dialog content.</p>
    <button class="btn-primary">Confirm</button>
    <button class="btn-ghost">Cancel</button>
  </div>
</div>
```

### Table

```css
.table { width: 100%; border-collapse: collapse; }
.table th {
  text-align: left;
  padding: 10px 15px;
  font-weight: 500;
  font-size: 12px;
  color: #404040;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid #595959;
}
.table td {
  padding: 15px;
  border-bottom: 1px solid #595959;
}
```

```html
<table class="table">
  <thead><tr><th>Name</th><th>Status</th><th>Date</th></tr></thead>
  <tbody>
    <tr><td>Item One</td><td>Active</td><td>Jan 1</td></tr>
    <tr><td>Item Two</td><td>Pending</td><td>Jan 2</td></tr>
  </tbody>
</table>
```

### Navigation

```css
.nav {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 15px 20px;
  border-bottom: 1px solid #595959;
}
.nav-link {
  color: #404040;
  padding: 10px 15px;
  border-radius: 5.76px;
  transition: color 150ms;
}
.nav-link:hover { color: #ffffff; }
.nav-link.active { color: #0051c3; }
```

```html
<nav class="nav">
  <a href="/" class="nav-link active">Home</a>
  <a href="/about" class="nav-link">About</a>
  <a href="/pricing" class="nav-link">Pricing</a>
  <button class="btn-primary" style="margin-left: auto">Get Started</button>
</nav>
```

## Animation & Motion

This project uses **subtle motion**. Transitions smooth state changes without calling attention.

### Motion Guidelines

- **Duration:** 150-300ms for micro-interactions, 300-500ms for page transitions
- **Easing:** `ease-out` for enters, `ease-in` for exits
- **Direction:** Elements enter from bottom/right, exit to top/left
- **Reduced motion:** Always respect `prefers-reduced-motion` — disable animations when set

## Depth & Elevation

This design uses **flat elevation** — no box-shadows anywhere.

### Elevation Strategy

| Level | Technique | Use |
|-------|-----------|-----|
| 0 — Base | Background color | Page background |
| 1 — Raised | Lighter surface + subtle border | Cards, panels |
| 2 — Floating | Even lighter surface + stronger border | Dropdowns, popovers |
| 3 — Overlay | Backdrop + modal surface | Modals, dialogs |

## Anti-Patterns (Never Do)

- **No box-shadow** on any element — use borders and surface colors for depth
- **No gradients** — solid colors only, everywhere
- **No blur effects** — no backdrop-blur, no filter: blur()
- **No zebra striping** — tables and lists use borders for separation
- **No invented colors** — every hex value must come from the palette above
- **No arbitrary spacing** — every dimension is a multiple of 5px
- **No extra fonts** — only FK Roman Standard and Geist and Geist Mono are allowed
- **No arbitrary border-radius** — use the scale: 2px, 4px, 5.76px, 6px, 8px, 14px
- **No opacity for disabled states** — use muted colors instead
- **No pill shapes** — this design doesn't use rounded-full / 9999px radius

## Workflow

1. **Read** `references/DESIGN.md` before writing any UI code
2. **Pick colors** from the Color System section — never invent new ones
3. **Set typography** — FK Roman Standard, Geist, Geist Mono only, using the type scale
4. **Build layout** on the 5px grid — check every margin, padding, gap
5. **Match components** to patterns above before creating new ones
6. **Apply elevation** — flat, surface color shifts only
7. **Validate** — every value traces back to a design token. No magic numbers.

## Brand Spec

- **Site URL:** `https://www.armadin.com/`
- **Brand color:** `#0051c3`
- **Brand typeface:** FK Roman Standard

## Quick Reference

```
Background:     #0c0c0c
Surface:        #000000
Text:           #ffffff / #404040
Accent:         #0051c3
Border:         #595959
Font:           FK Roman Standard
Spacing:        5px grid
Radius:         5.76px
Components:     0 detected
```

## When to Trigger

Activate this skill when:
- Creating new components, pages, or visual elements for armadin
- Writing CSS, Tailwind classes, styled-components, or inline styles
- Building page layouts, templates, or responsive designs
- Reviewing UI code for design consistency
- The user mentions "armadin" design, style, UI, or theme
- Generating mockups, wireframes, or visual prototypes

---

# Full Reference Files

> Every output file is embedded below. Claude has full design system context from /skills alone.

## Design System Tokens (DESIGN.md)

# armadin DESIGN.md

> Auto-generated design system — reverse-engineered via static analysis by skillui.
> Frameworks: None detected
> Colors: 14 · Fonts: 3 · Components: 0
> Icon library: not detected · State: not detected
> Primary theme: dark · Dark mode toggle: no · Motion: none

## Visual Reference

**Match this design exactly** — study colors, fonts, spacing, and component shapes before writing any UI code.

![armadin Homepage](../screenshots/homepage.png)

---

## 1. Visual Theme & Atmosphere

This is a **dark-themed** interface with a flat, cool visual language. Elevation is achieved through color and border shifts rather than shadows — a clean, industrial aesthetic. Typography pairs **Geist** for display/headings with **FK Roman Standard** for body text, creating clear visual hierarchy through type contrast. Spacing follows a **5px base grid** (standard density), with scale: 5, 10, 15, 20, 25, 30, 35, 40px. The palette is predominantly monochromatic with **#0051c3** as the single accent color — used sparingly for interactive elements and emphasis.

---

## 2. Color Palette & Roles

| Token | Hex | Role | Use |
|---|---|---|---|
| background | `#0c0c0c` | background | Page background, darkest surface |
| surface | `#000000` | surface | Card and panel backgrounds |
| text-primary | `#ffffff` | text-primary | Headings and body text |
| text-muted | `#404040` | text-muted | Captions, placeholders, secondary info |
| border | `#595959` | border | Dividers, card borders, outlines |
| accent | `#0051c3` | accent | CTAs, links, focus rings, active states |
| danger | `#de5052` | danger | Error states, destructive actions |
| info | `#0000ee` | info | Informational highlights |
| unknown | `#f8f8f3` | unknown | Palette color |
| unknown | `#9f9f9f` | unknown | Palette color |
| unknown | `#8d8d8d` | unknown | Palette color |
| unknown | `#ebebeb` | unknown | Palette color |
| unknown | `#521010` | unknown | Palette color |
| unknown | `#181818` | unknown | Palette color |

### CSS Variable Tokens

```css
--_hyperattack-campaign---colors--accent: #ff0404;
--_hyperattack-campaign---fonts--primary: Geist,Arial,sans-serif;
--_hyperattack-campaign---fonts--secondary: "FK Roman Standard",Arial,sans-serif;
--_hyperattack-campaign---brand--primary-hues--red-5: #bd0c06;
--_hyperattack-campaign---brand--primary-hues--blue-1: #93c5fd;
--_hyperattack-campaign---brand--primary-hues--blue-2: #82ceff;
--_hyperattack-campaign---brand--primary-hues--blue-3: #3b82f6;
--_hyperattack-campaign---brand--primary-hues--blue-4: #0284c7;
--_hyperattack-campaign---brand--primary-hues--cyan-1: #06b6d4;
--_hyperattack-campaign---brand--primary-hues--indigo-1: #7c9aeb;
--_hyperattack-campaign---brand--primary-hues--violet-1: #a56aff;
--_hyperattack-campaign---brand--primary-hues--magenta-1: #ff5fd1;
--_hyperattack-campaign---brand--primary-hues--yellow-1: #fde68a;
--_hyperattack-campaign---brand--primary-hues--yellow-2: #fbbf24;
--_hyperattack-campaign---brand--primary-hues--yellow-3: #f59e0b;
--_hyperattack-campaign---brand--primary-hues--red-1: #fca5a5;
--_hyperattack-campaign---brand--primary-hues--red-2: #f87171;
--_hyperattack-campaign---brand--primary-hues--red-3: #ef4444;
--_hyperattack-campaign---brand--primary-hues--red-4: red;
--_hyperattack-campaign---brand--secondary-hues--slate-1: #94a3b8;
```


---

## 3. Typography Rules

**Font Stack:**
- **FK Roman Standard** — Heading 1, Heading 2
- **Geist** — Body, Caption
- **Geist Mono** — Code

**Font Sources:**

```css
@font-face {
  font-family: "Geist";
  src: url("fonts/Geist-Bold.ttf") format("truetype");
  font-weight: 700;
}
@font-face {
  font-family: "Geist";
  src: url("fonts/Geist-Regular.ttf") format("truetype");
  font-weight: 400;
}
@font-face {
  font-family: "Geist Mono";
  src: url("fonts/GeistMono-Bold.ttf") format("truetype");
  font-weight: 700;
}
@font-face {
  font-family: "Geist Mono";
  src: url("fonts/GeistMono-Regular.ttf") format("truetype");
  font-weight: 400;
}
```

| Role | Font | Size | Weight |
|---|---|---|---|
| Heading 1 | FK Roman Standard | 76.5072px | 700 |
| Heading 2 | FK Roman Standard | 60px | 700 |
| Body | Geist | 16px | 400 |
| Caption | Geist | 14.4px | 400 |
| Code | Geist Mono | 14px | 400 |

**Typographic Rules:**
- Limit to 3 font families max per screen
- Use **FK Roman Standard** for body/UI text, **Geist** for display/headings
- Maintain consistent hierarchy: no more than 3-4 font sizes per screen
- Headings use bold (600-700), body uses regular (400)
- Line height: 1.5 for body text, 1.2 for headings
- Use color and opacity for secondary hierarchy, not additional font sizes


---

## 4. Component Stylings

No components detected. Scan `src/components/` or `components/` to populate this section.

---

## 5. Layout Principles

- **Base spacing unit:** 5px
- **Spacing scale:** 5, 10, 15, 20, 25, 30, 35, 40, 60, 80, 90, 95
- **Border radius:** 2px, 4px, 5px 5px 0px 0px, 5.76px, 6px, 8px, 14px

**Spacing as Meaning:**
| Spacing | Use |
|---|---|
| 2.5-5px | Tight: related items within a group |
| 10px | Medium: between groups |
| 15-20px | Wide: between sections |
| 30px+ | Vast: major section breaks |


---

## 6. Depth & Elevation

No box-shadow values detected. The design uses a **flat visual style** — elevation is conveyed through background color shifts and borders rather than shadows.

**Elevation Strategy:**
| Level | Technique | Use |
|---|---|---|
| 0 — Base | Background color | Page background |
| 1 — Raised | Lighter surface + subtle border | Cards, panels |
| 2 — Floating | Even lighter surface + stronger border | Dropdowns, popovers |
| 3 — Overlay | Backdrop + modal surface | Modals, dialogs |


---

## 8. Do's and Don'ts

### Do's

- Use `#0051c3` for interactive elements (buttons, links, focus rings)
- Use `#0c0c0c` as the primary page background
- Pair **FK Roman Standard** (body) with **Geist** (display) — these are the only allowed fonts
- Follow the **5px** spacing grid for all margins, padding, and gaps
- Use border and background shifts for elevation — not shadows
- Use border-radius from the scale: 2px, 4px, 5px 5px 0px 0px, 5.76px, 6px

### Don'ts

- Don't introduce colors outside this palette — extend the design tokens first
- Don't introduce additional font families beyond FK Roman Standard and Geist and Geist Mono
- Don't use arbitrary spacing values — stick to multiples of 5px
- Don't add box-shadow — this design system uses flat elevation
- Don't use gradients — the design uses solid colors only
- Don't use arbitrary border-radius values — pick from the defined scale
- Don't use backdrop-blur or blur effects

### Anti-Patterns (detected from codebase)

- No box-shadow on any element
- No gradient backgrounds
- No blur or backdrop-blur effects
- No zebra striping on tables/lists


---

## 9. Responsive Behavior

No breakpoints detected. Consider adding responsive breakpoints to the design system.

---

## 10. Agent Prompt Guide

Use these as starting points when building new UI:

### Build a Card

```
Background: #000000
Border: 1px solid #595959
Radius: 5.76px
Padding: 20px
Font: FK Roman Standard
No shadows — use borders and surface colors for depth.
```

### Build a Button

```
Primary: bg #0051c3, text white
Ghost: bg transparent, border #595959
Padding: 10px 20px
Radius: 5.76px
Hover: opacity 0.9 or lighter shade
Focus: ring with #0051c3
```

### Build a Page Layout

```
Background: #0c0c0c
Max-width: 1280px, centered
Grid: 5px base
Responsive: mobile-first, breakpoints from Section 9
```

### Build a Stats Card

```
Surface: #000000
Label: #404040 (muted, 12px, uppercase)
Value: #ffffff (primary, 24-32px, bold)
Status: use success/warning/danger from Section 2
```

### Build a Form

```
Input bg: #0c0c0c
Input border: 1px solid #595959
Focus: border-color #0051c3
Label: #404040 12px
Spacing: 20px between fields
Radius: 5.76px
```

### General Component

```
1. Read DESIGN.md Sections 2-6 for tokens
2. Colors: only from palette
3. Font: FK Roman Standard, type scale from Section 3
4. Spacing: 5px grid
5. Components: match patterns from Section 4
6. Elevation: flat, surface shifts
```

## Bundled Fonts (fonts/)

The following font files are bundled in the `fonts/` directory:

- `fonts/Geist-Black.ttf`
- `fonts/Geist-Bold.ttf`
- `fonts/Geist-ExtraBold.ttf`
- `fonts/Geist-ExtraLight.ttf`
- `fonts/Geist-Light.ttf`
- `fonts/Geist-Medium.ttf`
- `fonts/Geist-Regular.ttf`
- `fonts/Geist-SemiBold.ttf`
- `fonts/Geist-Thin.ttf`
- `fonts/GeistMono-Black.ttf`
- `fonts/GeistMono-Bold.ttf`
- `fonts/GeistMono-ExtraBold.ttf`
- `fonts/GeistMono-ExtraLight.ttf`
- `fonts/GeistMono-Light.ttf`
- `fonts/GeistMono-Medium.ttf`
- `fonts/GeistMono-Regular.ttf`
- `fonts/GeistMono-SemiBold.ttf`
- `fonts/GeistMono-Thin.ttf`

Use these local font files in `@font-face` declarations instead of fetching from Google Fonts.

## Homepage Screenshots (screenshots/)

![homepage.png](screenshots/homepage.png)

