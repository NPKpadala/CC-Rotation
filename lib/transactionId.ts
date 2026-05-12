import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Generate a human-readable transaction ID in the format CC-YYYYMMDD-NNNN.
 *
 * Uses the DailyCounter table with a SELECT FOR UPDATE-style atomic increment
 * to guarantee no duplicates under concurrent inserts.
 *
 * Usage from a server action:
 *
 *   await prisma.$transaction(async (tx) => {
 *     const transactionId = await generateTransactionId(tx);
 *     await tx.transaction.create({ data: { transactionId, ... } });
 *   }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
 *
 * @param tx Prisma transaction client (REQUIRED — never call this outside a tx)
 * @param date Defaults to today; pass a specific date for backfill or testing
 */
export async function generateTransactionId(
  tx: Prisma.TransactionClient,
  date: Date = new Date()
): Promise<string> {
  // YYYYMMDD format
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const dateKey = `${y}${m}${d}`;

  // Upsert the counter row atomically. PostgreSQL's INSERT ... ON CONFLICT
  // with RETURNING gives us the new sequence number race-safely.
  // Prisma's `upsert` translates to this under PostgreSQL.
  const counter = await tx.dailyCounter.upsert({
    where: { date: dateKey },
    create: { date: dateKey, lastSeq: 1 },
    update: { lastSeq: { increment: 1 } },
  });

  const seq = String(counter.lastSeq).padStart(4, "0");
  return `CC-${dateKey}-${seq}`;
}

/**
 * Parse a transaction ID back into its components.
 * Returns null if the format doesn't match.
 */
export function parseTransactionId(
  txId: string
): { dateKey: string; date: Date; seq: number } | null {
  const match = txId.match(/^CC-(\d{8})-(\d{4})$/);
  if (!match) return null;
  const dateKey = match[1];
  const y = Number(dateKey.slice(0, 4));
  const m = Number(dateKey.slice(4, 6)) - 1;
  const d = Number(dateKey.slice(6, 8));
  return {
    dateKey,
    date: new Date(y, m, d),
    seq: Number(match[2]),
  };
}

// Reduce import surface — re-export prisma here as well for convenience
export { prisma };
