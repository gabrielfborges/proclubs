ALTER TABLE "Team" ADD COLUMN "captainUserId" TEXT;

UPDATE "Team" AS team
SET "captainUserId" = "User"."id"
FROM "User"
WHERE team."captain" = "User"."username";

ALTER TABLE "Team" DROP COLUMN "captain";

ALTER TABLE "Team"
  ADD CONSTRAINT "Team_captainUserId_fkey"
  FOREIGN KEY ("captainUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;