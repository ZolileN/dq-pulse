"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
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
import { Download, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { defaultReportingMonth } from "@/lib/default-period";

export default function ExportPage() {
  const { data: session } = useSession();
  const [periodDate, setPeriodDate] = useState(defaultReportingMonth);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function download() {
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/export?periodDate=${periodDate}`);
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = data.error ?? "Export failed";
      setError(msg);
      toast.error(msg);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dqa-export-${periodDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  }

  if (session?.user?.role !== "merl_officer") {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Power BI export"
          description="Only MERL Officers can generate exports."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Power BI export"
        description="Exports reviewed_locked facility-months for the selected period in Power Query long format. MERL transformation is isolated in applyMerlTransformation() (currently pass-through)."
      />

      <Card>
        <CardHeader>
          <CardTitle className="font-[family-name:var(--font-display)]">
            Generate CSV
          </CardTitle>
          <CardDescription>
            Select the reporting month to export locked facility data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="export-period">Month</Label>
            <Input
              id="export-period"
              type="date"
              value={periodDate}
              onChange={(e) => setPeriodDate(e.target.value)}
              className="max-w-xs"
            />
          </div>
          <Button onClick={download} disabled={loading}>
            <Download className="size-4" />
            {loading ? "Exporting…" : "Download CSV"}
          </Button>
          {error && (
            <Alert variant="destructive">
              <AlertTriangle />
              <AlertTitle>Export failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
