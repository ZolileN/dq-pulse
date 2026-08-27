"use client";

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { SOURCE_LABELS } from "@/lib/cascade-config";
import type { SourceComparisonRow } from "@/lib/trend-utils";

const SOURCE_COLORS: Record<string, string> = {
  register: "var(--chart-1)",
  summary_sheet: "var(--chart-2)",
  tier_net: "var(--chart-3)",
  dhis: "var(--chart-4)",
};

type SourceComparisonChartProps = {
  rows: SourceComparisonRow[];
  ageLabel: string;
  className?: string;
};

export function SourceComparisonChart({
  rows,
  ageLabel,
  className,
}: SourceComparisonChartProps) {
  const data = rows.map((r) => ({
    source: SOURCE_LABELS[r.source] ?? r.sourceLabel,
    value: r.value,
    rawSource: r.source,
  }));

  const values = data.map((d) => d.value).filter((v) => v > 0);
  const hasMismatch =
    values.length > 1 && new Set(values).size > 1;

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{ageLabel}</p>
        {hasMismatch && (
          <span className="text-xs font-medium text-destructive">Sources disagree</span>
        )}
      </div>
      <ChartContainer
        config={{ value: { label: "Count", color: "var(--chart-1)" } }}
        className="h-[200px] w-full"
      >
        <BarChart data={data} margin={{ top: 4, bottom: 4 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="source"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10 }}
          />
          <YAxis tickLine={false} axisLine={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell
                key={entry.rawSource}
                fill={SOURCE_COLORS[entry.rawSource] ?? "var(--chart-1)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {data.map((d) => (
          <div
            key={d.rawSource}
            className="rounded-md border bg-muted/30 px-2 py-1.5 text-center"
          >
            <p className="text-[10px] text-muted-foreground">{d.source}</p>
            <p className="text-sm font-semibold tabular-nums">
              {d.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
