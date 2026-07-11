import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, CheckCircle2, Gamepad2, MonitorPlay, PlusCircle, Trophy, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { MatchList, type MatchWithTournament } from "@/components/MatchList";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Digital Scoreboard Tenis Meja" }] }),
  component: DashboardPage,
});

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Trophy }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="font-display text-3xl font-bold tabular-nums">{value}</div>
          <div className="truncate text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardPage() {
  const queryClient = useQueryClient();

  const { data: matches = [] } = useQuery({
    queryKey: ["matches", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("*, tournaments(tournament_name)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as MatchWithTournament[];
    },
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  const today = matches.filter((m) => m.created_at.startsWith(todayStr)).length;
  const running = matches.filter((m) => m.match_status === "in_progress" || m.match_status === "paused").length;
  const finished = matches.filter((m) => m.match_status === "finished").length;
  const players = new Set(matches.flatMap((m) => [m.player_left_name, m.player_right_name])).size;
  const active = matches.filter((m) => m.match_status !== "finished");

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["matches"] });

  return (
    <AppLayout title="Dashboard">
      <div className="grid gap-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Pertandingan Hari Ini" value={today} icon={Trophy} />
          <StatCard label="Sedang Berlangsung" value={running} icon={Activity} />
          <StatCard label="Selesai" value={finished} icon={CheckCircle2} />
          <StatCard label="Jumlah Pemain" value={players} icon={Users} />
        </div>

        <div className="flex flex-wrap gap-3">
          <Button size="lg" asChild>
            <Link to="/matches/create">
              <PlusCircle className="h-5 w-5" /> Buat Pertandingan
            </Link>
          </Button>
          {active[0] && (
            <>
              <Button size="lg" variant="secondary" asChild>
                <Link to="/controller/$matchCode" params={{ matchCode: active[0].match_code }}>
                  <Gamepad2 className="h-5 w-5" /> Buka Controller
                </Link>
              </Button>
              <Button size="lg" variant="accent" asChild>
                <Link to="/display/$matchCode" params={{ matchCode: active[0].match_code }} target="_blank">
                  <MonitorPlay className="h-5 w-5" /> Buka Display
                </Link>
              </Button>
            </>
          )}
        </div>

        <div>
          <h2 className="mb-3 font-display text-base font-bold uppercase tracking-wide text-muted-foreground">
            Pertandingan Terbaru
          </h2>
          <MatchList matches={matches.slice(0, 8)} onChanged={refresh} emptyText="Belum ada pertandingan. Buat pertandingan pertama Anda!" />
        </div>
      </div>
    </AppLayout>
  );
}
