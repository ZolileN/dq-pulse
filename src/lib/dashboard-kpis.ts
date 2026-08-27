import { indicators, type RateDef } from "@/lib/indicators";

/** ACC1 DS-TB DQA tool v3 — headline rates shown on the dashboard KPI strip. */
export const DASHBOARD_KPI_RATE_IDS = [
  "TB screening rate",
  "TB presumptive rate",
  "DSTB confirmation rate",
  "DSTB Treatment start rate",
  "TPT  initiation rate",
  "PLWHIV on ART started TPT rate",
] as const;

export function getDashboardKpiRates(): RateDef[] {
  const byId = new Map(indicators.rates.map((r) => [r.id, r]));
  return DASHBOARD_KPI_RATE_IDS.map((id) => byId.get(id)).filter(
    (r): r is RateDef => r != null
  );
}

/** Human-readable formula for KPI card subtitles (matches ACC1 workbook). */
export function formatRateFormula(rate: RateDef): string {
  return `${rate.numerator} ÷ ${rate.denominator}`;
}
