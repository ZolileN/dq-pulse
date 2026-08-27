import Link from "next/link";
import { auth, signOut } from "@/lib/auth";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/entry", label: "Web entry" },
  { href: "/upload", label: "Excel upload" },
  { href: "/review", label: "Review & lock" },
  { href: "/trends", label: "Trends" },
  { href: "/export", label: "Power BI export" },
  { href: "/audit", label: "Audit" },
];

export async function AppNav() {
  const session = await auth();
  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-baseline gap-3">
          <Link href="/dashboard" className="font-[family-name:var(--font-display)] text-xl tracking-tight text-[var(--brand)]">
            Aurum DQA Pulse
          </Link>
          <span className="hidden text-xs text-[var(--muted)] sm:inline">
            Data quality monitoring
          </span>
        </div>
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded px-2.5 py-1.5 text-[var(--foreground)] hover:bg-[var(--brand-soft)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 text-sm">
          {session?.user && (
            <>
              <span className="text-[var(--muted)]">
                {session.user.name} · {session.user.role}
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <button
                  type="submit"
                  className="rounded border border-[var(--border)] px-2.5 py-1 hover:bg-[var(--brand-soft)]"
                >
                  Sign out
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
