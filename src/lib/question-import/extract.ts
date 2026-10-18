import "server-only";
import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

export type FileKind = "pdf" | "docx" | "text" | "image" | "unsupported";
// A file to read, whether it came straight from a form or from storage.
export type Source = { name: string; mime: string; buf: Buffer };

const MAX_BYTES = 30 * 1024 * 1024;

export function fileKind(name: string, mime: string): FileKind {
  const n = name.toLowerCase();
  if (mime === "application/pdf" || n.endsWith(".pdf")) return "pdf";
  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || n.endsWith(".docx")) return "docx";
  if (mime.startsWith("text/") || n.endsWith(".txt") || n.endsWith(".md")) return "text";
  if (/^image\/(png|jpe?g|webp)$/.test(mime) || /\.(png|jpe?g|webp)$/.test(n)) return "image";
  return "unsupported";
}

// Plain text out of a PDF / Word / text file. Images and scanned PDFs have no text layer (empty string).
export async function extractSourceText(src: Source): Promise<{ text: string; kind: FileKind }> {
  const kind = fileKind(src.name, src.mime);
  if (src.buf.length > MAX_BYTES) throw new Error(`“${src.name}” is over 30 MB. Split it into smaller files.`);
  if (kind === "unsupported" || kind === "image") return { text: "", kind };
  if (kind === "text") return { text: src.buf.toString("utf8"), kind };
  if (kind === "docx") {
    const { value } = await mammoth.extractRawText({ buffer: src.buf });
    return { text: value, kind };
  }
  const pdf = await getDocumentProxy(new Uint8Array(src.buf));
  const { text } = await extractText(pdf, { mergePages: true });
  return { text: Array.isArray(text) ? text.join("\n") : text, kind };
}
