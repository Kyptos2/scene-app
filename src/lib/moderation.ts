import { prisma } from "@/lib/prisma";
import type { ReportTargetType } from "@/generated/prisma/enums";

// Automated slur detection for the trust & safety pipeline. Deliberately
// scoped to slurs (racial, ethnic, homophobic, transphobic, ableist,
// antisemitic, misogynistic) — profanity/cursing is NOT included here.
// Film scripts, loglines, and crew-call banter routinely use curse words
// ("fuck", "shit", "damn", "ass", etc.) legitimately; flagging those would
// bury moderators in noise and penalize normal creative writing. Slurs are
// a different category — there's no legitimate in-app use for a slur
// directed at a person or group, so any detected use gets flagged for a
// human moderator to review (content is never auto-blocked or auto-deleted;
// this only raises a flag).
const SLUR_TERMS: string[] = [
  // Racial / ethnic
  "nigger", "niggers", "nigga", "niggas", "niggah",
  "chink", "chinks", "gook", "gooks", "spic", "spics",
  "wetback", "wetbacks", "beaner", "beaners",
  "coon", "coons", "jigaboo", "jigaboos",
  "gypsy", "gyppo",
  "paki", "pakis",
  "raghead", "ragheads", "sandnigger",
  "redskin", "redskins", "injun", "injuns",
  "wop", "wops", "guido",
  // Antisemitic
  "kike", "kikes",
  // Homophobic / transphobic
  "faggot", "faggots", "fag", "fags",
  "dyke", "dykes",
  "tranny", "trannies", "shemale", "shemales",
  // Ableist
  "retard", "retarded", "retards",
  // Misogynistic (severe slurs, not general insults like "bitch")
  "cunt", "cunts",
];

const LEETSPEAK_MAP: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  "$": "s",
  "!": "i",
};

function normalizeForMatching(text: string): string {
  let normalized = text.toLowerCase();
  normalized = normalized
    .split("")
    .map((ch) => LEETSPEAK_MAP[ch] ?? ch)
    .join("");
  // Collapse runs of 3+ identical characters to one, so "niiiiigger" or
  // "fuuuuck"-style stretching can't dodge the word-boundary match.
  normalized = normalized.replace(/(.)\1{2,}/g, "$1");
  return normalized;
}

function buildSlurRegex(): RegExp {
  const escaped = SLUR_TERMS.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`\\b(${escaped.join("|")})\\b`, "i");
}

const SLUR_REGEX = buildSlurRegex();

export function containsSlur(text: string | null | undefined): boolean {
  if (!text) return false;
  return SLUR_REGEX.test(normalizeForMatching(text));
}

// Fire-and-forget: creates an AUTO_SLUR report for a moderator to review.
// Never throws — a moderation-logging failure must not block the user's
// actual post/comment/message from being created. Call this after the
// content already exists (it's a flag, not a block).
export async function autoFlagIfSlur(params: {
  text: string | null | undefined;
  targetType: ReportTargetType;
  targetId: string;
}): Promise<void> {
  if (!containsSlur(params.text)) return;
  try {
    await prisma.report.create({
      data: {
        reporterId: null,
        source: "AUTO_SLUR",
        targetType: params.targetType,
        targetId: params.targetId,
        reason: "Automated scan flagged possible slur use",
        status: "PENDING",
      },
    });
  } catch (err) {
    console.error("Failed to create auto-slur report:", err);
  }
}
