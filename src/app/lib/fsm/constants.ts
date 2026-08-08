export const MAX_ITERS = 50;
export const DECAY_FAC = 1.005;
export const FSM_UP_FAC = 0.4;
export const FSM_DOWN_FAC = 0.4;
export const ELIM_MULT_FAC = 0.5;
export const ELIM_REDUC_FAC = 0.25;
export const ATTRIBUTE_MULT = 0.2;
export const ATTRIBUTE_REDUC = 0.03;

export function modRoot(x: number) {
  return x < 0 ? -Math.sqrt(-x) : Math.sqrt(x);
}

export function elimModRoot(x: number) {
  if (x < 0) return -Math.pow(-x, 1 / 3);
  return Math.pow(x, 1 / 3);
}

export function rms(samples: number[]): number {
  if (samples.length === 0) return 0;
  let sumSq = 0;
  for (let i = 0; i < samples.length; i++) sumSq += samples[i] * samples[i];
  return Math.sqrt(sumSq / samples.length);
}

/**
 * Map a TBA climb/endgame level token to points using an exact or
 * case-insensitive substring table (generic form of 2025 cagePoints).
 */
export function levelToPoints(
  level: unknown,
  table: Record<string, number>
): number {
  if (level == null) return 0;
  const raw = String(level).trim();
  if (!raw || raw.toLowerCase() === "none") return 0;
  if (table[raw] !== undefined) return table[raw];
  const lower = raw.toLowerCase();
  if (table[lower] !== undefined) return table[lower];
  for (const key of Object.keys(table)) {
    if (lower.includes(key.toLowerCase())) return table[key];
  }
  return 0;
}
