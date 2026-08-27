import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLog, facilityMonthStatus } from "@/lib/db/schema";

export async function writeAudit(params: {
  entity: string;
  entityId: string;
  action: string;
  performedBy?: number | null;
  detail?: unknown;
}) {
  await db.insert(auditLog).values({
    entity: params.entity,
    entityId: params.entityId,
    action: params.action,
    performedBy: params.performedBy ?? null,
    detail: params.detail ?? null,
  });
}

export async function assertFacilityMonthWritable(
  facilityId: number,
  periodDate: string
) {
  const [row] = await db
    .select()
    .from(facilityMonthStatus)
    .where(
      and(
        eq(facilityMonthStatus.facilityId, facilityId),
        eq(facilityMonthStatus.periodDate, periodDate)
      )
    )
    .limit(1);

  if (row && (row.status === "reviewed_locked" || row.status === "exported")) {
    throw new Response(
      JSON.stringify({
        error: "Facility-month is locked. Use a correction in the current month instead of editing locked data.",
      }),
      { status: 423 }
    );
  }
  return row;
}
