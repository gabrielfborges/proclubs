CREATE TABLE "MatchChatMessage" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" VARCHAR(1000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MatchChatMessage_matchId_createdAt_idx" ON "MatchChatMessage"("matchId", "createdAt");
CREATE INDEX "MatchChatMessage_userId_idx" ON "MatchChatMessage"("userId");

ALTER TABLE "MatchChatMessage"
ADD CONSTRAINT "MatchChatMessage_matchId_fkey"
FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MatchChatMessage"
ADD CONSTRAINT "MatchChatMessage_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;