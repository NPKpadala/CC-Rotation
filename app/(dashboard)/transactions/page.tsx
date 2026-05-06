import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatINR } from "@/lib/utils";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function TransactionsPage({ searchParams }: { searchParams: { from?: string; to?: string; profileId?: string; page?: string } }) {
  const page = Math.max(1, parseInt(searchParams.page || "1", 10));
  const take = 20;
  const skip = (page - 1) * take;
  const where: any = {};
  if (searchParams.from || searchParams.to) {
    where.date = {};
    if (searchParams.from) where.date.gte = new Date(searchParams.from);
    if (searchParams.to) where.date.lte = new Date(searchParams.to + "T23:59:59");
  }
  if (searchParams.profileId) where.profileId = searchParams.profileId;
  const [items, total] = await Promise.all([
    prisma.transaction.findMany({ where, orderBy: { date: "desc" }, skip, take, include: { profile: { select: { fullName: true } } } }),
    prisma.transaction.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / take));
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transaction Log</h1>
        <Link href="/transactions/new"><Button>+ New Entry</Button></Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <form className="grid gap-2 md:grid-cols-4 mt-2">
            <Input type="date" name="from" defaultValue={searchParams.from} />
            <Input type="date" name="to" defaultValue={searchParams.to} />
            <Input name="profileId" defaultValue={searchParams.profileId} placeholder="Profile ID (optional)" />
            <Button type="submit">Apply</Button>
          </form>
        </CardHeader>
        <CardContent>
          <Table>
            <THead><TR><TH>Date</TH><TH>Profile</TH><TH>Card</TH><TH>Due</TH><TH>Paid</TH><TH>Swipe</TH><TH>Charges</TH><TH>Pending</TH><TH>Status</TH></TR></THead>
            <TBody>
              {items.map((t) => (
                <TR key={t.id}>
                  <TD>{format(t.date, "dd MMM yyyy")}</TD>
                  <TD>{t.profile.fullName}</TD>
                  <TD className="font-mono text-xs">{t.cardNumber}</TD>
                  <TD>{formatINR(t.dueAmount)}</TD>
                  <TD>{formatINR(t.paidAmount)}</TD>
                  <TD>{formatINR(t.swipeAmount)}</TD>
                  <TD>{formatINR(t.charges)}</TD>
                  <TD>{formatINR(t.pendingAmount)}</TD>
                  <TD><Badge variant={t.status === "CLEARED" ? "success" : t.status === "PENDING" ? "warning" : "secondary"}>{t.status}</Badge></TD>
                </TR>
              ))}
              {items.length === 0 && <TR><TD colSpan={9} className="text-center text-muted-foreground">No transactions</TD></TR>}
            </TBody>
          </Table>
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>{total} entries · Page {page} / {totalPages}</span>
            <div className="flex gap-2">
              {page > 1 && <Button asChild variant="outline" size="sm"><Link href={`/transactions?page=${page-1}`}>Prev</Link></Button>}
              {page < totalPages && <Button asChild variant="outline" size="sm"><Link href={`/transactions?page=${page+1}`}>Next</Link></Button>}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
