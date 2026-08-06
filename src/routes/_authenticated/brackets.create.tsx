import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Shuffle, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/hooks/useAuth";
import {
  DUMMY_NAMES,
  PARTICIPANT_PRESETS,
  assignParticipants,
  bracketSize,
  generateSingleElimination,
} from "@/lib/bracket-logic";

export const Route = createFileRoute("/_authenticated/brackets/create")({
  head: () => ({ meta: [{ title: "Buat Bagan — Digital Scoreboard Tenis Meja" }] }),
  component: CreateBracketPage,
});

interface Participant {
  name: string;
  team: string;
  seed?: number;
}

function CreateBracketPage() {
  const nav = useNavigate();
  const { user } = useSession();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Tunggal Putra");
  const [bracketType, setBracketType] = useState("single_elimination");
  const [countPreset, setCountPreset] = useState("8");
  const [customCount, setCustomCount] = useState("8");
  const [scheduledDate, setScheduledDate] = useState("");
  const [location, setLocation] = useState("");
  const [tableCount, setTableCount] = useState("2");
  const [logoUrl, setLogoUrl] = useState("");
  const [backgroundUrl, setBackgroundUrl] = useState("");
  const [seedStrategy, setSeedStrategy] = useState<"manual" | "random" | "seeded">("random");
  const [operatorName, setOperatorName] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const participantCount = countPreset === "custom" ? Math.max(2, Number(customCount) || 2) : Number(countPreset);
  const size = bracketSize(participantCount);

  const [participants, setParticipants] = useState<Participant[]>(() =>
    Array.from({ length: 8 }, () => ({ name: "", team: "" })),
  );

  const addPeople = () => setParticipants((p) => [...p, { name: "", team: "" }]);
  const removePeople = (i: number) => setParticipants((p) => p.filter((_, idx) => idx !== i));
  const shufflePeople = () => setParticipants((p) => [...p].sort(() => Math.random() - 0.5));
  const resetPeople = () =>
    setParticipants(Array.from({ length: participantCount }, () => ({ name: "", team: "" })));
  const fillDummy = () => {
    const need = participantCount - participants.length;
    if (need <= 0) return;
    setParticipants((p) => [...p, ...Array.from({ length: need }, () => ({ name: "", team: "" }))]);
  };


  const submit = async () => {
    if (!user) return;
    if (!name.trim()) return toast.error("Nama bagan wajib diisi");
    const valid = participants.filter((p) => p.name.trim());
    if (valid.length < 2) return toast.error("Minimal 2 peserta");

    setSaving(true);
    try {
      // 1. Create bracket
      const { data: bracket, error: bErr } = await supabase
        .from("brackets")
        .insert({
          name: name.trim(),
          category,
          bracket_type: bracketType,
          participant_count: participantCount,
          scheduled_date: scheduledDate || null,
          location: location || null,
          table_count: tableCount ? Number(tableCount) : null,
          logo_url: logoUrl || null,
          background_url: backgroundUrl || null,
          operator_name: operatorName || null,
          created_by: user.id,
          status: "draft",
        })
        .select()
        .single();
      if (bErr || !bracket) throw bErr;

      // 2. Insert participants
      const partRows = valid.slice(0, participantCount).map((p, idx) => ({
        bracket_id: bracket.id,
        name: p.name.trim(),
        team: p.team || null,
        seed_number: p.seed ?? idx + 1,
        initial_position: idx,
      }));
      const { data: insertedParts, error: pErr } = await supabase.from("bracket_participants").insert(partRows).select();
      if (pErr || !insertedParts) throw pErr;

      // 3. Generate matches
      const gens = generateSingleElimination(participantCount);
      const slots = assignParticipants(insertedParts, size, seedStrategy);

      // Insert matches, keeping mapping match_number -> row for next_match_id linking
      const matchInsert = gens.map((g) => {
        let p1: string | null = null;
        let p2: string | null = null;
        if (g.round_number === 1) {
          const [i1, i2] = [g.position_in_round * 2, g.position_in_round * 2 + 1];
          p1 = slots[i1]?.id ?? null;
          p2 = slots[i2]?.id ?? null;
        }
        return {
          bracket_id: bracket.id,
          round_number: g.round_number,
          match_number: g.match_number,
          position_in_round: g.position_in_round,
          player_one_id: p1,
          player_two_id: p2,
          next_match_position: g.next_match_position,
          match_status: "not_started" as const,
        };
      });
      const { data: insertedMatches, error: mErr } = await supabase
        .from("bracket_matches")
        .insert(matchInsert)
        .select();
      if (mErr || !insertedMatches) throw mErr;

      // 4. Update next_match_id links
      const byNum = new Map(insertedMatches.map((m) => [m.match_number, m.id]));
      const updates = gens
        .filter((g) => g.next_match_number != null)
        .map((g) => {
          const rowId = byNum.get(g.match_number)!;
          const nextId = byNum.get(g.next_match_number!)!;
          return supabase.from("bracket_matches").update({ next_match_id: nextId }).eq("id", rowId);
        });
      await Promise.all(updates);

      // 5. Auto-advance BYEs (rounds where one slot empty)
      const byes = insertedMatches.filter(
        (m) => m.round_number === 1 && ((m.player_one_id && !m.player_two_id) || (!m.player_one_id && m.player_two_id)),
      );
      for (const b of byes) {
        const winner = b.player_one_id ?? b.player_two_id;
        if (!winner || !b.next_match_id) continue;
        await supabase.from("bracket_matches").update({ winner_id: winner, match_status: "finished" }).eq("id", b.id);
        const patch = b.next_match_position === "top" ? { player_one_id: winner } : { player_two_id: winner };
        await supabase.from("bracket_matches").update(patch).eq("id", b.next_match_id);
      }

      toast.success("Bagan berhasil dibuat");
      nav({ to: "/brackets/$id/edit", params: { id: bracket.id } });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Gagal membuat bagan";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const bracketTypes = useMemo(
    () => [
      { value: "single_elimination", label: "Single Elimination" },
      { value: "double_elimination", label: "Double Elimination (segera)" },
      { value: "round_robin", label: "Round Robin (segera)" },
      { value: "group_knockout", label: "Group → Knockout (segera)" },
    ],
    [],
  );

  return (
    <AppLayout title="Buat Bagan Turnamen">
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Informasi Bagan</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="name">Nama Turnamen</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Kejuaraan Tenis Meja 2026" />
              </div>
              <div>
                <Label>Kategori</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} />
              </div>
              <div>
                <Label>Jenis Bagan</Label>
                <Select value={bracketType} onChange={(e) => setBracketType(e.target.value)}>
                  {bracketTypes.map((b) => (
                    <option key={b.value} value={b.value} disabled={b.value !== "single_elimination"}>
                      {b.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Jumlah Peserta</Label>
                <Select value={countPreset} onChange={(e) => setCountPreset(e.target.value)}>
                  {PARTICIPANT_PRESETS.map((n) => (
                    <option key={n} value={n}>
                      {n} peserta
                    </option>
                  ))}
                  <option value="custom">Custom</option>
                </Select>
                {countPreset === "custom" && (
                  <Input
                    className="mt-2"
                    type="number"
                    min={2}
                    value={customCount}
                    onChange={(e) => setCustomCount(e.target.value)}
                  />
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Slot bagan: <span className="font-semibold">{size}</span> (BYE otomatis untuk slot kosong)
                </p>
              </div>
              <div>
                <Label>Penyusunan Peserta</Label>
                <Select value={seedStrategy} onChange={(e) => setSeedStrategy(e.target.value as typeof seedStrategy)}>
                  <option value="manual">Manual (urut input)</option>
                  <option value="random">Acak otomatis</option>
                  <option value="seeded">Berdasarkan seeding</option>
                </Select>
              </div>
              <div>
                <Label>Tanggal</Label>
                <Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
              </div>
              <div>
                <Label>Lokasi</Label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
              <div>
                <Label>Jumlah Meja</Label>
                <Input type="number" min={1} value={tableCount} onChange={(e) => setTableCount(e.target.value)} />
              </div>
              <div>
                <Label>Operator</Label>
                <Input value={operatorName} onChange={(e) => setOperatorName(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label>URL Logo Turnamen</Label>
                <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…" />
              </div>
              <div className="sm:col-span-2">
                <Label>URL Background Bagan</Label>
                <Input value={backgroundUrl} onChange={(e) => setBackgroundUrl(e.target.value)} placeholder="https://…" />
              </div>
              <div className="sm:col-span-2">
                <Label>Catatan</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Peserta ({participants.length}/{participantCount})</CardTitle>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={shufflePeople} title="Acak">
                  <Shuffle className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={fillDummy} title="Isi dummy">
                  <Wand2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={resetPeople} title="Reset">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {participants.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-6 text-right text-xs text-muted-foreground">{i + 1}.</span>
                  <Input
                    value={p.name}
                    onChange={(e) => setParticipants((arr) => arr.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))}
                    placeholder="Nama peserta"
                  />
                  <Input
                    value={p.team}
                    onChange={(e) => setParticipants((arr) => arr.map((x, idx) => (idx === i ? { ...x, team: e.target.value } : x)))}
                    placeholder="Tim"
                    className="w-28"
                  />
                  <Button variant="ghost" size="icon" onClick={() => removePeople(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="secondary" size="sm" onClick={addPeople}>
                <Plus className="mr-2 h-4 w-4" /> Tambah Peserta
              </Button>
            </CardContent>
          </Card>

          <div className="sticky bottom-0 flex gap-2 rounded-lg border border-border bg-card/80 p-3 backdrop-blur">
            <Button className="flex-1" onClick={submit} disabled={saving}>
              {saving ? "Menyimpan…" : "Buat Bagan"}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
