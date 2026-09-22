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

-- Ensure schema migrations for pre-existing tables
ALTER TABLE public.customer_profiles ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.store_admins ADD COLUMN IF NOT EXISTS user_id TEXT;


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
DROP POLICY IF EXISTS "Admins can view admins" ON public.store_admins;
DROP POLICY IF EXISTS "Admins can manage admins" ON public.store_admins;

-- ==========================================================================
-- HELPER FUNCTIONS FOR ROW LEVEL SECURITY (RLS) & TRACKING
-- ==========================================================================
-- Security Definer function checks admin authorization without triggering infinite recursion on store_admins
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.store_admins
    WHERE email = (auth.jwt()->>'email')
      AND role = 'admin'
  );
$$;

-- Security Definer function to track a specific order by reference or phone without exposing the orders table
CREATE OR REPLACE FUNCTION public.track_order(p_order_id text, p_phone text DEFAULT NULL)
RETURNS SETOF public.orders
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT * FROM public.orders
  WHERE (
    id = p_order_id 
    OR id = 'FH-' || p_order_id
    OR id = REPLACE(p_order_id, '#', '')
  )
  AND (p_phone IS NULL OR customer_phone = p_phone OR customer_phone LIKE '%' || p_phone)
  LIMIT 1;
$$;

-- 1. Products: anyone can browse; only verified admins can manage
CREATE POLICY "Public can view products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Admins can manage products" ON public.products FOR ALL USING (
  public.is_admin()
) WITH CHECK (
  public.is_admin()
);

-- 2. Orders: customers create own orders; customers view own orders; admins manage all
CREATE POLICY "Customers can create orders" ON public.orders FOR INSERT WITH CHECK (
  (
    (auth.jwt() IS NOT NULL AND (customer_email = (auth.jwt()->>'email') OR customer_email IS NULL))
    OR auth.role() = 'anon'
    OR auth.jwt() IS NULL
  )
  AND customer_phone IS NOT NULL
  AND customer_name IS NOT NULL
  AND delivery_address IS NOT NULL
  AND total_amount >= 0
  AND status = 'Pending'
);
CREATE POLICY "Customers view own orders" ON public.orders FOR SELECT USING (
  (auth.jwt() IS NOT NULL AND customer_email = (auth.jwt()->>'email'))
  OR public.is_admin()
);
CREATE POLICY "Admins can manage orders" ON public.orders FOR ALL USING (
  public.is_admin()
) WITH CHECK (
  public.is_admin()
);

-- 3. Coupons: anyone can view coupons for validation; admins can manage
CREATE POLICY "Public can view coupons" ON public.coupons FOR SELECT USING (true);
CREATE POLICY "Admins can manage coupons" ON public.coupons FOR ALL USING (
  public.is_admin()
) WITH CHECK (
  public.is_admin()
);

-- 4. Store Settings: anyone can read configuration; admins can update
CREATE POLICY "Public can view settings" ON public.store_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage settings" ON public.store_settings FOR ALL USING (
  public.is_admin()
) WITH CHECK (
  public.is_admin()
);

-- 5. Store Admins: verified admins view and manage admins (prevents public admin email enumeration)
CREATE POLICY "Admins can view admins" ON public.store_admins FOR SELECT USING (
  public.is_admin()
);
CREATE POLICY "Admins can manage admins" ON public.store_admins FOR ALL USING (
  public.is_admin()
) WITH CHECK (
  public.is_admin()
);

-- 6. Customer Profiles: Users can view and manage their own profiles; Admins can view all
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.customer_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.customer_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.customer_profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.customer_profiles;

CREATE POLICY "Users can view own profile" ON public.customer_profiles FOR SELECT USING (
  (auth.uid() IS NOT NULL AND user_id = (auth.uid())::text)
  OR public.is_admin()
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
  OR public.is_admin()
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
  AND public.is_admin()
);

CREATE POLICY "Allow Updates product-images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'product-images'
  AND public.is_admin()
);

CREATE POLICY "Allow Deletes product-images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'product-images'
  AND public.is_admin()
);

-- ==========================================================================
-- NOTE: ALL STORE DATA, PHONE NUMBERS, SETTINGS, PRODUCTS & COUPONS
-- ARE MANAGED DIRECTLY THROUGH YOUR STORE ADMIN DASHBOARD.
-- NO HARDCODED OR DUMMY SEED DATA IS INSERTED.
-- ==========================================================================

