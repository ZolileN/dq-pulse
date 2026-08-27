"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("dqm@aurum.org.za");
  const [password, setPassword] = useState("dqa-demo-2024");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <div className="relative flex flex-1 flex-col justify-center overflow-hidden px-4">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 20% 20%, #d4e8df 0%, transparent 55%), radial-gradient(ellipse 60% 40% at 90% 80%, #e8dcc8 0%, transparent 50%), linear-gradient(165deg, #f7f4ef 0%, #eef3f0 100%)",
          }}
        />
        <div className="relative mx-auto w-full max-w-md">
          <p className="font-[family-name:var(--font-display)] text-4xl text-[var(--brand)]">
            Aurum DQA Pulse
          </p>
          <p className="mt-2 text-[var(--muted)]">
            Facility data quality monitoring for TB / DS-TB programmes.
          </p>
          <form
            onSubmit={onSubmit}
            className="mt-8 space-y-4 border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm"
          >
            <label className="block text-sm">
              <span className="text-[var(--muted)]">Email</span>
              <input
                className="mt-1 w-full border border-[var(--border)] bg-white px-3 py-2"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm">
              <span className="text-[var(--muted)]">Password</span>
              <input
                className="mt-1 w-full border border-[var(--border)] bg-white px-3 py-2"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            {error && (
              <p className="bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--brand)] px-4 py-2.5 text-white hover:bg-[var(--brand-dark)] disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
            <p className="text-xs text-[var(--muted)]">
              Demo: dqm@aurum.org.za or merl@aurum.org.za — password{" "}
              <code>dqa-demo-2024</code>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
