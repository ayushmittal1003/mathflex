import { db } from "./db";
import type { BannerKind } from "@/generated/prisma/enums";

export function activeBanners(kind: BannerKind) {
  const now = new Date();
  return db.banner.findMany({
    where: {
      kind,
      isActive: true,
      AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
}
