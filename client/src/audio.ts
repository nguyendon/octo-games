let ctx: AudioContext | null = null;
const MUTE_KEY = "octo-games:muted";
let muted = readMuted();

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

export function unlockAudio() {
  const c = getCtx();
  if (c.state === "suspended") void c.resume();
}

export function isMuted(): boolean {
  return muted;
}

export function toggleMuted(): boolean {
  muted = !muted;
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* localStorage blocked — keep in-memory state */
  }
  return muted;
}

function tone(freq: number, duration: number, type: OscillatorType = "sine", gain = 0.12) {
  if (muted) return;
  const c = getCtx();
  if (c.state === "suspended") return;
  const now = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  g.gain.setValueAtTime(gain, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(g).connect(c.destination);
  osc.start(now);
  osc.stop(now + duration);
}

function chord(freqs: number[], duration: number, type: OscillatorType = "triangle", gain = 0.08) {
  freqs.forEach((f) => tone(f, duration, type, gain));
}

function arpeggio(freqs: number[], step: number, duration: number, type: OscillatorType = "triangle") {
  if (muted) return;
  const c = getCtx();
  if (c.state === "suspended") return;
  freqs.forEach((f, i) => {
    const osc = c.createOscillator();
    const g = c.createGain();
    const start = c.currentTime + i * step;
    osc.type = type;
    osc.frequency.setValueAtTime(f, start);
    g.gain.setValueAtTime(0.12, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(g).connect(c.destination);
    osc.start(start);
    osc.stop(start + duration);
  });
}

export const sfx = {
  pickup: () => tone(880, 0.12, "triangle", 0.14),
  coin: () => {
    tone(988, 0.06, "square", 0.08);
    setTimeout(() => tone(1318, 0.08, "square", 0.08), 50);
  },
  hide: () => tone(220, 0.15, "sine", 0.1),
  unhide: () => tone(330, 0.1, "sine", 0.1),
  spotted: () => {
    tone(440, 0.06, "square", 0.1);
    setTimeout(() => tone(660, 0.08, "square", 0.1), 70);
  },
  caught: () => {
    chord([110, 138, 165], 0.45, "sawtooth", 0.12);
  },
  win: () => arpeggio([523.25, 659.25, 783.99, 1046.5], 0.1, 0.3),
  cookComplete: () => arpeggio([659.25, 783.99, 987.77], 0.06, 0.2),
};
