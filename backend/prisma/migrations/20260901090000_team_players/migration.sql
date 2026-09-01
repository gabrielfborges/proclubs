CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "externalId" TEXT,
    "position" TEXT,
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

ALTER TABLE "Player" ADD CONSTRAINT "Player_pkey" PRIMARY KEY ("id");
CREATE UNIQUE INDEX "Player_teamId_name_key" ON "Player"("teamId", "name");
CREATE INDEX "Player_teamId_idx" ON "Player"("teamId");

ALTER TABLE "Player"
ADD CONSTRAINT "Player_teamId_fkey"
FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;