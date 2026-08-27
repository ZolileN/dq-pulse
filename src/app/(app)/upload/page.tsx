"use client";

import { useState } from "react";

type Mismatch = {
  indicator: string;
  ageGroup: string;
  stage: string;
  message: string;
  sources: Record<string, number | null>;
};

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{
    entryCount: number;
    mismatches: Mismatch[];
    warnings: string[];
    metadata: Record<string, string | null>;
  } | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(dryRun: boolean) {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    const form = new FormData();
    form.append("file", file);
    if (dryRun) form.append("dryRun", "true");
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Upload failed");
      return;
    }
    if (dryRun) {
      setPreview({
        entryCount: data.entryCount,
        mismatches: data.mismatches ?? [],
        warnings: data.warnings ?? [],
        metadata: data.metadata ?? {},
      });
    } else {
      setResult(
        `Imported ${data.entryCount} rows for ${data.metadata?.facilityName} · ${data.periodDate}`
      );
      setPreview({
        entryCount: data.entryCount,
        mismatches: data.mismatches ?? [],
        warnings: data.warnings ?? [],
        metadata: data.metadata ?? {},
      });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--brand)]">
          Excel upload
        </h1>
        <p className="mt-1 text-[var(--muted)]">
          Upload a completed ACC1_DS-TB_DQA_tool_v3.xlsx. The parser maps headers dynamically — rates are skipped and recomputed from counts.
        </p>
      </div>

      <div className="border border-[var(--border)] bg-[var(--surface)] p-5">
        <input
          type="file"
          accept=".xlsx"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!file || loading}
            onClick={() => run(true)}
            className="border border-[var(--border)] px-4 py-2 hover:bg-[var(--brand-soft)] disabled:opacity-50"
          >
            Preview parse
          </button>
          <button
            type="button"
            disabled={!file || loading}
            onClick={() => run(false)}
            className="bg-[var(--brand)] px-4 py-2 text-white hover:bg-[var(--brand-dark)] disabled:opacity-50"
          >
            {loading ? "Working…" : "Import to database"}
          </button>
        </div>
      </div>

      {error && (
        <div className="border-l-4 border-[var(--danger)] bg-[var(--danger-bg)] px-4 py-3 text-[var(--danger)]">
          {error}
        </div>
      )}
      {result && (
        <div className="border-l-4 border-[var(--brand)] bg-[var(--brand-soft)] px-4 py-3">
          {result}
        </div>
      )}

      {preview && (
        <div className="space-y-4">
          <div className="border border-[var(--border)] bg-[var(--surface)] p-4 text-sm">
            <p>
              <strong>Facility:</strong> {preview.metadata.facilityName ?? "—"}
            </p>
            <p>
              <strong>Period:</strong> {preview.metadata.periodDate ?? "—"}
            </p>
            <p>
              <strong>Staff:</strong> {preview.metadata.staffName ?? "—"}
            </p>
            <p>
              <strong>Rows parsed:</strong> {preview.entryCount}
            </p>
          </div>

          {preview.mismatches.length > 0 && (
            <div className="border-l-4 border-[var(--danger)] bg-[var(--danger-bg)] p-4">
              <p className="font-semibold text-[var(--danger)]">
                Source mismatches flagged — do not treat as “data is correct”
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {preview.mismatches.map((m, i) => (
                  <li key={i} className="rounded bg-white/70 px-3 py-2">
                    {m.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {preview.warnings.length > 0 && (
            <ul className="text-sm text-[var(--muted)]">
              {preview.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
