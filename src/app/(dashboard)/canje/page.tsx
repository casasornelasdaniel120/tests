import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { homeFor } from "@/lib/roles";
import { RedeemScreen } from "@/components/wallet/RedeemScreen";

export default async function CanjePage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!["ADMIN", "CAJERO"].includes(session.user.role)) {
    redirect(homeFor(session.user.role));
  }
  return <RedeemScreen />;
}
