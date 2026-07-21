import type { Tables } from "@/integrations/supabase/types";

export type BracketRow = Tables<"brackets">;
export type BracketParticipant = Tables<"bracket_participants">;
export type BracketMatch = Tables<"bracket_matches">;

export const DUMMY_NAMES = ["Ahmad", "Budi", "Candra", "Dimas", "Eko", "Fajar", "Galih", "Hendra"];

export const PARTICIPANT_PRESETS = [4, 8, 16, 32, 64];

/** Round up participant_count to the next power of 2. */
export function bracketSize(count: number): number {
  let n = 2;
  while (n < count) n *= 2;
  return Math.max(2, n);
}

export function roundCount(participantCount: number): number {
  return Math.log2(bracketSize(participantCount));
}

export function roundName(roundNumber: number, totalRounds: number): string {
  const fromFinal = totalRounds - roundNumber;
  if (fromFinal === 0) return "Final";
  if (fromFinal === 1) return "Semifinal";
  if (fromFinal === 2) return "Perempat Final";
  const teams = Math.pow(2, fromFinal + 1);
  return `Babak ${teams} Besar`;
}

/** Standard seeding order for a bracket of `size` slots (1-based positions). */
export function standardSeedOrder(size: number): number[] {
  let order = [1, 2];
  while (order.length < size) {
    const next: number[] = [];
    const total = order.length * 2 + 1;
    for (const s of order) {
      next.push(s);
      next.push(total - s);
    }
    order = next;
  }
  return order;
}

export interface GeneratedMatch {
  round_number: number;
  match_number: number;
  position_in_round: number;
  next_position_in_round: number | null;
  next_match_number: number | null;
  next_match_position: "top" | "bottom" | null;
}

/** Generate all match slots for a single-elimination bracket. */
export function generateSingleElimination(participantCount: number): GeneratedMatch[] {
  const size = bracketSize(participantCount);
  const rounds = Math.log2(size);
  const out: GeneratedMatch[] = [];
  let matchNum = 1;
  for (let r = 1; r <= rounds; r++) {
    const matchesInRound = size / Math.pow(2, r);
    for (let i = 0; i < matchesInRound; i++) {
      const isFinal = r === rounds;
      const nextPos = isFinal ? null : Math.floor(i / 2);
      out.push({
        round_number: r,
        match_number: matchNum++,
        position_in_round: i,
        next_position_in_round: nextPos,
        next_match_number: null, // filled in second pass
        next_match_position: isFinal ? null : i % 2 === 0 ? "top" : "bottom",
      });
    }
  }
  // Fill next_match_number
  for (const m of out) {
    if (m.next_position_in_round === null) continue;
    const nxt = out.find(
      (o) => o.round_number === m.round_number + 1 && o.position_in_round === m.next_position_in_round,
    );
    m.next_match_number = nxt?.match_number ?? null;
  }
  return out;
}

// -------- Layout ----------

export interface NodeLayout {
  matchNumber: number;
  round: number;
  position: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BracketLayout {
  width: number;
  height: number;
  boxWidth: number;
  boxHeight: number;
  nodes: NodeLayout[];
  totalRounds: number;
}

export interface LayoutOptions {
  boxWidth?: number;
  boxHeight?: number;
  roundSpacing?: number;
  verticalGap?: number;
  paddingX?: number;
  paddingY?: number;
  symmetric?: boolean;
  centerGap?: number;
}

export function computeLayout(participantCount: number, opts: LayoutOptions = {}): BracketLayout {
  const boxWidth = opts.boxWidth ?? 220;
  const boxHeight = opts.boxHeight ?? 70;
  const roundSpacing = opts.roundSpacing ?? 80;
  const verticalGap = opts.verticalGap ?? 24;
  const paddingX = opts.paddingX ?? 32;
  const paddingY = opts.paddingY ?? 32;

  const size = bracketSize(participantCount);
  const rounds = Math.log2(size);
  const matches = generateSingleElimination(participantCount);
  const firstRoundHeight = (size / 2) * boxHeight + (size / 2 - 1) * verticalGap;
  const nodes: NodeLayout[] = [];

  if (opts.symmetric && rounds >= 2) {
    // Mirrored bracket: matches whose bracket path reaches semi 0 go left,
    // matches reaching semi 1 go right, final centered.
    const centerGap = opts.centerGap ?? boxWidth + roundSpacing;
    const sideRounds = rounds - 1; // rounds excluding final
    const totalWidth =
      paddingX * 2 + sideRounds * boxWidth * 2 + (sideRounds - 1) * roundSpacing * 2 + centerGap + boxWidth;
    const centerX = totalWidth / 2;

    // Determine side by walking the tree to a semi (round = rounds-1) position.
    const sideFor = (round: number, pos: number): "left" | "right" => {
      let p = pos;
      for (let r = round; r < rounds - 1; r++) p = Math.floor(p / 2);
      return p === 0 ? "left" : "right";
    };

    for (const m of matches) {
      const r = m.round_number;
      const pos = m.position_in_round;
      if (r === rounds) {
        // Final centered
        nodes.push({
          matchNumber: m.match_number,
          round: r,
          position: pos,
          x: centerX - boxWidth / 2,
          y: paddingY + firstRoundHeight / 2 - boxHeight / 2,
          width: boxWidth,
          height: boxHeight,
        });
        continue;
      }
      const side = sideFor(r, pos);
      const roundMatchesSide = matches.filter(
        (mm) => mm.round_number === r && sideFor(r, mm.position_in_round) === side,
      );
      const idx = roundMatchesSide.findIndex((mm) => mm.match_number === m.match_number);
      const count = roundMatchesSide.length;
      const totalH = count * boxHeight + (count - 1) * (verticalGap * Math.pow(2, r - 1));
      const startY = paddingY + (firstRoundHeight - totalH) / 2;
      const step = (verticalGap + boxHeight) * Math.pow(2, r - 1);
      let x: number;
      if (side === "left") {
        x = paddingX + (r - 1) * (boxWidth + roundSpacing);
      } else {
        x = totalWidth - paddingX - r * boxWidth - (r - 1) * roundSpacing;
      }
      nodes.push({
        matchNumber: m.match_number,
        round: r,
        position: pos,
        x,
        y: startY + idx * step,
        width: boxWidth,
        height: boxHeight,
      });
    }
    const height = paddingY * 2 + firstRoundHeight;
    return { width: totalWidth, height, boxWidth, boxHeight, nodes, totalRounds: rounds };
  }

  for (let r = 1; r <= rounds; r++) {
    const roundMatches = matches.filter((m) => m.round_number === r);
    const totalHeight = roundMatches.length * boxHeight + (roundMatches.length - 1) * (verticalGap * Math.pow(2, r - 1));
    const startY = paddingY + (firstRoundHeight - totalHeight) / 2;
    const step = (verticalGap + boxHeight) * Math.pow(2, r - 1);
    roundMatches.forEach((m, i) => {
      nodes.push({
        matchNumber: m.match_number,
        round: r,
        position: m.position_in_round,
        x: paddingX + (r - 1) * (boxWidth + roundSpacing),
        y: startY + i * step,
        width: boxWidth,
        height: boxHeight,
      });
    });
  }

  const width = paddingX * 2 + rounds * boxWidth + (rounds - 1) * roundSpacing;
  const height = paddingY * 2 + firstRoundHeight;
  return { width, height, boxWidth, boxHeight, nodes, totalRounds: rounds };
}


/** Return { p1SlotIdx, p2SlotIdx } for a first-round match position. */
export function firstRoundSlots(size: number, position: number): [number, number] {
  return [position * 2, position * 2 + 1];
}

/** Assign participants to first-round matches given seeding strategy. */
export function assignParticipants(
  participants: BracketParticipant[],
  size: number,
  strategy: "manual" | "random" | "seeded",
): (BracketParticipant | null)[] {
  const slots: (BracketParticipant | null)[] = Array(size).fill(null);
  if (strategy === "random") {
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(size, shuffled.length); i++) slots[i] = shuffled[i];
    return slots;
  }
  if (strategy === "seeded") {
    const order = standardSeedOrder(size); // 1-based positions
    const sorted = [...participants].sort((a, b) => (a.seed_number ?? 999) - (b.seed_number ?? 999));
    for (let i = 0; i < sorted.length; i++) {
      const slotIdx = order.indexOf(i + 1);
      if (slotIdx >= 0) slots[slotIdx] = sorted[i];
    }
    return slots;
  }
  // manual: use initial_position
  for (const p of participants) {
    if (p.initial_position >= 0 && p.initial_position < size) slots[p.initial_position] = p;
  }
  return slots;
}
