"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type Row = {
  facilityId: number;
  periodDate: string;
  status: string;
  staffName: string | null;
  facilityName: string;
  district: string | null;
  mismatches: { message: string }[] | null;
};

export default function ReviewPage() {
  const { data: session } = useSession();
  const [periodDate, setPeriodDate] = useState("2024-06-01");
  const [status, setStatus] = useState("submitted");
  const [rows, setRows] = useState<Row[]>([]);
  const [detail, setDetail] = useState<{
    entries: { indicator: string; ageGroup: string; source: string; stage: string; value: string }[];
    status: { mismatches?: { message: string }[] };
  } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const res = await fetch(
      `/api/review?periodDate=${periodDate}&status=${status}`
    );
    const data = await res.json();
    setRows(data.rows ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodDate, status]);

  async function lock(facilityId: number) {
    setMsg(null);
    const res = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ facilityId, periodDate, action: "lock" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error ?? "Lock failed");
      return;
    }
    setMsg("Locked");
    load();
  }

  async function showDetail(facilityId: number) {
    const res = await fetch("/api/review", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ facilityId, periodDate }),
    });
    setDetail(await res.json());
  }

  const isMerl = session?.user?.role === "merl_officer";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--brand)]">
          Review & lock
        </h1>
        <p className="mt-1 text-[var(--muted)]">
          MERL Officers review submitted facility-months, inspect mismatches, and lock. Locked months are read-only — corrections go through the entry flow.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="text-sm">
          Month
          <input
            type="date"
            className="ml-2 border border-[var(--border)] px-2 py-1"
            value={periodDate}
            onChange={(e) => setPeriodDate(e.target.value)}
          />
        </label>
        <label className="text-sm">
          Status
          <select
            className="ml-2 border border-[var(--border)] px-2 py-1"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="submitted">submitted</option>
            <option value="reviewed_locked">reviewed_locked</option>
            <option value="exported">exported</option>
            <option value="all">all</option>
          </select>
        </label>
      </div>

      {msg && (
        <div className="border-l-4 border-[var(--brand)] bg-[var(--brand-soft)] px-4 py-2 text-sm">
          {msg}
        </div>
      )}

      <div className="overflow-x-auto border border-[var(--border)] bg-[var(--surface)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--brand-soft)]">
            <tr>
              <th className="px-3 py-2">Facility</th>
              <th className="px-3 py-2">District</th>
              <th className="px-3 py-2">Staff</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Mismatches</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const n = Array.isArray(r.mismatches) ? r.mismatches.length : 0;
              return (
                <tr key={`${r.facilityId}-${r.periodDate}`} className="border-t border-[var(--border)]">
                  <td className="px-3 py-2">{r.facilityName}</td>
                  <td className="px-3 py-2">{r.district ?? "—"}</td>
                  <td className="px-3 py-2">{r.staffName ?? "—"}</td>
                  <td className="px-3 py-2">{r.status}</td>
                  <td className="px-3 py-2">
                    {n > 0 ? (
                      <span className="bg-[var(--danger-bg)] px-2 py-0.5 text-[var(--danger)]">
                        {n} flagged
                      </span>
                    ) : (
                      "none"
                    )}
                  </td>
                  <td className="px-3 py-2 space-x-2">
                    <button
                      type="button"
                      className="underline"
                      onClick={() => showDetail(r.facilityId)}
                    >
                      View
                    </button>
                    {isMerl && r.status === "submitted" && (
                      <button
                        type="button"
                        className="bg-[var(--brand)] px-2 py-1 text-white"
                        onClick={() => lock(r.facilityId)}
                      >
                        Lock
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-[var(--muted)]">
                  No facility-months for this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="space-y-3 border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="font-[family-name:var(--font-display)] text-xl">Detail</h2>
          {!!detail.status?.mismatches?.length && (
            <div className="border-l-4 border-[var(--danger)] bg-[var(--danger-bg)] p-3 text-sm">
              {(detail.status.mismatches ?? []).map((m, i) => (
                <p key={i}>{m.message}</p>
              ))}
            </div>
          )}
          <div className="max-h-80 overflow-auto">
            <table className="min-w-full text-left text-xs">
              <thead>
                <tr>
                  <th className="px-2 py-1">Indicator</th>
                  <th className="px-2 py-1">Age</th>
                  <th className="px-2 py-1">Source</th>
                  <th className="px-2 py-1">Stage</th>
                  <th className="px-2 py-1">Value</th>
                </tr>
              </thead>
              <tbody>
                {detail.entries?.slice(0, 200).map((e, i) => (
                  <tr key={i} className="border-t border-[var(--border)]">
                    <td className="px-2 py-1">{e.indicator}</td>
                    <td className="px-2 py-1">{e.ageGroup}</td>
                    <td className="px-2 py-1">{e.source}</td>
                    <td className="px-2 py-1">{e.stage}</td>
                    <td className="px-2 py-1">{e.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
