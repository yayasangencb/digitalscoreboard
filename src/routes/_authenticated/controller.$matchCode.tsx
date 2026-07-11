import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  ChevronLeft,
  Copy,
  Minus,
  MonitorPlay,
  Pause,
  Play,
  Plus,
  Redo2,
  RefreshCcw,
  RotateCcw,
  SkipForward,
  Timer,
  Undo2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog, ConnectionBadge, SetWonDialog, WinnerOverlay } from "@/components/MatchDialogs";
import { useMatchSync } from "@/hooks/useMatchSync";
import { useMatchActions } from "@/hooks/useMatchActions";
import { useMatchClock } from "@/hooks/useMatchClock";
import { checkSetWinner, MATCH_STATUS_LABEL, statusVariant } from "@/lib/match-logic";
import { isMuted, setMuted } from "@/lib/sounds";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/controller/$matchCode")({
  head: ({ params }) => ({
    meta: [{ title: `Controller ${params.matchCode} — Digital Scoreboard` }, { name: "robots", content: "noindex" }],
  }),
  component: ControllerPage,
});

function ControllerPage() {
  const { matchCode } = Route.useParams();
  const { match, setMatch, sets, loading, notFound, connStatus } = useMatchSync(matchCode);
  const actions = useMatchActions(match, setMatch);
  const clock = useMatchClock(match);

  const [muted, setMutedState] = useState(true);
  const [confirm, setConfirm] = useState<null | "reset" | "cancelSet" | "finish">(null);
  const [overlayDismissed, setOverlayDismissed] = useState(false);
  const [setDialogDismissKey, setSetDialogDismissKey] = useState("");
  const [otherControllers, setOtherControllers] = useState(0);

  useEffect(() => setMutedState(isMuted()), []);

  useEffect(() => {
    if (match?.match_status !== "finished") setOverlayDismissed(false);
  }, [match?.match_status]);

  // Presence: warn when another controller is active on the same match
  useEffect(() => {
    const matchId = match?.id;
    if (!matchId) return;
    const key = Math.random().toString(36).slice(2);
    const channel = supabase.channel(`ctrl-${matchId}`, { config: { presence: { key } } });
    channel
      .on("presence", { event: "sync" }, () => {
        setOtherControllers(Math.max(0, Object.keys(channel.presenceState()).length - 1));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await channel.track({ at: Date.now() });
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [match?.id]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Memuat…</div>;
  }
  if (notFound || !match) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
        <h1 className="font-display text-2xl font-bold uppercase">Pertandingan tidak ditemukan</h1>
        <Button asChild>
          <Link to="/dashboard">Kembali ke Dashboard</Link>
        </Button>
      </div>
    );
  }

  const scoreKey = `${match.score_left}-${match.score_right}-${match.sets_left}-${match.sets_right}`;
  const setWinnerSide =
    match.auto_rules && match.match_status !== "finished"
      ? checkSetWinner(match.score_left, match.score_right, match.target_score)
      : null;
  const showSetDialog = !!setWinnerSide && scoreKey !== setDialogDismissKey;
  const finished = match.match_status === "finished";

  const copyCode = () => {
    navigator.clipboard.writeText(match.match_code);
    toast.success("Kode pertandingan disalin");
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/dashboard">
            <ChevronLeft className="h-4 w-4" /> Dashboard
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <ConnectionBadge status={connStatus} />
          <button
            onClick={copyCode}
            className="flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 font-display text-sm font-semibold tracking-widest hover:bg-muted/70"
          >
            {match.match_code} <Copy className="h-3 w-3 opacity-60" />
          </button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const next = !muted;
              setMuted(next);
              setMutedState(next);
            }}
            title={muted ? "Aktifkan suara" : "Matikan suara"}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {otherControllers > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Pertandingan ini sedang dikontrol oleh perangkat lain ({otherControllers} controller aktif lainnya).
        </div>
      )}

      {/* Status + serve summary */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <Badge variant={statusVariant(match.match_status)}>{MATCH_STATUS_LABEL[match.match_status]}</Badge>
          <div className="font-display text-2xl font-bold tabular-nums">
            Set {match.sets_left} : {match.sets_right}
            <span className="ml-2 text-sm font-normal text-muted-foreground">Best of {match.best_of}</span>
          </div>
          {match.timer_mode !== "none" && (
            <div className="flex items-center gap-2 font-display text-2xl font-bold tabular-nums">
              <Timer className={cn("h-5 w-5", clock.running ? "text-success" : "text-muted-foreground")} />
              {clock.text}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Score panels */}
      <div className="grid grid-cols-2 gap-3">
        {(["left", "right"] as const).map((side) => {
          const name = side === "left" ? match.player_left_name : match.player_right_name;
          const team = side === "left" ? match.player_left_team : match.player_right_team;
          const score = side === "left" ? match.score_left : match.score_right;
          const serving = match.serving_player === side && !finished;
          return (
            <Card key={side} className={cn(serving && "border-primary shadow-[0_0_20px_-8px_var(--primary)]")}>
              <CardContent className="flex flex-col items-center gap-3 p-4">
                <div className="flex h-5 items-center gap-1 text-xs font-bold uppercase tracking-widest text-primary">
                  {serving && (
                    <>
                      <span className="h-2 w-2 animate-serve-pulse rounded-full bg-primary" /> Serve
                    </>
                  )}
                </div>
                <div className="w-full truncate text-center font-display text-lg font-bold uppercase">{name}</div>
                {team && <div className="w-full truncate text-center text-xs text-muted-foreground">{team}</div>}
                <div className="font-display text-7xl font-bold tabular-nums text-foreground sm:text-8xl">{score}</div>
                <div className="grid w-full grid-cols-2 gap-2">
                  <Button
                    variant="scoreMinus"
                    size="jumbo"
                    className="h-16"
                    disabled={finished || score <= 0}
                    onClick={() => actions.subPoint(side)}
                  >
                    <Minus className="h-6 w-6" />
                  </Button>
                  <Button variant="score" size="jumbo" className="h-16" disabled={finished} onClick={() => actions.addPoint(side)}>
                    <Plus className="h-7 w-7" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Set history */}
      {sets.length > 0 && (
        <Card>
          <CardContent className="flex flex-wrap gap-2 p-4">
            {sets.map((s) => (
              <Badge key={s.id} variant="secondary" className="tabular-nums">
                Set {s.set_number}: {s.score_left}-{s.score_right}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {match.timer_mode !== "none" && (
          <>
            <Button variant="secondary" size="lg" onClick={actions.toggleTimer}>
              {clock.running ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              {clock.running ? "Pause Timer" : "Mulai Timer"}
            </Button>
            <Button variant="outline" size="lg" onClick={actions.resetTimer}>
              <RotateCcw className="h-5 w-5" /> Reset Timer
            </Button>
          </>
        )}
        <Button variant="secondary" size="lg" disabled={finished} onClick={actions.toggleServe}>
          <RefreshCcw className="h-5 w-5" /> Ganti Servis
        </Button>
        <Button variant="secondary" size="lg" disabled={finished} onClick={actions.swapSides}>
          <ArrowLeftRight className="h-5 w-5" /> Tukar Posisi
        </Button>
        <Button variant="secondary" size="lg" disabled={finished} onClick={() => void actions.nextSet()}>
          <SkipForward className="h-5 w-5" /> Set Berikutnya
        </Button>
        <Button variant="outline" size="lg" onClick={() => setConfirm("cancelSet")}>
          <Undo2 className="h-5 w-5" /> Batalkan Set
        </Button>
        <Button variant="outline" size="lg" onClick={actions.undo}>
          <Undo2 className="h-5 w-5" /> Undo
        </Button>
        <Button variant="outline" size="lg" onClick={actions.redo}>
          <Redo2 className="h-5 w-5" /> Redo
        </Button>
        <Button variant="destructive" size="lg" onClick={() => setConfirm("reset")}>
          <RotateCcw className="h-5 w-5" /> Reset Skor
        </Button>
        <Button variant="accent" size="lg" disabled={finished} onClick={() => setConfirm("finish")}>
          <CheckCircle2 className="h-5 w-5" /> Selesaikan
        </Button>
        <Button variant="outline" size="lg" asChild>
          <Link to="/display/$matchCode" params={{ matchCode: match.match_code }} target="_blank">
            <MonitorPlay className="h-5 w-5" /> Buka Display
          </Link>
        </Button>
      </div>

      {/* Dialogs */}
      {showSetDialog && setWinnerSide && (
        <SetWonDialog
          open
          playerName={setWinnerSide === "left" ? match.player_left_name : match.player_right_name}
          onContinue={() => {
            setSetDialogDismissKey(scoreKey);
            void actions.nextSet();
          }}
          onCorrect={() => setSetDialogDismissKey(scoreKey)}
        />
      )}
      {finished && match.winner && !overlayDismissed && (
        <WinnerOverlay winnerName={match.winner} matchId={match.id} onClose={() => setOverlayDismissed(true)} />
      )}
      <ConfirmDialog
        open={confirm === "reset"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Reset Skor Pertandingan?"
        description="Seluruh skor, set, dan riwayat set akan kembali ke 0. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Ya, Reset"
        destructive
        onConfirm={() => void actions.resetScores()}
      />
      <ConfirmDialog
        open={confirm === "cancelSet"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Batalkan Set Terakhir?"
        description="Set terakhir yang selesai akan dibatalkan dan skornya dikembalikan ke papan."
        confirmLabel="Ya, Batalkan Set"
        destructive
        onConfirm={() => void actions.cancelLastSet()}
      />
      <ConfirmDialog
        open={confirm === "finish"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Selesaikan Pertandingan?"
        description="Pertandingan akan ditandai selesai dan hasil disimpan ke riwayat."
        confirmLabel="Ya, Selesaikan"
        onConfirm={actions.finishMatch}
      />
    </div>
  );
}
