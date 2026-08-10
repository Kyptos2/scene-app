import type { NetworkFeedItem } from '@/lib/networkFeed';

type Lane = 'hiring' | 'media' | 'community' | 'workspace' | 'festival' | 'bts' | 'spotlight' | 'standard';

function laneOf(item: NetworkFeedItem): Lane {
  if (item.type === 'crew_call') return 'hiring';
  if (item.type === 'announcement' || item.type === 'project_launch') return item.posterUrl ? 'media' : 'standard';
  if (item.type === 'poll') return 'community';
  if (item.type === 'workspace_update' || item.type === 'workspace_activity') return 'workspace';
  if (item.type === 'festival_spotlight') return 'festival';
  if (item.type === 'bts_carousel') return 'bts';
  if (item.type === 'catalog_spotlight') return 'spotlight';
  return 'standard';
}

// The API already returns items ordered by proximity/recency — this pass
// only reorders within that ordering so the same lane (e.g. two hiring
// banners) or the same actor never lands back-to-back. That's what turns a
// straight reverse-chron list into something that reads as varied.
export function composeFeed(items: NetworkFeedItem[]): NetworkFeedItem[] {
  const pool = [...items];
  const out: NetworkFeedItem[] = [];

  while (pool.length) {
    const next = pool.findIndex((item) => {
      const lane = laneOf(item);
      const prev = out.at(-1);
      const laneClash = prev !== undefined && laneOf(prev) === lane;
      const actorClash = out.slice(-3).some((o) => o.actor.id === item.actor.id);
      return !laneClash && !actorClash;
    });
    const pick = next === -1 ? 0 : next; // fall back rather than stall the feed
    out.push(pool.splice(pick, 1)[0]);
  }

  return out;
}
