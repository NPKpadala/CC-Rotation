"use client";
import { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { transactionSchema, type TransactionInput } from "@/lib/validations";
import { createTransaction } from "@/app/actions/transactions";
import { computeLedger } from "@/lib/calculations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

interface Props {
  profiles: { id: string; fullName: string }[];
  banks: { id: string; name: string; isPrimary: boolean }[];
  defaultProfileId?: string;
}

export default function TransactionForm({ profiles, banks, defaultProfileId }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const { register, control, handleSubmit, formState: { errors } } = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      profileId: defaultProfileId || "",
      date: new Date(),
      dueAmount: 0, paidAmount: 0, swipeAmount: 0, swipePercentage: 2,
      splitPayments: [],
      cardName: "", cardType: "VISA", cardNumber: "",
      paymentSite: "", swipeSite: "", swipeDate: new Date(),
      remarks: "", status: "PENDING",
      bankAccountId: banks.find((b) => b.isPrimary)?.id || null,
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "splitPayments" });
  const watched = useWatch({ control });

  const calc = useMemo(() => computeLedger({
    dueAmount: Number(watched.dueAmount) || 0,
    paidAmount: Number(watched.paidAmount) || 0,
    swipeAmount: Number(watched.swipeAmount) || 0,
    swipePercentage: Number(watched.swipePercentage) || 0,
  }), [watched.dueAmount, watched.paidAmount, watched.swipeAmount, watched.swipePercentage]);

  async function onSubmit(data: TransactionInput) {
    setSubmitting(true);
    try {
      const res = await createTransaction({
        ...data,
        dueAmount: Number(data.dueAmount), paidAmount: Number(data.paidAmount),
        swipeAmount: Number(data.swipeAmount), swipePercentage: Number(data.swipePercentage),
        splitPayments: (data.splitPayments || []).map((s) => ({ ...s, amount: Number(s.amount) })),
      });
      toast.success("Ledger entry saved");
      router.push("/transactions");
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally { setSubmitting(false); }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader><CardTitle>Profile & Card</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div><Label>Profile</Label>
              <Select {...register("profileId")} defaultValue={defaultProfileId || ""}>
                <option value="">Select profile</option>
                {profiles.map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}
              </Select>
            </div>
            <div><Label>Bank Account</Label>
              <Select {...register("bankAccountId")}>
                <option value="">— None —</option>
                {banks.map((b) => <option key={b.id} value={b.id}>{b.name}{b.isPrimary ? " (Primary)" : ""}</option>)}
              </Select>
            </div>
            <div><Label>Card Name</Label><Input {...register("cardName")} /></div>
            <div><Label>Card Type</Label><Input {...register("cardType")} /></div>
            <div><Label>Card Number (12-19 digits)</Label><Input {...register("cardNumber")} placeholder="will be masked on save" /></div>
            <div><Label>Status</Label>
              <Select {...register("status")}><option value="PENDING">PENDING</option><option value="PARTIAL">PARTIAL</option><option value="CLEARED">CLEARED</option><option value="CANCELLED">CANCELLED</option></Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Amounts</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div><Label>Due Amount</Label><Input type="number" step="0.01" {...register("dueAmount", { valueAsNumber: true })} /></div>
            <div><Label>Paid Amount</Label><Input type="number" step="0.01" {...register("paidAmount", { valueAsNumber: true })} /></div>
            <div><Label>Swipe Amount</Label><Input type="number" step="0.01" {...register("swipeAmount", { valueAsNumber: true })} /></div>
            <div><Label>Swipe %</Label><Input type="number" step="0.01" {...register("swipePercentage", { valueAsNumber: true })} /></div>
            <div><Label>Payment Site</Label><Input {...register("paymentSite")} /></div>
            <div><Label>Swipe Site</Label><Input {...register("swipeSite")} /></div>
            <div><Label>Date</Label><Input type="date" defaultValue={today} {...register("date", { valueAsDate: true })} /></div>
            <div><Label>Swipe Date</Label><Input type="date" defaultValue={today} {...register("swipeDate", { valueAsDate: true })} /></div>
            <div className="md:col-span-2"><Label>Remarks</Label><Textarea {...register("remarks")} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Split Payments (optional)</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => append({ site: "", amount: 0, ref: "" })}><Plus className="h-4 w-4"/>Add</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {fields.map((f, i) => (
              <div key={f.id} className="grid gap-2 md:grid-cols-4 items-end">
                <div><Label>Site</Label><Input {...register(`splitPayments.${i}.site`)} /></div>
                <div><Label>Amount</Label><Input type="number" step="0.01" {...register(`splitPayments.${i}.amount`, { valueAsNumber: true })} /></div>
                <div><Label>Ref</Label><Input {...register(`splitPayments.${i}.ref`)} /></div>
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
              </div>
            ))}
            {fields.length === 0 && <p className="text-sm text-muted-foreground">No split payments.</p>}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Auto-Calc Preview</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Charges" value={formatINR(calc.charges)} />
            <Row label="Cleared" value={formatINR(calc.clearedAmount)} />
            <Row label="Pending" value={formatINR(calc.pendingAmount)} />
            <Row label="Extra Swiped" value={formatINR(calc.extraSwipedAmount)} />
            <Row label="Balance to Customer" value={formatINR(calc.balanceToCustomer)} accent />
            <Badge variant="outline" className="mt-2">Tracking only — server recomputes on save</Badge>
          </CardContent>
        </Card>
        <Button type="submit" disabled={submitting} className="w-full">{submitting ? "Saving..." : "Save Ledger Entry"}</Button>
        {Object.keys(errors).length > 0 && <p className="text-xs text-destructive">Fix validation errors above.</p>}
      </div>
    </form>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b last:border-0 py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={accent ? "font-bold text-emerald-600" : "font-medium"}>{value}</span>
    </div>
  );
}
