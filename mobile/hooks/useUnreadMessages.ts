import { useCallback, useEffect, useState } from 'react';

import { getConversations, getMessageRequests } from '@/lib/api';

// Unlike notifications, messages have real server-side read state
// (Message.readAt), so this is a straight server-truth check — no local
// "last viewed" heuristic needed, and it stays correct across devices.
export function useUnreadMessages() {
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const [conversationsRes, requestsRes] = await Promise.all([getConversations(), getMessageRequests()]);
      const unreadConversations = conversationsRes.results.filter((c) => c.unread).length;
      setUnreadCount(unreadConversations + requestsRes.results.length);
    } catch {
      // leave badge state as-is on a failed poll
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { unreadCount, refresh };
}
