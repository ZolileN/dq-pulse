"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

export default function ExportPage() {
  const { data: session } = useSession();
  const [periodDate, setPeriodDate] = useState("2024-06-01");
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setError(null);
    const res = await fetch(`/api/export?periodDate=${periodDate}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Export failed");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dqa-export-${periodDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (session?.user?.role !== "merl_officer") {
    return (
      <div className="space-y-2">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--brand)]">
          Power BI export
        </h1>
        <p className="text-[var(--muted)]">Only MERL Officers can generate exports.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--brand)]">
          Power BI export
        </h1>
        <p className="mt-1 text-[var(--muted)]">
          Exports reviewed_locked facility-months for the selected period in Power Query long format.
          MERL transformation is isolated in <code>applyMerlTransformation()</code> (currently pass-through).
        </p>
      </div>

      <div className="border border-[var(--border)] bg-[var(--surface)] p-5">
        <label className="text-sm">
          Month
          <input
            type="date"
            className="ml-2 border border-[var(--border)] px-2 py-1"
            value={periodDate}
            onChange={(e) => setPeriodDate(e.target.value)}
          />
        </label>
        <div className="mt-4">
          <button
            type="button"
            onClick={download}
            className="bg-[var(--brand)] px-4 py-2 text-white hover:bg-[var(--brand-dark)]"
          >
            Download CSV
          </button>
        </div>
        {error && (
          <p className="mt-3 border-l-4 border-[var(--danger)] bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
