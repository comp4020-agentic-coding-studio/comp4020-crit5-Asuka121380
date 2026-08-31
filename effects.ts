// Short-lived visual events. Nothing here drives gameplay rules — game.ts
// only ever appends one of these when a rule fires, so render.ts has
// something to animate for it.

export type EffectKind = "muzzle" | "explosion" | "split" | "fade" | "hit" | "heal";

export interface Effect {
  id: number;
  kind: EffectKind;
  x: number;
  y: number;
  startedAt: number;
  duration: number;
}

let nextId = 1;

const DURATIONS: Record<EffectKind, number> = {
  muzzle: 90,
  explosion: 260,
  split: 380,
  fade: 260,
  hit: 220,
  heal: 340,
};

export function createEffect(kind: EffectKind, x: number, y: number, now: number): Effect {
  return { id: nextId++, kind, x, y, startedAt: now, duration: DURATIONS[kind] };
}

export function effectProgress(effect: Effect, now: number): number {
  return Math.min(1, (now - effect.startedAt) / effect.duration);
}

export function isEffectDone(effect: Effect, now: number): boolean {
  return now - effect.startedAt >= effect.duration;
}
