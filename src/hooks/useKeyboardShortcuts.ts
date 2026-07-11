import { useEffect, useRef } from "react";

export interface ShortcutHandlers {
  scoreLeftPlus?: () => void;
  scoreLeftMinus?: () => void;
  scoreRightPlus?: () => void;
  scoreRightMinus?: () => void;
  toggleTimer?: () => void;
  resetScores?: () => void;
  resetTimer?: () => void;
  toggleServe?: () => void;
  nextSet?: () => void;
  cancelLastSet?: () => void;
  swapSides?: () => void;
  fullscreen?: () => void;
  escape?: () => void;
  undo?: () => void;
  redo?: () => void;
  help?: () => void;
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

export function useKeyboardShortcuts(enabled: boolean, handlers: ShortcutHandlers) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const h = ref.current;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) h.redo?.();
        else h.undo?.();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      switch (e.key.toLowerCase()) {
        case "q":
          h.scoreLeftPlus?.();
          break;
        case "a":
          h.scoreLeftMinus?.();
          break;
        case "p":
          h.scoreRightPlus?.();
          break;
        case "l":
          h.scoreRightMinus?.();
          break;
        case " ":
          e.preventDefault();
          h.toggleTimer?.();
          break;
        case "r":
          h.resetScores?.();
          break;
        case "t":
          h.resetTimer?.();
          break;
        case "s":
          h.toggleServe?.();
          break;
        case "n":
          h.nextSet?.();
          break;
        case "b":
          h.cancelLastSet?.();
          break;
        case "x":
          h.swapSides?.();
          break;
        case "f":
          h.fullscreen?.();
          break;
        case "h":
          h.help?.();
          break;
        case "escape":
          h.escape?.();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}

export const SHORTCUT_LIST: { key: string; label: string }[] = [
  { key: "Q / A", label: "Skor pemain kiri +1 / -1" },
  { key: "P / L", label: "Skor pemain kanan +1 / -1" },
  { key: "Space", label: "Mulai / pause timer" },
  { key: "S", label: "Ganti servis" },
  { key: "N", label: "Set berikutnya" },
  { key: "B", label: "Batalkan set terakhir" },
  { key: "X", label: "Tukar posisi pemain" },
  { key: "R", label: "Reset skor (dengan konfirmasi)" },
  { key: "T", label: "Reset timer" },
  { key: "F", label: "Fullscreen" },
  { key: "H", label: "Bantuan shortcut" },
  { key: "Esc", label: "Tutup modal / keluar fullscreen" },
  { key: "Ctrl+Z", label: "Undo" },
  { key: "Ctrl+Shift+Z", label: "Redo" },
];
