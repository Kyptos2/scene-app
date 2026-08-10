import { FilmRole, ExperienceLevel } from "@/generated/prisma/enums";

export const ROLE_LABELS: Record<FilmRole, string> = {
  DIRECTOR: "Director",
  PRODUCER: "Producer",
  DIRECTOR_OF_PHOTOGRAPHY: "DP",
  GAFFER: "Gaffer",
  KEY_GRIP: "Key Grip",
  SOUND_ENGINEER: "Sound Engineer",
  EDITOR: "Editor",
  FIRST_AC: "1st AC",
  SECOND_AC: "2nd AC",
  COLORIST: "Colorist",
  PRODUCTION_DESIGNER: "Production Designer",
  COSTUME_DESIGNER: "Costume Designer",
  SCREENWRITER: "Screenwriter",
  ACTOR: "Actor",
  PRODUCTION_ASSISTANT: "PA",
  COMPOSER: "Composer",
  VFX_ARTIST: "VFX Artist",
  LINE_PRODUCER: "Line Producer",
  CASTING_DIRECTOR: "Casting Director",
  OTHER: "Other",
};

export const ROLE_OPTIONS = Object.entries(ROLE_LABELS) as [FilmRole, string][];

export const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  STUDENT: "Student",
  INDIE: "Indie",
  PROFESSIONAL: "Professional",
  VETERAN: "Veteran",
};

export const EXPERIENCE_OPTIONS = Object.entries(EXPERIENCE_LABELS) as [
  ExperienceLevel,
  string
][];
