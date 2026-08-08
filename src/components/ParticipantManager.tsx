import { useState } from "react";
import { Check, Plus, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { BracketMatch, BracketParticipant } from "@/lib/bracket-logic";
import { syncParticipantToMatches } from "@/lib/bracket-sync";

interface Props {
  bracketId: string;
  participants: BracketParticipant[];
  matches: BracketMatch[];
  onChanged: () => void;
}

const STATUSES = [
  { value: "active", label: "Aktif" },
  { value: "eliminated", label: "Tersingkir" },
  { value: "withdrawn", label: "Mengundurkan diri" },
];

export function ParticipantManager({ bracketId, participants, matches, onChanged }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<BracketParticipant>>({});
  const [adding, setAdding] = useState(false);
  const [newP, setNewP] = useState({ name: "", team: "", seed_number: "" });
  const [confirmDelete, setConfirmDelete] = useState<BracketParticipant | null>(null);
  const [busy, setBusy] = useState(false);

  const startEdit = (p: BracketParticipant) => {
    setEditing(p.id);
    setDraft({ name: p.name, team: p.team, seed_number: p.seed_number, photo_url: p.photo_url, status: p.status });
  };

  const saveEdit = async (p: BracketParticipant) => {
    if (!draft.name?.trim()) return toast.error("Nama tidak boleh kosong");
    setBusy(true);
    const { error } = await supabase
      .from("bracket_participants")
      .update({
        name: draft.name.trim(),
        team: draft.team?.trim() || null,
        seed_number: draft.seed_number ? Number(draft.seed_number) : null,
        photo_url: draft.photo_url || null,
        status: draft.status ?? "active",
      })
      .eq("id", p.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    await syncParticipantToMatches(p.id);
    setEditing(null);
    onChanged();
    toast.success("Peserta diperbarui & pertandingan tersinkron");
  };

  const addParticipant = async () => {
    if (!newP.name.trim()) return toast.error("Nama peserta wajib diisi");
    setBusy(true);
    try {
      const nextPos = participants.reduce((max, p) => Math.max(max, p.initial_position), -1) + 1;
      const { data: created, error } = await supabase
        .from("bracket_participants")
        .insert({
          bracket_id: bracketId,
          name: newP.name.trim(),
          team: newP.team.trim() || null,
          seed_number: newP.seed_number ? Number(newP.seed_number) : nextPos + 1,
          initial_position: nextPos,
        })
        .select()
        .single();
      if (error || !created) throw error ?? new Error("Gagal menambah peserta");

      // tempatkan pada slot kosong pertama di babak 1
      const slot = matches
        .filter((m) => m.round_number === 1 && (!m.player_one_id || !m.player_two_id))
        .sort((a, b) => a.match_number - b.match_number)[0];
      if (slot) {
        const side = !slot.player_one_id ? "one" : "two";
        await supabase
          .from("bracket_matches")
          .update(side === "one" ? { player_one_id: created.id } : { player_two_id: created.id })
          .eq("id", slot.id);
        if (slot.scoreboard_match_id) {
          await supabase
            .from("matches")
            .update(
              side === "one"
                ? { player_left_name: created.name, player_left_team: created.team }
                : { player_right_name: created.name, player_right_team: created.team },
            )
            .eq("id", slot.scoreboard_match_id);
        }
      }
      setNewP({ name: "", team: "", seed_number: "" });
      setAdding(false);
      onChanged();
      toast.success(slot ? "Peserta ditambahkan ke slot kosong babak 1" : "Peserta ditambahkan (belum ada slot kosong)");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menambah peserta");
    } finally {
      setBusy(false);
    }
  };

  const removeParticipant = async (p: BracketParticipant) => {
    setBusy(true);
    try {
      const related = matches.filter(
        (m) => m.player_one_id === p.id || m.player_two_id === p.id || m.winner_id === p.id,
      );
      for (const m of related) {
        const patch: Partial<BracketMatch> = {};
        if (m.player_one_id === p.id) patch.player_one_id = null;
        if (m.player_two_id === p.id) patch.player_two_id = null;
        if (m.winner_id === p.id) {
          patch.winner_id = null;
          patch.match_status = "not_started";
        }
        await supabase.from("bracket_matches").update(patch).eq("id", m.id);
        if (m.scoreboard_match_id) {
          const sb: Record<string, string | null> = {};
          if (m.player_one_id === p.id) {
            sb.player_left_name = "TBD";
            sb.player_left_team = null;
          }
          if (m.player_two_id === p.id) {
            sb.player_right_name = "TBD";
            sb.player_right_team = null;
          }
          if (Object.keys(sb).length) await supabase.from("matches").update(sb).eq("id", m.scoreboard_match_id);
        }
      }
      const { error } = await supabase.from("bracket_participants").delete().eq("id", p.id);
      if (error) throw error;
      setConfirmDelete(null);
      onChanged();
      toast.success("Peserta dihapus & bagan diperbarui");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus peserta");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4" /> Peserta ({participants.length})
        </CardTitle>
        <Button size="sm" variant="secondary" onClick={() => setAdding((v) => !v)}>
          <Plus className="mr-1 h-4 w-4" /> Tambah
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {adding && (
          <div className="space-y-2 rounded-md border border-border/60 bg-muted/20 p-2">
            <Input placeholder="Nama peserta" value={newP.name} onChange={(e) => setNewP({ ...newP, name: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Tim" value={newP.team} onChange={(e) => setNewP({ ...newP, team: e.target.value })} />
              <Input
                placeholder="Seed"
                type="number"
                value={newP.seed_number}
                onChange={(e) => setNewP({ ...newP, seed_number: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" disabled={busy} onClick={() => void addParticipant()}>
                <Check className="mr-1 h-4 w-4" /> Simpan
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {participants.length === 0 && <p className="text-sm text-muted-foreground">Belum ada peserta.</p>}
          {participants.map((p, i) =>
            editing === p.id ? (
              <div key={p.id} className="space-y-2 rounded-md border border-primary/40 p-2">
                <div>
                  <Label>Nama</Label>
                  <Input value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Tim</Label>
                    <Input value={draft.team ?? ""} onChange={(e) => setDraft({ ...draft, team: e.target.value })} />
                  </div>
                  <div>
                    <Label>Seed</Label>
                    <Input
                      type="number"
                      value={draft.seed_number ?? ""}
                      onChange={(e) => setDraft({ ...draft, seed_number: e.target.value ? Number(e.target.value) : null })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Foto (URL)</Label>
                    <Input value={draft.photo_url ?? ""} onChange={(e) => setDraft({ ...draft, photo_url: e.target.value })} />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={draft.status ?? "active"} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
                      {STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" disabled={busy} onClick={() => void saveEdit(p)}>
                    <Check className="mr-1 h-4 w-4" /> Simpan
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div key={p.id} className="flex items-center gap-2 rounded-md border border-border/60 p-2 text-sm">
                <span className="w-5 text-right text-xs text-muted-foreground">{i + 1}.</span>
                <button className="min-w-0 flex-1 text-left" onClick={() => startEdit(p)}>
                  <span className="block truncate font-semibold">{p.name}</span>
                  <span className="block truncate text-xs uppercase tracking-wider text-muted-foreground">
                    {p.team || "—"}
                    {p.seed_number ? ` · seed ${p.seed_number}` : ""}
                    {p.status !== "active" ? ` · ${p.status}` : ""}
                  </span>
                </button>
                <Button size="icon" variant="ghost" onClick={() => setConfirmDelete(p)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ),
          )}
        </div>
      </CardContent>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Peserta</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{confirmDelete?.name}</span> akan dihapus dari bagan. Slot pada
            pertandingan terkait dikosongkan (menjadi TBD) dan scoreboard yang terhubung ikut diperbarui.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              Batalkan
            </Button>
            <Button disabled={busy} onClick={() => confirmDelete && void removeParticipant(confirmDelete)}>
              <Trash2 className="mr-2 h-4 w-4" /> Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
