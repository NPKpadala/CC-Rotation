import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "./LoginForm";
import { CreditCard } from "lucide-react";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; callbackUrl?: string };
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-white to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-float">
            <CreditCard className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sahsra CC Rotations</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage every swipe, every payment, every rupee.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-card">
          <h2 className="mb-1 text-lg font-semibold text-slate-900">Sign in to your account</h2>
          <p className="mb-6 text-sm text-slate-500">Use your registered mobile number and password.</p>
          <LoginForm callbackUrl={searchParams.callbackUrl} initialError={searchParams.error} />
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white/70 p-4 text-xs text-slate-600 backdrop-blur">
          <p className="mb-1 font-semibold text-slate-700">Demo credentials</p>
          <p>
            <span className="font-medium">Admin:</span> 9999999999 / admin@123
          </p>
          <p>
            <span className="font-medium">Employee:</span> 9000000001 / emp@123
          </p>
        </div>
      </div>
    </div>
  );
}
