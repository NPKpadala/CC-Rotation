/**
 * Client-side image compression — no external deps.
 *
 * Behavior:
 * - Images get downscaled to a max width (default 1920px) preserving aspect ratio.
 * - Re-encoded as JPEG with the given quality (default 0.82) for smaller size.
 * - Non-image files (e.g. PDFs) pass through unchanged.
 * - GIFs and SVGs are NOT compressed (would lose animation / vector quality).
 * - If compression somehow makes the file LARGER, returns the original.
 */
export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0..1
  outputType?: "image/jpeg" | "image/webp";
}

export async function compressImage(file: File, options: CompressOptions = {}): Promise<File> {
  const { maxWidth = 1920, maxHeight = 1920, quality = 0.82, outputType = "image/jpeg" } = options;

  // Skip non-images, GIFs, SVGs
  if (
    !file.type.startsWith("image/") ||
    file.type === "image/gif" ||
    file.type === "image/svg+xml"
  ) {
    return file;
  }

  try {
    const img = await loadImage(file);

    let { width, height } = img;
    const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    // White background for transparent PNGs converted to JPEG
    if (outputType === "image/jpeg") {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, outputType, quality)
    );
    if (!blob) return file;

    if (blob.size >= file.size) return file; // didn't help

    const ext = outputType === "image/webp" ? "webp" : "jpg";
    const newName = file.name.replace(/\.\w+$/, `.${ext}`);
    return new File([blob], newName, { type: outputType, lastModified: Date.now() });
  } catch {
    return file;
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
