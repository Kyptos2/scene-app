-- Add username (required, unique) and tagline (optional) to User.
-- Added nullable first so existing rows can be backfilled before the
-- NOT NULL + UNIQUE constraints go on.
ALTER TABLE "User" ADD COLUMN "username" TEXT;
ALTER TABLE "User" ADD COLUMN "tagline" TEXT;

-- Backfill from the email local-part (already unique, already slug-like:
-- "maya.okafor@slate.dev" -> "mayaokafor"). Good enough for the current
-- seeded dataset; a production signup flow would need its own collision
-- check on top of this.
UPDATE "User"
SET "username" = lower(regexp_replace(split_part("email", '@', 1), '[^a-zA-Z0-9]+', '', 'g'));

ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
