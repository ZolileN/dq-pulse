import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const statusStyles: Record<string, string> = {
  submitted: "bg-chart-3/15 text-chart-3 border-chart-3/30",
  reviewed_locked: "bg-primary/15 text-primary border-primary/30",
  exported: "bg-chart-2/15 text-chart-2 border-chart-2/30",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("capitalize", statusStyles[status] ?? "")}
    >
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

export function MismatchBadge({ count }: { count: number }) {
  if (count === 0) {
    return <span className="text-sm text-muted-foreground">none</span>;
  }
  return (
    <Badge variant="destructive">
      {count} flagged
    </Badge>
  );
}
