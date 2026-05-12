import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Format number as Indian Rupees, e.g. 125000 → "₹1,25,000.00" */
export function formatCurrency(value: number | string | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || value === "") return "₹0.00";
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (!Number.isFinite(n)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

/** Format a plain number with thousands separators (no currency) */
export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "0";
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (!Number.isFinite(n)) return "0";
  return new Intl.NumberFormat("en-IN").format(n);
}

/** Mask a card so only last 4 digits are visible: "**** **** **** 1234" */
export function maskCard(last4: string | null | undefined): string {
  if (!last4) return "**** **** **** ****";
  return `**** **** **** ${last4}`;
}

/** Mask a mobile number: "98XXXX1234" */
export function maskMobile(mobile: string | null | undefined): string {
  if (!mobile || mobile.length < 6) return mobile ?? "";
  return mobile.slice(0, 2) + "X".repeat(mobile.length - 6) + mobile.slice(-4);
}

/** Get last 4 digits from a card number */
export function getLast4(cardNumber: string): string {
  return cardNumber.slice(-4);
}

/** Format a date as "07 May 2026" */
export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** Format a datetime as "07 May 2026, 14:32" */
export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/** Convert Prisma Decimal to number safely */
export function decimalToNumber(d: unknown): number {
  if (d === null || d === undefined) return 0;
  if (typeof d === "number") return d;
  if (typeof d === "string") return parseFloat(d) || 0;
  // Prisma Decimal exposes toNumber()
  if (typeof d === "object" && d !== null && "toNumber" in d && typeof (d as { toNumber: () => number }).toNumber === "function") {
    return (d as { toNumber: () => number }).toNumber();
  }
  return 0;
}

/** Build pagination metadata */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function buildPagination(page: number, pageSize: number, total: number): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/** Safe int parse for query params */
export function parseIntSafe(v: string | null | undefined, fallback: number): number {
  if (!v) return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// ─── ADDED v1.3: Search match highlighting ────────────────────────────────────
/**
 * Find all positions where `query` appears in `text` (case-insensitive) and return
 * an array of segments: each segment has {text, match} so the caller can render
 * <mark> tags around matches.
 *
 * Returns [{text, match: false}] if no match (single segment).
 */
export function highlightMatches(text: string | null | undefined, query: string | null | undefined): Array<{ text: string; match: boolean }> {
  const safe = text ?? "";
  if (!query || !safe) return [{ text: safe, match: false }];
  const q = query.trim();
  if (!q) return [{ text: safe, match: false }];

  const segments: Array<{ text: string; match: boolean }> = [];
  const lowerText = safe.toLowerCase();
  const lowerQuery = q.toLowerCase();

  let cursor = 0;
  while (cursor < safe.length) {
    const idx = lowerText.indexOf(lowerQuery, cursor);
    if (idx === -1) {
      segments.push({ text: safe.slice(cursor), match: false });
      break;
    }
    if (idx > cursor) {
      segments.push({ text: safe.slice(cursor, idx), match: false });
    }
    segments.push({ text: safe.slice(idx, idx + q.length), match: true });
    cursor = idx + q.length;
  }

  return segments;
}
