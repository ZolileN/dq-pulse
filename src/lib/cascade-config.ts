/** Cascade funnel steps — order matters for gap visualisation. */
export const CASCADE_STEPS: Record<string, string[]> = {
  "TB cascade": [
    "Headcount",
    "TB screening",
    "Client eligible for TB  test",
    "TB test using GeneXpert",
    "DS-TB clinically diagnosed",
    "DS-TB Bacteriologically confirmed",
    "RR-TB bacteriologically confirmed",
    "DSTB treatment start",
  ],
  TPT: [
    "TB contact",
    "TB contact start on TPT",
    "PLWHIV on ART eligible for TPT",
    "PLWHIV on ART started TPT",
  ],
};

export const AGE_GROUPS = ["Under 5yrs", "Over 5yrs"] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];

export const AGE_LABELS: Record<AgeGroup, string> = {
  "Under 5yrs": "Children (under 5)",
  "Over 5yrs": "Adults (5 years & older)",
};

export const SOURCE_IDS = [
  "register",
  "summary_sheet",
  "tier_net",
  "dhis",
] as const;

export const SOURCE_LABELS: Record<string, string> = {
  register: "CIR / TB register",
  summary_sheet: "RMR",
  tier_net: "TIER.Net",
  dhis: "DHIS",
};

export function getCascadeForCategory(dataType: string): string[] | null {
  return CASCADE_STEPS[dataType] ?? null;
}

export function getChartStrategy(
  dataType: string,
  indicator: string,
  inCascade: boolean
): "cascade" | "trend" | "source" | "bar" {
  if (inCascade && getCascadeForCategory(dataType)?.includes(indicator)) {
    return "cascade";
  }
  if (dataType === "TB register lists") return "bar";
  if (dataType === "DSTB outcome" || dataType === "DRTB outcome") return "bar";
  return "trend";
}
