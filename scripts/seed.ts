import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";
import { users } from "../src/lib/db/schema";

/**
 * Bootstrap dev users only. Programme data must come from /upload or /entry.
 * Sync facilities separately: npm run db:sync-facilities
 */
async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");

  const existingUsers = await db.select().from(users);
  if (existingUsers.length > 0) {
    console.log("Users already exist — skipping user seed.");
    return;
  }

  const hash = await bcrypt.hash("dqa-demo-2024", 10);
  await db.insert(users).values([
    {
      name: "Demo DQM",
      email: "dqm@aurum.org.za",
      role: "dqm",
      passwordHash: hash,
    },
    {
      name: "Demo MERL Officer",
      email: "merl@aurum.org.za",
      role: "merl_officer",
      passwordHash: hash,
    },
  ]);

  console.log("Seeded dev users (dqm + merl_officer).");
  console.log("Run npm run db:sync-facilities to load the NMB facility list.");
  console.log("Programme data: capture via /entry or /upload, or npm run db:backfill.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
