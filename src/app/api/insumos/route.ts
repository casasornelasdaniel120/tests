import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { createId } from "@paralleldrive/cuid2";
import type { InsumoType } from "@/types";

const INSUMO_TYPES: InsumoType[] = ["MATERIAL", "MANO_DE_OBRA"];

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const active = searchParams.get("active");

  let query = getSupabaseAdmin().from("Insumo").select("*").order("name");
  if (type) query = query.eq("type", type);
  if (active === "true") query = query.eq("active", true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json() as {
    name?: string;
    type?: InsumoType;
    unit?: string;
    currentCost?: number;
    minStock?: number;
  };

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
  }
  if (!body.type || !INSUMO_TYPES.includes(body.type)) {
    return NextResponse.json({ error: "Tipo de insumo inválido" }, { status: 400 });
  }
  const currentCost = Number(body.currentCost ?? 0);
  const minStock = Number(body.minStock ?? 0);
  if (Number.isNaN(currentCost) || currentCost < 0) {
    return NextResponse.json({ error: "El costo debe ser mayor o igual a 0" }, { status: 400 });
  }
  if (Number.isNaN(minStock) || minStock < 0) {
    return NextResponse.json({ error: "El stock mínimo debe ser mayor o igual a 0" }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("Insumo")
    .insert({
      id: createId(),
      name,
      type: body.type,
      unit: body.unit?.trim() || (body.type === "MANO_DE_OBRA" ? "hora" : "pieza"),
      currentCost,
      minStock,
      updatedAt: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Ese insumo ya existe" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
