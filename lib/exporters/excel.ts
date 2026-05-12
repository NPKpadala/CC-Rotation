import * as XLSX from "xlsx";
import { prisma } from "@/lib/db";
import { decimalToNumber } from "@/lib/utils";

export async function exportPendingToExcel(): Promise<Buffer> {
  const txs = await prisma.transaction.findMany({
    where: { type: "BILL_PAYMENT", status: "PENDING" },
    orderBy: { afterClearPending: "desc" },
    include: {
      card: { select: { bankName: true, cardNumberLast4: true, cardNetwork: true } },
    },
  });

  const total = txs.reduce((s, t) => s + decimalToNumber(t.afterClearPending), 0);
  const totalCharges = txs.reduce((s, t) => s + decimalToNumber(t.charges), 0);

  const summary = [
    ["Sahsra CC Rotations — Pending Customers Report"],
    ["Generated", new Date().toLocaleString("en-IN")],
    [],
    ["Total Pending Customers", txs.length],
    ["Total Pending Amount", total],
    ["Total Pending Charges", totalCharges],
  ];

  const customers = txs.map((t) => ({
    Date: new Date(t.transactionDate).toLocaleDateString("en-IN"),
    "Customer Name": t.customerName,
    Mobile: t.customerMobile,
    "Card Bank": t.card?.bankName ?? "—",
    "Card Network": t.card?.cardNetwork ?? "—",
    "Card Last 4": t.card?.cardNumberLast4 ?? "—",
    "Paid Amount": decimalToNumber(t.paidAmount),
    "Swipe Amount": decimalToNumber(t.swipeAmount),
    Percentage: decimalToNumber(t.percentage),
    Charges: decimalToNumber(t.charges),
    "Pending Amount": decimalToNumber(t.afterClearPending),
    "Held By": t.pendingHeldBy ?? "",
    Gateway: t.paymentGateway ?? "",
    Status: t.status,
  }));

  const byGateway: Record<string, { count: number; amount: number }> = {};
  for (const t of txs) {
    const k = t.paymentGateway ?? "Unknown";
    if (!byGateway[k]) byGateway[k] = { count: 0, amount: 0 };
    byGateway[k].count++;
    byGateway[k].amount += decimalToNumber(t.afterClearPending);
  }
  const byGatewayRows = Object.entries(byGateway).map(([gateway, v]) => ({
    Gateway: gateway,
    Count: v.count,
    "Total Pending": v.amount,
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Summary");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(customers), "Pending Customers");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(byGatewayRows), "Payment-wise");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
