"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type FacilityOption = { id: number; name: string };

type FacilitySelectProps = {
  facilities: FacilityOption[];
  value: string | number | "";
  onValueChange: (value: string) => void;
  placeholder?: string;
  allowAll?: boolean;
  allLabel?: string;
  triggerClassName?: string;
  disabled?: boolean;
};

export function getFacilityName(
  facilities: FacilityOption[],
  value: string | number | ""
): string | null {
  if (value === "" || value === "all") return null;
  return facilities.find((f) => f.id === Number(value))?.name ?? null;
}

export function FacilitySelect({
  facilities,
  value,
  onValueChange,
  placeholder = "Select facility",
  allowAll = false,
  allLabel = "All facilities",
  triggerClassName,
  disabled,
}: FacilitySelectProps) {
  const selectValue =
    value === "" ? (allowAll ? "all" : undefined) : String(value);
  const selectedName = getFacilityName(facilities, value);
  const displayLabel =
    value === "" && allowAll ? allLabel : selectedName ?? placeholder;

  return (
    <Select
      value={selectValue}
      onValueChange={(v) => v && onValueChange(v)}
      disabled={disabled}
    >
      <SelectTrigger className={cn("w-full min-w-[160px]", triggerClassName)}>
        <SelectValue placeholder={placeholder}>{displayLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {allowAll && <SelectItem value="all">{allLabel}</SelectItem>}
        {facilities.map((f) => (
          <SelectItem key={f.id} value={String(f.id)}>
            {f.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
