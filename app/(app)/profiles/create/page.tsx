import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ProfileWizard } from "@/components/forms/profile-wizard/ProfileWizard";

export const dynamic = "force-dynamic";

export default function CreateProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/profiles" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
          <ChevronLeft className="h-4 w-4" /> Back to profiles
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Customer Verification & Financial Profile</h1>
        <p className="text-sm text-slate-500">
          Complete the 3 steps to onboard a new customer. Your progress is auto-saved as a draft.
        </p>
      </div>

      <ProfileWizard />
    </div>
  );
}
