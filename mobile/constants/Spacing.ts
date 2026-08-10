// Centralized 4px-grid spacing scale — before this, padding/margin/gap
// values were improvised per component with no shared rhythm.
export const Space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

// Corner-radius scale — before this, 21 distinct radius values were in use.
// `pill` is the standalone value already used everywhere for fully-rounded
// chips/buttons; it isn't part of the linear sm→xxl progression.
export const Radius = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 14,
  xxl: 16,
  pill: 999,
} as const;
