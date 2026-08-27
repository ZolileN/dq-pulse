"use client";

import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/entry": "Web form entry",
  "/upload": "Excel upload",
  "/review": "Review & lock",
  "/trends": "Trends",
  "/export": "Power BI export",
  "/audit": "Audit trail",
};

export function SiteHeader() {
  const pathname = usePathname();
  const title =
    Object.entries(titles).find(([path]) => pathname.startsWith(path))?.[1] ??
    "Aurum DQA Pulse";

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
      <div className="flex w-full items-center gap-2 px-4 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 h-4" />
        <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold text-primary">
          {title}
        </h1>
      </div>
    </header>
  );
}
