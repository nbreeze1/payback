"use client";

import { useState } from "react";
import type { Slice } from "@/lib/groupCharges";

// Donut of where the money went, with an outer green ring that fills up
// as the total gets paid off, and the % paid in the middle.

const SIZE = 260;
const C = SIZE / 2;
const R_OUT = 104; // donut outer radius
const R_IN = 70; // donut inner radius
const RING_R = 120; // paid-off ring radius
const RING_W = 9;

function polar(r: number, angle: number) {
  const a = angle - Math.PI / 2;
  // Rounded so server and browser render identical paths (avoids hydration mismatch).
  return [C + r * Math.cos(a), C + r * Math.sin(a)].map((n) => Math.round(n * 100) / 100);
}

function arcPath(start: number, end: number) {
  const large = end - start > Math.PI ? 1 : 0;
  const [x1, y1] = polar(R_OUT, start);
  const [x2, y2] = polar(R_OUT, end);
  const [x3, y3] = polar(R_IN, end);
  const [x4, y4] = polar(R_IN, start);
  return `M${x1} ${y1} A${R_OUT} ${R_OUT} 0 ${large} 1 ${x2} ${y2} L${x3} ${y3} A${R_IN} ${R_IN} 0 ${large} 0 ${x4} ${y4}Z`;
}

type Props = { slices: Slice[]; owed: number; paid: number; fmt: (n: number) => string };

export default function MoneyPie({ slices, owed, paid, fmt }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const pct = owed > 0 ? Math.min(100, (paid / owed) * 100) : 0;
  const ringLen = 2 * Math.PI * RING_R;

  const arcs = slices.map((s, i) => {
    const before = slices.slice(0, i).reduce((sum, x) => sum + x.total, 0);
    const start = (before / owed) * Math.PI * 2;
    const end = ((before + s.total) / owed) * Math.PI * 2;
    return { ...s, i, start, end, share: (s.total / owed) * 100 };
  });
  const active = hover !== null ? arcs[hover] : null;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-10">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} role="img" aria-label={`Where the money went. ${pct.toFixed(1)}% paid off.`}>
          {/* paid-off ring: track + fill */}
          <circle cx={C} cy={C} r={RING_R} fill="none" stroke="var(--subtle)" strokeWidth={RING_W} />
          <circle
            cx={C}
            cy={C}
            r={RING_R}
            fill="none"
            stroke="var(--good)"
            strokeWidth={RING_W}
            strokeLinecap={pct > 0 ? "round" : "butt"}
            strokeDasharray={`${((pct / 100) * ringLen).toFixed(2)} ${ringLen.toFixed(2)}`}
            transform={`rotate(-90 ${C} ${C})`}
            style={{ transition: "stroke-dasharray 0.8s ease" }}
          />

          {/* donut slices */}
          {arcs.length === 1 ? (
            <circle cx={C} cy={C} r={(R_OUT + R_IN) / 2} fill="none" stroke="var(--series-1)" strokeWidth={R_OUT - R_IN}
              onMouseEnter={() => setHover(0)} onMouseLeave={() => setHover(null)} />
          ) : (
            arcs.map((a) => (
              <path
                key={a.label}
                d={arcPath(a.start, a.end)}
                fill={`var(--series-${a.i + 1})`}
                stroke="var(--surface)"
                strokeWidth={2}
                opacity={hover === null || hover === a.i ? 1 : 0.35}
                style={{ transition: "opacity 0.15s", cursor: "default" }}
                onMouseEnter={() => setHover(a.i)}
                onMouseLeave={() => setHover(null)}
              >
                <title>{`${a.label}: ${fmt(a.total)} (${a.share.toFixed(1)}%)`}</title>
              </path>
            ))
          )}
        </svg>

        {/* center label */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {active ? (
            <>
              <span className="max-w-[120px] text-xs font-medium leading-tight">{active.label}</span>
              <span className="mt-1 text-lg font-semibold tabular-nums">{fmt(active.total)}</span>
              <span className="muted text-xs tabular-nums">{active.share.toFixed(1)}% of total</span>
            </>
          ) : (
            <>
              <span className="text-3xl font-semibold tabular-nums tracking-tight">{pct.toFixed(1)}%</span>
              <span className="muted text-xs font-medium">paid off</span>
            </>
          )}
        </div>
      </div>

      {/* legend (doubles as the data table) */}
      <ul className="w-full min-w-0 flex-1 space-y-1">
        {arcs.map((a) => (
          <li
            key={a.label}
            onMouseEnter={() => setHover(a.i)}
            onMouseLeave={() => setHover(null)}
            className={`flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition ${hover === a.i ? "bg-[var(--subtle)]" : ""}`}
            title={a.titles.join(" · ")}
          >
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: `var(--series-${a.i + 1})` }} />
            <span className="min-w-0 flex-1 truncate">{a.label}</span>
            <span className="tabular-nums">{fmt(a.total)}</span>
            <span className="muted w-12 text-right tabular-nums">{a.share.toFixed(1)}%</span>
          </li>
        ))}
        <li className="flex items-center gap-3 border-t border-[var(--border)] px-2 pt-2.5 text-sm">
          <span className="h-1.5 w-3 shrink-0 rounded-full bg-[var(--good)]" />
          <span className="flex-1">Paid off (outer ring)</span>
          <span className="tabular-nums text-[var(--good)]">{fmt(paid)}</span>
          <span className="muted w-12 text-right tabular-nums">{pct.toFixed(1)}%</span>
        </li>
      </ul>
    </div>
  );
}
