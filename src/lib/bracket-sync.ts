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
    .select("id, sets_left, sets_right, match_status")
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
  const winnerId =
    finished && m.sets_left !== m.sets_right
      ? m.sets_left > m.sets_right
        ? bm.player_one_id
        : bm.player_two_id
      : null;

  await supabase
    .from("bracket_matches")
    .update({
      score_player_one: m.sets_left,
      score_player_two: m.sets_right,
      winner_id: winnerId,
      match_status: finished ? "finished" : m.match_status === "in_progress" ? "in_progress" : bm.match_status,
    })
    .eq("id", bm.id);

  if (!finished || !winnerId || !bm.next_match_id) return;

  const patch =
    bm.next_match_position === "top" ? { player_one_id: winnerId } : { player_two_id: winnerId };
  await supabase.from("bracket_matches").update(patch).eq("id", bm.next_match_id);

  // teruskan nama pemenang ke scoreboard babak berikutnya (jika sudah dibuat)
  const [{ data: winner }, { data: next }] = await Promise.all([
    supabase.from("bracket_participants").select("name, team, photo_url").eq("id", winnerId).maybeSingle(),
    supabase.from("bracket_matches").select("scoreboard_match_id").eq("id", bm.next_match_id).maybeSingle(),
  ]);
  if (winner && next?.scoreboard_match_id) {
    await supabase
      .from("matches")
      .update(
        bm.next_match_position === "top"
          ? { player_left_name: winner.name, player_left_team: winner.team, player_left_photo: winner.photo_url }
          : { player_right_name: winner.name, player_right_team: winner.team, player_right_photo: winner.photo_url },
      )
      .eq("id", next.scoreboard_match_id);
  }
}
