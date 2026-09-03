-- Agenda, resultado por W.O. e fluxo de disputas.
CREATE TYPE "MatchResultType" AS ENUM ('REGULAR', 'HOME_WALKOVER', 'AWAY_WALKOVER', 'DOUBLE_WALKOVER');
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'RESOLVED', 'REJECTED');

ALTER TABLE "Match" ADD COLUMN "resultType" "MatchResultType" NOT NULL DEFAULT 'REGULAR';
ALTER TABLE "Match" ADD COLUMN "resultNote" TEXT;
ALTER TABLE "Match" ADD COLUMN "scheduledAt" TIMESTAMP(3);

CREATE TABLE "MatchDispute" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "openedByUserId" TEXT NOT NULL,
  "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
  "reason" TEXT NOT NULL,
  "resolutionNote" TEXT,
  "resolvedByUserId" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MatchDispute_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MatchDispute_matchId_status_idx" ON "MatchDispute"("matchId", "status");
CREATE UNIQUE INDEX "MatchDispute_matchId_teamId_status_key" ON "MatchDispute"("matchId", "teamId", "status");

ALTER TABLE "MatchDispute" ADD CONSTRAINT "MatchDispute_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchDispute" ADD CONSTRAINT "MatchDispute_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchDispute" ADD CONSTRAINT "MatchDispute_openedByUserId_fkey" FOREIGN KEY ("openedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchDispute" ADD CONSTRAINT "MatchDispute_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
