import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { entries, facilities, facilityMonthStatus } from "@/lib/db/schema";
import {
  pivotEntriesToPowerBiRows,
  rowsToCsv,
} from "@/lib/export/powerbi";
import { writeAudit } from "@/lib/audit";

/**
 * Runs after auto-lock to generate Power BI CSV for recently locked months.
 * Stores export via audit log detail (row count); returns CSV body for pipeline use.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const locked = await db
    .select({
      facilityId: facilityMonthStatus.facilityId,
      periodDate: facilityMonthStatus.periodDate,
      activity: facilityMonthStatus.activity,
      tbType: facilityMonthStatus.tbType,
      staffName: facilityMonthStatus.staffName,
      dateOfVisit: facilityMonthStatus.dateOfVisit,
      authority: facilityMonthStatus.authority,
      facilityName: facilities.name,
      district: facilities.district,
      subDistrict: facilities.subDistrict,
    })
    .from(facilityMonthStatus)
    .innerJoin(facilities, eq(facilities.id, facilityMonthStatus.facilityId))
    .where(eq(facilityMonthStatus.status, "reviewed_locked"));

  const byPeriod = new Map<string, typeof locked>();
  for (const row of locked) {
    const list = byPeriod.get(row.periodDate) ?? [];
    list.push(row);
    byPeriod.set(row.periodDate, list);
  }

  const summaries: { periodDate: string; rows: number }[] = [];

  for (const [periodDate, facilitiesForPeriod] of byPeriod) {
    const facilityIds = facilitiesForPeriod.map((f) => f.facilityId);
    const entryRows = await db
      .select()
      .from(entries)
      .where(
        and(
          eq(entries.periodDate, periodDate),
          inArray(entries.facilityId, facilityIds)
        )
      );

    const meta = new Map(facilitiesForPeriod.map((f) => [f.facilityId, f]));
    const flat = entryRows.map((e) => {
      const m = meta.get(e.facilityId)!;
      return {
        facilityName: m.facilityName,
        district: m.district,
        subDistrict: m.subDistrict,
        activity: m.activity,
        tbType: m.tbType,
        staffName: m.staffName,
        dateOfVisit: m.dateOfVisit,
        authority: m.authority,
        stage: e.stage,
        dataType: e.dataType,
        ageGroup: e.ageGroup,
        indicator: e.indicator,
        source: e.source,
        value: Number(e.value),
        comments: e.comments,
      };
    });

    const rows = pivotEntriesToPowerBiRows(flat);
    const csv = rowsToCsv(rows);

    await db
      .update(facilityMonthStatus)
      .set({ status: "exported" })
      .where(
        and(
          eq(facilityMonthStatus.periodDate, periodDate),
          inArray(facilityMonthStatus.facilityId, facilityIds)
        )
      );

    await writeAudit({
      entity: "facility_month_status",
      entityId: `export:${periodDate}`,
      action: "export",
      performedBy: null,
      detail: {
        reason: "scheduled-export-after-auto-lock",
        rowCount: rows.length,
        csvBytes: csv.length,
      },
    });

    summaries.push({ periodDate, rows: rows.length });
  }

  return NextResponse.json({ ok: true, exports: summaries });
}
