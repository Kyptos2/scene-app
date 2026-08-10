// The brand mark: four corner brackets (the frame — "the scene") around four
// connected nodes (the network — the filmmakers). Ported 1:1 from
// mobile/components/SceneMark.tsx (same 100x100 coordinate space and
// stroke/radius values) so the web marketing site and the app render the
// exact same logo — just using plain <svg> here instead of react-native-svg,
// since this is already a real DOM.
export function SceneMark({ size, color, className }: { size: number; color: string; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
      <path d="M12 32 L12 12 L32 12" stroke={color} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M68 12 L88 12 L88 32" stroke={color} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M88 68 L88 88 L68 88" stroke={color} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M32 88 L12 88 L12 68" stroke={color} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <line x1={34} y1={34} x2={66} y2={34} stroke={color} strokeWidth={5} strokeLinecap="round" />
      <line x1={34} y1={66} x2={66} y2={66} stroke={color} strokeWidth={5} strokeLinecap="round" />
      <line x1={34} y1={34} x2={34} y2={66} stroke={color} strokeWidth={5} strokeLinecap="round" />
      <line x1={66} y1={34} x2={66} y2={66} stroke={color} strokeWidth={5} strokeLinecap="round" />
      <circle cx={34} cy={34} r={6.5} fill={color} />
      <circle cx={66} cy={34} r={6.5} fill={color} />
      <circle cx={34} cy={66} r={6.5} fill={color} />
      <circle cx={66} cy={66} r={6.5} fill={color} />
    </svg>
  );
}
