import { NextRequest, NextResponse } from "next/server";
import { and, eq, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { facilityMonthStatus } from "@/lib/db/schema";
import { writeAudit } from "@/lib/audit";

/**
 * Auto-lock: months lock after the 10th of the following month.
 * Schedule: daily via Vercel Cron.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Lock any submitted facility-month whose period is before the previous month
  // once today's day-of-month is > 10, OR any period older than that.
  const today = new Date();
  const day = today.getUTCDate();

  // Threshold: first day of previous calendar month when day > 10,
  // else first day of month before that.
  const threshold = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  if (day > 10) {
    // previous month's data should lock after 10th of current month
    threshold.setUTCMonth(threshold.getUTCMonth() - 1);
  } else {
    threshold.setUTCMonth(threshold.getUTCMonth() - 2);
  }
  const thresholdDate = threshold.toISOString().slice(0, 10);

  const toLock = await db
    .select()
    .from(facilityMonthStatus)
    .where(
      and(
        eq(facilityMonthStatus.status, "submitted"),
        lt(facilityMonthStatus.periodDate, thresholdDate)
      )
    );

  for (const row of toLock) {
    await db
      .update(facilityMonthStatus)
      .set({
        status: "reviewed_locked",
        lockedAt: new Date(),
        lockedBy: null,
      })
      .where(
        and(
          eq(facilityMonthStatus.facilityId, row.facilityId),
          eq(facilityMonthStatus.periodDate, row.periodDate)
        )
      );

    await writeAudit({
      entity: "facility_month_status",
      entityId: `${row.facilityId}:${row.periodDate}`,
      action: "lock",
      performedBy: null,
      detail: { reason: "auto-lock", thresholdDate },
    });
  }

  return NextResponse.json({
    ok: true,
    locked: toLock.length,
    thresholdDate,
  });
}
