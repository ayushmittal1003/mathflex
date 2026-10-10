import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import * as schema from "@/lib/seo/schema";
import { cx } from "./ui";

export type Crumb = { name: string; path: string };

// Small muted trail under the nav (Home › Chapters › Functions). The last item is the
// current page (not a link). One line on every width: the trail can shrink and the current
// page's name is truncated, so it never wraps or pushes the hero down on phones.
// `schemaOn` adds the matching BreadcrumbList JSON-LD; turn it off on noindex pages.
export function Breadcrumbs({ items, className, schemaOn = true }: { items: Crumb[]; className?: string; schemaOn?: boolean }) {
  return (
    <>
      {schemaOn && <JsonLd data={schema.breadcrumbs(items)} />}
      <nav aria-label="Breadcrumb" className={cx("min-w-0 text-[13px] font-semibold text-muted-foreground", className)}>
        <ol className="flex items-center gap-1.5 whitespace-nowrap">
          {items.map((c, i) => {
            const last = i === items.length - 1;
            return (
              <li key={c.path} className={cx("flex items-center gap-1.5", last ? "min-w-0" : "shrink-0")}>
                {last ? (
                  <span aria-current="page" className="truncate text-secondary-foreground">{c.name}</span>
                ) : (
                  <>
                    <Link href={c.path} className="rounded-sm hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">{c.name}</Link>
                    <span aria-hidden>›</span>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
