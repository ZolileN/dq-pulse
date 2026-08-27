"use client";

import { useRef, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertTriangle, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";

type Mismatch = {
  indicator: string;
  ageGroup: string;
  stage: string;
  message: string;
  sources: Record<string, number | null>;
};

export default function UploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{
    entryCount: number;
    mismatches: Mismatch[];
    warnings: string[];
    metadata: Record<string, string | null>;
  } | null>(null);

  function resetForNextUpload() {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function run(dryRun: boolean) {
    if (!file) return;
    setLoading(true);
    const form = new FormData();
    form.append("file", file);
    if (dryRun) form.append("dryRun", "true");
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error ?? "Upload failed");
      return;
    }
    if (dryRun) {
      setPreview({
        entryCount: data.entryCount,
        mismatches: data.mismatches ?? [],
        warnings: data.warnings ?? [],
        metadata: data.metadata ?? {},
      });
      toast.message("Preview ready", {
        description: `${data.entryCount} rows parsed`,
      });
    } else {
      toast.success("Import complete", {
        description: `Imported ${data.entryCount} rows for ${data.metadata?.facilityName} · ${data.periodDate}`,
      });
      resetForNextUpload();
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Excel upload"
        description="Upload a completed ACC1_DS-TB_DQA_tool_v3.xlsx. The parser maps headers dynamically — rates are skipped and recomputed from counts."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-[family-name:var(--font-display)]">
            <FileSpreadsheet className="size-5" />
            Upload workbook
          </CardTitle>
          <CardDescription>Accepts .xlsx files only</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">ACC1 workbook</Label>
            <Input
              id="file"
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={!file || loading}
              onClick={() => run(true)}
            >
              Preview parse
            </Button>
            <Button
              type="button"
              disabled={!file || loading}
              onClick={() => run(false)}
            >
              <Upload className="size-4" />
              {loading ? "Working…" : "Import to database"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {preview && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-[family-name:var(--font-display)]">
                Parse summary
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
              <p>
                <span className="text-muted-foreground">Facility:</span>{" "}
                {preview.metadata.facilityName ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Period:</span>{" "}
                {preview.metadata.periodDate ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Staff:</span>{" "}
                {preview.metadata.staffName ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Rows parsed:</span>{" "}
                {preview.entryCount}
              </p>
            </CardContent>
          </Card>

          {preview.mismatches.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle />
              <AlertTitle>
                Source mismatches flagged — do not treat as “data is correct”
              </AlertTitle>
              <AlertDescription>
                <ul className="mt-2 space-y-2">
                  {preview.mismatches.map((m, i) => (
                    <li key={i} className="rounded-md bg-destructive/10 px-3 py-2">
                      {m.message}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {preview.warnings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Warnings</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-inside list-disc text-sm text-muted-foreground">
                  {preview.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
