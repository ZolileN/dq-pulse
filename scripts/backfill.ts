/**
 * Historical backfill script — not a UI feature.
 *
 * Parses prior ACC1_DS-TB_DQA_tool_v3.xlsx files using the same parser as
 * Excel upload, targeting up to 24 months back per Instructions look-back:
 *   - General DQA: 2 months
 *   - Discharge / outstanding lists: ~7 months
 *   - DSTB cohort outcomes: 12 months
 *   - DRTB cohort outcomes: 24 months
 *
 * Backfilled facility-months are written as reviewed_locked.
 *
 * Usage:
 *   npx tsx scripts/backfill.ts ./path/to/file.xlsx
 *   npx tsx scripts/backfill.ts ./path/to/folder/
 */
import "dotenv/config";
import { readdirSync, readFileSync, statSync } from "fs";
import { resolve, join, extname } from "path";
import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { users } from "../src/lib/db/schema";
import { parseDqaWorkbook } from "../src/lib/excel/parser";
import { saveEntries, upsertFacility } from "../src/lib/entries";

async function processFile(path: string, userId: number) {
  console.log(`Parsing ${path}…`);
  const buffer = readFileSync(path);
  const parsed = await parseDqaWorkbook(buffer);

  if (!parsed.metadata.facilityName || !parsed.metadata.periodDate) {
    console.warn(`  Skipping — missing facility or period (${path})`);
    return;
  }

  const facilityId = await upsertFacility({
    name: parsed.metadata.facilityName,
    district: parsed.metadata.district,
    subDistrict: parsed.metadata.subDistrict,
  });

  await saveEntries({
    facilityId,
    periodDate: parsed.metadata.periodDate,
    rows: parsed.entries,
    entryMethod: "excel_upload",
    userId,
    metadata: {
      activity: parsed.metadata.activity,
      tbType: parsed.metadata.tbType,
      staffName: parsed.metadata.staffName,
      dateOfVisit: parsed.metadata.dateOfVisit,
      authority: parsed.metadata.authority,
    },
    mismatches: parsed.mismatches,
    statusOverride: "reviewed_locked",
  });

  console.log(
    `  Locked ${parsed.metadata.facilityName} / ${parsed.metadata.periodDate} (${parsed.entries.length} rows, ${parsed.mismatches.length} mismatches)`
  );
}

async function main() {
  const target = resolve(process.argv[2] || "./reference");
  const [user] = await db.select().from(users).where(eq(users.role, "merl_officer")).limit(1);
  if (!user) throw new Error("No merl_officer user — run npm run db:seed first");

  const files: string[] = [];
  const st = statSync(target);
  if (st.isDirectory()) {
    for (const name of readdirSync(target)) {
      if (extname(name).toLowerCase() === ".xlsx") files.push(join(target, name));
    }
  } else {
    files.push(target);
  }

  if (!files.length) {
    console.log("No .xlsx files found. Place historical workbooks in reference/ or pass a path.");
    return;
  }

  for (const f of files) {
    await processFile(f, user.id);
  }
  console.log("Backfill complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
