import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { exportPendingToExcel } from "@/lib/exporters/excel";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const buffer = await exportPendingToExcel();
    const body = new Uint8Array(buffer);

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: "EXPORT",
        entityType: "Report",
        entityId: "pending",
        description: "Exported pending customers to Excel",
        performedById: session.user.id,
      },
    });

    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="pending-customers-${date}.xlsx"`,
      },
    });
  } catch (err) {
    console.error("Excel export failed:", err);
    return new NextResponse("Export failed", { status: 500 });
  }
}
