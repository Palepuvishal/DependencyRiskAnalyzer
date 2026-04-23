---
name: Dependency Risk Visualizer
colors:
  surface: '#111317'
  surface-dim: '#111317'
  surface-bright: '#37393e'
  surface-container-lowest: '#0c0e12'
  surface-container-low: '#1a1c20'
  surface-container: '#1e2024'
  surface-container-high: '#282a2e'
  surface-container-highest: '#333539'
  on-surface: '#e2e2e8'
  on-surface-variant: '#c0c7d5'
  inverse-surface: '#e2e2e8'
  inverse-on-surface: '#2f3035'
  outline: '#8a919e'
  outline-variant: '#404753'
  surface-tint: '#a6c8ff'
  primary: '#a6c8ff'
  on-primary: '#00315f'
  primary-container: '#3192fc'
  on-primary-container: '#002a53'
  inverse-primary: '#005fb0'
  secondary: '#bdc7de'
  on-secondary: '#273143'
  secondary-container: '#3f495d'
  on-secondary-container: '#aeb8d0'
  tertiary: '#ffb782'
  on-tertiary: '#4f2500'
  tertiary-container: '#de7403'
  on-tertiary-container: '#452000'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d5e3ff'
  primary-fixed-dim: '#a6c8ff'
  on-primary-fixed: '#001c3b'
  on-primary-fixed-variant: '#004786'
  secondary-fixed: '#d9e3fb'
  secondary-fixed-dim: '#bdc7de'
  on-secondary-fixed: '#111c2d'
  on-secondary-fixed-variant: '#3d475a'
  tertiary-fixed: '#ffdcc5'
  tertiary-fixed-dim: '#ffb782'
  on-tertiary-fixed: '#301400'
  on-tertiary-fixed-variant: '#703800'
  background: '#111317'
  on-background: '#e2e2e8'
  surface-variant: '#333539'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-base:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  code-md:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  code-sm:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 18px
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  canvas-margin: 24px
  gutter: 16px
---

## Brand & Style

The design system is engineered for the high-stakes environment of cybersecurity and software supply chain management. It embodies a personality that is **Precise, Trustworthy, and Powerful**, catering to DevSecOps professionals who require immediate clarity amidst complex data structures.

The visual direction follows an **Enterprise Dark** aesthetic—a refined evolution of Corporate Modernism. It prioritizes information density and ocular comfort during long periods of technical analysis. The style utilizes a "Command Center" philosophy, where high-contrast semantic indicators stand out against a muted, sophisticated backdrop to guide the user's attention to critical vulnerabilities without inducing fatigue.

## Colors

The palette is anchored by "Deep Charcoal" and "Abyssal Black" to create a sense of infinite depth, essential for complex graph visualizations. 

- **Primary Action**: A vibrant "Electric Blue" (#2E90FA) is reserved strictly for primary interactions and active states, ensuring high discoverability.
- **Risk Scale**: A non-negotiable semantic scale uses high-chroma red, orange, yellow, and green. These colors must maintain a high contrast ratio against the dark background to remain accessible.
- **Neutral Steps**: The system uses a meticulously graded scale of cool greys to define hierarchy between containers, borders, and secondary text, avoiding pure black to prevent "smearing" on OLED displays and to maintain a professional sheen.

## Typography

This design system utilizes a dual-font strategy to balance corporate readability with technical precision.

- **Interface (Inter)**: Used for all UI chrome, navigation, and body copy. It is selected for its exceptional legibility in dark modes and its neutral, systematic feel.
- **Technical (Space Grotesk)**: While technically a geometric sans, its rhythmic spacing and monospaced qualities make it the perfect vehicle for dependency names, version numbers, and hash strings. It provides a distinctive "tech" signature to the data.

**Key Rules:**
- Use `code-md` for package names in tables.
- Use `label-caps` for table headers and section grouping.
- Ensure all technical data is set with `500` weight or higher to maintain sharpness against dark backgrounds.

## Layout & Spacing

The layout is designed as a **Fixed-Fluid Hybrid**. 

- **The Workbench**: A large, central fluid canvas dedicated to dependency graph visualizations. This area expands to fill all available space between the sidebar and inspector panels.
- **Structural Panels**: Fixed-width sidebars (280px) house navigation and filtering, while a collapsible right-hand "Inspector" panel (360px) provides detailed risk metadata.
- **Grid System**: A 12-column grid is used within panels and modal overlays.
- **Rhythm**: A strict 4px base unit ensures alignment. Data-heavy tables should use "Compact" spacing (8px vertical padding) to maximize information density.

## Elevation & Depth

In an "Enterprise Dark" environment, depth is communicated through **Tonal Layering** and **Subtle Outlines** rather than heavy shadows.

- **Level 0 (Canvas)**: The darkest surface (#0C0E12). Used for the main graph background.
- **Level 1 (Surfaces)**: Slightly lighter (#15171C). Used for sidebars and the primary content area.
- **Level 2 (Cards/Modals)**: The lightest surface (#1F242D). 
- **Borders**: Every surface transition must be defined by a 1px solid border (#222934). This "Low-Contrast Outline" technique replaces shadows to maintain a crisp, technical look.
- **Interaction Depth**: On hover, elements should increase their border brightness rather than changing their background color significantly.

## Shapes

The shape language is **Soft (0.25rem)**, leaning towards a geometric, architectural feel. 

- **Standard Elements**: Buttons, input fields, and small cards use a 4px radius.
- **Status Pills**: Use a fully rounded (pill-shaped) radius to differentiate them from interactive buttons.
- **Nodes**: Dependency graph nodes should be squares with a 4px radius to maximize the interior space for icons and text labels.
- **Separators**: 1px lines are used extensively to create clear "slots" for data within tables and panels.

## Components

### Data Tables
Tables are the backbone of the analysis tool. They should feature:
- Sticky headers with `label-caps` typography.
- Alternating row highlights (zebra striping) using a very subtle contrast difference.
- Risk-level indicators placed in the first column for immediate scanning.

### Status Indicators (Pills)
Small, high-contrast badges used for risk levels. 
- **Critical**: Red background, white text.
- **Low**: Subtle green border, green text (no fill) to reduce visual noise for safe items.

### Dependency Cards
Used in the inspector panel. These should have a "Header" section containing the package name in `code-md` and a "Body" section for vulnerability descriptions.

### Primary Actions
Buttons should be solid `primary_color_hex` with white text. Secondary actions should be "Ghost" style with a `strong` border and `primary_color_hex` text.

### Graph Nodes
Interactive elements on the central canvas. They should feature a colored "Risk Stripe" on the left edge corresponding to the semantic scale, ensuring the risk level is visible even when the node is zoomed out.