/**
 * Sync facilities table to the official NMBHD list.
 * Removes facilities not in the list (and their dependent data).
 *
 * Usage: npx tsx scripts/sync-nmb-facilities.ts
 */
import "dotenv/config";
import { eq, notInArray } from "drizzle-orm";
import { db } from "../src/lib/db";
import {
  entries,
  facilities,
  facilityMonthStatus,
} from "../src/lib/db/schema";
import { NMB_DISTRICT, NMB_FACILITIES } from "../src/lib/nmb-facilities";
import { upsertFacility } from "../src/lib/entries";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");

  const allowedNames = NMB_FACILITIES.map((f) => f.name);

  for (const f of NMB_FACILITIES) {
    await upsertFacility({
      name: f.name,
      district: NMB_DISTRICT,
      subDistrict: f.subDistrict,
    });
  }

  const toRemove = await db
    .select()
    .from(facilities)
    .where(notInArray(facilities.name, allowedNames));

  for (const fac of toRemove) {
    await db.delete(entries).where(eq(entries.facilityId, fac.id));
    await db
      .delete(facilityMonthStatus)
      .where(eq(facilityMonthStatus.facilityId, fac.id));
    await db.delete(facilities).where(eq(facilities.id, fac.id));
    console.log(`Removed: ${fac.name}`);
  }

  const remaining = await db.select().from(facilities);
  console.log(`Synced ${remaining.length} NMB facilities.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
