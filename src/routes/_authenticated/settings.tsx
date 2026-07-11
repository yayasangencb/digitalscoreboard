import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Volume2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useSession } from "@/hooks/useAuth";
import { getVolume, isMuted, playScore, setMuted, setVolume } from "@/lib/sounds";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Pengaturan — Digital Scoreboard Tenis Meja" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useSession();
  const [muted, setMutedState] = useState(true);
  const [volume, setVolumeState] = useState(0.5);

  useEffect(() => {
    setMutedState(isMuted());
    setVolumeState(getVolume());
  }, []);

  return (
    <AppLayout title="Pengaturan">
      <div className="mx-auto grid max-w-xl gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Akun</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="text-muted-foreground">Email</div>
            <div className="font-medium">{user?.email}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Suara</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <label className="flex items-center justify-between text-sm">
              <span>Aktifkan bunyi skor, set, dan pertandingan</span>
              <input
                type="checkbox"
                checked={!muted}
                onChange={(e) => {
                  const m = !e.target.checked;
                  setMuted(m);
                  setMutedState(m);
                  if (!m) playScore();
                }}
                className="h-5 w-5 accent-[var(--primary)]"
              />
            </label>
            <div className="grid gap-1.5">
              <Label className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" /> Volume ({Math.round(volume * 100)}%)
              </Label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setVolume(v);
                  setVolumeState(v);
                }}
                onMouseUp={() => playScore()}
                className="accent-[var(--primary)]"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bahasa</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Aplikasi menggunakan Bahasa Indonesia.
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
