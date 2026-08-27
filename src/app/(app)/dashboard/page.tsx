import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { facilities, facilityMonthStatus } from "@/lib/db/schema";
import { desc, sql } from "drizzle-orm";
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
import { AlertTriangle, ArrowRight } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();

  const flagged = await db
    .select()
    .from(facilityMonthStatus)
    .where(sql`jsonb_array_length(coalesce(mismatches, '[]'::jsonb)) > 0`)
    .orderBy(desc(facilityMonthStatus.periodDate))
    .limit(8);

  const facilityMap = new Map(
    (await db.select().from(facilities)).map((f) => [f.id, f])
  );

  const flaggedCount = flagged.length;

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome, ${session?.user?.name}`}
        description="Monitor TB/DS-TB data quality across Nelson Mandela Bay. KPIs below track screening, testing, and source agreement. Click any indicator to expand the full analysis."
      />

      <div className="space-y-4">
        <div>
          <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold text-primary">
            Programme monitoring
          </h3>
          <p className="text-sm text-muted-foreground">
            DQA metrics and data elements — children and adults shown separately on every card.
          </p>
        </div>
        <DashboardAnalytics flaggedCount={flaggedCount} />
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
                      {fac?.name ?? "Unknown facility"} · {f.periodDate}
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
    </div>
  );
}
