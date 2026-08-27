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
import { AGE_LABELS } from "@/lib/cascade-config";
import {
  AGE_CHART_COLORS,
  buildAgeTrendSeries,
  getFacilityKeysForAge,
  type TrendCount,
} from "@/lib/trend-utils";
import { Maximize2 } from "lucide-react";

type IndicatorSparklineProps = {
  indicator: string;
  dataType: string;
  counts: TrendCount[];
  source: string;
  stage: string;
  facilityNames: Map<number, string>;
  facilityId?: number | "";
  onSelect?: () => void;
};

export function IndicatorSparkline({
  indicator,
  counts,
  source,
  stage,
  facilityNames,
  facilityId,
  onSelect,
}: IndicatorSparklineProps) {
  const ages = ["Under 5yrs", "Over 5yrs"] as const;
  const hasData = ages.some((age) =>
    counts.some(
      (c) =>
        c.indicator === indicator &&
        c.source === source &&
        c.stage === stage &&
        c.ageGroup === age
    )
  );

  if (!hasData) {
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

  return (
    <Card
      className="group h-full cursor-pointer transition-shadow hover:shadow-md hover:ring-1 hover:ring-primary/20"
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect?.()}
    >
      <CardHeader className="pb-1">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-2 text-sm font-medium leading-tight">
            {indicator}
          </CardTitle>
          <Maximize2 className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
        <CardDescription className="text-[10px]">
          Click to explore by age &amp; source
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 pb-3">
        {ages.map((ageGroup) => {
          const data = buildAgeTrendSeries(
            counts,
            indicator,
            source,
            stage,
            ageGroup,
            facilityNames,
            facilityId
          );
          const facilityKeys = getFacilityKeysForAge(
            counts,
            indicator,
            source,
            stage,
            ageGroup,
            facilityNames,
            facilityId,
            3
          );

          if (data.length === 0) return null;

          const chartConfig = {
            [ageGroup]: {
              label: AGE_LABELS[ageGroup],
              color: AGE_CHART_COLORS[ageGroup],
            },
          } satisfies ChartConfig;

          return (
            <div key={ageGroup}>
              <p className="mb-0.5 text-[10px] font-medium text-muted-foreground">
                {AGE_LABELS[ageGroup]}
              </p>
              <ChartContainer config={chartConfig} className="h-[52px] w-full">
                <LineChart
                  data={data}
                  margin={{ top: 2, right: 2, left: -28, bottom: 0 }}
                >
                  <XAxis dataKey="period" hide />
                  <YAxis hide />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  {facilityKeys.length <= 1 ? (
                    <Line
                      type="monotone"
                      dataKey={facilityKeys[0] ?? "value"}
                      stroke={AGE_CHART_COLORS[ageGroup]}
                      strokeWidth={1.5}
                      dot={false}
                    />
                  ) : (
                    facilityKeys.map((key) => (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stroke={AGE_CHART_COLORS[ageGroup]}
                        strokeWidth={1.5}
                        strokeOpacity={0.7}
                        dot={false}
                      />
                    ))
                  )}
                </LineChart>
              </ChartContainer>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
