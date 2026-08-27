"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getCountableIndicators, indicators, sourceLabel } from "@/lib/indicators";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { defaultReportingMonth } from "@/lib/default-period";
import {
  computeDstbTotal,
  computeTbTotalAllCases,
  isDstbComputedIndicator,
  withDstbComputedRows,
} from "@/lib/dstb-computed";

type Facility = { id: number; name: string; district: string | null };

type CellKey = string;

function cellKey(
  dataType: string,
  indicator: string,
  ageGroup: string,
  source: string,
  stage: string
): CellKey {
  return `${dataType}|${indicator}|${ageGroup}|${source}|${stage}`;
}

const entryMetaSchema = z.object({
  facilityId: z.string().min(1, "Select a facility"),
  periodDate: z.string().min(1, "Reporting month is required"),
  stage: z.enum(["before", "after"]),
  category: z.string().min(1),
  staffName: z.string().min(1, "Staff name is required"),
  isCorrection: z.boolean(),
  correctionOfPeriodDate: z.string().optional(),
});

type EntryMetaValues = z.infer<typeof entryMetaSchema>;

export default function EntryPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const form = useForm<EntryMetaValues>({
    resolver: zodResolver(entryMetaSchema),
    defaultValues: {
      facilityId: "",
      periodDate: defaultReportingMonth(),
      stage: "before",
      category: indicators.categories[0].dataType,
      staffName: "",
      isCorrection: false,
      correctionOfPeriodDate: "",
    },
  });

  const stage = form.watch("stage");
  const category = form.watch("category");
  const isCorrection = form.watch("isCorrection");

  useEffect(() => {
    fetch("/api/facilities")
      .then((r) => r.json())
      .then((d) => setFacilities(d.facilities ?? []));
  }, []);

  const countable = useMemo(
    () => getCountableIndicators().filter((i) => i.dataType === category),
    [category]
  );

  function setVal(indicator: string, ageGroup: string, source: string, v: string) {
    setValues((prev) => ({
      ...prev,
      [cellKey(category, indicator, ageGroup, source, stage)]: v,
    }));
  }

  function getVal(indicator: string, ageGroup: string, source: string) {
    return values[cellKey(category, indicator, ageGroup, source, stage)] ?? "";
  }

  function numericVal(indicator: string, ageGroup: string, source: string) {
    const raw = getVal(indicator, ageGroup, source);
    if (raw === "") return 0;
    const n = Number(raw);
    return Number.isNaN(n) ? 0 : n;
  }

  function componentValues(ageGroup: string, source: string) {
    return Object.fromEntries(
      countable
        .filter((ind) => !isDstbComputedIndicator(ind.name))
        .map((ind) => [ind.name, numericVal(ind.name, ageGroup, source)])
    );
  }

  function displayVal(indicator: string, ageGroup: string, source: string) {
    if (category !== "DSTB outcome" || !isDstbComputedIndicator(indicator)) {
      return getVal(indicator, ageGroup, source);
    }
    const values = componentValues(ageGroup, source);
    if (indicator === "DSTB Total") return String(computeDstbTotal(values));
    return String(computeTbTotalAllCases(values));
  }

  async function onSave(meta: EntryMetaValues) {
    setSaving(true);
    const rows: {
      dataType: string;
      ageGroup: string;
      indicator: string;
      source: string;
      stage: "before" | "after";
      value: number;
    }[] = [];

    for (const [key, raw] of Object.entries(values)) {
      if (raw === "" || raw == null) continue;
      const [dataType, indicator, ageGroup, source, st] = key.split("|");
      if (st !== meta.stage) continue;
      if (isDstbComputedIndicator(indicator)) continue;
      const value = Number(raw);
      if (Number.isNaN(value)) continue;
      rows.push({
        dataType,
        indicator,
        ageGroup,
        source,
        stage: st as "before" | "after",
        value,
      });
    }

    const enrichedRows = withDstbComputedRows(rows);

    const byInd = new Map<string, Record<string, number>>();
    for (const r of enrichedRows.filter((x) => x.stage === meta.stage)) {
      const k = `${r.indicator}|${r.ageGroup}`;
      const b = byInd.get(k) ?? {};
      b[r.source] = r.value;
      byInd.set(k, b);
    }
    const mismatches: {
      indicator: string;
      ageGroup: string;
      stage: "before" | "after";
      sources: Record<string, number | null>;
      message: string;
    }[] = [];
    for (const [k, sources] of byInd) {
      const [indicator, ageGroup] = k.split("|");
      const pairs: [string, string][] = [
        ["register", "summary_sheet"],
        ["summary_sheet", "tier_net"],
        ["tier_net", "dhis"],
        ["register", "tier_net"],
      ];
      for (const [a, b] of pairs) {
        if (sources[a] == null || sources[b] == null) continue;
        if (sources[a] !== sources[b]) {
          mismatches.push({
            indicator,
            ageGroup,
            stage: meta.stage,
            sources,
            message: `Mismatch on ${indicator} (${ageGroup}, ${meta.stage}): ${a}=${sources[a]} vs ${b}=${sources[b]}`,
          });
        }
      }
    }

    const res = await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        facilityId: Number(meta.facilityId),
        periodDate: meta.periodDate,
        entryMethod: meta.isCorrection ? "correction" : "web_form",
        isCorrection: meta.isCorrection,
        correctionOfPeriodDate: meta.isCorrection ? meta.correctionOfPeriodDate : null,
        metadata: { staffName: meta.staffName, activity: "Monthly DQA", tbType: "DS-TB" },
        rows: enrichedRows,
        mismatches,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast.error(data.error ?? "Save failed");
      return;
    }
    toast.success(
      `Saved ${enrichedRows.length} values` +
        (mismatches.length
          ? ` — ${mismatches.length} source mismatch(es) flagged`
          : "")
    );
  }

  const sourcesFor = (ind: (typeof countable)[0]) => {
    if (ind.layout === "multi_source_matrix") {
      return ["register", "summary_sheet", "tier_net", "dhis"];
    }
    if (ind.layout === "dual_source") return ind.sources ?? ["register", "tier_net"];
    return [ind.defaultSource ?? "register"];
  };

  const agesFor = (ind: (typeof countable)[0]) => {
    if (ind.ageSplit) return ["Under 5yrs", "Over 5yrs"];
    return [ind.defaultAgeGroup ?? "All ages"];
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Web form entry"
        description="Enter Before/After counts per indicator × age group × source. Rates and DSTB totals (DSTB Total, TB Total all cases) are calculated automatically."
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSave)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-[family-name:var(--font-display)]">
                Entry metadata
              </CardTitle>
              <CardDescription>Facility, period, and staff details</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField
                control={form.control}
                name="facilityId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Facility</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select facility" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {facilities.map((f) => (
                          <SelectItem key={f.id} value={String(f.id)}>
                            {f.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="periodDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reporting month</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stage</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="before">Before</SelectItem>
                        <SelectItem value="after">After</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {indicators.categories.map((c) => (
                          <SelectItem key={c.dataType} value={c.dataType}>
                            {c.dataType}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="staffName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Staff name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isCorrection"
                render={({ field }) => (
                  <FormItem className="flex items-end gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0 cursor-pointer font-normal">
                      This is a correction to a locked prior month
                    </FormLabel>
                  </FormItem>
                )}
              />
              {isCorrection && (
                <FormField
                  control={form.control}
                  name="correctionOfPeriodDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prior month being corrected</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-[family-name:var(--font-display)]">
                Data matrix — {category}
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Indicator</TableHead>
                    <TableHead>Age</TableHead>
                    {["register", "summary_sheet", "tier_net", "dhis"].map((s) => (
                      <TableHead key={s}>{sourceLabel(s)}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {countable.map((ind) =>
                    agesFor(ind).map((age) => (
                      <TableRow key={`${ind.name}-${age}`}>
                        <TableCell className="font-medium">{ind.name}</TableCell>
                        <TableCell className="whitespace-nowrap">{age}</TableCell>
                        {["register", "summary_sheet", "tier_net", "dhis"].map((s) => {
                          const enabled = sourcesFor(ind).includes(s);
                          return (
                            <TableCell key={s}>
                              {enabled ? (
                          isDstbComputedIndicator(ind.name) ? (
                            <Input
                              type="number"
                              className="w-24 bg-muted text-muted-foreground"
                              value={displayVal(ind.name, age, s)}
                              readOnly
                              tabIndex={-1}
                              title={
                                ind.name === "DSTB Total"
                                  ? "Auto: Treatment success + LTFU + Failure + Died + Not evaluated"
                                  : "Auto: DSTB Total + Transfer out + Rif resistant + MDR"
                              }
                            />
                          ) : (
                            <Input
                              type="number"
                              className="w-24"
                              value={getVal(ind.name, age, s)}
                              onChange={(e) =>
                                setVal(ind.name, age, s, e.target.value)
                              }
                            />
                          )
                        ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : isCorrection ? "Save correction" : "Save entries"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
