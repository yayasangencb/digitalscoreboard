import { useCallback, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  checkSetWinner,
  matchWinner,
  otherSide,
  serveSwitchesAt,
  setStartServer,
  takeSnapshot,
  timerElapsedSeconds,
  type MatchRow,
  type Side,
  type Snapshot,
} from "@/lib/match-logic";
import { playScore, playScoreMinus, playSetWon, playMatchWon } from "@/lib/sounds";

type Patch = Partial<MatchRow>;

async function logEvent(matchId: string, action: string, prev: string, next: string, side?: string) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from("score_events").insert({
    match_id: matchId,
    action_type: action,
    previous_value: prev,
    new_value: next,
    player_side: side ?? null,
    operator_id: data.user.id,
  });
}

export function useMatchActions(match: MatchRow | null, setMatch: (m: MatchRow) => void) {
  const undoStack = useRef<Snapshot[]>([]);
  const redoStack = useRef<Snapshot[]>([]);
  const matchRef = useRef(match);
  matchRef.current = match;

  const update = useCallback(
    async (patch: Patch, opts?: { snapshot?: boolean; action?: string; side?: string }) => {
      const m = matchRef.current;
      if (!m) return;
      if (opts?.snapshot !== false) {
        undoStack.current.push(takeSnapshot(m));
        if (undoStack.current.length > 200) undoStack.current.shift();
        redoStack.current = [];
      }
      setMatch({ ...m, ...patch } as MatchRow);
      const { error } = await supabase.from("matches").update(patch).eq("id", m.id);
      if (error) {
        toast.error("Gagal menyimpan perubahan: " + error.message);
        return;
      }
      if (opts?.action) {
        void logEvent(m.id, opts.action, JSON.stringify(takeSnapshot(m)), JSON.stringify(patch), opts.side);
      }
    },
    [setMatch],
  );

  const addPoint = useCallback(
    (side: Side) => {
      const m = matchRef.current;
      if (!m || m.match_status === "finished") return;
      const col = side === "left" ? "score_left" : "score_right";
      const newL = side === "left" ? m.score_left + 1 : m.score_left;
      const newR = side === "right" ? m.score_right + 1 : m.score_right;
      const patch: Patch = { [col]: side === "left" ? newL : newR };
      if (m.auto_rules && serveSwitchesAt(newL, newR, m.target_score)) {
        patch.serving_player = otherSide(m.serving_player as Side);
      }
      if (m.match_status === "not_started" || m.match_status === "paused") {
        patch.match_status = "in_progress";
        if (!m.started_at) patch.started_at = new Date().toISOString();
      }
      playScore();
      void update(patch, { action: "point_add", side });
    },
    [update],
  );

  const subPoint = useCallback(
    (side: Side) => {
      const m = matchRef.current;
      if (!m || m.match_status === "finished") return;
      const cur = side === "left" ? m.score_left : m.score_right;
      if (cur <= 0) return;
      const patch: Patch = { [side === "left" ? "score_left" : "score_right"]: cur - 1 };
      // Reverse the serve switch that happened at the current total, if any
      if (m.auto_rules && serveSwitchesAt(m.score_left, m.score_right, m.target_score)) {
        patch.serving_player = otherSide(m.serving_player as Side);
      }
      playScoreMinus();
      void update(patch, { action: "point_sub", side });
    },
    [update],
  );

  const toggleServe = useCallback(() => {
    const m = matchRef.current;
    if (!m) return;
    void update({ serving_player: otherSide(m.serving_player as Side) }, { action: "serve_toggle" });
  }, [update]);

  const swapSides = useCallback(() => {
    const m = matchRef.current;
    if (!m) return;
    void update(
      {
        player_left_name: m.player_right_name,
        player_left_team: m.player_right_team,
        player_left_photo: m.player_right_photo,
        player_right_name: m.player_left_name,
        player_right_team: m.player_left_team,
        player_right_photo: m.player_left_photo,
        score_left: m.score_right,
        score_right: m.score_left,
        sets_left: m.sets_right,
        sets_right: m.sets_left,
        serving_player: otherSide(m.serving_player as Side),
        initial_server: otherSide(m.initial_server as Side),
      },
      { action: "swap_sides" },
    );
  }, [update]);

  const resetScores = useCallback(async () => {
    const m = matchRef.current;
    if (!m) return;
    await supabase.from("match_sets").delete().eq("match_id", m.id);
    void update(
      {
        score_left: 0,
        score_right: 0,
        sets_left: 0,
        sets_right: 0,
        winner: null,
        match_status: "not_started",
        serving_player: m.initial_server,
        finished_at: null,
      },
      { action: "reset_match" },
    );
    toast.success("Skor pertandingan direset");
  }, [update]);

  /** Finalize current set. Returns 'match_finished' | 'next_set' | null */
  const nextSet = useCallback(async (): Promise<"match_finished" | "next_set" | null> => {
    const m = matchRef.current;
    if (!m) return null;
    const winner =
      checkSetWinner(m.score_left, m.score_right, m.target_score) ??
      (m.score_left === m.score_right ? null : m.score_left > m.score_right ? "left" : "right");
    if (!winner) {
      toast.error("Skor masih imbang — tidak bisa menutup set");
      return null;
    }
    const setNumber = m.sets_left + m.sets_right + 1;
    const { error } = await supabase.from("match_sets").insert({
      match_id: m.id,
      set_number: setNumber,
      score_left: m.score_left,
      score_right: m.score_right,
      winner,
    });
    if (error) {
      toast.error("Gagal menyimpan set: " + error.message);
      return null;
    }
    const setsLeft = m.sets_left + (winner === "left" ? 1 : 0);
    const setsRight = m.sets_right + (winner === "right" ? 1 : 0);
    const mw = matchWinner(setsLeft, setsRight, m.best_of);
    if (mw) {
      playMatchWon();
      void update(
        {
          sets_left: setsLeft,
          sets_right: setsRight,
          score_left: 0,
          score_right: 0,
          match_status: "finished",
          winner: mw === "left" ? m.player_left_name : m.player_right_name,
          finished_at: new Date().toISOString(),
          timer_started_at: null,
          timer_elapsed: Math.floor(timerElapsedSeconds(m)),
        },
        { action: "match_finished" },
      );
      return "match_finished";
    }
    playSetWon();
    void update(
      {
        sets_left: setsLeft,
        sets_right: setsRight,
        score_left: 0,
        score_right: 0,
        serving_player: setStartServer(m.initial_server as Side, setNumber + 1),
      },
      { action: "set_finished" },
    );
    return "next_set";
  }, [update]);

  const cancelLastSet = useCallback(async () => {
    const m = matchRef.current;
    if (!m) return;
    const { data: last } = await supabase
      .from("match_sets")
      .select("*")
      .eq("match_id", m.id)
      .order("set_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!last) {
      toast.error("Belum ada set yang selesai");
      return;
    }
    await supabase.from("match_sets").delete().eq("id", last.id);
    void update(
      {
        score_left: last.score_left,
        score_right: last.score_right,
        sets_left: m.sets_left - (last.winner === "left" ? 1 : 0),
        sets_right: m.sets_right - (last.winner === "right" ? 1 : 0),
        match_status: "in_progress",
        winner: null,
        finished_at: null,
      },
      { action: "set_cancelled" },
    );
    toast.success(`Set ${last.set_number} dibatalkan`);
  }, [update]);

  const finishMatch = useCallback(() => {
    const m = matchRef.current;
    if (!m) return;
    const winnerName =
      m.sets_left === m.sets_right
        ? null
        : m.sets_left > m.sets_right
          ? m.player_left_name
          : m.player_right_name;
    playMatchWon();
    void update(
      {
        match_status: "finished",
        winner: winnerName,
        finished_at: new Date().toISOString(),
        timer_started_at: null,
        timer_elapsed: Math.floor(timerElapsedSeconds(m)),
      },
      { action: "match_finished_manual" },
    );
  }, [update]);

  const pauseMatch = useCallback(() => {
    const m = matchRef.current;
    if (!m) return;
    void update({ match_status: m.match_status === "paused" ? "in_progress" : "paused" }, { action: "pause_toggle" });
  }, [update]);

  // ----- Timer -----
  const startTimer = useCallback(() => {
    const m = matchRef.current;
    if (!m || m.timer_started_at) return;
    void update({ timer_started_at: new Date().toISOString(), timer_paused_at: null }, { snapshot: false });
  }, [update]);

  const pauseTimer = useCallback(() => {
    const m = matchRef.current;
    if (!m || !m.timer_started_at) return;
    void update(
      {
        timer_elapsed: Math.floor(timerElapsedSeconds(m)),
        timer_started_at: null,
        timer_paused_at: new Date().toISOString(),
      },
      { snapshot: false },
    );
  }, [update]);

  const toggleTimer = useCallback(() => {
    const m = matchRef.current;
    if (!m) return;
    if (m.timer_started_at) pauseTimer();
    else startTimer();
  }, [pauseTimer, startTimer]);

  const resetTimer = useCallback(() => {
    void update({ timer_elapsed: 0, timer_started_at: null, timer_paused_at: null }, { snapshot: false });
  }, [update]);

  // ----- Undo / Redo -----
  const undo = useCallback(() => {
    const m = matchRef.current;
    const snap = undoStack.current.pop();
    if (!m || !snap) return;
    redoStack.current.push(takeSnapshot(m));
    void update(snap as Patch, { snapshot: false, action: "undo" });
  }, [update]);

  const redo = useCallback(() => {
    const m = matchRef.current;
    const snap = redoStack.current.pop();
    if (!m || !snap) return;
    undoStack.current.push(takeSnapshot(m));
    void update(snap as Patch, { snapshot: false, action: "redo" });
  }, [update]);

  return {
    addPoint,
    subPoint,
    toggleServe,
    swapSides,
    resetScores,
    nextSet,
    cancelLastSet,
    finishMatch,
    pauseMatch,
    startTimer,
    pauseTimer,
    toggleTimer,
    resetTimer,
    undo,
    redo,
    update,
  };
}

export type MatchActions = ReturnType<typeof useMatchActions>;
