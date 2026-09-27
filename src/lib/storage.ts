import "server-only";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

// File storage for PDFs, mind maps and poster images.
// Files live OUTSIDE /public and are streamed through /api/files/... after an access
// check, so paid notes can't be hot-linked. For production on serverless hosts, swap
// these two functions for S3 / Cloudflare R2 / Bunny Storage calls — nothing else changes.

const ROOT = path.join(process.cwd(), "storage");

export async function saveFile(file: File, folder: "resources" | "images") {
  const ext = path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, "") || ".bin";
  const key = `${folder}/${randomUUID()}${ext}`;
  const full = path.join(ROOT, key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, Buffer.from(await file.arrayBuffer()));
  return { key, url: `/api/files/${key}`, size: file.size, mimeType: file.type || "application/octet-stream" };
}

export async function readStoredFile(key: string) {
  const safe = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, "");
  const full = path.join(ROOT, safe);
  if (!full.startsWith(ROOT)) throw new Error("bad path");
  return readFile(full);
}

export function keyFromUrl(url: string) {
  return url.startsWith("/api/files/") ? url.slice("/api/files/".length) : null;
}
