import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { facilities, facilityMonthStatus, entries } from "@/lib/db/schema";
import { count, desc, eq, sql } from "drizzle-orm";
import { PageHeader } from "@/components/page-header";
import { DashboardAnalytics } from "@/components/trends/dashboard-analytics";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, ArrowRight, Building2, ClipboardList, Lock, Upload } from "lucide-react";

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

  const kpis = [
    {
      label: "Facilities",
      value: facilityCount.n,
      icon: Building2,
      description: "Active sites in programme",
    },
    {
      label: "Entry rows",
      value: entryCount.n,
      icon: ClipboardList,
      description: "Total count values captured",
    },
    {
      label: "Awaiting review",
      value: submitted[0]?.n ?? 0,
      icon: Upload,
      description: "Submitted facility-months",
    },
    {
      label: "Locked months",
      value: locked[0]?.n ?? 0,
      icon: Lock,
      description: "Reviewed and locked",
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome, ${session?.user?.name}`}
        description="Monitor TB/DS-TB data quality across facilities — monthly, quarterly, and yearly. Trends below cover every count indicator, like a Power BI dashboard."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription>{s.label}</CardDescription>
                <Icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="font-[family-name:var(--font-display)] text-3xl font-semibold">
                  {s.value}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="font-[family-name:var(--font-display)]">
              Quick actions
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button variant="outline" className="justify-between" render={<Link href="/entry" />}>
              Enter data via web form
              <ArrowRight className="size-4" />
            </Button>
            <Button variant="outline" className="justify-between" render={<Link href="/upload" />}>
              Upload ACC1 Excel workbook
              <ArrowRight className="size-4" />
            </Button>
            {session?.user?.role === "merl_officer" && (
              <>
                <Button variant="outline" className="justify-between" render={<Link href="/review" />}>
                  Review & lock facility-months
                  <ArrowRight className="size-4" />
                </Button>
                <Button variant="outline" className="justify-between" render={<Link href="/export" />}>
                  Export Power BI CSV
                  <ArrowRight className="size-4" />
                </Button>
              </>
            )}
            <Button variant="outline" className="justify-between" render={<Link href="/trends" />}>
              Deep-dive trends view
              <ArrowRight className="size-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-[family-name:var(--font-display)]">
              Flagged mismatches
            </CardTitle>
            <CardDescription>
              Source disagreements that need review before locking
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {flagged.length === 0 ? (
              <p className="text-sm text-muted-foreground">No flagged facility-months.</p>
            ) : (
              flagged.map((f) => {
                const fac = facilityMap.get(f.facilityId);
                const n = Array.isArray(f.mismatches) ? f.mismatches.length : 0;
                return (
                  <Alert key={`${f.facilityId}-${f.periodDate}`} variant="destructive">
                    <AlertTriangle />
                    <AlertTitle>
                      {fac?.name ?? f.facilityId} · {f.periodDate}
                    </AlertTitle>
                    <AlertDescription>
                      {n} source mismatch{n === 1 ? "" : "es"} flagged across indicators
                    </AlertDescription>
                  </Alert>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold text-primary">
            Programme trends — all data elements
          </h3>
          <p className="text-sm text-muted-foreground">
            Small-multiple charts for every count indicator, grouped by data type. Use filters to change grain, facility, stage, and source.
          </p>
        </div>
        <DashboardAnalytics />
      </div>
    </div>
  );
}
