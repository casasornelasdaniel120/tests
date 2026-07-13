import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { homeFor } from "@/lib/roles";
import { ProductList } from "@/components/products/ProductList";

export default async function ProductosPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!["ADMIN", "EDITOR"].includes(session.user.role)) {
    redirect(homeFor(session.user.role));
  }
  return <ProductList />;
}
