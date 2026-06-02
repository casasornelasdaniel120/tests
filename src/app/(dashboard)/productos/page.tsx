import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ProductList } from "@/components/products/ProductList";

export default async function ProductosPage() {
  const session = await auth();
  if (!session || !["ADMIN", "EDITOR"].includes(session.user.role)) {
    redirect("/pos");
  }
  return <ProductList />;
}
