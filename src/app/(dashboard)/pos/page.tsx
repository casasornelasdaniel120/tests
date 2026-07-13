import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { homeFor } from "@/lib/roles";
import { POSScreen } from "@/components/pos/POSScreen";

export default async function POSPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!["ADMIN", "CAJERO"].includes(session.user.role)) {
    redirect(homeFor(session.user.role));
  }
  return <POSScreen />;
}
