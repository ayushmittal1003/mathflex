import { Mail, MessageCircle } from "lucide-react";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Contact us", alternates: { canonical: "/contact" } };

export default async function ContactPage() {
  const { supportEmail, whatsappNumber } = await getSettings();
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 md:px-8 md:py-16">
      <h1 className="text-4xl font-extrabold">Contact us</h1>
      <p className="mt-3 leading-relaxed text-muted">
        Questions about a chapter, a payment, your access or your account? Write to us and we will get back to you as soon as we can, usually within one working day.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <a href={`mailto:${supportEmail}`} className="card flex items-start gap-3 p-5">
          <Mail className="mt-0.5 shrink-0 text-brand" />
          <span><span className="block font-bold">Email</span><span className="text-sm text-muted">{supportEmail}</span></span>
        </a>
        <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer" className="card flex items-start gap-3 p-5">
          <MessageCircle className="mt-0.5 shrink-0 text-brand" />
          <span><span className="block font-bold">WhatsApp</span><span className="text-sm text-muted">Chat with our team</span></span>
        </a>
      </div>
      <h2 className="mt-10 text-xl font-bold">Include these for a faster reply</h2>
      <ul className="mt-3 list-disc space-y-1.5 pl-6 text-muted">
        <li>Your name and registered email or mobile number</li>
        <li>Your order number, for payment or access issues</li>
        <li>A screenshot of the problem, if any</li>
      </ul>
      <p className="mt-8 text-sm text-muted">
        Website: <a href="https://mathflex.in" className="font-semibold text-brand underline">mathflex.in</a>. For privacy requests, write to the same address with the subject “Privacy Policy / Data Protection Request”.
      </p>
    </article>
  );
}
