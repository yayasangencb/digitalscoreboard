import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Expand, Keyboard, Shrink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Scoreboard } from "@/components/Scoreboard";
import {
  ConfirmDialog,
  ConnectionBadge,
  SetWonDialog,
  ShortcutHelpDialog,
  WinnerOverlay,
  useAutoHideCursor,
} from "@/components/MatchDialogs";
import { useMatchSync } from "@/hooks/useMatchSync";
import { useMatchActions } from "@/hooks/useMatchActions";
import { useMatchClock } from "@/hooks/useMatchClock";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useSession } from "@/hooks/useAuth";
import { checkSetWinner } from "@/lib/match-logic";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/display/$matchCode")({
  ssr: false,
  head: ({ params }) => ({
    meta: [
      { title: `Display ${params.matchCode} — Digital Scoreboard Tenis Meja` },
      { name: "description", content: "Tampilan papan skor tenis meja fullscreen untuk proyektor." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DisplayPage,
});

function DisplayPage() {
  const { matchCode } = Route.useParams();
  const { match, setMatch, sets, theme, tournament, loading, notFound, connStatus } = useMatchSync(matchCode);
  const actions = useMatchActions(match, setMatch);
  const clock = useMatchClock(match);
  const { user } = useSession();

  const [isFs, setIsFs] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [overlayDismissed, setOverlayDismissed] = useState(false);
  const [setDialogDismissKey, setSetDialogDismissKey] = useState("");
  const cursorHidden = useAutoHideCursor(isFs);

  useEffect(() => {
    const onFs = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    if (match?.match_status !== "finished") setOverlayDismissed(false);
  }, [match?.match_status]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen();
  }, []);

  const canControl = !!user;
  const scoreKey = match ? `${match.score_left}-${match.score_right}-${match.sets_left}-${match.sets_right}` : "";
  const setWinnerSide =
    match && match.auto_rules && match.match_status !== "finished"
      ? checkSetWinner(match.score_left, match.score_right, match.target_score)
      : null;
  const showSetDialog = canControl && !!setWinnerSide && scoreKey !== setDialogDismissKey;

  useKeyboardShortcuts(canControl && !!match, {
    scoreLeftPlus: () => actions.addPoint("left"),
    scoreLeftMinus: () => actions.subPoint("left"),
    scoreRightPlus: () => actions.addPoint("right"),
    scoreRightMinus: () => actions.subPoint("right"),
    toggleTimer: actions.toggleTimer,
    resetScores: () => setConfirmReset(true),
    resetTimer: actions.resetTimer,
    toggleServe: actions.toggleServe,
    nextSet: () => void actions.nextSet(),
    cancelLastSet: () => void actions.cancelLastSet(),
    swapSides: actions.swapSides,
    fullscreen: toggleFullscreen,
    help: () => setHelpOpen(true),
    undo: actions.undo,
    redo: actions.redo,
    escape: () => {
      setHelpOpen(false);
      setConfirmReset(false);
    },
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">Memuat pertandingan…</div>
    );
  }

  if (notFound || !match) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="font-display text-3xl font-bold uppercase">Pertandingan Tidak Ditemukan</h1>
        <p className="text-muted-foreground">Kode {matchCode} tidak terdaftar. Periksa kembali kode pertandingan.</p>
        <Button asChild>
          <Link to="/">Kembali ke Beranda</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("relative h-screen w-screen", cursorHidden && "cursor-hidden")}>
      <Scoreboard
        match={match}
        sets={sets}
        theme={theme}
        tournament={tournament}
        clockText={match.timer_mode === "none" ? undefined : clock.text}
        timerRunning={clock.running}
      />

      {/* Floating controls — hidden while fullscreen + idle cursor */}
      <div
        className={cn(
          "no-print absolute right-3 top-3 z-20 flex items-center gap-2 rounded-lg bg-black/50 px-3 py-2 backdrop-blur transition-opacity",
          isFs && cursorHidden ? "opacity-0" : "opacity-100",
        )}
      >
        <ConnectionBadge status={connStatus} />
        {canControl && (
          <Button variant="ghost" size="icon" onClick={() => setHelpOpen(true)} title="Shortcut keyboard (H)">
            <Keyboard className="h-4 w-4" />
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={toggleFullscreen} title="Fullscreen (F)">
          {isFs ? <Shrink className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
        </Button>
      </div>

      {match.match_status === "finished" && match.winner && !overlayDismissed && (
        <WinnerOverlay winnerName={match.winner} matchId={canControl ? match.id : undefined} onClose={() => setOverlayDismissed(true)} />
      )}

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

      <ShortcutHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset Skor Pertandingan?"
        description="Seluruh skor, set, dan riwayat set akan dihapus dan kembali ke 0. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Ya, Reset"
        destructive
        onConfirm={() => void actions.resetScores()}
      />
    </div>
  );
}
