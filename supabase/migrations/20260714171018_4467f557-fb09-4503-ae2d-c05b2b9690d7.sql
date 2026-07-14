
-- brackets
CREATE TABLE public.brackets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT,
  bracket_type TEXT NOT NULL DEFAULT 'single_elimination',
  participant_count INTEGER NOT NULL DEFAULT 8,
  theme_id UUID REFERENCES public.themes(id) ON DELETE SET NULL,
  background_url TEXT,
  logo_url TEXT,
  animation_type TEXT NOT NULL DEFAULT 'slide',
  animation_speed NUMERIC NOT NULL DEFAULT 1,
  line_animation TEXT NOT NULL DEFAULT 'draw',
  auto_tour_enabled BOOLEAN NOT NULL DEFAULT false,
  display_mode TEXT NOT NULL DEFAULT 'info',
  show_scores BOOLEAN NOT NULL DEFAULT true,
  show_photos BOOLEAN NOT NULL DEFAULT false,
  show_team_logos BOOLEAN NOT NULL DEFAULT false,
  round_spacing INTEGER NOT NULL DEFAULT 220,
  line_thickness INTEGER NOT NULL DEFAULT 2,
  box_color TEXT,
  scheduled_date DATE,
  location TEXT,
  table_count INTEGER,
  operator_name TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.brackets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brackets TO authenticated;
GRANT ALL ON public.brackets TO service_role;
ALTER TABLE public.brackets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brackets public read" ON public.brackets FOR SELECT USING (true);
CREATE POLICY "brackets owner insert" ON public.brackets FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "brackets owner update" ON public.brackets FOR UPDATE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin')) WITH CHECK (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "brackets owner delete" ON public.brackets FOR DELETE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_brackets_updated_at BEFORE UPDATE ON public.brackets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- bracket_participants
CREATE TABLE public.bracket_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bracket_id UUID NOT NULL REFERENCES public.brackets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  team TEXT,
  photo_url TEXT,
  seed_number INTEGER,
  initial_position INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bracket_participants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bracket_participants TO authenticated;
GRANT ALL ON public.bracket_participants TO service_role;
ALTER TABLE public.bracket_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bp public read" ON public.bracket_participants FOR SELECT USING (true);
CREATE POLICY "bp owner write" ON public.bracket_participants FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.brackets b WHERE b.id = bracket_id AND (b.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.brackets b WHERE b.id = bracket_id AND (b.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
CREATE TRIGGER trg_bp_updated_at BEFORE UPDATE ON public.bracket_participants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_bp_bracket ON public.bracket_participants(bracket_id);

-- bracket_matches
CREATE TABLE public.bracket_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bracket_id UUID NOT NULL REFERENCES public.brackets(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  match_number INTEGER NOT NULL,
  position_in_round INTEGER NOT NULL,
  player_one_id UUID REFERENCES public.bracket_participants(id) ON DELETE SET NULL,
  player_two_id UUID REFERENCES public.bracket_participants(id) ON DELETE SET NULL,
  score_player_one INTEGER,
  score_player_two INTEGER,
  winner_id UUID REFERENCES public.bracket_participants(id) ON DELETE SET NULL,
  next_match_id UUID REFERENCES public.bracket_matches(id) ON DELETE SET NULL,
  next_match_position TEXT,
  scoreboard_match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  table_number INTEGER,
  scheduled_at TIMESTAMPTZ,
  match_status TEXT NOT NULL DEFAULT 'not_started',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bracket_matches TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bracket_matches TO authenticated;
GRANT ALL ON public.bracket_matches TO service_role;
ALTER TABLE public.bracket_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bm public read" ON public.bracket_matches FOR SELECT USING (true);
CREATE POLICY "bm owner write" ON public.bracket_matches FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.brackets b WHERE b.id = bracket_id AND (b.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.brackets b WHERE b.id = bracket_id AND (b.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
CREATE TRIGGER trg_bm_updated_at BEFORE UPDATE ON public.bracket_matches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_bm_bracket ON public.bracket_matches(bracket_id);
CREATE INDEX idx_bm_next ON public.bracket_matches(next_match_id);

-- bracket_display_sessions
CREATE TABLE public.bracket_display_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bracket_id UUID NOT NULL REFERENCES public.brackets(id) ON DELETE CASCADE,
  session_code TEXT NOT NULL UNIQUE,
  current_focus TEXT,
  current_round INTEGER,
  animation_status TEXT NOT NULL DEFAULT 'idle',
  zoom_level NUMERIC NOT NULL DEFAULT 1,
  pan_x NUMERIC NOT NULL DEFAULT 0,
  pan_y NUMERIC NOT NULL DEFAULT 0,
  display_mode TEXT NOT NULL DEFAULT 'info',
  last_updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bracket_display_sessions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bracket_display_sessions TO authenticated;
GRANT ALL ON public.bracket_display_sessions TO service_role;
ALTER TABLE public.bracket_display_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bds public read" ON public.bracket_display_sessions FOR SELECT USING (true);
CREATE POLICY "bds auth write" ON public.bracket_display_sessions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.brackets b WHERE b.id = bracket_id AND (b.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.brackets b WHERE b.id = bracket_id AND (b.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
CREATE TRIGGER trg_bds_updated_at BEFORE UPDATE ON public.bracket_display_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.brackets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bracket_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bracket_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bracket_display_sessions;
