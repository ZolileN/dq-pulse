"use client";

import { Area, AreaChart } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AGE_CHART_COLORS } from "@/lib/trend-utils";
import {
  buildAggregatedAgeTrend,
  getAgeSnapshots,
  getLatestPeriod,
  getPriorPeriod,
  type TrendCount,
} from "@/lib/trend-utils";
import { ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import { format, parseISO } from "date-fns";

type IndicatorKpiCardProps = {
  indicator: string;
  counts: TrendCount[];
  source: string;
  stage: string;
  facilityId?: number | "";
  onSelect?: () => void;
};

function formatPeriod(period: string) {
  try {
    return format(parseISO(period), "MMM yyyy");
  } catch {
    return period.slice(0, 7);
  }
}

export function IndicatorKpiCard({
  indicator,
  counts,
  source,
  stage,
  facilityId,
  onSelect,
}: IndicatorKpiCardProps) {
  const periods = [...new Set(counts.map((c) => c.period))].sort();
  const latest = getLatestPeriod(counts.filter((c) => c.indicator === indicator)) ?? periods.at(-1) ?? "";
  const prior = getPriorPeriod(periods, latest);

  const snapshots = getAgeSnapshots(
    counts,
    indicator,
    source,
    stage,
    latest,
    prior,
    facilityId
  );

  const hasData = snapshots.some((s) => s.value > 0);

  if (!hasData) {
    return (
      <Card className="h-full opacity-60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{indicator}</CardTitle>
          <CardDescription className="text-xs">No data</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card
      className="group h-full cursor-pointer transition-all hover:border-primary/40 hover:shadow-md"
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect?.()}
    >
      <CardHeader className="space-y-1 pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-2 text-sm font-semibold leading-tight">
            {indicator}
          </CardTitle>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </div>
        <CardDescription className="text-[11px]">
          {formatPeriod(latest)} · click to expand
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {snapshots.map((snap) => {
          const trend = buildAggregatedAgeTrend(
            counts,
            indicator,
            source,
            stage,
            snap.ageGroup,
            facilityId
          );

          return (
            <div
              key={snap.ageGroup}
              className="rounded-lg border bg-muted/20 px-3 py-2"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[11px] font-medium text-muted-foreground">
                  {snap.ageGroup === "Under 5yrs" ? "Children" : "Adults"}
                </span>
                {snap.changePct != null && (
                  <Badge
                    variant="outline"
                    className={`h-5 gap-0.5 px-1.5 text-[10px] tabular-nums ${
                      snap.changePct >= 0
                        ? "text-primary"
                        : "text-destructive"
                    }`}
                  >
                    {snap.changePct >= 0 ? (
                      <TrendingUp className="size-2.5" />
                    ) : (
                      <TrendingDown className="size-2.5" />
                    )}
                    {Math.abs(snap.changePct)}%
                  </Badge>
                )}
              </div>
              <p
                className="mt-0.5 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums"
                style={{ color: AGE_CHART_COLORS[snap.ageGroup as keyof typeof AGE_CHART_COLORS] }}
              >
                {snap.value.toLocaleString()}
              </p>
              {trend.length > 1 && (
                <ChartContainer
                  config={{
                    total: {
                      label: snap.label,
                      color: AGE_CHART_COLORS[snap.ageGroup as keyof typeof AGE_CHART_COLORS],
                    },
                  }}
                  className="mt-1 h-10 w-full"
                >
                  <AreaChart data={trend} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelFormatter={(v) => formatPeriod(String(v))}
                          formatter={(v) => [Number(v).toLocaleString(), "Total"]}
                        />
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke={AGE_CHART_COLORS[snap.ageGroup as keyof typeof AGE_CHART_COLORS]}
                      fill={AGE_CHART_COLORS[snap.ageGroup as keyof typeof AGE_CHART_COLORS]}
                      fillOpacity={0.15}
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </AreaChart>
                </ChartContainer>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
