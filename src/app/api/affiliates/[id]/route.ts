import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Configuración del doctor: % de comisión y activo/inactivo (solo ADMIN)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json() as { commissionPct?: number; active?: boolean };

  const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (body.commissionPct !== undefined) {
    const pct = Number(body.commissionPct);
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      return NextResponse.json({ error: "El porcentaje debe estar entre 0 y 100" }, { status: 400 });
    }
    update.commissionPct = pct;
  }
  if (body.active !== undefined) update.active = body.active;

  const { data, error } = await getSupabaseAdmin()
    .from("User")
    .update(update)
    .eq("id", id)
    .eq("role", "AFILIADO")
    .select("id, name, commissionPct, active")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Afiliado no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
