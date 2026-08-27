import { indicators } from "@/lib/indicators";

export type TrendCount = {
  facilityId: number;
  period: string;
  indicator: string;
  source: string;
  stage: string;
  ageGroup: string;
  value: number;
  dataType: string;
};

export type TrendRate = TrendCount & {
  rate: number | null;
  numerator: number;
  denominator: number;
};

export type AgreementPoint = {
  period: string;
  rate: number | null;
  agreed: number;
  total: number;
};

export type Grain = "month" | "quarter" | "year";

export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function getCountableIndicatorsByCategory() {
  return indicators.categories.map((cat) => ({
    dataType: cat.dataType,
    indicators: cat.indicators
      .filter((i) => i.kind === "count")
      .map((i) => i.name),
  }));
}

export function buildFacilitySeries(
  counts: TrendCount[],
  indicator: string,
  source: string,
  stage: string,
  facilityNames: Map<number, string>,
  facilityId?: number | ""
) {
  const filtered = counts.filter(
    (c) =>
      c.indicator === indicator &&
      c.source === source &&
      c.stage === stage &&
      (!facilityId || c.facilityId === facilityId)
  );

  const periods = [...new Set(filtered.map((c) => c.period))].sort();
  const facilityIds = [...new Set(filtered.map((c) => c.facilityId))];

  return periods.map((period) => {
    const row: Record<string, string | number | null> = { period };
    for (const fid of facilityIds) {
      const name = facilityNames.get(fid) ?? String(fid);
      const values = filtered
        .filter((c) => c.period === period && c.facilityId === fid)
        .reduce((sum, c) => sum + c.value, 0);
      row[name] = values;
    }
    return row;
  });
}

export function buildTotalSeries(
  counts: TrendCount[],
  indicator: string,
  source: string,
  stage: string,
  facilityId?: number | ""
) {
  const filtered = counts.filter(
    (c) =>
      c.indicator === indicator &&
      c.source === source &&
      c.stage === stage &&
      (!facilityId || c.facilityId === facilityId)
  );

  const byPeriod = new Map<string, number>();
  for (const c of filtered) {
    byPeriod.set(c.period, (byPeriod.get(c.period) ?? 0) + c.value);
  }

  return [...byPeriod.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, total]) => ({ period, total }));
}

export function getFacilityKeys(
  counts: TrendCount[],
  indicator: string,
  source: string,
  stage: string,
  facilityNames: Map<number, string>,
  facilityId?: number | "",
  limit = 6
) {
  const totals = new Map<number, number>();
  for (const c of counts) {
    if (
      c.indicator !== indicator ||
      c.source !== source ||
      c.stage !== stage ||
      (facilityId && c.facilityId !== facilityId)
    ) {
      continue;
    }
    totals.set(c.facilityId, (totals.get(c.facilityId) ?? 0) + c.value);
  }

  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => facilityNames.get(id) ?? String(id));
}

export function buildBeforeAfterData(
  counts: TrendCount[],
  indicator: string,
  source: string,
  facilityNames: Map<number, string>,
  facilityId?: number | ""
) {
  const map = new Map<string, { before?: number; after?: number }>();
  for (const c of counts.filter(
    (x) =>
      x.indicator === indicator &&
      x.source === source &&
      x.ageGroup === "Over 5yrs" &&
      (!facilityId || x.facilityId === facilityId)
  )) {
    const key = `${facilityNames.get(c.facilityId) ?? c.facilityId}|${c.period}`;
    const b = map.get(key) ?? {};
    if (c.stage === "before") b.before = (b.before ?? 0) + c.value;
    if (c.stage === "after") b.after = (b.after ?? 0) + c.value;
    map.set(key, b);
  }

  return [...map.entries()].map(([key, v]) => {
    const [facility, period] = key.split("|");
    return {
      label: `${facility} ${period}`,
      before: v.before ?? 0,
      after: v.after ?? 0,
      delta: (v.after ?? 0) - (v.before ?? 0),
    };
  });
}
