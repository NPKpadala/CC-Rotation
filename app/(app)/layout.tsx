import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout/Footer";
import { Calculator } from "@/components/shared/Calculator";
import { CommandPalette } from "@/components/shared/CommandPalette";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role={session.user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          userName={session.user.name ?? "User"}
          userMobile={session.user.mobile}
          userRole={session.user.role}
        />
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <div className="container mx-auto p-4 lg:p-6">{children}</div>
          <Footer />
        </main>
        <MobileNav />
        <Calculator />
        <CommandPalette />
      </div>
    </div>
  );
}
