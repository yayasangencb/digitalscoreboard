// Lightweight WebAudio sound effects for the scoreboard.

const SOUND_KEY = "sb-muted";
const VOLUME_KEY = "sb-volume";

export function isMuted(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(SOUND_KEY) === "1";
}

export function setMuted(muted: boolean) {
  localStorage.setItem(SOUND_KEY, muted ? "1" : "0");
}

export function getVolume(): number {
  if (typeof window === "undefined") return 0.5;
  const v = parseFloat(localStorage.getItem(VOLUME_KEY) ?? "0.5");
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.5;
}

export function setVolume(v: number) {
  localStorage.setItem(VOLUME_KEY, String(Math.min(1, Math.max(0, v))));
}

let ctx: AudioContext | null = null;

function audioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function beep(freq: number, duration: number, delay = 0, type: OscillatorType = "sine") {
  if (isMuted()) return;
  const ac = audioCtx();
  if (!ac) return;
  const vol = getVolume() * 0.4;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, ac.currentTime + delay);
  gain.gain.linearRampToValueAtTime(vol, ac.currentTime + delay + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(ac.currentTime + delay);
  osc.stop(ac.currentTime + delay + duration + 0.05);
}

export function playScore() {
  beep(880, 0.12);
}

export function playScoreMinus() {
  beep(330, 0.15);
}

export function playSetWon() {
  beep(660, 0.15);
  beep(880, 0.15, 0.16);
  beep(1100, 0.25, 0.32);
}

export function playMatchWon() {
  beep(523, 0.2);
  beep(659, 0.2, 0.2);
  beep(784, 0.2, 0.4);
  beep(1046, 0.5, 0.6);
}

export function playTimeUp() {
  beep(440, 0.3, 0, "square");
  beep(440, 0.3, 0.4, "square");
  beep(440, 0.5, 0.8, "square");
}
