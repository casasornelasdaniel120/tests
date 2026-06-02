import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SaleHistory } from "@/components/cash-register/SaleHistory";

export default async function CajaPage() {
  const session = await auth();
  if (!session || !["ADMIN", "CAJERO"].includes(session.user.role)) {
    redirect("/pos");
  }
  return <SaleHistory />;
}
