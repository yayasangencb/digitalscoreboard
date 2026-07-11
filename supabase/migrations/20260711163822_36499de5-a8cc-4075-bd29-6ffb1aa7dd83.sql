-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'operator');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Auto-create profile + role on signup (first user becomes admin)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), NEW.email);
  IF NOT EXISTS (SELECT 1 FROM public.user_roles) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'operator');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Themes
CREATE TABLE public.themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_name TEXT NOT NULL,
  primary_color TEXT NOT NULL DEFAULT '#0ea5e9',
  secondary_color TEXT NOT NULL DEFAULT '#0f172a',
  accent_color TEXT NOT NULL DEFAULT '#f97316',
  text_color TEXT NOT NULL DEFAULT '#ffffff',
  left_player_color TEXT NOT NULL DEFAULT '#ef4444',
  right_player_color TEXT NOT NULL DEFAULT '#3b82f6',
  background_url TEXT,
  logo_url TEXT,
  font_family TEXT DEFAULT 'Oswald',
  background_opacity NUMERIC DEFAULT 0.25,
  custom_css TEXT,
  is_preset BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.themes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.themes TO authenticated;
GRANT ALL ON public.themes TO service_role;
ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view themes" ON public.themes FOR SELECT USING (true);
CREATE POLICY "Authenticated create themes" ON public.themes FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by OR created_by IS NULL);
CREATE POLICY "Owner or admin update themes" ON public.themes FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner or admin delete themes" ON public.themes FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Tournaments
CREATE TABLE public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_name TEXT NOT NULL,
  organizer_name TEXT,
  venue TEXT,
  logo_url TEXT,
  poster_url TEXT,
  theme_id UUID REFERENCES public.themes(id) ON DELETE SET NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tournaments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournaments TO authenticated;
GRANT ALL ON public.tournaments TO service_role;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view tournaments" ON public.tournaments FOR SELECT USING (true);
CREATE POLICY "Authenticated create tournaments" ON public.tournaments FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Owner or admin update tournaments" ON public.tournaments FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner or admin delete tournaments" ON public.tournaments FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Matches
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE SET NULL,
  match_code TEXT NOT NULL UNIQUE,
  category TEXT,
  round_name TEXT,
  table_number TEXT,
  player_left_name TEXT NOT NULL,
  player_left_team TEXT,
  player_left_photo TEXT,
  player_right_name TEXT NOT NULL,
  player_right_team TEXT,
  player_right_photo TEXT,
  score_left INT NOT NULL DEFAULT 0 CHECK (score_left >= 0),
  score_right INT NOT NULL DEFAULT 0 CHECK (score_right >= 0),
  sets_left INT NOT NULL DEFAULT 0 CHECK (sets_left >= 0),
  sets_right INT NOT NULL DEFAULT 0 CHECK (sets_right >= 0),
  best_of INT NOT NULL DEFAULT 5,
  target_score INT NOT NULL DEFAULT 11,
  serving_player TEXT NOT NULL DEFAULT 'left',
  initial_server TEXT NOT NULL DEFAULT 'left',
  auto_rules BOOLEAN NOT NULL DEFAULT true,
  timer_mode TEXT NOT NULL DEFAULT 'stopwatch',
  timer_duration INT,
  timer_started_at TIMESTAMPTZ,
  timer_paused_at TIMESTAMPTZ,
  timer_elapsed INT NOT NULL DEFAULT 0,
  match_status TEXT NOT NULL DEFAULT 'not_started',
  winner TEXT,
  theme_id UUID REFERENCES public.themes(id) ON DELETE SET NULL,
  notes TEXT,
  operator_id UUID,
  created_by UUID NOT NULL,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.matches TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.matches TO authenticated;
GRANT ALL ON public.matches TO service_role;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view matches" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Authenticated create matches" ON public.matches FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Owner or admin update matches" ON public.matches FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner or admin delete matches" ON public.matches FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_matches_code ON public.matches (match_code);
CREATE INDEX idx_matches_status ON public.matches (match_status);

-- Match sets (history per set)
CREATE TABLE public.match_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  set_number INT NOT NULL,
  score_left INT NOT NULL DEFAULT 0,
  score_right INT NOT NULL DEFAULT 0,
  winner TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_id, set_number)
);
GRANT SELECT ON public.match_sets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_sets TO authenticated;
GRANT ALL ON public.match_sets TO service_role;
ALTER TABLE public.match_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view match sets" ON public.match_sets FOR SELECT USING (true);
CREATE POLICY "Match owner writes sets" ON public.match_sets FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id AND (m.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
CREATE POLICY "Match owner updates sets" ON public.match_sets FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id AND (m.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
CREATE POLICY "Match owner deletes sets" ON public.match_sets FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id AND (m.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

-- Score events (audit log)
CREATE TABLE public.score_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  previous_value TEXT,
  new_value TEXT,
  player_side TEXT,
  operator_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.score_events TO authenticated;
GRANT ALL ON public.score_events TO service_role;
ALTER TABLE public.score_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view score events" ON public.score_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated log score events" ON public.score_events FOR INSERT TO authenticated WITH CHECK (operator_id = auth.uid());

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_matches_updated BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_themes_updated BEFORE UPDATE ON public.themes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tournaments_updated BEFORE UPDATE ON public.tournaments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_sets;
ALTER TABLE public.matches REPLICA IDENTITY FULL;

-- Preset themes
INSERT INTO public.themes (theme_name, primary_color, secondary_color, accent_color, text_color, left_player_color, right_player_color, font_family, is_preset) VALUES
('Modern Sport', '#06b6d4', '#0b1220', '#f97316', '#ffffff', '#f43f5e', '#3b82f6', 'Oswald', true),
('Dark Tournament', '#eab308', '#09090b', '#ef4444', '#fafafa', '#ef4444', '#eab308', 'Oswald', true),
('Light Tournament', '#0284c7', '#f1f5f9', '#ea580c', '#0f172a', '#dc2626', '#2563eb', 'Oswald', true),
('Merah Putih', '#dc2626', '#1c1917', '#fbbf24', '#ffffff', '#dc2626', '#f8fafc', 'Oswald', true),
('Biru Profesional', '#2563eb', '#0c1a33', '#38bdf8', '#ffffff', '#f59e0b', '#38bdf8', 'Oswald', true);