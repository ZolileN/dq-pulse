import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { requireRole, requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { facilities, facilityMonthStatus, entries } from "@/lib/db/schema";
import { writeAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const periodDate = new URL(req.url).searchParams.get("periodDate");
    const status = new URL(req.url).searchParams.get("status") ?? "submitted";

    const conditions = [];
    if (periodDate) conditions.push(eq(facilityMonthStatus.periodDate, periodDate));
    if (status !== "all") conditions.push(eq(facilityMonthStatus.status, status));

    const rows = await db
      .select({
        facilityId: facilityMonthStatus.facilityId,
        periodDate: facilityMonthStatus.periodDate,
        status: facilityMonthStatus.status,
        lockedBy: facilityMonthStatus.lockedBy,
        lockedAt: facilityMonthStatus.lockedAt,
        staffName: facilityMonthStatus.staffName,
        mismatches: facilityMonthStatus.mismatches,
        facilityName: facilities.name,
        district: facilities.district,
        subDistrict: facilities.subDistrict,
      })
      .from(facilityMonthStatus)
      .innerJoin(facilities, eq(facilities.id, facilityMonthStatus.facilityId))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(facilityMonthStatus.periodDate, facilities.name);

    return NextResponse.json({ rows });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(["merl_officer"]);
    const body = await req.json();
    const { facilityId, periodDate, action } = body as {
      facilityId: number;
      periodDate: string;
      action: "lock" | "export_mark";
    };

    if (!facilityId || !periodDate || !action) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (action === "lock") {
      await db
        .update(facilityMonthStatus)
        .set({
          status: "reviewed_locked",
          lockedBy: Number(session.user.id),
          lockedAt: new Date(),
        })
        .where(
          and(
            eq(facilityMonthStatus.facilityId, facilityId),
            eq(facilityMonthStatus.periodDate, periodDate)
          )
        );

      await writeAudit({
        entity: "facility_month_status",
        entityId: `${facilityId}:${periodDate}`,
        action: "lock",
        performedBy: Number(session.user.id),
        detail: { status: "reviewed_locked" },
      });

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/** Detail for one facility-month including entries */
export async function PUT(req: NextRequest) {
  try {
    await requireSession();
    const { facilityId, periodDate } = await req.json();
    const entryRows = await db
      .select()
      .from(entries)
      .where(
        and(
          eq(entries.facilityId, facilityId),
          eq(entries.periodDate, periodDate)
        )
      );
    const [status] = await db
      .select()
      .from(facilityMonthStatus)
      .where(
        and(
          eq(facilityMonthStatus.facilityId, facilityId),
          eq(facilityMonthStatus.periodDate, periodDate)
        )
      )
      .limit(1);
    return NextResponse.json({ status, entries: entryRows });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
