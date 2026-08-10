// Centralized type scale — before this, components picked font sizes ad hoc
// (16 distinct values in half-point increments were in use across the app).
// Each step pairs a fontSize with a lineHeight tuned for it; fontWeight and
// color stay per-component since those vary by semantic role, not by size.
//
// letterSpacing is negative (tighter tracking) starting at cardTitle and
// tightens further with size — the editorial-headline convention (Apple,
// Linear, most serif-driven type systems): default tracking looks loose
// once a typeface gets large, tight tracking is what reads as "designed"
// rather than "default browser text". Body-tier sizes keep neutral/slightly
// open tracking since tight tracking hurts legibility at small sizes.
export const Type = {
  caption: { fontSize: 10, lineHeight: 14 }, // timestamps, fine print
  label: { fontSize: 11, lineHeight: 15, letterSpacing: 0.2 }, // uppercase kickers/eyebrows, badge text
  small: { fontSize: 12, lineHeight: 17 }, // secondary/meta text
  body: { fontSize: 13, lineHeight: 19 }, // default reading text, buttons
  bodyLarge: { fontSize: 14, lineHeight: 20 }, // emphasized body, form inputs
  subtitle: { fontSize: 15, lineHeight: 21 }, // names, list row titles
  cardTitle: { fontSize: 16, lineHeight: 22, letterSpacing: -0.1 }, // card headlines
  title: { fontSize: 18, lineHeight: 24, letterSpacing: -0.2 }, // section headers, screen titles
  heading: { fontSize: 20, lineHeight: 26, letterSpacing: -0.3 }, // prominent in-card headlines (spotlight cards)
  display: { fontSize: 24, lineHeight: 30, letterSpacing: -0.4 }, // onboarding/major screen headers
  hero: { fontSize: 28, lineHeight: 35, letterSpacing: -0.5 }, // splash/hero moments
} as const;

// Editorial serif reserved for headline-tier text — screen/section/card
// titles, prominent standalone names (profile name, drawer name). Body
// copy, buttons, labels, meta text, and list-row names stay on the system
// sans so the serif reads as emphasis rather than the app's default voice.
// A style using one of these must drop its own fontWeight — the font file
// already encodes its weight, and the two conflict when both are set.
export const Fonts = {
  serif: 'Fraunces_600SemiBold',
  serifItalic: 'Fraunces_500Medium_Italic',
} as const;
