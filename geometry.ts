export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function insetBounds(bounds: Bounds, amount: number): Bounds {
  return {
    minX: bounds.minX + amount,
    maxX: bounds.maxX - amount,
    minY: bounds.minY + amount,
    maxY: bounds.maxY - amount,
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function circlesOverlap(
  ax: number,
  ay: number,
  ar: number,
  bx: number,
  by: number,
  br: number,
): boolean {
  const dx = ax - bx;
  const dy = ay - by;
  const r = ar + br;
  return dx * dx + dy * dy <= r * r;
}
