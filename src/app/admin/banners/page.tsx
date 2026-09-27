import { ChevronDown } from "lucide-react";
import { db } from "@/lib/db";
import { Field, PageHeader, Toggle, SubmitButton, Badge } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { saveBanner, deleteBanner } from "../actions";
import type { Banner } from "@/generated/prisma/client";

export const metadata = { title: "Banners & popups" };

const KINDS = {
  HERO: "Home hero billboard",
  MARQUEE: "Running ticker (top strip)",
  POPUP: "Popup on first visit",
  OFFER: "Offer card on home",
} as const;

const dt = (d: Date | null) => (d ? new Date(d.getTime() + 330 * 60_000).toISOString().slice(0, 16) : "");

export default async function Banners() {
  const banners = await db.banner.findMany({ orderBy: [{ kind: "asc" }, { sortOrder: "asc" }] });
  return (
    <div className="max-w-4xl space-y-8">
      <PageHeader title="Banners & popups" subtitle="Promotions across the site. Schedule them and they switch on and off by themselves." />
      {(Object.keys(KINDS) as (keyof typeof KINDS)[]).map((kind) => (
        <section key={kind} className="space-y-3">
          <h2 className="font-bold">{KINDS[kind]}</h2>
          {banners.filter((b) => b.kind === kind).map((b) => (
            <details key={b.id} className="card group overflow-hidden">
              <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
                <span className="size-8 shrink-0 rounded-lg" style={{ background: `linear-gradient(135deg, ${b.colorFrom}, ${b.colorTo})` }} />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{b.title}</span>
                {b.isActive ? <Badge tone="ok">On</Badge> : <Badge>Off</Badge>}
                {b.endsAt && <span className="text-xs text-muted">till {b.endsAt.toLocaleDateString("en-IN")}</span>}
                <ChevronDown className="size-5 transition group-open:rotate-180" />
              </summary>
              <div className="border-t border-border p-4">
                <BannerForm b={b} kind={kind} />
                <div className="mt-3"><ConfirmButton action={deleteBanner.bind(null, b.id)} message="Delete this banner?">Delete</ConfirmButton></div>
              </div>
            </details>
          ))}
          <details className="card group overflow-hidden">
            <summary className="cursor-pointer list-none p-4 text-sm font-bold text-brand">+ Add {KINDS[kind].toLowerCase()}</summary>
            <div className="border-t border-border p-4"><BannerForm b={null} kind={kind} /></div>
          </details>
        </section>
      ))}
    </div>
  );
}

function BannerForm({ b, kind }: { b: Banner | null; kind: string }) {
  return (
    <form action={saveBanner} className="space-y-4">
      {b && <input type="hidden" name="id" value={b.id} />}
      <input type="hidden" name="kind" value={kind} />
      <Field label="Headline"><input name="title" defaultValue={b?.title} required className="input" /></Field>
      {kind !== "MARQUEE" && <Field label="Subtitle"><input name="subtitle" defaultValue={b?.subtitle} className="input" /></Field>}
      <div className="grid gap-4 sm:grid-cols-2">
        {kind !== "MARQUEE" && kind !== "OFFER" && <Field label="Button text"><input name="ctaText" defaultValue={b?.ctaText} className="input" /></Field>}
        <Field label="Link" hint="e.g. /chapter/3d-geometry or /cart?mentorship=1"><input name="ctaHref" defaultValue={b?.ctaHref} className="input" /></Field>
      </div>
      {kind !== "MARQUEE" && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Colour from"><input type="color" name="colorFrom" defaultValue={b?.colorFrom ?? "#FF2E63"} className="input !h-11 !p-1" /></Field>
          <Field label="Colour to"><input type="color" name="colorTo" defaultValue={b?.colorTo ?? "#7C3AED"} className="input !h-11 !p-1" /></Field>
          {kind === "HERO" && <Field label="Background image" hint="Optional, 16:9"><input type="file" name="imageFile" accept="image/*" className="text-xs" /></Field>}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Show from (IST)"><input type="datetime-local" name="startsAt" defaultValue={dt(b?.startsAt ?? null)} className="input" /></Field>
        <Field label="Show until (IST)"><input type="datetime-local" name="endsAt" defaultValue={dt(b?.endsAt ?? null)} className="input" /></Field>
        <Field label="Order"><input type="number" name="sortOrder" defaultValue={b?.sortOrder ?? 0} className="input" /></Field>
      </div>
      <Toggle name="isActive" label="Active" defaultChecked={b?.isActive ?? true} />
      <SubmitButton>{b ? "Save" : "Add"}</SubmitButton>
    </form>
  );
}
