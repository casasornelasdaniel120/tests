import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin, toPublicUrl } from "@/lib/supabase-admin";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024;
const BUCKET = "productos";

export async function POST(req: Request) {
  const session = await auth();
  if (!session || !["ADMIN", "EDITOR"].includes(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Tipo de archivo no permitido" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "El archivo supera 5 MB" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, buffer, { contentType: file.type, upsert: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  return NextResponse.json({ url: toPublicUrl(data.publicUrl) }, { status: 201 });
}
