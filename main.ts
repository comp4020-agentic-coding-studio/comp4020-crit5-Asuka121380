import { ARENA_HEIGHT, ARENA_WIDTH } from "./constants";
import { createGame, updateGame, type GameState } from "./game";
import { attachPointerInput, type PointerState } from "./input";
import { draw } from "./render";
import { playSound } from "./audio";

const canvas = document.querySelector<HTMLCanvasElement>("#game");
if (!canvas) throw new Error("missing #game canvas");
const screenFrame = document.querySelector<HTMLElement>(".screen-frame");
if (!screenFrame) throw new Error("missing .screen-frame cabinet screen");

canvas.width = ARENA_WIDTH;
canvas.height = ARENA_HEIGHT;
const ctx = canvas.getContext("2d");
if (!ctx) throw new Error("2d canvas context unavailable");
ctx.imageSmoothingEnabled = false;

// Scale to fit the cabinet's screen frame rather than the whole viewport,
// so a wide desktop window fills the extra space with cabinet chrome
// instead of stretching or letterboxing the arena itself.
function resize(): void {
  const { width, height } = screenFrame!.getBoundingClientRect();
  const scale = Math.min(width / ARENA_WIDTH, height / ARENA_HEIGHT);
  canvas!.style.width = `${ARENA_WIDTH * scale}px`;
  canvas!.style.height = `${ARENA_HEIGHT * scale}px`;
}
window.addEventListener("resize", resize);
new ResizeObserver(resize).observe(screenFrame);
resize();

const pointer: PointerState = {
  x: ARENA_WIDTH / 2,
  y: ARENA_HEIGHT * 0.78,
  restartRequested: false,
};
attachPointerInput(canvas, pointer);

let state: GameState = createGame(performance.now());
let last = performance.now();

function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (pointer.restartRequested) {
    pointer.restartRequested = false;
    if (state.phase === "won" || state.phase === "lost") {
      state = createGame(now);
    }
  }

  updateGame(state, dt, now, pointer);
  for (const kind of state.sounds) playSound(kind);
  state.sounds = [];
  draw(ctx!, state, now);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
