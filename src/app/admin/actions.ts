"use server";
// Every admin mutation lives here. Each one re-checks the admin session itself —
// server actions are public endpoints, so the layout's check alone isn't enough.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { saveSetting, getSettings, type Settings } from "@/lib/settings";
import { saveFile, readStoredFile, keyFromUrl, urlForKey, deleteStoredFile } from "@/lib/storage";
import { bunnyConfigured, bunnyVideoInfo, createBunnyUpload } from "@/lib/video";
import { extractKnowledge } from "@/lib/flexcare";
import { fulfilOrder } from "@/lib/orders";
import { fetchOrderStatus, paytmConfigured } from "@/lib/paytm";
import { bool, date, int, list, num, optInt, slugify, str } from "@/lib/form";
import type { AnswerFormat, BannerKind, CouponType, QuestionType, ResourceType, VideoProvider } from "@/generated/prisma/enums";

const refreshSite = () => revalidatePath("/", "layout");

/* ---------------- Chapters ---------------- */

export async function saveChapter(form: FormData) {
  await requireAdmin();
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
    introVideoRef: str(form, "introVideoRef") || null,
    ...(coverImage !== undefined ? { coverImage } : {}),
  };
  const saved = id ? await db.chapter.update({ where: { id }, data }) : await db.chapter.create({ data });
  refreshSite();
  if (!id) redirect(`/admin/chapters/${saved.id}`);
}

export async function deleteChapter(id: string) {
  await requireAdmin();
  const sold = await db.entitlement.count({ where: { chapterId: id } });
  if (sold) {
    // Keep purchased content reachable for students; just hide it from the store.
    await db.chapter.update({ where: { id }, data: { isPublished: false } });
  } else {
    await db.chapter.delete({ where: { id } });
  }
  refreshSite();
  redirect("/admin/chapters");
}

/* ---------------- Parts ---------------- */

export async function savePart(form: FormData) {
  await requireAdmin();
  const id = str(form, "id");
  const chapterId = str(form, "chapterId");
  const order = int(form, "order", 1);
  const data = {
    title: str(form, "title"),
    summary: str(form, "summary"),
    topics: list(form, "topics"),
    videoProvider: (str(form, "videoProvider") || "URL") as VideoProvider,
    videoRef: str(form, "videoRef"),
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
  refreshSite();
}

export async function deletePart(id: string) {
  await requireAdmin();
  await db.part.delete({ where: { id } });
  refreshSite();
}

// Admin browser uploads straight to Bunny with this signed ticket.
export async function startVideoUpload(title: string) {
  await requireAdmin();
  if (!bunnyConfigured()) throw new Error("Bunny Stream isn't configured. Add BUNNY_LIBRARY_ID and BUNNY_API_KEY to the environment.");
  return createBunnyUpload(title);
}

export async function syncBunnyDuration(partId: string) {
  await requireAdmin();
  const part = await db.part.findUniqueOrThrow({ where: { id: partId } });
  if (part.videoProvider !== "BUNNY" || !part.videoRef) return { ok: false, message: "Not a Bunny video" };
  const info = await bunnyVideoInfo(part.videoRef);
  if (!info) return { ok: false, message: "Video not found on Bunny" };
  if (info.durationSec) await db.part.update({ where: { id: partId }, data: { durationSec: info.durationSec } });
  refreshSite();
  return { ok: true, message: info.ready ? `Ready · ${Math.round(info.durationSec / 60)} min` : `Encoding… ${info.encodeProgress}%` };
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
  await requireAdmin();
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
  if (id) await db.question.update({ where: { id }, data });
  else await db.question.create({ data });
  revalidatePath(`/admin/chapters/${data.chapterId}`);
  revalidatePath("/admin/questions");
}

export async function deleteQuestion(id: string) {
  await requireAdmin();
  const q = await db.question.delete({ where: { id } });
  revalidatePath(`/admin/chapters/${q.chapterId}`);
  revalidatePath("/admin/questions");
}

export async function setQuestionPublished(id: string, isPublished: boolean) {
  await requireAdmin();
  const q = await db.question.update({ where: { id }, data: { isPublished } });
  revalidatePath(`/admin/chapters/${q.chapterId}`);
  revalidatePath("/admin/questions");
}

// Bulk import. One question per line, tab- or pipe-separated:
// type | part | prompt | A | B | C | D | answer | solution | exam | year | difficulty(1-3) | topic
// answer: "B" single correct · "A,C" (or "AC") multi-correct · "=2.5" or "=2.5~0.01" numerical (± tolerance)
export async function importQuestions(_: unknown, form: FormData) {
  await requireAdmin();
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
  revalidatePath(`/admin/chapters/${chapterId}`);
  revalidatePath("/admin/questions");
  return { created, errors };
}

/* ---------------- Resources (PDF notes, mind maps) ---------------- */

const ALLOWED_RESOURCE_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

type ResourceMeta = { chapterId: string; type: string; title: string; requiresPurchase: boolean; includeInChatbot: boolean };

// Shared by both upload paths: create the row, then teach FlexCare what's inside.
async function registerResource(meta: ResourceMeta, stored: { url: string; mimeType: string; size: number }, bytes: () => Promise<Buffer>) {
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
  refreshSite();
  return { ok: true as const, extracted };
}

// Local/dev path: the file comes through the server action.
export async function uploadResource(_: unknown, form: FormData) {
  await requireAdmin();
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
  return registerResource(meta, stored, async () => Buffer.from(await file.arrayBuffer()));
}

// Vercel path: the browser already uploaded the file to Blob; we just record it.
export async function registerUploadedResource(input: ResourceMeta & { key: string; mimeType: string; size: number }) {
  await requireAdmin();
  if (!/^resources\/[\w-]+\.(pdf|png|jpe?g|webp)$/.test(input.key)) return { error: "Bad upload." };
  if (!ALLOWED_RESOURCE_TYPES.includes(input.mimeType)) return { error: "Upload a PDF, PNG, JPG or WEBP." };
  return registerResource(
    { ...input, title: input.title.trim() || "Notes" },
    { url: urlForKey(input.key), mimeType: input.mimeType, size: input.size },
    () => readStoredFile(input.key),
  );
}

export async function updateResource(form: FormData) {
  await requireAdmin();
  await db.resource.update({
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
  refreshSite();
}

export async function reextractResource(id: string) {
  await requireAdmin();
  const r = await db.resource.findUniqueOrThrow({ where: { id } });
  const key = keyFromUrl(r.fileUrl);
  if (!key) return { ok: false };
  const text = await extractKnowledge(await readStoredFile(key), r.mimeType, r.title);
  if (text) await db.resource.update({ where: { id }, data: { knowledgeText: text } });
  refreshSite();
  return { ok: !!text };
}

export async function deleteResource(id: string) {
  await requireAdmin();
  const r = await db.resource.delete({ where: { id } });
  const key = keyFromUrl(r.fileUrl);
  if (key) await deleteStoredFile(key).catch((e) => console.error("file delete failed", e));
  refreshSite();
}

/* ---------------- Courses ---------------- */

export async function saveCourse(form: FormData) {
  await requireAdmin();
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
  refreshSite();
  redirect("/admin/courses");
}

export async function deleteCourse(id: string) {
  await requireAdmin();
  if (await db.entitlement.count({ where: { courseId: id } })) await db.course.update({ where: { id }, data: { isPublished: false } });
  else await db.course.delete({ where: { id } });
  refreshSite();
  redirect("/admin/courses");
}

/* ---------------- Coupons ---------------- */

export async function saveCoupon(form: FormData) {
  await requireAdmin();
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
  if (id) await db.coupon.update({ where: { id }, data });
  else await db.coupon.create({ data });
  revalidatePath("/admin/coupons");
}

export async function deleteCoupon(id: string) {
  await requireAdmin();
  await db.coupon.delete({ where: { id } });
  revalidatePath("/admin/coupons");
}

/* ---------------- Banners ---------------- */

export async function saveBanner(form: FormData) {
  await requireAdmin();
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
  if (id) await db.banner.update({ where: { id }, data });
  else await db.banner.create({ data });
  refreshSite();
}

export async function deleteBanner(id: string) {
  await requireAdmin();
  await db.banner.delete({ where: { id } });
  refreshSite();
}

/* ---------------- Orders ---------------- */

export async function markOrderPaid(id: string) {
  await requireAdmin();
  await fulfilOrder(id, { txnId: "MANUAL", raw: { manual: true, at: new Date().toISOString() } });
  revalidatePath("/admin/orders");
}

export async function refundOrder(id: string) {
  await requireAdmin();
  await db.$transaction([
    db.entitlement.deleteMany({ where: { orderId: id } }),
    db.order.update({ where: { id }, data: { status: "REFUNDED" } }),
  ]);
  revalidatePath("/admin/orders");
}

export async function recheckPaytm(id: string) {
  await requireAdmin();
  if (!paytmConfigured()) return;
  const order = await db.order.findUniqueOrThrow({ where: { id } });
  const s = await fetchOrderStatus(order.orderNo);
  if (s.status === "TXN_SUCCESS" && Math.round(s.amount) === order.total) await fulfilOrder(id, { txnId: s.txnId, raw: s.raw });
  else if (s.status === "TXN_FAILURE") await db.order.update({ where: { id }, data: { status: "FAILED" } });
  revalidatePath("/admin/orders");
}

/* ---------------- Students ---------------- */

export async function setBlocked(userId: string, blocked: boolean) {
  const admin = await requireAdmin();
  if (admin.id === userId) return;
  await db.user.update({ where: { id: userId }, data: { isBlocked: blocked } });
  revalidatePath(`/admin/students/${userId}`);
}

export async function setRole(userId: string, role: "STUDENT" | "ADMIN") {
  const admin = await requireAdmin();
  if (admin.id === userId) return;
  await db.user.update({ where: { id: userId }, data: { role } });
  revalidatePath(`/admin/students/${userId}`);
}

export async function grantAccess(form: FormData) {
  await requireAdmin();
  const userId = str(form, "userId");
  const target = str(form, "target"); // "chapter:<id>" | "course:<id>"
  const [kind, id] = target.split(":");
  const days = int(form, "days", 365);
  await db.entitlement.create({
    data: { userId, source: "admin", expiresAt: new Date(Date.now() + days * 86_400_000), ...(kind === "course" ? { courseId: id } : { chapterId: id }) },
  });
  revalidatePath(`/admin/students/${userId}`);
}

export async function revokeEntitlement(id: string) {
  await requireAdmin();
  const e = await db.entitlement.delete({ where: { id } });
  revalidatePath(`/admin/students/${e.userId}`);
}

export async function extendEntitlement(id: string, days: number) {
  await requireAdmin();
  const e = await db.entitlement.findUniqueOrThrow({ where: { id } });
  const base = Math.max(Date.now(), e.expiresAt.getTime());
  await db.entitlement.update({ where: { id }, data: { expiresAt: new Date(base + days * 86_400_000) } });
  revalidatePath(`/admin/students/${e.userId}`);
}

/* ---------------- Mentorship ---------------- */

export async function updateBooking(form: FormData) {
  await requireAdmin();
  await db.mentorshipBooking.update({
    where: { id: str(form, "id") },
    data: { status: str(form, "status"), scheduledAt: date(form, "scheduledAt"), meetLink: str(form, "meetLink") || null, notes: str(form, "notes") },
  });
  revalidatePath("/admin/mentorship");
}

/* ---------------- FlexCare knowledge ---------------- */

export async function saveKnowledge(form: FormData) {
  await requireAdmin();
  const id = str(form, "id");
  const data = { question: str(form, "question"), answer: str(form, "answer"), isActive: bool(form, "isActive") };
  if (id) await db.knowledgeEntry.update({ where: { id }, data });
  else await db.knowledgeEntry.create({ data });
  revalidatePath("/admin/flexcare");
}

export async function deleteKnowledge(id: string) {
  await requireAdmin();
  await db.knowledgeEntry.delete({ where: { id } });
  revalidatePath("/admin/flexcare");
}

/* ---------------- Settings ---------------- */

export async function saveSettings(form: FormData) {
  await requireAdmin();
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
    saveSetting("paymentMode", str(form, "paymentMode") === "paytm" ? "paytm" : "mock"),
    saveSetting("features", features),
    saveSetting("xp", xp),
    saveSetting("marking", marking),
    saveSetting("chatbot", { name: str(form, "chatbot.name") || "FlexCare", greeting: str(form, "chatbot.greeting"), model: str(form, "chatbot.model") || cur.chatbot.model }),
  ]);
  refreshSite();
  redirect("/admin/settings?saved=1");
}
