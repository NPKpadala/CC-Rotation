"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * v1.4 (C1) — Global keyboard shortcuts.
 *   Ctrl/Cmd + K  → open command palette
 *   Ctrl/Cmd + N  → new transaction chooser
 *   Ctrl/Cmd + Enter → submit currently focused form
 *   Esc → close dialog (handled by Radix itself; no-op here)
 *
 * Mounted in app/(app)/layout.tsx via <GlobalShortcuts /> component.
 */
export function useGlobalShortcuts({
  onOpenPalette,
}: {
  onOpenPalette: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const cmd = isMac ? e.metaKey : e.ctrlKey;
      if (!cmd) return;

      const target = e.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      // Ctrl+K — palette
      if (e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenPalette();
        return;
      }

      // Ctrl+N — new transaction chooser
      if (e.key.toLowerCase() === "n" && !isTyping) {
        e.preventDefault();
        router.push("/transactions/new");
        return;
      }

      // Ctrl+Enter — submit current form
      if (e.key === "Enter") {
        const form = target?.closest("form") as HTMLFormElement | null;
        if (form) {
          e.preventDefault();
          form.requestSubmit();
        }
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpenPalette, router]);
}
