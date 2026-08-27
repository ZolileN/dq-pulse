import { indicators } from "@/lib/indicators";
import { getCascadeForCategory, AGE_LABELS } from "@/lib/cascade-config";

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

export const AGE_CHART_COLORS = {
  "Under 5yrs": "var(--chart-3)",
  "Over 5yrs": "var(--chart-1)",
};

export function getCountableIndicatorsByCategory() {
  return indicators.categories.map((cat) => ({
    dataType: cat.dataType,
    indicators: cat.indicators
      .filter((i) => i.kind === "count")
      .map((i) => i.name),
    ageSplit: cat.indicators.some((i) => i.ageSplit),
  }));
}

export function getLatestPeriod(counts: TrendCount[]): string | null {
  const periods = [...new Set(counts.map((c) => c.period))].sort();
  return periods.at(-1) ?? null;
}

export function getPriorPeriod(periods: string[], current: string): string | null {
  const idx = periods.indexOf(current);
  return idx > 0 ? periods[idx - 1] : null;
}

/** Programme-wide total trend for one age group (single clear line). */
export function buildAggregatedAgeTrend(
  counts: TrendCount[],
  indicator: string,
  source: string,
  stage: string,
  ageGroup: string,
  facilityId?: number | ""
) {
  const filtered = counts.filter(
    (c) =>
      c.indicator === indicator &&
      c.source === source &&
      c.stage === stage &&
      c.ageGroup === ageGroup &&
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

export type AgeSnapshot = {
  ageGroup: string;
  label: string;
  value: number;
  priorValue: number | null;
  changePct: number | null;
};

/** Latest vs prior period counts per age — for KPI cards. */
export function getAgeSnapshots(
  counts: TrendCount[],
  indicator: string,
  source: string,
  stage: string,
  period: string,
  priorPeriod: string | null,
  facilityId?: number | ""
): AgeSnapshot[] {
  return (["Under 5yrs", "Over 5yrs"] as const).map((ageGroup) => {
    const value = getSnapshotValue(
      counts,
      indicator,
      source,
      stage,
      ageGroup,
      period,
      facilityId
    );
    const priorValue = priorPeriod
      ? getSnapshotValue(counts, indicator, source, stage, ageGroup, priorPeriod, facilityId)
      : null;
    const changePct =
      priorValue != null && priorValue > 0
        ? Math.round(((value - priorValue) / priorValue) * 1000) / 10
        : null;
    return {
      ageGroup,
      label: AGE_LABELS[ageGroup],
      value,
      priorValue,
      changePct,
    };
  });
}

export type FacilityRankRow = {
  facility: string;
  children: number;
  adults: number;
  total: number;
};

/** Rank facilities by latest-period total for an indicator. */
export function buildFacilityRanking(
  counts: TrendCount[],
  indicator: string,
  source: string,
  stage: string,
  period: string,
  facilityNames: Map<number, string>,
  limit = 10
): FacilityRankRow[] {
  const byFacility = new Map<number, { children: number; adults: number }>();

  for (const c of counts.filter(
    (x) =>
      x.indicator === indicator &&
      x.source === source &&
      x.stage === stage &&
      x.period === period
  )) {
    const row = byFacility.get(c.facilityId) ?? { children: 0, adults: 0 };
    if (c.ageGroup === "Under 5yrs") row.children += c.value;
    else if (c.ageGroup === "Over 5yrs") row.adults += c.value;
    byFacility.set(c.facilityId, row);
  }

  return [...byFacility.entries()]
    .map(([id, v]) => ({
      facility: facilityNames.get(id) ?? String(id),
      children: v.children,
      adults: v.adults,
      total: v.children + v.adults,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

/** Programme-wide rate per ACC1: sum numerators ÷ sum denominators (all age groups & facilities). */
export type ProgrammeRate = {
  rate: number | null;
  numerator: number;
  denominator: number;
};

function sumIndicatorForPeriod(
  counts: TrendCount[],
  indicator: string,
  source: string,
  stage: string,
  period: string,
  ageGroup?: string,
  facilityId?: number | "",
  dataType?: string
): number {
  return counts
    .filter(
      (c) =>
        c.indicator === indicator &&
        c.source === source &&
        c.stage === stage &&
        c.period === period &&
        (!ageGroup || c.ageGroup === ageGroup) &&
        (!facilityId || c.facilityId === facilityId) &&
        (!dataType || c.dataType === dataType)
    )
    .reduce((sum, c) => sum + c.value, 0);
}

function toProgrammeRate(numerator: number, denominator: number): ProgrammeRate {
  return {
    numerator,
    denominator,
    rate:
      denominator === 0
        ? null
        : Math.round((numerator / denominator) * 1000) / 10,
  };
}

/** Programme-wide rate — sums numerators/denominators (ACC1 method, never averaged rates). */
export function computeProgrammeRate(
  counts: TrendCount[],
  numerator: string,
  denominator: string,
  source: string,
  stage: string,
  period: string,
  facilityId?: number | "",
  dataType?: string
): ProgrammeRate {
  const num = sumIndicatorForPeriod(
    counts,
    numerator,
    source,
    stage,
    period,
    undefined,
    facilityId,
    dataType
  );
  const den = sumIndicatorForPeriod(
    counts,
    denominator,
    source,
    stage,
    period,
    undefined,
    facilityId,
    dataType
  );

  return toProgrammeRate(num, den);
}

/** ACC1 rates per age group — children and adults are never mixed. */
export function computeProgrammeRatesByAge(
  counts: TrendCount[],
  numerator: string,
  denominator: string,
  source: string,
  stage: string,
  period: string,
  facilityId?: number | "",
  dataType?: string
): Record<"Under 5yrs" | "Over 5yrs", ProgrammeRate> {
  return {
    "Under 5yrs": toProgrammeRate(
      sumIndicatorForPeriod(
        counts,
        numerator,
        source,
        stage,
        period,
        "Under 5yrs",
        facilityId,
        dataType
      ),
      sumIndicatorForPeriod(
        counts,
        denominator,
        source,
        stage,
        period,
        "Under 5yrs",
        facilityId,
        dataType
      )
    ),
    "Over 5yrs": toProgrammeRate(
      sumIndicatorForPeriod(
        counts,
        numerator,
        source,
        stage,
        period,
        "Over 5yrs",
        facilityId,
        dataType
      ),
      sumIndicatorForPeriod(
        counts,
        denominator,
        source,
        stage,
        period,
        "Over 5yrs",
        facilityId,
        dataType
      )
    ),
  };
}

/** @deprecated Use computeProgrammeRate for dashboard KPIs */
export function computeIndicatorRate(
  counts: TrendCount[],
  numerator: string,
  denominator: string,
  source: string,
  stage: string,
  ageGroup: string,
  period: string,
  facilityId?: number | ""
): number | null {
  const num = getSnapshotValue(counts, numerator, source, stage, ageGroup, period, facilityId);
  const den = getSnapshotValue(counts, denominator, source, stage, ageGroup, period, facilityId);
  if (den === 0) return null;
  return Math.round((num / den) * 1000) / 10;
}

/** Trend series for one age group — never mixes ages. */
export function buildAgeTrendSeries(
  counts: TrendCount[],
  indicator: string,
  source: string,
  stage: string,
  ageGroup: string,
  facilityNames: Map<number, string>,
  facilityId?: number | ""
) {
  const filtered = counts.filter(
    (c) =>
      c.indicator === indicator &&
      c.source === source &&
      c.stage === stage &&
      c.ageGroup === ageGroup &&
      (!facilityId || c.facilityId === facilityId)
  );

  const periods = [...new Set(filtered.map((c) => c.period))].sort();
  const facilityIds = [...new Set(filtered.map((c) => c.facilityId))];

  return periods.map((period) => {
    const row: Record<string, string | number | null> = { period };
    for (const fid of facilityIds) {
      const name = facilityNames.get(fid) ?? String(fid);
      const val = filtered.find(
        (c) => c.period === period && c.facilityId === fid
      );
      row[name] = val?.value ?? null;
    }
    return row;
  });
}

/** Latest-period value for an indicator × age × source. */
export function getSnapshotValue(
  counts: TrendCount[],
  indicator: string,
  source: string,
  stage: string,
  ageGroup: string,
  period: string,
  facilityId?: number | ""
): number {
  return counts
    .filter(
      (c) =>
        c.indicator === indicator &&
        c.source === source &&
        c.stage === stage &&
        c.ageGroup === ageGroup &&
        c.period === period &&
        (!facilityId || c.facilityId === facilityId)
    )
    .reduce((sum, c) => sum + c.value, 0);
}

export type CascadeStep = {
  indicator: string;
  value: number;
  gapFromPrevious: number | null;
  gapLabel: string | null;
  conversionRate: number | null;
};

/** Build cascade funnel steps with visible gaps for one age group & source. */
export function buildCascadeSteps(
  counts: TrendCount[],
  dataType: string,
  stage: string,
  ageGroup: string,
  source: string,
  period: string,
  facilityId?: number | ""
): CascadeStep[] {
  const steps = getCascadeForCategory(dataType);
  if (!steps) return [];

  const result: CascadeStep[] = [];
  let previous: number | null = null;

  for (const indicator of steps) {
    const value = getSnapshotValue(
      counts,
      indicator,
      source,
      stage,
      ageGroup,
      period,
      facilityId
    );
    let gapFromPrevious: number | null = null;
    let gapLabel: string | null = null;
    let conversionRate: number | null = null;

    if (previous != null && previous > 0) {
      gapFromPrevious = previous - value;
      conversionRate = Math.round((value / previous) * 1000) / 10;
      if (gapFromPrevious > 0) {
        gapLabel = `${gapFromPrevious.toLocaleString()} not progressing`;
      }
    }

    result.push({ indicator, value, gapFromPrevious, gapLabel, conversionRate });
    previous = value;
  }

  return result;
}

export type SourceComparisonRow = {
  source: string;
  sourceLabel: string;
  value: number;
};

/** Compare all sources for one indicator × age at a point in time. */
export function buildSourceComparison(
  counts: TrendCount[],
  indicator: string,
  stage: string,
  ageGroup: string,
  period: string,
  facilityId?: number | "",
  sourceLabels: Record<string, string> = {}
): SourceComparisonRow[] {
  const sources = ["register", "summary_sheet", "tier_net", "dhis"];
  return sources.map((source) => ({
    source,
    sourceLabel: sourceLabels[source] ?? source,
    value: getSnapshotValue(
      counts,
      indicator,
      source,
      stage,
      ageGroup,
      period,
      facilityId
    ),
  }));
}

export type SourceTrendRow = {
  period: string;
  register: number | null;
  summary_sheet: number | null;
  tier_net: number | null;
  dhis: number | null;
};

/** Source comparison over time for one indicator × age. */
export function buildSourceTrendSeries(
  counts: TrendCount[],
  indicator: string,
  stage: string,
  ageGroup: string,
  facilityId?: number | ""
): SourceTrendRow[] {
  const filtered = counts.filter(
    (c) =>
      c.indicator === indicator &&
      c.stage === stage &&
      c.ageGroup === ageGroup &&
      (!facilityId || c.facilityId === facilityId)
  );

  const periods = [...new Set(filtered.map((c) => c.period))].sort();

  return periods.map((period) => {
    const row: SourceTrendRow = {
      period,
      register: null,
      summary_sheet: null,
      tier_net: null,
      dhis: null,
    };
    for (const c of filtered.filter((x) => x.period === period)) {
      row[c.source as keyof Omit<SourceTrendRow, "period">] = c.value;
    }
    return row;
  });
}

export function getFacilityKeysForAge(
  counts: TrendCount[],
  indicator: string,
  source: string,
  stage: string,
  ageGroup: string,
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
      c.ageGroup !== ageGroup ||
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
  ageGroup: string,
  facilityNames: Map<number, string>,
  facilityId?: number | ""
) {
  const map = new Map<string, { before?: number; after?: number }>();
  for (const c of counts.filter(
    (x) =>
      x.indicator === indicator &&
      x.source === source &&
      x.ageGroup === ageGroup &&
      (!facilityId || x.facilityId === facilityId)
  )) {
    const key = `${facilityNames.get(c.facilityId) ?? c.facilityId}|${c.period}`;
    const b = map.get(key) ?? {};
    if (c.stage === "before") {
      b.before = (b.before ?? 0) + c.value;
    } else if (c.stage === "after") {
      b.after = (b.after ?? 0) + c.value;
    }
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

