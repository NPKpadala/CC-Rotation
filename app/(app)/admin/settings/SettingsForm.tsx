"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSetting } from "@/actions/admin.actions";

export function SettingsForm({ settingKey, label, value }: { settingKey: string; label: string; value: string }) {
  const [val, setVal] = useState(value);
  const [isPending, startTransition] = useTransition();

  function onSave() {
    startTransition(async () => {
      const r = await updateSetting(settingKey, val);
      if (!r.success) toast.error(r.error ?? "Failed");
      else toast.success(`${label} updated`);
    });
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={settingKey} className="text-xs">
        {label}
        <span className="ml-2 font-mono text-[10px] text-slate-400">{settingKey}</span>
      </Label>
      <div className="flex gap-2">
        <Input id={settingKey} value={val} onChange={(e) => setVal(e.target.value)} />
        <Button onClick={onSave} disabled={isPending || val === value} size="sm">
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
        </Button>
      </div>
    </div>
  );
}
