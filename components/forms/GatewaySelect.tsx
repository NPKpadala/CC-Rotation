"use client";

import { useState, useEffect } from "react";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { PAYMENT_GATEWAYS } from "@/lib/constants";

interface GatewaySelectProps {
  id?: string;
  name: string;
  required?: boolean;
  defaultValue?: string;
  label?: string;
  allowEmpty?: boolean;
}

/**
 * v1.4 (B2) — Payment / Swipe gateway select with "OTHER" → free-text fallback.
 *
 * When the user picks OTHER, an inline text input appears. The submitted value
 * is the typed name (≤ 40 chars). If empty, "OTHER" is submitted as-is.
 */
export function GatewaySelect({
  id,
  name,
  required,
  defaultValue,
  label,
  allowEmpty = false,
}: GatewaySelectProps) {
  // Resolve initial state: if defaultValue is a known enum, use it.
  // Otherwise treat it as a free-text "OTHER" value.
  const knownEnum = PAYMENT_GATEWAYS.includes(defaultValue as never);
  const [pickedKey, setPickedKey] = useState<string>(
    defaultValue && !knownEnum ? "OTHER" : defaultValue ?? (allowEmpty ? "" : "PAY1")
  );
  const [customText, setCustomText] = useState<string>(
    defaultValue && !knownEnum ? defaultValue : ""
  );

  // Final value that gets submitted via the hidden input
  const submittedValue =
    pickedKey === "OTHER" && customText.trim() ? customText.trim() : pickedKey;

  // Sync if parent changes the default
  useEffect(() => {
    if (defaultValue) {
      if (PAYMENT_GATEWAYS.includes(defaultValue as never)) {
        setPickedKey(defaultValue);
        setCustomText("");
      } else {
        setPickedKey("OTHER");
        setCustomText(defaultValue);
      }
    }
  }, [defaultValue]);

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-slate-700">
          {label}
        </label>
      )}
      {/* Hidden input carries the FINAL value to the server */}
      <input type="hidden" name={name} value={submittedValue} />

      <Select
        id={id}
        required={required}
        value={pickedKey}
        onChange={(e) => setPickedKey(e.target.value)}
      >
        {allowEmpty && <option value="">—</option>}
        {PAYMENT_GATEWAYS.map((g) => (
          <option key={g} value={g}>
            {g.replace(/_/g, " ")}
          </option>
        ))}
      </Select>

      {pickedKey === "OTHER" && (
        <Input
          placeholder="Type gateway name…"
          maxLength={40}
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          className="mt-1"
        />
      )}
    </div>
  );
}
