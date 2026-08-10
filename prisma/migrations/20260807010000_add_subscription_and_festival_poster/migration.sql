-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'GOLD');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "subscriptionTier" "SubscriptionTier" NOT NULL DEFAULT 'FREE';
ALTER TABLE "User" ADD COLUMN "subscriptionUpdatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Festival" ADD COLUMN "posterUrl" TEXT;
