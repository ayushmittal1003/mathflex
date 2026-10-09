import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getSettings, BOT_PROMPT_MAX } from "@/lib/settings";
import { allow } from "@/lib/rate-limit";
import { FALLBACK_BETA, buildPlatformKnowledge, claude, claudeConfigured, systemPrompt } from "@/lib/flexcare";

const Body = z.object({
  prompt: z.string().max(BOT_PROMPT_MAX),
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4000) })).min(1).max(20),
});

export const maxDuration = 60;

// Team-only test chat: answers with the base prompt currently in the editor (draft or published),
// so changes can be tried before students see them. Not logged and not shown to students.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "flexcare")) return Response.json({ error: "Not allowed" }, { status: 403 });
  if (!(await allow(`playground:${user.id}`, 40, 600))) return Response.json({ error: "Slow down a little, then try again." }, { status: 429 });
  if (!claudeConfigured()) return Response.json({ error: "Add ANTHROPIC_API_KEY to the server environment to test the AI." }, { status: 400 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Bad request" }, { status: 400 });
  const settings = await getSettings();
  try {
    const res = await claude().beta.messages.create({
      model: settings.chatbot.model,
      max_tokens: 2000,
      output_config: { effort: "low" },
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      system: [
        { type: "text", text: systemPrompt(settings.chatbot.name, settings.siteName, parsed.data.prompt) },
        { type: "text", text: await buildPlatformKnowledge(), cache_control: { type: "ephemeral" } },
        { type: "text", text: "The tester is a team member, not a student: there is no student progress to talk about." },
      ],
      messages: parsed.data.messages,
    });
    const answer = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
    return Response.json({ answer: answer || "(no answer)" });
  } catch (e) {
    console.error("[playground]", e);
    return Response.json({ error: "The model call failed. Check the API key and model name." }, { status: 502 });
  }
}
