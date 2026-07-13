import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    // h-dvh: en iOS Safari la altura se ajusta cuando la barra del navegador
    // se colapsa; h-full dependía del body y dejaba la UI cortada.
    <div className="flex h-dvh">
      <Sidebar role={session.user.role} userName={session.user.name ?? ""} />
      <main className="flex-1 overflow-y-auto pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
        {children}
      </main>
    </div>
  );
}
