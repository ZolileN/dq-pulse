/**
 * Remove synthetic programme data injected by the legacy db:seed script.
 * Keeps real uploads (excel_upload) and web capture from live users.
 *
 * Usage: npm run db:clear-demo-data
 */
import "dotenv/config";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../src/lib/db";
import {
  entries,
  facilities,
  facilityMonthStatus,
} from "../src/lib/db/schema";
import {
  DEMO_SEED_ACTIVITY,
  DEMO_SEED_FACILITIES,
  DEMO_SEED_PERIODS,
  DEMO_SEED_STAFF_NAME,
} from "./demo-seed-criteria";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");

  const demoFacilities = await db
    .select({ id: facilities.id, name: facilities.name })
    .from(facilities)
    .where(inArray(facilities.name, [...DEMO_SEED_FACILITIES]));

  if (demoFacilities.length === 0) {
    console.log("No demo seed facilities found — nothing to clear.");
    return;
  }

  const facilityIds = demoFacilities.map((f) => f.id);

  const demoMonths = await db
    .select({
      facilityId: facilityMonthStatus.facilityId,
      periodDate: facilityMonthStatus.periodDate,
    })
    .from(facilityMonthStatus)
    .where(
      and(
        inArray(facilityMonthStatus.facilityId, facilityIds),
        inArray(facilityMonthStatus.periodDate, [...DEMO_SEED_PERIODS]),
        eq(facilityMonthStatus.activity, DEMO_SEED_ACTIVITY),
        eq(facilityMonthStatus.staffName, DEMO_SEED_STAFF_NAME)
      )
    );

  if (demoMonths.length === 0) {
    console.log("No demo facility-months found — database is already clean.");
    return;
  }

  let deletedEntryCount = 0;
  for (const month of demoMonths) {
    const removed = await db
      .delete(entries)
      .where(
        and(
          eq(entries.facilityId, month.facilityId),
          eq(entries.periodDate, month.periodDate)
        )
      )
      .returning({ id: entries.id });
    deletedEntryCount += removed.length;
  }

  const deletedStatus = await db
    .delete(facilityMonthStatus)
    .where(
      and(
        inArray(facilityMonthStatus.facilityId, facilityIds),
        inArray(facilityMonthStatus.periodDate, [...DEMO_SEED_PERIODS]),
        eq(facilityMonthStatus.activity, DEMO_SEED_ACTIVITY),
        eq(facilityMonthStatus.staffName, DEMO_SEED_STAFF_NAME)
      )
    )
    .returning({
      facilityId: facilityMonthStatus.facilityId,
      periodDate: facilityMonthStatus.periodDate,
    });

  console.log(
    `Removed ${deletedEntryCount} entries across ${deletedStatus.length} demo facility-months.`
  );
  console.log(
    "Real data from uploads (excel_upload) and web capture is unchanged."
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
