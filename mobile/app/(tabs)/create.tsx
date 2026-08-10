import { Redirect } from 'expo-router';

// This route never actually renders — the tab bar intercepts its press
// (tabPress listener in _layout.tsx) and opens the Create sheet instead of
// navigating here. The redirect is just a safety net if that's ever bypassed.
export default function CreateTabPlaceholder() {
  return <Redirect href="/" />;
}
