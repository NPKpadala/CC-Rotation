import Link from "next/link";
import { Search, Receipt, Edit2, Lock } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { BillPaymentForm } from "@/components/forms/BillPaymentForm";
import { formatCurrency, formatDate, decimalToNumber, parseIntSafe, buildPagination } from "@/lib/utils";
import { PAGE_SIZE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function BillPaymentsPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string; profileId?: string };
}) {
  const session = await auth();
  const userRole = session?.user?.role ?? "EMPLOYEE";

  const q = searchParams.q?.trim() ?? "";
  const page = parseIntSafe(searchParams.page, 1);
  const skip = (page - 1) * PAGE_SIZE;

  const where = {
    type: "BILL_PAYMENT" as const, deletedAt: null, // v1.4 D1 soft-delete filter
    ...(q
      ? {
          OR: [
            { customerName: { contains: q, mode: "insensitive" as const } },
            { customerMobile: { contains: q } },
          ],
        }
      : {}),
  };

  const [profiles, allCards, txs, total, settings] = await Promise.all([
    prisma.profile.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, mobile: true },
      take: 500,
    }),
    prisma.card.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      select: { id: true, bankName: true, cardNumberLast4: true, cardNetwork: true, defaultPercentage: true, profileId: true },
      take: 1000,
    }),
    prisma.transaction.findMany({
      where,
      skip,
      take: PAGE_SIZE,
      orderBy: { transactionDate: "desc" },
      include: {
        card: { select: { bankName: true, cardNumberLast4: true } },
        profile: { select: { name: true } },
      },
    }),
    prisma.transaction.count({ where }),
    prisma.systemSetting.findMany({
      where: { key: { in: ["whatsapp_message_template", "company_name"] } },
    }),
  ]);

  const pagination = buildPagination(page, PAGE_SIZE, total);
  const cardsForForm = allCards.map((c) => ({ ...c, defaultPercentage: Number(c.defaultPercentage) }));
  const companyName = settings.find((s) => s.key === "company_name")?.value ?? "Sahsra CC Rotations";
  const whatsappTemplate = settings.find((s) => s.key === "whatsapp_message_template")?.value;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <Receipt className="h-6 w-6 text-primary-600" /> Bill Payments
        </h1>
        <p className="text-sm text-slate-500">{total.toLocaleString("en-IN")} total payments recorded</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Bill Payment</CardTitle>
        </CardHeader>
        <CardContent>
          <BillPaymentForm
            profiles={profiles}
            cards={cardsForForm}
            defaultProfileId={searchParams.profileId}
            companyName={companyName}
            whatsappTemplate={whatsappTemplate}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>All Payments</CardTitle>
          <form className="flex w-full max-w-sm gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input name="q" defaultValue={q} placeholder="Search customer..." className="pl-10" />
            </div>
            <Button type="submit" variant="outline" size="sm">Go</Button>
          </form>
        </CardHeader>
        <CardContent className="p-0">
          {txs.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">No payments found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Txn ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Card</TableHead>
                  <TableHead>Gateway</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  {/* ADDED v1.2 — Charges Amount column */}
                  <TableHead className="text-right">Charges</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txs.map((t) => {
                  const isLocked = t.status === "CLEARED" && userRole !== "ADMIN";
                  const totalAmount = decimalToNumber(t.paidAmount) + decimalToNumber(t.charges);
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="whitespace-nowrap font-mono text-[10px] text-primary-700">
                        {t.transactionId ?? t.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{formatDate(t.transactionDate)}</TableCell>
                      <TableCell>
                        <Link href={`/profiles/${t.profileId}`} className="text-sm font-medium text-slate-900 hover:text-primary-600">
                          {t.customerName}
                        </Link>
                        <div className="text-xs text-slate-500">{t.customerMobile}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {t.card ? <span className="font-mono">{t.card.bankName} ••{t.card.cardNumberLast4}</span> : "—"}
                      </TableCell>
                      <TableCell className="text-xs">{t.paymentGateway ?? "—"}</TableCell>
                      <TableCell className="whitespace-nowrap text-right font-mono tabular-nums">{formatCurrency(decimalToNumber(t.paidAmount))}</TableCell>
                      <TableCell className="whitespace-nowrap text-right font-mono tabular-nums text-primary-600">{formatCurrency(decimalToNumber(t.charges))}</TableCell>
                      <TableCell className="whitespace-nowrap text-right font-mono tabular-nums font-semibold">{formatCurrency(totalAmount)}</TableCell>
                      <TableCell className="whitespace-nowrap text-right font-mono tabular-nums">{formatCurrency(decimalToNumber(t.afterClearPending))}</TableCell>
                      <TableCell>
                        <Badge variant={t.status === "CLEARED" ? "success" : "warning"}>{t.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {/* v1.4: Receipt slip link */}
                          <Link
                            href={`/transactions/${t.id}/slip`}
                            title="Receipt slip"
                            className="text-xs text-slate-500 hover:text-primary-600"
                          >
                            📄
                          </Link>
                          {/* ADDED v1.2 — Edit/Lock action per RBAC */}
                          {isLocked ? (
                            <span title="Locked — admin only" className="inline-flex items-center gap-1 text-xs text-slate-400">
                              <Lock className="h-3 w-3" />
                            </span>
                          ) : (
                            <Link
                              href={`/transactions/payments/${t.id}/edit`}
                              className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
                            >
                              <Edit2 className="h-3 w-3" /> Edit
                            </Link>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            {pagination.hasPrev && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/transactions/payments?q=${encodeURIComponent(q)}&page=${page - 1}`}>← Prev</Link>
              </Button>
            )}
            {pagination.hasNext && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/transactions/payments?q=${encodeURIComponent(q)}&page=${page + 1}`}>Next →</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
