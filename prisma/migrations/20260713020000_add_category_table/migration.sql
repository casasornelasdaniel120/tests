-- CreateTable
CREATE TABLE "public"."Category" (
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("name")
);

-- Catálogo inicial: las categorías que ya usan los productos + las que antes
-- estaban hardcodeadas en el formulario
INSERT INTO "public"."Category" ("name")
SELECT DISTINCT "category" FROM "public"."Product"
UNION
SELECT unnest(ARRAY['Retrato', 'Corporativo', 'Quinceañera', 'Familia', 'Bebé', 'Otro'])
ON CONFLICT DO NOTHING;

-- AddForeignKey
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_category_fkey"
    FOREIGN KEY ("category") REFERENCES "public"."Category"("name")
    ON DELETE RESTRICT ON UPDATE CASCADE;
