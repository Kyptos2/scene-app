import { Share } from 'react-native';

import { API_BASE_URL } from '@/lib/api';
import type { NetworkFeedItem } from '@/lib/networkFeed';

// The web app is the universal fallback for anyone without SCENE installed —
// /profile/[id] and /projects/[id] are public, unauthenticated pages there
// with Open Graph tags, so a link pasted into iMessage/Slack unfurls with a
// real title and poster image instead of a bare URL.
export function shareUrlFor(target: { type: 'project' | 'profile'; id: string }): string {
  const path = target.type === 'project' ? 'projects' : 'profile';
  return `${API_BASE_URL}/${path}/${target.id}`;
}

function textAndUrlFor(item: NetworkFeedItem): { text: string; url: string } {
  switch (item.type) {
    case 'crew_call':
      return {
        text: `${item.actor.name} needs a ${item.roleNeeded}${item.projectTitle ? ` for "${item.projectTitle}"` : ''} — ${item.location}. Via SCENE.`,
        url: item.projectId ? shareUrlFor({ type: 'project', id: item.projectId }) : shareUrlFor({ type: 'profile', id: item.actor.id }),
      };
    case 'announcement':
      return {
        text: `${item.headline} — ${item.actor.name} on SCENE.`,
        url: item.projectId ? shareUrlFor({ type: 'project', id: item.projectId }) : shareUrlFor({ type: 'profile', id: item.actor.id }),
      };
    case 'project_launch':
      return {
        text: `${item.actor.name} just launched "${item.projectTitle}" on SCENE. ${item.logline}`,
        url: shareUrlFor({ type: 'project', id: item.projectId }),
      };
    case 'connection_update':
      return { text: `${item.actor.name}: ${item.summary} — via SCENE.`, url: shareUrlFor({ type: 'profile', id: item.actor.id }) };
    case 'poll':
      return { text: `"${item.question}" — vote on SCENE.`, url: shareUrlFor({ type: 'profile', id: item.actor.id }) };
    case 'workspace_update':
      return {
        text: `${item.actor.name} in #${item.channelName} (${item.projectTitle}): ${item.body}`,
        url: shareUrlFor({ type: 'profile', id: item.actor.id }),
      };
    case 'festival_spotlight':
      return {
        text: `${item.festivalName} is open for submissions — via SCENE.`,
        url: item.submissionUrl ?? shareUrlFor({ type: 'profile', id: item.actor.id }),
      };
    case 'bts_carousel':
      return {
        text: `Behind the scenes on "${item.projectTitle}" — via SCENE.`,
        url: shareUrlFor({ type: 'project', id: item.projectId }),
      };
    case 'catalog_spotlight':
      return {
        text: `Featured on SCENE: "${item.projectTitle}"${item.genre ? ` (${item.genre})` : ''} — by ${item.actor.name}.`,
        url: shareUrlFor({ type: 'project', id: item.projectId }),
      };
    case 'workspace_activity':
      return {
        text: `Things are moving on "${item.projectTitle}" — via SCENE.`,
        url: item.projectId
          ? shareUrlFor({ type: 'project', id: item.projectId })
          : `${API_BASE_URL}/projects`,
      };
  }
}

export async function shareFeedItem(item: NetworkFeedItem) {
  const { text, url } = textAndUrlFor(item);
  await Share.share({ message: `${text}\n\n${url}`, url });
}

export async function shareProfile(input: { id: string; name: string }) {
  const url = shareUrlFor({ type: 'profile', id: input.id });
  await Share.share({ message: `${input.name} on SCENE.\n\n${url}`, url });
}

export async function shareProject(input: { id: string; title: string }) {
  const url = shareUrlFor({ type: 'project', id: input.id });
  await Share.share({ message: `"${input.title}" on SCENE.\n\n${url}`, url });
}
