"use client";

import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  buildFacilitySeries,
  getFacilityKeys,
  CHART_COLORS,
  type TrendCount,
} from "@/lib/trend-utils";

type IndicatorSparklineProps = {
  indicator: string;
  counts: TrendCount[];
  source: string;
  stage: string;
  facilityNames: Map<number, string>;
  facilityId?: number | "";
};

export function IndicatorSparkline({
  indicator,
  counts,
  source,
  stage,
  facilityNames,
  facilityId,
}: IndicatorSparklineProps) {
  const facilityKeys = getFacilityKeys(
    counts,
    indicator,
    source,
    stage,
    facilityNames,
    facilityId
  );

  const data = buildFacilitySeries(
    counts,
    indicator,
    source,
    stage,
    facilityNames,
    facilityId
  );

  if (data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{indicator}</CardTitle>
          <CardDescription className="text-xs">No data</CardDescription>
        </CardHeader>
        <CardContent className="flex h-24 items-center justify-center text-xs text-muted-foreground">
          —
        </CardContent>
      </Card>
    );
  }

  const chartConfig = facilityKeys.reduce((acc, key, i) => {
    acc[key] = {
      label: key,
      color: CHART_COLORS[i % CHART_COLORS.length],
    };
    return acc;
  }, {} as ChartConfig);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="line-clamp-2 text-sm font-medium leading-tight">
          {indicator}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        <ChartContainer config={chartConfig} className="h-[120px] w-full">
          <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="period"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 9 }}
              tickFormatter={(v) => String(v).slice(0, 7)}
            />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9 }} width={32} />
            <ChartTooltip content={<ChartTooltipContent />} />
            {facilityKeys.map((key, i) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={CHART_COLORS[i % CHART_COLORS.length]}
                strokeWidth={1.5}
                dot={false}
              />
            ))}
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
