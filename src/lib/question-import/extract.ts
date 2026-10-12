import "server-only";
import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

export type Extracted = { text: string; kind: "pdf" | "docx" | "text" | "image" | "unsupported" };

const MAX_BYTES = 15 * 1024 * 1024;

export function fileKind(name: string, mime: string): Extracted["kind"] {
  const n = name.toLowerCase();
  if (mime === "application/pdf" || n.endsWith(".pdf")) return "pdf";
  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || n.endsWith(".docx")) return "docx";
  if (mime.startsWith("text/") || n.endsWith(".txt") || n.endsWith(".md")) return "text";
  if (/^image\/(png|jpe?g|webp)$/.test(mime)) return "image";
  return "unsupported";
}

// Plain text out of a PDF / Word / text file. Images and scanned PDFs have no text layer (empty string).
export async function extractFileText(file: File): Promise<Extracted> {
  const kind = fileKind(file.name, file.type);
  if (file.size > MAX_BYTES) throw new Error(`“${file.name}” is over 15 MB. Split it into smaller files.`);
  if (kind === "unsupported" || kind === "image") return { text: "", kind };
  const buf = Buffer.from(await file.arrayBuffer());
  if (kind === "text") return { text: buf.toString("utf8"), kind };
  if (kind === "docx") {
    const { value } = await mammoth.extractRawText({ buffer: buf });
    return { text: value, kind };
  }
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: true });
  return { text: Array.isArray(text) ? text.join("\n") : text, kind };
}
