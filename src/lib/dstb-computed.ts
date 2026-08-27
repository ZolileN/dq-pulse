/** ACC1 DS-TB DQA tool v3 — DSTB outcome auto-calculations (row 67 & 72). */

export const DSTB_TOTAL_COMPONENTS = [
  "DSTB Treatment success",
  "DSTB LTFU",
  "DSTB Treatment Failure",
  "DSTB Died",
  "Not evaluated",
] as const;

export const TB_TOTAL_ALL_CASES_ADDITIONS = [
  "DSTB Transfer out (TFO)",
  "TB Rif resistant",
  "TB MDR",
] as const;

export const DSTB_COMPUTED_INDICATORS = [
  "DSTB Total",
  "TB Total all cases",
] as const;

export type DstbComputedIndicator = (typeof DSTB_COMPUTED_INDICATORS)[number];

export function isDstbComputedIndicator(name: string): name is DstbComputedIndicator {
  return (DSTB_COMPUTED_INDICATORS as readonly string[]).includes(name);
}

function sumIndicators(
  values: Record<string, number>,
  indicators: readonly string[]
): number {
  return indicators.reduce((total, indicator) => total + (values[indicator] ?? 0), 0);
}

/** Row 67: sum of the five DSTB outcome categories above the total row. */
export function computeDstbTotal(values: Record<string, number>): number {
  return sumIndicators(values, DSTB_TOTAL_COMPONENTS);
}

/** Row 72: DSTB total plus transfer-out, rif-resistant, and MDR cases. */
export function computeTbTotalAllCases(values: Record<string, number>): number {
  const dstbTotal = computeDstbTotal(values);
  return dstbTotal + sumIndicators(values, TB_TOTAL_ALL_CASES_ADDITIONS);
}

export type EntryRow = {
  dataType: string;
  ageGroup: string;
  indicator: string;
  source: string;
  stage: "before" | "after";
  value: number;
  comments?: string;
};

function groupKey(row: Pick<EntryRow, "dataType" | "ageGroup" | "source" | "stage">) {
  return `${row.dataType}|${row.ageGroup}|${row.source}|${row.stage}`;
}

/** Inject or replace computed DSTB outcome totals before persisting. */
export function withDstbComputedRows<T extends EntryRow>(rows: T[]): T[] {
  const manual = rows.filter(
    (row) =>
      row.dataType !== "DSTB outcome" || !isDstbComputedIndicator(row.indicator)
  );

  const groups = new Map<string, { template: T; values: Record<string, number> }>();
  for (const row of manual) {
    if (row.dataType !== "DSTB outcome") continue;
    const key = groupKey(row);
    const group = groups.get(key);
    if (!group) {
      groups.set(key, { template: row, values: { [row.indicator]: row.value } });
      continue;
    }
    group.values[row.indicator] = row.value;
  }

  const computed: T[] = [];
  for (const { template, values } of groups.values()) {
    computed.push(
      { ...template, indicator: "DSTB Total", value: computeDstbTotal(values) } as T,
      {
        ...template,
        indicator: "TB Total all cases",
        value: computeTbTotalAllCases(values),
      } as T
    );
  }

  return [...manual, ...computed];
}
