-- Módulo financiero: insumos (materiales y mano de obra), órdenes de compra
-- con costo promedio ponderado, recetas (BOM) por producto y snapshot de
-- costo en cada renglón de venta.

-- CreateEnum
CREATE TYPE "public"."InsumoType" AS ENUM ('MATERIAL', 'MANO_DE_OBRA');

-- CreateTable: catálogo de insumos
CREATE TABLE "public"."Insumo" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."InsumoType" NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'pieza',
    "currentCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "stock" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "minStock" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Insumo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Insumo_name_key" ON "public"."Insumo"("name");

-- CreateTable: orden de compra (cabecera)
CREATE TABLE "public"."Purchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "supplier" TEXT,
    "notes" TEXT,
    "total" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable: renglones de compra — congelan cantidad y costo unitario histórico
CREATE TABLE "public"."PurchaseItem" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "insumoId" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unitCost" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "PurchaseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable: receta / BOM (insumos por producto, cantidades con decimales)
CREATE TABLE "public"."ProductInsumo" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "insumoId" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,

    CONSTRAINT "ProductInsumo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductInsumo_productId_insumoId_key" ON "public"."ProductInsumo"("productId", "insumoId");

-- AlterTable: snapshot de costo en la venta (NULL en ventas previas al módulo)
ALTER TABLE "public"."SaleItem"
  ADD COLUMN "unitCost" DECIMAL(10,2),
  ADD COLUMN "totalCost" DECIMAL(10,2);

-- AddForeignKey
ALTER TABLE "public"."Purchase" ADD CONSTRAINT "Purchase_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PurchaseItem" ADD CONSTRAINT "PurchaseItem_purchaseId_fkey"
    FOREIGN KEY ("purchaseId") REFERENCES "public"."Purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PurchaseItem" ADD CONSTRAINT "PurchaseItem_insumoId_fkey"
    FOREIGN KEY ("insumoId") REFERENCES "public"."Insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductInsumo" ADD CONSTRAINT "ProductInsumo_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductInsumo" ADD CONSTRAINT "ProductInsumo_insumoId_fkey"
    FOREIGN KEY ("insumoId") REFERENCES "public"."Insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
