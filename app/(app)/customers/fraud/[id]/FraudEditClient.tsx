"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateFraud, submitFraud, deleteFraud } from "@/actions/fraud.actions";

interface FraudData {
  id: string;
  mobile: string;
  name: string | null;
  cardDetails: string | null;
  remarks: string | null;
  isSubmitted: boolean;
  cardPhotoUrls: string[];
}

export function FraudEditClient({
  fraud,
  canEdit,
  userRole,
}: {
  fraud: FraudData;
  canEdit: boolean;
  userRole: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await updateFraud(fraud.id, fd);
      if (!r.success) {
        setError(r.error ?? "Failed");
        toast.error(r.error ?? "Failed");
        return;
      }
      toast.success("Saved");
      router.refresh();
    });
  }

  function onSubmitFinal() {
    if (!confirm("Submit this fraud entry? Once submitted, only admins can edit it.")) return;
    startTransition(async () => {
      const r = await submitFraud(fraud.id);
      if (!r.success) {
        toast.error(r.error ?? "Failed");
        return;
      }
      toast.success("Submitted and locked");
      router.refresh();
    });
  }

  function onDelete() {
    if (!confirm("Permanently delete this fraud entry?")) return;
    startTransition(async () => {
      const r = await deleteFraud(fraud.id);
      if (!r.success) {
        toast.error(r.error ?? "Failed");
        return;
      }
      toast.success("Deleted");
      router.push("/customers/fraud");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSave} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="mobile">Mobile *</Label>
            <Input id="mobile" name="mobile" required defaultValue={fraud.mobile} disabled={!canEdit} pattern="\d{10}" maxLength={10} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={fraud.name ?? ""} disabled={!canEdit} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="cardDetails">Card Details</Label>
            <Input id="cardDetails" name="cardDetails" defaultValue={fraud.cardDetails ?? ""} disabled={!canEdit} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea id="remarks" name="remarks" rows={4} defaultValue={fraud.remarks ?? ""} disabled={!canEdit} />
          </div>

          {error && <div className="md:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <div className="flex flex-wrap gap-3 md:col-span-2">
            {canEdit && (
              <Button type="submit" disabled={isPending}>
                {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <><Save className="h-4 w-4" /> Save Changes</>}
              </Button>
            )}
            {canEdit && !fraud.isSubmitted && (
              <Button type="button" variant="outline" onClick={onSubmitFinal} disabled={isPending}>
                <Send className="h-4 w-4" /> Submit & Lock
              </Button>
            )}
            {userRole === "ADMIN" && (
              <Button type="button" variant="destructive" onClick={onDelete} disabled={isPending}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
