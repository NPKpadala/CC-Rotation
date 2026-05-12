// ADDED v1.3 — Site-wide footer (Powered by NPKpadala)
// Used on every page inside the (app) layout AND on /login.
// Matches the style provided in the v1.3 spec.

export function Footer() {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-2.5 border-t border-slate-200 px-6 py-4 text-xs">
      <span className="text-slate-400">© 2026 Sahsra CC Rotations</span>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3.5 py-1 text-slate-500">
        <span
          className="block h-1.5 w-1.5 flex-shrink-0 rounded-full"
          style={{ backgroundColor: "#1D9E75" }}
          aria-hidden
        />
        Powered by{" "}
        <strong className="font-medium text-slate-900">NPKpadala</strong>
      </span>
    </footer>
  );
}
