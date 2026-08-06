import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy } from "lucide-react";
import {
  computeLayout,
  type BracketMatch,
  type BracketParticipant,
  type BracketRow,
  type NodeLayout,
  roundName,
} from "@/lib/bracket-logic";
import { cn } from "@/lib/utils";


export interface BracketCanvasProps {
  bracket: BracketRow;
  participants: BracketParticipant[];
  matches: BracketMatch[];
  animate?: boolean;
  animationKey?: number; // change to restart
  speed?: number; // 0.5 - 2
  onMatchClick?: (m: BracketMatch) => void;
  activeMatchId?: string | null;
  boxAnimation?: "fade" | "slide" | "zoom" | "flip";
  lineAnimation?: "draw" | "flow" | "pulse" | "glow" | "static";
  focusRound?: number | null; // camera focus
  autoTour?: boolean;
  className?: string;
}

interface Positioned extends NodeLayout {
  match: BracketMatch | undefined;
}

export function BracketCanvas({
  bracket,
  participants,
  matches,
  animate = true,
  animationKey = 0,
  speed = 1,
  onMatchClick,
  activeMatchId,
  boxAnimation = "slide",
  lineAnimation = "draw",
  focusRound = null,
  autoTour = false,
  className,
}: BracketCanvasProps) {
  const layout = useMemo(
    () =>
      computeLayout(bracket.participant_count, {
        boxWidth: 230,
        boxHeight: 94,
        roundSpacing: bracket.round_spacing ?? 100,
        verticalGap: 22,
        symmetric: bracket.participant_count === 16,
        centerGap: 260,
      }),
    [bracket.participant_count, bracket.round_spacing],
  );



  const participantMap = useMemo(() => {
    const m = new Map<string, BracketParticipant>();
    participants.forEach((p) => m.set(p.id, p));
    return m;
  }, [participants]);

  const positioned: Positioned[] = useMemo(
    () =>
      layout.nodes.map((n) => ({
        ...n,
        match: matches.find((m) => m.match_number === n.matchNumber),
      })),
    [layout.nodes, matches],
  );

  const nodeByMatchNum = useMemo(() => {
    const m = new Map<number, Positioned>();
    positioned.forEach((p) => m.set(p.matchNumber, p));
    return m;
  }, [positioned]);

  // Connector paths
  const connectors = useMemo(() => {
    const out: { key: string; d: string; round: number; winnerAdvanced: boolean }[] = [];
    positioned.forEach((n) => {
      if (!n.match?.next_match_id) return;
      const nextNode = positioned.find((p) => p.match?.id === n.match?.next_match_id);
      if (!nextNode) return;
      const mirrored = n.x > nextNode.x;
      const startX = mirrored ? n.x : n.x + n.width;
      const startY = n.y + n.height / 2;
      const endX = mirrored ? nextNode.x + nextNode.width : nextNode.x;
      const endY = nextNode.y + nextNode.height / 2;
      const midX = (startX + endX) / 2;
      const d = `M ${startX} ${startY} H ${midX} V ${endY} H ${endX}`;
      out.push({
        key: `${n.matchNumber}-${nextNode.matchNumber}`,
        d,
        round: n.round,
        winnerAdvanced: !!n.match.winner_id,
      });
    });
    return out;
  }, [positioned]);

  // Camera / focus
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [camera, setCamera] = useState({ scale: 1, x: 0, y: 0 });

  useEffect(() => {
    const container = wrapperRef.current?.parentElement;
    if (!container) return;
    const containerW = container.clientWidth;
    const containerH = container.clientHeight;
    const fitScale = Math.min(containerW / layout.width, containerH / layout.height, 1);
    if (focusRound == null) {
      setCamera({ scale: fitScale, x: (containerW - layout.width * fitScale) / 2, y: (containerH - layout.height * fitScale) / 2 });
    } else {
      const round = layout.nodes.filter((n) => n.round === focusRound);
      if (round.length === 0) return;
      const minX = Math.min(...round.map((n) => n.x));
      const maxX = Math.max(...round.map((n) => n.x + n.width));
      const minY = Math.min(...round.map((n) => n.y));
      const maxY = Math.max(...round.map((n) => n.y + n.height));
      const w = maxX - minX;
      const h = maxY - minY;
      const scale = Math.min(containerW / (w + 80), containerH / (h + 80), 1.6);
      setCamera({ scale, x: containerW / 2 - (minX + w / 2) * scale, y: containerH / 2 - (minY + h / 2) * scale });
    }
  }, [focusRound, layout.width, layout.height, layout.nodes]);

  // Auto tour cycles rounds
  const [tourRound, setTourRound] = useState<number | null>(null);
  useEffect(() => {
    if (!autoTour) {
      setTourRound(null);
      return;
    }
    let r = 1;
    setTourRound(r);
    const iv = setInterval(() => {
      r = r >= layout.totalRounds ? 0 : r + 1; // 0 = overview
      setTourRound(r === 0 ? null : r);
    }, 4500 / speed);
    return () => clearInterval(iv);
  }, [autoTour, layout.totalRounds, speed]);

  const effectiveFocus = focusRound ?? tourRound;
  useEffect(() => {
    if (effectiveFocus === focusRound) return;
    // re-run focus effect indirectly by triggering re-render (handled above by dep)
  }, [effectiveFocus, focusRound]);

  const roundDelay = (r: number) => (0.6 + (r - 1) * 0.9) / speed;
  const boxDelay = (r: number, i: number) => (roundDelay(r) + i * 0.12) / 1;
  const lineDelay = (r: number) => (roundDelay(r) + 0.4) / 1;

  const boxVariants = {
    fade: { hidden: { opacity: 0 }, show: { opacity: 1 } },
    slide: { hidden: { opacity: 0, x: -40 }, show: { opacity: 1, x: 0 } },
    zoom: { hidden: { opacity: 0, scale: 0.6 }, show: { opacity: 1, scale: 1 } },
    flip: { hidden: { opacity: 0, rotateY: 90 }, show: { opacity: 1, rotateY: 0 } },
  }[boxAnimation];

  const primary = bracket.box_color ?? "var(--primary)";
  const accent = "var(--accent)";

  const championMatch = matches.find((m) => m.round_number === layout.totalRounds);
  const championId = championMatch?.winner_id;
  const champion = championId ? participantMap.get(championId) : null;

  const bgUrl = bracket.background_url;

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-background", className)}>
      {bgUrl && (
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${bgUrl})` }}
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-background/60 to-accent/10" />
      <div
        ref={wrapperRef}
        className="absolute origin-top-left transition-transform duration-700 ease-out"
        style={{
          width: layout.width,
          height: layout.height,
          transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`,
        }}
      >
        {/* Round labels */}
        {Array.from({ length: layout.totalRounds }).map((_, i) => {
          const r = i + 1;
          const roundNodes = positioned.filter((n) => n.round === r);
          if (roundNodes.length === 0) return null;
          const x = roundNodes[0].x;
          return (
            <motion.div
              key={`label-${r}`}
              initial={animate ? { opacity: 0, y: -8 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: animate ? roundDelay(r) - 0.3 : 0, duration: 0.4 }}
              className="absolute font-display text-xs font-bold uppercase tracking-widest text-muted-foreground"
              style={{ left: x, top: 4, width: layout.boxWidth }}
            >
              {roundName(r, layout.totalRounds)}
            </motion.div>
          );
        })}

        {/* Connectors */}
        <svg
          className="absolute left-0 top-0 pointer-events-none"
          width={layout.width}
          height={layout.height}
          style={{ overflow: "visible" }}
        >
          {connectors.map((c) => {
            const isDraw = lineAnimation === "draw";
            const isFlow = lineAnimation === "flow";
            const isPulse = lineAnimation === "pulse";
            const isGlow = lineAnimation === "glow";
            const strokeColor = c.winnerAdvanced ? accent : "var(--border)";
            const strokeWidth = bracket.line_thickness ?? 2;
            return (
              <motion.path
                key={c.key}
                d={c.d}
                fill="none"
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={animate && isDraw ? { pathLength: 0, opacity: 0 } : false}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ delay: animate ? lineDelay(c.round) : 0, duration: 0.7 / speed, ease: "easeOut" }}
                style={{
                  filter: isGlow || c.winnerAdvanced ? `drop-shadow(0 0 6px ${accent})` : undefined,
                  strokeDasharray: isFlow ? "6 6" : undefined,
                  animation: isFlow
                    ? `bracket-flow ${2 / speed}s linear infinite`
                    : isPulse
                      ? `bracket-pulse ${1.5 / speed}s ease-in-out infinite`
                      : undefined,
                }}
              />
            );
          })}
        </svg>

        {/* Match boxes */}
        {positioned.map((n, idx) => {
          const m = n.match;
          const p1 = m?.player_one_id ? participantMap.get(m.player_one_id) : null;
          const p2 = m?.player_two_id ? participantMap.get(m.player_two_id) : null;
          const winnerId = m?.winner_id;
          const isActive = activeMatchId && m?.id === activeMatchId;
          const isFinal = n.round === layout.totalRounds;
          const isChampion = isFinal && winnerId;
          const idxInRound = positioned.filter((p) => p.round === n.round).indexOf(n);

          return (
            <motion.div
              key={`node-${n.matchNumber}`}
              initial={animate ? boxVariants.hidden : false}
              animate={boxVariants.show}
              whileHover={{ scale: 1.04, zIndex: 20 }}
              transition={{ delay: animate ? boxDelay(n.round, idxInRound) : 0, duration: 0.5 / speed, ease: "easeOut" }}
              className={cn(
                "group absolute cursor-pointer overflow-hidden rounded-lg border-2 shadow-lg backdrop-blur transition-all hover:shadow-2xl",
                isActive ? "border-accent ring-2 ring-accent" : "border-border/60",
                isChampion && "border-accent",
              )}
              style={{
                left: n.x,
                top: n.y,
                width: n.width,
                height: n.height,
                background: `linear-gradient(135deg, ${primary}dd, ${primary}99)`,
                animation: isActive ? "bracket-active 1.5s ease-in-out infinite" : undefined,
              }}
              onClick={() => m && onMatchClick?.(m)}
            >
              {/* shine sweep */}
              <motion.div
                aria-hidden
                className="pointer-events-none absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                initial={{ x: "-160%" }}
                animate={{ x: "160%" }}
                transition={{
                  duration: 2.2 / speed,
                  ease: "easeInOut",
                  repeat: Infinity,
                  repeatDelay: isActive ? 1.2 : 5 + (idxInRound % 5),
                  delay: animate ? boxDelay(n.round, idxInRound) + 0.3 : 0,
                }}
                style={{ width: "60%" }}
              />
              <div className="relative flex items-center justify-between px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/70">
                <span>#{m?.match_number}</span>
                <span className="flex items-center gap-1">
                  {m?.table_number ? `Meja ${m.table_number}` : ""}
                  {isActive && (
                    <motion.span
                      animate={{ opacity: [1, 0.35, 1] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                      className="rounded bg-accent px-1 text-[9px] text-accent-foreground"
                    >
                      LIVE
                    </motion.span>
                  )}
                </span>
              </div>

              <PlayerRow
                p={p1}
                score={m?.score_player_one}
                isWinner={winnerId != null && winnerId === m?.player_one_id}
                loser={winnerId != null && winnerId !== m?.player_one_id}
                showScore={bracket.show_scores}
                showPhoto={bracket.show_photos}
              />
              <div className="mx-2 h-px bg-white/20" />
              <PlayerRow
                p={p2}
                score={m?.score_player_two}
                isWinner={winnerId != null && winnerId === m?.player_two_id}
                loser={winnerId != null && winnerId !== m?.player_two_id}
                showScore={bracket.show_scores}
                showPhoto={bracket.show_photos}
              />
              {isChampion && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: animate ? boxDelay(n.round, idxInRound) + 0.4 : 0 }}
                  className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-accent-foreground shadow"
                >
                  Juara
                </motion.div>
              )}
            </motion.div>
          );
        })}

        {/* Champion glow overlay */}
        <AnimatePresence>
          {champion && animate && (
            <motion.div
              key={`champ-${champion.id}-${animationKey}`}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: (roundDelay(layout.totalRounds) + 1) / speed, duration: 0.8 }}
              className="pointer-events-none absolute flex flex-col items-center"
              style={{
                left: (nodeByMatchNum.get(championMatch!.match_number)?.x ?? 0) + layout.boxWidth / 2 - 60,
                top: (nodeByMatchNum.get(championMatch!.match_number)?.y ?? 0) - 90,
                width: 120,
              }}
            >
              <motion.div
                animate={{ y: [0, -8, 0], rotate: [-4, 4, -4] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <Trophy className="h-12 w-12 text-accent drop-shadow-[0_0_20px_var(--accent)]" />
              </motion.div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function PlayerRow({
  p,
  score,
  isWinner,
  loser,
  showScore,
  showPhoto,
}: {
  p: BracketParticipant | null | undefined;
  score: number | null | undefined;
  isWinner: boolean;
  loser: boolean;
  showScore: boolean;
  showPhoto: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-[34px] items-center gap-1.5 px-2 text-xs font-semibold text-white transition-all duration-300",
        loser && "opacity-40",
        isWinner && "bg-white/10",
      )}
    >
      {showPhoto && p?.photo_url && (
        <img src={p.photo_url} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover ring-1 ring-white/30" />
      )}
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate">{p?.name ?? <span className="italic text-white/40">TBD</span>}</span>
        {p?.team && (
          <span className="block truncate text-[9px] font-bold uppercase tracking-wider text-white/60">{p.team}</span>
        )}
      </span>
      {showScore && score != null && (
        <motion.span
          key={score}
          initial={{ scale: 1.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 18 }}
          className={cn("font-mono text-sm", isWinner ? "text-accent" : "text-white/80")}
        >
          {score}
        </motion.span>
      )}
    </div>
  );
}

