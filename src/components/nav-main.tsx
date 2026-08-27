"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Upload,
  Lock,
  LineChart,
  Download,
  ScrollText,
  Activity,
} from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/entry", label: "Web entry", icon: ClipboardList },
  { href: "/upload", label: "Excel upload", icon: Upload },
  { href: "/review", label: "Review & lock", icon: Lock },
  { href: "/trends", label: "Trends", icon: LineChart },
  { href: "/export", label: "Power BI export", icon: Download, merlOnly: true },
  { href: "/audit", label: "Audit", icon: ScrollText },
];

export function NavMain({ role }: { role?: string }) {
  const pathname = usePathname();

  const items = navItems.filter((item) => !item.merlOnly || role === "merl_officer");

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Navigation</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  isActive={active}
                  tooltip={item.label}
                  render={<Link href={item.href} />}
                >
                  <Icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function NavBrand() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          className="data-[slot=sidebar-menu-button]:p-1.5!"
          render={<Link href="/dashboard" />}
        >
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Activity className="size-4" />
          </div>
          <div className="flex flex-col gap-0.5 leading-none">
            <span className="font-[family-name:var(--font-display)] text-base font-semibold">
              Aurum DQA Pulse
            </span>
            <span className="text-xs text-muted-foreground">
              Data quality monitoring
            </span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
