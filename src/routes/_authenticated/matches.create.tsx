import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Copy, Gamepad2, MonitorPlay } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateMatchCode } from "@/lib/match-logic";
import { useSession } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/matches/create")({
  head: () => ({ meta: [{ title: "Buat Pertandingan — Digital Scoreboard Tenis Meja" }] }),
  component: CreateMatchPage,
});

interface FormState {
  tournament_name: string;
  organizer_name: string;
  venue: string;
  logo_url: string;
  category: string;
  round_name: string;
  table_number: string;
  player_left_name: string;
  player_left_team: string;
  player_left_photo: string;
  player_right_name: string;
  player_right_team: string;
  player_right_photo: string;
  best_of: string;
  target_score: string;
  initial_server: string;
  timer_mode: string;
  timer_duration: string;
  theme_id: string;
  auto_rules: boolean;
  notes: string;
}

const INITIAL: FormState = {
  tournament_name: "",
  organizer_name: "",
  venue: "",
  logo_url: "",
  category: "",
  round_name: "",
  table_number: "",
  player_left_name: "",
  player_left_team: "",
  player_left_photo: "",
  player_right_name: "",
  player_right_team: "",
  player_right_photo: "",
  best_of: "5",
  target_score: "11",
  initial_server: "left",
  timer_mode: "stopwatch",
  timer_duration: "10",
  theme_id: "",
  auto_rules: true,
  notes: "",
};

function CreateMatchPage() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ id: string; code: string } | null>(null);
  const { user } = useSession();

  const { data: themes = [] } = useQuery({
    queryKey: ["themes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("themes").select("id, theme_name").order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      let tournamentId: string | null = null;
      if (form.tournament_name.trim()) {
        const { data: t, error: tErr } = await supabase
          .from("tournaments")
          .insert({
            tournament_name: form.tournament_name.trim(),
            organizer_name: form.organizer_name.trim() || null,
            venue: form.venue.trim() || null,
            logo_url: form.logo_url.trim() || null,
            theme_id: form.theme_id || null,
            created_by: user.id,
          })
          .select("id")
          .single();
        if (tErr) throw tErr;
        tournamentId = t.id;
      }

      const code = generateMatchCode();
      const { data: m, error } = await supabase
        .from("matches")
        .insert({
          tournament_id: tournamentId,
          match_code: code,
          category: form.category.trim() || null,
          round_name: form.round_name.trim() || null,
          table_number: form.table_number.trim() || null,
          player_left_name: form.player_left_name.trim(),
          player_left_team: form.player_left_team.trim() || null,
          player_left_photo: form.player_left_photo.trim() || null,
          player_right_name: form.player_right_name.trim(),
          player_right_team: form.player_right_team.trim() || null,
          player_right_photo: form.player_right_photo.trim() || null,
          best_of: parseInt(form.best_of, 10),
          target_score: Math.max(1, parseInt(form.target_score, 10) || 11),
          serving_player: form.initial_server,
          initial_server: form.initial_server,
          auto_rules: form.auto_rules,
          timer_mode: form.timer_mode,
          timer_duration: form.timer_mode === "countdown" ? Math.max(1, parseInt(form.timer_duration, 10) || 10) * 60 : null,
          theme_id: form.theme_id || null,
          notes: form.notes.trim() || null,
          operator_id: user.id,
          created_by: user.id,
        })
        .select("id, match_code")
        .single();
      if (error) throw error;
      setCreated({ id: m.id, code: m.match_code });
      toast.success("Pertandingan berhasil dibuat!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat pertandingan");
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const controllerUrl = `${origin}/controller/${created.code}`;
    const displayUrl = `${origin}/display/${created.code}`;
    const copy = (text: string, label: string) => {
      navigator.clipboard.writeText(text);
      toast.success(`${label} disalin`);
    };
    return (
      <AppLayout title="Pertandingan Dibuat">
        <div className="mx-auto grid max-w-2xl gap-4">
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Kode Pertandingan</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6">
              <button
                onClick={() => copy(created.code, "Kode")}
                className="flex items-center gap-3 rounded-xl bg-primary px-8 py-4 font-display text-4xl font-bold tracking-widest text-primary-foreground hover:bg-primary/90"
              >
                {created.code} <Copy className="h-6 w-6 opacity-70" />
              </button>

              <div className="grid w-full gap-6 sm:grid-cols-2">
                <div className="flex flex-col items-center gap-3 rounded-lg border border-border p-4">
                  <span className="font-display text-sm font-bold uppercase text-muted-foreground">Controller</span>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&bgcolor=ffffff&data=${encodeURIComponent(controllerUrl)}`}
                    alt="QR Controller"
                    className="h-40 w-40 rounded-md bg-white p-1"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => copy(controllerUrl, "Link controller")}>
                      <Copy className="h-4 w-4" /> Salin Link
                    </Button>
                    <Button size="sm" asChild>
                      <Link to="/controller/$matchCode" params={{ matchCode: created.code }}>
                        <Gamepad2 className="h-4 w-4" /> Buka
                      </Link>
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-3 rounded-lg border border-border p-4">
                  <span className="font-display text-sm font-bold uppercase text-muted-foreground">Display</span>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&bgcolor=ffffff&data=${encodeURIComponent(displayUrl)}`}
                    alt="QR Display"
                    className="h-40 w-40 rounded-md bg-white p-1"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => copy(displayUrl, "Link display")}>
                      <Copy className="h-4 w-4" /> Salin Link
                    </Button>
                    <Button size="sm" variant="accent" asChild>
                      <Link to="/display/$matchCode" params={{ matchCode: created.code }} target="_blank">
                        <MonitorPlay className="h-4 w-4" /> Buka
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-center">
            <Button variant="ghost" onClick={() => setCreated(null)}>
              + Buat pertandingan lain
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Buat Pertandingan">
      <form onSubmit={submit} className="mx-auto grid max-w-3xl gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Info Perlombaan</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Nama Perlombaan</Label>
              <Input value={form.tournament_name} onChange={set("tournament_name")} placeholder="Kejuaraan Tenis Meja 2026" />
            </div>
            <div className="grid gap-1.5">
              <Label>Penyelenggara</Label>
              <Input value={form.organizer_name} onChange={set("organizer_name")} />
            </div>
            <div className="grid gap-1.5">
              <Label>Venue</Label>
              <Input value={form.venue} onChange={set("venue")} placeholder="GOR Serbaguna" />
            </div>
            <div className="grid gap-1.5">
              <Label>URL Logo Penyelenggara</Label>
              <Input value={form.logo_url} onChange={set("logo_url")} placeholder="https://…" />
            </div>
            <div className="grid gap-1.5">
              <Label>Kategori</Label>
              <Input value={form.category} onChange={set("category")} placeholder="Tunggal Putra" />
            </div>
            <div className="grid gap-1.5">
              <Label>Babak</Label>
              <Input value={form.round_name} onChange={set("round_name")} placeholder="Semifinal" />
            </div>
            <div className="grid gap-1.5">
              <Label>Nomor Meja</Label>
              <Input value={form.table_number} onChange={set("table_number")} placeholder="1" />
            </div>
            <div className="grid gap-1.5">
              <Label>Tema Scoreboard</Label>
              <Select value={form.theme_id} onChange={set("theme_id")}>
                <option value="">Default (Modern Sport)</option>
                {themes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.theme_name}
                  </option>
                ))}
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-5 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-primary">Pemain Kiri</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-1.5">
                <Label>Nama Pemain *</Label>
                <Input value={form.player_left_name} onChange={set("player_left_name")} required />
              </div>
              <div className="grid gap-1.5">
                <Label>Tim / Instansi</Label>
                <Input value={form.player_left_team} onChange={set("player_left_team")} />
              </div>
              <div className="grid gap-1.5">
                <Label>URL Foto (opsional)</Label>
                <Input value={form.player_left_photo} onChange={set("player_left_photo")} placeholder="https://…" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-accent">Pemain Kanan</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-1.5">
                <Label>Nama Pemain *</Label>
                <Input value={form.player_right_name} onChange={set("player_right_name")} required />
              </div>
              <div className="grid gap-1.5">
                <Label>Tim / Instansi</Label>
                <Input value={form.player_right_team} onChange={set("player_right_team")} />
              </div>
              <div className="grid gap-1.5">
                <Label>URL Foto (opsional)</Label>
                <Input value={form.player_right_photo} onChange={set("player_right_photo")} placeholder="https://…" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Format Pertandingan</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="grid gap-1.5">
              <Label>Format</Label>
              <Select value={form.best_of} onChange={set("best_of")}>
                <option value="3">Best of 3</option>
                <option value="5">Best of 5</option>
                <option value="7">Best of 7</option>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Target Poin per Set</Label>
              <Input type="number" min={1} value={form.target_score} onChange={set("target_score")} />
            </div>
            <div className="grid gap-1.5">
              <Label>Servis Pertama</Label>
              <Select value={form.initial_server} onChange={set("initial_server")}>
                <option value="left">Pemain Kiri</option>
                <option value="right">Pemain Kanan</option>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Mode Timer</Label>
              <Select value={form.timer_mode} onChange={set("timer_mode")}>
                <option value="stopwatch">Stopwatch</option>
                <option value="countdown">Countdown</option>
                <option value="none">Tanpa Timer</option>
              </Select>
            </div>
            {form.timer_mode === "countdown" && (
              <div className="grid gap-1.5">
                <Label>Durasi (menit)</Label>
                <Input type="number" min={1} value={form.timer_duration} onChange={set("timer_duration")} />
              </div>
            )}
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input
                type="checkbox"
                checked={form.auto_rules}
                onChange={(e) => setForm((f) => ({ ...f, auto_rules: e.target.checked }))}
                className="h-4 w-4 accent-[var(--primary)]"
              />
              Aturan otomatis (deuce, ganti servis, deteksi pemenang)
            </label>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Catatan Pertandingan</Label>
              <Textarea value={form.notes} onChange={set("notes")} rows={2} />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" size="lg" disabled={busy}>
          {busy ? "Menyimpan…" : "Simpan & Buat Kode Pertandingan"}
        </Button>
      </form>
    </AppLayout>
  );
}
