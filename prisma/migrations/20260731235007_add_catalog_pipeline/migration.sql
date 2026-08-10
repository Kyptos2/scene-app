-- CreateEnum
CREATE TYPE "CatalogStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING', 'PUBLISHED', 'REJECTED');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "catalogStatus" "CatalogStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
ADD COLUMN     "posterUrl" TEXT,
ADD COLUMN     "rejectionNote" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT,
ADD COLUMN     "submittedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isModerator" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ProjectLink" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "urlReachable" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectLink_projectId_idx" ON "ProjectLink"("projectId");

-- CreateIndex
CREATE INDEX "Project_catalogStatus_idx" ON "Project"("catalogStatus");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectLink" ADD CONSTRAINT "ProjectLink_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
