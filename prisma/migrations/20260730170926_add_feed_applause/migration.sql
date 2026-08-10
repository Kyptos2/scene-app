CREATE TABLE "FeedApplause" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedApplause_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FeedApplause_itemType_itemId_idx" ON "FeedApplause"("itemType", "itemId");

CREATE UNIQUE INDEX "FeedApplause_userId_itemType_itemId_key" ON "FeedApplause"("userId", "itemType", "itemId");

ALTER TABLE "FeedApplause" ADD CONSTRAINT "FeedApplause_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
