import { useEffect, useRef, useState } from "react";
import { formatClock, timerElapsedSeconds, type MatchRow } from "@/lib/match-logic";
import { playTimeUp } from "@/lib/sounds";

/** Ticking clock derived from server timestamps — stays in sync across devices and refreshes. */
export function useMatchClock(match: MatchRow | null) {
  const [, setTick] = useState(0);
  const firedRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, []);

  if (!match || match.timer_mode === "none") {
    return { text: "", running: false, timeUp: false, elapsed: 0 };
  }

  const elapsed = timerElapsedSeconds(match);
  const running = !!match.timer_started_at;

  if (match.timer_mode === "countdown" && match.timer_duration) {
    const remaining = Math.max(0, match.timer_duration - elapsed);
    const timeUp = remaining <= 0 && (elapsed > 0 || running);
    if (timeUp && running && !firedRef.current) {
      firedRef.current = true;
      playTimeUp();
    }
    if (!timeUp) firedRef.current = false;
    return { text: formatClock(remaining), running, timeUp, elapsed };
  }

  return { text: formatClock(elapsed), running, timeUp: false, elapsed };
}
