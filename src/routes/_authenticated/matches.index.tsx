import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { MatchList, type MatchWithTournament } from "@/components/MatchList";

export const Route = createFileRoute("/_authenticated/matches/")({
  head: () => ({ meta: [{ title: "Pertandingan Aktif — Digital Scoreboard Tenis Meja" }] }),
  component: MatchesPage,
});

function MatchesPage() {
  const queryClient = useQueryClient();
  const { data: matches = [], isLoading } = useQuery({
    queryKey: ["matches", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("*, tournaments(tournament_name)")
        .neq("match_status", "finished")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MatchWithTournament[];
    },
  });

  return (
    <AppLayout title="Pertandingan Aktif">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Memuat…</p>
      ) : (
        <MatchList
          matches={matches}
          onChanged={() => queryClient.invalidateQueries({ queryKey: ["matches"] })}
          emptyText="Tidak ada pertandingan aktif."
        />
      )}
    </AppLayout>
  );
}
