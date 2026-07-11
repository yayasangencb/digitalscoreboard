import { Circle } from "lucide-react";
import {
  DEFAULT_THEME,
  MATCH_STATUS_LABEL,
  setsToWin,
  type MatchRow,
  type MatchSetRow,
  type ThemeRow,
  type TournamentRow,
} from "@/lib/match-logic";
import { cn } from "@/lib/utils";

interface ScoreboardProps {
  match: MatchRow;
  sets: MatchSetRow[];
  theme?: ThemeRow | null;
  tournament?: TournamentRow | null;
  clockText?: string;
  timerRunning?: boolean;
  className?: string;
  compact?: boolean;
}

function PlayerPanel({
  name,
  team,
  photo,
  score,
  setsWon,
  totalSets,
  serving,
  color,
  align,
  compact,
}: {
  name: string;
  team: string | null;
  photo: string | null;
  score: number;
  setsWon: number;
  totalSets: number;
  serving: boolean;
  color: string;
  align: "left" | "right";
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex min-w-0 flex-1 flex-col items-center justify-between gap-2 rounded-2xl border-2 p-3 transition-shadow sm:p-5",
        serving && "shadow-[0_0_40px_-5px_var(--pp-color)]",
      )}
      style={
        {
          "--pp-color": color,
          borderColor: serving ? color : "color-mix(in srgb, var(--sb-text) 15%, transparent)",
          background: "color-mix(in srgb, var(--sb-text) 5%, transparent)",
        } as React.CSSProperties
      }
    >
      {/* Serve indicator */}
      <div
        className={cn(
          "flex h-6 items-center gap-1.5 font-display text-xs font-bold uppercase tracking-widest sm:text-sm",
          serving ? "opacity-100" : "opacity-0",
        )}
        style={{ color }}
      >
        <Circle className="h-3 w-3 animate-serve-pulse fill-current" />
        Serve
      </div>

      <div className="flex min-w-0 flex-col items-center gap-1">
        {photo && !compact && (
          <img src={photo} alt={name} className="h-14 w-14 rounded-full border-2 object-cover sm:h-20 sm:w-20" style={{ borderColor: color }} />
        )}
        <div
          className={cn(
            "max-w-full truncate text-center font-display font-bold uppercase leading-tight",
            compact ? "text-lg" : "text-xl sm:text-3xl lg:text-4xl",
          )}
        >
          {name}
        </div>
        {team && (
          <div className={cn("max-w-full truncate text-center opacity-70", compact ? "text-[10px]" : "text-xs sm:text-base")}>
            {team}
          </div>
        )}
      </div>

      {/* Big score */}
      <div
        key={score}
        className="animate-score-pop font-display font-bold leading-none tabular-nums"
        style={{
          color,
          fontSize: compact ? "4rem" : "clamp(4.5rem, 24vh, 19rem)",
          textShadow: `0 0 60px color-mix(in srgb, ${color} 45%, transparent)`,
        }}
      >
        {score}
      </div>

      {/* Sets won pips */}
      <div className={cn("flex items-center gap-1.5", align === "right" && "flex-row-reverse")}>
        {Array.from({ length: totalSets }).map((_, i) => (
          <span
            key={i}
            className={cn("rounded-full", compact ? "h-2 w-4" : "h-2.5 w-6 sm:h-3 sm:w-8")}
            style={{
              background: i < setsWon ? color : "color-mix(in srgb, var(--sb-text) 18%, transparent)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function Scoreboard({ match, sets, theme, tournament, clockText, timerRunning, className, compact }: ScoreboardProps) {
  const t = {
    primary: theme?.primary_color ?? DEFAULT_THEME.primary_color,
    secondary: theme?.secondary_color ?? DEFAULT_THEME.secondary_color,
    accent: theme?.accent_color ?? DEFAULT_THEME.accent_color,
    text: theme?.text_color ?? DEFAULT_THEME.text_color,
    left: theme?.left_player_color ?? DEFAULT_THEME.left_player_color,
    right: theme?.right_player_color ?? DEFAULT_THEME.right_player_color,
    font: theme?.font_family ?? DEFAULT_THEME.font_family,
    bg: theme?.background_url ?? null,
    logo: theme?.logo_url ?? tournament?.logo_url ?? null,
    bgOpacity: Number(theme?.background_opacity ?? 0.25),
  };
  const needSets = setsToWin(match.best_of);

  return (
    <div
      className={cn("relative flex h-full w-full flex-col overflow-hidden", className)}
      style={
        {
          "--sb-primary": t.primary,
          "--sb-accent": t.accent,
          "--sb-text": t.text,
          background: `radial-gradient(ellipse at 50% 0%, color-mix(in srgb, ${t.primary} 18%, ${t.secondary}), ${t.secondary} 65%)`,
          color: t.text,
          fontFamily: `'${t.font}', 'Oswald', sans-serif`,
        } as React.CSSProperties
      }
    >
      {t.bg && (
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${t.bg})`, opacity: t.bgOpacity }}
        />
      )}

      {/* Header */}
      <header className={cn("relative z-10 flex items-center justify-between gap-3 px-4 sm:px-8", compact ? "py-2" : "py-3 sm:py-5")}>
        <div className="flex min-w-0 items-center gap-3">
          {t.logo && <img src={t.logo} alt="Logo" className={cn("shrink-0 object-contain", compact ? "h-8" : "h-10 sm:h-16")} />}
          <div className="min-w-0">
            <div className={cn("truncate font-display font-bold uppercase tracking-wide", compact ? "text-sm" : "text-lg sm:text-2xl")}>
              {tournament?.tournament_name ?? "Pertandingan Tenis Meja"}
            </div>
            <div className={cn("truncate uppercase tracking-widest opacity-70", compact ? "text-[9px]" : "text-[10px] sm:text-sm")}>
              {[match.category, match.round_name].filter(Boolean).join(" • ")}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {match.table_number && (
            <div
              className={cn("rounded-md px-2.5 py-1 font-display font-bold uppercase", compact ? "text-[10px]" : "text-xs sm:text-base")}
              style={{ background: t.accent, color: t.secondary }}
            >
              Meja {match.table_number}
            </div>
          )}
          <div className={cn("uppercase tracking-widest opacity-70", compact ? "text-[9px]" : "text-[10px] sm:text-xs")}>
            {MATCH_STATUS_LABEL[match.match_status] ?? match.match_status}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className={cn("relative z-10 grid flex-1 items-stretch gap-2 px-3 pb-3 sm:gap-4 sm:px-6 sm:pb-4", "grid-cols-[1fr_auto_1fr]")}>
        <PlayerPanel
          name={match.player_left_name}
          team={match.player_left_team}
          photo={match.player_left_photo}
          score={match.score_left}
          setsWon={match.sets_left}
          totalSets={needSets}
          serving={match.serving_player === "left" && match.match_status !== "finished"}
          color={t.left}
          align="left"
          compact={compact}
        />

        {/* Center column */}
        <div className={cn("flex w-24 flex-col items-center justify-center gap-3 sm:w-44 lg:w-52", compact && "w-24 gap-2")}>
          <div
            className={cn("font-display font-bold tabular-nums leading-none", compact ? "text-2xl" : "text-3xl sm:text-6xl")}
            style={{ color: t.accent }}
          >
            {match.sets_left}
            <span className="opacity-50"> : </span>
            {match.sets_right}
          </div>
          <div className={cn("uppercase tracking-widest opacity-60", compact ? "text-[8px]" : "text-[9px] sm:text-xs")}>
            Best of {match.best_of}
          </div>

          {clockText && (
            <div
              className={cn(
                "rounded-lg border px-2 py-1 text-center font-display font-semibold tabular-nums sm:px-4 sm:py-2",
                compact ? "text-base" : "text-xl sm:text-4xl",
                timerRunning ? "opacity-100" : "opacity-60",
              )}
              style={{ borderColor: `color-mix(in srgb, ${t.text} 25%, transparent)` }}
            >
              {clockText}
            </div>
          )}

          {/* Set history */}
          {sets.length > 0 && (
            <div className={cn("w-full space-y-1", compact ? "text-[9px]" : "text-[10px] sm:text-sm")}>
              {sets.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded px-2 py-0.5 tabular-nums sm:py-1"
                  style={{ background: "color-mix(in srgb, var(--sb-text) 8%, transparent)" }}
                >
                  <span className="opacity-60">S{s.set_number}</span>
                  <span className="font-semibold">
                    <span style={{ color: s.winner === "left" ? t.left : undefined }}>{s.score_left}</span>
                    <span className="opacity-50"> - </span>
                    <span style={{ color: s.winner === "right" ? t.right : undefined }}>{s.score_right}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <PlayerPanel
          name={match.player_right_name}
          team={match.player_right_team}
          photo={match.player_right_photo}
          score={match.score_right}
          setsWon={match.sets_right}
          totalSets={needSets}
          serving={match.serving_player === "right" && match.match_status !== "finished"}
          color={t.right}
          align="right"
          compact={compact}
        />
      </main>

      {/* Footer */}
      <footer
        className={cn(
          "relative z-10 flex items-center justify-between gap-3 px-4 sm:px-8",
          compact ? "py-1.5 text-[8px]" : "py-2 text-[10px] sm:py-3 sm:text-sm",
        )}
        style={{ background: "color-mix(in srgb, black 30%, transparent)" }}
      >
        <span className="truncate uppercase tracking-widest opacity-70">{tournament?.venue ?? ""}</span>
        <span className="shrink-0 font-display font-semibold tracking-widest opacity-70">{match.match_code}</span>
      </footer>
    </div>
  );
}
