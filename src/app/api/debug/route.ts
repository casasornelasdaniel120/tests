import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import bcrypt from "bcryptjs";

export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (key !== process.env.AUTH_SECRET?.slice(0, 8)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  const results: Record<string, unknown> = {};

  try {
    const { count } = await supabase.from("User").select("*", { count: "exact", head: true });
    results.db = { ok: true, userCount: count };
  } catch (e) {
    results.db = { ok: false, error: String(e) };
  }

  try {
    const { data: user } = await supabase
      .from("User")
      .select("id, email, active, role, password")
      .eq("email", "admin@fotostudio.mx")
      .single();

    if (user) {
      const valid = await bcrypt.compare("admin123", user.password);
      results.user = { found: true, active: user.active, bcryptValid: valid };
    } else {
      results.user = { found: false };
    }
  } catch (e) {
    results.user = { error: String(e) };
  }

  results.env = {
    SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    AUTH_SECRET: !!process.env.AUTH_SECRET,
  };

  return NextResponse.json(results);
}
