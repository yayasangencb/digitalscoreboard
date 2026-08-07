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

  const jobs: Promise<unknown>[] = [];
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
