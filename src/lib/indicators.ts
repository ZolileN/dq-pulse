import indicatorsConfig from "../../config/indicators.json";

export type IndicatorKind = "count" | "rate";

export type IndicatorDef = {
  name: string;
  kind: IndicatorKind;
  ageSplit?: boolean;
};

export type CategoryDef = {
  dataType: string;
  lookBackMonths: number;
  layout: string;
  defaultSource?: string;
  defaultAgeGroup?: string;
  sources?: string[];
  indicators: IndicatorDef[];
};

export type RateDef = {
  id: string;
  dataType: string;
  numerator: string;
  denominator: string;
  label: string;
};

export const indicators = indicatorsConfig as {
  sources: { id: string; label: string; aliases: string[] }[];
  ageGroups: { id: string; aliases: string[] }[];
  rates: RateDef[];
  categories: CategoryDef[];
};

export function normalizeSource(raw: string): string | null {
  const t = raw.trim();
  if (!t || /^check$/i.test(t) || /comments/i.test(t)) return null;
  for (const s of indicators.sources) {
    if (s.id === t || s.label === t || s.aliases.some((a) => a.toLowerCase() === t.toLowerCase())) {
      return s.id;
    }
    if (s.aliases.some((a) => t.toLowerCase().includes(a.toLowerCase()))) {
      return s.id;
    }
  }
  if (/register|tally|tir|patient file|cir/i.test(t)) return "register";
  if (/summary|rmr|monthly report/i.test(t)) return "summary_sheet";
  if (/tier/i.test(t)) return "tier_net";
  if (/dhis/i.test(t)) return "dhis";
  return null;
}

export function normalizeAgeGroup(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  for (const a of indicators.ageGroups) {
    if (a.id === t || a.aliases.some((x) => x.toLowerCase() === t.toLowerCase())) {
      return a.id;
    }
  }
  if (/under\s*5/i.test(t)) return "Under 5yrs";
  if (/over\s*5|5yrs?\s*&\s*o/i.test(t)) return "Over 5yrs";
  if (/all\s*ages/i.test(t)) return "All ages";
  return null;
}

export function isRateIndicator(name: string): boolean {
  const n = name.trim().toLowerCase();
  if (n.includes(" rate") || n.endsWith("rate")) return true;
  return indicators.categories.some((c) =>
    c.indicators.some((i) => i.name === name && i.kind === "rate")
  );
}

export function getCountableIndicators(): { dataType: string; name: string; ageSplit: boolean; layout: string; defaultSource?: string; defaultAgeGroup?: string; sources?: string[] }[] {
  const out: ReturnType<typeof getCountableIndicators> = [];
  for (const cat of indicators.categories) {
    for (const ind of cat.indicators) {
      if (ind.kind === "rate") continue;
      out.push({
        dataType: cat.dataType,
        name: ind.name,
        ageSplit: ind.ageSplit ?? false,
        layout: cat.layout,
        defaultSource: cat.defaultSource,
        defaultAgeGroup: cat.defaultAgeGroup,
        sources: cat.sources,
      });
    }
  }
  return out;
}

export function sourceLabel(id: string): string {
  return indicators.sources.find((s) => s.id === id)?.label ?? id;
}
