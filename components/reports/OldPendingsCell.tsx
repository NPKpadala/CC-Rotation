"use client";

import { useState, useTransition } from "react";
import { Loader2, Edit2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateOldPendings } from "@/actions/profile.actions";
import { formatCurrency } from "@/lib/utils";

interface Props {
  profileId: string;
  oldPendings: number;
  clearedOldPendings: number;
  field: "oldPendings" | "clearedOldPendings";
  canEdit: boolean;
}

export function OldPendingsCell({ profileId, oldPendings, clearedOldPendings, field, canEdit }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(field === "oldPendings" ? oldPendings : clearedOldPendings));
  const [isPending, startTransition] = useTransition();

  const display = field === "oldPendings" ? oldPendings : clearedOldPendings;

  function save() {
    const v = parseFloat(value) || 0;
    if (v < 0) {
      toast.error("Value must be non-negative");
      return;
    }
    startTransition(async () => {
      const newOld = field === "oldPendings" ? v : oldPendings;
      const newCleared = field === "clearedOldPendings" ? v : clearedOldPendings;
      const r = await updateOldPendings(profileId, newOld, newCleared);
      if (!r.success) {
        toast.error(r.error ?? "Failed");
        return;
      }
      toast.success("Updated");
      setEditing(false);
    });
  }

  function cancel() {
    setValue(String(display));
    setEditing(false);
  }

  if (!canEdit) {
    return (
      <span className="font-mono tabular-nums text-slate-700">
        {formatCurrency(display)}
      </span>
    );
  }

  if (editing) {
    return (
      <div className="inline-flex items-center gap-1">
        <Input
          type="number"
          step="0.01"
          min="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-7 w-24 text-right text-xs"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          disabled={isPending}
        />
        <Button size="sm" variant="ghost" onClick={save} disabled={isPending} className="h-7 w-7 p-0">
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 text-green-600" />}
        </Button>
        <Button size="sm" variant="ghost" onClick={cancel} disabled={isPending} className="h-7 w-7 p-0">
          <X className="h-3 w-3 text-slate-500" />
        </Button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono tabular-nums text-slate-700 hover:bg-slate-100"
      title="Click to edit"
    >
      {formatCurrency(display)}
      <Edit2 className="h-3 w-3 opacity-40" />
    </button>
  );
}
