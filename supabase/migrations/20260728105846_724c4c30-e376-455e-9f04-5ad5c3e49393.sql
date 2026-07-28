-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'member');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- TIMESTAMP HELPER
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- CATEGORIES
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon;
GRANT SELECT ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories are publicly readable" ON public.categories FOR SELECT TO anon, authenticated USING (true);

-- PRODUCTS
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  image_url TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  in_stock BOOLEAN NOT NULL DEFAULT true,
  featured BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active products are publicly readable" ON public.products FOR SELECT TO anon, authenticated USING (active = true);
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  phone TEXT,
  delivery_address TEXT,
  member_number TEXT NOT NULL DEFAULT ('ML-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Members can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Members can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ORDERS
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'out_for_delivery', 'completed', 'cancelled');

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reference TEXT NOT NULL UNIQUE DEFAULT ('ML' || to_char(now(), 'YYMMDD') || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 5))),
  status public.order_status NOT NULL DEFAULT 'pending',
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_address TEXT NOT NULL,
  contact_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.orders TO authenticated;
GRANT UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view their own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Members can create their own orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff can update orders" ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view their own order items" ON public.order_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')))
);
CREATE POLICY "Members can add items to their own orders" ON public.order_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
);

CREATE INDEX idx_orders_user ON public.orders(user_id, created_at DESC);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_products_category ON public.products(category_id);

-- SEED CATEGORIES
INSERT INTO public.categories (slug, name, description, sort_order) VALUES
  ('flower', 'Flower', 'Hand-selected indoor and greenhouse buds, cured for character.', 1),
  ('pre-rolls', 'Pre-Rolls', 'Ready to spark. Rolled from the same top-shelf flower.', 2),
  ('concentrates', 'Concentrates', 'Glassy, potent extracts for the connoisseur.', 3),
  ('edibles', 'Edibles', 'Precisely dosed treats from the More Life kitchen.', 4),
  ('drinks', 'Drinks', 'Craft sodas for a slower, brighter afternoon.', 5),
  ('essentials', 'Essentials', 'The small things that make the session effortless.', 6);

-- SEED PRODUCTS
INSERT INTO public.products (slug, name, tagline, description, price, image_url, category_id, featured, sort_order)
SELECT v.slug, v.name, v.tagline, v.description, v.price, v.image_url, c.id, v.featured, v.sort_order
FROM (VALUES
  ('end-game', 'End Game Flower', 'Bold, complex, high-impact', 'The ultimate finale for a long day. Dense, resin-heavy buds with a deep, layered nose and a finish that settles everything down.', 40.00, 'https://www.morelifemembers.co.za/cdn/shop/files/Gemini_Generated_Image_gj4hnngj4hnngj4h.png?v=1777963400&width=1100', 'flower', true, 1),
  ('exodus-cheese', 'Exodus Cheese', 'Bold, funky, unmistakably classic', 'Vintage UK soul straight to Cape Town. A pungent, savoury nose and a lifted, sociable effect.', 50.00, 'https://www.morelifemembers.co.za/cdn/shop/files/1_d806bdb0-61c0-46a6-a70c-783ddeaa5194.png?v=1777450126&width=1100', 'flower', false, 2),
  ('indoor-aaa', 'Indoor AAA', 'Crisp, refined, top-tier', 'The gold standard of precision cultivation. Tight, frosted structure and a clean, balanced smoke.', 50.00, 'https://www.morelifemembers.co.za/cdn/shop/files/4_f542a617-5815-40d1-9130-a6d40d989a44.png?v=1777450544&width=1100', 'flower', true, 3),
  ('indoor-aaa-cosmic-candy', 'Indoor AAA — Cosmic Candy', 'Frosty, astronomical, sweet with resin', 'A premium indoor-grown masterpiece. Sugary terpenes over a thick trichome coat.', 70.00, 'https://www.morelifemembers.co.za/cdn/shop/files/Gemini_Generated_Image_m5x4hsm5x4hsm5x4.png?v=1781255592&width=1100', 'flower', true, 4),
  ('indoor-aaa-lemon-cookies', 'Indoor AAA — Lemon Cookies', 'Sharp, velvety, baked to perfection', 'A premium indoor hybrid that hits bright on the inhale and settles soft and doughy on the exhale.', 70.00, 'https://www.morelifemembers.co.za/cdn/shop/files/Gemini_Generated_Image_w10qlpw10qlpw10q.png?v=1781255592&width=1100', 'flower', false, 5),
  ('indoor-aaa-papaya', 'Indoor AAA — Papaya', 'Lush, tropical, heavily frosted', 'A top-tier indoor indica that smells exactly like the fruit it is named for. Deeply relaxing.', 70.00, 'https://www.morelifemembers.co.za/cdn/shop/files/Gemini_Generated_Image_pb6chmpb6chmpb6c.png?v=1781255592&width=1100', 'flower', false, 6),
  ('indoor-aaa-pink-cookie', 'Indoor AAA — Pink Cookie', 'Decadent, frosty, beautifully complex', 'A premium indoor hybrid pairing sweet bakery notes with a soft floral finish.', 70.00, 'https://www.morelifemembers.co.za/cdn/shop/files/Gemini_Generated_Image_ejhhauejhhauejhh.png?v=1781255591&width=1100', 'flower', false, 7),
  ('indoor-aaa-rainbow-cookies', 'Indoor AAA — Rainbow Cookies', 'Vibrant, colourful, insanely sweet', 'A premium indoor hybrid with a candy-shop nose and a bright, easy lift.', 70.00, 'https://www.morelifemembers.co.za/cdn/shop/files/Gemini_Generated_Image_evn66zevn66zevn6.png?v=1781255591&width=1100', 'flower', false, 8),
  ('persian-pie', 'Persian Pie', 'Exotic, high-powered, deeply rich', 'A stunning combination of lemon-pastry sweetness and heavy, grounding body.', 50.00, 'https://www.morelifemembers.co.za/cdn/shop/files/Gemini_Generated_Image_v5svydv5svydv5sv.png?v=1781256799&width=1100', 'flower', false, 9),
  ('cheese-pre-roll', 'Cheese Pre-Roll', 'Effortless, punchy, ready to go', 'Captures the raw essence of the Cheese line in a perfectly packed cone.', 30.00, 'https://www.morelifemembers.co.za/cdn/shop/files/1_c9e1a72f-7b56-431e-a29f-471404f3b32e.png?v=1777453382&width=1100', 'pre-rolls', false, 1),
  ('end-game-pre-roll', 'End Game Pre-Roll', 'Powerful, sharp, ready to spark', 'A premium, high-impact finish rolled from End Game flower.', 40.00, 'https://www.morelifemembers.co.za/cdn/shop/files/Gemini_Generated_Image_g50f0lg50f0lg50f.png?v=1777985358&width=1100', 'pre-rolls', false, 2),
  ('more-life-pre-roll', 'More Life Pre-Roll', 'Smooth, upbeat, undeniably elite', 'An absolute club favourite, hand-selected by the More Life team.', 60.00, 'https://www.morelifemembers.co.za/cdn/shop/files/Gemini_Generated_Image_hpvinshpvinshpvi.png?v=1781256022&width=1100', 'pre-rolls', true, 3),
  ('orange-kush-pre-roll', 'Orange Kush Pre-Roll', 'Zesty, bright, effortlessly smooth', 'A burst of sun-drenched citrus over a soft kush base.', 60.00, 'https://www.morelifemembers.co.za/cdn/shop/files/2_73a47d35-c737-41fa-9922-af9728118adb.png?v=1777453541&width=1100', 'pre-rolls', false, 4),
  ('dab-shatter', 'Dab Shatter', 'Glassy, pure, intensely focused', 'A hard-hitting, golden concentration of raw power. For experienced members only.', 200.00, 'https://www.morelifemembers.co.za/cdn/shop/files/dab.png?v=1779952921&width=1100', 'concentrates', false, 1),
  ('candy-bones-50mg', 'Candy Cloud Bone 50mg', 'Playful, potent, dreamily soft', 'A high-impact 50mg punch in a pillowy, nostalgic sweet.', 40.00, 'https://www.morelifemembers.co.za/cdn/shop/files/1_420f7ec1-9363-4c02-bb2b-dc90428877e7.png?v=1778135933&width=1100', 'edibles', false, 1),
  ('candy-hearts-30mg', 'Candy Cloud Heart 30mg', 'Soft, dreamy, whimsical', 'A sweet escape in every bite, dosed at a comfortable 30mg.', 35.00, 'https://www.morelifemembers.co.za/cdn/shop/files/2_afce5bf9-84de-4d0f-a432-9901c75335f8.png?v=1778136046&width=1100', 'edibles', false, 2),
  ('candy-squares-20mg', 'Candy Cloud Square 20mg', 'Clean, classic, perfectly balanced', 'A soft, airy texture with a gentle 20mg lift. The easiest place to start.', 25.00, 'https://www.morelifemembers.co.za/cdn/shop/files/3_9ec03e44-46c0-4677-b8d5-3ee11c18a946.png?v=1778136062&width=1100', 'edibles', true, 3),
  ('sodaze-gummies-grape', 'Sodaze Gummies — Grape', 'Lush, bold, incredibly smooth', 'A deep, vine-ripened sweetness in a beautifully consistent chew.', 170.00, 'https://www.morelifemembers.co.za/cdn/shop/files/Untihhhtleddesign.png?v=1778005670&width=1100', 'edibles', false, 4),
  ('sodaze-gummies-tropical', 'Sodaze Gummies — Tropical', 'Sun-drenched, vibrant, smooth', 'A bright burst of exotic fruit with a clean, even finish.', 170.00, 'https://www.morelifemembers.co.za/cdn/shop/files/Gemini_Generated_Image_mafgx9mafgx9mafg.png?v=1778005179&width=1100', 'edibles', false, 5),
  ('sodaze-fudge', 'Sodaze Fudge', 'Rich, indulgent, effortlessly smooth', 'The ultimate treat for a slow-paced moment.', 70.00, 'https://www.morelifemembers.co.za/cdn/shop/files/Gemini_Generated_Image_ozntaqozntaqoznt.png?v=1777989579&width=1100', 'edibles', false, 6),
  ('sodaze-craft-soda-cherry-pop', 'Sodaze Craft Soda — Cherry Pop', 'Vibrant, bubbly, nostalgic', 'A crisp, effervescent twist on a classic favourite.', 55.00, 'https://www.morelifemembers.co.za/cdn/shop/files/Gemini_Generated_Image_gfldk3gfldk3gfld.png?v=1778006284&width=1100', 'drinks', false, 1),
  ('sodaze-craft-soda-watermelon-jungle', 'Sodaze Craft Soda — Watermelon Jungle', 'Crisp, wild, deeply refreshing', 'A juicy, sun-ripened watermelon note with a clean, dry finish.', 70.00, 'https://www.morelifemembers.co.za/cdn/shop/files/Gemini_Generated_Image_hmh6vnhmh6vnhmh6.png?v=1778065625&width=1100', 'drinks', false, 2),
  ('raw-roll-paper', 'RAW Rolling Paper', 'Natural, unrefined, purely authentic', 'The foundation of a clean smoke. Unbleached and slow-burning.', 45.00, 'https://www.morelifemembers.co.za/cdn/shop/files/raw-classic-1-1-4-rolling-papers-rolling-papers-esd-official-33537081376906_2048x_cd575c41-1d3c-4245-9a2c-610fb8e8ee5d_grande_jpg.webp?v=1777987074&width=1100', 'essentials', false, 1),
  ('lighter', 'Lighter', 'Simple, reliable, ready when you are', 'The everyday essential that never lets you down.', 10.00, 'https://www.morelifemembers.co.za/cdn/shop/files/Bic-Lighter-Maxi-Black_jpg.webp?v=1777985465&width=1100', 'essentials', false, 2)
) AS v(slug, name, tagline, description, price, image_url, category_slug, featured, sort_order)
JOIN public.categories c ON c.slug = v.category_slug;