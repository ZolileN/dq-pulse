"use client";

import { useEffect, useState } from "react";

type Facility = { id: number; name: string };
type AuditRow = {
  id: number;
  entity: string;
  entityId: string;
  action: string;
  performedAt: string;
  detail: unknown;
  performerName: string | null;
};

export default function AuditPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [facilityId, setFacilityId] = useState<number | "">("");
  const [periodDate, setPeriodDate] = useState("2024-06-01");
  const [rows, setRows] = useState<AuditRow[]>([]);

  useEffect(() => {
    fetch("/api/facilities")
      .then((r) => r.json())
      .then((d) => {
        setFacilities(d.facilities ?? []);
        if (d.facilities?.[0]) setFacilityId(d.facilities[0].id);
      });
  }, []);

  async function load() {
    if (!facilityId) return;
    const res = await fetch(
      `/api/audit?facilityId=${facilityId}&periodDate=${periodDate}`
    );
    const data = await res.json();
    setRows(data.rows ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilityId, periodDate]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--brand)]">
          Audit trail
        </h1>
        <p className="mt-1 text-[var(--muted)]">
          Full history of entries, locks, corrections, and exports for a facility-month.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="text-sm">
          Facility
          <select
            className="ml-2 border border-[var(--border)] px-2 py-1"
            value={facilityId}
            onChange={(e) => setFacilityId(Number(e.target.value))}
          >
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Month
          <input
            type="date"
            className="ml-2 border border-[var(--border)] px-2 py-1"
            value={periodDate}
            onChange={(e) => setPeriodDate(e.target.value)}
          />
        </label>
      </div>

      <div className="overflow-x-auto border border-[var(--border)] bg-[var(--surface)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--brand-soft)]">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Who</th>
              <th className="px-3 py-2">Entity</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Detail</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-[var(--border)] align-top">
                <td className="px-3 py-2 whitespace-nowrap">
                  {new Date(r.performedAt).toLocaleString()}
                </td>
                <td className="px-3 py-2">{r.performerName ?? "system"}</td>
                <td className="px-3 py-2">
                  {r.entity}
                  <div className="text-xs text-[var(--muted)]">{r.entityId}</div>
                </td>
                <td className="px-3 py-2">{r.action}</td>
                <td className="px-3 py-2 font-mono text-xs max-w-md break-all">
                  {JSON.stringify(r.detail)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-[var(--muted)]">
                  No audit events for this facility-month.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
