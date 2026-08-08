import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Expand, Radio, Shrink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BracketCanvas } from "@/components/BracketCanvas";
import { useBracket } from "@/hooks/useBracket";
import { roundCount, type BracketMatch } from "@/lib/bracket-logic";
import { useAutoHideCursor } from "@/components/MatchDialogs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/brackets/$id/display")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Display Bagan — Digital Scoreboard Tenis Meja" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DisplayBracketPage,
});

function DisplayBracketPage() {
  const { id } = Route.useParams();
  const { bracket, participants, matches, loading, notFound } = useBracket(id);
  const [isFs, setIsFs] = useState(false);
  const [autoTour, setAutoTour] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [key, setKey] = useState(0);
  const [focusRound, setFocusRound] = useState<number | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const cursorHidden = useAutoHideCursor(isFs);

  useEffect(() => {
    const onFs = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggleFs = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen();
  }, []);

  useEffect(() => {
    if (!bracket) return;
    const rounds = roundCount(bracket.participant_count);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "f" || e.key === "F") toggleFs();
      else if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === "r" || e.key === "R") setKey((k) => k + 1);
      else if (e.key === "a" || e.key === "A") setAutoTour((a) => !a);
      else if (e.key === "ArrowRight") setFocusRound((r) => (r == null ? 1 : Math.min(rounds, r + 1)));
      else if (e.key === "ArrowLeft") setFocusRound((r) => (r == null ? null : Math.max(1, r - 1)));
      else if (e.key === "Escape") setFocusRound(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bracket, toggleFs]);

  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Memuat…</div>;
  if (notFound || !bracket) return <div className="flex min-h-screen items-center justify-center">Bagan tidak ditemukan.</div>;

  const inProgressMatch = matches.find((m) => m.match_status === "in_progress");
  const activeMatchId = selectedMatchId ?? inProgressMatch?.id ?? null;
  const activeMatchObj = matches.find((m) => m.id === activeMatchId);

  const handleMatchClick = (m: BracketMatch) => {
    if (selectedMatchId === m.id) {
      setSelectedMatchId(null);
      toast.info("Pilihan pertandingan LIVE direset");
    } else {
      setSelectedMatchId(m.id);
      toast.success(`Pertandingan #${m.match_number} dipilih sebagai LIVE`);
    }
  };

  return (
    <div className={cn("relative h-screen w-screen overflow-hidden bg-background", cursorHidden && "cursor-hidden")}>
      <div className="absolute inset-0">
        <BracketCanvas
          key={key}
          bracket={bracket}
          participants={participants}
          matches={matches}
          animate={playing}
          animationKey={key}
          autoTour={autoTour}
          focusRound={focusRound}
          activeMatchId={activeMatchId}
          onMatchClick={handleMatchClick}
        />
      </div>

      {/* Header */}
      <div
        className={cn(
          "no-print absolute left-0 right-0 top-0 z-10 flex items-center gap-3 bg-gradient-to-b from-black/70 to-transparent px-6 py-4 transition-opacity",
          isFs && cursorHidden ? "opacity-0" : "opacity-100",
        )}
      >
        {bracket.logo_url && <img src={bracket.logo_url} alt="" className="h-10 w-10 rounded object-contain" />}
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-2xl font-black uppercase tracking-wide">{bracket.name}</div>
          <div className="truncate text-sm text-muted-foreground">{bracket.category}</div>
        </div>

        {activeMatchObj && (
          <div className="flex items-center gap-2 rounded-full border border-accent/60 bg-black/60 px-3 py-1 text-xs font-semibold text-accent backdrop-blur">
            <Radio className="h-4 w-4 animate-pulse" />
            <span>LIVE: Pertandingan #{activeMatchObj.match_number}</span>
          </div>
        )}

        <Button variant="ghost" size="icon" onClick={toggleFs} title="Fullscreen (F)">
          {isFs ? <Shrink className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
        </Button>
      </div>

      {/* Footer hint */}
      <div
        className={cn(
          "no-print absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1.5 text-[11px] uppercase tracking-widest text-white/70 backdrop-blur transition-opacity",
          isFs && cursorHidden ? "opacity-0" : "opacity-100",
        )}
      >
        Klik Kotak: Pilih LIVE · Space: Play/Pause · R: Restart · A: Auto-Tour · ← →: Fokus Babak · F: Fullscreen
      </div>
    </div>
  );
}

