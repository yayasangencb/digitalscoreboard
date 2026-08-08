import { supabase } from "@/integrations/supabase/client";

/**
 * Sinkronisasi dua arah antara scoreboard (`matches`) dan bagan (`bracket_*`).
 */

/** Perbarui semua pertandingan scoreboard yang memakai peserta ini (semua babak). */
export async function syncParticipantToMatches(participantId: string) {
  const { data: p } = await supabase
    .from("bracket_participants")
    .select("id, name, team, photo_url")
    .eq("id", participantId)
    .maybeSingle();
  if (!p) return;

  const { data: bms } = await supabase
    .from("bracket_matches")
    .select("id, player_one_id, player_two_id, scoreboard_match_id")
    .or(`player_one_id.eq.${participantId},player_two_id.eq.${participantId}`);

  await Promise.all(
    (bms ?? [])
      .filter((bm) => bm.scoreboard_match_id)
      .map((bm) =>
        supabase
          .from("matches")
          .update(
            bm.player_one_id === participantId
              ? { player_left_name: p.name, player_left_team: p.team, player_left_photo: p.photo_url }
              : { player_right_name: p.name, player_right_team: p.team, player_right_photo: p.photo_url },
          )
          .eq("id", bm.scoreboard_match_id!),
      ),
  );
}

/** Perbarui peserta bagan ketika nama/tim diedit dari pertandingan scoreboard. */
export async function syncMatchToBracket(
  matchId: string,
  values: {
    player_left_name: string;
    player_left_team: string | null;
    player_left_photo: string | null;
    player_right_name: string;
    player_right_team: string | null;
    player_right_photo: string | null;
  },
) {
  const { data: bm } = await supabase
    .from("bracket_matches")
    .select("id, player_one_id, player_two_id")
    .eq("scoreboard_match_id", matchId)
    .maybeSingle();
  if (!bm) return false;

  const jobs: PromiseLike<unknown>[] = [];
  if (bm.player_one_id) {
    jobs.push(
      supabase
        .from("bracket_participants")
        .update({
          name: values.player_left_name,
          team: values.player_left_team,
          photo_url: values.player_left_photo,
        })
        .eq("id", bm.player_one_id),
    );
  }
  if (bm.player_two_id) {
    jobs.push(
      supabase
        .from("bracket_participants")
        .update({
          name: values.player_right_name,
          team: values.player_right_team,
          photo_url: values.player_right_photo,
        })
        .eq("id", bm.player_two_id),
    );
  }
  await Promise.all(jobs);

  // teruskan ke pertandingan lain (babak berikutnya) yang memakai peserta yang sama
  await Promise.all(
    [bm.player_one_id, bm.player_two_id].filter(Boolean).map((pid) => syncParticipantToMatches(pid!)),
  );
  return true;
}

/** Hapus bagan beserta pertandingan scoreboard yang terhubung. */
export async function deleteBracketCascade(bracketId: string) {
  const { data: bms } = await supabase
    .from("bracket_matches")
    .select("scoreboard_match_id")
    .eq("bracket_id", bracketId);
  const matchIds = (bms ?? []).map((b) => b.scoreboard_match_id).filter(Boolean) as string[];

  const { error } = await supabase.from("brackets").delete().eq("id", bracketId);
  if (error) return { error };

  if (matchIds.length) {
    const { error: mErr } = await supabase.from("matches").delete().in("id", matchIds);
    if (mErr) return { error: mErr };
  }
  return { error: null };
}

/**
 * Sinkronkan status/skor pertandingan scoreboard ke bagan.
 * Ketika pertandingan selesai, pemenang otomatis diteruskan ke babak berikutnya.
 */
export async function syncScoreboardMatchToBracket(matchId: string) {
  const { data: m } = await supabase
    .from("matches")
    .select("id, sets_left, sets_right, match_status, winner, player_left_name, player_right_name")
    .eq("id", matchId)
    .maybeSingle();
  if (!m) return;

  const { data: bm } = await supabase
    .from("bracket_matches")
    .select("*")
    .eq("scoreboard_match_id", matchId)
    .maybeSingle();
  if (!bm) return;

  const finished = m.match_status === "finished";
  let winnerId: string | null = null;
  if (finished) {
    if (m.winner) {
      if (m.winner === m.player_left_name) winnerId = bm.player_one_id;
      else if (m.winner === m.player_right_name) winnerId = bm.player_two_id;
    }
    if (!winnerId && m.sets_left !== m.sets_right) {
      winnerId = m.sets_left > m.sets_right ? bm.player_one_id : bm.player_two_id;
    }
  }

  await supabase
    .from("bracket_matches")
    .update({
      score_player_one: m.sets_left,
      score_player_two: m.sets_right,
      winner_id: winnerId,
      match_status: finished ? "finished" : m.match_status === "in_progress" ? "in_progress" : bm.match_status,
    })
    .eq("id", bm.id);

  if (bm.bracket_id) {
    await reconcileBracketProgression(bm.bracket_id);
  }
}

/**
 * Rekonsiliasi seluruh bagan untuk auto-advance BYE dan pemenang pertandingan aktif.
 * Sangat berguna untuk skenario ganjil (seperti 3 tim: A vs B, C menunggu)
 * di mana pemenang A vs B otomatis mengisi slot babak berikutnya menggantikan TBD.
 */
export async function reconcileBracketProgression(bracketId: string) {
  const [{ data: matches }, { data: participants }] = await Promise.all([
    supabase
      .from("bracket_matches")
      .select("*")
      .eq("bracket_id", bracketId)
      .order("round_number", { ascending: true })
      .order("match_number", { ascending: true }),
    supabase.from("bracket_participants").select("*").eq("bracket_id", bracketId),
  ]);

  if (!matches || matches.length === 0) return;

  const partMap = new Map(participants?.map((p) => [p.id, p]) ?? []);
  let changed = false;

  for (const m of matches) {
    // 1. Jika terhubung ke scoreboard match, perbarui skor dan winner_id jika pertandingan telah selesai/berlangsung
    if (m.scoreboard_match_id) {
      const { data: sbMatch } = await supabase
        .from("matches")
        .select("id, sets_left, sets_right, match_status, winner, player_left_name, player_right_name")
        .eq("id", m.scoreboard_match_id)
        .maybeSingle();

      if (sbMatch) {
        const finished = sbMatch.match_status === "finished";
        let winnerId: string | null = null;
        if (finished) {
          if (sbMatch.winner) {
            if (sbMatch.winner === sbMatch.player_left_name) winnerId = m.player_one_id;
            else if (sbMatch.winner === sbMatch.player_right_name) winnerId = m.player_two_id;
          }
          if (!winnerId && sbMatch.sets_left !== sbMatch.sets_right) {
            winnerId = sbMatch.sets_left > sbMatch.sets_right ? m.player_one_id : m.player_two_id;
          }
        }

        const nextStatus = finished ? "finished" : sbMatch.match_status === "in_progress" ? "in_progress" : m.match_status;
        if (
          m.score_player_one !== sbMatch.sets_left ||
          m.score_player_two !== sbMatch.sets_right ||
          m.winner_id !== winnerId ||
          m.match_status !== nextStatus
        ) {
          m.score_player_one = sbMatch.sets_left;
          m.score_player_two = sbMatch.sets_right;
          m.winner_id = winnerId;
          m.match_status = nextStatus;

          await supabase
            .from("bracket_matches")
            .update({
              score_player_one: m.score_player_one,
              score_player_two: m.score_player_two,
              winner_id: m.winner_id,
              match_status: m.match_status,
            })
            .eq("id", m.id);

          changed = true;
        }
      }
    }

    // 2. BYE check: Jika hanya 1 peserta di babak ini (peserta lain null) dan match belum finished
    if (!m.winner_id && ((m.player_one_id && !m.player_two_id) || (!m.player_one_id && m.player_two_id))) {
      const byeWinner = m.player_one_id ?? m.player_two_id;
      if (byeWinner) {
        m.winner_id = byeWinner;
        m.match_status = "finished";
        await supabase
          .from("bracket_matches")
          .update({ winner_id: byeWinner, match_status: "finished" })
          .eq("id", m.id);
        changed = true;
      }
    }

    // 3. Teruskan pemenang ke babak berikutnya (next_match_id)
    if (m.winner_id && m.next_match_id) {
      const nextM = matches.find((nm) => nm.id === m.next_match_id);
      if (nextM) {
        const isTop = m.next_match_position === "top";
        const currentTargetId = isTop ? nextM.player_one_id : nextM.player_two_id;
        if (currentTargetId !== m.winner_id) {
          if (isTop) nextM.player_one_id = m.winner_id;
          else nextM.player_two_id = m.winner_id;

          await supabase
            .from("bracket_matches")
            .update(isTop ? { player_one_id: m.winner_id } : { player_two_id: m.winner_id })
            .eq("id", nextM.id);

          changed = true;

          // Jika pertandingan babak berikutnya sudah punya scoreboard match, update nama pemainnya
          if (nextM.scoreboard_match_id) {
            const winner = partMap.get(m.winner_id);
            if (winner) {
              await supabase
                .from("matches")
                .update(
                  isTop
                    ? { player_left_name: winner.name, player_left_team: winner.team, player_left_photo: winner.photo_url }
                    : { player_right_name: winner.name, player_right_team: winner.team, player_right_photo: winner.photo_url },
                )
                .eq("id", nextM.scoreboard_match_id);
            }
          }
        }
      }
    }
  }

  if (changed) {
    await reconcileBracketProgression(bracketId);
  }
}

