import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const { data: insumo, error: fetchError } = await supabase
    .from("Insumo")
    .select("id, type")
    .eq("id", id)
    .single();
  if (fetchError || !insumo) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const body = await req.json() as {
    name?: string;
    unit?: string;
    currentCost?: number;
    minStock?: number;
    active?: boolean;
  };

  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
    patch.name = name;
  }
  if (body.unit !== undefined) patch.unit = body.unit.trim() || "pieza";
  if (body.minStock !== undefined) {
    const minStock = Number(body.minStock);
    if (Number.isNaN(minStock) || minStock < 0) {
      return NextResponse.json({ error: "El stock mínimo debe ser mayor o igual a 0" }, { status: 400 });
    }
    patch.minStock = minStock;
  }
  if (body.active !== undefined) patch.active = Boolean(body.active);
  // El costo de un MATERIAL sale del promedio ponderado de compras;
  // solo la mano de obra tiene tarifa editable a mano. El stock nunca
  // se edita directo (se mueve con compras y ventas).
  if (body.currentCost !== undefined) {
    if (insumo.type !== "MANO_DE_OBRA") {
      return NextResponse.json(
        { error: "El costo de un material se actualiza con órdenes de compra" },
        { status: 400 }
      );
    }
    const currentCost = Number(body.currentCost);
    if (Number.isNaN(currentCost) || currentCost < 0) {
      return NextResponse.json({ error: "El costo debe ser mayor o igual a 0" }, { status: 400 });
    }
    patch.currentCost = currentCost;
  }

  const { data, error } = await supabase
    .from("Insumo")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Ese insumo ya existe" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const { error } = await getSupabaseAdmin().from("Insumo").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      return NextResponse.json(
        { error: "El insumo está en uso (receta o compra). Puedes desactivarlo." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
