"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AGE_CHART_COLORS,
  computeProgrammeRatesByAge,
  type TrendCount,
} from "@/lib/trend-utils";
import {
  getDashboardKpiRates,
  formatRateFormula,
} from "@/lib/dashboard-kpis";
import { Percent } from "lucide-react";

type DqaKpiStripProps = {
  counts: TrendCount[];
  source: string;
  stage: string;
  period: string;
  facilityId?: number | "";
  loading: boolean;
};

const AGE_ROWS = [
  { key: "Under 5yrs" as const, label: "Children" },
  { key: "Over 5yrs" as const, label: "Adults" },
];

export function DqaKpiStrip({
  counts,
  source,
  stage,
  period,
  facilityId,
  loading,
}: DqaKpiStripProps) {
  const rateDefs = getDashboardKpiRates();

  const kpis = rateDefs.map((def) => {
    const byAge = period
      ? computeProgrammeRatesByAge(
          counts,
          def.numerator,
          def.denominator,
          source,
          stage,
          period,
          facilityId,
          def.dataType
        )
      : {
          "Under 5yrs": { rate: null, numerator: 0, denominator: 0 },
          "Over 5yrs": { rate: null, numerator: 0, denominator: 0 },
        };

    return {
      id: def.id,
      label: def.label,
      formula: formatRateFormula(def),
      byAge,
    };
  });

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        ACC1 DS-TB DQA tool v3 rates — children and adults calculated separately
        from summed counts at the selected reporting period. TB register lists are sourced
        from TIER.Net / PHCIS / PreHMIS in the workbook.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi) => (
          <Card key={kpi.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-1">
              <CardDescription className="line-clamp-2 text-xs leading-tight">
                {kpi.label}
              </CardDescription>
              <Percent className="size-3.5 shrink-0 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-2">
              {AGE_ROWS.map(({ key, label }) => {
                const { rate, numerator, denominator } = kpi.byAge[key];
                return (
                  <div
                    key={key}
                    className="rounded-md border bg-muted/20 px-2 py-1.5"
                  >
                    <p className="text-[10px] font-medium text-muted-foreground">
                      {label}
                    </p>
                    <p
                      className="font-[family-name:var(--font-display)] text-lg font-semibold tabular-nums leading-tight"
                      style={{ color: AGE_CHART_COLORS[key] }}
                    >
                      {rate != null ? `${rate}%` : "—"}
                    </p>
                    <p className="text-[9px] tabular-nums text-muted-foreground/80">
                      {denominator > 0
                        ? `${numerator.toLocaleString()} ÷ ${denominator.toLocaleString()}`
                        : "No data"}
                    </p>
                  </div>
                );
              })}
              <p className="text-[10px] leading-tight text-muted-foreground">
                {kpi.formula}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
