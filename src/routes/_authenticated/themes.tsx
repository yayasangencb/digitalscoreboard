import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scoreboard } from "@/components/Scoreboard";
import { useSession } from "@/hooks/useAuth";
import type { MatchRow, ThemeRow } from "@/lib/match-logic";

export const Route = createFileRoute("/_authenticated/themes")({
  head: () => ({ meta: [{ title: "Tema Scoreboard — Digital Scoreboard Tenis Meja" }] }),
  component: ThemesPage,
});

const PREVIEW_MATCH = {
  id: "preview",
  match_code: "TM-DEMO01",
  player_left_name: "Budi Santoso",
  player_left_team: "PTM Garuda",
  player_left_photo: null,
  player_right_name: "Andi Wijaya",
  player_right_team: "PTM Rajawali",
  player_right_photo: null,
  score_left: 10,
  score_right: 8,
  sets_left: 1,
  sets_right: 1,
  best_of: 5,
  target_score: 11,
  serving_player: "left",
  match_status: "in_progress",
  category: "Tunggal Putra",
  round_name: "Final",
  table_number: "1",
  timer_mode: "stopwatch",
  timer_elapsed: 754,
  timer_started_at: null,
  winner: null,
} as unknown as MatchRow;

const COLOR_FIELDS: { key: keyof ThemeRow; label: string }[] = [
  { key: "primary_color", label: "Warna Utama" },
  { key: "secondary_color", label: "Warna Sekunder (Background)" },
  { key: "accent_color", label: "Warna Aksen" },
  { key: "text_color", label: "Warna Teks" },
  { key: "left_player_color", label: "Warna Pemain Kiri" },
  { key: "right_player_color", label: "Warna Pemain Kanan" },
];

function ThemesPage() {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const [editing, setEditing] = useState<ThemeRow | null>(null);

  const { data: themes = [] } = useQuery({
    queryKey: ["themes", "full"],
    queryFn: async () => {
      const { data, error } = await supabase.from("themes").select("*").order("created_at");
      if (error) throw error;
      return data as ThemeRow[];
    },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["themes"] });

  const createTheme = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("themes")
      .insert({ theme_name: "Tema Custom Baru", created_by: user.id })
      .select("*")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    refresh();
    setEditing(data as ThemeRow);
  };

  const saveTheme = async () => {
    if (!editing) return;
    const { error } = await supabase
      .from("themes")
      .update({
        theme_name: editing.theme_name,
        primary_color: editing.primary_color,
        secondary_color: editing.secondary_color,
        accent_color: editing.accent_color,
        text_color: editing.text_color,
        left_player_color: editing.left_player_color,
        right_player_color: editing.right_player_color,
        background_url: editing.background_url,
        logo_url: editing.logo_url,
        font_family: editing.font_family,
        background_opacity: editing.background_opacity,
      })
      .eq("id", editing.id);
    if (error) {
      toast.error("Gagal menyimpan: " + error.message);
      return;
    }
    toast.success("Tema disimpan");
    refresh();
  };

  const deleteTheme = async (id: string) => {
    const { error } = await supabase.from("themes").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      if (editing?.id === id) setEditing(null);
      refresh();
      toast.success("Tema dihapus");
    }
  };

  return (
    <AppLayout title="Tema Scoreboard">
      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <div className="grid content-start gap-3">
          <Button onClick={createTheme}>
            <Plus className="h-4 w-4" /> Tema Custom Baru
          </Button>
          {themes.map((t) => (
            <Card
              key={t.id}
              className={`cursor-pointer transition-colors ${editing?.id === t.id ? "border-primary" : "hover:border-muted-foreground/40"}`}
              onClick={() => setEditing(t)}
            >
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="truncate font-medium">{t.theme_name}</div>
                  <div className="mt-1.5 flex gap-1">
                    {[t.primary_color, t.secondary_color, t.accent_color, t.left_player_color, t.right_player_color].map(
                      (c, i) => (
                        <span key={i} className="h-4 w-4 rounded-full border border-border" style={{ background: c }} />
                      ),
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {t.is_preset && <Badge variant="secondary">Preset</Badge>}
                  {!t.is_preset && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        void deleteTheme(t.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid content-start gap-4">
          {editing ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Edit Tema</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5 sm:col-span-2">
                    <Label>Nama Tema</Label>
                    <Input
                      value={editing.theme_name}
                      onChange={(e) => setEditing({ ...editing, theme_name: e.target.value })}
                    />
                  </div>
                  {COLOR_FIELDS.map((f) => (
                    <div key={f.key} className="grid gap-1.5">
                      <Label>{f.label}</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={(editing[f.key] as string) ?? "#000000"}
                          onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}
                          className="h-10 w-14 cursor-pointer rounded-md border border-border bg-background"
                        />
                        <Input
                          value={(editing[f.key] as string) ?? ""}
                          onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="grid gap-1.5">
                    <Label>URL Background / Poster</Label>
                    <Input
                      value={editing.background_url ?? ""}
                      onChange={(e) => setEditing({ ...editing, background_url: e.target.value || null })}
                      placeholder="https://…"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>URL Logo Acara</Label>
                    <Input
                      value={editing.logo_url ?? ""}
                      onChange={(e) => setEditing({ ...editing, logo_url: e.target.value || null })}
                      placeholder="https://…"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Font</Label>
                    <Input
                      value={editing.font_family ?? "Oswald"}
                      onChange={(e) => setEditing({ ...editing, font_family: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Opacity Background ({Math.round(Number(editing.background_opacity ?? 0.25) * 100)}%)</Label>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={Number(editing.background_opacity ?? 0.25)}
                      onChange={(e) => setEditing({ ...editing, background_opacity: Number(e.target.value) })}
                      className="accent-[var(--primary)]"
                    />
                  </div>
                </CardContent>
              </Card>
              <Button size="lg" onClick={saveTheme}>
                <Save className="h-5 w-5" /> Simpan Tema
              </Button>
              <div>
                <h3 className="mb-2 font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  Live Preview
                </h3>
                <div className="aspect-video overflow-hidden rounded-xl border border-border">
                  <Scoreboard match={PREVIEW_MATCH} sets={[]} theme={editing} clockText="12:34" compact />
                </div>
              </div>
            </>
          ) : (
            <p className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              Pilih tema di sebelah kiri untuk mengedit, atau buat tema custom baru berdasarkan poster perlombaan Anda.
            </p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
