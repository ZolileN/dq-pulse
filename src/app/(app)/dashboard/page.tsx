import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { facilities, facilityMonthStatus, entries } from "@/lib/db/schema";
import { count, desc, eq, sql } from "drizzle-orm";

export default async function DashboardPage() {
  const session = await auth();

  const [facilityCount] = await db.select({ n: count() }).from(facilities);
  const [entryCount] = await db.select({ n: count() }).from(entries);
  const submitted = await db
    .select({ n: count() })
    .from(facilityMonthStatus)
    .where(eq(facilityMonthStatus.status, "submitted"));
  const locked = await db
    .select({ n: count() })
    .from(facilityMonthStatus)
    .where(eq(facilityMonthStatus.status, "reviewed_locked"));

  const flagged = await db
    .select()
    .from(facilityMonthStatus)
    .where(sql`jsonb_array_length(coalesce(mismatches, '[]'::jsonb)) > 0`)
    .orderBy(desc(facilityMonthStatus.periodDate))
    .limit(8);

  const facilityMap = new Map(
    (await db.select().from(facilities)).map((f) => [f.id, f])
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--brand)]">
          Welcome, {session?.user?.name}
        </h1>
        <p className="mt-1 text-[var(--muted)]">
          Monitor TB/DS-TB data quality across facilities — monthly, quarterly, and yearly.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Facilities", value: facilityCount.n },
          { label: "Entry rows", value: entryCount.n },
          { label: "Awaiting review", value: submitted[0]?.n ?? 0 },
          { label: "Locked months", value: locked[0]?.n ?? 0 },
        ].map((s) => (
          <div
            key={s.label}
            className="border border-[var(--border)] bg-[var(--surface)] px-4 py-4"
          >
            <p className="text-sm text-[var(--muted)]">{s.label}</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-3xl">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="font-[family-name:var(--font-display)] text-xl">
            Quick actions
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link className="text-[var(--brand)] underline" href="/entry">
                Enter data via web form
              </Link>
            </li>
            <li>
              <Link className="text-[var(--brand)] underline" href="/upload">
                Upload ACC1 Excel workbook
              </Link>
            </li>
            {session?.user?.role === "merl_officer" && (
              <>
                <li>
                  <Link className="text-[var(--brand)] underline" href="/review">
                    Review & lock facility-months
                  </Link>
                </li>
                <li>
                  <Link className="text-[var(--brand)] underline" href="/export">
                    Export Power BI CSV
                  </Link>
                </li>
              </>
            )}
            <li>
              <Link className="text-[var(--brand)] underline" href="/trends">
                View trends & rates
              </Link>
            </li>
          </ul>
        </section>

        <section className="border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="font-[family-name:var(--font-display)] text-xl">
            Flagged mismatches
          </h2>
          {flagged.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--muted)]">No flagged facility-months.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {flagged.map((f) => {
                const fac = facilityMap.get(f.facilityId);
                const n = Array.isArray(f.mismatches) ? f.mismatches.length : 0;
                return (
                  <li
                    key={`${f.facilityId}-${f.periodDate}`}
                    className="border-l-4 border-[var(--danger)] bg-[var(--danger-bg)] px-3 py-2 text-sm"
                  >
                    <strong>{fac?.name ?? f.facilityId}</strong> · {f.periodDate} ·{" "}
                    {n} mismatch{n === 1 ? "" : "es"}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
