"use client";

import { useMemo } from "react";
import { Line, LineChart, Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CascadeFunnelChart } from "@/components/trends/cascade-funnel-chart";
import { SourceComparisonChart } from "@/components/trends/source-comparison-chart";
import {
  AGE_GROUPS,
  AGE_LABELS,
  SOURCE_LABELS,
  getCascadeForCategory,
} from "@/lib/cascade-config";
import {
  AGE_CHART_COLORS,
  buildAggregatedAgeTrend,
  buildBeforeAfterData,
  buildCascadeSteps,
  buildFacilityRanking,
  buildSourceComparison,
  buildSourceTrendSeries,
  DISPLAY_AGE_LABELS,
  formatPeriodLabel,
  getAgeSnapshots,
  getPriorPeriod,
  resolveAgeGroupsForIndicator,
  resolveEffectiveSource,
  type TrendCount,
} from "@/lib/trend-utils";
import { ArrowLeft } from "lucide-react";

type IndicatorDetailViewProps = {
  indicator: string;
  dataType: string;
  counts: TrendCount[];
  stage: string;
  source: string;
  facilityNames: Map<number, string>;
  facilityId?: number | "";
  periods: string[];
  selectedPeriod: string;
  onBack: () => void;
};

export function IndicatorDetailView({
  indicator,
  dataType,
  counts,
  stage,
  source,
  facilityNames,
  facilityId,
  periods,
  selectedPeriod,
  onBack,
}: IndicatorDetailViewProps) {
  const cascadeSteps = getCascadeForCategory(dataType);
  const inCascade = cascadeSteps?.includes(indicator) ?? false;
  const facilityLabel = facilityId
    ? facilityNames.get(facilityId as number) ?? "Selected facility"
    : "All facilities";

  const filtered = counts.filter((c) => c.dataType === dataType);
  const priorPeriod = getPriorPeriod(periods, selectedPeriod);

  const effectiveSource = useMemo(
    () =>
      resolveEffectiveSource(
        filtered,
        dataType,
        indicator,
        stage,
        selectedPeriod,
        source,
        facilityId
      ),
    [filtered, dataType, indicator, stage, selectedPeriod, source, facilityId]
  );

  const ageSnapshots = useMemo(
    () =>
      getAgeSnapshots(
        filtered,
        indicator,
        effectiveSource,
        stage,
        selectedPeriod,
        priorPeriod,
        facilityId,
        dataType
      ),
    [
      filtered,
      indicator,
      effectiveSource,
      stage,
      selectedPeriod,
      priorPeriod,
      facilityId,
      dataType,
    ]
  );

  const viewAgeGroups = useMemo(
    () =>
      resolveAgeGroupsForIndicator(
        filtered,
        indicator,
        effectiveSource,
        stage,
        selectedPeriod,
        priorPeriod,
        facilityId,
        dataType
      ),
    [
      filtered,
      indicator,
      effectiveSource,
      stage,
      selectedPeriod,
      priorPeriod,
      facilityId,
      dataType,
    ]
  );

  const programmeTrend = useMemo(() => {
    const trends = viewAgeGroups.map((ageGroup) => ({
      ageGroup,
      series: buildAggregatedAgeTrend(
        filtered,
        indicator,
        effectiveSource,
        stage,
        ageGroup,
        facilityId
      ),
    }));
    const periodSet = new Set(trends.flatMap((t) => t.series.map((d) => d.period)));
    return [...periodSet].sort().map((period) => {
      const row: Record<string, string | number | null> = { period };
      for (const { ageGroup, series } of trends) {
        row[ageGroup] = series.find((d) => d.period === period)?.total ?? null;
      }
      return row;
    });
  }, [
    filtered,
    indicator,
    effectiveSource,
    stage,
    selectedPeriod,
    priorPeriod,
    facilityId,
    dataType,
    viewAgeGroups,
  ]);

  const facilityRanking = useMemo(
    () =>
      !facilityId
        ? buildFacilityRanking(
            filtered,
            indicator,
            effectiveSource,
            stage,
            selectedPeriod,
            facilityNames
          )
        : [],
    [
      filtered,
      indicator,
      effectiveSource,
      stage,
      selectedPeriod,
      facilityNames,
      facilityId,
    ]
  );

  const defaultTab = inCascade ? "cascade" : "overview";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 gap-1">
            <ArrowLeft className="size-4" />
            Back to all indicators
          </Button>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-primary">
            {indicator}
          </h2>
          <p className="text-sm text-muted-foreground">
            {dataType} · {facilityLabel} · {formatPeriodLabel(selectedPeriod)} ·{" "}
            {stage} visit · {SOURCE_LABELS[effectiveSource] ?? effectiveSource}
          </p>
          <div className="flex flex-wrap gap-2">
            {ageSnapshots.map((a) => (
              <Badge key={a.ageGroup} variant="secondary" className="tabular-nums">
                {DISPLAY_AGE_LABELS[a.ageGroup] ?? a.ageGroup}:{" "}
                {a.value.toLocaleString()}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList className="flex h-auto flex-wrap">
          {inCascade && <TabsTrigger value="cascade">Care cascade</TabsTrigger>}
          <TabsTrigger value="overview">Programme trend</TabsTrigger>
          <TabsTrigger value="sources">Source comparison</TabsTrigger>
          <TabsTrigger value="before-after">Before / After</TabsTrigger>
        </TabsList>

        {inCascade && (
          <TabsContent value="cascade" className="mt-6 space-y-8">
            <div className="grid gap-8 lg:grid-cols-2">
              {AGE_GROUPS.map((ageGroup) => (
                <div key={ageGroup} className="rounded-xl border bg-card p-5">
                  <CascadeFunnelChart
                    steps={buildCascadeSteps(
                      filtered,
                      dataType,
                      stage,
                      ageGroup,
                      effectiveSource,
                      selectedPeriod,
                      facilityId
                    )}
                    ageLabel={AGE_LABELS[ageGroup]}
                  />
                </div>
              ))}
            </div>
          </TabsContent>
        )}

        <TabsContent value="overview" className="mt-6 space-y-8">
          <div className="rounded-xl border bg-card p-5">
            <h3 className="mb-1 font-medium">Programme totals over time</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              One line per age group — programme-wide aggregate, not per-facility spaghetti.
            </p>
            <ChartContainer
              config={Object.fromEntries(
                viewAgeGroups.map((ageGroup) => [
                  ageGroup,
                  {
                    label: DISPLAY_AGE_LABELS[ageGroup] ?? ageGroup,
                    color:
                      AGE_CHART_COLORS[ageGroup as keyof typeof AGE_CHART_COLORS] ??
                      "var(--chart-1)",
                  },
                ])
              )}
              className="h-72 w-full"
            >
              <LineChart data={programmeTrend}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="period"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => String(v).slice(0, 7)}
                />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                {viewAgeGroups.map((ageGroup) => (
                  <Line
                    key={ageGroup}
                    type="monotone"
                    dataKey={ageGroup}
                    name={DISPLAY_AGE_LABELS[ageGroup] ?? ageGroup}
                    stroke={
                      AGE_CHART_COLORS[ageGroup as keyof typeof AGE_CHART_COLORS] ??
                      "var(--chart-1)"
                    }
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ChartContainer>
          </div>

          {!facilityId && facilityRanking.length > 0 && (
            <div className="rounded-xl border bg-card p-5">
              <h3 className="mb-1 font-medium">
                Facility ranking — {formatPeriodLabel(selectedPeriod)}
              </h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Which facilities contribute most to this indicator (children vs adults).
              </p>
              <ChartContainer
                config={{
                  children: { label: "Children", color: AGE_CHART_COLORS["Under 5yrs"] },
                  adults: { label: "Adults", color: AGE_CHART_COLORS["Over 5yrs"] },
                }}
                className="h-80 w-full"
              >
                <BarChart
                  data={facilityRanking}
                  layout="vertical"
                  margin={{ left: 8, right: 16 }}
                >
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="facility"
                    width={160}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar
                    dataKey="children"
                    stackId="a"
                    fill={AGE_CHART_COLORS["Under 5yrs"]}
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="adults"
                    stackId="a"
                    fill={AGE_CHART_COLORS["Over 5yrs"]}
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </div>
          )}
        </TabsContent>

        <TabsContent value="sources" className="mt-6 space-y-8">
          <p className="text-sm text-muted-foreground">
            Compare register, RMR, TIER.Net, and DHIS for the same indicator — mismatches
            highlight data quality issues.
          </p>
          <div className="grid gap-8 lg:grid-cols-2">
            {viewAgeGroups.map((ageGroup) => (
              <div key={ageGroup} className="rounded-xl border bg-card p-5">
                <SourceComparisonChart
                  rows={buildSourceComparison(
                    filtered,
                    indicator,
                    stage,
                    ageGroup,
                    selectedPeriod,
                    facilityId,
                    SOURCE_LABELS
                  )}
                  ageLabel={DISPLAY_AGE_LABELS[ageGroup] ?? ageGroup}
                />
              </div>
            ))}
          </div>
          {viewAgeGroups.map((ageGroup) => (
            <div key={`trend-${ageGroup}`} className="rounded-xl border bg-card p-5">
              <h4 className="mb-3 font-medium">
                Source trends — {DISPLAY_AGE_LABELS[ageGroup] ?? ageGroup}
              </h4>
              <ChartContainer
                config={{
                  register: { label: "Register", color: "var(--chart-1)" },
                  summary_sheet: { label: "RMR", color: "var(--chart-2)" },
                  tier_net: { label: "TIER.Net", color: "var(--chart-3)" },
                  dhis: { label: "DHIS", color: "var(--chart-4)" },
                }}
                className="h-56 w-full"
              >
                <LineChart
                  data={buildSourceTrendSeries(
                    filtered,
                    indicator,
                    stage,
                    ageGroup,
                    facilityId
                  )}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="period" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line type="monotone" dataKey="register" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="summary_sheet" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="tier_net" stroke="var(--chart-3)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="dhis" stroke="var(--chart-4)" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="before-after" className="mt-6 space-y-8">
          <div className="grid gap-8 lg:grid-cols-2">
            {viewAgeGroups.map((ageGroup) => (
              <div key={ageGroup} className="rounded-xl border bg-card p-5">
                <h4 className="mb-3 font-medium">
                  {DISPLAY_AGE_LABELS[ageGroup] ?? ageGroup}
                </h4>
                <ChartContainer
                  config={{
                    before: { label: "Before visit", color: "var(--chart-3)" },
                    after: { label: "After visit", color: "var(--chart-1)" },
                  }}
                  className="h-56 w-full"
                >
                  <BarChart
                    data={buildBeforeAfterData(
                      filtered,
                      indicator,
                      effectiveSource,
                      ageGroup,
                      facilityNames,
                      facilityId
                    ).slice(0, 8)}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="label" hide />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar dataKey="before" fill="var(--chart-3)" radius={2} />
                    <Bar dataKey="after" fill="var(--chart-1)" radius={2} />
                  </BarChart>
                </ChartContainer>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
