-- Migrate the legacy administrator table to the shared user table.
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

ALTER TABLE "Admin" RENAME TO "User";
ALTER TABLE "User" RENAME CONSTRAINT "Admin_pkey" TO "User_pkey";
ALTER INDEX "Admin_username_key" RENAME TO "User_username_key";

ALTER TABLE "User"
  ADD COLUMN "email" TEXT,
  ADD COLUMN "discordId" TEXT,
  ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'ADMIN';

-- Existing administrators remain administrators. Placeholder contact values keep
-- the new required fields valid without discarding legacy accounts.
UPDATE "User"
SET
  "email" = 'legacy-' || "id" || '@invalid.local',
  "discordId" = 'legacy-' || "id"
WHERE "email" IS NULL OR "discordId" IS NULL;

ALTER TABLE "User"
  ALTER COLUMN "email" SET NOT NULL,
  ALTER COLUMN "discordId" SET NOT NULL,
  ALTER COLUMN "role" SET DEFAULT 'USER';

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_discordId_key" ON "User"("discordId");