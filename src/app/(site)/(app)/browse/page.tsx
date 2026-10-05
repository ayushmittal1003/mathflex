import { redirect } from "next/navigation";

// The chapter listing moved to /chapters (redesign). Old links and bookmarks keep working,
// with their search, class and sort filters.
export default async function Browse({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const sp = new URLSearchParams();
  for (const key of ["q", "class", "sort"]) {
    const v = params[key];
    if (typeof v === "string" && v) sp.set(key, v);
  }
  redirect(`/chapters${sp.size ? `?${sp}` : ""}`);
}
