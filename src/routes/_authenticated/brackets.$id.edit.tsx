import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, ListPlus, MonitorPlay, Save, Trophy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BracketCanvas } from "@/components/BracketCanvas";
import { useBracket } from "@/hooks/useBracket";
import { roundCount, roundName, type BracketMatch } from "@/lib/bracket-logic";

export const Route = createFileRoute("/_authenticated/brackets/$id/edit")({
  ssr: false,
  head: () => ({ meta: [{ title: "Editor Bagan — Digital Scoreboard Tenis Meja" }] }),
  component: EditBracketPage,
});

function EditBracketPage() {
  const { id } = Route.useParams();
  const { bracket, participants, matches, loading, notFound } = useBracket(id);
  const [selected, setSelected] = useState<BracketMatch | null>(null);
  const [propagateOpen, setPropagateOpen] = useState<{ match: BracketMatch; winnerId: string } | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);


  if (loading) return <AppLayout title="Editor Bagan"><div className="text-muted-foreground">Memuat…</div></AppLayout>;
  if (notFound || !bracket) return <AppLayout title="Editor Bagan"><div>Bagan tidak ditemukan.</div></AppLayout>;

  const getP = (id: string | null | undefined) => (id ? participants.find((p) => p.id === id) ?? null : null);

  const updateBracket = async (patch: Partial<typeof bracket>) => {
    const { error } = await supabase.from("brackets").update(patch).eq("id", bracket.id);
    if (error) toast.error(error.message);
  };

  const setWinner = async (match: BracketMatch, winnerId: string) => {
    // Update score/winner + propagate to next match
    await supabase
      .from("bracket_matches")
      .update({ winner_id: winnerId, match_status: "finished" })
      .eq("id", match.id);
    if (match.next_match_id) {
      const patch = match.next_match_position === "top" ? { player_one_id: winnerId } : { player_two_id: winnerId };
      await supabase.from("bracket_matches").update(patch).eq("id", match.next_match_id);
      // keep the linked scoreboard match in sync
      const next = matches.find((m) => m.id === match.next_match_id);
      const w = getP(winnerId);
      if (next?.scoreboard_match_id && w) {
        const sbPatch =
          match.next_match_position === "top"
            ? { player_left_name: w.name, player_left_team: w.team }
            : { player_right_name: w.name, player_right_team: w.team };
        await supabase.from("matches").update(sbPatch).eq("id", next.scoreboard_match_id);
      }
    }

    setPropagateOpen(null);
    setSelected(null);
    toast.success("Pemenang tersimpan & diteruskan ke babak berikutnya");
  };

  const updateMatch = async (id: string, patch: Partial<BracketMatch>) => {
    const { error } = await supabase.from("bracket_matches").update(patch).eq("id", id);
    if (error) toast.error(error.message);
  };

  const openScoreboard = async (m: BracketMatch) => {
    // Create a scoreboard match or open existing
    if (m.scoreboard_match_id) {
      window.open(`/controller/${m.scoreboard_match_id}`, "_blank");
      return;
    }
    const p1 = getP(m.player_one_id);
    const p2 = getP(m.player_two_id);
    if (!p1 || !p2) return toast.error("Peserta belum lengkap");
    const code = "BR-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const { data: newMatch, error } = await supabase
      .from("matches")
      .insert({
        match_code: code,
        player_left_name: p1.name,
        player_left_team: p1.team,
        player_right_name: p2.name,
        player_right_team: p2.team,
        target_score: 11,
        best_of: 5,
        table_number: m.table_number ? String(m.table_number) : null,
        created_by: user.user.id,
      })
      .select()
      .single();
    if (error || !newMatch) return toast.error(error?.message ?? "Gagal");
    await updateMatch(m.id, { scoreboard_match_id: newMatch.id, match_status: "in_progress" });
    window.open(`/controller/${newMatch.match_code}`, "_blank");
  };

  const createAllMatches = async () => {
    const pending = matches.filter((m) => !m.scoreboard_match_id);
    if (pending.length === 0) return toast.info("Semua pertandingan sudah terhubung ke scoreboard");
    setBulkLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const total = matches.length;
      const rows = pending.map((m) => {
        const p1 = getP(m.player_one_id);
        const p2 = getP(m.player_two_id);
        return {
          match_code: `BR-${bracket.name.slice(0, 3).toUpperCase().replace(/\s/g, "")}-${String(m.match_number).padStart(2, "0")}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
          category: bracket.category,
          round_name: roundName(m.round_number, roundCount(bracket.participant_count)),
          player_left_name: p1?.name ?? "TBD",
          player_left_team: p1?.team ?? null,
          player_right_name: p2?.name ?? "TBD",
          player_right_team: p2?.team ?? null,
          table_number: m.table_number ? String(m.table_number) : null,
          target_score: 11,
          best_of: 5,
          created_by: user.user.id,
        };
      });
      const { data: created, error } = await supabase.from("matches").insert(rows).select();
      if (error || !created) throw error ?? new Error("Gagal membuat pertandingan");
      await Promise.all(
        created.map((row, i) =>
          supabase.from("bracket_matches").update({ scoreboard_match_id: row.id }).eq("id", pending[i].id),
        ),
      );
      await supabase.from("brackets").update({ status: "active" }).eq("id", bracket.id);
      toast.success(`${created.length} pertandingan dibuat & terhubung ke bagan (total ${total} sampai final)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membuat pertandingan");
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <AppLayout title={`Editor: ${bracket.name}`}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => void createAllMatches()} disabled={bulkLoading}>
          <ListPlus className="mr-2 h-4 w-4" />
          {bulkLoading ? "Membuat…" : "Buat Semua Pertandingan"}
        </Button>
        <Button variant="secondary" size="sm" asChild>
          <Link to="/brackets/$id/preview" params={{ id: bracket.id }}>
            <Eye className="mr-2 h-4 w-4" /> Preview
          </Link>
        </Button>
        <Button variant="secondary" size="sm" asChild>
          <Link to="/brackets/$id/display" params={{ id: bracket.id }}>
            <MonitorPlay className="mr-2 h-4 w-4" /> Display
          </Link>
        </Button>
      </div>


      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <Card className="h-[70vh] overflow-hidden p-0">
          <BracketCanvas
            bracket={bracket}
            participants={participants}
            matches={matches}
            animate={false}
            onMatchClick={setSelected}
            activeMatchId={selected?.id}
          />
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tampilan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <label className="flex items-center justify-between">
                <span>Tampilkan skor</span>
                <input type="checkbox" checked={bracket.show_scores} onChange={(e) => void updateBracket({ show_scores: e.target.checked })} />
              </label>
              <label className="flex items-center justify-between">
                <span>Tampilkan foto</span>
                <input type="checkbox" checked={bracket.show_photos} onChange={(e) => void updateBracket({ show_photos: e.target.checked })} />
              </label>
              <div>
                <Label>Ketebalan garis: {bracket.line_thickness}</Label>
                <input
                  type="range"
                  min={1}
                  max={6}
                  value={bracket.line_thickness}
                  onChange={(e) => void updateBracket({ line_thickness: Number(e.target.value) })}
                  className="w-full"
                />
              </div>
              <div>
                <Label>Jarak antar babak: {bracket.round_spacing}px</Label>
                <input
                  type="range"
                  min={60}
                  max={200}
                  value={bracket.round_spacing}
                  onChange={(e) => void updateBracket({ round_spacing: Number(e.target.value) })}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>

          {selected && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pertandingan #{selected.match_number}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid gap-2">
                  <MatchPlayerButton
                    label={getP(selected.player_one_id)?.name ?? "TBD"}
                    isWinner={selected.winner_id === selected.player_one_id}
                    onWin={() => selected.player_one_id && setPropagateOpen({ match: selected, winnerId: selected.player_one_id })}
                    disabled={!selected.player_one_id}
                  />
                  <MatchPlayerButton
                    label={getP(selected.player_two_id)?.name ?? "TBD"}
                    isWinner={selected.winner_id === selected.player_two_id}
                    onWin={() => selected.player_two_id && setPropagateOpen({ match: selected, winnerId: selected.player_two_id })}
                    disabled={!selected.player_two_id}
                  />
                </div>
                <div className="grid gap-2 rounded-md border border-border/60 p-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nama & Tim</p>
                  {[selected.player_one_id, selected.player_two_id].map((pid, i) => {
                    const p = getP(pid);
                    if (!p) return null;
                    return (
                      <div key={p.id} className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>{i === 0 ? "Pemain A" : "Pemain B"}</Label>
                          <Input
                            defaultValue={p.name}
                            onBlur={(e) => void updateParticipant(p.id, { name: e.target.value.trim() || p.name })}
                          />
                        </div>
                        <div>
                          <Label>Tim</Label>
                          <Input
                            defaultValue={p.team ?? ""}
                            onBlur={(e) => void updateParticipant(p.id, { team: e.target.value.trim() || null })}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Skor A</Label>
                    <Input
                      type="number"
                      value={selected.score_player_one ?? ""}
                      onChange={(e) => void updateMatch(selected.id, { score_player_one: e.target.value ? Number(e.target.value) : null })}
                    />
                  </div>
                  <div>
                    <Label>Skor B</Label>
                    <Input
                      type="number"
                      value={selected.score_player_two ?? ""}
                      onChange={(e) => void updateMatch(selected.id, { score_player_two: e.target.value ? Number(e.target.value) : null })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Meja</Label>
                    <Input
                      type="number"
                      value={selected.table_number ?? ""}
                      onChange={(e) => void updateMatch(selected.id, { table_number: e.target.value ? Number(e.target.value) : null })}
                    />
                  </div>
                  <div>
                    <Label>Jadwal</Label>
                    <Input
                      type="datetime-local"
                      value={selected.scheduled_at?.slice(0, 16) ?? ""}
                      onChange={(e) =>
                        void updateMatch(selected.id, { scheduled_at: e.target.value ? new Date(e.target.value).toISOString() : null })
                      }
                    />
                  </div>
                </div>
                <Button className="w-full" onClick={() => void openScoreboard(selected)}>
                  <Trophy className="mr-2 h-4 w-4" />
                  {selected.scoreboard_match_id ? "Buka Scoreboard" : "Buat Scoreboard"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={!!propagateOpen} onOpenChange={(o) => !o && setPropagateOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Pemenang</DialogTitle>
          </DialogHeader>
          {propagateOpen && (
            <p className="text-sm text-muted-foreground">
              Hasil pertandingan akan memasukkan{" "}
              <span className="font-semibold text-foreground">{getP(propagateOpen.winnerId)?.name}</span> ke babak berikutnya. Lanjutkan?
            </p>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPropagateOpen(null)}>Batalkan</Button>
            <Button onClick={() => propagateOpen && void setWinner(propagateOpen.match, propagateOpen.winnerId)}>
              <Save className="mr-2 h-4 w-4" /> Konfirmasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function MatchPlayerButton({
  label,
  isWinner,
  onWin,
  disabled,
}: {
  label: string;
  isWinner: boolean;
  onWin: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      variant={isWinner ? "default" : "secondary"}
      className="justify-between"
      onClick={onWin}
      disabled={disabled}
    >
      <span className="truncate">{label}</span>
      {isWinner && <Trophy className="h-4 w-4" />}
    </Button>
  );
}
