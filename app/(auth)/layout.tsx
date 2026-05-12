// ADDED v1.3 — Auth layout with NPKpadala footer pinned to bottom.
import { Footer } from "@/components/layout/Footer";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <div className="flex flex-1 items-center justify-center">{children}</div>
      <Footer />
    </div>
  );
}
