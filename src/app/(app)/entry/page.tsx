"use client";

import { useEffect, useMemo, useState } from "react";
import { getCountableIndicators, indicators, sourceLabel } from "@/lib/indicators";

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

export default function EntryPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [facilityId, setFacilityId] = useState<number | "">("");
  const [periodDate, setPeriodDate] = useState("2024-06-01");
  const [stage, setStage] = useState<"before" | "after">("before");
  const [category, setCategory] = useState(indicators.categories[0].dataType);
  const [values, setValues] = useState<Record<string, string>>({});
  const [staffName, setStaffName] = useState("");
  const [isCorrection, setIsCorrection] = useState(false);
  const [correctionOfPeriodDate, setCorrectionOfPeriodDate] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/facilities")
      .then((r) => r.json())
      .then((d) => setFacilities(d.facilities ?? []));
  }, []);

  const countable = useMemo(
    () => getCountableIndicators().filter((i) => i.dataType === category),
    [category]
  );

  function setVal(
    indicator: string,
    ageGroup: string,
    source: string,
    v: string
  ) {
    setValues((prev) => ({
      ...prev,
      [cellKey(category, indicator, ageGroup, source, stage)]: v,
    }));
  }

  function getVal(indicator: string, ageGroup: string, source: string) {
    return values[cellKey(category, indicator, ageGroup, source, stage)] ?? "";
  }

  async function onSave() {
    setSaving(true);
    setError(null);
    setStatus(null);
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
      if (st !== stage) continue;
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

    // Detect mismatches within submitted rows for this stage
    const byInd = new Map<string, Record<string, number>>();
    for (const r of rows.filter((x) => x.stage === stage)) {
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
            stage,
            sources,
            message: `Mismatch on ${indicator} (${ageGroup}, ${stage}): ${a}=${sources[a]} vs ${b}=${sources[b]}`,
          });
        }
      }
    }

    const res = await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        facilityId: Number(facilityId),
        periodDate,
        entryMethod: isCorrection ? "correction" : "web_form",
        isCorrection,
        correctionOfPeriodDate: isCorrection ? correctionOfPeriodDate : null,
        metadata: { staffName, activity: "Monthly DQA", tbType: "DS-TB" },
        rows,
        mismatches,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Save failed");
      return;
    }
    setStatus(
      `Saved ${rows.length} values` +
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
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--brand)]">
          Web form entry
        </h1>
        <p className="mt-1 text-[var(--muted)]">
          Enter Before/After counts per indicator × age group × source. Rates are computed later — do not enter them here.
        </p>
      </div>

      <div className="grid gap-3 border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">
          <span className="text-[var(--muted)]">Facility</span>
          <select
            className="mt-1 w-full border border-[var(--border)] px-2 py-2"
            value={facilityId}
            onChange={(e) => setFacilityId(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">Select…</option>
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-[var(--muted)]">Reporting month</span>
          <input
            type="date"
            className="mt-1 w-full border border-[var(--border)] px-2 py-2"
            value={periodDate}
            onChange={(e) => setPeriodDate(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="text-[var(--muted)]">Stage</span>
          <select
            className="mt-1 w-full border border-[var(--border)] px-2 py-2"
            value={stage}
            onChange={(e) => setStage(e.target.value as "before" | "after")}
          >
            <option value="before">Before</option>
            <option value="after">After</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="text-[var(--muted)]">Category</span>
          <select
            className="mt-1 w-full border border-[var(--border)] px-2 py-2"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {indicators.categories.map((c) => (
              <option key={c.dataType} value={c.dataType}>
                {c.dataType}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-[var(--muted)]">Staff name</span>
          <input
            className="mt-1 w-full border border-[var(--border)] px-2 py-2"
            value={staffName}
            onChange={(e) => setStaffName(e.target.value)}
          />
        </label>
        <label className="flex items-end gap-2 text-sm">
          <input
            type="checkbox"
            checked={isCorrection}
            onChange={(e) => setIsCorrection(e.target.checked)}
          />
          <span>This is a correction to a locked prior month</span>
        </label>
        {isCorrection && (
          <label className="text-sm">
            <span className="text-[var(--muted)]">Prior month being corrected</span>
            <input
              type="date"
              className="mt-1 w-full border border-[var(--border)] px-2 py-2"
              value={correctionOfPeriodDate}
              onChange={(e) => setCorrectionOfPeriodDate(e.target.value)}
            />
          </label>
        )}
      </div>

      <div className="overflow-x-auto border border-[var(--border)] bg-[var(--surface)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--brand-soft)]">
            <tr>
              <th className="px-3 py-2">Indicator</th>
              <th className="px-3 py-2">Age</th>
              {["register", "summary_sheet", "tier_net", "dhis"].map((s) => (
                <th key={s} className="px-3 py-2">
                  {sourceLabel(s)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {countable.map((ind) =>
              agesFor(ind).map((age) => (
                <tr key={`${ind.name}-${age}`} className="border-t border-[var(--border)]">
                  <td className="px-3 py-2">{ind.name}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{age}</td>
                  {["register", "summary_sheet", "tier_net", "dhis"].map((s) => {
                    const enabled = sourcesFor(ind).includes(s);
                    return (
                      <td key={s} className="px-2 py-1">
                        {enabled ? (
                          <input
                            type="number"
                            className="w-24 border border-[var(--border)] px-2 py-1"
                            value={getVal(ind.name, age, s)}
                            onChange={(e) => setVal(ind.name, age, s, e.target.value)}
                          />
                        ) : (
                          <span className="text-[var(--muted)]">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {error && (
        <div className="border-l-4 border-[var(--danger)] bg-[var(--danger-bg)] px-4 py-3 text-[var(--danger)]">
          {error}
        </div>
      )}
      {status && (
        <div className="border-l-4 border-[var(--brand)] bg-[var(--brand-soft)] px-4 py-3">
          {status}
        </div>
      )}

      <button
        type="button"
        disabled={!facilityId || saving}
        onClick={onSave}
        className="bg-[var(--brand)] px-5 py-2.5 text-white hover:bg-[var(--brand-dark)] disabled:opacity-50"
      >
        {saving ? "Saving…" : isCorrection ? "Save correction" : "Save entries"}
      </button>
    </div>
  );
}
