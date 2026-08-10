-- CreateEnum
CREATE TYPE "MessageKind" AS ENUM ('TEXT', 'IMAGE', 'STICKER');

-- AlterTable
ALTER TABLE "Message" ADD COLUMN "kind" "MessageKind" NOT NULL DEFAULT 'TEXT';
ALTER TABLE "Message" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "Message" ADD COLUMN "deletedAt" TIMESTAMP(3);
