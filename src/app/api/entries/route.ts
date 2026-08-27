import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { saveEntries, upsertFacility } from "@/lib/entries";
import { withDstbComputedRows } from "@/lib/dstb-computed";
import { db } from "@/lib/db";
import { entries, facilities } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

const entrySchema = z.object({
  facilityId: z.number().int().optional(),
  facilityName: z.string().optional(),
  district: z.string().optional().nullable(),
  subDistrict: z.string().optional().nullable(),
  periodDate: z.string(),
  entryMethod: z.enum(["web_form", "correction"]).default("web_form"),
  isCorrection: z.boolean().optional(),
  correctionOfPeriodDate: z.string().optional().nullable(),
  metadata: z
    .object({
      activity: z.string().optional().nullable(),
      tbType: z.string().optional().nullable(),
      staffName: z.string().optional().nullable(),
      dateOfVisit: z.string().optional().nullable(),
      authority: z.string().optional().nullable(),
    })
    .optional(),
  rows: z.array(
    z.object({
      dataType: z.string(),
      ageGroup: z.string(),
      indicator: z.string(),
      source: z.string(),
      stage: z.enum(["before", "after"]),
      value: z.number(),
      comments: z.string().optional(),
    })
  ),
  mismatches: z
    .array(
      z.object({
        indicator: z.string(),
        ageGroup: z.string(),
        stage: z.enum(["before", "after"]),
        sources: z.record(z.string(), z.number().nullable()),
        message: z.string(),
      })
    )
    .optional(),
  replaceScope: z
    .object({
      dataTypes: z.array(z.string()).optional(),
      stage: z.enum(["before", "after"]).optional(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = entrySchema.parse(await req.json());

    let facilityId = body.facilityId;
    if (!facilityId) {
      if (!body.facilityName) {
        return NextResponse.json({ error: "facilityId or facilityName required" }, { status: 400 });
      }
      facilityId = await upsertFacility({
        name: body.facilityName,
        district: body.district,
        subDistrict: body.subDistrict,
      });
    }

    await saveEntries({
      facilityId,
      periodDate: body.periodDate,
      rows: withDstbComputedRows(body.rows),
      entryMethod: body.isCorrection ? "correction" : body.entryMethod,
      userId: Number(session.user.id),
      metadata: body.metadata,
      mismatches: body.mismatches,
      isCorrection: body.isCorrection,
      correctionOfPeriodDate: body.correctionOfPeriodDate,
      replaceScope: body.replaceScope,
    });

    return NextResponse.json({ ok: true, facilityId });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to save entries" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const facilityId = searchParams.get("facilityId");
    const periodDate = searchParams.get("periodDate");
    if (!facilityId || !periodDate) {
      return NextResponse.json({ error: "facilityId and periodDate required" }, { status: 400 });
    }

    const rows = await db
      .select()
      .from(entries)
      .where(
        and(
          eq(entries.facilityId, Number(facilityId)),
          eq(entries.periodDate, periodDate)
        )
      );

    const [facility] = await db
      .select()
      .from(facilities)
      .where(eq(facilities.id, Number(facilityId)))
      .limit(1);

    return NextResponse.json({ facility, rows });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
