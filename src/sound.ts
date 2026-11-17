/**
 * Small synthesized sounds. Nothing is downloaded, nothing plays until the player turns
 * sound on, and every call is safe where Web Audio is unavailable.
 */
export type Cue = 'strike' | 'guard' | 'hurt' | 'stagger' | 'perfect' | 'heal' | 'bell' | 'deed';
let context: AudioContext | null = null;
let enabled = false;

export function setSound(on: boolean) {
  enabled = on;
  if (on && !context && typeof AudioContext !== 'undefined') {
    try {
      context = new AudioContext();
    } catch {
      context = null;
    }
  }
  if (on) void context?.resume().catch(() => undefined);
  applyAmbient();
}

function tone(
  ctx: AudioContext,
  at: number,
  frequency: number,
  length: number,
  volume: number,
  type: OscillatorType = 'sine',
  glide = 0,
) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, at);
  if (glide) oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, glide), at + length);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(volume, at + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(at);
  oscillator.stop(at + length + 0.02);
}

export function play(cue: Cue) {
  if (!enabled || !context) return;
  const ctx = context;
  const t = ctx.currentTime + 0.01;
  try {
    if (cue === 'strike') tone(ctx, t, 220, 0.14, 0.16, 'triangle', 90);
    else if (cue === 'guard') tone(ctx, t, 130, 0.18, 0.18, 'square', 70);
    else if (cue === 'hurt') tone(ctx, t, 150, 0.26, 0.2, 'sawtooth', 55);
    else if (cue === 'heal') {
      tone(ctx, t, 392, 0.2, 0.1);
      tone(ctx, t + 0.09, 523, 0.26, 0.1);
    } else if (cue === 'perfect') {
      tone(ctx, t, 660, 0.12, 0.12, 'triangle');
      tone(ctx, t + 0.07, 990, 0.22, 0.1, 'triangle');
    } else if (cue === 'stagger') {
      tone(ctx, t, 320, 0.4, 0.2, 'square', 60);
      tone(ctx, t + 0.05, 880, 0.3, 0.07);
    } else if (cue === 'deed') {
      [523, 659, 784, 1047].forEach((f, i) => tone(ctx, t + i * 0.09, f, 0.3, 0.09));
    } else {
      // A struck bell: inharmonic partials, the lowest ringing longest, plus a noise tick.
      [
        [0.5, 4, 0.1],
        [1, 3.8, 0.12],
        [1.19, 3.2, 0.06],
        [1.56, 2.8, 0.05],
        [2, 2.5, 0.05],
        [2.74, 2.1, 0.03],
        [3, 2, 0.025],
      ].forEach(([r, length, volume]) => tone(ctx, t, 196 * r, length, volume));
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(ctx);
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 2400;
      const hit = ctx.createGain();
      hit.gain.setValueAtTime(0.1, t);
      hit.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      src.connect(filter).connect(hit).connect(ctx.destination);
      src.start(t);
      src.stop(t + 0.08);
    }
  } catch {
    /* A sound is never worth an error. */
  }
}

/* ---- Ambient soundscape ---------------------------------------------------------- */
type Bed = { gain: GainNode; stop: () => void };
let bed: Bed | null = null;
let realm: 0 | 1 | 2 | null = null;
const AMBIENT_LEVEL = 0.05;
const FADE = 2;

function noiseBuffer(ctx: AudioContext) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function buildBed(ctx: AudioContext, which: 0 | 1 | 2): Bed {
  const gain = ctx.createGain();
  gain.gain.value = 0.0001;
  gain.connect(ctx.destination);
  const nodes: (OscillatorNode | AudioBufferSourceNode)[] = [];
  const osc = (type: OscillatorType, f: number, level: number, dest: AudioNode) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = f;
    g.gain.value = level;
    o.connect(g).connect(dest);
    o.start();
    nodes.push(o);
    return g;
  };
  const lfo = (rate: number, depth: number, target: AudioParam) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = rate;
    g.gain.value = depth;
    o.connect(g).connect(target);
    o.start();
    nodes.push(o);
  };
  if (which === 0) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx);
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 380;
    const level = ctx.createGain();
    level.gain.value = 0.5;
    src.connect(filter).connect(level).connect(gain);
    src.start();
    nodes.push(src);
    lfo(0.11, 120, filter.frequency);
    osc('sine', 55, 0.6, gain);
  } else if (which === 1) {
    const tremolo = ctx.createGain();
    tremolo.gain.value = 0.6;
    tremolo.connect(gain);
    lfo(0.23, 0.4, tremolo.gain);
    [1318.5, 1760, 2093, 2637].forEach((f, i) => osc('sine', f, 0.2 - i * 0.03, tremolo));
  } else {
    const swell = ctx.createGain();
    swell.gain.value = 0.7;
    swell.connect(gain);
    lfo(0.06, 0.3, swell.gain);
    osc('sawtooth', 65.4, 0.12, swell);
    osc('sawtooth', 98, 0.09, swell);
    osc('sine', 130.8, 0.3, swell);
  }
  return {
    gain,
    stop: () =>
      nodes.forEach((n) => {
        try {
          n.stop();
        } catch {
          /* already stopped */
        }
      }),
  };
}

function fadeOut(old: Bed, ctx: AudioContext) {
  const now = ctx.currentTime;
  old.gain.gain.cancelScheduledValues(now);
  old.gain.gain.setValueAtTime(Math.max(0.0001, old.gain.gain.value), now);
  old.gain.gain.linearRampToValueAtTime(0.0001, now + FADE);
  setTimeout(
    () => {
      old.stop();
      old.gain.disconnect();
    },
    FADE * 1000 + 100,
  );
}

function applyAmbient() {
  if (!context) return;
  const ctx = context;
  try {
    const wanted = enabled ? realm : null;
    if (bed && wanted === null) {
      fadeOut(bed, ctx);
      bed = null;
      return;
    }
    if (wanted === null) return;
    if (bed && (bed as Bed & { realm?: number }).realm === wanted) return;
    if (bed) fadeOut(bed, ctx);
    const fresh = buildBed(ctx, wanted) as Bed & { realm?: number };
    fresh.realm = wanted;
    const now = ctx.currentTime;
    fresh.gain.gain.setValueAtTime(0.0001, now);
    fresh.gain.gain.linearRampToValueAtTime(AMBIENT_LEVEL, now + FADE);
    bed = fresh;
  } catch {
    /* A soundscape is never worth an error. */
  }
}

/** A quiet looping drone for a realm (null = silence). Only sounds while sound is on. */
export function setAmbient(next: 0 | 1 | 2 | null) {
  realm = next;
  applyAmbient();
}
