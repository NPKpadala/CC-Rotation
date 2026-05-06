import { redirect } from "next/navigation";
import { getSessionSafe } from "@/lib/rbac";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionSafe();
  if (!session) redirect("/login");
  return (
    <div className="min-h-screen flex bg-muted/30">
      <Sidebar role={session.user.role} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header user={session.user} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
