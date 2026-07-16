import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { homeFor } from "@/lib/roles";
import { FinanceDashboard } from "@/components/finance/FinanceDashboard";

export default async function FinanzasPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") {
    redirect(homeFor(session.user.role));
  }
  return <FinanceDashboard />;
}
