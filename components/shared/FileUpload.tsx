"use client";

import { useState, useRef } from "react";
import { Upload, Loader2, Check, X, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FileUploadProps {
  name: string;
  label: string;
  accept?: string;
  onUploaded?: (url: string) => void;
  /** ADDED v1.3 — Initial URL for edit flow. New upload silently overwrites. */
  currentUrl?: string;
}

function filenameOf(url: string): string {
  try {
    const parts = url.split("/");
    return parts[parts.length - 1] ?? url;
  } catch {
    return url;
  }
}

export function FileUpload({
  name,
  label,
  accept = "image/*,application/pdf",
  onUploaded,
  currentUrl,
}: FileUploadProps) {
  const [url, setUrl] = useState<string | null>(currentUrl ?? null);
  const [isExisting, setIsExisting] = useState<boolean>(!!currentUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      if (!json.url) throw new Error("No URL returned");
      setUrl(json.url);
      setIsExisting(false);
      onUploaded?.(json.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function clear() {
    setUrl(null);
    setIsExisting(false);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function changeFile() {
    if (inputRef.current) inputRef.current.click();
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-slate-700">{label}</label>
      <input type="hidden" name={name} value={url ?? ""} />

      {/* Always-mounted file input so "Change" can trigger it */}
      <Input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={onChange}
        disabled={uploading}
        className={url ? "hidden" : "block"}
      />

      {url && (
        <div
          className={
            "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm " +
            (isExisting
              ? "border-slate-200 bg-slate-50"
              : "border-green-200 bg-green-50")
          }
        >
          {isExisting ? (
            <span title="Existing file">📎</span>
          ) : (
            <Check className="h-4 w-4 text-green-600" />
          )}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center gap-1 truncate hover:underline"
          >
            <span className={"truncate " + (isExisting ? "text-slate-700" : "text-green-700")}>
              {filenameOf(url)}
            </span>
            <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-60" />
          </a>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={changeFile}
            disabled={uploading}
            title="Replace this file (new upload silently overwrites)"
          >
            <RefreshCw className="h-3 w-3" /> Change
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={clear} disabled={uploading}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {uploading && (
        <p className="inline-flex items-center gap-1.5 text-xs text-slate-500">
          <Loader2 className="h-3 w-3 animate-spin" /> Uploading…
        </p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
