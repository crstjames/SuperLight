# SuperLight Design System Extract
## Teenage Engineering OP-1 Visual Language Implementation

This document extracts the design principles, visual language, and UI patterns implemented in SuperLight that channel the Teenage Engineering OP-1 aesthetic. **Intended for application to ASYG marketing site with black + white + gold palette** (not SuperLight's specific colors).

---

## 1. OP-1 / TE Visual Language Summary

### Core Aesthetic Principles

**Physical Hardware Inspiration**
- Skeuomorphic UI elements mimicking hardware buttons, knobs, and physical controls
- Tactile, pressable interfaces with realistic shadows and depth
- Industrial design language from Teenage Engineering's synthesizer products

**Precision & Density**
- High information density without clutter
- Monospace typography for technical accuracy and retro-computer feel
- Compact, efficient use of space
- Grid-aligned layouts with mathematical precision

**Minimalist Modernism**
- Flat gradients (not flat design) with subtle dimensionality
- Geometric simplicity
- Reduced color palette with strategic accent usage
- No decoration without function

**Instant Feedback & Speed**
- Zero loading states
- Immediate visual response to interactions
- Smooth, fast transitions (0.12-0.2s cubic-bezier easing)
- Hardware-like button physics

### Layout Characteristics

**Split-Panel Architecture**
- Clean 45/55 split for code/preview panels
- Hard edges, no rounded container corners
- Flush layouts with minimal padding
- Toolbar/header bars with subtle gradient depth

**Visual Hierarchy**
```
Header Bar (36px) → subtle gradient, inset shadow
↓
Toolbar (42px) → matching gradient treatment  
↓
Content Panels → maximized space, hard edges
↓
Footer Bar (28px) → stats/metadata, compact
```

**Spacing System**
- Tight: 2-4px (button groups, segmented controls)
- Standard: 8-12px (toolbar items, stats)
- Section: 20-24px (panel padding)
- Zero: panels, container edges (flush design)

### Typography

**Font Stack**
```
Primary: "SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace
Secondary: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif (prose)
```

**Scale & Weight**
- Extra small: 9px (footer stats, metadata)
- Small: 10-11px (buttons, toolbar text)
- Base: 13px (editor code)
- Emphasis: 14-16px (modal titles, section headers)

**Text Treatment**
- Uppercase labels with expanded letter-spacing (0.5-1.2px)
- Monospace for all UI chrome (buttons, stats, metadata)
- Sans-serif only for rendered content
- Weight hierarchy: 300 (placeholder) → 400 (body) → 500-600 (UI controls)

### Color & Material

**Base Palette Structure** (SuperLight implementation)
```
Light Mode:
- Background: #f5f5f5 (app background)
- Surface: #e8e8e8 (container)
- Panel: #fff (content areas)
- Borders: #d0d0d0
- Text: #333 (primary), #777 (secondary)
- Accent: #ff6b35 (TE orange - interaction color)

Dark Mode:
- Background: #1a1a1a
- Surface: #222 (container) 
- Panel: #1a1a1a (content)
- Borders: #333-#444
- Text: #e0e0e0 (primary), #999 (secondary)
- Accent: #ff6b35 (consistent)
```

**Gradient Application**
- Subtle 180deg linear gradients for depth
- Headers: `linear-gradient(180deg, lighter 0%, base 100%)`
- Buttons: `linear-gradient(145deg, lighter, darker)` - implies light source
- Always 5-10% value shift, never dramatic

**Shadow Strategy**
- Multi-layer shadows for physical depth
- Inset shadows for pressed/recessed elements
- Format: `0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)`
- Dark mode: reduce white insets, increase black depths

### Controls & Interactions

**Button Anatomy**
```css
.btn {
  padding: 8px 14px;
  background: linear-gradient(145deg, #f8f8f8, #f0f0f0);
  border: 1px solid #d8d8d8;
  border-radius: 4px;
  box-shadow: 
    0 1px 2px rgba(0,0,0,0.05),
    inset 0 1px 0 rgba(255,255,255,0.8);
  
  /* Indicator dot */
  &::before {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: rgba(255,107,53,0.3);
  }
}
```

**Interaction States**
```
Default → subtle gradient, soft shadow
Hover → lighter gradient, elevated shadow, translateY(-1px)
Active → translateY(1px), compressed shadow
Focus → 2px accent outline, 2px offset
```

**Segmented Controls** (OP-1 signature)
- Zero gap between segments (2px visual gap via borders)
- First: border-radius 3px 0 0 3px
- Last: border-radius 0 3px 3px 0
- Active: inverted contrast, 2px accent border
- Hardware-inspired toggle groups

**Theme Toggle**
- Circular button (32px × 32px)
- Pressed appearance with inset shadow
- Hover: accent glow `0 0 0 2px rgba(255,107,53,0.1)`
- Emoji icon for instant recognition

### Motion & Animation

**Timing Functions**
```css
Standard: cubic-bezier(0.4, 0, 0.2, 1) /* Material easing */
Duration: 0.12-0.2s (fast, hardware-like)
```

**Transition Properties**
- All interactive elements: `all 0.15s cubic-bezier(...)`
- Layout changes: 0.2-0.3s for panel shifts
- No delays, no spring physics
- Instant feedback, no spinner states

**Physical Feedback**
- Buttons compress on click (`translateY(1px)`)
- Panels lift on focus (`translateY(-1px)`)
- Shadow compression for depth sensation

### Special Elements

**Mobile Tab Indicator**
- 3px height bar
- Accent color (#ff6b35)
- Smooth position transition: 0.3s cubic-bezier
- Rounded top corners (2px)
- Hardware-inspired sliding indicator

**Footer Metadata Bar**
- Always visible, 28px fixed height
- Three-column grid: left (stats) | center (project meta) | right (time)
- Monospace, 9px, uppercase, 0.8px letter-spacing
- Reversed gradient (lighter at bottom)

**Code Blocks**
- 3px left accent border (#ff6b35)
- Background: #f6f8fa (light) / #2a2a2a (dark)
- 6px border-radius
- Monospace font

---

## 2. Concrete Design Rules (Do/Don't)

### DO ✓

**Layout**
- Use flush, edge-to-edge panels with zero border-radius on containers
- Implement split-view layouts with hard divisions
- Stack toolbars with consistent gradient treatments
- Keep information density high but organized

**Typography**
- Use monospace fonts for all UI chrome
- Apply uppercase + letter-spacing to labels/controls
- Size text at 9-13px for density
- Maintain strict weight hierarchy (300/400/500/600)

**Color**
- Start with neutral grays as foundation
- Use single accent color sparingly (interaction points)
- Apply subtle gradients for dimensionality (5-10% shifts)
- Maintain 4-5 gray levels for hierarchy

**Controls**
- Create physical button depth with multi-layer shadows
- Include indicator dots/LEDs on interactive elements
- Use segmented controls for related options (zero gap)
- Provide instant visual feedback (no spinners)

**Interactions**
- Respond in <200ms with visual state change
- Compress elements on press (translateY)
- Elevate on hover (shadow + position)
- Use accent color for focus states

### DON'T ✗

**Layout**
- Don't use excessive padding/whitespace (not Apple-style breathing room)
- Don't round container corners (flat edges are intentional)
- Don't center-align everything (left-align for density)
- Don't waste vertical space (toolbars ~40px max)

**Typography**
- Don't mix font families within UI chrome
- Don't use lowercase for button labels
- Don't exceed 16px for UI text (headers only)
- Don't use thin weights (<300) for readability

**Color**
- Don't use multiple accent colors (pick one)
- Don't create high-contrast mode switches (subtle transitions)
- Don't apply dramatic gradients (>10% value shift)
- Don't use pure black/white (#000/#fff)

**Controls**
- Don't use flat buttons without depth cues
- Don't animate with spring/bounce easing
- Don't create 3D skeuomorphism (subtle depth only)
- Don't hide interaction affordances

**Interactions**
- Don't show loading spinners (instant or cached)
- Don't use long animations (>300ms)
- Don't delay feedback with transitions
- Don't rely on hover alone (mobile-first interaction)

---

## 3. Marketing Site vs Product UI

### Transfers Cleanly to Marketing Site ✓

**Visual Language**
- Monospace typography for technical credibility
- Uppercase labels with letter-spacing
- Single accent color strategy (gold for ASYG)
- Subtle gradient depth system
- Multi-layer shadow technique

**Layout Patterns**
- Toolbar/header bar treatments
- Split-panel hero sections
- Footer metadata bars
- High information density

**Interactive Elements**
- Physical button styling
- Segmented control groups
- Hover/active state patterns
- Fast, hardware-like animations

**Responsive Strategy**
- Mobile tab systems with sliding indicators
- Touch-friendly target sizes (40px+)
- Gesture support (swipes)

### Product-UI-Only (Adapt Carefully) ⚠️

**Editor-Specific**
- Split markdown/preview panels → adapt to content showcase
- Character/word/line counters → convert to relevant metrics
- File import/export controls → translate to CTA patterns

**Development Context**
- Monospace everywhere → reserve for code samples/technical sections
- Zero-config messaging → adapt to benefit statements
- Project size badges → convert to feature highlights

**Functional Modals**
- Share/import dialogs → adapt to lead capture
- Tab systems → use for content organization
- Encoded text previews → not applicable

### Adaptation Strategies for Marketing

**Hero Section**
- Apply toolbar gradient to nav bar
- Use segmented controls for feature toggle
- Implement split-panel for product showcase

**Feature Grid**
- Button styling for CTAs
- Stats bar treatment for metrics
- Uppercase labels for section headers

**Typography Scale**
- Scale up to 18-24px for headlines (maintain weight/spacing)
- Keep 9-11px for metadata/labels
- Use monospace for technical credibility markers

**Color Translation**
```
SuperLight → ASYG
#ff6b35 (orange) → Gold accent (#D4AF37 or brand gold)
#f5f5f5 (light gray) → White/off-white
#333 (dark gray) → Black/near-black
Maintain: gradient subtlety, shadow depth, border weights
```

**Interaction Design**
- Same button physics (compress, elevate, fast)
- Adapt tab indicators to navigation
- Use accent glow for primary CTAs
- Maintain <200ms response philosophy

---

## 4. Implementation Tokens

### CSS Custom Properties (Suggested)

```css
/* ASYG Marketing - OP-1 Inspired Tokens */
:root {
  /* Colors */
  --color-background: #ffffff;
  --color-surface: #f5f5f5;
  --color-border: #d0d0d0;
  --color-text-primary: #1a1a1a;
  --color-text-secondary: #666666;
  --color-accent: #D4AF37; /* Gold */
  --color-accent-hover: #E5C158;
  
  /* Typography */
  --font-mono: "SF Mono", "Monaco", "Inconsolata", monospace;
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-size-xs: 9px;
  --font-size-sm: 11px;
  --font-size-base: 13px;
  --font-size-lg: 16px;
  --font-weight-light: 300;
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --letter-spacing-tight: 0.3px;
  --letter-spacing-normal: 0.5px;
  --letter-spacing-wide: 0.8px;
  --letter-spacing-wider: 1.2px;
  
  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 20px;
  --space-xl: 24px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 2px 4px rgba(0,0,0,0.1);
  --shadow-lg: 0 3px 8px rgba(0,0,0,0.15);
  --shadow-inset-light: inset 0 1px 0 rgba(255,255,255,0.8);
  --shadow-inset-dark: inset 0 -1px 0 rgba(0,0,0,0.1);
  
  /* Timing */
  --duration-fast: 0.12s;
  --duration-base: 0.15s;
  --duration-medium: 0.2s;
  --duration-slow: 0.3s;
  --easing-standard: cubic-bezier(0.4, 0, 0.2, 1);
  
  /* Borders */
  --border-width: 1px;
  --border-width-thick: 2px;
  --border-radius-sm: 2px;
  --border-radius-md: 4px;
  --border-radius-lg: 6px;
  --border-radius-full: 50%;
}

/* Dark Mode */
[data-theme="dark"] {
  --color-background: #1a1a1a;
  --color-surface: #222222;
  --color-border: #444444;
  --color-text-primary: #e0e0e0;
  --color-text-secondary: #999999;
}
```

### Component Patterns

**OP-1 Button**
```css
.te-button {
  padding: 8px 14px;
  background: linear-gradient(145deg, 
    var(--color-surface), 
    color-mix(in srgb, var(--color-surface) 90%, black));
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--border-radius-md);
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wide);
  box-shadow: 
    var(--shadow-sm),
    var(--shadow-inset-light);
  transition: all var(--duration-base) var(--easing-standard);
  position: relative;
}

.te-button::before {
  content: "";
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: var(--border-radius-full);
  background: color-mix(in srgb, var(--color-accent) 30%, transparent);
  left: 6px;
  top: 50%;
  transform: translateY(-50%);
}

.te-button:hover {
  transform: translateY(-1px);
  box-shadow: 
    var(--shadow-md),
    var(--shadow-inset-light);
}

.te-button:active {
  transform: translateY(1px);
  box-shadow: var(--shadow-sm), inset 0 1px 3px rgba(0,0,0,0.1);
}

.te-button--primary {
  background: linear-gradient(145deg, 
    var(--color-accent), 
    color-mix(in srgb, var(--color-accent) 85%, black));
  border-color: color-mix(in srgb, var(--color-accent) 70%, black);
  color: white;
}
```

**Toolbar/Header Bar**
```css
.te-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background: linear-gradient(180deg, 
    var(--color-surface), 
    color-mix(in srgb, var(--color-surface) 93%, black));
  border-bottom: var(--border-width) solid var(--color-border);
  box-shadow: var(--shadow-inset-light);
  gap: var(--space-md);
}
```

**Segmented Control**
```css
.te-segmented-control {
  display: flex;
  gap: 0;
}

.te-segmented-control button {
  padding: 6px 14px;
  background: var(--color-surface);
  border: var(--border-width) solid var(--color-border);
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wide);
}

.te-segmented-control button:first-child {
  border-radius: var(--border-radius-sm) 0 0 var(--border-radius-sm);
}

.te-segmented-control button:last-child {
  border-radius: 0 var(--border-radius-sm) var(--border-radius-sm) 0;
}

.te-segmented-control button[data-active] {
  background: var(--color-text-primary);
  border: var(--border-width-thick) solid var(--color-accent);
  color: var(--color-background);
}
```

---

## 5. Key Takeaways for ASYG

1. **Monospace = Technical Authority** - Use liberally for UI chrome, sparingly for prose
2. **Hardware Physics** - Buttons should feel pressable with depth + motion
3. **Single Accent Strategy** - Gold becomes your interaction color (not decorative)
4. **Information Density** - Pack more in less space (versus Apple's airy approach)
5. **Instant Feedback** - No loading states, everything cached/instant
6. **Subtle Depth** - Multi-layer shadows + gradients (not flat, not 3D)
7. **Uppercase Labels** - With letter-spacing for that technical/industrial vibe
8. **Dark Mode Ready** - Design in grayscale first, accent color pops

### Design Files Referenced
- `/assets/css/styles.css` - Complete visual implementation
- `/index.html` - Structural patterns and component hierarchy
- `/assets/js/main.js` - Interaction patterns and timing
- `/manifest.json` - Color palette and branding tokens
- `/README.md` - Philosophy and design principles

---

**Document created:** 2026-09-21  
**Source:** SuperLight (https://github.com/crstjames/SuperLight)  
**Purpose:** Design system extraction for ASYG marketing site implementation
