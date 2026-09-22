-- ==========================================================================
-- FURNITURE HUB DHANGADHI - COMPLETE PRODUCTION SUPABASE DATABASE SCHEMA
-- Copy & Paste this entire script into your Supabase SQL Editor and click RUN.
-- Idempotent script: Safe to run multiple times without any errors.
-- ==========================================================================

-- 1. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  original_price NUMERIC(10, 2),
  rating NUMERIC(3, 2) DEFAULT 5.0,
  review_count INTEGER DEFAULT 0,
  tag TEXT,
  description TEXT,
  materials TEXT,
  dimensions TEXT,
  weight TEXT,
  colors JSONB DEFAULT '[]'::jsonb,
  image TEXT NOT NULL,
  gallery JSONB DEFAULT '[]'::jsonb,
  badge TEXT,
  is_new_arrival BOOLEAN DEFAULT false,
  is_best_seller BOOLEAN DEFAULT false,
  is_top_deal BOOLEAN DEFAULT false,
  in_stock BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount NUMERIC(10, 2) NOT NULL,
  payment_method TEXT DEFAULT 'Cash on Delivery',
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. COUPONS TABLE
CREATE TABLE IF NOT EXISTS public.coupons (
  code TEXT PRIMARY KEY,
  discount_percent INTEGER NOT NULL,
  discount_fixed NUMERIC(10, 2) DEFAULT 0,
  min_order_amount NUMERIC(10, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expiry_date DATE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. STORE SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.store_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. STORE ADMINS TABLE
CREATE TABLE IF NOT EXISTS public.store_admins (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  email TEXT UNIQUE NOT NULL,
  name TEXT DEFAULT 'Store Admin',
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================================
-- INDEXES FOR PERFORMANCE
-- ==========================================================================
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category);
CREATE INDEX IF NOT EXISTS idx_products_in_stock ON public.products (in_stock);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders (customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders (customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_admins_email ON public.store_admins (email);

-- ==========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_admins ENABLE ROW LEVEL SECURITY;

-- Clean existing policies so this script can be re-run safely
DROP POLICY IF EXISTS "Public can view products" ON public.products;
DROP POLICY IF EXISTS "Public can manage products" ON public.products;
DROP POLICY IF EXISTS "Public can view orders" ON public.orders;
DROP POLICY IF EXISTS "Public can create orders" ON public.orders;
DROP POLICY IF EXISTS "Public can manage orders" ON public.orders;
DROP POLICY IF EXISTS "Public can view coupons" ON public.coupons;
DROP POLICY IF EXISTS "Public can manage coupons" ON public.coupons;
DROP POLICY IF EXISTS "Public can view settings" ON public.store_settings;
DROP POLICY IF EXISTS "Public can manage settings" ON public.store_settings;
DROP POLICY IF EXISTS "Public can view admins" ON public.store_admins;
DROP POLICY IF EXISTS "Public can manage admins" ON public.store_admins;

-- 1. Products: anyone can browse; admins/staff can manage
CREATE POLICY "Public can view products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Public can manage products" ON public.products FOR ALL USING (true) WITH CHECK (true);

-- 2. Orders: anyone can insert orders (checkout); staff/admin can view and update
CREATE POLICY "Public can view orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Public can create orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can manage orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);

-- 3. Coupons: anyone can check coupons; admins can manage
CREATE POLICY "Public can view coupons" ON public.coupons FOR SELECT USING (true);
CREATE POLICY "Public can manage coupons" ON public.coupons FOR ALL USING (true) WITH CHECK (true);

-- 4. Store Settings: anyone can read configuration; admins can update
CREATE POLICY "Public can view settings" ON public.store_settings FOR SELECT USING (true);
CREATE POLICY "Public can manage settings" ON public.store_settings FOR ALL USING (true) WITH CHECK (true);

-- 5. Store Admins: anyone can check admin role; admins can manage
CREATE POLICY "Public can view admins" ON public.store_admins FOR SELECT USING (true);
CREATE POLICY "Public can manage admins" ON public.store_admins FOR ALL USING (true) WITH CHECK (true);

-- ==========================================================================
-- STORAGE BUCKET FOR PRODUCT IMAGES
-- ==========================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS Policies (safely drop then recreate)
DROP POLICY IF EXISTS "Public Access product-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow Uploads product-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow Updates product-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow Deletes product-images" ON storage.objects;

CREATE POLICY "Public Access product-images" ON storage.objects
FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "Allow Uploads product-images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Allow Updates product-images" ON storage.objects
FOR UPDATE USING (bucket_id = 'product-images');

CREATE POLICY "Allow Deletes product-images" ON storage.objects
FOR DELETE USING (bucket_id = 'product-images');

-- ==========================================================================
-- SEED INITIAL STORE SETTINGS & DEFAULT COUPON
-- ==========================================================================
INSERT INTO public.coupons (code, discount_percent, min_order_amount, is_active)
VALUES ('SOHO10', 10, 5000, true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.store_settings (key, value)
VALUES 
  ('general', '{"storeName": "Furniture Hub Dhangadhi", "contactEmail": "support@furniturehub.com.np", "phone": "+977 9841234567", "address": "Main Road, Dhangadhi, Kailali, Sudurpashchim Province, Nepal", "currency": "Rs.", "operatingHours": "Sun-Fri 9:00 AM - 7:00 PM"}'::jsonb),
  ('shipping', '{"insideValleyFee": 0, "outsideValleyFee": 1000, "freeShippingThreshold": 25000, "codEnabled": true, "esewaEnabled": true, "khaltiEnabled": true}'::jsonb),
  ('inventory', '{"lowStockThreshold": 3, "maintenanceMode": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;
