// A tiny pub-sub so the global Create sheet (mounted once in the tab layout,
// a sibling of Home rather than a parent) can tell the feed to reload after
// a successful post. `router.push('/')` alone is a no-op when already on
// Home, so `useFocusEffect` never refires without this.
const listeners = new Set<() => void>();

export function onFeedShouldRefresh(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function notifyFeedShouldRefresh() {
  listeners.forEach((callback) => callback());
}
