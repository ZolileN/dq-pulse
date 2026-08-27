"use client";

import { useMemo } from "react";
import { Line, LineChart, Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  buildAgeTrendSeries,
  buildBeforeAfterData,
  buildCascadeSteps,
  buildSourceComparison,
  buildSourceTrendSeries,
  getFacilityKeysForAge,
  getLatestPeriod,
  type TrendCount,
} from "@/lib/trend-utils";

type DrillDownProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  indicator: string;
  dataType: string;
  counts: TrendCount[];
  stage: string;
  source: string;
  facilityNames: Map<number, string>;
  facilityId?: number | "";
  periods: string[];
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
};

export function IndicatorDrillDown({
  open,
  onOpenChange,
  indicator,
  dataType,
  counts,
  stage,
  source,
  facilityNames,
  facilityId,
  periods,
  selectedPeriod,
  onPeriodChange,
}: DrillDownProps) {
  const cascadeSteps = getCascadeForCategory(dataType);
  const inCascade = cascadeSteps?.includes(indicator) ?? false;
  const facilityLabel = facilityId
    ? facilityNames.get(facilityId as number) ?? "Selected facility"
    : "All facilities";

  const ageSnapshots = useMemo(() => {
    return AGE_GROUPS.map((age) => ({
      age,
      label: AGE_LABELS[age],
      value: counts
        .filter(
          (c) =>
            c.indicator === indicator &&
            c.source === source &&
            c.stage === stage &&
            c.ageGroup === age &&
            c.period === selectedPeriod &&
            (!facilityId || c.facilityId === facilityId)
        )
        .reduce((s, c) => s + c.value, 0),
    }));
  }, [counts, indicator, source, stage, selectedPeriod, facilityId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-2xl lg:max-w-4xl"
      >
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="font-[family-name:var(--font-display)] text-xl">
            {indicator}
          </SheetTitle>
          <SheetDescription>
            {dataType} · {facilityLabel} · {stage} visit · {SOURCE_LABELS[source]}
          </SheetDescription>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {ageSnapshots.map((a) => (
              <Badge key={a.age} variant="outline" className="tabular-nums">
                {a.label}: {a.value.toLocaleString()}
              </Badge>
            ))}
          </div>
          {periods.length > 0 && (
            <div className="pt-2">
              <Label className="text-xs">Snapshot period</Label>
              <Select value={selectedPeriod} onValueChange={(v) => v && onPeriodChange(v)}>
                <SelectTrigger className="mt-1 w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </SheetHeader>

        <Tabs defaultValue="trends" className="mt-4">
          <TabsList>
            <TabsTrigger value="trends">Trends by age</TabsTrigger>
            <TabsTrigger value="sources">Source comparison</TabsTrigger>
            {inCascade && <TabsTrigger value="cascade">Care cascade</TabsTrigger>}
            <TabsTrigger value="before-after">Before / After</TabsTrigger>
          </TabsList>

          <TabsContent value="trends" className="mt-4 space-y-6">
            {AGE_GROUPS.map((ageGroup) => {
              const data = buildAgeTrendSeries(
                counts.filter((c) => c.dataType === dataType),
                indicator,
                source,
                stage,
                ageGroup,
                facilityNames,
                facilityId
              );
              const keys = getFacilityKeysForAge(
                counts,
                indicator,
                source,
                stage,
                ageGroup,
                facilityNames,
                facilityId
              );

              return (
                <div key={ageGroup} className="rounded-xl border p-4">
                  <h4 className="mb-3 font-medium">{AGE_LABELS[ageGroup]}</h4>
                  <ChartContainer
                    config={{
                      trend: {
                        label: AGE_LABELS[ageGroup],
                        color: AGE_CHART_COLORS[ageGroup],
                      },
                    }}
                    className="h-48 w-full"
                  >
                    <LineChart data={data}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="period" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      {keys.map((k) => (
                        <Line
                          key={k}
                          type="monotone"
                          dataKey={k}
                          stroke={AGE_CHART_COLORS[ageGroup]}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                      ))}
                    </LineChart>
                  </ChartContainer>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="sources" className="mt-4 space-y-6">
            {AGE_GROUPS.map((ageGroup) => (
              <div key={ageGroup} className="rounded-xl border p-4">
                <SourceComparisonChart
                  rows={buildSourceComparison(
                    counts.filter((c) => c.dataType === dataType),
                    indicator,
                    stage,
                    ageGroup,
                    selectedPeriod,
                    facilityId,
                    SOURCE_LABELS
                  )}
                  ageLabel={AGE_LABELS[ageGroup]}
                />
                <div className="mt-4">
                  <h5 className="mb-2 text-sm text-muted-foreground">
                    Source trend over time
                  </h5>
                  <ChartContainer
                    config={{
                      register: { label: "Register", color: "var(--chart-1)" },
                      summary_sheet: { label: "RMR", color: "var(--chart-2)" },
                      tier_net: { label: "TIER.Net", color: "var(--chart-3)" },
                      dhis: { label: "DHIS", color: "var(--chart-4)" },
                    }}
                    className="h-40 w-full"
                  >
                    <LineChart
                      data={buildSourceTrendSeries(
                        counts.filter((c) => c.dataType === dataType),
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
                      <Line type="monotone" dataKey="register" stroke="var(--chart-1)" dot={false} />
                      <Line type="monotone" dataKey="summary_sheet" stroke="var(--chart-2)" dot={false} />
                      <Line type="monotone" dataKey="tier_net" stroke="var(--chart-3)" dot={false} />
                      <Line type="monotone" dataKey="dhis" stroke="var(--chart-4)" dot={false} />
                    </LineChart>
                  </ChartContainer>
                </div>
              </div>
            ))}
          </TabsContent>

          {inCascade && (
            <TabsContent value="cascade" className="mt-4 space-y-6">
              <p className="text-sm text-muted-foreground">
                Shows how clients move through the care pathway. Gaps highlight clients who did not progress to the next step — e.g. headcount 300 but only 50 screened.
              </p>
              {AGE_GROUPS.map((ageGroup) => (
                <div key={ageGroup} className="rounded-xl border p-4">
                  <CascadeFunnelChart
                    steps={buildCascadeSteps(
                      counts.filter((c) => c.dataType === dataType),
                      dataType,
                      stage,
                      ageGroup,
                      source,
                      selectedPeriod,
                      facilityId
                    )}
                    ageLabel={AGE_LABELS[ageGroup]}
                  />
                </div>
              ))}
            </TabsContent>
          )}

          <TabsContent value="before-after" className="mt-4 space-y-6">
            {AGE_GROUPS.map((ageGroup) => (
              <div key={ageGroup} className="rounded-xl border p-4">
                <h4 className="mb-3 font-medium">{AGE_LABELS[ageGroup]}</h4>
                <ChartContainer
                  config={{
                    before: { label: "Before", color: "var(--chart-3)" },
                    after: { label: "After", color: "var(--chart-1)" },
                  }}
                  className="h-48 w-full"
                >
                  <BarChart
                    data={buildBeforeAfterData(
                      counts.filter((c) => c.dataType === dataType),
                      indicator,
                      source,
                      ageGroup,
                      facilityNames,
                      facilityId
                    ).slice(0, 12)}
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
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

export function useDrillDownPeriods(counts: TrendCount[]) {
  return useMemo(() => {
    const periods = [...new Set(counts.map((c) => c.period))].sort();
    const latest = getLatestPeriod(counts) ?? periods[0] ?? "";
    return { periods, latest };
  }, [counts]);
}
