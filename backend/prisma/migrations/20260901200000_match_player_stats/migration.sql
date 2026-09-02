CREATE TYPE "MatchPlayerStatSource" AS ENUM ('EA', 'MANUAL');

CREATE TABLE "MatchPlayerStat" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "goals" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "source" "MatchPlayerStatSource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MatchPlayerStat_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MatchPlayerStat_matchId_playerId_key" ON "MatchPlayerStat"("matchId", "playerId");
CREATE INDEX "MatchPlayerStat_playerId_idx" ON "MatchPlayerStat"("playerId");

ALTER TABLE "MatchPlayerStat"
ADD CONSTRAINT "MatchPlayerStat_matchId_fkey"
FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MatchPlayerStat"
ADD CONSTRAINT "MatchPlayerStat_playerId_fkey"
FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;