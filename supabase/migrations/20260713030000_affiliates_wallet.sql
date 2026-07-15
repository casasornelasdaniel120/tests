-- Rol AFILIADO (dentistas con monedero de comisiones)
ALTER TYPE "public"."Role" ADD VALUE 'AFILIADO';

-- CreateEnum
CREATE TYPE "public"."WalletTxType" AS ENUM ('COMISION', 'PAGO', 'AJUSTE');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN "commissionPct" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."Sale"
  ADD COLUMN "affiliateId" TEXT,
  ADD COLUMN "commissionAmount" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "public"."WalletTransaction" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "saleId" TEXT,
    "type" "public"."WalletTxType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Sale" ADD CONSTRAINT "Sale_affiliateId_fkey"
    FOREIGN KEY ("affiliateId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WalletTransaction" ADD CONSTRAINT "WalletTransaction_affiliateId_fkey"
    FOREIGN KEY ("affiliateId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WalletTransaction" ADD CONSTRAINT "WalletTransaction_saleId_fkey"
    FOREIGN KEY ("saleId") REFERENCES "public"."Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
