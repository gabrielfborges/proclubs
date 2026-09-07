CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED');

ALTER TABLE "Championship" ADD COLUMN "registrationFeeCents" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "ChampionshipPayment" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "providerPaymentId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amountCents" INTEGER NOT NULL,
    "statusDetail" TEXT,
    "qrCode" TEXT,
    "qrCodeBase64" TEXT,
    "expiresAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "lastWebhookAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChampionshipPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChampionshipPayment_providerPaymentId_key" ON "ChampionshipPayment"("providerPaymentId");
CREATE UNIQUE INDEX "ChampionshipPayment_idempotencyKey_key" ON "ChampionshipPayment"("idempotencyKey");
CREATE INDEX "ChampionshipPayment_applicationId_status_idx" ON "ChampionshipPayment"("applicationId", "status");

ALTER TABLE "ChampionshipPayment"
ADD CONSTRAINT "ChampionshipPayment_applicationId_fkey"
FOREIGN KEY ("applicationId") REFERENCES "ChampionshipApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
