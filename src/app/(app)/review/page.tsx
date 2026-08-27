"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/page-header";
import { MismatchBadge, StatusBadge } from "@/components/status-badge";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { AlertTriangle, Eye, Lock } from "lucide-react";
import { toast } from "sonner";
import { defaultReportingMonth } from "@/lib/default-period";

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
  const [periodDate, setPeriodDate] = useState(defaultReportingMonth);
  const [status, setStatus] = useState("submitted");
  const [rows, setRows] = useState<Row[]>([]);
  const [detail, setDetail] = useState<{
    entries: { indicator: string; ageGroup: string; source: string; stage: string; value: string }[];
    status: { mismatches?: { message: string }[] };
  } | null>(null);
  const [lockTarget, setLockTarget] = useState<Row | null>(null);
  const [locking, setLocking] = useState(false);

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

  async function confirmLock() {
    if (!lockTarget) return;
    setLocking(true);
    const res = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        facilityId: lockTarget.facilityId,
        periodDate,
        action: "lock",
      }),
    });
    const data = await res.json();
    setLocking(false);
    setLockTarget(null);
    if (!res.ok) {
      toast.error(data.error ?? "Lock failed");
      return;
    }
    toast.success("Facility-month locked");
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
      <PageHeader
        title="Review & lock"
        description="MERL Officers review submitted facility-months, inspect mismatches, and lock. Locked months are read-only — corrections go through the entry flow."
      />

      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="period">Month</Label>
            <Input
              id="period"
              type="date"
              value={periodDate}
              onChange={(e) => setPeriodDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => v && setStatus(v)}>
              <SelectTrigger className="min-w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="submitted">submitted</SelectItem>
                <SelectItem value="reviewed_locked">reviewed_locked</SelectItem>
                <SelectItem value="exported">exported</SelectItem>
                <SelectItem value="all">all</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Facility</TableHead>
                <TableHead>District</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Mismatches</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const n = Array.isArray(r.mismatches) ? r.mismatches.length : 0;
                return (
                  <TableRow key={`${r.facilityId}-${r.periodDate}`}>
                    <TableCell className="font-medium">{r.facilityName}</TableCell>
                    <TableCell>{r.district ?? "—"}</TableCell>
                    <TableCell>{r.staffName ?? "—"}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell>
                      <MismatchBadge count={n} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => showDetail(r.facilityId)}
                        >
                          <Eye className="size-4" />
                          View
                        </Button>
                        {isMerl && r.status === "submitted" && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setLockTarget(r)}
                          >
                            <Lock className="size-4" />
                            Lock
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No facility-months for this filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-[family-name:var(--font-display)]">
              Entry detail
            </DialogTitle>
            <DialogDescription>
              Values and flagged mismatches for this facility-month
            </DialogDescription>
          </DialogHeader>
          {!!detail?.status?.mismatches?.length && (
            <Alert variant="destructive">
              <AlertTriangle />
              <AlertTitle>Source mismatches</AlertTitle>
              <AlertDescription>
                {(detail.status.mismatches ?? []).map((m, i) => (
                  <p key={i}>{m.message}</p>
                ))}
              </AlertDescription>
            </Alert>
          )}
          <div className="max-h-80 overflow-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Indicator</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail?.entries?.slice(0, 200).map((e, i) => (
                  <TableRow key={i}>
                    <TableCell>{e.indicator}</TableCell>
                    <TableCell>{e.ageGroup}</TableCell>
                    <TableCell>{e.source}</TableCell>
                    <TableCell>{e.stage}</TableCell>
                    <TableCell>{e.value}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!lockTarget} onOpenChange={(open) => !open && setLockTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm lock</DialogTitle>
            <DialogDescription>
              Lock {lockTarget?.facilityName} for {periodDate}? This makes the month read-only until a correction is submitted.
            </DialogDescription>
          </DialogHeader>
          {lockTarget && Array.isArray(lockTarget.mismatches) && lockTarget.mismatches.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle />
              <AlertTitle>
                {lockTarget.mismatches.length} mismatch(es) flagged
              </AlertTitle>
              <AlertDescription>
                Review mismatches before locking if data quality is uncertain.
              </AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLockTarget(null)}>
              Cancel
            </Button>
            <Button onClick={confirmLock} disabled={locking}>
              {locking ? "Locking…" : "Lock facility-month"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
