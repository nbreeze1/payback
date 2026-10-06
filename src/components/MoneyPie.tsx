"use client";

import { useEffect, useRef, useState } from "react";
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

// Slices thinner than this get a wider invisible tap target so they're tappable on a phone.
const MIN_HIT = 0.22; // radians (~13°)

export default function MoneyPie({ slices, owed, paid, fmt }: Props) {
  const [hover, setHover] = useState<number | null>(null); // mouse only
  const [selected, setSelected] = useState<number | null>(null); // tap / click / keyboard
  const rootRef = useRef<HTMLDivElement>(null);
  const pct = owed > 0 ? Math.min(100, (paid / owed) * 100) : 0;
  const ringLen = 2 * Math.PI * RING_R;

  // Tapping anywhere outside the chart clears the selection.
  useEffect(() => {
    if (selected === null) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setSelected(null);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [selected]);

  const arcs = slices.map((s, i) => {
    const before = slices.slice(0, i).reduce((sum, x) => sum + x.total, 0);
    const start = (before / owed) * Math.PI * 2;
    const end = ((before + s.total) / owed) * Math.PI * 2;
    return { ...s, i, start, end, mid: (start + end) / 2, share: (s.total / owed) * 100 };
  });
  const activeIdx = hover ?? selected;
  const active = activeIdx !== null ? arcs[activeIdx] : null;

  const toggle = (i: number) => setSelected((cur) => (cur === i ? null : i));
  const mouseOnly = (fn: () => void) => (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") fn();
  };
  const sliceHandlers = (i: number) => ({
    onPointerEnter: mouseOnly(() => setHover(i)),
    onPointerLeave: mouseOnly(() => setHover(null)),
    onClick: () => toggle(i),
  });

  return (
    <div ref={rootRef} className="flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:gap-10">
      <div className="relative aspect-square w-full max-w-[280px] shrink-0 [-webkit-tap-highlight-color:transparent]">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="h-full w-full touch-manipulation select-none"
          role="img"
          aria-label={`Where the money went. ${pct.toFixed(1)}% paid off.`}
        >
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
              style={{ cursor: "pointer" }} {...sliceHandlers(0)} />
          ) : (
            <>
              {arcs.map((a) => {
                const isActive = activeIdx === a.i;
                const [dx, dy] = isActive ? polar(6, a.mid).map((n) => n - C) : [0, 0];
                return (
                  <path
                    key={a.label}
                    d={arcPath(a.start, a.end)}
                    fill={`var(--series-${a.i + 1})`}
                    stroke="var(--surface)"
                    strokeWidth={2}
                    opacity={activeIdx === null || isActive ? 1 : 0.35}
                    transform={`translate(${dx.toFixed(2)} ${dy.toFixed(2)})`}
                    style={{ transition: "opacity 0.15s, transform 0.15s", cursor: "pointer" }}
                    {...sliceHandlers(a.i)}
                  />
                );
              })}
              {/* wider invisible tap targets for thin slices, drawn on top so they win */}
              {arcs
                .filter((a) => a.end - a.start < MIN_HIT)
                .map((a) => (
                  <path
                    key={`hit-${a.label}`}
                    d={arcPath(a.mid - MIN_HIT / 2, a.mid + MIN_HIT / 2)}
                    fill="transparent"
                    style={{ cursor: "pointer" }}
                    {...sliceHandlers(a.i)}
                  />
                ))}
            </>
          )}
        </svg>

        {/* center label — tap it to go back to the % paid view */}
        <button
          type="button"
          onClick={() => setSelected(null)}
          tabIndex={active ? 0 : -1}
          aria-label="Show percent paid off"
          className={`absolute left-1/2 top-1/2 flex aspect-square w-[50%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full text-center ${
            active ? "cursor-pointer" : "pointer-events-none"
          }`}
        >
          {active ? (
            <>
              <span className="max-w-full px-1 text-xs font-medium leading-tight">{active.label}</span>
              <span className="mt-1 text-lg font-semibold tabular-nums">{fmt(active.total)}</span>
              <span className="muted text-xs tabular-nums">{active.share.toFixed(1)}% of total</span>
            </>
          ) : (
            <>
              <span className="text-3xl font-semibold tabular-nums tracking-tight">{pct.toFixed(1)}%</span>
              <span className="muted text-xs font-medium">paid off</span>
            </>
          )}
        </button>
      </div>

      {/* legend (doubles as the data table) — every row is a big tap target */}
      <div className="w-full min-w-0 flex-1">
        <ul className="space-y-0.5">
          {arcs.map((a) => {
            const isSel = selected === a.i;
            return (
              <li key={a.label}>
                <button
                  type="button"
                  {...sliceHandlers(a.i)}
                  aria-expanded={isSel}
                  className={`flex min-h-11 w-full touch-manipulation items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition [-webkit-tap-highlight-color:transparent] ${
                    activeIdx === a.i ? "bg-[var(--subtle)]" : ""
                  }`}
                >
                  <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: `var(--series-${a.i + 1})` }} />
                  <span className="min-w-0 flex-1 truncate">{a.label}</span>
                  <span className="tabular-nums">{fmt(a.total)}</span>
                  <span className="muted w-12 text-right tabular-nums">{a.share.toFixed(1)}%</span>
                </button>
                {isSel && (
                  <ul className="muted mb-1 ml-8 mr-2 space-y-0.5 text-xs">
                    {a.titles.map((t, k) => (
                      <li key={k} className="truncate">· {t}</li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
          <li className="flex min-h-11 items-center gap-3 border-t border-[var(--border)] px-2 pt-1 text-sm">
            <span className="h-1.5 w-3 shrink-0 rounded-full bg-[var(--good)]" />
            <span className="flex-1 whitespace-nowrap">Paid off <span className="muted">(ring)</span></span>
            <span className="tabular-nums text-[var(--good)]">{fmt(paid)}</span>
            <span className="muted w-12 text-right tabular-nums">{pct.toFixed(1)}%</span>
          </li>
        </ul>
        <p className="muted mt-2 px-2 text-xs">Tap a slice or row to see what&apos;s in it.</p>
      </div>
    </div>
  );
}
