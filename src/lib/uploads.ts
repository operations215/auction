import "server-only";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { UPLOAD_DIR } from "./db";

export const MAX_PHOTOS = 10;
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

/** Detect the real image type from the file's first bytes; never trust the browser's MIME type. */
function sniff(buf: Buffer): "jpg" | "png" | "gif" | "webp" | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.subarray(0, 4).toString("ascii") === "GIF8") return "gif";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  return null;
}

export type PhotoCheck = { ok: true; files: { buf: Buffer; ext: string }[] } | { ok: false; error: string };

export async function readPhotos(entries: FormDataEntryValue[]): Promise<PhotoCheck> {
  const files = entries.filter((e): e is File => typeof e !== "string" && e.size > 0);
  if (files.length === 0) return { ok: false, error: "Add at least one photo. Listings with clear photos sell far better." };
  if (files.length > MAX_PHOTOS) return { ok: false, error: `You can add up to ${MAX_PHOTOS} photos.` };
  const out: { buf: Buffer; ext: string }[] = [];
  for (const f of files) {
    if (f.size > MAX_PHOTO_BYTES) return { ok: false, error: `"${f.name}" is larger than 8 MB.` };
    const buf = Buffer.from(await f.arrayBuffer());
    const ext = sniff(buf);
    if (!ext) return { ok: false, error: `"${f.name}" isn't a JPEG, PNG, GIF or WebP image.` };
    out.push({ buf, ext });
  }
  return { ok: true, files: out };
}

export function writePhoto(buf: Buffer, ext: string): string {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const name = `${crypto.randomBytes(12).toString("hex")}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
  return name;
}
