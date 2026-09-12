
-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin','staff');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PRODUCTS
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Snacks',
  variant_label text,
  variant_names text[] NOT NULL DEFAULT '{}',
  pos_sell_price integer NOT NULL DEFAULT 0,
  pos_hidden boolean NOT NULL DEFAULT false,
  photo_1 text, photo_2 text, photo_3 text, photo_4 text, photo_5 text,
  photo_6 text, photo_7 text, photo_8 text, photo_9 text, photo_10 text,
  olsera_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_select_public" ON public.products FOR SELECT TO anon USING (pos_hidden = false);
CREATE POLICY "products_select_auth" ON public.products FOR SELECT TO authenticated USING (pos_hidden = false OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
CREATE POLICY "products_insert_admin" ON public.products FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "products_update_admin" ON public.products FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "products_delete_admin" ON public.products FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- MARKETING PROGRAMS
CREATE TABLE public.marketing_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'buy_x_get_y',
  active boolean NOT NULL DEFAULT true,
  buy_product_ids uuid[] NOT NULL DEFAULT '{}',
  free_product_id uuid,
  free_qty integer NOT NULL DEFAULT 1,
  free_variant text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.marketing_programs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_programs TO authenticated;
GRANT ALL ON public.marketing_programs TO service_role;
ALTER TABLE public.marketing_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mp_select_public" ON public.marketing_programs FOR SELECT TO anon USING (active = true);
CREATE POLICY "mp_select_auth" ON public.marketing_programs FOR SELECT TO authenticated USING (active = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "mp_insert_admin" ON public.marketing_programs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "mp_update_admin" ON public.marketing_programs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "mp_delete_admin" ON public.marketing_programs FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- MEMBERS
CREATE TABLE public.members (
  user_id uuid PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  name_lower text GENERATED ALWAYS AS (lower(name)) STORED,
  email text,
  phone text,
  birthdate date,
  tier text NOT NULL DEFAULT 'Classic',
  discount_rate numeric NOT NULL DEFAULT 0,
  tax_rate numeric NOT NULL DEFAULT 0.10,
  redeemable_points integer NOT NULL DEFAULT 0,
  spending_since_upgrade integer NOT NULL DEFAULT 0,
  monthly_since_upgrade integer NOT NULL DEFAULT 0,
  yearly_since_upgrade integer NOT NULL DEFAULT 0,
  upgrade_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.members TO authenticated;
GRANT ALL ON public.members TO service_role;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_select_own" ON public.members FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
CREATE POLICY "members_insert_own" ON public.members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "members_update_own" ON public.members FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "members_delete_admin" ON public.members FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.members (user_id, name, email, phone, birthdate)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name',''),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    NULLIF(NEW.raw_user_meta_data->>'birthdate','')::date
  ) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- VOUCHERS
CREATE TABLE public.vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  type text NOT NULL DEFAULT 'percent',
  value numeric NOT NULL DEFAULT 0,
  limit_per_day integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vouchers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vouchers TO authenticated;
GRANT ALL ON public.vouchers TO service_role;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vouchers_select_public" ON public.vouchers FOR SELECT TO anon USING (active = true);
CREATE POLICY "vouchers_select_auth" ON public.vouchers FOR SELECT TO authenticated USING (active = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "vouchers_insert_admin" ON public.vouchers FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "vouchers_update_admin" ON public.vouchers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "vouchers_delete_admin" ON public.vouchers FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- ORDERS
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid,
  table_name text NOT NULL DEFAULT 'Takeaway',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal integer NOT NULL DEFAULT 0,
  discount integer NOT NULL DEFAULT 0,
  tax integer NOT NULL DEFAULT 0,
  delivery_fee integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  grand_total integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  payment_method text NOT NULL DEFAULT 'cash',
  payment_status text NOT NULL DEFAULT 'none',
  proof_url text,
  voucher_id uuid REFERENCES public.vouchers(id),
  date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Jakarta')::date,
  loyalty_recorded boolean NOT NULL DEFAULT false,
  loyalty_tx_id uuid,
  phone text,
  is_member boolean NOT NULL DEFAULT false,
  olsera_order_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX orders_date_idx ON public.orders (date DESC);
CREATE INDEX orders_member_idx ON public.orders (member_id);
GRANT SELECT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_select_own_or_staff" ON public.orders FOR SELECT TO authenticated USING (member_id = auth.uid() OR public.has_role(auth.uid(),'staff') OR public.has_role(auth.uid(),'admin'));

-- ORDER STATUS HISTORY
CREATE TABLE public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.order_status_history TO authenticated;
GRANT ALL ON public.order_status_history TO service_role;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "osh_select_staff" ON public.order_status_history FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'staff') OR public.has_role(auth.uid(),'admin'));

-- VOUCHER REDEMPTIONS
CREATE TABLE public.voucher_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id uuid NOT NULL REFERENCES public.vouchers(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  table_name text,
  redeemed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.voucher_redemptions TO authenticated;
GRANT ALL ON public.voucher_redemptions TO service_role;
ALTER TABLE public.voucher_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vr_select_admin" ON public.voucher_redemptions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));

-- LOYALTY TRANSACTIONS
CREATE TABLE public.loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  amount integer NOT NULL DEFAULT 0,
  cashback integer NOT NULL DEFAULT 0,
  points_earned integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'order',
  table_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.loyalty_transactions TO authenticated;
GRANT ALL ON public.loyalty_transactions TO service_role;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lt_select_own_or_admin" ON public.loyalty_transactions FOR SELECT TO authenticated USING (member_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- STAFF PUSH TOKENS
CREATE TABLE public.staff_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'staff',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.staff_push_tokens TO authenticated;
GRANT ALL ON public.staff_push_tokens TO service_role;
ALTER TABLE public.staff_push_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spt_select_own" ON public.staff_push_tokens FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "spt_insert_own" ON public.staff_push_tokens FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND (public.has_role(auth.uid(),'staff') OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "spt_delete_own" ON public.staff_push_tokens FOR DELETE TO authenticated USING (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER TABLE public.orders REPLICA IDENTITY FULL;

-- DEMO MENU DATA
INSERT INTO public.products (name, category, variant_label, variant_names, pos_sell_price) VALUES
('Nasi Goreng Kampung','Nasi Goreng','Level',ARRAY['Mild','Spicy'],38000),
('Nasi Goreng Seafood','Nasi Goreng','Level',ARRAY['Mild','Spicy'],45000),
('Mie Goreng Jawa','Mie','Level',ARRAY['Mild','Spicy'],35000),
('Chicken Katsu Ricebowl','Ricebowl',NULL,'{}',42000),
('Beef Teriyaki Ricebowl','Ricebowl',NULL,'{}',48000),
('Truffle Fries','Snacks',NULL,'{}',32000),
('Chicken Wings','Snacks','Sauce',ARRAY['Honey Garlic','Spicy BBQ'],45000),
('Spaghetti Aglio Olio','Western',NULL,'{}',46000),
('Grilled Chicken Steak','Western',NULL,'{}',65000),
('Nasi Ayam Penyet','Nasi',NULL,'{}',40000),
('Matcha Latte','Matcha','Serve',ARRAY['Hot','Iced'],35000),
('Matcha Espresso Fusion','Matcha','Serve',ARRAY['Iced'],42000),
('Espresso','Coffee','Serve',ARRAY['Single','Double'],22000),
('Cappuccino','Coffee','Serve',ARRAY['Hot','Iced'],32000),
('Caramel Latte','Coffee','Serve',ARRAY['Hot','Iced'],38000),
('Chocolate','Non coffee','Serve',ARRAY['Hot','Iced'],32000),
('Lemon Tea','Tea & Juices','Serve',ARRAY['Hot','Iced'],25000),
('Orange Juice','Tea & Juices',NULL,'{}',30000),
('Chef Special Rendang Bowl','Special Today',NULL,'{}',55000);

INSERT INTO public.vouchers (code, type, value, limit_per_day, active) VALUES
('WELCOME10','percent',10,20,true),
('KOPI5K','fixed',5000,10,true);
