import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { POSScreen } from "@/components/pos/POSScreen";

export default async function POSPage() {
  const session = await auth();
  if (!session || !["ADMIN", "CAJERO"].includes(session.user.role)) {
    redirect("/clientes");
  }
  return <POSScreen />;
}
