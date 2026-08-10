ALTER TABLE "Festival" ADD COLUMN "submissionUrl" TEXT;
ALTER TABLE "Festival" ADD COLUMN "submissionDeadline" TIMESTAMP(3);
ALTER TABLE "Festival" ADD COLUMN "urlLastCheckedAt" TIMESTAMP(3);
ALTER TABLE "Festival" ADD COLUMN "urlReachable" BOOLEAN;
