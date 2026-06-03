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
    <div className="flex h-full">
      <Sidebar role={session.user.role} userName={session.user.name ?? ""} />
      <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">{children}</main>
    </div>
  );
}
