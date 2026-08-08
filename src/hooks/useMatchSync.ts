import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MatchRow, MatchSetRow, ThemeRow, TournamentRow } from "@/lib/match-logic";
import { playMatchWon, playScore, playScoreMinus, playSetWon } from "@/lib/sounds";

export type ConnStatus = "connected" | "connecting" | "disconnected";

export function useMatchSync(matchCode: string) {
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [sets, setSets] = useState<MatchSetRow[]>([]);
  const [theme, setTheme] = useState<ThemeRow | null>(null);
  const [tournament, setTournament] = useState<TournamentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [connStatus, setConnStatus] = useState<ConnStatus>("connecting");

  const prevMatchRef = useRef<MatchRow | null>(null);

  const updateMatchState = useCallback((next: MatchRow) => {
    const prev = prevMatchRef.current;
    if (prev && prev.id === next.id) {
      if (next.score_left > prev.score_left || next.score_right > prev.score_right) {
        playScore();
      } else if (next.score_left < prev.score_left || next.score_right < prev.score_right) {
        playScoreMinus();
      }

      if (next.sets_left > prev.sets_left || next.sets_right > prev.sets_right) {
        if (next.match_status === "finished") {
          playMatchWon();
        } else {
          playSetWon();
        }
      } else if (next.match_status === "finished" && prev.match_status !== "finished") {
        playMatchWon();
      }
    }
    prevMatchRef.current = next;
    setMatch(next);
  }, []);

  const loadSets = useCallback(async (matchId: string) => {
    const { data } = await supabase
      .from("match_sets")
      .select("*")
      .eq("match_id", matchId)
      .order("set_number", { ascending: true });
    setSets(data ?? []);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: m } = await supabase.from("matches").select("*").eq("match_code", matchCode).maybeSingle();
    if (!m) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    updateMatchState(m);
    await loadSets(m.id);
    if (m.tournament_id) {
      const { data: t } = await supabase.from("tournaments").select("*").eq("id", m.tournament_id).maybeSingle();
      setTournament(t ?? null);
    }
    setLoading(false);
  }, [matchCode, loadSets, updateMatchState]);

  useEffect(() => {
    void load();
  }, [load]);

  // Load theme whenever theme_id changes
  useEffect(() => {
    if (!match?.theme_id) {
      setTheme(null);
      return;
    }
    supabase
      .from("themes")
      .select("*")
      .eq("id", match.theme_id)
      .maybeSingle()
      .then(({ data }) => setTheme(data ?? null));
  }, [match?.theme_id]);

  // Realtime subscription
  useEffect(() => {
    const matchId = match?.id;
    if (!matchId) return;

    const channel = supabase
      .channel(`match-${matchId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${matchId}` },
        (payload) => updateMatchState(payload.new as MatchRow),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_sets", filter: `match_id=eq.${matchId}` },
        () => void loadSets(matchId),
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setConnStatus("connected");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setConnStatus("disconnected");
        else setConnStatus("connecting");
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [match?.id, loadSets, updateMatchState]);

  return { match, setMatch: updateMatchState, sets, theme, tournament, loading, notFound, connStatus, reload: load };
}

