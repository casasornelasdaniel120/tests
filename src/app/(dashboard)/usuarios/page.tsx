import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UserList } from "@/components/users/UserList";

export default async function UsuariosPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/pos");
  }
  return <UserList />;
}
