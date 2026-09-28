// Reset (or create) the admin account's password.
// Usage: ADMIN_PASSWORD='...' [ADMIN_EMAIL=...] npx tsx prisma/set-admin-password.ts
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@mathflex.in").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < 8) throw new Error("Set ADMIN_PASSWORD (8+ chars).");

  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await db.user.upsert({
    where: { email },
    create: { name: "MathFlex Admin", email, passwordHash, role: "ADMIN", avatarColor: "#8B5CF6" },
    update: { passwordHash, role: "ADMIN", isBlocked: false },
  });
  console.log(`Admin password set for ${user.email} (database: ${new URL(process.env.DATABASE_URL!).host}).`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
