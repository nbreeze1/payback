"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES, type Category, type Charge, type Payment } from "@/lib/database.types";
import { groupCharges } from "@/lib/groupCharges";
import MoneyPie from "@/components/MoneyPie";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const fmt = (n: number) => money.format(n);
const fmtDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time

type Props = { charges: Charge[]; payments: Payment[] };

export default function Tracker({ charges, payments }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"charges" | "payments">("charges");

  const totals = useMemo(() => {
    const owed = charges.reduce((s, c) => s + Number(c.amount), 0);
    const paid = payments.reduce((s, p) => s + Number(p.amount), 0);
    return { owed, paid, remaining: owed - paid, pct: owed > 0 ? Math.min(100, (paid / owed) * 100) : 0 };
  }, [charges, payments]);
  const slices = useMemo(() => groupCharges(charges), [charges]);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payback</h1>
          <p className="muted text-sm">Paying back Mom &amp; Dad</p>
        </div>
      </header>

      {/* Summary */}
      <section className="card mt-6 p-6">
        <p className="muted text-sm font-medium">Still owed</p>
        <p className="mt-1 text-4xl font-semibold tabular-nums tracking-tight sm:text-5xl">
          {fmt(Math.max(0, totals.remaining))}
        </p>
        {totals.remaining < 0 && (
          <p className="mt-1 text-sm text-[var(--good)]">Overpaid by {fmt(-totals.remaining)}</p>
        )}

        <div className="mt-5 h-3 overflow-hidden rounded-full bg-[var(--subtle)]">
          <div className="h-full rounded-full bg-[var(--good)] transition-all duration-700" style={{ width: `${totals.pct}%` }} />
        </div>
        <p className="muted mt-2 text-sm">{totals.pct.toFixed(1)}% paid off</p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Stat label="Total charges" value={fmt(totals.owed)} />
          <Stat label="Total paid back" value={fmt(totals.paid)} tone="good" />
        </div>
      </section>

      {/* Where the money went */}
      {totals.owed > 0 && (
        <section className="card mt-4 p-6">
          <h2 className="font-semibold">Where the money went</h2>
          <div className="mt-5">
            <MoneyPie slices={slices} owed={totals.owed} paid={totals.paid} fmt={fmt} />
          </div>
        </section>
      )}

      {/* Add forms */}
      <section className="mt-4 grid gap-4 md:grid-cols-2">
        <AddCharge onDone={() => router.refresh()} />
        <AddPayment onDone={() => router.refresh()} />
      </section>

      {/* History */}
      <section className="card mt-4 p-6">
        <div className="flex gap-1 rounded-lg bg-[var(--subtle)] p-1 text-sm sm:inline-flex">
          {(["charges", "payments"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 whitespace-nowrap rounded-md px-4 py-1.5 font-medium transition ${tab === t ? "bg-[var(--surface)] shadow-sm" : "muted"}`}
            >
              {t === "charges" ? `Charges (${charges.length})` : `Payments (${payments.length})`}
            </button>
          ))}
        </div>

        {tab === "charges" ? (
          <HistoryList
            empty="No charges yet. Add the first thing your parents covered."
            table="charges"
            rows={charges.map((c) => ({
              id: c.id,
              title: c.title,
              sub: CATEGORIES[c.category],
              notes: c.notes,
              amount: `+${fmt(Number(c.amount))}`,
              tone: "neutral" as const,
            }))}
            onDone={() => router.refresh()}
          />
        ) : (
          <HistoryList
            empty="No payments yet. Log your first one when you send money back."
            table="payments"
            rows={payments.map((p) => ({
              id: p.id,
              title: p.method ? `Payment · ${p.method}` : "Payment",
              sub: fmtDate(p.paid_on),
              notes: p.notes,
              amount: `−${fmt(Number(p.amount))}`,
              tone: "good" as const,
            }))}
            onDone={() => router.refresh()}
          />
        )}
      </section>
    </main>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" }) {
  return (
    <div className="rounded-xl bg-[var(--subtle)] p-4">
      <p className="muted text-xs font-medium uppercase tracking-wide">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${tone === "good" ? "text-[var(--good)]" : ""}`}>{value}</p>
    </div>
  );
}

function AddCharge({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("school");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient()
      .from("charges")
      .insert({ title: title.trim(), category, amount: Number(amount), notes: notes.trim() || null });
    setBusy(false);
    if (error) return setError(error.message);
    setTitle("");
    setAmount("");
    setNotes("");
    onDone();
  }

  return (
    <form onSubmit={submit} className="card space-y-3 p-6">
      <h2 className="font-semibold">Add a charge</h2>
      <input className="field" placeholder="What was it? (e.g. Fall tuition)" required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <select className="field" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
          {Object.entries(CATEGORIES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <MoneyInput value={amount} onChange={setAmount} />
      </div>
      <input className="field" placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <button className="btn btn-primary w-full" disabled={busy}>{busy ? "Saving…" : "Add charge"}</button>
    </form>
  );
}

function AddPayment({ onDone }: { onDone: () => void }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient()
      .from("payments")
      .insert({ amount: Number(amount), method: method.trim() || null, paid_on: date, notes: notes.trim() || null });
    setBusy(false);
    if (error) return setError(error.message);
    setAmount("");
    setMethod("");
    setNotes("");
    onDone();
  }

  return (
    <form onSubmit={submit} className="card space-y-3 p-6">
      <h2 className="font-semibold">Log a payment</h2>
      <MoneyInput value={amount} onChange={setAmount} />
      <input className="field" placeholder="How? (Venmo, Zelle, cash…)" value={method} onChange={(e) => setMethod(e.target.value)} />
      <input className="field" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
      <input className="field" placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <button className="btn btn-good w-full" disabled={busy}>{busy ? "Saving…" : "Log payment"}</button>
    </form>
  );
}

function MoneyInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <span className="muted pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">$</span>
      <input
        className="field pl-7"
        type="number"
        inputMode="decimal"
        min="0.01"
        step="0.01"
        placeholder="0.00"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

type Row = { id: string; title: string; sub: string; notes: string | null; amount: string; tone: "neutral" | "good" };

function HistoryList({ rows, table, empty, onDone }: { rows: Row[]; table: "charges" | "payments"; empty: string; onDone: () => void }) {
  const [deleting, setDeleting] = useState<string | null>(null);

  async function remove(id: string) {
    if (!confirm("Delete this entry?")) return;
    setDeleting(id);
    const { error } = await createClient().from(table).delete().eq("id", id);
    setDeleting(null);
    if (error) alert(error.message);
    else onDone();
  }

  if (rows.length === 0) return <p className="muted mt-6 text-sm">{empty}</p>;

  return (
    <ul className="mt-4 divide-y divide-[var(--border)]">
      {rows.map((r) => (
        <li key={r.id} className={`flex items-start justify-between gap-4 py-3 ${deleting === r.id ? "opacity-40" : ""}`}>
          <div className="min-w-0">
            <p className="truncate font-medium">{r.title}</p>
            <p className="muted text-sm">{r.sub}</p>
            {r.notes && <p className="muted mt-0.5 text-sm italic">{r.notes}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={`font-semibold tabular-nums ${r.tone === "good" ? "text-[var(--good)]" : ""}`}>{r.amount}</span>
            <button onClick={() => remove(r.id)} className="muted rounded-md px-2 py-1 text-sm hover:text-[var(--danger)]" aria-label="Delete">
              ✕
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
