// Groups charges into "where the money went" buckets by reading their titles.
// e.g. "Summer 24 tuition (books included)" and "Spring 25 (books included)" → "Tuition & books".
// Titles that match no rule become their own group (cleaned up), so nothing is lost.

import type { Charge } from "@/lib/database.types";

const RULES: { label: string; match: RegExp }[] = [
  { label: "Tuition & books", match: /tuition|semester|\b(spring|summer|fall|winter)\b|books?|textbook|credit hours?/i },
  { label: "NCLEX & exams", match: /nclex|exam|test fee|licens/i },
  { label: "Flights", match: /flight|airfare|plane|airline|ticket/i },
  { label: "Credit card bills", match: /credit\s*card|\bcc\b|visa|amex|mastercard/i },
  { label: "Phone bills", match: /phone|cell|mobile|verizon|t-?mobile|at&t/i },
  { label: "Rent & housing", match: /rent|housing|apartment|dorm|lease/i },
  { label: "Car", match: /\bcar\b|insurance|gas\b|repair/i },
];

const MAX_SLICES = 7;

function cleanTitle(title: string) {
  const t = title
    .replace(/\(.*?\)/g, "")
    .replace(/\b\d{2,4}\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return t ? t[0].toUpperCase() + t.slice(1) : "Other";
}

export function groupLabel(title: string) {
  return RULES.find((r) => r.match.test(title))?.label ?? cleanTitle(title);
}

export type Slice = { label: string; total: number; titles: string[] };

export function groupCharges(charges: Charge[]): Slice[] {
  const map = new Map<string, Slice>();
  for (const c of charges) {
    const label = groupLabel(c.title);
    const s = map.get(label) ?? { label, total: 0, titles: [] };
    s.total += Number(c.amount);
    s.titles.push(c.title);
    map.set(label, s);
  }
  const slices = [...map.values()].sort((a, b) => b.total - a.total);
  if (slices.length <= MAX_SLICES) return slices;

  const keep = slices.slice(0, MAX_SLICES - 1);
  const rest = slices.slice(MAX_SLICES - 1);
  keep.push({
    label: "Other",
    total: rest.reduce((s, r) => s + r.total, 0),
    titles: rest.flatMap((r) => r.titles),
  });
  return keep;
}
