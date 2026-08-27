"use client";

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { CascadeStep } from "@/lib/trend-utils";

type CascadeFunnelChartProps = {
  steps: CascadeStep[];
  ageLabel: string;
  className?: string;
};

export function CascadeFunnelChart({
  steps,
  ageLabel,
  className,
}: CascadeFunnelChartProps) {
  if (steps.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No cascade data for {ageLabel}.</p>
    );
  }

  const data = steps.map((s) => ({
    name: s.indicator.length > 28 ? `${s.indicator.slice(0, 26)}…` : s.indicator,
    fullName: s.indicator,
    value: s.value,
    rate: s.conversionRate,
  }));

  return (
    <div className={className}>
      <p className="mb-2 text-xs font-medium text-muted-foreground">{ageLabel}</p>
      <ChartContainer
        config={{ value: { label: "Count", color: "var(--chart-1)" } }}
        className="h-[280px] w-full"
      >
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
          <CartesianGrid horizontal={false} strokeDasharray="3 3" />
          <XAxis type="number" tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={140}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10 }}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, _name, item) => {
                  const payload = item.payload as (typeof data)[0];
                  return (
                    <div className="space-y-1">
                      <p className="font-medium">{payload.fullName}</p>
                      <p>Count: {Number(value).toLocaleString()}</p>
                      {payload.rate != null && (
                        <p className="text-muted-foreground">
                          {payload.rate}% of previous step
                        </p>
                      )}
                    </div>
                  );
                }}
              />
            }
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
            {data.map((entry, i) => (
              <Cell
                key={entry.fullName}
                fill={`color-mix(in oklch, var(--chart-1) ${100 - (i / data.length) * 40}%, var(--chart-2))`}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}
