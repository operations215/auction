import fs from "node:fs";
import path from "node:path";
import { UPLOAD_DIR } from "@/lib/db";

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
};

export async function GET(_: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const m = /^[a-z0-9_-]{1,64}\.(jpg|png|gif|webp|svg)$/i.exec(file);
  if (!m) return new Response("Not found", { status: 404 });
  const p = path.join(UPLOAD_DIR, file);
  if (!fs.existsSync(p)) return new Response("Not found", { status: 404 });
  return new Response(fs.readFileSync(p), {
    headers: {
      "Content-Type": TYPES[m[1].toLowerCase()],
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      // Uploaded files are images only; never let one run script.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
