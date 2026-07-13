-- Pase digital de afiliados (Passcreator): token del QR + referencias al pase
ALTER TABLE "public"."User"
  ADD COLUMN "walletToken" TEXT,
  ADD COLUMN "passId" TEXT,
  ADD COLUMN "passUrl" TEXT;

CREATE UNIQUE INDEX "User_walletToken_key" ON "public"."User"("walletToken");
