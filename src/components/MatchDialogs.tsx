import { useEffect, useRef, useState } from "react";
import { Keyboard, Printer, Trophy, Wifi, WifiOff } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SHORTCUT_LIST } from "@/hooks/useKeyboardShortcuts";
import type { ConnStatus } from "@/hooks/useMatchSync";
import { cn } from "@/lib/utils";

export function ShortcutHelpDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" /> Daftar Shortcut
          </DialogTitle>
          <DialogDescription>Shortcut keyboard untuk mengontrol pertandingan (mode 1 perangkat).</DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          {SHORTCUT_LIST.map((s) => (
            <div key={s.key} className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
              <span className="text-muted-foreground">{s.label}</span>
              <kbd className="rounded bg-background px-2 py-0.5 font-mono text-xs font-semibold">{s.key}</kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Ya, Lanjutkan",
  destructive,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SetWonDialog({
  open,
  playerName,
  onContinue,
  onCorrect,
}: {
  open: boolean;
  playerName: string;
  onContinue: () => void;
  onCorrect: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCorrect()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" /> Set Selesai
          </DialogTitle>
          <DialogDescription>
            Set dimenangkan oleh <span className="font-semibold text-foreground">{playerName}</span>. Lanjut ke set
            berikutnya?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCorrect}>
            Koreksi Skor
          </Button>
          <Button onClick={onContinue}>Lanjut Set Berikutnya</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function WinnerOverlay({
  winnerName,
  matchId,
  onClose,
}: {
  winnerName: string;
  matchId?: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-6">
      <div className="animate-winner-in flex max-w-2xl flex-col items-center gap-6 text-center">
        <Trophy className="h-20 w-20 text-warning sm:h-28 sm:w-28" />
        <div className="font-display text-xl uppercase tracking-[0.3em] text-muted-foreground">Pemenang Pertandingan</div>
        <div className="font-display text-5xl font-bold uppercase text-primary sm:text-7xl">{winnerName}</div>
        <div className="no-print mt-4 flex flex-wrap items-center justify-center gap-3">
          <Button variant="outline" onClick={onClose}>
            Tutup Overlay
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Cetak Hasil
          </Button>
          {matchId && (
            <Button asChild>
              <Link to="/matches/$id/result" params={{ id: matchId }}>
                Lihat Hasil
              </Link>
            </Button>
          )}
          <Button variant="ghost" asChild>
            <Link to="/dashboard">Kembali ke Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ConnectionBadge({ status }: { status: ConnStatus }) {
  const color =
    status === "connected" ? "text-success" : status === "connecting" ? "text-warning" : "text-destructive";
  const label = status === "connected" ? "Terhubung" : status === "connecting" ? "Menghubungkan…" : "Terputus";
  const Icon = status === "disconnected" ? WifiOff : Wifi;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", color)}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

/** Hides the mouse cursor after a few seconds of inactivity. */
export function useAutoHideCursor(enabled: boolean) {
  const [hidden, setHidden] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) {
      setHidden(false);
      return;
    }
    const reset = () => {
      setHidden(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setHidden(true), 3000);
    };
    reset();
    window.addEventListener("mousemove", reset);
    return () => {
      window.removeEventListener("mousemove", reset);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled]);

  return hidden;
}
