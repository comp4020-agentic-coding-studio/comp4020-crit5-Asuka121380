import type { Bounds } from "./geometry";

// Shared "wander" motion: travel in a straight line, occasionally choose a
// new heading at a randomised time, and turn smoothly toward it rather than
// snapping. Used by both enemies and the health pickup so their movement
// reads the same way.

export interface Wanderer {
  x: number;
  y: number;
  heading: number;
  targetHeading: number;
  speed: number;
  nextTurnAt: number;
}

const TURN_RATE = Math.PI * 1.6; // radians/second the heading can rotate

function normalizeAngleDelta(delta: number): number {
  let d = delta % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function turnToward(current: number, target: number, maxStep: number): number {
  const delta = normalizeAngleDelta(target - current);
  if (Math.abs(delta) <= maxStep) return target;
  return current + Math.sign(delta) * maxStep;
}

export function stepWander(
  w: Wanderer,
  dt: number,
  now: number,
  bounds: Bounds,
  margin: number,
  pickNextHeading: () => number,
  pickNextTurnDelay: () => number,
): void {
  const nearLeft = w.x < bounds.minX + margin;
  const nearRight = w.x > bounds.maxX - margin;
  const nearTop = w.y < bounds.minY + margin;
  const nearBottom = w.y > bounds.maxY - margin;

  if (nearLeft || nearRight || nearTop || nearBottom) {
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    w.targetHeading = Math.atan2(cy - w.y, cx - w.x);
  } else if (now >= w.nextTurnAt) {
    w.targetHeading = pickNextHeading();
    w.nextTurnAt = now + pickNextTurnDelay();
  }

  w.heading = turnToward(w.heading, w.targetHeading, TURN_RATE * dt);
  w.x += Math.cos(w.heading) * w.speed * dt;
  w.y += Math.sin(w.heading) * w.speed * dt;
  w.x = clampInto(w.x, bounds.minX, bounds.maxX);
  w.y = clampInto(w.y, bounds.minY, bounds.maxY);
}

function clampInto(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
