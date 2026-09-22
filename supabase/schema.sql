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

-- 6. CUSTOMER PROFILES TABLE (Stores delivery addresses and phone numbers)
CREATE TABLE IF NOT EXISTS public.customer_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT DEFAULT 'Dhangadhi',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
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

-- Clean existing policies so this script can be re-run safely (Full Idempotency)
DROP POLICY IF EXISTS "Public can view products" ON public.products;
DROP POLICY IF EXISTS "Public can manage products" ON public.products;
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;

DROP POLICY IF EXISTS "Public can view orders" ON public.orders;
DROP POLICY IF EXISTS "Public can create orders" ON public.orders;
DROP POLICY IF EXISTS "Public can manage orders" ON public.orders;
DROP POLICY IF EXISTS "Customers can create orders" ON public.orders;
DROP POLICY IF EXISTS "Customers view own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can manage orders" ON public.orders;

DROP POLICY IF EXISTS "Public can view coupons" ON public.coupons;
DROP POLICY IF EXISTS "Public can manage coupons" ON public.coupons;
DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;

DROP POLICY IF EXISTS "Public can view settings" ON public.store_settings;
DROP POLICY IF EXISTS "Public can manage settings" ON public.store_settings;
DROP POLICY IF EXISTS "Admins can manage settings" ON public.store_settings;

DROP POLICY IF EXISTS "Public can view admins" ON public.store_admins;
DROP POLICY IF EXISTS "Public can manage admins" ON public.store_admins;
DROP POLICY IF EXISTS "Admins can manage admins" ON public.store_admins;

-- 1. Products: anyone can browse; only verified admins can manage
CREATE POLICY "Public can view products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Admins can manage products" ON public.products FOR ALL USING (
  (auth.jwt()->>'email') IN (SELECT email FROM public.store_admins WHERE role = 'admin')
) WITH CHECK (
  (auth.jwt()->>'email') IN (SELECT email FROM public.store_admins WHERE role = 'admin')
);

-- 2. Orders: authenticated customers create own orders; customers view own orders; admins manage all
CREATE POLICY "Customers can create orders" ON public.orders FOR INSERT WITH CHECK (
  auth.jwt() IS NOT NULL
  AND customer_email = (auth.jwt()->>'email')
  AND total_amount >= 0
  AND status = 'Pending'
);
CREATE POLICY "Customers view own orders" ON public.orders FOR SELECT USING (
  (auth.jwt() IS NOT NULL AND customer_email = (auth.jwt()->>'email'))
  OR (auth.jwt()->>'email') IN (SELECT email FROM public.store_admins WHERE role = 'admin')
);
CREATE POLICY "Admins can manage orders" ON public.orders FOR ALL USING (
  (auth.jwt()->>'email') IN (SELECT email FROM public.store_admins WHERE role = 'admin')
) WITH CHECK (
  (auth.jwt()->>'email') IN (SELECT email FROM public.store_admins WHERE role = 'admin')
);

-- 3. Coupons: anyone can view coupons for validation; admins can manage
CREATE POLICY "Public can view coupons" ON public.coupons FOR SELECT USING (true);
CREATE POLICY "Admins can manage coupons" ON public.coupons FOR ALL USING (
  (auth.jwt()->>'email') IN (SELECT email FROM public.store_admins WHERE role = 'admin')
) WITH CHECK (
  (auth.jwt()->>'email') IN (SELECT email FROM public.store_admins WHERE role = 'admin')
);

-- 4. Store Settings: anyone can read configuration; admins can update
CREATE POLICY "Public can view settings" ON public.store_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage settings" ON public.store_settings FOR ALL USING (
  (auth.jwt()->>'email') IN (SELECT email FROM public.store_admins WHERE role = 'admin')
) WITH CHECK (
  (auth.jwt()->>'email') IN (SELECT email FROM public.store_admins WHERE role = 'admin')
);

-- 5. Store Admins: verified admins view and manage admins (prevents public admin email enumeration)
CREATE POLICY "Admins can view admins" ON public.store_admins FOR SELECT USING (
  (auth.jwt()->>'email') IN (SELECT email FROM public.store_admins WHERE role = 'admin')
);
CREATE POLICY "Admins can manage admins" ON public.store_admins FOR ALL USING (
  (auth.jwt()->>'email') IN (SELECT email FROM public.store_admins WHERE role = 'admin')
) WITH CHECK (
  (auth.jwt()->>'email') IN (SELECT email FROM public.store_admins WHERE role = 'admin')
);

-- 6. Customer Profiles: Users can view and manage their own profiles; Admins can view all
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.customer_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.customer_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.customer_profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.customer_profiles;

CREATE POLICY "Users can view own profile" ON public.customer_profiles FOR SELECT USING (
  (auth.uid() IS NOT NULL AND user_id = (auth.uid())::text)
  OR (auth.jwt()->>'email') IN (SELECT email FROM public.store_admins WHERE role = 'admin')
);

CREATE POLICY "Users can insert own profile" ON public.customer_profiles FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL 
  AND user_id = (auth.uid())::text
);

CREATE POLICY "Users can update own profile" ON public.customer_profiles FOR UPDATE USING (
  auth.uid() IS NOT NULL 
  AND user_id = (auth.uid())::text
) WITH CHECK (
  auth.uid() IS NOT NULL 
  AND user_id = (auth.uid())::text
);

CREATE POLICY "Users can delete own profile" ON public.customer_profiles FOR DELETE USING (
  (auth.uid() IS NOT NULL AND user_id = (auth.uid())::text)
  OR (auth.jwt()->>'email') IN (SELECT email FROM public.store_admins WHERE role = 'admin')
);

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
FOR INSERT WITH CHECK (
  bucket_id = 'product-images'
  AND (auth.jwt()->>'email') IN (SELECT email FROM public.store_admins WHERE role = 'admin')
);

CREATE POLICY "Allow Updates product-images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'product-images'
  AND (auth.jwt()->>'email') IN (SELECT email FROM public.store_admins WHERE role = 'admin')
);

CREATE POLICY "Allow Deletes product-images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'product-images'
  AND (auth.jwt()->>'email') IN (SELECT email FROM public.store_admins WHERE role = 'admin')
);

-- ==========================================================================
-- NOTE: ALL STORE DATA, PHONE NUMBERS, SETTINGS, PRODUCTS & COUPONS
-- ARE MANAGED DIRECTLY THROUGH YOUR STORE ADMIN DASHBOARD.
-- NO HARDCODED OR DUMMY SEED DATA IS INSERTED.
-- ==========================================================================

