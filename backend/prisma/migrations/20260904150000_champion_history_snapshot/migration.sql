ALTER TABLE "Championship" ADD COLUMN "championTeamName" TEXT;
ALTER TABLE "Championship" ADD COLUMN "championDefinedAt" TIMESTAMP(3);

UPDATE "Championship" AS championship
SET
  "championTeamName" = team."name",
  "championDefinedAt" = COALESCE(championship."updatedAt", CURRENT_TIMESTAMP)
FROM "Team" AS team
WHERE championship."championTeamId" = team."id"
  AND championship."championTeamName" IS NULL;
