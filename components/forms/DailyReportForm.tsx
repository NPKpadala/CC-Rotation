"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createDailyReport } from "@/actions/dailyReport.actions";
import { WALLET_PROVIDERS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

export function DailyReportForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState<Record<string, number>>(
    Object.fromEntries(WALLET_PROVIDERS.map((p) => [p, 0]))
  );
  const [closing, setClosing] = useState<Record<string, number>>(
    Object.fromEntries(WALLET_PROVIDERS.map((p) => [p, 0]))
  );
  const [pendings, setPendings] = useState(0);

  const openingTotal = Object.values(opening).reduce((s, n) => s + (n || 0), 0);
  const closingTotal = Object.values(closing).reduce((s, n) => s + (n || 0), 0);
  const total = closingTotal + pendings;
  const difference = openingTotal - closingTotal;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await createDailyReport(fd);
      if (!r.success) {
        setError(r.error ?? "Failed");
        toast.error(r.error ?? "Failed");
        return;
      }
      toast.success("Daily report saved");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Daily Wallet Report</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="transactionDate">Date *</Label>
            <Input id="transactionDate" name="transactionDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
          </div>

          <div>
            <h3 className="mb-3 font-semibold">Opening Balance</h3>
            <div className="space-y-2">
              {WALLET_PROVIDERS.map((p) => (
                <div key={p} className="flex items-center gap-2">
                  <Label className="w-24 capitalize">{p}</Label>
                  <Input
                    name={`opening_${p}`}
                    type="number"
                    step="0.01"
                    min="0"
                    value={opening[p]}
                    onChange={(e) => setOpening({ ...opening, [p]: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              ))}
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="font-medium">Total Opening</span>
                <span className="font-mono font-bold">{formatCurrency(openingTotal)}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-3 font-semibold">Closing Balance</h3>
            <div className="space-y-2">
              {WALLET_PROVIDERS.map((p) => (
                <div key={p} className="flex items-center gap-2">
                  <Label className="w-24 capitalize">{p}</Label>
                  <Input
                    name={`closing_${p}`}
                    type="number"
                    step="0.01"
                    min="0"
                    value={closing[p]}
                    onChange={(e) => setClosing({ ...closing, [p]: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              ))}
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="font-medium">Total Closing</span>
                <span className="font-mono font-bold">{formatCurrency(closingTotal)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="walletPendings">Wallet Pendings</Label>
            <Input
              id="walletPendings"
              name="walletPendings"
              type="number"
              step="0.01"
              min="0"
              value={pendings}
              onChange={(e) => setPendings(parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="md:col-span-2">
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-primary-200 bg-primary-50/40 p-4">
              <div>
                <p className="text-xs uppercase text-slate-500">Total (closing + pendings)</p>
                <p className="font-mono text-lg font-bold text-primary-700">{formatCurrency(total)}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Difference (opening − closing)</p>
                <p className={`font-mono text-lg font-bold ${difference < 0 ? "text-red-600" : "text-green-600"}`}>
                  {formatCurrency(difference)}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea id="remarks" name="remarks" rows={2} />
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Save Daily Report"}
      </Button>
    </form>
  );
}
