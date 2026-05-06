import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n || 0);
}

export function maskCard(num: string) {
  const digits = (num || "").replace(/\D/g, "");
  if (digits.length < 4) return "****";
  return "**** **** **** " + digits.slice(-4);
}

export function maskPan(pan: string) {
  if (!pan || pan.length < 4) return "****";
  return pan.slice(0, 2) + "******" + pan.slice(-2);
}

export function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
