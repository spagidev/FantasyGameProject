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
      // A bell: a struck fundamental with slow, slightly inharmonic partials.
      [
        [196, 2.6, 0.2],
        [392.5, 2.0, 0.1],
        [587, 1.5, 0.07],
        [826, 1.0, 0.04],
      ].forEach(([f, length, volume]) => tone(ctx, t, f, length, volume));
    }
  } catch {
    /* A sound is never worth an error. */
  }
}
