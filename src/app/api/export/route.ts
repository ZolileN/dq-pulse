import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { requireRole, requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { entries, facilities, facilityMonthStatus } from "@/lib/db/schema";
import {
  pivotEntriesToPowerBiRows,
  rowsToCsv,
} from "@/lib/export/powerbi";
import { writeAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    await requireRole(["merl_officer"]);
    const periodDate = new URL(req.url).searchParams.get("periodDate");
    if (!periodDate) {
      return NextResponse.json({ error: "periodDate required" }, { status: 400 });
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
      .where(
        and(
          eq(facilityMonthStatus.periodDate, periodDate),
          inArray(facilityMonthStatus.status, ["reviewed_locked", "exported"])
        )
      );

    if (!locked.length) {
      const csv = rowsToCsv([]);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="dqa-export-${periodDate}.csv"`,
        },
      });
    }

    const facilityIds = locked.map((l) => l.facilityId);
    const entryRows = await db
      .select()
      .from(entries)
      .where(
        and(
          eq(entries.periodDate, periodDate),
          inArray(entries.facilityId, facilityIds)
        )
      );

    const metaByFacility = new Map(locked.map((l) => [l.facilityId, l]));
    const flat = entryRows.map((e) => {
      const m = metaByFacility.get(e.facilityId)!;
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

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="dqa-export-${periodDate}.csv"`,
      },
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const { periodDate } = await req.json();
    await writeAudit({
      entity: "facility_month_status",
      entityId: `export:${periodDate}`,
      action: "export",
      performedBy: Number(session.user.id),
      detail: { periodDate },
    });
    const url = new URL(req.url);
    url.searchParams.set("periodDate", periodDate);
    return GET(new NextRequest(url));
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
