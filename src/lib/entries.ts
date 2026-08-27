import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  entries,
  facilities,
  facilityMonthStatus,
  type MismatchFlag,
} from "@/lib/db/schema";
import { writeAudit, assertFacilityMonthWritable } from "@/lib/audit";
import type { ParsedEntry } from "@/lib/excel/parser";

export async function upsertFacility(params: {
  name: string;
  district?: string | null;
  subDistrict?: string | null;
}) {
  const existing = await db
    .select()
    .from(facilities)
    .where(eq(facilities.name, params.name))
    .limit(1);
  if (existing[0]) {
    if (params.district || params.subDistrict) {
      await db
        .update(facilities)
        .set({
          district: params.district ?? existing[0].district,
          subDistrict: params.subDistrict ?? existing[0].subDistrict,
        })
        .where(eq(facilities.id, existing[0].id));
    }
    return existing[0].id;
  }
  const [row] = await db
    .insert(facilities)
    .values({
      name: params.name,
      district: params.district ?? null,
      subDistrict: params.subDistrict ?? null,
    })
    .returning({ id: facilities.id });
  return row.id;
}

export async function saveEntries(params: {
  facilityId: number;
  periodDate: string;
  rows: ParsedEntry[];
  entryMethod: "web_form" | "excel_upload" | "correction";
  userId: number;
  metadata?: {
    activity?: string | null;
    tbType?: string | null;
    staffName?: string | null;
    dateOfVisit?: string | null;
    authority?: string | null;
  };
  mismatches?: MismatchFlag[];
  statusOverride?: "submitted" | "reviewed_locked";
  isCorrection?: boolean;
  correctionOfPeriodDate?: string | null;
}) {
  if (!params.isCorrection) {
    await assertFacilityMonthWritable(params.facilityId, params.periodDate);
  }

  // Replace non-correction entries for this facility-month on fresh submit
  if (!params.isCorrection) {
    await db
      .delete(entries)
      .where(
        and(
          eq(entries.facilityId, params.facilityId),
          eq(entries.periodDate, params.periodDate),
          eq(entries.isCorrection, false)
        )
      );
  }

  if (params.rows.length) {
    await db.insert(entries).values(
      params.rows.map((r) => ({
        facilityId: params.facilityId,
        periodDate: params.isCorrection
          ? params.periodDate
          : params.periodDate,
        dataType: r.dataType,
        ageGroup: r.ageGroup,
        indicator: r.indicator,
        source: r.source,
        stage: r.stage,
        value: String(r.value),
        entryMethod: params.entryMethod,
        isCorrection: !!params.isCorrection,
        correctionOfPeriodDate: params.correctionOfPeriodDate ?? null,
        capturedBy: params.userId,
        comments: r.comments ?? null,
      }))
    );
  }

  const status = params.statusOverride ?? "submitted";
  await db
    .insert(facilityMonthStatus)
    .values({
      facilityId: params.facilityId,
      periodDate: params.periodDate,
      status,
      activity: params.metadata?.activity ?? null,
      tbType: params.metadata?.tbType ?? null,
      staffName: params.metadata?.staffName ?? null,
      dateOfVisit: params.metadata?.dateOfVisit ?? null,
      authority: params.metadata?.authority ?? null,
      mismatches: params.mismatches ?? [],
      lockedBy: status === "reviewed_locked" ? params.userId : null,
      lockedAt: status === "reviewed_locked" ? new Date() : null,
    })
    .onConflictDoUpdate({
      target: [facilityMonthStatus.facilityId, facilityMonthStatus.periodDate],
      set: {
        status,
        activity: params.metadata?.activity ?? null,
        tbType: params.metadata?.tbType ?? null,
        staffName: params.metadata?.staffName ?? null,
        dateOfVisit: params.metadata?.dateOfVisit ?? null,
        authority: params.metadata?.authority ?? null,
        mismatches: params.mismatches ?? [],
        ...(status === "reviewed_locked"
          ? { lockedBy: params.userId, lockedAt: new Date() }
          : {}),
      },
    });

  await writeAudit({
    entity: "facility_month_status",
    entityId: `${params.facilityId}:${params.periodDate}`,
    action: params.isCorrection ? "correction" : "create",
    performedBy: params.userId,
    detail: {
      entryMethod: params.entryMethod,
      rowCount: params.rows.length,
      mismatchCount: params.mismatches?.length ?? 0,
      status,
      correctionOfPeriodDate: params.correctionOfPeriodDate,
      sample: params.rows.slice(0, 5),
    },
  });

  // One summary audit row for entry batch (avoid N+1 HTTP round-trips)
  await writeAudit({
    entity: "entry",
    entityId: `${params.facilityId}:${params.periodDate}`,
    action: params.isCorrection ? "correction" : "create",
    performedBy: params.userId,
    detail: {
      count: params.rows.length,
      entryMethod: params.entryMethod,
    },
  });
}
