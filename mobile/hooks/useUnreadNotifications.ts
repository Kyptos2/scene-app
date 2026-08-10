import { useCallback, useEffect, useState } from 'react';

import { getSecureItem, setSecureItem } from '@/lib/secureStorage';
import { getNotifications } from '@/lib/api';

const LAST_VIEWED_KEY = 'notif_last_viewed_at';

// There's no server-side read/unread state for notifications — this treats
// "unread" as "newer than the last time the Notifications screen was
// opened," tracked locally. Cheap and correct for a single-device user;
// doesn't sync read state across devices, which is an acceptable gap here.
export function useUnreadNotifications() {
  const [hasUnread, setHasUnread] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [res, lastViewed] = await Promise.all([getNotifications(), getSecureItem(LAST_VIEWED_KEY)]);
      const latest = res.results[0]?.createdAt;
      if (!latest) {
        setHasUnread(false);
        return;
      }
      setHasUnread(!lastViewed || new Date(latest).getTime() > new Date(lastViewed).getTime());
    } catch {
      // leave badge state as-is on a failed poll
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const markViewed = useCallback(async () => {
    await setSecureItem(LAST_VIEWED_KEY, new Date().toISOString());
    setHasUnread(false);
  }, []);

  return { hasUnread, refresh, markViewed };
}
