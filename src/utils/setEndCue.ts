/**
 * Sound + vibration when a timed set ends.
 *
 * The beeps are scheduled ahead of time on the Web Audio clock when the set starts, so
 * they can still fire while JS timers are throttled (backgrounded tab, some lock-screen
 * cases on Android). Where the browser suspends audio entirely (iOS when locked), the
 * AudioContext clock stops; when the app comes back we notice the beep never reached its
 * time and play it immediately instead. Everything here is best effort and silent on
 * failure — a missing beep must never break the workout screen.
 */

type AudioContextCtor = typeof AudioContext;

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor: AudioContextCtor | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  return ctx;
}

/**
 * Must be called from a user gesture (the Start button) — iOS/Chrome only let audio play
 * after one. Plays a silent buffer, which is what actually unlocks iOS.
 */
export function unlockAudio(): void {
  const c = getContext();
  if (!c) return;
  try {
    if (c.state !== 'running') void c.resume();
    const buffer = c.createBuffer(1, 1, 22050);
    const src = c.createBufferSource();
    src.buffer = buffer;
    src.connect(c.destination);
    src.start(0);
  } catch {
    // ignore
  }
}

function beep(c: AudioContext, at: number, freq: number, length: number, volume: number): OscillatorNode {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  // Short attack/release so it doesn't click.
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(volume, at + 0.01);
  gain.gain.setValueAtTime(volume, at + length - 0.03);
  gain.gain.linearRampToValueAtTime(0, at + length);
  osc.connect(gain).connect(c.destination);
  osc.start(at);
  osc.stop(at + length);
  return osc;
}

export interface ScheduledCue {
  oscillators: OscillatorNode[];
  /** AudioContext time the final beep plays at. */
  endCtxTime: number;
}

/** Three short countdown ticks, then a longer two-tone "done" beep at `endAtMs`. */
export function scheduleSetEndCue(endAtMs: number): ScheduledCue | null {
  const c = getContext();
  if (!c) return null;
  try {
    if (c.state !== 'running') void c.resume();
    const end = c.currentTime + (endAtMs - Date.now()) / 1000;
    if (end <= c.currentTime) return null;
    const oscillators: OscillatorNode[] = [];
    for (const secsBefore of [3, 2, 1]) {
      const at = end - secsBefore;
      if (at > c.currentTime) oscillators.push(beep(c, at, 660, 0.12, 0.25));
    }
    oscillators.push(beep(c, end, 880, 0.25, 0.4), beep(c, end + 0.28, 1175, 0.45, 0.4));
    return { oscillators, endCtxTime: end };
  } catch {
    return null;
  }
}

export function cancelCue(cue: ScheduledCue | null): void {
  cue?.oscillators.forEach(osc => {
    try {
      osc.stop();
      osc.disconnect();
    } catch {
      // already stopped
    }
  });
}

/** Whether a scheduled cue's final beep actually got played by the audio clock. */
export function cueHasPlayed(cue: ScheduledCue | null): boolean {
  return !!cue && !!ctx && ctx.currentTime >= cue.endCtxTime;
}

/** Play the "done" beep right now (used when the scheduled one never got to play). */
export function playSetEndCueNow(): void {
  const c = getContext();
  if (!c) return;
  try {
    if (c.state !== 'running') void c.resume();
    const now = c.currentTime + 0.05;
    beep(c, now, 880, 0.25, 0.4);
    beep(c, now + 0.28, 1175, 0.45, 0.4);
  } catch {
    // ignore
  }
}

export function vibrateSetEnd(): void {
  try {
    navigator.vibrate?.([250, 120, 250, 120, 400]);
  } catch {
    // Not supported (iOS Safari) — the beep has to do.
  }
}
