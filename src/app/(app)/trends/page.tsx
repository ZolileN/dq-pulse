"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
} from "recharts";

type Facility = { id: number; name: string };
type Count = {
  facilityId: number;
  period: string;
  indicator: string;
  source: string;
  stage: string;
  ageGroup: string;
  value: number;
  dataType: string;
};
type Rate = Count & { rate: number | null; numerator: number; denominator: number };

export default function TrendsPage() {
  const [grain, setGrain] = useState<"month" | "quarter" | "year">("month");
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [facilityId, setFacilityId] = useState<number | "">("");
  const [counts, setCounts] = useState<Count[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  const [agreement, setAgreement] = useState<{ period: string; rate: number | null; agreed: number; total: number }[]>([]);
  const [indicator, setIndicator] = useState("Headcount");
  const [stage, setStage] = useState("before");
  const [source, setSource] = useState("register");
  const [showRate, setShowRate] = useState(false);

  useEffect(() => {
    fetch("/api/facilities")
      .then((r) => r.json())
      .then((d) => setFacilities(d.facilities ?? []));
  }, []);

  useEffect(() => {
    const qs = new URLSearchParams({ grain, stage });
    if (facilityId) qs.set("facilityId", String(facilityId));
    fetch(`/api/trends?${qs}`)
      .then((r) => r.json())
      .then((d) => {
        setCounts(d.counts ?? []);
        setRates(d.rates ?? []);
      });
    fetch(`/api/trends?grain=${grain}&view=agreement`)
      .then((r) => r.json())
      .then((d) => setAgreement(d.agreement ?? []));
  }, [grain, facilityId, stage]);

  const facilityName = useMemo(() => {
    const m = new Map(facilities.map((f) => [f.id, f.name]));
    return (id: number) => m.get(id) ?? String(id);
  }, [facilities]);

  const trendData = useMemo(() => {
    if (showRate) {
      return rates
        .filter(
          (r) =>
            r.indicator === indicator &&
            r.source === source &&
            r.stage === stage &&
            (!facilityId || r.facilityId === facilityId)
        )
        .map((r) => ({
          period: r.period,
          value: r.rate == null ? null : Math.round(r.rate * 1000) / 10,
          facility: facilityName(r.facilityId),
        }));
    }
    return counts
      .filter(
        (c) =>
          c.indicator === indicator &&
          c.source === source &&
          c.stage === stage &&
          (!facilityId || c.facilityId === facilityId)
      )
      .map((c) => ({
        period: c.period,
        value: c.value,
        facility: facilityName(c.facilityId),
      }));
  }, [counts, rates, indicator, source, stage, facilityId, showRate, facilityName]);

  const seriesByFacility = useMemo(() => {
    const map = new Map<string, Record<string, number | string | null>>();
    for (const row of trendData) {
      const bucket = map.get(row.period) ?? { period: row.period };
      bucket[row.facility] = row.value;
      map.set(row.period, bucket);
    }
    return [...map.values()].sort((a, b) =>
      String(a.period).localeCompare(String(b.period))
    );
  }, [trendData]);

  const facilityKeys = useMemo(() => {
    const s = new Set<string>();
    for (const row of trendData) s.add(row.facility);
    return [...s];
  }, [trendData]);

  const beforeAfter = useMemo(() => {
    const map = new Map<string, { before?: number; after?: number }>();
    for (const c of counts.filter(
      (x) =>
        x.indicator === indicator &&
        x.source === source &&
        x.ageGroup === "Over 5yrs" &&
        (!facilityId || x.facilityId === facilityId)
    )) {
      const key = `${facilityName(c.facilityId)}|${c.period}`;
      const b = map.get(key) ?? {};
      if (c.stage === "before") b.before = c.value;
      if (c.stage === "after") b.after = c.value;
      map.set(key, b);
    }
    return [...map.entries()].map(([key, v]) => {
      const [facility, period] = key.split("|");
      return {
        label: `${facility} ${period}`,
        before: v.before ?? 0,
        after: v.after ?? 0,
        delta: (v.after ?? 0) - (v.before ?? 0),
      };
    });
  }, [counts, indicator, source, facilityId, facilityName]);

  const indicatorOptions = useMemo(() => {
    const set = new Set(counts.map((c) => c.indicator));
    if (showRate) rates.forEach((r) => set.add(r.indicator));
    return [...set].sort();
  }, [counts, rates, showRate]);

  const colors = ["#1f5c45", "#b86b2a", "#2c5282", "#9b1c1c", "#5c6b63", "#6b46c1"];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--brand)]">
          Trends
        </h1>
        <p className="mt-1 text-[var(--muted)]">
          Counts are summed at the selected grain. Rates are computed from those sums — never stored or averaged across periods.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 border border-[var(--border)] bg-[var(--surface)] p-4 text-sm">
        <label>
          Grain
          <select
            className="ml-2 border border-[var(--border)] px-2 py-1"
            value={grain}
            onChange={(e) => setGrain(e.target.value as typeof grain)}
          >
            <option value="month">Month</option>
            <option value="quarter">Quarter</option>
            <option value="year">Year</option>
          </select>
        </label>
        <label>
          Facility
          <select
            className="ml-2 border border-[var(--border)] px-2 py-1"
            value={facilityId}
            onChange={(e) => setFacilityId(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">All</option>
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Stage
          <select
            className="ml-2 border border-[var(--border)] px-2 py-1"
            value={stage}
            onChange={(e) => setStage(e.target.value)}
          >
            <option value="before">Before</option>
            <option value="after">After</option>
          </select>
        </label>
        <label>
          Source
          <select
            className="ml-2 border border-[var(--border)] px-2 py-1"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            <option value="register">register</option>
            <option value="summary_sheet">summary_sheet</option>
            <option value="tier_net">tier_net</option>
            <option value="dhis">dhis</option>
          </select>
        </label>
        <label>
          Metric
          <select
            className="ml-2 border border-[var(--border)] px-2 py-1"
            value={indicator}
            onChange={(e) => setIndicator(e.target.value)}
          >
            {indicatorOptions.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showRate}
            onChange={(e) => {
              setShowRate(e.target.checked);
              if (e.target.checked) setIndicator("TB screening rate");
              else setIndicator("Headcount");
            }}
          />
          Show rate (%)
        </label>
      </div>

      <section className="border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="font-[family-name:var(--font-display)] text-xl">
          Trend lines — {indicator}
        </h2>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={seriesByFacility}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d5ddd7" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              {facilityKeys.map((k, i) => (
                <Line
                  key={k}
                  type="monotone"
                  dataKey={k}
                  stroke={colors[i % colors.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="font-[family-name:var(--font-display)] text-xl">
          Before / After deltas (Over 5yrs)
        </h2>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={beforeAfter.slice(0, 12)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d5ddd7" />
              <XAxis dataKey="label" hide />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="before" fill="#5c6b63" />
              <Bar dataKey="after" fill="#1f5c45" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="font-[family-name:var(--font-display)] text-xl">
          Source agreement rate (Before visit)
        </h2>
        <p className="text-sm text-[var(--muted)]">
          % of indicator×age cells where register / RMR / TIER.Net / DHIS already agreed before the visit.
        </p>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={agreement.map((a) => ({
                period: a.period,
                rate: a.rate == null ? null : Math.round(a.rate * 1000) / 10,
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#d5ddd7" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis unit="%" tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="rate" stroke="#b86b2a" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
