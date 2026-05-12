import { CardTile } from "./CardTile";
import { decimalToNumber } from "@/lib/utils";

interface CardGridProps {
  cards: Array<{
    id: string;
    bankName: string;
    cardNumberLast4: string;
    cardNumberFull?: string | null;
    cardNetwork: string;
    holderName: string;
    defaultPercentage: number | string;
    cardExpireMonth: number;
    cardExpireYear: number;
    status: string;
    isPrimary?: boolean;
    swipeAttemptCount?: number;
  }>;
  transactions: Array<{
    cardId: string | null;
    afterClearPending: number | string | unknown;
    status: string;
  }>;
}

export function CardGrid({ cards, transactions }: CardGridProps) {
  // Aggregate per-card stats
  const stats = new Map<string, { pending: number; count: number }>();
  for (const t of transactions) {
    if (!t.cardId) continue;
    const cur = stats.get(t.cardId) ?? { pending: 0, count: 0 };
    cur.count += 1;
    if (t.status === "PENDING") cur.pending += decimalToNumber(t.afterClearPending);
    stats.set(t.cardId, cur);
  }

  if (cards.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
        <p className="text-sm text-slate-500">No cards yet for this customer.</p>
        <p className="mt-1 text-xs text-slate-400">Click "Add Card" above to add their first card.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((c) => {
        const s = stats.get(c.id) ?? { pending: 0, count: 0 };
        return (
          <CardTile
            key={c.id}
            card={c}
            pendingAmount={s.pending}
            transactionCount={s.count}
          />
        );
      })}
    </div>
  );
}
