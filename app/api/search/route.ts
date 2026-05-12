import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

interface SearchResult {
  type: "profile" | "card" | "transaction";
  id: string;
  href: string;
  title: string;
  subtitle: string;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (!q) {
    return NextResponse.json({ results: [] });
  }

  const qClean = q.replace(/[^a-zA-Z0-9 ._@+/-]/g, "").slice(0, 60);
  if (!qClean) return NextResponse.json({ results: [] });

  const cleanDigits = qClean.replace(/\D/g, "");
  const results: SearchResult[] = [];

  // 1. Transaction by transactionId (CC-...) — exact match wins
  if (/^CC-/i.test(qClean) || cleanDigits.length >= 4) {
    const txs = await prisma.transaction.findMany({
      where: {
        AND: [
          { deletedAt: null },
          {
            OR: [
              { transactionId: { contains: qClean, mode: "insensitive" } },
              { customerName: { contains: qClean, mode: "insensitive" } },
              { customerMobile: { contains: cleanDigits || qClean } },
            ],
          },
        ],
      },
      take: 6,
      orderBy: { transactionDate: "desc" },
      select: {
        id: true,
        transactionId: true,
        type: true,
        customerName: true,
        customerMobile: true,
        paidAmount: true,
        transactionDate: true,
      },
    });
    for (const t of txs) {
      results.push({
        type: "transaction",
        id: t.id,
        href:
          t.type === "BILL_PAYMENT"
            ? `/transactions/payments/${t.id}/edit`
            : `/transactions/swiping`,
        title: `${t.transactionId ?? t.id.slice(0, 8)} — ${t.customerName}`,
        subtitle: `${t.type.replace("_", " ")} · ${t.customerMobile} · ${new Date(t.transactionDate).toLocaleDateString("en-IN")}`,
      });
    }
  }

  // 2. Profiles by name / mobile / aadhaar / pan
  const profiles = await prisma.profile.findMany({
    where: {
      OR: [
        { name: { contains: qClean, mode: "insensitive" } },
        ...(cleanDigits.length > 0
          ? [{ mobile: { contains: cleanDigits } }, { alternativeNumber: { contains: cleanDigits } }]
          : []),
        { aadhaarNumber: { contains: cleanDigits || qClean } },
        { panNumber: { contains: qClean.toUpperCase() } },
      ],
    },
    take: 6,
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, mobile: true },
  });
  for (const p of profiles) {
    results.push({
      type: "profile",
      id: p.id,
      href: `/profiles/${p.id}`,
      title: p.name,
      subtitle: p.mobile,
    });
  }

  // 3. Cards by last 4 / full / bank
  if (cleanDigits.length >= 4 || qClean.length >= 3) {
    const last4 = cleanDigits.slice(-4);
    const cards = await prisma.card.findMany({
      where: {
        OR: [
          ...(cleanDigits.length >= 4 ? [{ cardNumberLast4: last4 }] : []),
          ...(cleanDigits.length >= 8 ? [{ cardNumberFull: cleanDigits }] : []),
          { bankName: { contains: qClean, mode: "insensitive" as const } },
          { holderName: { contains: qClean, mode: "insensitive" as const } },
        ],
      },
      take: 6,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        bankName: true,
        cardNumberLast4: true,
        cardNumberFull: true,
        cardNetwork: true,
        holderName: true,
        profileId: true,
      },
    });
    for (const c of cards) {
      results.push({
        type: "card",
        id: c.id,
        href: `/cards/${c.id}`,
        title: `${c.bankName.replace(/_/g, " ")} ${c.cardNetwork} ••${c.cardNumberLast4}`,
        subtitle: c.holderName,
      });
    }
  }

  // Cap at 20 results total, transaction-first
  const ordered = [
    ...results.filter((r) => r.type === "transaction"),
    ...results.filter((r) => r.type === "profile"),
    ...results.filter((r) => r.type === "card"),
  ].slice(0, 20);

  return NextResponse.json({ results: ordered });
}
