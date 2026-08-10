import { ProjectStatus, CompensationType } from "@/generated/prisma/enums";

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  PRE_PRODUCTION: "Pre-Production",
  FILMING: "Filming",
  POST_PRODUCTION: "Post-Production",
  COMPLETED: "Completed",
};

export const PROJECT_STATUS_OPTIONS = Object.entries(PROJECT_STATUS_LABELS) as [
  ProjectStatus,
  string
][];

export const COMPENSATION_LABELS: Record<CompensationType, string> = {
  PAID: "Paid",
  DEFERRED: "Deferred",
  CREDIT_COPY: "Credit / Copy",
};
