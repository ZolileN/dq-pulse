"use client";

import { useEffect, useMemo, useState } from "react";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendFilters } from "@/components/trends/trend-filters";
import { IndicatorSparkline } from "@/components/trends/indicator-sparkline";
import {
  IndicatorDrillDown,
  useDrillDownPeriods,
} from "@/components/trends/indicator-drill-down";
import {
  getCountableIndicatorsByCategory,
  type TrendCount,
  type AgreementPoint,
  type Grain,
} from "@/lib/trend-utils";

type Facility = { id: number; name: string };

type SelectedIndicator = {
  indicator: string;
  dataType: string;
};

export function DashboardAnalytics() {
  const [grain, setGrain] = useState<Grain>("month");
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [facilityId, setFacilityId] = useState<number | "">("");
  const [counts, setCounts] = useState<TrendCount[]>([]);
  const [agreement, setAgreement] = useState<AgreementPoint[]>([]);
  const [stage, setStage] = useState("before");
  const [source, setSource] = useState("register");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SelectedIndicator | null>(null);
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
        setAgreement(agr.agreement ?? []);
      })
      .finally(() => setLoading(false));
  }, [grain, facilityId, stage]);

  const facilityNames = useMemo(
    () => new Map(facilities.map((f) => [f.id, f.name])),
    [facilities]
  );

  const agreementData = agreement.map((a) => ({
    period: a.period,
    rate: a.rate == null ? null : Math.round(a.rate * 1000) / 10,
  }));

  const defaultTab = categories[0]?.dataType ?? "TB cascade";

  return (
    <div className="space-y-6">
      <TrendFilters
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

      {!loading && agreementData.length > 0 && (
        <ChartContainer
          config={{ rate: { label: "Agreement %", color: "var(--chart-2)" } }}
          className="h-32 w-full rounded-xl border bg-card p-4"
        >
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Source agreement rate (before visit)
          </p>
          <LineChart data={agreementData} height={80}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="period" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
            <YAxis unit="%" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} width={36} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line type="monotone" dataKey="rate" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartContainer>
      )}

      <Tabs defaultValue={defaultTab}>
        <TabsList className="flex h-auto flex-wrap gap-1">
          {categories.map((cat) => (
            <TabsTrigger key={cat.dataType} value={cat.dataType} className="text-xs sm:text-sm">
              {cat.dataType}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((cat) => (
          <TabsContent key={cat.dataType} value={cat.dataType} className="mt-4">
            {loading ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-44 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {cat.indicators.map((indicator) => (
                  <IndicatorSparkline
                    key={indicator}
                    indicator={indicator}
                    dataType={cat.dataType}
                    counts={counts.filter((c) => c.dataType === cat.dataType)}
                    source={source}
                    stage={stage}
                    facilityNames={facilityNames}
                    facilityId={facilityId}
                    onSelect={() =>
                      setSelected({ indicator, dataType: cat.dataType })
                    }
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

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
