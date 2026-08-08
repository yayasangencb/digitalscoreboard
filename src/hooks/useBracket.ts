import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { BracketMatch, BracketParticipant, BracketRow } from "@/lib/bracket-logic";
import { reconcileBracketProgression } from "@/lib/bracket-sync";

export function useBracket(bracketId: string | undefined) {
  const [bracket, setBracket] = useState<BracketRow | null>(null);
  const [participants, setParticipants] = useState<BracketParticipant[]>([]);
  const [matches, setMatches] = useState<BracketMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!bracketId) return;
    setLoading(true);
    const { data: b } = await supabase.from("brackets").select("*").eq("id", bracketId).maybeSingle();
    if (!b) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setBracket(b);

    // Auto-reconcile progression (advance winners/byes) before retrieving matches
    await reconcileBracketProgression(bracketId);

    const [{ data: ps }, { data: ms }] = await Promise.all([
      supabase.from("bracket_participants").select("*").eq("bracket_id", bracketId).order("initial_position"),
      supabase.from("bracket_matches").select("*").eq("bracket_id", bracketId).order("match_number"),
    ]);
    setParticipants(ps ?? []);
    setMatches(ms ?? []);
    setLoading(false);
  }, [bracketId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!bracketId) return;
    const ch = supabase
      .channel(`bracket-${bracketId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "brackets", filter: `id=eq.${bracketId}` },
        () => void load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bracket_participants", filter: `bracket_id=eq.${bracketId}` },
        () => void load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bracket_matches", filter: `bracket_id=eq.${bracketId}` },
        () => void load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [bracketId, load]);

  return { bracket, participants, matches, loading, notFound, reload: load };
}

