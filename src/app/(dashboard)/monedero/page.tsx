import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { homeFor } from "@/lib/roles";
import { WalletDashboard } from "@/components/wallet/WalletDashboard";

export default async function MonederoPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "AFILIADO") {
    redirect(homeFor(session.user.role));
  }
  return <WalletDashboard userName={session.user.name ?? ""} />;
}
