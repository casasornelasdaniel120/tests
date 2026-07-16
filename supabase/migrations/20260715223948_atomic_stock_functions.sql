-- Movimientos de inventario atómicos. Las rutas de ventas/compras hacían
-- read-then-write sobre "Insumo" (stock y promedio ponderado) en JS: dos
-- requests concurrentes se pisaban el update (una compra podía "desaparecer"
-- del stock). Estas funciones hacen el movimiento en un solo UPDATE.

-- Venta: descuenta stock de forma relativa (nunca valor absoluto)
CREATE OR REPLACE FUNCTION public.decrement_insumo_stock(insumo_id TEXT, amount NUMERIC)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE "public"."Insumo"
  SET "stock" = round("stock" - amount, 3),
      "updatedAt" = now()
  WHERE "id" = insumo_id;
$$;

-- Compra: suma stock y recalcula el costo promedio ponderado en la misma
-- sentencia. Si el stock está en 0 o negativo, el promedio se reinicia al
-- costo de la compra (un stock negativo envenenaría el denominador); el
-- stock real sí suma sobre el negativo. Solo aplica a MATERIAL.
CREATE OR REPLACE FUNCTION public.register_purchase_item(insumo_id TEXT, qty NUMERIC, unit_cost NUMERIC)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE "public"."Insumo"
  SET "currentCost" = round(
        (GREATEST("stock", 0) * "currentCost" + qty * unit_cost)
          / (GREATEST("stock", 0) + qty),
        2
      ),
      "stock" = round("stock" + qty, 3),
      "updatedAt" = now()
  WHERE "id" = insumo_id
    AND "type" = 'MATERIAL';
$$;
