"use client";

import { useMemo } from "react";
import { getLatestPeriod, type TrendCount } from "@/lib/trend-utils";

export function useDrillDownPeriods(counts: TrendCount[]) {
  return useMemo(() => {
    const periods = [...new Set(counts.map((c) => c.period))].sort();
    const latest = getLatestPeriod(counts) ?? periods[0] ?? "";
    return { periods, latest };
  }, [counts]);
}
