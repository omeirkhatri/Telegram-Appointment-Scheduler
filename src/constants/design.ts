/**
 * Design System Constants
 * Centralized design tokens for consistent styling across the application
 */

// Spacing scale (in pixels and Tailwind classes)
export const SPACING = {
  xs: '8px',      // 2 in Tailwind
  sm: '12px',     // 3 in Tailwind
  md: '16px',     // 4 in Tailwind
  lg: '24px',     // 6 in Tailwind
  xl: '32px',     // 8 in Tailwind
  '2xl': '48px',  // 12 in Tailwind
  '3xl': '64px',  // 16 in Tailwind
} as const;

// Typography scale
export const TYPOGRAPHY = {
  // Page titles
  pageTitle: 'text-3xl font-bold',
  // Section headings
  sectionHeading: 'text-xl font-semibold',
  // Card titles
  cardTitle: 'text-lg font-semibold',
  // Subsection titles
  subsectionTitle: 'text-base font-semibold',
  // Labels
  label: 'text-sm font-medium',
  // Body text
  body: 'text-base',
  // Small text
  small: 'text-sm',
  // Extra small text
  xs: 'text-xs',
} as const;

// Button variants (maps to Shadcn button variants)
export const BUTTON_VARIANTS = {
  primary: 'default',
  secondary: 'secondary',
  outline: 'outline',
  ghost: 'ghost',
  destructive: 'destructive',
  link: 'link',
} as const;

// Button sizes (maps to Shadcn button sizes)
export const BUTTON_SIZES = {
  sm: 'sm',
  md: 'default',
  lg: 'lg',
  icon: 'icon',
} as const;

// Border radius values
export const BORDER_RADIUS = {
  sm: 'rounded-md',      // 6px
  md: 'rounded-lg',      // 8px
  lg: 'rounded-xl',      // 12px
  xl: 'rounded-2xl',     // 16px
  full: 'rounded-full',
} as const;

// Shadow levels
export const SHADOWS = {
  none: 'shadow-none',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
} as const;

// Icon sizes (in pixels and classes)
export const ICON_SIZES = {
  xs: 'h-3 w-3',        // 12px
  sm: 'h-4 w-4',        // 16px
  md: 'h-5 w-5',        // 20px
  lg: 'h-6 w-6',        // 24px
  xl: 'h-8 w-8',        // 32px
  '2xl': 'h-10 w-10',   // 40px
} as const;

// Layout constants
export const LAYOUT = {
  sidebarWidthExpanded: '256px',
  sidebarWidthCollapsed: '64px',
  headerHeight: '64px',
  contentPadding: 'p-6',
  sectionGap: 'space-y-6',
  cardPadding: 'p-6',
  formFieldGap: 'space-y-4',
} as const;

// Container widths
export const CONTAINER = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  full: 'max-w-full',
} as const;

// Z-index layers
export const Z_INDEX = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
} as const;

// Transition durations
export const TRANSITIONS = {
  fast: '150ms',
  normal: '200ms',
  slow: '300ms',
  slower: '500ms',
} as const;

// Breakpoints (matches Tailwind default)
export const BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;
