-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'responder');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'NariRide user',
  phone text NOT NULL DEFAULT '',
  home_label text NOT NULL DEFAULT 'Home',
  work_label text NOT NULL DEFAULT 'Work',
  active_mode text NOT NULL DEFAULT 'passenger',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, 'NariRide user'), '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Driver profiles
CREATE TABLE public.driver_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  gender text NOT NULL DEFAULT 'female',
  vehicle_type text NOT NULL DEFAULT 'Bike',
  vehicle_model text NOT NULL DEFAULT '',
  vehicle_number text NOT NULL DEFAULT '',
  licence_number text NOT NULL DEFAULT '',
  women_only boolean NOT NULL DEFAULT true,
  docs jsonb NOT NULL DEFAULT '{}'::jsonb,
  verification text NOT NULL DEFAULT 'DRAFT',
  rating numeric NOT NULL DEFAULT 4.9,
  online boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.driver_profiles TO authenticated;
GRANT ALL ON public.driver_profiles TO service_role;
ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own driver profile" ON public.driver_profiles FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER driver_profiles_touch BEFORE UPDATE ON public.driver_profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Trusted contacts
CREATE TABLE public.trusted_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  relationship text NOT NULL DEFAULT 'Family',
  notify_on_deviation boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trusted_contacts TO authenticated;
GRANT ALL ON public.trusted_contacts TO service_role;
ALTER TABLE public.trusted_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own contacts" ON public.trusted_contacts FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Live ride matches
CREATE TABLE public.ride_matches (
  ride_id text PRIMARY KEY,
  passenger_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  passenger_name text NOT NULL DEFAULT 'Passenger',
  passenger_phone text NOT NULL DEFAULT '',
  pickup jsonb NOT NULL,
  dropoff jsonb NOT NULL,
  distance_km numeric NOT NULL DEFAULT 0,
  fare numeric NOT NULL DEFAULT 0,
  eta_minutes integer NOT NULL DEFAULT 0,
  trusted_journey boolean NOT NULL DEFAULT false,
  pin text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'REQUESTED',
  partner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  partner jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ride_matches TO authenticated;
GRANT ALL ON public.ride_matches TO service_role;
ALTER TABLE public.ride_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "passenger manages own rides" ON public.ride_matches FOR ALL TO authenticated
  USING (passenger_id = auth.uid()) WITH CHECK (passenger_id = auth.uid());

CREATE POLICY "verified drivers see open requests" ON public.ride_matches FOR SELECT TO authenticated
  USING (
    partner_id = auth.uid()
    OR (
      status = 'REQUESTED' AND partner_id IS NULL
      AND EXISTS (
        SELECT 1 FROM public.driver_profiles d
        WHERE d.user_id = auth.uid() AND d.verification = 'APPROVED' AND d.online
      )
    )
  );

CREATE POLICY "drivers claim and progress rides" ON public.ride_matches FOR UPDATE TO authenticated
  USING (
    partner_id = auth.uid()
    OR (
      status = 'REQUESTED' AND partner_id IS NULL
      AND EXISTS (
        SELECT 1 FROM public.driver_profiles d
        WHERE d.user_id = auth.uid() AND d.verification = 'APPROVED' AND d.online
      )
    )
  )
  WITH CHECK (partner_id = auth.uid());

CREATE TRIGGER ride_matches_touch BEFORE UPDATE ON public.ride_matches FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX ride_matches_open_idx ON public.ride_matches (status, created_at DESC);
ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_matches;
ALTER TABLE public.ride_matches REPLICA IDENTITY FULL;

-- SOS incidents
CREATE TABLE public.sos_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id text,
  passenger_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  passenger_name text NOT NULL DEFAULT 'Passenger',
  passenger_phone text NOT NULL DEFAULT '',
  driver jsonb,
  location jsonb,
  pickup_label text NOT NULL DEFAULT '',
  destination_label text NOT NULL DEFAULT '',
  risk_score integer NOT NULL DEFAULT 0,
  risk_level text NOT NULL DEFAULT 'CRITICAL',
  status text NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sos_incidents TO authenticated;
GRANT ALL ON public.sos_incidents TO service_role;
ALTER TABLE public.sos_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "passenger manages own incidents" ON public.sos_incidents FOR ALL TO authenticated
  USING (passenger_id = auth.uid()) WITH CHECK (passenger_id = auth.uid());
CREATE POLICY "assigned driver sees incident" ON public.sos_incidents FOR SELECT TO authenticated
  USING (partner_id = auth.uid());
CREATE POLICY "responders read incidents" ON public.sos_incidents FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'responder') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "responders update incidents" ON public.sos_incidents FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'responder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'responder') OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER sos_incidents_touch BEFORE UPDATE ON public.sos_incidents FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_incidents;
ALTER TABLE public.sos_incidents REPLICA IDENTITY FULL;

-- Payouts
CREATE TABLE public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  trip_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  method text NOT NULL DEFAULT 'UPI',
  reference text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'PROCESSING',
  requested_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payouts TO authenticated;
GRANT ALL ON public.payouts TO service_role;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own payouts" ON public.payouts FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());