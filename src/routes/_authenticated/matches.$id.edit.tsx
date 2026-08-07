import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MatchRow } from "@/lib/match-logic";
import { syncMatchToBracket } from "@/lib/bracket-sync";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/matches/$id/edit")({
  head: () => ({ meta: [{ title: "Edit Pertandingan — Digital Scoreboard Tenis Meja" }] }),
  component: EditMatchPage,
});

function EditMatchPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: themes = [] } = useQuery({
    queryKey: ["themes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("themes").select("id, theme_name").order("created_at");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    supabase
      .from("matches")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => setMatch(data));
  }, [id]);

  if (!match) {
    return (
      <AppLayout title="Edit Pertandingan">
        <p className="text-sm text-muted-foreground">Memuat…</p>
      </AppLayout>
    );
  }

  const set = (key: keyof MatchRow) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setMatch((m) => (m ? { ...m, [key]: e.target.value } : m));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase
      .from("matches")
      .update({
        category: match.category,
        round_name: match.round_name,
        table_number: match.table_number,
        player_left_name: match.player_left_name,
        player_left_team: match.player_left_team,
        player_left_photo: match.player_left_photo,
        player_right_name: match.player_right_name,
        player_right_team: match.player_right_team,
        player_right_photo: match.player_right_photo,
        best_of: Number(match.best_of),
        target_score: Math.max(1, Number(match.target_score) || 11),
        theme_id: match.theme_id || null,
        timer_mode: match.timer_mode,
        notes: match.notes,
      })
      .eq("id", match.id);
    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }
    // jika pertandingan ini terhubung ke bagan, perbarui peserta bagan juga
    const linked = await syncMatchToBracket(match.id, {
      player_left_name: match.player_left_name,
      player_left_team: match.player_left_team,
      player_left_photo: match.player_left_photo,
      player_right_name: match.player_right_name,
      player_right_team: match.player_right_team,
      player_right_photo: match.player_right_photo,
    });
    setBusy(false);
    toast.success(linked ? "Pertandingan diperbarui & bagan tersinkron" : "Pertandingan diperbarui");
    navigate({ to: "/matches" });
  };

  return (
    <AppLayout title="Edit Pertandingan">
      <form onSubmit={save} className="mx-auto grid max-w-3xl gap-5">
        <Card>
          <CardHeader>
            <CardTitle>
              {match.player_left_name} vs {match.player_right_name} — {match.match_code}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Nama Pemain Kiri</Label>
              <Input value={match.player_left_name} onChange={set("player_left_name")} required />
            </div>
            <div className="grid gap-1.5">
              <Label>Nama Pemain Kanan</Label>
              <Input value={match.player_right_name} onChange={set("player_right_name")} required />
            </div>
            <div className="grid gap-1.5">
              <Label>Tim Kiri</Label>
              <Input value={match.player_left_team ?? ""} onChange={set("player_left_team")} />
            </div>
            <div className="grid gap-1.5">
              <Label>Tim Kanan</Label>
              <Input value={match.player_right_team ?? ""} onChange={set("player_right_team")} />
            </div>
            <div className="grid gap-1.5">
              <Label>Kategori</Label>
              <Input value={match.category ?? ""} onChange={set("category")} />
            </div>
            <div className="grid gap-1.5">
              <Label>Babak</Label>
              <Input value={match.round_name ?? ""} onChange={set("round_name")} />
            </div>
            <div className="grid gap-1.5">
              <Label>Nomor Meja</Label>
              <Input value={match.table_number ?? ""} onChange={set("table_number")} />
            </div>
            <div className="grid gap-1.5">
              <Label>Format</Label>
              <Select value={String(match.best_of)} onChange={set("best_of")}>
                <option value="3">Best of 3</option>
                <option value="5">Best of 5</option>
                <option value="7">Best of 7</option>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Target Poin</Label>
              <Input type="number" min={1} value={match.target_score} onChange={set("target_score")} />
            </div>
            <div className="grid gap-1.5">
              <Label>Tema</Label>
              <Select value={match.theme_id ?? ""} onChange={set("theme_id")}>
                <option value="">Default</option>
                {themes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.theme_name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Catatan</Label>
              <Textarea value={match.notes ?? ""} onChange={set("notes")} rows={2} />
            </div>
          </CardContent>
        </Card>
        <div className="flex gap-3">
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? "Menyimpan…" : "Simpan Perubahan"}
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={() => navigate({ to: "/matches" })}>
            Batal
          </Button>
        </div>
      </form>
    </AppLayout>
  );
}
