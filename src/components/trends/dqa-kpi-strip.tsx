"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  computeIndicatorRate,
  type AgreementPoint,
  type TrendCount,
} from "@/lib/trend-utils";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Stethoscope,
  TestTube2,
} from "lucide-react";

type DqaKpiStripProps = {
  counts: TrendCount[];
  agreement: AgreementPoint[];
  flaggedCount: number;
  source: string;
  stage: string;
  loading: boolean;
};

export function DqaKpiStrip({
  counts,
  agreement,
  flaggedCount,
  source,
  stage,
  loading,
}: DqaKpiStripProps) {
  const latestAgreement = agreement.at(-1);
  const agreementPct =
    latestAgreement?.rate == null
      ? null
      : Math.round(latestAgreement.rate * 1000) / 10;

  const latestPeriod = [...new Set(counts.map((c) => c.period))].sort().at(-1) ?? "";

  const screeningRate = latestPeriod
    ? computeIndicatorRate(
        counts,
        "TB screening",
        "Headcount",
        source,
        stage,
        "Over 5yrs",
        latestPeriod
      )
    : null;

  const genexpertRate = latestPeriod
    ? computeIndicatorRate(
        counts,
        "TB test using GeneXpert",
        "Client eligible for TB  test",
        source,
        stage,
        "Over 5yrs",
        latestPeriod
      )
    : null;

  const treatmentRate = latestPeriod
    ? computeIndicatorRate(
        counts,
        "DSTB treatment start",
        "DS-TB Bacteriologically confirmed",
        source,
        stage,
        "Over 5yrs",
        latestPeriod
      )
    : null;

  const kpis = [
    {
      label: "TB screening rate",
      value: screeningRate != null ? `${screeningRate}%` : "—",
      description: "Adults screened ÷ headcount (latest month)",
      icon: Stethoscope,
      highlight: screeningRate != null && screeningRate < 80,
    },
    {
      label: "GeneXpert coverage",
      value: genexpertRate != null ? `${genexpertRate}%` : "—",
      description: "Eligible clients tested (latest month)",
      icon: TestTube2,
      highlight: genexpertRate != null && genexpertRate < 70,
    },
    {
      label: "Treatment start rate",
      value: treatmentRate != null ? `${treatmentRate}%` : "—",
      description: "DSTB starts ÷ confirmed (latest month)",
      icon: Activity,
      highlight: false,
    },
    {
      label: "Source agreement",
      value: agreementPct != null ? `${agreementPct}%` : "—",
      description: "Register / RMR / TIER / DHIS aligned",
      icon: CheckCircle2,
      highlight: agreementPct != null && agreementPct < 90,
    },
    {
      label: "Flagged months",
      value: String(flaggedCount),
      description: "Facility-months with source mismatches",
      icon: AlertTriangle,
      highlight: flaggedCount > 0,
    },
  ];

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Card
            key={kpi.label}
            className={kpi.highlight ? "border-destructive/40 bg-destructive/5" : ""}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardDescription className="text-xs">{kpi.label}</CardDescription>
              <Icon
                className={`size-4 ${kpi.highlight ? "text-destructive" : "text-muted-foreground"}`}
              />
            </CardHeader>
            <CardContent>
              <div className="font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums">
                {kpi.value}
              </div>
              <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                {kpi.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
