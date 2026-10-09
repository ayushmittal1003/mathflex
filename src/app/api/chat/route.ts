import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { allow, clientIp } from "@/lib/rate-limit";
import {
  FALLBACK_BETA,
  buildPlatformKnowledge,
  buildUserContext,
  claude,
  claudeConfigured,
  systemPrompt,
} from "@/lib/flexcare";

// Screenshots of problems: only the newest user message's images are sent to the model. The widget
// shrinks them first, so a few hundred KB each; the caps below keep a request under the host's body limit.
const Image = z.object({
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  data: z.string().regex(/^[A-Za-z0-9+/=]+$/).max(1_400_000),
});
const Body = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000), images: z.array(Image).max(3).optional() }))
    .min(1)
    .max(30)
    .refine((m) => m.every((x) => x.content.length > 0 || (x.images?.length ?? 0) > 0), "empty message")
    .refine((m) => m.reduce((n, x) => n + (x.images?.reduce((k, i) => k + i.data.length, 0) ?? 0), 0) < 3_800_000, "images too large"),
});

export const maxDuration = 60;

export async function POST(req: Request) {
  const settings = await getSettings();
  if (!settings.features.chatbot) return new Response("Chat is turned off", { status: 403 });

  // The chatbot costs money per message: 15 a minute and 120 an hour per visitor (signed-in or not).
  const who = (await getCurrentUser())?.id ?? `ip:${await clientIp()}`;
  if (!(await allow(`chat:m:${who}`, 15, 60)) || !(await allow(`chat:h:${who}`, 120, 3600))) {
    return new Response("You're sending messages too fast. Please wait a minute and try again.", { status: 429 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response("Bad request", { status: 400 });
  const { messages: raw } = parsed.data;
  const user = await getCurrentUser();
  const last = raw[raw.length - 1];
  const attached = last.role === "user" ? (last.images?.length ?? 0) : 0;
  const question = `${last.content}${attached ? ` [${attached} image${attached > 1 ? "s" : ""} attached]` : ""}`.trim();
  // Earlier turns go as text only; the newest user message carries its images.
  const messages = raw.map((m, i) => {
    const imgs = i === raw.length - 1 && m.role === "user" ? (m.images ?? []) : [];
    const text = m.content || "Please solve the problem in this image, step by step.";
    if (!imgs.length) return { role: m.role, content: m.content || "(sent an image)" };
    return {
      role: m.role,
      content: [
        ...imgs.map((im) => ({ type: "image" as const, source: { type: "base64" as const, media_type: im.mediaType, data: im.data } })),
        { type: "text" as const, text },
      ],
    };
  });

  if (!claudeConfigured()) {
    const answer = attached ? "I can't read images in offline mode. Please type the problem, or contact the team." : await offlineAnswer(question);
    await db.chatLog.create({ data: { userId: user?.id, question, answer } });
    return new Response(answer, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  const [knowledge, userContext] = await Promise.all([buildPlatformKnowledge(), buildUserContext(user?.id)]);

  const stream = claude().beta.messages.stream({
    model: settings.chatbot.model,
    max_tokens: 4000,
    output_config: { effort: "medium" },
    betas: [FALLBACK_BETA],
    fallbacks: "default",
    system: [
      { type: "text", text: systemPrompt(settings.chatbot.name, settings.siteName, settings.chatbot.instructions) },
      // Platform knowledge is identical for every student -> cached.
      { type: "text", text: knowledge, cache_control: { type: "ephemeral" } },
      // Per-student context goes after the breakpoint so it doesn't break the cache.
      { type: "text", text: userContext },
    ],
    messages,
  });

  const encoder = new TextEncoder();
  let answer = "";
  const body = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            answer += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal" && !answer) {
          answer = `I can't help with that one. For anything about your account, reach us at ${settings.supportEmail}.`;
          controller.enqueue(encoder.encode(answer));
        }
      } catch (err) {
        console.error("MathMate error", err);
        const msg = `\n\nSorry, I'm having trouble right now. Please try again, or WhatsApp us at +${settings.whatsappNumber}.`;
        answer += msg;
        controller.enqueue(encoder.encode(msg));
      } finally {
        controller.close();
        await db.chatLog.create({ data: { userId: user?.id, question, answer } }).catch(() => {});
      }
    },
  });
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}

// Works without an API key: keyword match over the admin FAQ + chapter catalogue.
async function offlineAnswer(q: string) {
  const s = await getSettings();
  const text = q.toLowerCase();
  const faqs = await db.knowledgeEntry.findMany({ where: { isActive: true } });
  const words = text.split(/\W+/).filter((w) => w.length > 3);
  const best = faqs
    .map((f) => ({ f, score: words.filter((w) => f.question.toLowerCase().includes(w)).length }))
    .sort((a, b) => b.score - a.score)[0];
  if (best && best.score > 0) return best.f.answer;
  const chapters = await db.chapter.findMany({ where: { isPublished: true } });
  const hit = chapters.find((c) => text.includes(c.title.toLowerCase().split(" ")[0]));
  if (hit) return `${hit.title} is ₹${hit.price} (MRP ₹${hit.mrp}) with ~${hit.jeeWeightage}% JEE weightage. Check it out at /chapter/${hit.slug}`;
  return `I'm in offline mode right now. You can browse chapters on the home page, or reach the team at ${s.supportEmail} / WhatsApp +${s.whatsappNumber}.`;
}
