CREATE TABLE "FeedPost" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "projectId" TEXT,
    "kind" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "body" TEXT,
    "posterUrl" TEXT,
    "videoUrl" TEXT,
    "logline" TEXT,
    "seekingFeedback" BOOLEAN NOT NULL DEFAULT false,
    "seekingFestivalPartner" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedPost_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FeedPost_authorId_idx" ON "FeedPost"("authorId");

CREATE INDEX "FeedPost_createdAt_idx" ON "FeedPost"("createdAt");

ALTER TABLE "FeedPost" ADD CONSTRAINT "FeedPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FeedPost" ADD CONSTRAINT "FeedPost_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
