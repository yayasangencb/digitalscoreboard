import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Printer, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatClock } from "@/lib/match-logic";

export const Route = createFileRoute("/_authenticated/matches/$id/result")({
  head: () => ({ meta: [{ title: "Hasil Pertandingan — Digital Scoreboard Tenis Meja" }] }),
  component: ResultPage,
});

function ResultPage() {
  const { id } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["match-result", id],
    queryFn: async () => {
      const [{ data: match }, { data: sets }] = await Promise.all([
        supabase.from("matches").select("*, tournaments(tournament_name, venue)").eq("id", id).maybeSingle(),
        supabase.from("match_sets").select("*").eq("match_id", id).order("set_number"),
      ]);
      return { match, sets: sets ?? [] };
    },
  });

  if (isLoading || !data?.match) {
    return (
      <AppLayout title="Hasil Pertandingan">
        <p className="text-sm text-muted-foreground">{isLoading ? "Memuat…" : "Pertandingan tidak ditemukan."}</p>
      </AppLayout>
    );
  }

  const m = data.match;
  const duration =
    m.started_at && m.finished_at
      ? formatClock((new Date(m.finished_at).getTime() - new Date(m.started_at).getTime()) / 1000)
      : "-";

  return (
    <AppLayout title="Hasil Pertandingan">
      <div className="mx-auto grid max-w-2xl gap-4">
        <Card>
          <CardHeader className="text-center">
            <CardTitle>{m.tournaments?.tournament_name ?? "Pertandingan Tenis Meja"}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {[m.category, m.round_name, m.table_number ? `Meja ${m.table_number}` : null].filter(Boolean).join(" • ")}
            </p>
          </CardHeader>
          <CardContent className="grid gap-6">
            {m.winner && (
              <div className="flex flex-col items-center gap-2 rounded-xl bg-primary/10 p-6 text-center">
                <Trophy className="h-10 w-10 text-warning" />
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Pemenang</div>
                <div className="font-display text-3xl font-bold uppercase text-primary">{m.winner}</div>
              </div>
            )}

            <div className="grid grid-cols-3 items-center text-center">
              <div>
                <div className="font-display text-xl font-bold uppercase">{m.player_left_name}</div>
                <div className="text-xs text-muted-foreground">{m.player_left_team}</div>
              </div>
              <div className="font-display text-5xl font-bold tabular-nums text-primary">
                {m.sets_left} : {m.sets_right}
              </div>
              <div>
                <div className="font-display text-xl font-bold uppercase">{m.player_right_name}</div>
                <div className="text-xs text-muted-foreground">{m.player_right_team}</div>
              </div>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2">Set</th>
                  <th className="py-2 text-center">{m.player_left_name}</th>
                  <th className="py-2 text-center">{m.player_right_name}</th>
                </tr>
              </thead>
              <tbody>
                {data.sets.map((s) => (
                  <tr key={s.id} className="border-b border-border/50 tabular-nums">
                    <td className="py-2">Set {s.set_number}</td>
                    <td className={`py-2 text-center ${s.winner === "left" ? "font-bold text-primary" : ""}`}>{s.score_left}</td>
                    <td className={`py-2 text-center ${s.winner === "right" ? "font-bold text-primary" : ""}`}>{s.score_right}</td>
                  </tr>
                ))}
                {data.sets.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-muted-foreground">
                      Belum ada set yang selesai.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <div className="text-xs text-muted-foreground">Mulai</div>
                <div>{m.started_at ? new Date(m.started_at).toLocaleString("id-ID") : "-"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Selesai</div>
                <div>{m.finished_at ? new Date(m.finished_at).toLocaleString("id-ID") : "-"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Durasi</div>
                <div>{duration}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Kode</div>
                <div className="font-display font-semibold tracking-widest">{m.match_code}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="no-print flex flex-wrap gap-3">
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Cetak / PDF
          </Button>
          <Button variant="outline" asChild>
            <Link to="/history">Kembali ke Riwayat</Link>
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
