-- NOTE: the auto-generated diff for this migration also emitted spurious
-- `ALTER COLUMN "geog" DROP DEFAULT` / `DROP INDEX ..._geog_idx` statements
-- against Festival/ProductionRequest/Project/User. Those columns are
-- `GENERATED ALWAYS AS (...) STORED` (see 20260728230305_postgis_geo) —
-- Prisma's Unsupported("geography(...)") type doesn't model that, so its
-- differ misreads the generated column as one needing a default dropped,
-- which Postgres rejects (a generated column has no "default" to drop).
-- Those statements were removed; the four GIST indexes are recreated
-- below to restore them (they were dropped by hand once already on the
-- real dev DB — this block is what makes a from-scratch replay, e.g. the
-- shadow DB `migrate dev` uses, end up in the same state).

-- CreateEnum
CREATE TYPE "ReportSource" AS ENUM ('USER', 'AUTO_SLUR');

-- AlterEnum
ALTER TYPE "ReportTargetType" ADD VALUE 'FEED_COMMENT';
ALTER TYPE "ReportTargetType" ADD VALUE 'MESSAGE';
ALTER TYPE "ReportTargetType" ADD VALUE 'WORKSPACE_MESSAGE';

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "source" "ReportSource" NOT NULL DEFAULT 'USER',
ALTER COLUMN "reporterId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "coverImageUrl" TEXT;
