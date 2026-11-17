import { describe, expect, it } from 'vitest';
import { play, setAmbient, setSound } from './sound';

describe('sound without Web Audio', () => {
  it('has no AudioContext in this environment', () => {
    expect(typeof AudioContext).toBe('undefined');
  });
  it('never throws when sound is off or unavailable', () => {
    expect(() => {
      for (const cue of [
        'strike',
        'guard',
        'hurt',
        'stagger',
        'perfect',
        'heal',
        'bell',
        'deed',
      ] as const)
        play(cue);
      setAmbient(0);
      setAmbient(1);
      setAmbient(2);
      setAmbient(null);
      setSound(true);
      play('bell');
      setAmbient(2);
      setSound(false);
      setAmbient(null);
    }).not.toThrow();
  });
});
