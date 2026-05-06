import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatINR, maskPan } from "@/lib/utils";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function ProfileDetail({ params }: { params: { id: string } }) {
  const profile = await prisma.profile.findUnique({
    where: { id: params.id },
    include: { transactions: { orderBy: { date: "desc" }, take: 50 } },
  });
  if (!profile) notFound();
  const cards = (profile.cardDetails as any[]) || [];
  const bank = profile.bankDetails as any;
  const totals = profile.transactions.reduce((acc, t) => ({
    pending: acc.pending + t.pendingAmount,
    charges: acc.charges + t.charges,
    balance: acc.balance + t.balanceToCustomer,
  }), { pending: 0, charges: 0, balance: 0 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{profile.fullName}</h1>
          <p className="text-sm text-muted-foreground">{profile.mobile} · PAN {maskPan(profile.pan)}</p>
        </div>
        <Link href={`/transactions/new?profileId=${profile.id}`}><Button>+ New Ledger Entry</Button></Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle className="text-sm">Total Pending</CardTitle></CardHeader><CardContent className="text-xl font-bold">{formatINR(totals.pending)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Charges</CardTitle></CardHeader><CardContent className="text-xl font-bold">{formatINR(totals.charges)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Balance to Customer</CardTitle></CardHeader><CardContent className="text-xl font-bold">{formatINR(totals.balance)}</CardContent></Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Cards</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {cards.map((c, i) => (
              <div key={i} className="flex items-center justify-between border rounded p-2 text-sm">
                <div><div className="font-medium">{c.cardName}</div><div className="text-muted-foreground">{c.cardType} · exp {c.expiry}</div></div>
                <div className="font-mono">**** {String(c.cardNumber || "").slice(-4)}</div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Bank Details</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div><span className="text-muted-foreground">Bank: </span>{bank?.bankName}</div>
            <div><span className="text-muted-foreground">A/C: </span>****{String(bank?.accountNumber || "").slice(-4)}</div>
            <div><span className="text-muted-foreground">IFSC: </span>{bank?.ifsc}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Transaction Log</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead><TR><TH>Date</TH><TH>Card</TH><TH>Due</TH><TH>Swipe</TH><TH>Charges</TH><TH>Cleared</TH><TH>Pending</TH><TH>Status</TH></TR></THead>
            <TBody>
              {profile.transactions.map((t) => (
                <TR key={t.id}>
                  <TD>{format(t.date, "dd MMM")}</TD>
                  <TD className="font-mono text-xs">{t.cardNumber}</TD>
                  <TD>{formatINR(t.dueAmount)}</TD>
                  <TD>{formatINR(t.swipeAmount)}</TD>
                  <TD>{formatINR(t.charges)}</TD>
                  <TD>{formatINR(t.clearedAmount)}</TD>
                  <TD>{formatINR(t.pendingAmount)}</TD>
                  <TD><Badge variant={t.status === "CLEARED" ? "success" : t.status === "PENDING" ? "warning" : "secondary"}>{t.status}</Badge></TD>
                </TR>
              ))}
              {profile.transactions.length === 0 && <TR><TD colSpan={8} className="text-center text-muted-foreground">No entries yet</TD></TR>}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
