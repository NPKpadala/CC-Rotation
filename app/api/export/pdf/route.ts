import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { exportPendingToPDF } from "@/lib/exporters/pdf";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const buffer = await exportPendingToPDF();
    const body = new Uint8Array(buffer);

    await prisma.auditLog.create({
      data: {
        action: "EXPORT",
        entityType: "Report",
        entityId: "pending",
        description: "Exported pending customers to PDF",
        performedById: session.user.id,
      },
    });

    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="pending-customers-${date}.pdf"`,
      },
    });
  } catch (err) {
    console.error("PDF export failed:", err);
    return new NextResponse("Export failed", { status: 500 });
  }
}
