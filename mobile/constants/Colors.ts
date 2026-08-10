// "Editorial" brand palette — two exact reference palettes (Quiet Editorial /
// Dark Editorial). Light is the default; dark is reached via the Settings
// toggle, not OS preference. Each palette gives exactly two accents (primary
// + success/verified), so `accent` and `error` intentionally collapse onto
// `tint` rather than inventing colors outside the reference.
const light = {
  background: '#F8F8F6',
  card: '#FFFFFF',
  surface2: '#F1F1EE', // one step up from card — raised panels, modals (derived: no elevated step given in the reference)
  surface3: '#E9E9E5', // two steps up — selected/active surfaces
  border: '#E5E7EA',
  text: '#191A1C',
  muted: '#6E7378',
  tint: '#8F4637',
  secondary: '#5B6A59',
  accent: '#8F4637',
  error: '#8F4637',
  tabIconDefault: '#B7BABE',
  tabIconSelected: '#8F4637',
};

const dark = {
  background: '#111315',
  card: '#181D20',
  surface2: '#1E2327', // one step up from card — raised panels, modals (derived: no elevated step given in the reference)
  surface3: '#252B30', // two steps up — selected/active surfaces
  border: '#2A2D31',
  text: '#EAE7E0',
  muted: '#A1A6AD',
  tint: '#AD5642',
  secondary: '#69705F',
  accent: '#AD5642',
  error: '#AD5642',
  tabIconDefault: '#4A4E53',
  tabIconSelected: '#AD5642',
};

export default { light, dark };
