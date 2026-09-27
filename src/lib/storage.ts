import "server-only";
import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { del, get, put, issueSignedToken, presignUrl } from "@vercel/blob";

// File storage for PDFs, mind maps and poster images.
//
// - On Vercel (BLOB_READ_WRITE_TOKEN set): files live in a *private* Vercel Blob store.
// - Locally: files live in ./storage on disk.
//
// Either way the app only ever stores "/api/files/<key>" URLs, and that route checks
// access before handing out the file, so paid notes can't be hot-linked.

const ROOT = path.join(process.cwd(), "storage");

export const blobEnabled = () => !!process.env.BLOB_READ_WRITE_TOKEN;

export type Folder = "resources" | "images";

export function newKey(folder: Folder, filename: string) {
  const ext = path.extname(filename).toLowerCase().replace(/[^.a-z0-9]/g, "") || ".bin";
  return `${folder}/${randomUUID()}${ext}`;
}

export const urlForKey = (key: string) => `/api/files/${key}`;

export async function saveFile(file: File, folder: Folder) {
  const key = newKey(folder, file.name);
  const mimeType = file.type || "application/octet-stream";
  if (blobEnabled()) {
    await put(key, file, { access: "private", contentType: mimeType, addRandomSuffix: false });
  } else {
    const full = path.join(ROOT, key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, Buffer.from(await file.arrayBuffer()));
  }
  return { key, url: urlForKey(key), size: file.size, mimeType };
}

function safeKey(key: string) {
  const k = path.posix.normalize(key).replace(/^(\.\.(\/|$))+/, "");
  if (!/^(resources|images)\/[^/]+$/.test(k)) throw new Error("bad key");
  return k;
}

export async function readStoredFile(key: string): Promise<Buffer> {
  const k = safeKey(key);
  if (blobEnabled()) {
    const res = await get(k, { access: "private" });
    if (!res || res.statusCode !== 200) throw new Error("not found");
    return Buffer.from(await new Response(res.stream).arrayBuffer());
  }
  return readFile(path.join(ROOT, k));
}

// Short-lived link straight to Blob storage, so large PDFs don't pass through
// (and aren't limited by) the serverless function. Returns null for local disk.
export async function signedDownloadUrl(key: string, ttlSeconds = 600) {
  if (!blobEnabled()) return null;
  const k = safeKey(key);
  const validUntil = Date.now() + ttlSeconds * 1000;
  const token = await issueSignedToken({ pathname: k, operations: ["get"], validUntil });
  const { presignedUrl } = await presignUrl(token, { operation: "get", pathname: k, access: "private", validUntil });
  return presignedUrl;
}

export function keyFromUrl(url: string) {
  return url.startsWith("/api/files/") ? url.slice("/api/files/".length) : null;
}

export async function deleteStoredFile(key: string) {
  const k = safeKey(key);
  if (blobEnabled()) await del(k);
  else await rm(path.join(ROOT, k), { force: true });
}
