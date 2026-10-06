"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const supabase = createClient();

    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else {
        router.replace("/");
        router.refresh();
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) setError(error.message);
      else if (data.session) {
        router.replace("/");
        router.refresh();
      } else setInfo("Check your email to confirm your account, then sign in.");
    }
    setBusy(false);
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="card w-full max-w-sm p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Payback</h1>
        <p className="muted mt-1 text-sm">Track what you owe and what you&apos;ve paid back.</p>

        <div className="mt-6 grid grid-cols-2 rounded-lg bg-[var(--subtle)] p-1 text-sm">
          {(["in", "up"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-md py-1.5 font-medium transition ${
                mode === m ? "bg-[var(--surface)] shadow-sm" : "muted"
              }`}
            >
              {m === "in" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-5 space-y-3">
          <input
            className="field"
            type="email"
            placeholder="Email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="field"
            type="password"
            placeholder="Password (6+ characters)"
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            minLength={6}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
          {info && <p className="text-sm text-[var(--good)]">{info}</p>}
          <button className="btn btn-primary w-full" disabled={busy}>
            {busy ? "…" : mode === "in" ? "Sign in" : "Create account"}
          </button>
        </form>
      </div>
    </main>
  );
}
