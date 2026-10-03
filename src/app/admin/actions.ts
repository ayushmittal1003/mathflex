"use server";
// Every admin mutation lives here. Each one re-checks the admin session itself —
// server actions are public endpoints, so the layout's check alone isn't enough.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { can, isStaff } from "@/lib/permissions";
import { saveSetting, getSettings, type Settings } from "@/lib/settings";
import { saveFile, readStoredFile, keyFromUrl, urlForKey, deleteStoredFile } from "@/lib/storage";
import { bunnyConfigured, bunnyHealth, bunnyVideoInfo, createBunnyUpload, normalizeBunnyRef } from "@/lib/video";
import { extractKnowledge } from "@/lib/flexcare";
import { fulfilOrder } from "@/lib/orders";
import { cashfreeConfigured } from "@/lib/cashfree";
import { syncCashfreeOrder } from "@/lib/payments";
import { bool, date, int, list, num, optInt, slugify, str } from "@/lib/form";
import type { AnswerFormat, BannerKind, CouponType, QuestionType, ResourceType, VideoProvider } from "@/generated/prisma/enums";

const refreshSite = () => revalidatePath("/", "layout");

/* ---------------- Chapters ---------------- */

export async function saveChapter(form: FormData) {
  const me = await requireStaff("content");
  const id = str(form, "id");
  const title = str(form, "title");
  const cover = form.get("coverFile");
  let coverImage: string | null | undefined = undefined;
  if (cover instanceof File && cover.size > 0) coverImage = (await saveFile(cover, "images")).url;
  if (bool(form, "removeCover")) coverImage = null;

  const data = {
    title,
    slug: slugify(str(form, "slug") || title),
    classLevel: int(form, "classLevel", 11),
    tagline: str(form, "tagline"),
    description: str(form, "description"),
    price: int(form, "price"),
    mrp: int(form, "mrp"),
    validityDays: int(form, "validityDays", 365),
    coverFrom: str(form, "coverFrom") || "#FF2E63",
    coverTo: str(form, "coverTo") || "#7C3AED",
    symbol: str(form, "symbol") || "∫",
    jeeWeightage: num(form, "jeeWeightage"),
    difficulty: int(form, "difficulty", 2),
    topTopics: list(form, "topTopics"),
    testMapping: list(form, "testMapping"),
    isPublished: bool(form, "isPublished"),
    isFeatured: bool(form, "isFeatured"),
    isTrending: bool(form, "isTrending"),
    isLowPriority: bool(form, "isLowPriority"),
    sortOrder: int(form, "sortOrder"),
    introVideoProvider: (str(form, "introVideoProvider") || null) as VideoProvider | null,
    introVideoRef: (str(form, "introVideoProvider") === "BUNNY" ? normalizeBunnyRef(str(form, "introVideoRef")) : str(form, "introVideoRef")) || null,
    ...(coverImage !== undefined ? { coverImage } : {}),
  };
  const saved = id ? await db.chapter.update({ where: { id }, data }) : await db.chapter.create({ data });
  await audit(me, id ? "chapter.update" : "chapter.create", `${id ? "Updated" : "Created"} chapter “${saved.title}”`, { entity: "chapter", id: saved.id });
  refreshSite();
  if (!id) redirect(`/admin/chapters/${saved.id}`);
}

export async function deleteChapter(id: string) {
  const me = await requireStaff("content");
  const sold = await db.entitlement.count({ where: { chapterId: id } });
  if (sold) {
    // Keep purchased content reachable for students; just hide it from the store.
    const c = await db.chapter.update({ where: { id }, data: { isPublished: false } });
    await audit(me, "chapter.hide", `Hid chapter “${c.title}” (bought by students, so not deleted)`, { entity: "chapter", id });
  } else {
    const c = await db.chapter.delete({ where: { id } });
    await audit(me, "chapter.delete", `Deleted chapter “${c.title}”`, { entity: "chapter", id });
  }
  refreshSite();
  redirect("/admin/chapters");
}

/* ---------------- Parts ---------------- */

export async function savePart(form: FormData) {
  const me = await requireStaff("content");
  const id = str(form, "id");
  const chapterId = str(form, "chapterId");
  const order = int(form, "order", 1);
  const data = {
    title: str(form, "title"),
    summary: str(form, "summary"),
    topics: list(form, "topics"),
    videoProvider: (str(form, "videoProvider") || "URL") as VideoProvider,
    videoRef: str(form, "videoProvider") === "BUNNY" ? normalizeBunnyRef(str(form, "videoRef")) : str(form, "videoRef"),
    durationSec: Math.round(num(form, "durationMin") * 60),
    isFreePreview: bool(form, "isFreePreview"),
    xpReward: int(form, "xpReward", 100),
    watchThreshold: Math.min(1, Math.max(0.1, num(form, "watchThresholdPct", 90) / 100)),
  };
  await db.$transaction(async (tx) => {
    // Swap orders if another part already uses this number.
    const clash = await tx.part.findFirst({ where: { chapterId, order, NOT: id ? { id } : undefined } });
    const current = id ? await tx.part.findUnique({ where: { id } }) : null;
    if (clash) {
      await tx.part.update({ where: { id: clash.id }, data: { order: -1 } });
    }
    if (id) await tx.part.update({ where: { id }, data: { ...data, order } });
    else await tx.part.create({ data: { ...data, order, chapterId } });
    if (clash) {
      const free = current?.order ?? ((await tx.part.aggregate({ where: { chapterId }, _max: { order: true } }))._max.order ?? 0) + 1;
      await tx.part.update({ where: { id: clash.id }, data: { order: free } });
    }
  });
  await audit(me, id ? "part.update" : "part.create", `${id ? "Updated" : "Added"} Part ${order} “${data.title}”`, { entity: "chapter", id: chapterId });
  refreshSite();
}

export async function deletePart(id: string) {
  const me = await requireStaff("content");
  const part = await db.part.delete({ where: { id } });
  await audit(me, "part.delete", `Deleted Part ${part.order} “${part.title}”`, { entity: "chapter", id: part.chapterId });
  refreshSite();
}

// Admin browser uploads straight to Bunny with this signed ticket.
export async function startVideoUpload(title: string) {
  await requireStaff("content");
  if (!bunnyConfigured()) throw new Error("Bunny Stream isn't configured. Add BUNNY_LIBRARY_ID and BUNNY_API_KEY to the environment.");
  return createBunnyUpload(title);
}

export async function syncBunnyDuration(partId: string) {
  await requireStaff("content");
  const part = await db.part.findUniqueOrThrow({ where: { id: partId } });
  if (part.videoProvider !== "BUNNY" || !part.videoRef) return { ok: false, message: "This part isn't set to a Bunny video." };
  const info = await bunnyVideoInfo(part.videoRef);
  if (!info.ok) return info;
  const { durationSec, ready, encodeProgress, title } = info.data;
  if (durationSec) await db.part.update({ where: { id: partId }, data: { durationSec } });
  refreshSite();
  return { ok: true, message: ready ? `Synced “${title}” · ${Math.max(1, Math.round(durationSec / 60))} min` : `Still encoding on Bunny (${encodeProgress}%). Try again shortly.` };
}

export async function testBunnyConnection() {
  await requireStaff("video");
  const r = await bunnyHealth();
  return r.ok ? { ok: true, message: `Connected. Your library has ${r.data.videos} video${r.data.videos === 1 ? "" : "s"}.` } : r;
}

/* ---------------- Questions ---------------- */

// Filled options in order, plus a map from the form's A-D slot to the saved index,
// so a blank slot (e.g. only A, B, D filled) doesn't shift the answer key.
function packOptions(raw: string[]) {
  const options: string[] = [];
  const slot = new Map<number, number>();
  raw.forEach((o, i) => {
    if (!o) return;
    slot.set(i, options.length);
    options.push(o);
  });
  return { options, slot };
}

export async function saveQuestion(form: FormData) {
  const me = await requireStaff("questions");
  const id = str(form, "id");
  const format = (["SINGLE", "MULTIPLE", "NUMERICAL"].includes(str(form, "format")) ? str(form, "format") : "SINGLE") as AnswerFormat;
  const { options, slot } = packOptions([0, 1, 2, 3].map((i) => str(form, `option${i}`)));
  const correctIndices = form.getAll("correctIndices").map((v) => slot.get(Number(v))).filter((v): v is number => v !== undefined);
  const numericAnswer = format === "NUMERICAL" ? num(form, "numericAnswer", NaN) : NaN;
  if (format === "MULTIPLE" && !correctIndices.length) throw new Error("Tick at least one correct option.");
  if (format === "NUMERICAL" && !Number.isFinite(numericAnswer)) throw new Error("Enter the numerical answer.");
  const data = {
    chapterId: str(form, "chapterId"),
    // Part practice sets use the single-correct player, so other formats stay in the Q bank.
    partId: format === "SINGLE" ? str(form, "partId") || null : null,
    type: (str(form, "type") || "DPP") as QuestionType,
    format,
    exam: str(form, "exam") || null,
    year: optInt(form, "year"),
    topic: str(form, "topic") || null,
    difficulty: int(form, "difficulty", 2),
    prompt: str(form, "prompt"),
    options: format === "NUMERICAL" ? [] : options,
    correctIndex: format === "SINGLE" ? slot.get(int(form, "correctIndex")) ?? 0 : 0,
    correctIndices: format === "MULTIPLE" ? correctIndices.sort((a, b) => a - b) : [],
    numericAnswer: format === "NUMERICAL" ? numericAnswer : null,
    tolerance: format === "NUMERICAL" ? Math.abs(num(form, "tolerance")) : 0,
    solution: str(form, "solution"),
    xp: int(form, "xp", 10),
    isPublished: bool(form, "isPublished"),
  };
  const q = id ? await db.question.update({ where: { id }, data }) : await db.question.create({ data });
  await audit(me, id ? "question.update" : "question.create", `${id ? "Edited" : "Added"} ${q.type} question: “${q.prompt.slice(0, 80)}”`, { entity: "question", id: q.id, meta: { chapterId: q.chapterId } });
  revalidatePath(`/admin/chapters/${data.chapterId}`);
  revalidatePath("/admin/questions");
}

export async function deleteQuestion(id: string) {
  const me = await requireStaff("questions");
  const q = await db.question.delete({ where: { id } });
  await audit(me, "question.delete", `Deleted question: “${q.prompt.slice(0, 80)}”`, { entity: "question", id, meta: { chapterId: q.chapterId } });
  revalidatePath(`/admin/chapters/${q.chapterId}`);
  revalidatePath("/admin/questions");
}

export async function setQuestionPublished(id: string, isPublished: boolean) {
  const me = await requireStaff("questions");
  const q = await db.question.update({ where: { id }, data: { isPublished } });
  await audit(me, isPublished ? "question.publish" : "question.hide", `${isPublished ? "Published" : "Hid"} question: “${q.prompt.slice(0, 80)}”`, { entity: "question", id });
  revalidatePath(`/admin/chapters/${q.chapterId}`);
  revalidatePath("/admin/questions");
}

// Bulk import. One question per line, tab- or pipe-separated:
// type | part | prompt | A | B | C | D | answer | solution | exam | year | difficulty(1-3) | topic
// answer: "B" single correct · "A,C" (or "AC") multi-correct · "=2.5" or "=2.5~0.01" numerical (± tolerance)
export async function importQuestions(_: unknown, form: FormData) {
  const me = await requireStaff("questions");
  const chapterId = str(form, "chapterId");
  const parts = await db.part.findMany({ where: { chapterId } });
  const lines = str(form, "rows").split("\n").map((l) => l.trim()).filter(Boolean);
  const errors: string[] = [];
  let created = 0;
  for (const [n, line] of lines.entries()) {
    const c = line.includes("\t") ? line.split("\t") : line.split("|");
    const cols = c.map((x) => x.trim());
    if (cols.length < 8) {
      errors.push(`Line ${n + 1}: expected at least 8 columns`);
      continue;
    }
    const [type, partOrder, prompt, a, b, cc, d, answer, solution = "", exam = "", year = "", diff = "2", topic = ""] = cols;
    const { options, slot } = packOptions([a, b, cc, d]);
    let format: AnswerFormat = "SINGLE";
    let correctIndex = 0;
    let correctIndices: number[] = [];
    let numericAnswer: number | null = null;
    let tolerance = 0;
    const numeric = answer.match(/^=\s*(-?[\d.]+)(?:\s*~\s*([\d.]+))?$/);
    const letters = answer.toUpperCase().replace(/[\s,]/g, "");
    if (numeric) {
      format = "NUMERICAL";
      numericAnswer = Number(numeric[1]);
      tolerance = numeric[2] ? Number(numeric[2]) : 0;
      if (!Number.isFinite(numericAnswer)) {
        errors.push(`Line ${n + 1}: numerical answer must look like =2.5`);
        continue;
      }
    } else if (/^[A-D]+$/.test(letters)) {
      const picks = [...new Set(letters.split("").map((l) => slot.get("ABCD".indexOf(l))))];
      if (picks.some((p) => p === undefined)) {
        errors.push(`Line ${n + 1}: answer points at an empty option`);
        continue;
      }
      if (picks.length === 1) correctIndex = picks[0]!;
      else {
        format = "MULTIPLE";
        correctIndices = (picks as number[]).sort((a, b) => a - b);
      }
    } else {
      errors.push(`Line ${n + 1}: answer must be A-D, several letters like A,C, or =number`);
      continue;
    }
    await db.question.create({
      data: {
        chapterId,
        partId: format === "SINGLE" ? parts.find((p) => p.order === Number(partOrder))?.id ?? null : null,
        type: type.toUpperCase() === "PYQ" ? "PYQ" : "DPP",
        format,
        prompt,
        options: format === "NUMERICAL" ? [] : options,
        correctIndex,
        correctIndices,
        numericAnswer,
        tolerance,
        solution,
        exam: exam || null,
        year: year ? Number(year) : null,
        difficulty: Math.min(3, Math.max(1, Number(diff) || 2)),
        topic: topic || null,
      },
    });
    created++;
  }
  if (created) await audit(me, "question.import", `Imported ${created} questions${errors.length ? ` (${errors.length} lines skipped)` : ""}`, { entity: "chapter", id: chapterId });
  revalidatePath(`/admin/chapters/${chapterId}`);
  revalidatePath("/admin/questions");
  return { created, errors };
}

/* ---------------- Resources (PDF notes, mind maps) ---------------- */

const ALLOWED_RESOURCE_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

type ResourceMeta = { chapterId: string; type: string; title: string; requiresPurchase: boolean; includeInChatbot: boolean };

// Shared by both upload paths: create the row, then teach FlexCare what's inside.
async function registerResource(me: { id: string; name: string; email: string }, meta: ResourceMeta, stored: { url: string; mimeType: string; size: number }, bytes: () => Promise<Buffer>) {
  const res = await db.resource.create({
    data: {
      chapterId: meta.chapterId || null,
      type: (meta.type || "NOTES") as ResourceType,
      title: meta.title,
      fileUrl: stored.url,
      mimeType: stored.mimeType,
      sizeBytes: stored.size,
      requiresPurchase: meta.requiresPurchase,
      includeInChatbot: meta.includeInChatbot,
    },
  });
  let extracted = false;
  if (res.includeInChatbot) {
    try {
      const text = await extractKnowledge(await bytes(), stored.mimeType, meta.title);
      if (text) {
        await db.resource.update({ where: { id: res.id }, data: { knowledgeText: text } });
        extracted = true;
      }
    } catch (e) {
      console.error("Knowledge extraction failed", e);
    }
  }
  await audit(me, "resource.upload", `Uploaded “${res.title}”`, { entity: "chapter", id: res.chapterId });
  refreshSite();
  return { ok: true as const, extracted };
}

// Local/dev path: the file comes through the server action.
export async function uploadResource(_: unknown, form: FormData) {
  const me = await requireStaff("content");
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a PDF or image to upload." };
  if (file.size > 30 * 1024 * 1024) return { error: "Max file size is 30 MB." };
  if (!ALLOWED_RESOURCE_TYPES.includes(file.type)) return { error: "Upload a PDF, PNG, JPG or WEBP." };
  const stored = await saveFile(file, "resources");
  const meta = {
    chapterId: str(form, "chapterId"),
    type: str(form, "type"),
    title: str(form, "title") || file.name.replace(/\.[^.]+$/, ""),
    requiresPurchase: bool(form, "requiresPurchase"),
    includeInChatbot: bool(form, "includeInChatbot"),
  };
  return registerResource(me, meta, stored, async () => Buffer.from(await file.arrayBuffer()));
}

// Vercel path: the browser already uploaded the file to Blob; we just record it.
export async function registerUploadedResource(input: ResourceMeta & { key: string; mimeType: string; size: number }) {
  const me = await requireStaff("content");
  if (!/^resources\/[\w-]+\.(pdf|png|jpe?g|webp)$/.test(input.key)) return { error: "Bad upload." };
  if (!ALLOWED_RESOURCE_TYPES.includes(input.mimeType)) return { error: "Upload a PDF, PNG, JPG or WEBP." };
  return registerResource(
    me,
    { ...input, title: input.title.trim() || "Notes" },
    { url: urlForKey(input.key), mimeType: input.mimeType, size: input.size },
    () => readStoredFile(input.key),
  );
}

export async function updateResource(form: FormData) {
  const me = await requireStaff("content");
  const r = await db.resource.update({
    where: { id: str(form, "id") },
    data: {
      title: str(form, "title"),
      type: str(form, "type") as ResourceType,
      knowledgeText: str(form, "knowledgeText"),
      includeInChatbot: bool(form, "includeInChatbot"),
      requiresPurchase: bool(form, "requiresPurchase"),
      isPublished: bool(form, "isPublished"),
    },
  });
  await audit(me, "resource.update", `Edited notes “${r.title}”`, { entity: "chapter", id: r.chapterId });
  refreshSite();
}

export async function reextractResource(id: string) {
  await requireStaff("content");
  const r = await db.resource.findUniqueOrThrow({ where: { id } });
  const key = keyFromUrl(r.fileUrl);
  if (!key) return { ok: false };
  const text = await extractKnowledge(await readStoredFile(key), r.mimeType, r.title);
  if (text) await db.resource.update({ where: { id }, data: { knowledgeText: text } });
  refreshSite();
  return { ok: !!text };
}

export async function deleteResource(id: string) {
  const me = await requireStaff("content");
  const r = await db.resource.delete({ where: { id } });
  await audit(me, "resource.delete", `Deleted notes “${r.title}”`, { entity: "chapter", id: r.chapterId });
  const key = keyFromUrl(r.fileUrl);
  if (key) await deleteStoredFile(key).catch((e) => console.error("file delete failed", e));
  refreshSite();
}

/* ---------------- Courses ---------------- */

export async function saveCourse(form: FormData) {
  const me = await requireStaff("courses");
  const id = str(form, "id");
  const title = str(form, "title");
  const chapterIds = form.getAll("chapterIds").map(String);
  const data = {
    title,
    slug: slugify(str(form, "slug") || title),
    subtitle: str(form, "subtitle"),
    description: str(form, "description"),
    price: int(form, "price"),
    mrp: int(form, "mrp"),
    validityDays: int(form, "validityDays", 365),
    coverFrom: str(form, "coverFrom"),
    coverTo: str(form, "coverTo"),
    highlights: list(form, "highlights"),
    isPublished: bool(form, "isPublished"),
    isFeatured: bool(form, "isFeatured"),
    sortOrder: int(form, "sortOrder"),
  };
  await db.$transaction(async (tx) => {
    const c = id ? await tx.course.update({ where: { id }, data }) : await tx.course.create({ data });
    await tx.courseChapter.deleteMany({ where: { courseId: c.id } });
    await tx.courseChapter.createMany({ data: chapterIds.map((chapterId) => ({ courseId: c.id, chapterId })) });
  });
  await audit(me, id ? "course.update" : "course.create", `${id ? "Updated" : "Created"} course “${title}” (${chapterIds.length} chapters)`, { entity: "course", id: id || null });
  refreshSite();
  redirect("/admin/courses");
}

export async function deleteCourse(id: string) {
  const me = await requireStaff("courses");
  const sold = await db.entitlement.count({ where: { courseId: id } });
  const c = sold ? await db.course.update({ where: { id }, data: { isPublished: false } }) : await db.course.delete({ where: { id } });
  await audit(me, sold ? "course.hide" : "course.delete", `${sold ? "Hid" : "Deleted"} course “${c.title}”`, { entity: "course", id });
  refreshSite();
  redirect("/admin/courses");
}

/* ---------------- Coupons ---------------- */

export async function saveCoupon(form: FormData) {
  const me = await requireStaff("coupons");
  const id = str(form, "id");
  const data = {
    code: str(form, "code").toUpperCase().replace(/\s+/g, ""),
    description: str(form, "description"),
    type: str(form, "type") as CouponType,
    value: int(form, "value"),
    maxDiscount: optInt(form, "maxDiscount"),
    minAmount: int(form, "minAmount"),
    usageLimit: optInt(form, "usageLimit"),
    perUserLimit: int(form, "perUserLimit", 1),
    startsAt: date(form, "startsAt"),
    endsAt: date(form, "endsAt"),
    isActive: bool(form, "isActive"),
    isPublic: bool(form, "isPublic"),
  };
  const c = id ? await db.coupon.update({ where: { id }, data }) : await db.coupon.create({ data });
  await audit(me, id ? "coupon.update" : "coupon.create", `${id ? "Updated" : "Created"} coupon ${c.code} (${c.type === "PERCENT" ? `${c.value}%` : `₹${c.value}`}${c.isActive ? "" : ", inactive"})`, { entity: "coupon", id: c.id });
  revalidatePath("/admin/coupons");
}

export async function deleteCoupon(id: string) {
  const me = await requireStaff("coupons");
  const c = await db.coupon.delete({ where: { id } });
  await audit(me, "coupon.delete", `Deleted coupon ${c.code}`, { entity: "coupon", id });
  revalidatePath("/admin/coupons");
}

/* ---------------- Banners ---------------- */

export async function saveBanner(form: FormData) {
  const me = await requireStaff("banners");
  const id = str(form, "id");
  const img = form.get("imageFile");
  let imageUrl: string | null | undefined;
  if (img instanceof File && img.size > 0) imageUrl = (await saveFile(img, "images")).url;
  const data = {
    kind: str(form, "kind") as BannerKind,
    title: str(form, "title"),
    subtitle: str(form, "subtitle"),
    ctaText: str(form, "ctaText"),
    ctaHref: str(form, "ctaHref"),
    colorFrom: str(form, "colorFrom") || "#FF2E63",
    colorTo: str(form, "colorTo") || "#7C3AED",
    isActive: bool(form, "isActive"),
    startsAt: date(form, "startsAt"),
    endsAt: date(form, "endsAt"),
    sortOrder: int(form, "sortOrder"),
    ...(imageUrl !== undefined ? { imageUrl } : {}),
  };
  const b = id ? await db.banner.update({ where: { id }, data }) : await db.banner.create({ data });
  await audit(me, id ? "banner.update" : "banner.create", `${id ? "Updated" : "Created"} ${b.kind.toLowerCase()} banner “${b.title}”${b.isActive ? "" : " (inactive)"}`, { entity: "banner", id: b.id });
  refreshSite();
}

export async function deleteBanner(id: string) {
  const me = await requireStaff("banners");
  const b = await db.banner.delete({ where: { id } });
  await audit(me, "banner.delete", `Deleted banner “${b.title}”`, { entity: "banner", id });
  refreshSite();
}

/* ---------------- Orders ---------------- */

export async function markOrderPaid(id: string) {
  const me = await requireStaff("orders");
  await fulfilOrder(id, { txnId: "MANUAL", raw: { manual: true, at: new Date().toISOString(), by: me.email } });
  const o = await db.order.findUniqueOrThrow({ where: { id } });
  await audit(me, "order.markPaid", `Marked order ${o.orderNo} as paid (₹${o.total})`, { entity: "user", id: o.userId, meta: { orderId: id } });
  revalidatePath("/admin/orders");
}

export async function refundOrder(id: string) {
  const me = await requireStaff("orders");
  const [, o] = await db.$transaction([
    db.entitlement.deleteMany({ where: { orderId: id } }),
    db.order.update({ where: { id }, data: { status: "REFUNDED" } }),
  ]);
  await audit(me, "order.refund", `Refunded order ${o.orderNo} (₹${o.total}) and removed its access`, { entity: "user", id: o.userId, meta: { orderId: id } });
  revalidatePath("/admin/orders");
}

// Ask Cashfree for the real status of a pending order (e.g. if a webhook was missed).
export async function recheckPayment(id: string) {
  const me = await requireStaff("orders");
  const order = await db.order.findUniqueOrThrow({ where: { id } });
  if (order.gateway !== "cashfree" || !cashfreeConfigured()) return;
  const result = await syncCashfreeOrder(order.orderNo);
  await audit(me, "order.recheck", `Re-checked order ${order.orderNo} with Cashfree: ${result}`, { entity: "user", id: order.userId, meta: { orderId: id } });
  revalidatePath("/admin/orders");
}

/* ---------------- Students ---------------- */

export async function setBlocked(userId: string, blocked: boolean) {
  const me = await requireStaff("students");
  if (me.id === userId) return;
  const target = await db.user.findUniqueOrThrow({ where: { id: userId } });
  // Blocking a team member is a team decision, not a support one.
  if (isStaff(target.role) && !can(me.role, "team")) throw new Error("Only a super admin can block a team member.");
  await db.user.update({ where: { id: userId }, data: { isBlocked: blocked } });
  await audit(me, blocked ? "user.block" : "user.unblock", `${blocked ? "Blocked" : "Unblocked"} ${target.name} (${target.email})`, { entity: "user", id: userId });
  revalidatePath(`/admin/students/${userId}`);
}

// Shared by the single and bulk grant forms. Returns the entitlements created.
async function grant(me: { id: string; name: string; email: string }, userIds: string[], target: string, days: number, note: string) {
  const [kind, id] = target.split(":");
  const item = kind === "course" ? await db.course.findUnique({ where: { id }, select: { title: true } }) : await db.chapter.findUnique({ where: { id }, select: { title: true } });
  if (!item || !userIds.length) return 0;
  const expiresAt = new Date(Date.now() + Math.max(1, days) * 86_400_000);
  await db.entitlement.createMany({
    data: userIds.map((userId) => ({ userId, source: "admin", grantedById: me.id, note, expiresAt, ...(kind === "course" ? { courseId: id } : { chapterId: id }) })),
  });
  for (const userId of userIds) {
    await audit(me, "access.grant", `Granted “${item.title}” for ${days} days${note ? ` · ${note}` : ""}`, { entity: "user", id: userId, meta: { target, days } });
  }
  return userIds.length;
}

export async function grantAccess(form: FormData) {
  const me = await requireStaff("access");
  const userId = str(form, "userId");
  await grant(me, [userId], str(form, "target"), int(form, "days", 365), str(form, "note"));
  revalidatePath(`/admin/students/${userId}`);
}

// Paste a list of emails (one per line, or comma-separated) and grant them all at once.
export async function bulkGrantAccess(_: unknown, form: FormData) {
  const me = await requireStaff("access");
  const emails = [...new Set(str(form, "emails").toLowerCase().split(/[\s,;]+/).filter((e) => e.includes("@")))];
  if (!emails.length) return { granted: [] as string[], missing: [] as string[], error: "Paste at least one email." };
  if (emails.length > 500) return { granted: [], missing: [], error: "Up to 500 emails at a time." };
  const users = await db.user.findMany({ where: { email: { in: emails } }, select: { id: true, email: true } });
  const found = new Set(users.map((u) => u.email));
  await grant(me, users.map((u) => u.id), str(form, "target"), int(form, "days", 365), str(form, "note"));
  revalidatePath("/admin/access");
  return { granted: users.map((u) => u.email), missing: emails.filter((e) => !found.has(e)), error: "" };
}

export async function revokeEntitlement(id: string) {
  const me = await requireStaff("access");
  const e = await db.entitlement.delete({ where: { id }, include: { chapter: { select: { title: true } }, course: { select: { title: true } } } });
  await audit(me, "access.revoke", `Revoked “${e.chapter?.title ?? e.course?.title}”`, { entity: "user", id: e.userId });
  revalidatePath(`/admin/students/${e.userId}`);
  revalidatePath("/admin/access");
}

export async function extendEntitlement(id: string, days: number) {
  const me = await requireStaff("access");
  const e = await db.entitlement.findUniqueOrThrow({ where: { id }, include: { chapter: { select: { title: true } }, course: { select: { title: true } } } });
  const base = Math.max(Date.now(), e.expiresAt.getTime());
  const expiresAt = new Date(base + days * 86_400_000);
  await db.entitlement.update({ where: { id }, data: { expiresAt } });
  await audit(me, "access.extend", `Extended “${e.chapter?.title ?? e.course?.title}” by ${days} days (now until ${expiresAt.toLocaleDateString("en-IN")})`, { entity: "user", id: e.userId });
  revalidatePath(`/admin/students/${e.userId}`);
}

/* ---------------- Mentorship ---------------- */

export async function updateBooking(form: FormData) {
  const me = await requireStaff("mentorship");
  const b = await db.mentorshipBooking.update({
    where: { id: str(form, "id") },
    data: { status: str(form, "status"), scheduledAt: date(form, "scheduledAt"), meetLink: str(form, "meetLink") || null, notes: str(form, "notes") },
  });
  await audit(me, "mentorship.update", `Mentorship call set to ${b.status}${b.scheduledAt ? ` for ${b.scheduledAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}` : ""}`, { entity: "user", id: b.userId });
  revalidatePath("/admin/mentorship");
}

/* ---------------- FlexCare knowledge ---------------- */

export async function saveKnowledge(form: FormData) {
  const me = await requireStaff("flexcare");
  const id = str(form, "id");
  const data = { question: str(form, "question"), answer: str(form, "answer"), isActive: bool(form, "isActive") };
  const k = id ? await db.knowledgeEntry.update({ where: { id }, data }) : await db.knowledgeEntry.create({ data });
  await audit(me, id ? "flexcare.update" : "flexcare.create", `${id ? "Edited" : "Added"} FlexCare answer: “${k.question.slice(0, 80)}”`, { entity: "flexcare", id: k.id });
  revalidatePath("/admin/flexcare");
}

export async function deleteKnowledge(id: string) {
  const me = await requireStaff("flexcare");
  const k = await db.knowledgeEntry.delete({ where: { id } });
  await audit(me, "flexcare.delete", `Deleted FlexCare answer: “${k.question.slice(0, 80)}”`, { entity: "flexcare", id });
  revalidatePath("/admin/flexcare");
}

/* ---------------- Settings ---------------- */

export async function saveSettings(form: FormData) {
  const me = await requireStaff("settings");
  const cur = await getSettings();
  const features = Object.fromEntries(Object.keys(cur.features).map((k) => [k, bool(form, `features.${k}`)])) as Settings["features"];
  const xp = Object.fromEntries(Object.keys(cur.xp).map((k) => [k, int(form, `xp.${k}`, cur.xp[k as keyof Settings["xp"]])])) as Settings["xp"];
  const marking = Object.fromEntries(Object.keys(cur.marking).map((k) => [k, num(form, `marking.${k}`, cur.marking[k as keyof Settings["marking"]])])) as Settings["marking"];
  await Promise.all([
    saveSetting("siteName", str(form, "siteName") || cur.siteName),
    saveSetting("tagline", str(form, "tagline")),
    saveSetting("supportEmail", str(form, "supportEmail")),
    saveSetting("whatsappNumber", str(form, "whatsappNumber").replace(/\D/g, "")),
    saveSetting("mentorName", str(form, "mentorName")),
    saveSetting("mentorshipPrice", int(form, "mentorshipPrice", cur.mentorshipPrice)),
    saveSetting("mentorshipTitle", str(form, "mentorshipTitle")),
    saveSetting("mentorshipBlurb", str(form, "mentorshipBlurb")),
    saveSetting("gstPercent", num(form, "gstPercent")),
    saveSetting("features", features),
    saveSetting("xp", xp),
    saveSetting("marking", marking),
    saveSetting("chatbot", { name: str(form, "chatbot.name") || "FlexCare", greeting: str(form, "chatbot.greeting"), model: str(form, "chatbot.model") || cur.chatbot.model }),
  ]);
  const flipped = (Object.keys(features) as (keyof Settings["features"])[]).filter((k) => features[k] !== cur.features[k]).map((k) => `${k} ${features[k] ? "on" : "off"}`);
  await audit(me, "settings.update", `Saved settings${flipped.length ? `: ${flipped.join(", ")}` : ""}`, { entity: "settings" });
  refreshSite();
  redirect("/admin/settings?saved=1");
}
