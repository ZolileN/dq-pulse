"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FacilitySelect } from "@/components/facility-select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPeriodLabel, type Grain } from "@/lib/trend-utils";

type Facility = { id: number; name: string };

type TrendFiltersProps = {
  grain: Grain;
  onGrainChange: (grain: Grain) => void;
  periods: string[];
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
  facilities: Facility[];
  facilityId: number | "";
  onFacilityChange: (id: number | "") => void;
  stage: string;
  onStageChange: (stage: string) => void;
  source: string;
  onSourceChange: (source: string) => void;
  compact?: boolean;
};

export function TrendFilters({
  grain,
  onGrainChange,
  periods,
  selectedPeriod,
  onPeriodChange,
  facilities,
  facilityId,
  onFacilityChange,
  stage,
  onStageChange,
  source,
  onSourceChange,
  compact = false,
}: TrendFiltersProps) {
  return (
    <div
      className={
        compact
          ? "flex flex-wrap items-end gap-3"
          : "grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
      }
    >
      <div className="space-y-2">
        <Label>Grain</Label>
        <Tabs
          value={grain}
          onValueChange={(v) => onGrainChange(v as Grain)}
        >
          <TabsList className="w-full">
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="quarter">Quarter</TabsTrigger>
            <TabsTrigger value="year">Year</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="space-y-2">
        <Label>Reporting period</Label>
        <Select
          value={selectedPeriod || undefined}
          onValueChange={(v) => v && onPeriodChange(v)}
          disabled={periods.length === 0}
        >
          <SelectTrigger className="w-full min-w-[160px]">
            <SelectValue placeholder="Select period">
              {selectedPeriod
                ? formatPeriodLabel(selectedPeriod, grain)
                : "Select period"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {[...periods].reverse().map((p) => (
              <SelectItem key={p} value={p}>
                {formatPeriodLabel(p, grain)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Facility</Label>
        <FacilitySelect
          facilities={facilities}
          value={facilityId}
          onValueChange={(v) =>
            onFacilityChange(v === "all" ? "" : Number(v))
          }
          allowAll
        />
      </div>

      <div className="space-y-2">
        <Label>Stage</Label>
        <Select value={stage} onValueChange={(v) => v && onStageChange(v)}>
          <SelectTrigger className="w-full min-w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="before">Before</SelectItem>
            <SelectItem value="after">After</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Source</Label>
        <Select value={source} onValueChange={(v) => v && onSourceChange(v)}>
          <SelectTrigger className="w-full min-w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="register">CIR / TB register</SelectItem>
            <SelectItem value="summary_sheet">RMR</SelectItem>
            <SelectItem value="tier_net">TIER.Net</SelectItem>
            <SelectItem value="dhis">DHIS</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
