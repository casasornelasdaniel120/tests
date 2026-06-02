import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { ClientDetail } from "@/components/clients/ClientDetail";

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !["ADMIN", "EDITOR"].includes(session.user.role)) redirect("/pos");

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const [{ data: client }, { data: sales }] = await Promise.all([
    supabase.from("Client").select("*").eq("id", id).single(),
    supabase
      .from("Sale")
      .select(`id, createdAt, total, discount, user:User(name), items:SaleItem(id,quantity,product:Product(name)), payments:SalePayment(id,method,amount)`)
      .eq("clientId", id)
      .order("createdAt", { ascending: false }),
  ]);

  if (!client) notFound();

  type SaleRow = {
    id: string;
    createdAt: string;
    total: number;
    discount: number;
    user: { name: string };
    items: { id: string; quantity: number; product: { name: string } }[];
    payments: { id: string; method: string; amount: number }[];
  };

  const serialized = {
    ...client,
    sales: ((sales ?? []) as unknown as SaleRow[]).map((s) => ({
      ...s,
      total: Number(s.total),
      discount: Number(s.discount),
      payments: s.payments.map((p) => ({ ...p, amount: Number(p.amount) })),
    })),
  };

  return <ClientDetail client={serialized} />;
}
