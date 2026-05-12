import Link from "next/link";
import { Plus, Search, Phone, CreditCard as CardIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  formatDate,
  parseIntSafe,
  buildPagination,
  formatCurrency,
  decimalToNumber,
  highlightMatches,
} from "@/lib/utils";
import { PAGE_SIZE } from "@/lib/constants";
import { formatCardNumberDisplay } from "@/lib/calc-shared";

export const dynamic = "force-dynamic";

type SearchType = "general" | "card_last4" | "card_full";

export default async function ProfilesPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string; t?: string };
}) {
  const q = searchParams.q?.trim() ?? "";
  const searchType: SearchType =
    searchParams.t === "card_last4" || searchParams.t === "card_full" ? searchParams.t : "general";
  const page = parseIntSafe(searchParams.page, 1);
  const skip = (page - 1) * PAGE_SIZE;

  // Build the WHERE clause based on search type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let where: any = {};
  let cleanQuery = q;
  let matchSummary = "";

  if (q && searchType === "card_last4") {
    cleanQuery = q.replace(/\D/g, "").slice(-4);
    if (cleanQuery.length === 4) {
      where = { cards: { some: { cardNumberLast4: cleanQuery } } };
      matchSummary = `Card ending ${cleanQuery}`;
    } else {
      where = { id: "__no_match__" }; // intentionally empty
      matchSummary = `Need exactly 4 digits — got ${cleanQuery.length}`;
    }
  } else if (q && searchType === "card_full") {
    cleanQuery = q.replace(/\D/g, "");
    if (cleanQuery.length >= 8) {
      where = { cards: { some: { cardNumberFull: cleanQuery } } };
      matchSummary = `Card ${formatCardNumberDisplay(cleanQuery)}`;
    } else {
      where = { id: "__no_match__" };
      matchSummary = `Need at least 8 digits`;
    }
  } else if (q) {
    where = {
      OR: [
        { name: { contains: q, mode: "insensitive" as const } },
        { mobile: { contains: q } },
        { email: { contains: q, mode: "insensitive" as const } },
      ],
    };
  }

  const [profiles, total] = await Promise.all([
    prisma.profile.findMany({
      where,
      skip,
      take: PAGE_SIZE,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { cards: true, transactions: true } },
        cards: {
          select: { id: true, bankName: true, cardNumberLast4: true, cardNumberFull: true, cardNetwork: true },
        },
        transactions: {
          where: { type: "BILL_PAYMENT", status: "PENDING" },
          select: { afterClearPending: true },
        },
      },
    }),
    prisma.profile.count({ where }),
  ]);

  const pagination = buildPagination(page, PAGE_SIZE, total);

  function renderHighlighted(text: string | null | undefined, query: string) {
    const segments = highlightMatches(text, query);
    return segments.map((seg, i) =>
      seg.match ? (
        <mark key={i} className="rounded bg-yellow-200 px-0.5 text-slate-900">
          {seg.text}
        </mark>
      ) : (
        <span key={i}>{seg.text}</span>
      )
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Profiles</h1>
          <p className="text-sm text-slate-500">{total.toLocaleString("en-IN")} customers</p>
        </div>
        <Button asChild>
          <Link href="/profiles/create">
            <Plus className="h-4 w-4" /> New Profile
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <form className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  name="q"
                  defaultValue={q}
                  placeholder={
                    searchType === "card_last4"
                      ? "Last 4 digits (e.g. 8010)"
                      : searchType === "card_full"
                      ? "Full card number (14–16 digits)"
                      : "Name, mobile, or email…"
                  }
                  className="pl-10"
                />
              </div>
              <Button type="submit" variant="outline">Search</Button>
            </div>

            {/* ADDED v1.3 — Search type toggle */}
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-500">Search by:</span>
              <SearchTypeToggle current={searchType} value="general" label="Name / Mobile / Email" q={q} />
              <SearchTypeToggle current={searchType} value="card_last4" label="Card Last 4" q={q} />
              <SearchTypeToggle current={searchType} value="card_full" label="Card Full Number" q={q} />
            </div>

            {q && matchSummary && (
              <p className="text-xs text-slate-500">
                Searching for: <strong className="text-slate-700">{matchSummary}</strong>
              </p>
            )}
          </form>
        </CardHeader>
        <CardContent className="p-0">
          {profiles.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm text-slate-500">No profiles found.</p>
              {q && (
                <p className="mt-1 text-xs text-slate-400">
                  Try a different search type above.
                </p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Cards</TableHead>
                  <TableHead>Transactions</TableHead>
                  <TableHead>Pending</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((p) => {
                  const pending = p.transactions.reduce(
                    (s, t) => s + decimalToNumber(t.afterClearPending),
                    0
                  );
                  // Determine matched card to show
                  const matchedCard =
                    searchType === "card_last4"
                      ? p.cards.find((c) => c.cardNumberLast4 === cleanQuery)
                      : searchType === "card_full"
                      ? p.cards.find((c) => c.cardNumberFull === cleanQuery)
                      : null;

                  // Build "matched" badge
                  const matchedBadge =
                    searchType === "general" && q
                      ? p.mobile.includes(q)
                        ? "Mobile"
                        : p.name.toLowerCase().includes(q.toLowerCase())
                        ? "Name"
                        : p.email?.toLowerCase().includes(q.toLowerCase())
                        ? "Email"
                        : null
                      : matchedCard
                      ? `Card ••${matchedCard.cardNumberLast4}`
                      : null;

                  return (
                    <TableRow key={p.id} className="cursor-pointer">
                      <TableCell>
                        <Link href={`/profiles/${p.id}`} className="block">
                          <div className="font-medium text-slate-900">
                            {searchType === "general" ? renderHighlighted(p.name, q) : p.name}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Phone className="h-3 w-3" />{" "}
                            {searchType === "general" ? renderHighlighted(p.mobile, q) : p.mobile}
                          </div>
                          {matchedCard && (
                            <div className="mt-1 inline-flex items-center gap-1 text-xs text-primary-700">
                              <CardIcon className="h-3 w-3" />{" "}
                              <span className="font-mono">
                                {matchedCard.bankName} {matchedCard.cardNetwork}{" "}
                                {matchedCard.cardNumberFull
                                  ? formatCardNumberDisplay(matchedCard.cardNumberFull)
                                  : `••••${matchedCard.cardNumberLast4}`}
                              </span>
                            </div>
                          )}
                          {matchedBadge && (
                            <Badge variant="outline" className="mt-1 text-[10px]">
                              Matched: {matchedBadge}
                            </Badge>
                          )}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          <CardIcon className="mr-1 h-3 w-3" /> {p._count.cards}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{p._count.transactions}</TableCell>
                      <TableCell>
                        {pending > 0.01 ? (
                          <span className="font-mono text-orange-600">{formatCurrency(pending)}</span>
                        ) : (
                          <Badge variant="success">Clear</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{formatDate(p.createdAt)}</TableCell>
                      <TableCell>
                        <Link
                          href={`/profiles/${p.id}`}
                          className="text-sm font-medium text-primary-600 hover:text-primary-700"
                        >
                          View →
                        </Link>
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
            Page {pagination.page} of {pagination.totalPages} · {total} total
          </p>
          <div className="flex gap-2">
            {pagination.hasPrev && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/profiles?q=${encodeURIComponent(q)}&t=${searchType}&page=${page - 1}`}>← Prev</Link>
              </Button>
            )}
            {pagination.hasNext && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/profiles?q=${encodeURIComponent(q)}&t=${searchType}&page=${page + 1}`}>Next →</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SearchTypeToggle({
  current,
  value,
  label,
  q,
}: {
  current: string;
  value: string;
  label: string;
  q: string;
}) {
  const isActive = current === value;
  const href = `/profiles?q=${encodeURIComponent(q)}&t=${value}`;
  return (
    <Link
      href={href}
      className={
        "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors " +
        (isActive
          ? "border-primary-300 bg-primary-50 text-primary-700"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300")
      }
    >
      {label}
    </Link>
  );
}
