CREATE TABLE "MatchReadiness" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readyAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchReadiness_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MatchReadiness_matchId_teamId_key" ON "MatchReadiness"("matchId", "teamId");
CREATE INDEX "MatchReadiness_userId_idx" ON "MatchReadiness"("userId");

ALTER TABLE "MatchReadiness"
ADD CONSTRAINT "MatchReadiness_matchId_fkey"
FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MatchReadiness"
ADD CONSTRAINT "MatchReadiness_teamId_fkey"
FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MatchReadiness"
ADD CONSTRAINT "MatchReadiness_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
