import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import crypto from "crypto";
import { auth } from "@/lib/auth";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const MAX_BYTES = (parseInt(process.env.MAX_FILE_SIZE_MB ?? "5", 10) || 5) * 1024 * 1024;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: `Type ${file.type} not allowed` }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `File too large (max ${MAX_BYTES / 1024 / 1024}MB)` }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const safeExt = /^[a-z0-9]{1,8}$/.test(ext) ? ext : "bin";
  const key = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${safeExt}`;

  const uploadDir = process.env.UPLOAD_DIR ?? "./public/uploads";
  const absDir = path.resolve(process.cwd(), uploadDir);
  if (!existsSync(absDir)) await mkdir(absDir, { recursive: true });

  const filePath = path.join(absDir, key);
  await writeFile(filePath, buffer);

  const url = `/uploads/${key}`;
  return NextResponse.json({ url, key });
}
