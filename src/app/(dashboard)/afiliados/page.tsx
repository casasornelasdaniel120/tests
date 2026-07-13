import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { homeFor } from "@/lib/roles";
import { AffiliateList } from "@/components/affiliates/AffiliateList";

export default async function AfiliadosPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") {
    redirect(homeFor(session.user.role));
  }
  return <AffiliateList />;
}
