// Deterministic placeholder "poster" swatch until real poster images exist —
// keeps grids visually poster-like rather than plain text lists. Tuned to
// sit alongside the American Vintage brand palette (terracotta/sage/cream).
const SWATCHES = ['#7A3B2E', '#3F5142', '#5C4A2E', '#4A3B4D', '#2E4A4A', '#6B4226'];

export function swatchFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return SWATCHES[hash % SWATCHES.length];
}
