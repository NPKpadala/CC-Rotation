"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  User as UserIcon,
  CreditCard as CardIcon,
  Receipt,
  Loader2,
  ArrowRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGlobalShortcuts } from "@/lib/hooks/useGlobalShortcuts";

interface SearchResult {
  type: "profile" | "card" | "transaction";
  id: string;
  href: string;
  title: string;
  subtitle: string;
}

/**
 * v1.4 (C3) — Command palette opened via Ctrl/Cmd + K.
 *
 * Calls /api/search?q=… which returns mixed results across profiles, cards, transactions.
 * Arrow keys navigate, Enter selects, Esc closes.
 */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useGlobalShortcuts({
    onOpenPalette: () => setOpen(true),
  });

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setHighlight(0);
      return;
    }
    // Focus when opened
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (!r.ok) {
          setResults([]);
          return;
        }
        const data = (await r.json()) as { results: SearchResult[] };
        setResults(data.results ?? []);
        setHighlight(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => clearTimeout(handle);
  }, [query, open]);

  const select = useCallback(
    (r: SearchResult) => {
      setOpen(false);
      router.push(r.href);
    },
    [router]
  );

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && results[highlight]) {
      e.preventDefault();
      select(results[highlight]);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Search</DialogTitle>

        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search profiles, cards, transactions by name, mobile, last 4, or txn ID…"
            className="flex-1 bg-transparent text-sm placeholder:text-slate-400 focus:outline-none"
          />
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
          <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-500">
            ESC
          </kbd>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {query.trim() === "" ? (
            <div className="p-6 text-center text-xs text-slate-400">
              Start typing to search…
              <br />
              <span className="mt-2 inline-block text-[10px] text-slate-300">
                Try a customer name, mobile, card last-4, or txn ID (CC-…)
              </span>
            </div>
          ) : results.length === 0 && !loading ? (
            <div className="p-6 text-center text-xs text-slate-400">No results</div>
          ) : (
            <ul className="py-1">
              {results.map((r, i) => (
                <li key={`${r.type}-${r.id}`}>
                  <button
                    type="button"
                    onClick={() => select(r)}
                    onMouseEnter={() => setHighlight(i)}
                    className={`flex w-full items-center gap-3 px-4 py-2 text-left transition-colors ${
                      i === highlight ? "bg-slate-100" : "hover:bg-slate-50"
                    }`}
                  >
                    <ResultIcon type={r.type} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-900">{r.title}</div>
                      <div className="truncate text-xs text-slate-500">{r.subtitle}</div>
                    </div>
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2 text-[10px] text-slate-500">
          <span>↑↓ navigate · Enter select · Esc close</span>
          <span>Ctrl+K to reopen</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ResultIcon({ type }: { type: SearchResult["type"] }) {
  if (type === "profile") return <UserIcon className="h-4 w-4 flex-shrink-0 text-blue-600" />;
  if (type === "card") return <CardIcon className="h-4 w-4 flex-shrink-0 text-purple-600" />;
  return <Receipt className="h-4 w-4 flex-shrink-0 text-green-600" />;
}
