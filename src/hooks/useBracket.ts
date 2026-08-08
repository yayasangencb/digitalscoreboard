import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { BracketMatch, BracketParticipant, BracketRow } from "@/lib/bracket-logic";
import { reconcileBracketProgression } from "@/lib/bracket-sync";

export function useBracket(bracketId: string | undefined) {
  const [bracket, setBracket] = useState<BracketRow | null>(null);
  const [participants, setParticipants] = useState<BracketParticipant[]>([]);
  const [matches, setMatches] = useState<BracketMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const bracketRef = useRef<BracketRow | null>(bracket);
  bracketRef.current = bracket;

  const load = useCallback(
    async (isInitial = false, retryCount = 0) => {
      if (!bracketId) return;
      if (isInitial && !bracketRef.current) setLoading(true);

      const { data: b, error } = await supabase
        .from("brackets")
        .select("*")
        .eq("id", bracketId)
        .maybeSingle();

      if (error || !b) {
        // High latency or initial connection glitch retry
        if (retryCount < 2 && !bracketRef.current) {
          setTimeout(() => void load(isInitial, retryCount + 1), 600);
          return;
        }
        if (!bracketRef.current) {
          setNotFound(true);
        }
        setLoading(false);
        return;
      }

      setNotFound(false);
      setBracket(b);

      const [{ data: ps }, { data: ms }] = await Promise.all([
        supabase.from("bracket_participants").select("*").eq("bracket_id", bracketId).order("initial_position"),
        supabase.from("bracket_matches").select("*").eq("bracket_id", bracketId).order("match_number"),
      ]);

      if (ps) setParticipants(ps);
      if (ms) setMatches(ms);
      setLoading(false);

      // Auto-reconcile progression in background
      void reconcileBracketProgression(bracketId).then(async () => {
        const [{ data: freshPs }, { data: freshMs }] = await Promise.all([
          supabase.from("bracket_participants").select("*").eq("bracket_id", bracketId).order("initial_position"),
          supabase.from("bracket_matches").select("*").eq("bracket_id", bracketId).order("match_number"),
        ]);
        if (freshPs) setParticipants(freshPs);
        if (freshMs) setMatches(freshMs);
      });
    },
    [bracketId],
  );

  useEffect(() => {
    void load(true);
  }, [load]);

  useEffect(() => {
    if (!bracketId) return;
    const ch = supabase
      .channel(`bracket-${bracketId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "brackets", filter: `id=eq.${bracketId}` },
        () => void load(false),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bracket_participants", filter: `bracket_id=eq.${bracketId}` },
        () => void load(false),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bracket_matches", filter: `bracket_id=eq.${bracketId}` },
        () => void load(false),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        () => void load(false),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [bracketId, load]);

  return { bracket, participants, matches, loading, notFound, reload: () => load(false) };
}



