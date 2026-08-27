"use client";

import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendFilters } from "@/components/trends/trend-filters";
import { IndicatorKpiCard } from "@/components/trends/indicator-kpi-card";
import { IndicatorDetailView } from "@/components/trends/indicator-detail-view";
import { DqaKpiStrip } from "@/components/trends/dqa-kpi-strip";
import { useDrillDownPeriods } from "@/hooks/use-drill-down-periods";
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

type DashboardAnalyticsProps = {
  flaggedCount?: number;
};

export function DashboardAnalytics({ flaggedCount: _flaggedCount }: DashboardAnalyticsProps) {
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
  const reportingPeriod = snapshotPeriod || latest;

  useEffect(() => {
    if (!latest) return;
    if (!snapshotPeriod || !periods.includes(snapshotPeriod)) {
      setSnapshotPeriod(latest);
    }
  }, [periods, latest, snapshotPeriod]);

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

  const defaultTab = categories[0]?.dataType ?? "TB cascade";

  if (selected) {
    return (
      <div className="space-y-4">
        <TrendFilters
          grain={grain}
          onGrainChange={setGrain}
          periods={periods}
          selectedPeriod={reportingPeriod}
          onPeriodChange={setSnapshotPeriod}
          facilities={facilities}
          facilityId={facilityId}
          onFacilityChange={setFacilityId}
          stage={stage}
          onStageChange={setStage}
          source={source}
          onSourceChange={setSource}
        />
        <IndicatorDetailView
          indicator={selected.indicator}
          dataType={selected.dataType}
          counts={counts}
          stage={stage}
          source={source}
          facilityNames={facilityNames}
          facilityId={facilityId}
          periods={periods}
          selectedPeriod={reportingPeriod}
          onBack={() => setSelected(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TrendFilters
        grain={grain}
        onGrainChange={setGrain}
        periods={periods}
        selectedPeriod={reportingPeriod}
        onPeriodChange={setSnapshotPeriod}
        facilities={facilities}
        facilityId={facilityId}
        onFacilityChange={setFacilityId}
        stage={stage}
        onStageChange={setStage}
        source={source}
        onSourceChange={setSource}
      />

      <DqaKpiStrip
        counts={counts}
        source={source}
        stage={stage}
        period={reportingPeriod}
        facilityId={facilityId}
        loading={loading}
      />

      <Tabs defaultValue={defaultTab} className="isolate">
        <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/50 p-1">
          {categories.map((cat) => (
            <TabsTrigger
              key={cat.dataType}
              value={cat.dataType}
              className="text-xs sm:text-sm"
            >
              {cat.dataType}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((cat) => (
          <TabsContent
            key={cat.dataType}
            value={cat.dataType}
            className="mt-0 focus-visible:outline-none"
          >
            {loading ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-48 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {cat.indicators.map((indicator) => (
                  <IndicatorKpiCard
                    key={indicator}
                    indicator={indicator}
                    counts={counts.filter((c) => c.dataType === cat.dataType)}
                    source={source}
                    stage={stage}
                    period={reportingPeriod}
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
    </div>
  );
}
