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

-- Drop existing track_order to allow changing return type
DROP FUNCTION IF EXISTS public.track_order(text, text);

-- Security Definer function to return a safe tracking projection without leaking customer PII
CREATE OR REPLACE FUNCTION public.track_order(p_order_id text, p_phone text DEFAULT NULL)
RETURNS TABLE (
  id text,
  status text,
  tracking_history jsonb,
  created_at timestamptz,
  customer_name_masked text,
  delivery_city text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- An unauthenticated lookup without verified phone factor is refused to prevent enumeration
  -- Use auth.uid() check because PostgREST anon requests contain a non-null auth.jwt() with role: anon
  IF (p_phone IS NULL OR p_phone = '') AND auth.uid() IS NULL AND NOT public.is_admin() THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    o.id,
    o.status,
    o.tracking_history,
    o.created_at,
    CASE 
      WHEN o.customer_name IS NOT NULL AND length(o.customer_name) > 2 
      THEN substring(o.customer_name from 1 for 2) || '***'
      ELSE 'Customer'
    END AS customer_name_masked,
    COALESCE(split_part(o.delivery_address, ',', -1), 'Dhangadhi') AS delivery_city
  FROM public.orders o
  WHERE (
    o.id = p_order_id 
    OR o.id = 'FH-' || p_order_id
    OR o.id = REPLACE(p_order_id, '#', '')
  )
  AND (
    -- Require valid digits only to prevent wildcard '%' or empty string bypass
    (p_phone IS NOT NULL AND p_phone ~ '^[0-9]+$' AND (o.customer_phone = p_phone OR o.customer_phone LIKE '%' || p_phone))
    OR (auth.uid() IS NOT NULL AND o.customer_email = (auth.jwt()->>'email'))
    OR public.is_admin()
  )
  LIMIT 1;
END;
$$;

-- Transactional RPC to place orders with server-side price recalculation and inventory locking
CREATE OR REPLACE FUNCTION public.place_order(p_order jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id text;
  v_customer_id text;
  v_customer_email text;
  v_customer_phone text;
  v_customer_name text;
  v_delivery_address text;
  v_payment_method text;
  v_notes text;
  v_items jsonb;
  v_item jsonb;
  v_product_id text;
  v_qty int;
  v_product_row record;
  v_calculated_total numeric := 0;
  v_order_items jsonb := '[]'::jsonb;
  v_created_order record;
  v_caller_email text;
BEGIN
  -- 1. Extract and sanitize inputs
  v_order_id := COALESCE(p_order->>'id', 'FH-' || to_char(NOW(), 'YYYYMMDD-HH24MISS') || '-' || (FLOOR(1000 + RANDOM() * 9000)::text));
  v_customer_name := TRIM(COALESCE(p_order->>'customer_name', ''));
  v_customer_phone := TRIM(COALESCE(p_order->>'customer_phone', ''));
  v_delivery_address := TRIM(COALESCE(p_order->>'delivery_address', ''));
  v_payment_method := COALESCE(p_order->>'payment_method', 'WhatsApp Direct');
  v_notes := COALESCE(p_order->>'notes', '');
  v_items := p_order->'items';

  IF v_customer_name = '' THEN
    RAISE EXCEPTION 'Customer name is required';
  END IF;

  IF v_customer_phone = '' OR length(v_customer_phone) < 10 THEN
    RAISE EXCEPTION 'Valid 10-digit customer phone number is required';
  END IF;

  IF v_delivery_address = '' THEN
    RAISE EXCEPTION 'Delivery address is required';
  END IF;

  IF v_items IS NULL OR jsonb_array_length(v_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  -- 2. Handle identity binding: check auth.uid() because anon requests carry a non-null anon JWT
  IF auth.uid() IS NOT NULL THEN
    v_caller_email := auth.jwt()->>'email';
    v_customer_email := v_caller_email;
    v_customer_id := auth.uid()::text;
  ELSE
    -- Unauthenticated guest checkout: customer_email is strictly NULL
    v_customer_email := NULL;
    v_customer_id := 'guest';
  END IF;

  -- 3. Validate items, lock product inventory, recalculate pricing authoritatively
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    v_product_id := COALESCE(v_item->>'id', v_item->'product'->>'id');
    v_qty := COALESCE((v_item->>'quantity')::int, 1);

    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Invalid item quantity: %', v_qty;
    END IF;

    -- Lock product row to prevent race conditions & overselling
    SELECT id, name, price, stock_quantity, image, category
    INTO v_product_row
    FROM public.products
    WHERE id = v_product_id
    FOR UPDATE;

    -- Reject unknown product IDs to enforce authoritative database pricing
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Unknown product: %', COALESCE(v_product_id, '(missing id)');
    ELSE
      -- Deduct inventory if stock is tracked
      IF v_product_row.stock_quantity IS NOT NULL AND v_product_row.stock_quantity < v_qty THEN
        RAISE EXCEPTION 'Insufficient stock for product "%". Requested: %, Available: %', v_product_row.name, v_qty, v_product_row.stock_quantity;
      END IF;

      IF v_product_row.stock_quantity IS NOT NULL THEN
        UPDATE public.products 
        SET stock_quantity = stock_quantity - v_qty 
        WHERE id = v_product_id;
      END IF;

      -- Add item with canonical price from database
      v_calculated_total := v_calculated_total + (v_product_row.price * v_qty);
      v_order_items := v_order_items || jsonb_build_array(jsonb_build_object(
        'id', v_product_row.id,
        'name', v_product_row.name,
        'price', v_product_row.price,
        'quantity', v_qty,
        'image', v_product_row.image,
        'category', v_product_row.category
      ));
    END IF;
  END LOOP;

  -- Apply coupon discount if specified and verified
  IF (p_order->>'coupon_code') = 'HUB10' THEN
    v_calculated_total := ROUND(v_calculated_total * 0.90, 2);
  END IF;

  -- 4. Insert into public.orders authoritatively
  INSERT INTO public.orders (
    id,
    customer_id,
    customer_name,
    customer_email,
    customer_phone,
    delivery_address,
    items,
    total_amount,
    payment_method,
    status,
    notes,
    tracking_history,
    created_at
  ) VALUES (
    v_order_id,
    v_customer_id,
    v_customer_name,
    v_customer_email,
    v_customer_phone,
    v_delivery_address,
    v_order_items,
    v_calculated_total,
    v_payment_method,
    'Pending',
    v_notes,
    jsonb_build_array(jsonb_build_object(
      'status', 'Pending',
      'title', 'Order Placed & Registered',
      'note', 'Order placed via WhatsApp Direct Checkout. Awaiting confirmation.',
      'location', 'Dhangadhi Hub, Kailali',
      'timestamp', to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    )),
    NOW()
  )
  RETURNING * INTO v_created_order;

  RETURN to_jsonb(v_created_order);
END;
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
    OR (
      (auth.role() = 'anon' OR auth.jwt() IS NULL)
      AND customer_email IS NULL
    )
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

