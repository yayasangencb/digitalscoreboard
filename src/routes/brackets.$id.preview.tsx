import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Expand, MonitorPlay, Pause, Play, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { BracketCanvas } from "@/components/BracketCanvas";
import { useBracket } from "@/hooks/useBracket";
import { roundName, roundCount } from "@/lib/bracket-logic";

export const Route = createFileRoute("/brackets/$id/preview")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Preview Bagan — Digital Scoreboard Tenis Meja" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PreviewPage,
});

const VIEWPORTS = [
  { id: "desktop", label: "Desktop", w: 1440, h: 900 },
  { id: "laptop", label: "Laptop 1366×768", w: 1366, h: 768 },
  { id: "fullhd", label: "Full HD 1920×1080", w: 1920, h: 1080 },
  { id: "projector", label: "Proyektor 1280×720", w: 1280, h: 720 },
  { id: "tablet", label: "Tablet Landscape", w: 1024, h: 768 },
  { id: "mobile", label: "Mobile Landscape", w: 812, h: 375 },
];

function PreviewPage() {
  const { id } = Route.useParams();
  const { bracket, participants, matches, loading, notFound } = useBracket(id);
  const [vp, setVp] = useState(VIEWPORTS[2]);
  const [playing, setPlaying] = useState(true);
  const [key, setKey] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [boxAnim, setBoxAnim] = useState<"fade" | "slide" | "zoom" | "flip">("slide");
  const [lineAnim, setLineAnim] = useState<"draw" | "flow" | "pulse" | "glow" | "static">("draw");
  const [focusRound, setFocusRound] = useState<number | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">Memuat…</div>
    );
  if (notFound || !bracket)
    return <div className="flex min-h-screen items-center justify-center">Bagan tidak ditemukan.</div>;

  const rounds = roundCount(bracket.participant_count);
  const inProgressMatch = matches.find((m) => m.match_status === "in_progress");
  const activeMatchId = selectedMatchId ?? inProgressMatch?.id ?? null;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3">
        <div className="mr-auto">
          <div className="font-display text-sm font-bold uppercase">{bracket.name}</div>
          <div className="text-xs text-muted-foreground">Preview Bagan (Klik kotak pertandingan untuk highlight LIVE)</div>
        </div>
        <Select value={vp.id} onChange={(e) => setVp(VIEWPORTS.find((v) => v.id === e.target.value) ?? VIEWPORTS[0])} className="w-auto">
          {VIEWPORTS.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </Select>
        <Select value={boxAnim} onChange={(e) => setBoxAnim(e.target.value as typeof boxAnim)} className="w-auto">
          <option value="slide">Slide</option>
          <option value="fade">Fade</option>
          <option value="zoom">Zoom</option>
          <option value="flip">Flip</option>
        </Select>
        <Select value={lineAnim} onChange={(e) => setLineAnim(e.target.value as typeof lineAnim)} className="w-auto">
          <option value="draw">Draw</option>
          <option value="flow">Flowing</option>
          <option value="pulse">Pulse</option>
          <option value="glow">Glow</option>
          <option value="static">Static</option>
        </Select>
        <Select value={String(speed)} onChange={(e) => setSpeed(Number(e.target.value))} className="w-auto">
          <option value="0.5">0.5×</option>
          <option value="1">1×</option>
          <option value="1.5">1.5×</option>
          <option value="2">2×</option>
        </Select>
        <Select
          value={focusRound == null ? "all" : String(focusRound)}
          onChange={(e) => setFocusRound(e.target.value === "all" ? null : Number(e.target.value))}
          className="w-auto"
        >
          <option value="all">Seluruh Bagan</option>
          {Array.from({ length: rounds }, (_, i) => i + 1).map((r) => (
            <option key={r} value={r}>
              {roundName(r, rounds)}
            </option>
          ))}
        </Select>
        <Button size="sm" variant="secondary" onClick={() => setPlaying((p) => !p)}>
          {playing ? <Pause className="mr-1 h-4 w-4" /> : <Play className="mr-1 h-4 w-4" />}
          {playing ? "Pause" : "Play"}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setKey((k) => k + 1);
            setPlaying(true);
          }}
        >
          <RefreshCw className="mr-1 h-4 w-4" /> Restart
        </Button>
        <Button size="sm" asChild>
          <Link to="/brackets/$id/display" params={{ id: bracket.id }}>
            <MonitorPlay className="mr-1 h-4 w-4" /> Display
          </Link>
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => document.documentElement.requestFullscreen()}
          title="Fullscreen"
        >
          <Expand className="h-4 w-4" />
        </Button>
      </div>

      <div className="mx-auto overflow-auto rounded-lg border border-border bg-black/40" style={{ maxWidth: "100%" }}>
        <div style={{ width: vp.w, height: vp.h }} className="relative">
          <BracketCanvas
            key={key}
            bracket={bracket}
            participants={participants}
            matches={matches}
            animate={playing}
            animationKey={key}
            speed={speed}
            boxAnimation={boxAnim}
            lineAnimation={lineAnim}
            focusRound={focusRound}
            activeMatchId={activeMatchId}
            onMatchClick={(m) => setSelectedMatchId(m.id === selectedMatchId ? null : m.id)}
          />
        </div>
      </div>
    </div>
  );
}

