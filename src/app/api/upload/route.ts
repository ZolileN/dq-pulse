import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { parseDqaWorkbook } from "@/lib/excel/parser";
import { saveEntries, upsertFacility } from "@/lib/entries";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseDqaWorkbook(buffer);

    if (!parsed.metadata.facilityName) {
      return NextResponse.json(
        { error: "Could not determine facility name from workbook metadata." },
        { status: 400 }
      );
    }
    if (!parsed.metadata.periodDate) {
      return NextResponse.json(
        {
          error:
            "Could not determine reporting month from workbook. Set 'Two months back: specify month' to a date.",
        },
        { status: 400 }
      );
    }

    const facilityId = await upsertFacility({
      name: parsed.metadata.facilityName,
      district: parsed.metadata.district,
      subDistrict: parsed.metadata.subDistrict,
    });

    const dryRun = form.get("dryRun") === "true";
    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        facilityId,
        metadata: parsed.metadata,
        entryCount: parsed.entries.length,
        mismatches: parsed.mismatches,
        warnings: parsed.warnings,
        sample: parsed.entries.slice(0, 20),
      });
    }

    await saveEntries({
      facilityId,
      periodDate: parsed.metadata.periodDate,
      rows: parsed.entries,
      entryMethod: "excel_upload",
      userId: Number(session.user.id),
      metadata: {
        activity: parsed.metadata.activity,
        tbType: parsed.metadata.tbType,
        staffName: parsed.metadata.staffName,
        dateOfVisit: parsed.metadata.dateOfVisit,
        authority: parsed.metadata.authority,
      },
      mismatches: parsed.mismatches,
    });

    return NextResponse.json({
      ok: true,
      facilityId,
      periodDate: parsed.metadata.periodDate,
      entryCount: parsed.entries.length,
      mismatches: parsed.mismatches,
      warnings: parsed.warnings,
      metadata: parsed.metadata,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 }
    );
  }
}
