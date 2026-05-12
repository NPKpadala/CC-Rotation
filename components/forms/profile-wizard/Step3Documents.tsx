"use client";

import { useTransition, useState } from "react";
import { Loader2, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PhotoUpload } from "@/components/shared/PhotoUpload";
import { useWizard } from "./wizard-context";
import { createProfile } from "@/actions/profile.actions";

export function Step3Documents({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const { data, update, reset } = useWizard();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => {
      fd.set(k, typeof v === "boolean" ? (v ? "true" : "false") : String(v ?? ""));
    });

    startTransition(async () => {
      const r = await createProfile(fd);
      if (!r.success) {
        setError(r.error ?? "Failed to create profile");
        toast.error(r.error ?? "Failed");
        return;
      }
      toast.success("Profile created");
      reset();
      if (r.data?.id) {
        // Redirect with ?addCard=1 to auto-open the Add Card modal
        router.push(`/profiles/${r.data.id}?addCard=1`);
      } else {
        router.push("/profiles");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary-600" /> Identity Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <PhotoUpload
            name="aadhaarFrontUrl"
            label="Aadhaar — Front"
            defaultUrl={data.aadhaarFrontUrl}
            onUploaded={(url) => update({ aadhaarFrontUrl: url })}
            documentMode
          />
          <PhotoUpload
            name="aadhaarBackUrl"
            label="Aadhaar — Back"
            defaultUrl={data.aadhaarBackUrl}
            onUploaded={(url) => update({ aadhaarBackUrl: url })}
            documentMode
          />
          <PhotoUpload
            name="panCardUrl"
            label="PAN Card"
            defaultUrl={data.panCardUrl}
            onUploaded={(url) => update({ panCardUrl: url })}
            documentMode
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Local Proof Documents</CardTitle>
          <p className="text-xs text-slate-500">Optional — any one is fine. PDF or image.</p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <PhotoUpload
            name="gasBillUrl"
            label="Gas Bill"
            defaultUrl={data.gasBillUrl}
            onUploaded={(url) => update({ gasBillUrl: url })}
            documentMode
            showCamera={false}
          />
          <PhotoUpload
            name="electricityBillUrl"
            label="Electricity / Current Bill"
            defaultUrl={data.electricityBillUrl}
            onUploaded={(url) => update({ electricityBillUrl: url })}
            documentMode
            showCamera={false}
          />
          <PhotoUpload
            name="rentAgreementUrl"
            label="Rent Agreement"
            defaultUrl={data.rentAgreementUrl}
            onUploaded={(url) => update({ rentAgreementUrl: url })}
            documentMode
            showCamera={false}
          />
          <PhotoUpload
            name="bankPassbookUrl"
            label="Bank Passbook"
            defaultUrl={data.bankPassbookUrl}
            onUploaded={(url) => update({ bankPassbookUrl: url })}
            documentMode
            showCamera={false}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Internal Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="internalNotes" className="sr-only">Internal Notes</Label>
          <Textarea
            id="internalNotes"
            value={data.internalNotes}
            onChange={(e) => update({ internalNotes: e.target.value })}
            rows={3}
            placeholder="Anything the team should know about this customer…"
            maxLength={2000}
          />
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          ← Back
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
        >
          {isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Creating profile…</>
          ) : (
            <><CheckCircle2 className="h-4 w-4" /> Create Profile & Continue to Card</>
          )}
        </button>
      </div>
    </form>
  );
}
