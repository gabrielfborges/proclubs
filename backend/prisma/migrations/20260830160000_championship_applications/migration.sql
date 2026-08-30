-- CreateEnum
CREATE TYPE "ChampionshipApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "ChampionshipApplication" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "championshipId" TEXT NOT NULL,
    "status" "ChampionshipApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChampionshipApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChampionshipApplication_teamId_championshipId_key" ON "ChampionshipApplication"("teamId", "championshipId");
CREATE INDEX "ChampionshipApplication_championshipId_status_idx" ON "ChampionshipApplication"("championshipId", "status");

-- AddForeignKey
ALTER TABLE "ChampionshipApplication" ADD CONSTRAINT "ChampionshipApplication_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChampionshipApplication" ADD CONSTRAINT "ChampionshipApplication_championshipId_fkey" FOREIGN KEY ("championshipId") REFERENCES "Championship"("id") ON DELETE CASCADE ON UPDATE CASCADE;