// Procedural 8-bit audio: an original looping chiptune track plus a set of
// short synthesized sound effects. Nothing here is a loaded asset --- every
// sound is built from oscillators/noise at call time, so there is no
// licensing question and no asset path to get wrong.
//
// initAudio() must only ever be called from inside a user-gesture handler
// (input.ts's pointerdown listener) --- constructing an AudioContext earlier
// either throws or leaves it permanently suspended. Music timing is driven
// entirely off AudioContext.currentTime via a lookahead scheduler; the
// setInterval below only wakes the scheduler up, it never gates playback.

export type SoundEventKind =
  | "playerFire"
  | "enemyFire"
  | "impact"
  | "playerDamage"
  | "enemyCollision"
  | "enemyDestroyed"
  | "unstableSplit"
  | "pickup"
  | "chargeReady"
  | "victory"
  | "defeat";

const MUSIC_GAIN = 0.18;
const SFX_GAIN = 0.55;

const BPM = 128;
const STEP_DURATION = 60 / BPM / 4; // sixteenth notes
const SCHEDULE_AHEAD_SEC = 0.12;
const LOOKAHEAD_MS = 25;
const STEPS_PER_BAR = 16;

// One bar, A-minor-ish, chosen to resolve cleanly back to its own start.
const BASS_PATTERN: (number | null)[] = [
  110, null, 110, null, 130.81, null, 110, null,
  98, null, 98, null, 110, null, 130.81, null,
];
const LEAD_PATTERN: (number | null)[] = [
  440, null, 523.25, null, 587.33, null, 523.25, 440,
  null, 392, null, 440, 523.25, null, 587.33, 659.25,
];

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let sfxGain: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let schedulerHandle: number | null = null;
let nextStepTime = 0;
let currentStep = 0;

export function initAudio(): void {
  if (audioCtx) {
    if (audioCtx.state === "suspended") void audioCtx.resume();
    return;
  }

  const ctx = new AudioContext();
  audioCtx = ctx;

  masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);

  musicGain = ctx.createGain();
  musicGain.gain.value = MUSIC_GAIN;
  musicGain.connect(masterGain);

  sfxGain = ctx.createGain();
  sfxGain.gain.value = SFX_GAIN;
  sfxGain.connect(masterGain);

  const noiseLength = ctx.sampleRate; // 1 second, looped as needed
  noiseBuffer = ctx.createBuffer(1, noiseLength, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseLength; i++) data[i] = Math.random() * 2 - 1;

  nextStepTime = ctx.currentTime + 0.05;
  currentStep = 0;
  schedulerHandle = window.setInterval(schedulerTick, LOOKAHEAD_MS);
}

function schedulerTick(): void {
  if (!audioCtx) return;
  while (nextStepTime < audioCtx.currentTime + SCHEDULE_AHEAD_SEC) {
    scheduleStep(currentStep, nextStepTime);
    nextStepTime += STEP_DURATION;
    currentStep = (currentStep + 1) % STEPS_PER_BAR;
  }
}

function scheduleStep(step: number, time: number): void {
  const bassFreq = BASS_PATTERN[step];
  if (bassFreq !== null) playBassNote(bassFreq, time);
  const leadFreq = LEAD_PATTERN[step];
  if (leadFreq !== null) playLeadNote(leadFreq, time);
  if (step % 4 === 0) playKick(time);
}

function playBassNote(freq: number, time: number): void {
  const ctx = audioCtx!;
  const osc = ctx.createOscillator();
  osc.type = "square";
  osc.frequency.setValueAtTime(freq, time);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.001, time);
  gain.gain.linearRampToValueAtTime(0.7, time + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, time + STEP_DURATION * 1.8);
  osc.connect(gain).connect(musicGain!);
  osc.start(time);
  osc.stop(time + STEP_DURATION * 1.9);
}

function playLeadNote(freq: number, time: number): void {
  const ctx = audioCtx!;
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, time);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.001, time);
  gain.gain.linearRampToValueAtTime(0.5, time + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, time + STEP_DURATION * 0.9);
  osc.connect(gain).connect(musicGain!);
  osc.start(time);
  osc.stop(time + STEP_DURATION);
}

function playKick(time: number): void {
  const ctx = audioCtx!;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 300;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.5, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
  src.connect(filter).connect(gain).connect(musicGain!);
  src.start(time);
  src.stop(time + 0.09);

  const thump = ctx.createOscillator();
  thump.type = "sine";
  thump.frequency.setValueAtTime(120, time);
  thump.frequency.exponentialRampToValueAtTime(45, time + 0.1);
  const thumpGain = ctx.createGain();
  thumpGain.gain.setValueAtTime(0.6, time);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
  thump.connect(thumpGain).connect(musicGain!);
  thump.start(time);
  thump.stop(time + 0.13);
}

function noiseHit(time: number, filterType: BiquadFilterType, frequency: number, peak: number, decay: number): void {
  const ctx = audioCtx!;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = frequency;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(peak, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + decay);
  src.connect(filter).connect(gain).connect(sfxGain!);
  src.start(time);
  src.stop(time + decay + 0.01);
}

// Player and enemy firing are deliberately built from different waveforms,
// pitch ranges and envelope lengths (not just different volumes) so danger
// is identifiable by ear alone.
function sfxPlayerFire(): void {
  const ctx = audioCtx!;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = "square";
  osc.frequency.setValueAtTime(880, t);
  osc.frequency.exponentialRampToValueAtTime(660, t + 0.04);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.5, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  osc.connect(gain).connect(sfxGain!);
  osc.start(t);
  osc.stop(t + 0.06);
}

function sfxEnemyFire(): void {
  const ctx = audioCtx!;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(220, t);
  osc.frequency.exponentialRampToValueAtTime(180, t + 0.09);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.4, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
  osc.connect(gain).connect(sfxGain!);
  osc.start(t);
  osc.stop(t + 0.12);
}

function sfxImpact(): void {
  noiseHit(audioCtx!.currentTime, "bandpass", 2200, 0.35, 0.05);
}

function sfxPlayerDamage(): void {
  const ctx = audioCtx!;
  const t = ctx.currentTime;
  noiseHit(t, "lowpass", 900, 0.45, 0.15);
  const osc = ctx.createOscillator();
  osc.type = "square";
  osc.frequency.setValueAtTime(140, t);
  osc.frequency.exponentialRampToValueAtTime(70, t + 0.18);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.4, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  osc.connect(gain).connect(sfxGain!);
  osc.start(t);
  osc.stop(t + 0.21);
}

function sfxEnemyCollision(): void {
  const ctx = audioCtx!;
  const t = ctx.currentTime;
  noiseHit(t, "lowpass", 1400, 0.5, 0.2);
  for (const [freq, detune] of [
    [100, 0],
    [103, -8],
  ] as const) {
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, t);
    osc.detune.setValueAtTime(detune, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, t + 0.22);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    osc.connect(gain).connect(sfxGain!);
    osc.start(t);
    osc.stop(t + 0.25);
  }
}

function sfxEnemyDestroyed(): void {
  const ctx = audioCtx!;
  const t = ctx.currentTime;
  const steps = [520, 390, 260];
  steps.forEach((freq, i) => {
    const start = t + i * 0.06;
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(freq, start);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.07);
    osc.connect(gain).connect(sfxGain!);
    osc.start(start);
    osc.stop(start + 0.08);
  });
  noiseHit(t + 0.18, "lowpass", 1600, 0.3, 0.15);
}

function sfxUnstableSplit(): void {
  const ctx = audioCtx!;
  const t = ctx.currentTime;
  noiseHit(t, "highpass", 1800, 0.4, 0.04);
  const start = t + 0.03;
  for (const target of [520, 320]) {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(400, start);
    osc.frequency.linearRampToValueAtTime(target, start + 0.12);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
    osc.connect(gain).connect(sfxGain!);
    osc.start(start);
    osc.stop(start + 0.17);
  }
}

function sfxPickup(): void {
  const ctx = audioCtx!;
  const t = ctx.currentTime;
  const notes = [523.25, 659.25];
  notes.forEach((freq, i) => {
    const start = t + i * 0.07;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, start);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);
    osc.connect(gain).connect(sfxGain!);
    osc.start(start);
    osc.stop(start + 0.13);
  });
}

function sfxChargeReady(): void {
  const ctx = audioCtx!;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(440, t);
  osc.frequency.exponentialRampToValueAtTime(880, t + 0.09);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.4, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc.connect(gain).connect(sfxGain!);
  osc.start(t);
  osc.stop(t + 0.11);
}

function sfxVictory(): void {
  const ctx = audioCtx!;
  const t = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, i) => {
    const start = t + i * 0.14;
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(freq, start);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
    osc.connect(gain).connect(sfxGain!);
    osc.start(start);
    osc.stop(start + 0.22);
  });
}

function sfxDefeat(): void {
  const ctx = audioCtx!;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(440, t);
  osc.frequency.exponentialRampToValueAtTime(55, t + 0.65);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(4000, t);
  filter.frequency.exponentialRampToValueAtTime(200, t + 0.65);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.4, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
  osc.connect(filter).connect(gain).connect(sfxGain!);
  osc.start(t);
  osc.stop(t + 0.72);
}

export function playSound(kind: SoundEventKind): void {
  if (!audioCtx) return;
  switch (kind) {
    case "playerFire":
      sfxPlayerFire();
      break;
    case "enemyFire":
      sfxEnemyFire();
      break;
    case "impact":
      sfxImpact();
      break;
    case "playerDamage":
      sfxPlayerDamage();
      break;
    case "enemyCollision":
      sfxEnemyCollision();
      break;
    case "enemyDestroyed":
      sfxEnemyDestroyed();
      break;
    case "unstableSplit":
      sfxUnstableSplit();
      break;
    case "pickup":
      sfxPickup();
      break;
    case "chargeReady":
      sfxChargeReady();
      break;
    case "victory":
      sfxVictory();
      break;
    case "defeat":
      sfxDefeat();
      break;
  }
}
