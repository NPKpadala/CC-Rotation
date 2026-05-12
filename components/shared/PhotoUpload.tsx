"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, X, FileText, ExternalLink, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { compressImage, formatBytes } from "@/lib/image-compress";
import { cn } from "@/lib/utils";

interface PhotoUploadProps {
  /** Hidden form field name — gets the uploaded URL */
  name: string;
  /** Visible label shown above */
  label: string;
  /** Initial URL (for edit flow) */
  defaultUrl?: string;
  /** Optional callback after successful upload */
  onUploaded?: (url: string) => void;
  /** Make the camera button visible? Default true on all devices. */
  showCamera?: boolean;
  /** Force document mode (PDFs allowed, no compression) */
  documentMode?: boolean;
  /** Compression target: lighter for documents, higher quality for selfies */
  quality?: number;
  className?: string;
}

export function PhotoUpload({
  name,
  label,
  defaultUrl,
  onUploaded,
  showCamera = true,
  documentMode = false,
  quality = 0.82,
  className,
}: PhotoUploadProps) {
  const [url, setUrl] = useState<string | null>(defaultUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savings, setSavings] = useState<{ before: number; after: number } | null>(null);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    setSavings(null);

    try {
      const originalSize = file.size;
      const finalFile = documentMode
        ? file
        : await compressImage(file, { maxWidth: 1920, maxHeight: 1920, quality });

      if (!documentMode) {
        setSavings({ before: originalSize, after: finalFile.size });
      }

      const fd = new FormData();
      fd.set("file", finalFile);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = (await res.json()) as { url?: string; error?: string };

      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      if (!json.url) throw new Error("No URL returned");

      setUrl(json.url);
      onUploaded?.(json.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) void handleFile(f);
    e.target.value = ""; // allow re-selecting the same file
  }

  function clear() {
    setUrl(null);
    setSavings(null);
    setError(null);
  }

  const isPdf = url?.toLowerCase().endsWith(".pdf");

  return (
    <div className={cn("space-y-2", className)}>
      <label className="block text-xs font-medium text-slate-700">{label}</label>

      <input type="hidden" name={name} value={url ?? ""} />

      {/* Hidden inputs for camera + gallery */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onChange}
      />
      <input
        ref={galleryRef}
        type="file"
        accept={documentMode ? "image/*,application/pdf" : "image/*"}
        className="hidden"
        onChange={onChange}
      />

      {!url ? (
        <div className="flex flex-wrap gap-2">
          {showCamera && !documentMode && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => cameraRef.current?.click()}
              disabled={uploading}
            >
              <Camera className="h-4 w-4" /> Take Photo
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => galleryRef.current?.click()}
            disabled={uploading}
          >
            <ImagePlus className="h-4 w-4" /> {documentMode ? "Choose File" : "From Gallery"}
          </Button>
          {uploading && (
            <span className="inline-flex items-center gap-1 text-xs text-primary-600">
              <Loader2 className="h-3 w-3 animate-spin" /> Compressing & uploading…
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50/60 p-2.5">
          {isPdf ? (
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-md bg-red-100">
              <FileText className="h-7 w-7 text-red-600" />
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={label}
              className="h-16 w-16 flex-shrink-0 rounded-md border border-slate-200 object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 text-sm font-medium text-green-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> Uploaded
            </div>
            {savings && (
              <p className="text-[11px] text-slate-500">
                Compressed: {formatBytes(savings.before)} → {formatBytes(savings.after)}{" "}
                <span className="text-green-600">
                  ({Math.round(((savings.before - savings.after) / savings.before) * 100)}% smaller)
                </span>
              </p>
            )}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-primary-600 hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> View
            </a>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={clear}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
