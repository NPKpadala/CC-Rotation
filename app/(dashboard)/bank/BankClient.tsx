"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { bankSchema, type BankInput } from "@/lib/validations";
import { createBank, deleteBank, setPrimary } from "@/app/actions/banks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

export default function BankClient({ banks }: { banks: { id: string; name: string; accountNumber: string; ifsc: string; isPrimary: boolean }[] }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<BankInput>({ resolver: zodResolver(bankSchema), defaultValues: { isPrimary: false } });

  async function onSubmit(d: BankInput) {
    setSubmitting(true);
    try { await createBank(d); toast.success("Bank added"); reset(); router.refresh(); }
    catch (e: any) { toast.error(e?.message || "Failed"); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card>
        <CardHeader><CardTitle>Add Bank</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
            <div><Label>Name</Label><Input {...register("name")} />{errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}</div>
            <div><Label>Account Number</Label><Input {...register("accountNumber")} /></div>
            <div><Label>IFSC</Label><Input {...register("ifsc")} className="uppercase" /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register("isPrimary")} /> Set as primary</label>
            <Button type="submit" disabled={submitting} className="w-full">Add Bank</Button>
          </form>
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle>Accounts</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead><TR><TH>Name</TH><TH>Account</TH><TH>IFSC</TH><TH>Primary</TH><TH></TH></TR></THead>
            <TBody>
              {banks.map((b) => (
                <TR key={b.id}>
                  <TD className="font-medium">{b.name}</TD>
                  <TD className="font-mono">****{b.accountNumber.slice(-4)}</TD>
                  <TD>{b.ifsc}</TD>
                  <TD>{b.isPrimary ? <Badge variant="success">PRIMARY</Badge> : "—"}</TD>
                  <TD className="space-x-2">
                    {!b.isPrimary && <Button size="sm" variant="outline" onClick={async () => { await setPrimary(b.id); router.refresh(); }}>Set Primary</Button>}
                    <Button size="sm" variant="destructive" onClick={async () => { if (confirm("Delete bank?")) { await deleteBank(b.id); router.refresh(); } }}>Delete</Button>
                  </TD>
                </TR>
              ))}
              {banks.length === 0 && <TR><TD colSpan={5} className="text-center text-muted-foreground">No banks</TD></TR>}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
