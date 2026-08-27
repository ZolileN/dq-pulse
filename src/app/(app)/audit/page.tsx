"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { defaultReportingMonth } from "@/lib/default-period";

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

const actionVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  create: "default",
  update: "secondary",
  lock: "outline",
  export: "secondary",
  delete: "destructive",
};

export default function AuditPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [facilityId, setFacilityId] = useState<number | "">("");
  const [periodDate, setPeriodDate] = useState(defaultReportingMonth);
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
      <PageHeader
        title="Audit trail"
        description="Full history of entries, locks, corrections, and exports for a facility-month."
      />

      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 pt-6">
          <div className="space-y-2">
            <Label>Facility</Label>
            <Select
              value={facilityId === "" ? undefined : String(facilityId)}
              onValueChange={(v) => setFacilityId(Number(v))}
            >
              <SelectTrigger className="min-w-[200px]">
                <SelectValue placeholder="Select facility" />
              </SelectTrigger>
              <SelectContent>
                {facilities.map((f) => (
                  <SelectItem key={f.id} value={String(f.id)}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="audit-period">Month</Label>
            <Input
              id="audit-period"
              type="date"
              value={periodDate}
              onChange={(e) => setPeriodDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Who</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} className="align-top">
                  <TableCell className="whitespace-nowrap">
                    {new Date(r.performedAt).toLocaleString()}
                  </TableCell>
                  <TableCell>{r.performerName ?? "system"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{r.entity}</Badge>
                    <div className="mt-1 text-xs text-muted-foreground">{r.entityId}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={actionVariant[r.action] ?? "outline"}>
                      {r.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-md break-all font-mono text-xs">
                    {JSON.stringify(r.detail)}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No audit events for this facility-month.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
