// Lightweight & Rich WebAudio sound effects for the scoreboard.

const SOUND_KEY = "sb-muted";
const VOLUME_KEY = "sb-volume";

export function isMuted(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SOUND_KEY) === "1";
}

export function setMuted(muted: boolean) {
  localStorage.setItem(SOUND_KEY, muted ? "1" : "0");
}

export function getVolume(): number {
  if (typeof window === "undefined") return 0.7;
  const v = parseFloat(localStorage.getItem(VOLUME_KEY) ?? "0.7");
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.7;
}

export function setVolume(v: number) {
  localStorage.setItem(VOLUME_KEY, String(Math.min(1, Math.max(0, v))));
}

let ctx: AudioContext | null = null;

export function audioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
  return ctx;
}

// Unlock WebAudio on any user interaction
if (typeof window !== "undefined") {
  const unlock = () => {
    const ac = audioCtx();
    if (ac && ac.state === "suspended") {
      void ac.resume();
    }
  };
  window.addEventListener("click", unlock, { once: false });
  window.addEventListener("keydown", unlock, { once: false });
  window.addEventListener("touchstart", unlock, { once: false });
}

/** Suara saat poin bertambah (chime 2-nada A5+E6) */
export function playScore() {
  if (isMuted()) return;
  const ac = audioCtx();
  if (!ac) return;
  const vol = getVolume() * 0.5;
  const now = ac.currentTime;

  const osc1 = ac.createOscillator();
  const osc2 = ac.createOscillator();
  const gain = ac.createGain();

  osc1.type = "sine";
  osc1.frequency.setValueAtTime(880, now);

  osc2.type = "triangle";
  osc2.frequency.setValueAtTime(1320, now);

  gain.gain.setValueAtTime(0.01, now);
  gain.gain.linearRampToValueAtTime(vol, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ac.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.26);
  osc2.stop(now + 0.26);
}

/** Suara saat poin dikurangi (boop rendah) */
export function playScoreMinus() {
  if (isMuted()) return;
  const ac = audioCtx();
  if (!ac) return;
  const vol = getVolume() * 0.3;
  const now = ac.currentTime;

  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(320, now);
  osc.frequency.exponentialRampToValueAtTime(220, now + 0.15);

  gain.gain.setValueAtTime(vol, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

  osc.connect(gain).connect(ac.destination);
  osc.start(now);
  osc.stop(now + 0.17);
}

/** Suara saat set dimenangkan (fanfare 4-nada C5->E5->G5->C6) */
export function playSetWon() {
  if (isMuted()) return;
  const ac = audioCtx();
  if (!ac) return;
  const vol = getVolume() * 0.5;

  const notes = [523.25, 659.25, 784.88, 1046.5];
  notes.forEach((freq, i) => {
    const delay = i * 0.12;
    const now = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const gain = ac.createGain();

    osc.type = i === notes.length - 1 ? "triangle" : "sine";
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc.connect(gain).connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.36);
  });
}

/** Suara saat pertandingan dimenangkan (fanfare kemenangan meriah) */
export function playMatchWon() {
  if (isMuted()) return;
  const ac = audioCtx();
  if (!ac) return;
  const vol = getVolume() * 0.6;

  const notes = [
    { f: 523.25, t: 0, d: 0.25 },
    { f: 659.25, t: 0.15, d: 0.25 },
    { f: 784.88, t: 0.3, d: 0.25 },
    { f: 1046.5, t: 0.45, d: 0.7 },
    { f: 1318.5, t: 0.5, d: 0.8 },
  ];

  notes.forEach(({ f, t, d }) => {
    const now = ac.currentTime + t;
    const osc1 = ac.createOscillator();
    const osc2 = ac.createOscillator();
    const gain = ac.createGain();

    osc1.type = "triangle";
    osc1.frequency.setValueAtTime(f, now);

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(f * 1.002, now);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + d);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ac.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + d + 0.05);
    osc2.stop(now + d + 0.05);
  });
}

export function playTimeUp() {
  if (isMuted()) return;
  const ac = audioCtx();
  if (!ac) return;
  const vol = getVolume() * 0.4;
  const now = ac.currentTime;

  [0, 0.3, 0.6].forEach((delay) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(440, now + delay);
    gain.gain.setValueAtTime(vol, now + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.2);
    osc.connect(gain).connect(ac.destination);
    osc.start(now + delay);
    osc.stop(now + delay + 0.22);
  });
}

