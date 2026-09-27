import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import {
  FALLBACK_BETA,
  buildPlatformKnowledge,
  buildUserContext,
  claude,
  claudeConfigured,
  systemPrompt,
} from "@/lib/flexcare";

const Body = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4000) }))
    .min(1)
    .max(30),
});

export async function POST(req: Request) {
  const settings = await getSettings();
  if (!settings.features.chatbot) return new Response("Chat is turned off", { status: 403 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response("Bad request", { status: 400 });
  const { messages } = parsed.data;
  const user = await getCurrentUser();
  const question = messages[messages.length - 1].content;

  if (!claudeConfigured()) {
    const answer = await offlineAnswer(question);
    await db.chatLog.create({ data: { userId: user?.id, question, answer } });
    return new Response(answer, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  const [knowledge, userContext] = await Promise.all([buildPlatformKnowledge(), buildUserContext(user?.id)]);

  const stream = claude().beta.messages.stream({
    model: settings.chatbot.model,
    max_tokens: 4000,
    output_config: { effort: "low" },
    betas: [FALLBACK_BETA],
    fallbacks: "default",
    system: [
      { type: "text", text: systemPrompt(settings.chatbot.name, settings.siteName) },
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
        console.error("FlexCare error", err);
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
