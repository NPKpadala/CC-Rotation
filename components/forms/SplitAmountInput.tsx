"use client";

import { useMemo } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { calculateSplitTotal } from "@/lib/calc-shared";
import { formatCurrency } from "@/lib/utils";

interface SplitAmountInputProps {
  id?: string;
  name: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
}

/**
 * v1.4 (B1) — Split amount input.
 *
 * Lets the user type a "+"-separated amount like "500+7000+2500".
 * Includes a "+" button that appends "+0" to the current value to indicate
 * a new split (or "0" if the field is empty).
 *
 * Per user instruction: NO remove chips. Splits stay once typed.
 * Below the input we render the parsed parts as static (non-removable) chips
 * for visual reference + the live total.
 */
export function SplitAmountInput({
  id,
  name,
  required,
  value,
  onChange,
  placeholder = "500+7000+2500",
  label,
}: SplitAmountInputProps) {
  const total = useMemo(() => calculateSplitTotal(value), [value]);
  const parts = useMemo(
    () =>
      value
        .split("+")
        .map((p) => p.trim())
        .filter((p) => p !== ""),
    [value]
  );

  function appendPlus() {
    if (!value || value.endsWith("+")) {
      onChange(value + "0");
    } else {
      onChange(value + "+0");
    }
  }

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-slate-700">
          {label}
        </label>
      )}
      <div className="flex gap-2">
        <Input
          id={id}
          name={name}
          required={required}
          pattern="\d+(\+\d+)*"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 font-mono"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={appendPlus}
          title="Add another split"
          className="shrink-0"
        >
          <Plus className="h-3.5 w-3.5" /> Split
        </Button>
      </div>

      {parts.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          {parts.map((p, i) => (
            <span
              key={i}
              className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-slate-700"
            >
              ₹{p}
            </span>
          ))}
          <span className="ml-1 text-slate-500">
            Total:{" "}
            <span className="font-mono font-semibold text-slate-900">
              {formatCurrency(total)}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
