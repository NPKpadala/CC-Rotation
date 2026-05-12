"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";

/**
 * v1.4 (C2) — Auto-save form drafts to localStorage every 5s (debounced).
 *
 * Usage:
 *   const { clearDraft } = useAutoSaveDraft({
 *     formId: "bill-payment-new",
 *     userId: session.user.id,
 *     data: { paidRaw, percentage, ... },
 *     onRestore: (saved) => {
 *       setPaidRaw(saved.paidRaw);
 *       // etc.
 *     }
 *   });
 *
 * Call `clearDraft()` on successful form submission.
 */
export function useAutoSaveDraft<T extends Record<string, unknown>>({
  formId,
  userId,
  data,
  onRestore,
  enabled = true,
}: {
  formId: string;
  userId: string;
  data: T;
  onRestore: (saved: T) => void;
  enabled?: boolean;
}) {
  const key = `draft:${formId}:${userId}`;
  const restorePromptedRef = useRef(false);

  // Prompt to restore on mount
  useEffect(() => {
    if (!enabled || restorePromptedRef.current) return;
    restorePromptedRef.current = true;

    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { savedAt: number; data: T };
      const ageMs = Date.now() - parsed.savedAt;
      const TWENTY_FOUR_H = 24 * 60 * 60 * 1000;
      if (ageMs > TWENTY_FOUR_H) {
        localStorage.removeItem(key);
        return;
      }

      // Format relative time
      const minutes = Math.floor(ageMs / 60000);
      const hours = Math.floor(minutes / 60);
      const rel =
        minutes < 1
          ? "just now"
          : hours < 1
          ? `${minutes} min ago`
          : `${hours}h ago`;

      toast.message(`Unsaved draft from ${rel}`, {
        description: "Restore your previous entries?",
        duration: 12000,
        action: {
          label: "Restore",
          onClick: () => onRestore(parsed.data),
        },
        cancel: {
          label: "Discard",
          onClick: () => localStorage.removeItem(key),
        },
      });
    } catch {
      // Ignore corrupt drafts
      localStorage.removeItem(key);
    }
  }, [key, onRestore, enabled]);

  // Debounced auto-save every 5s
  useEffect(() => {
    if (!enabled) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(
          key,
          JSON.stringify({ savedAt: Date.now(), data })
        );
      } catch {
        // localStorage quota or disabled — silent
      }
    }, 5000);
    return () => clearTimeout(t);
  }, [key, data, enabled]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }, [key]);

  return { clearDraft };
}
