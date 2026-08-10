import { FilmRole } from "@/generated/prisma/enums";

// Department channels are derived from whichever roles are actually present
// on a project's verified crew — never a fixed list, so a 2-person short
// doesn't end up with 5 empty channels.
export const ROLE_DEPARTMENT: Record<FilmRole, string | null> = {
  DIRECTOR: "story",
  SCREENWRITER: "story",
  EDITOR: "story",
  ACTOR: "story",
  DIRECTOR_OF_PHOTOGRAPHY: "camera-lighting",
  GAFFER: "camera-lighting",
  KEY_GRIP: "camera-lighting",
  COLORIST: "camera-lighting",
  FIRST_AC: "camera-lighting",
  SECOND_AC: "camera-lighting",
  SOUND_ENGINEER: "audio-score",
  COMPOSER: "audio-score",
  PRODUCTION_DESIGNER: "art-costume",
  COSTUME_DESIGNER: "art-costume",
  VFX_ARTIST: "art-costume",
  PRODUCER: "production",
  LINE_PRODUCER: "production",
  PRODUCTION_ASSISTANT: "production",
  CASTING_DIRECTOR: "production",
  OTHER: null,
};

export const DEFAULT_CHANNELS = ["general", "announcements"];
