import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { homeFor } from "@/lib/roles";
import { SaleHistory } from "@/components/cash-register/SaleHistory";

export default async function CajaPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!["ADMIN", "CAJERO"].includes(session.user.role)) {
    redirect(homeFor(session.user.role));
  }
  return <SaleHistory />;
}
