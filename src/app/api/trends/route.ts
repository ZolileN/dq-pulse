import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  getSourceAgreementRate,
  getTrendsWithRates,
  type Grain,
} from "@/lib/rates";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const sp = new URL(req.url).searchParams;
    const grain = (sp.get("grain") ?? "month") as Grain;
    const facilityId = sp.get("facilityId");
    const stage = sp.get("stage") ?? undefined;
    const dataType = sp.get("dataType") ?? undefined;
    const view = sp.get("view") ?? "trends";

    if (view === "agreement") {
      const agreement = await getSourceAgreementRate(grain);
      return NextResponse.json({ agreement });
    }

    const data = await getTrendsWithRates(grain, {
      facilityId: facilityId ? Number(facilityId) : undefined,
      stage,
      dataType,
    });

    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return NextResponse.json({ error: "Failed to load trends" }, { status: 500 });
  }
}
