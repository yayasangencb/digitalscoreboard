import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/MatchDialogs";
import type { MatchWithTournament } from "@/components/MatchList";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({ meta: [{ title: "Riwayat Pertandingan — Digital Scoreboard Tenis Meja" }] }),
  component: HistoryPage,
});

function HistoryPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [roundFilter, setRoundFilter] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ["matches", "history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("*, tournaments(tournament_name)")
        .eq("match_status", "finished")
        .order("finished_at", { ascending: false });
      if (error) throw error;
      return data as MatchWithTournament[];
    },
  });

  const rounds = useMemo(() => [...new Set(matches.map((m) => m.round_name).filter(Boolean))] as string[], [matches]);

  const filtered = matches.filter((m) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      m.player_left_name.toLowerCase().includes(q) ||
      m.player_right_name.toLowerCase().includes(q) ||
      (m.tournaments?.tournament_name ?? "").toLowerCase().includes(q) ||
      m.match_code.toLowerCase().includes(q) ||
      (m.winner ?? "").toLowerCase().includes(q);
    const matchesDate = !dateFilter || (m.finished_at ?? m.created_at).startsWith(dateFilter);
    const matchesRound = !roundFilter || m.round_name === roundFilter;
    return matchesSearch && matchesDate && matchesRound;
  });

  const exportCsv = () => {
    const header = ["Tanggal", "Perlombaan", "Babak", "Meja", "Pemain Kiri", "Pemain Kanan", "Set", "Pemenang", "Kode"];
    const rows = filtered.map((m) => [
      m.finished_at ? new Date(m.finished_at).toLocaleString("id-ID") : "",
      m.tournaments?.tournament_name ?? "",
      m.round_name ?? "",
      m.table_number ?? "",
      m.player_left_name,
      m.player_right_name,
      `${m.sets_left}-${m.sets_right}`,
      m.winner ?? "",
      m.match_code,
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "riwayat-pertandingan.csv";
    a.click();
    toast.success("Riwayat diekspor (CSV — dapat dibuka di Excel)");
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("matches").delete().eq("id", deleteId);
    if (error) toast.error(error.message);
    else {
      toast.success("Riwayat dihapus");
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    }
    setDeleteId(null);
  };

  return (
    <AppLayout title="Riwayat Pertandingan">
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-52 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari pemain, perlombaan, kode…"
              className="pl-9"
            />
          </div>
          <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-40" />
          <Select value={roundFilter} onChange={(e) => setRoundFilter(e.target.value)} className="w-40">
            <option value="">Semua Babak</option>
            {rounds.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
          <Button variant="outline" onClick={exportCsv}>
            <Download className="h-4 w-4" /> Export Excel
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Memuat…</p>
        ) : filtered.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Belum ada pertandingan selesai.
          </p>
        ) : (
          <div className="grid gap-3">
            {filtered.map((m) => (
              <Card key={m.id}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-display font-semibold uppercase">
                        {m.player_left_name} vs {m.player_right_name}
                      </span>
                      <span className="font-display font-bold tabular-nums text-primary">
                        {m.sets_left} : {m.sets_right}
                      </span>
                      {m.winner && <Badge variant="success">🏆 {m.winner}</Badge>}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {[
                        m.tournaments?.tournament_name,
                        m.round_name,
                        m.finished_at ? new Date(m.finished_at).toLocaleString("id-ID") : null,
                        m.match_code,
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link to="/matches/$id/result" params={{ id: m.id }}>
                        <FileText className="h-4 w-4" /> Detail
                      </Link>
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteId(m.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Hapus Riwayat?"
        description="Data pertandingan ini akan dihapus permanen."
        confirmLabel="Ya, Hapus"
        destructive
        onConfirm={handleDelete}
      />
    </AppLayout>
  );
}
