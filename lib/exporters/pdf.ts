import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { prisma } from "@/lib/db";
import { decimalToNumber } from "@/lib/utils";

export async function exportPendingToPDF(): Promise<Buffer> {
  const txs = await prisma.transaction.findMany({
    where: { type: "BILL_PAYMENT", status: "PENDING" },
    orderBy: { afterClearPending: "desc" },
    include: {
      card: { select: { bankName: true, cardNumberLast4: true } },
    },
  });

  const total = txs.reduce((s, t) => s + decimalToNumber(t.afterClearPending), 0);

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  // Header
  doc.setFontSize(16);
  doc.setTextColor(220, 38, 38);
  doc.text("Sahsra CC Rotations — Pending Customers Report", 14, 15);

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 14, 22);
  doc.text(`Total Customers: ${txs.length}    Total Pending: ₹${total.toFixed(2)}`, 14, 27);

  // Table
  autoTable(doc, {
    startY: 32,
    head: [["Date", "Customer", "Mobile", "Card", "Paid", "Charges", "Pending", "Held By"]],
    body: txs.map((t) => [
      new Date(t.transactionDate).toLocaleDateString("en-IN"),
      t.customerName,
      t.customerMobile,
      t.card ? `${t.card.bankName} ••${t.card.cardNumberLast4}` : "—",
      decimalToNumber(t.paidAmount).toFixed(2),
      decimalToNumber(t.charges).toFixed(2),
      decimalToNumber(t.afterClearPending).toFixed(2),
      t.pendingHeldBy ?? "—",
    ]),
    headStyles: { fillColor: [220, 38, 38], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: {
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right" },
    },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `This is a ledger record. Not a banking document. — Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" }
    );
  }

  const arr = doc.output("arraybuffer");
  return Buffer.from(arr);
}
