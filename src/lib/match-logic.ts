import type { Tables } from "@/integrations/supabase/types";

export type MatchRow = Tables<"matches">;
export type MatchSetRow = Tables<"match_sets">;
export type ThemeRow = Tables<"themes">;
export type TournamentRow = Tables<"tournaments">;

export type Side = "left" | "right";

export const otherSide = (s: Side): Side => (s === "left" ? "right" : "left");

export const setsToWin = (bestOf: number) => Math.ceil(bestOf / 2);

/** Returns the winner of the current set, or null if not decided yet. */
export function checkSetWinner(scoreLeft: number, scoreRight: number, target: number): Side | null {
  if (scoreLeft >= target && scoreLeft - scoreRight >= 2) return "left";
  if (scoreRight >= target && scoreRight - scoreLeft >= 2) return "right";
  return null;
}

/** Deuce: both players at target-1 or beyond (e.g. 10-10 at target 11). */
export function isDeuce(scoreLeft: number, scoreRight: number, target: number): boolean {
  return scoreLeft >= target - 1 && scoreRight >= target - 1;
}

/**
 * After the score changed to (l, r): should the serve switch?
 * Normal play: serve switches every 2 points. During deuce: every point.
 */
export function serveSwitchesAt(l: number, r: number, target: number): boolean {
  if (isDeuce(l, r, target)) return true;
  return (l + r) % 2 === 0 && l + r > 0;
}

/** Server at the start of a given set number (1-based), alternating from initial server. */
export function setStartServer(initial: Side, setNumber: number): Side {
  return setNumber % 2 === 1 ? initial : otherSide(initial);
}

export function matchWinner(setsLeft: number, setsRight: number, bestOf: number): Side | null {
  const need = setsToWin(bestOf);
  if (setsLeft >= need) return "left";
  if (setsRight >= need) return "right";
  return null;
}

export const MATCH_STATUS_LABEL: Record<string, string> = {
  not_started: "Belum Dimulai",
  in_progress: "Sedang Berlangsung",
  paused: "Pause",
  finished: "Selesai",
};

export function statusVariant(status: string): "secondary" | "success" | "warning" | "accent" {
  switch (status) {
    case "in_progress":
      return "success";
    case "paused":
      return "warning";
    case "finished":
      return "accent";
    default:
      return "secondary";
  }
}

export function generateMatchCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `TM-${code}`;
}

/** Total elapsed seconds of the match timer right now. */
export function timerElapsedSeconds(match: Pick<MatchRow, "timer_elapsed" | "timer_started_at">): number {
  let elapsed = match.timer_elapsed ?? 0;
  if (match.timer_started_at) {
    elapsed += Math.max(0, (Date.now() - new Date(match.timer_started_at).getTime()) / 1000);
  }
  return elapsed;
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export interface Snapshot {
  score_left: number;
  score_right: number;
  sets_left: number;
  sets_right: number;
  serving_player: string;
  match_status: string;
  winner: string | null;
}

export function takeSnapshot(m: MatchRow): Snapshot {
  return {
    score_left: m.score_left,
    score_right: m.score_right,
    sets_left: m.sets_left,
    sets_right: m.sets_right,
    serving_player: m.serving_player,
    match_status: m.match_status,
    winner: m.winner,
  };
}

export const DEFAULT_THEME = {
  primary_color: "#06b6d4",
  secondary_color: "#0b1220",
  accent_color: "#f97316",
  text_color: "#ffffff",
  left_player_color: "#f43f5e",
  right_player_color: "#3b82f6",
  font_family: "Oswald",
  background_url: null as string | null,
  logo_url: null as string | null,
  background_opacity: 0.25,
};
