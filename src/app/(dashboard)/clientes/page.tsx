import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ClientList } from "@/components/clients/ClientList";

export default async function ClientesPage() {
  const session = await auth();
  if (!session || !["ADMIN", "EDITOR"].includes(session.user.role)) {
    redirect("/pos");
  }
  return <ClientList />;
}
