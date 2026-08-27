import { NextRequest, NextResponse } from "next/server";
import { desc, eq, or, sql } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLog, users } from "@/lib/db/schema";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const sp = new URL(req.url).searchParams;
    const facilityId = sp.get("facilityId");
    const periodDate = sp.get("periodDate");

    if (!facilityId || !periodDate) {
      return NextResponse.json(
        { error: "facilityId and periodDate required" },
        { status: 400 }
      );
    }

    const entityId = `${facilityId}:${periodDate}`;
    const rows = await db
      .select({
        id: auditLog.id,
        entity: auditLog.entity,
        entityId: auditLog.entityId,
        action: auditLog.action,
        performedAt: auditLog.performedAt,
        detail: auditLog.detail,
        performerName: users.name,
        performerEmail: users.email,
      })
      .from(auditLog)
      .leftJoin(users, eq(users.id, auditLog.performedBy))
      .where(
        or(
          eq(auditLog.entityId, entityId),
          sql`${auditLog.entityId} LIKE ${entityId + ":%"}`
        )
      )
      .orderBy(desc(auditLog.performedAt))
      .limit(500);

    return NextResponse.json({ rows });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
