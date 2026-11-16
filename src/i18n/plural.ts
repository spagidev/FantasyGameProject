/**
 * Slovak plural forms: 1 → one, 2–4 → few, everything else (0, 5+, 11–14, 21…) → many.
 * Fractions fall into "many" (the genitive plural), which is what Slovak uses.
 */
export function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  if (Number.isInteger(n) && n >= 2 && n <= 4) return few;
  return many;
}

/** English needs only two forms; kept beside `plural` so call sites read the same. */
export const plural2 = (n: number, one: string, many: string) => (n === 1 ? one : many);
