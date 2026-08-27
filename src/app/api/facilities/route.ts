import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { facilities } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  try {
    await requireSession();
    const rows = await db.select().from(facilities).orderBy(asc(facilities.name));
    return NextResponse.json({ facilities: rows });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
