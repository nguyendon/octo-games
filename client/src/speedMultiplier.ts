const KEY = "octo-games:pizza-speed";
const DEFAULT = 1.0;

function read(): number {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw == null) return DEFAULT;
    const v = parseFloat(raw);
    return Number.isFinite(v) ? v : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

let current = read();

export function getPizzaSpeedMultiplier(): number {
  return current;
}

export function setPizzaSpeedMultiplier(v: number): void {
  current = v;
  try {
    localStorage.setItem(KEY, String(v));
  } catch {
    /* localStorage blocked — keep in-memory state */
  }
}
