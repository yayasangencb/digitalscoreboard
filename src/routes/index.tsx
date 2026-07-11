import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MonitorPlay, Gamepad2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Digital Scoreboard Tenis Meja — Papan Skor Real-Time" },
      {
        name: "description",
        content:
          "Papan skor digital tenis meja untuk turnamen: tampilan proyektor fullscreen, remote controller di HP, dan sinkronisasi real-time.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [code, setCode] = useState("");
  const navigate = useNavigate();

  const openDisplay = (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (c) navigate({ to: "/display/$matchCode", params: { matchCode: c } });
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklch,var(--primary)_18%,transparent),transparent_60%)]" />
      <main className="relative z-10 flex w-full max-w-xl flex-col items-center gap-8 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary font-display text-3xl font-bold text-primary-foreground">
          TT
        </div>
        <div>
          <h1 className="font-display text-4xl font-bold uppercase tracking-wide sm:text-5xl">
            Digital Scoreboard
            <span className="block text-primary">Tenis Meja</span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">
            Papan skor turnamen real-time. Tampilkan di proyektor, kontrol dari laptop atau smartphone.
          </p>
        </div>

        <form onSubmit={openDisplay} className="flex w-full max-w-sm items-center gap-2">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Masukkan kode, mis. TM-AB12CD"
            className="h-12 text-center font-display uppercase tracking-widest"
            aria-label="Kode pertandingan"
          />
          <Button type="submit" size="lg" variant="accent">
            <MonitorPlay className="h-5 w-5" /> Buka
          </Button>
        </form>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/login">
              <LogIn className="h-5 w-5" /> Masuk Operator
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/dashboard">
              <Gamepad2 className="h-5 w-5" /> Dashboard
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
