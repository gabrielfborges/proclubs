-- Registra como aprovadas as vinculacoes antigas e libera o campo legado do time.
ALTER TABLE "ChampionshipApplication" ADD COLUMN "approvedAt" TIMESTAMP(3);

UPDATE "ChampionshipApplication"
SET "approvedAt" = "reviewedAt"
WHERE "status" = 'APPROVED' AND "approvedAt" IS NULL;

INSERT INTO "ChampionshipApplication" (
  "id", "teamId", "championshipId", "status", "reviewedAt", "approvedAt", "createdAt", "updatedAt"
)
SELECT
  md5('legacy:' || t."id" || ':' || t."championshipId"),
  t."id",
  t."championshipId",
  'APPROVED',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  t."createdAt",
  CURRENT_TIMESTAMP
FROM "Team" t
WHERE t."championshipId" IS NOT NULL
ON CONFLICT ("teamId", "championshipId") DO UPDATE SET
  "status" = 'APPROVED',
  "reviewedAt" = COALESCE("ChampionshipApplication"."reviewedAt", CURRENT_TIMESTAMP),
  "approvedAt" = COALESCE("ChampionshipApplication"."approvedAt", CURRENT_TIMESTAMP),
  "updatedAt" = CURRENT_TIMESTAMP;

UPDATE "Team"
SET "championshipId" = NULL
WHERE "championshipId" IS NOT NULL;
