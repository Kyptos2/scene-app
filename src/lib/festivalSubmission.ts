const DEADLINE_APPROACHING_DAYS = 7;

export type SubmissionStatus = "unset" | "open" | "deadline_soon" | "closed";

export function computeSubmissionStatus(deadline: Date | null): SubmissionStatus {
  if (!deadline) return "unset";
  const msRemaining = deadline.getTime() - Date.now();
  if (msRemaining < 0) return "closed";
  if (msRemaining <= DEADLINE_APPROACHING_DAYS * 24 * 60 * 60 * 1000) return "deadline_soon";
  return "open";
}
