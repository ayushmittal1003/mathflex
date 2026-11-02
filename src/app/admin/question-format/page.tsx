import { requireStaff } from "@/lib/auth";
import { Card, PageHeader } from "@/components/admin/ui";
import { CopyBox } from "@/components/admin/CopyBox";
import { MathText } from "@/components/MathText";
import { AI_PROMPT, TEMPLATE } from "@/lib/question-import/format-guide";

export const metadata = { title: "Question file format" };

export default async function QuestionFormatPage() {
  await requireStaff("questions");
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Question file format" subtitle="A file in this format imports every question, answer and explanation, with correct maths for students." />
      <Card title="How to use it">
        <ol className="list-decimal space-y-2 pl-5 text-sm">
          <li>Copy the prompt below into Claude or ChatGPT and attach your DPP or PYQ PDF. It returns the file in this format.</li>
          <li>Save the result as a <b>.txt</b> file, or paste it into Word and save as <b>.docx</b>. A PDF of it also works, but text or Word is the most reliable.</li>
          <li>Open the chapter, go to DPPs &amp; PYQs, upload it in the DPP or PYQ section, and press Import.</li>
        </ol>
        <p className="mt-3 text-sm text-muted">Anything wrong is listed with its question and line number before anything goes live. Search the file for [UNCLEAR] and [MISSING] first: those are spots the AI couldn&apos;t read, and they will be reported until they are fixed.</p>
      </Card>
      <Card title="Prompt for Claude or ChatGPT"><CopyBox text={AI_PROMPT} label="Copy prompt" /></Card>
      <Card title="Template"><CopyBox text={TEMPLATE} label="Copy template" filename="mathflex-question-template.txt" /></Card>
      <Card title="How maths appears to students">
        <div className="space-y-2 text-sm">
          <p className="font-mono text-xs text-muted">{String.raw`$\vec{a} \cdot \vec{b} = |\vec{a}||\vec{b}|\cos\theta$`}</p>
          <p><MathText text={String.raw`$\vec{a} \cdot \vec{b} = |\vec{a}||\vec{b}|\cos\theta$`} /></p>
          <p className="font-mono text-xs text-muted">{String.raw`$$\int_0^1 x^2\,dx = \frac{1}{3}$$`}</p>
          <MathText as="div" text={String.raw`$$\int_0^1 x^2\,dx = \frac{1}{3}$$`} />
        </div>
      </Card>
    </div>
  );
}
