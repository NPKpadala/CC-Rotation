"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Trash2, AlertOctagon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { restoreTransaction, permanentDeleteTransaction } from "@/actions/billPayment.actions";

export function TrashRowActions({
  id,
  transactionId,
  customerName,
}: {
  id: string;
  transactionId: string;
  customerName: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmText, setConfirmText] = useState("");
  const [open, setOpen] = useState(false);

  function onRestore() {
    if (isPending) return;
    startTransition(async () => {
      const r = await restoreTransaction(id);
      if (!r.success) {
        toast.error(r.error ?? "Failed");
        return;
      }
      toast.success(`Restored ${transactionId}`);
      router.refresh();
    });
  }

  function onPermanentDelete() {
    if (isPending) return;
    if (confirmText !== transactionId) {
      toast.error("Confirm text must match the transaction ID exactly");
      return;
    }
    startTransition(async () => {
      const r = await permanentDeleteTransaction(id, confirmText);
      if (!r.success) {
        toast.error(r.error ?? "Failed");
        return;
      }
      toast.success(`Permanently deleted ${transactionId}`);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={onRestore}
      >
        {isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <RotateCcw className="h-3 w-3" />
        )}
        Restore
      </Button>

      <Dialog open={open} onOpenChange={(v) => {
        setOpen(v);
        if (!v) setConfirmText("");
      }}>
        <DialogTrigger asChild>
          <Button type="button" variant="destructive" size="sm">
            <Trash2 className="h-3 w-3" /> Delete
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertOctagon className="h-5 w-5 text-red-600" /> Permanently delete?
            </DialogTitle>
            <DialogDescription>
              This action is <strong>irreversible</strong>. To confirm, type the transaction ID below:
              <br />
              <code className="mt-2 inline-block rounded bg-slate-100 px-2 py-1 font-mono text-xs">{transactionId}</code>
              <br />
              <span className="mt-2 inline-block text-xs">Customer: {customerName}</span>
            </DialogDescription>
          </DialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type transaction ID to confirm"
            className="font-mono"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={confirmText !== transactionId || isPending}
              onClick={onPermanentDelete}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Permanently delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
