"use client";

import { useEffect, useMemo, useState } from "react";
import { Line, LineChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, Legend } from "recharts";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import { TrendFilters } from "@/components/trends/trend-filters";
import { IndicatorSparkline } from "@/components/trends/indicator-sparkline";
import {
  IndicatorDrillDown,
  useDrillDownPeriods,
} from "@/components/trends/indicator-drill-down";
import { AGE_LABELS } from "@/lib/cascade-config";
import {
  buildAgeTrendSeries,
  buildBeforeAfterData,
  getCountableIndicatorsByCategory,
  getFacilityKeysForAge,
  AGE_CHART_COLORS,
  CHART_COLORS,
  type TrendCount,
  type TrendRate,
  type AgreementPoint,
  type Grain,
} from "@/lib/trend-utils";

type Facility = { id: number; name: string };

export function TrendsExplorer() {
  const [grain, setGrain] = useState<Grain>("month");
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [facilityId, setFacilityId] = useState<number | "">("");
  const [counts, setCounts] = useState<TrendCount[]>([]);
  const [rates, setRates] = useState<TrendRate[]>([]);
  const [agreement, setAgreement] = useState<AgreementPoint[]>([]);
  const [indicator, setIndicator] = useState("Headcount");
  const [stage, setStage] = useState("before");
  const [source, setSource] = useState("register");
  const [showRate, setShowRate] = useState(false);
  const [ageGroup, setAgeGroup] = useState("Over 5yrs");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<{ indicator: string; dataType: string } | null>(null);
  const [snapshotPeriod, setSnapshotPeriod] = useState("");

  const categories = useMemo(() => getCountableIndicatorsByCategory(), []);
  const { periods, latest } = useDrillDownPeriods(counts);

  useEffect(() => {
    if (latest && !snapshotPeriod) setSnapshotPeriod(latest);
  }, [latest, snapshotPeriod]);

  useEffect(() => {
    fetch("/api/facilities")
      .then((r) => r.json())
      .then((d) => setFacilities(d.facilities ?? []));
  }, []);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams({ grain, stage });
    if (facilityId) qs.set("facilityId", String(facilityId));

    Promise.all([
      fetch(`/api/trends?${qs}`).then((r) => r.json()),
      fetch(`/api/trends?grain=${grain}&view=agreement`).then((r) => r.json()),
    ])
      .then(([trends, agr]) => {
        setCounts(trends.counts ?? []);
        setRates(trends.rates ?? []);
        setAgreement(agr.agreement ?? []);
      })
      .finally(() => setLoading(false));
  }, [grain, facilityId, stage]);

  const facilityNames = useMemo(
    () => new Map(facilities.map((f) => [f.id, f.name])),
    [facilities]
  );

  const indicatorOptions = useMemo(() => {
    const set = new Set(counts.map((c) => c.indicator));
    if (showRate) rates.forEach((r) => set.add(r.indicator));
    return [...set].sort();
  }, [counts, rates, showRate]);

  const trendData = useMemo(() => {
    if (showRate) {
      return rates
        .filter(
          (r) =>
            r.indicator === indicator &&
            r.source === source &&
            r.stage === stage &&
            (!facilityId || r.facilityId === facilityId)
        )
        .map((r) => ({
          period: r.period,
          value: r.rate == null ? null : Math.round(r.rate * 1000) / 10,
          facility: facilityNames.get(r.facilityId) ?? String(r.facilityId),
        }));
    }
    return counts
      .filter(
        (c) =>
          c.indicator === indicator &&
          c.source === source &&
          c.stage === stage &&
          (!facilityId || c.facilityId === facilityId)
      )
      .map((c) => ({
        period: c.period,
        value: c.value,
        facility: facilityNames.get(c.facilityId) ?? String(c.facilityId),
      }));
  }, [counts, rates, indicator, source, stage, facilityId, showRate, facilityNames]);

  const seriesByFacility = useMemo(() => {
    if (showRate) {
      const map = new Map<string, Record<string, number | string | null>>();
      for (const row of trendData) {
        const bucket = map.get(row.period) ?? { period: row.period };
        bucket[row.facility] = row.value;
        map.set(row.period, bucket);
      }
      return [...map.values()].sort((a, b) =>
        String(a.period).localeCompare(String(b.period))
      );
    }
    return buildAgeTrendSeries(
      counts,
      indicator,
      source,
      stage,
      ageGroup,
      facilityNames,
      facilityId
    );
  }, [counts, trendData, indicator, source, stage, ageGroup, facilityNames, facilityId, showRate]);

  const facilityKeys = useMemo(() => {
    if (showRate) {
      const s = new Set<string>();
      for (const row of trendData) s.add(row.facility);
      return [...s];
    }
    return getFacilityKeysForAge(
      counts,
      indicator,
      source,
      stage,
      ageGroup,
      facilityNames,
      facilityId
    );
  }, [counts, trendData, indicator, source, stage, ageGroup, facilityNames, facilityId, showRate]);

  const beforeAfter = useMemo(
    () => buildBeforeAfterData(counts, indicator, source, ageGroup, facilityNames, facilityId),
    [counts, indicator, source, ageGroup, facilityId, facilityNames]
  );

  const agreementData = agreement.map((a) => ({
    period: a.period,
    rate: a.rate == null ? null : Math.round(a.rate * 1000) / 10,
  }));

  const chartConfig = facilityKeys.reduce(
    (acc, key, i) => ({
      ...acc,
      [key]: { label: key, color: CHART_COLORS[i % CHART_COLORS.length] },
    }),
    {} as Record<string, { label: string; color: string }>
  );

  const defaultTab = categories[0]?.dataType ?? "TB cascade";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trends"
        description="Counts are summed at the selected grain. Rates are computed from those sums — never stored or averaged across periods."
      />

      <div className="flex flex-wrap items-end gap-4 rounded-xl border bg-card p-4">
        <TrendFilters
          compact
          grain={grain}
          onGrainChange={setGrain}
          facilities={facilities}
          facilityId={facilityId}
          onFacilityChange={setFacilityId}
          stage={stage}
          onStageChange={setStage}
          source={source}
          onSourceChange={setSource}
        />
        <div className="space-y-2">
          <Label>Age group</Label>
          <Select value={ageGroup} onValueChange={(v) => v && setAgeGroup(v)}>
            <SelectTrigger className="min-w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Under 5yrs">{AGE_LABELS["Under 5yrs"]}</SelectItem>
              <SelectItem value="Over 5yrs">{AGE_LABELS["Over 5yrs"]}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Metric</Label>
          <Select value={indicator} onValueChange={(v) => v && setIndicator(v)}>
            <SelectTrigger className="min-w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {indicatorOptions.map((i) => (
                <SelectItem key={i} value={i}>
                  {i}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 pb-1">
          <Checkbox
            id="show-rate"
            checked={showRate}
            onCheckedChange={(checked) => {
              setShowRate(!!checked);
              if (checked) setIndicator("TB screening rate");
              else setIndicator("Headcount");
            }}
          />
          <Label htmlFor="show-rate" className="cursor-pointer">
            Show rate (%)
          </Label>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-[family-name:var(--font-display)]">
            Trend lines — {indicator} ({AGE_LABELS[ageGroup as keyof typeof AGE_LABELS]})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-72 w-full" />
          ) : (
            <ChartContainer config={chartConfig} className="h-72 w-full">
              <LineChart data={seriesByFacility}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="period" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                {facilityKeys.map((k, i) => (
                  <Line
                    key={k}
                    type="monotone"
                    dataKey={k}
                    stroke={showRate ? CHART_COLORS[i % CHART_COLORS.length] : AGE_CHART_COLORS[ageGroup as keyof typeof AGE_CHART_COLORS]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-[family-name:var(--font-display)]">
              Before / After deltas ({AGE_LABELS[ageGroup as keyof typeof AGE_LABELS]})
            </CardTitle>
            <CardDescription>{indicator}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                before: { label: "Before", color: "var(--chart-3)" },
                after: { label: "After", color: "var(--chart-1)" },
              }}
              className="h-64 w-full"
            >
              <BarChart data={beforeAfter.slice(0, 12)}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" hide />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar dataKey="before" fill="var(--chart-3)" radius={2} />
                <Bar dataKey="after" fill="var(--chart-1)" radius={2} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-[family-name:var(--font-display)]">
              Source agreement rate
            </CardTitle>
            <CardDescription>Before visit</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ rate: { label: "Agreement %", color: "var(--chart-2)" } }}
              className="h-64 w-full"
            >
              <LineChart data={agreementData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="period" tickLine={false} axisLine={false} />
                <YAxis unit="%" tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="var(--chart-2)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          All data elements
        </h3>
        <Tabs defaultValue={defaultTab}>
          <TabsList className="flex h-auto flex-wrap gap-1">
            {categories.map((cat) => (
              <TabsTrigger key={cat.dataType} value={cat.dataType}>
                {cat.dataType}
              </TabsTrigger>
            ))}
          </TabsList>
          {categories.map((cat) => (
            <TabsContent key={cat.dataType} value={cat.dataType} className="mt-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {cat.indicators.map((ind) => (
                  <IndicatorSparkline
                    key={ind}
                    indicator={ind}
                    dataType={cat.dataType}
                    counts={counts.filter((c) => c.dataType === cat.dataType)}
                    source={source}
                    stage={stage}
                    facilityNames={facilityNames}
                    facilityId={facilityId}
                    onSelect={() => setSelected({ indicator: ind, dataType: cat.dataType })}
                  />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {selected && (
        <IndicatorDrillDown
          open={!!selected}
          onOpenChange={(open) => !open && setSelected(null)}
          indicator={selected.indicator}
          dataType={selected.dataType}
          counts={counts}
          stage={stage}
          source={source}
          facilityNames={facilityNames}
          facilityId={facilityId}
          periods={periods}
          selectedPeriod={snapshotPeriod || latest}
          onPeriodChange={setSnapshotPeriod}
        />
      )}
    </div>
  );
}
