import { sql } from "drizzle-orm";
import { db } from "./db";
import { indicators, type RateDef } from "./indicators";

export type Grain = "month" | "quarter" | "year";

export type AggregatedCount = {
  facilityId: number;
  period: string;
  dataType: string;
  ageGroup: string;
  indicator: string;
  source: string;
  stage: string;
  value: number;
};

export type ComputedRate = {
  facilityId: number;
  period: string;
  dataType: string;
  ageGroup: string;
  indicator: string;
  source: string;
  stage: string;
  numerator: number;
  denominator: number;
  rate: number | null;
};

/**
 * Rates are NEVER stored and NEVER averaged across periods.
 * Always compute from summed counts at the requested grain.
 */
export async function getAggregatedCounts(
  grain: Grain,
  filters?: {
    facilityId?: number;
    stage?: string;
    dataType?: string;
    indicator?: string;
  }
): Promise<AggregatedCount[]> {
  const trunc =
    grain === "month"
      ? "month"
      : grain === "quarter"
        ? "quarter"
        : "year";

  const conditions: ReturnType<typeof sql>[] = [];
  if (filters?.facilityId != null) {
    conditions.push(sql`facility_id = ${filters.facilityId}`);
  }
  if (filters?.stage) conditions.push(sql`stage = ${filters.stage}`);
  if (filters?.dataType) conditions.push(sql`data_type = ${filters.dataType}`);
  if (filters?.indicator) conditions.push(sql`indicator = ${filters.indicator}`);

  const where =
    conditions.length > 0
      ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
      : sql``;

  const result = await db.execute(sql`
    SELECT
      facility_id AS "facilityId",
      (date_trunc(${sql.raw(`'${trunc}'`)}, period_date)::date)::text AS period,
      data_type AS "dataType",
      age_group AS "ageGroup",
      indicator,
      source,
      stage,
      SUM(value)::float AS value
    FROM entries
    ${where}
    GROUP BY 1, 2, 3, 4, 5, 6, 7
    ORDER BY 2, 1, 3, 5
  `);

  return (result.rows as AggregatedCount[]).map((r) => ({
    ...r,
    facilityId: Number(r.facilityId),
    value: Number(r.value),
  }));
}

export function computeRatesFromCounts(
  counts: AggregatedCount[],
  rateDefs: RateDef[] = indicators.rates
): ComputedRate[] {
  const index = new Map<string, number>();
  for (const c of counts) {
    const key = [
      c.facilityId,
      c.period,
      c.dataType,
      c.ageGroup,
      c.indicator,
      c.source,
      c.stage,
    ].join("|");
    index.set(key, c.value);
  }

  const rates: ComputedRate[] = [];
  const facilityPeriods = new Set(
    counts.map((c) =>
      [c.facilityId, c.period, c.ageGroup, c.source, c.stage, c.dataType].join("|")
    )
  );

  for (const fp of facilityPeriods) {
    const [facilityId, period, ageGroup, source, stage, dataType] = fp.split("|");
    for (const def of rateDefs) {
      if (def.dataType !== dataType) continue;
      const numKey = [facilityId, period, dataType, ageGroup, def.numerator, source, stage].join("|");
      const denKey = [facilityId, period, dataType, ageGroup, def.denominator, source, stage].join("|");
      const numerator = index.get(numKey);
      const denominator = index.get(denKey);
      if (numerator == null && denominator == null) continue;
      const n = numerator ?? 0;
      const d = denominator ?? 0;
      rates.push({
        facilityId: Number(facilityId),
        period,
        dataType,
        ageGroup,
        indicator: def.id,
        source,
        stage,
        numerator: n,
        denominator: d,
        rate: d === 0 ? null : n / d,
      });
    }
  }
  return rates;
}

export async function getTrendsWithRates(
  grain: Grain,
  filters?: {
    facilityId?: number;
    stage?: string;
    dataType?: string;
  }
) {
  const counts = await getAggregatedCounts(grain, filters);
  const rates = computeRatesFromCounts(counts);
  return { counts, rates };
}

export async function getSourceAgreementRate(grain: Grain) {
  const counts = await getAggregatedCounts(grain, { stage: "before" });
  const groups = new Map<string, Record<string, number>>();
  for (const c of counts) {
    const key = `${c.facilityId}|${c.period}|${c.dataType}|${c.ageGroup}|${c.indicator}`;
    const bucket = groups.get(key) ?? {};
    bucket[c.source] = c.value;
    groups.set(key, bucket);
  }

  const byPeriod = new Map<string, { agreed: number; total: number }>();
  for (const [key, sources] of groups) {
    const period = key.split("|")[1];
    const present = Object.keys(sources);
    if (present.length < 2) continue;
    const values = Object.values(sources);
    const agreed = values.every((v) => v === values[0]);
    const bucket = byPeriod.get(period) ?? { agreed: 0, total: 0 };
    bucket.total += 1;
    if (agreed) bucket.agreed += 1;
    byPeriod.set(period, bucket);
  }

  return [...byPeriod.entries()]
    .map(([period, { agreed, total }]) => ({
      period,
      agreed,
      total,
      rate: total === 0 ? null : agreed / total,
    }))
    .sort((a, b) => a.period.localeCompare(b.period));
}
