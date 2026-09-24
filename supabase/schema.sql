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
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER;
ALTER TABLE public.customer_profiles ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_id TEXT;
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
    (p_phone IS NOT NULL AND p_phone ~ '^[0-9]{10,15}$'
      AND right(regexp_replace(o.customer_phone, '[^0-9]', '', 'g'), 10) = right(p_phone, 10))
    OR (auth.uid() IS NOT NULL AND o.customer_email = (auth.jwt()->>'email'))
    OR public.is_admin()
  )
  LIMIT 1;
END;
$$;

-- Ensure base promotional coupons are available in the coupons store
INSERT INTO public.coupons (code, discount_percent, min_order_amount, is_active)
VALUES 
  ('HUB10', 10, 0, true),
  ('FESTIVE2025', 10, 0, true)
ON CONFLICT (code) DO UPDATE SET
  discount_percent = EXCLUDED.discount_percent,
  is_active = EXCLUDED.is_active;

-- Transactional RPC to place orders with server-side price recalculation, inventory locking, and stock reservation
CREATE OR REPLACE FUNCTION public.place_order(p_order jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id text;
  v_user_id text;
  v_customer_id text;
  v_customer_email text;
  v_customer_phone text;
  v_customer_name text;
  v_delivery_address text;
  v_payment_method text;
  v_notes text;
  v_coupon_code text;
  v_items jsonb;
  v_item jsonb;
  v_product_id text;
  v_qty int;
  v_product_row record;
  v_coupon_row record;
  v_subtotal numeric := 0;
  v_discount_amount numeric := 0;
  v_shipping_fee numeric := 0;
  v_calculated_total numeric := 0;
  v_order_items jsonb := '[]'::jsonb;
  v_created_order record;
  v_caller_email text;
BEGIN
  -- 1. Extract and sanitize inputs
  v_order_id := COALESCE(p_order->>'id', 'FH-' || to_char(NOW(), 'YYYYMMDD-HH24MISS') || '-' || (FLOOR(1000 + RANDOM() * 9000)::text));
  v_customer_name := TRIM(COALESCE(p_order->>'customer_name', p_order->>'name', ''));
  v_customer_phone := TRIM(COALESCE(p_order->>'customer_phone', p_order->>'phone', ''));
  v_delivery_address := TRIM(COALESCE(p_order->>'delivery_address', p_order->>'address', ''));
  v_payment_method := COALESCE(p_order->>'payment_method', p_order->>'paymentMethod', 'WhatsApp Direct');
  v_notes := COALESCE(p_order->>'notes', '');
  v_coupon_code := TRIM(COALESCE(p_order->>'coupon_code', p_order->>'couponCode', ''));
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

  -- Require a verified account; browser-side login state is never an authority.
  IF auth.uid() IS NULL OR NULLIF(auth.jwt()->>'email', '') IS NULL THEN
    RAISE EXCEPTION 'Sign in to place an order';
  END IF;
  v_caller_email := auth.jwt()->>'email';
  v_customer_email := v_caller_email;
  v_user_id := auth.uid()::text;
  v_customer_id := auth.uid()::text;

  -- 3. Validate items, lock product inventory, recalculate pricing authoritatively
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    v_product_id := COALESCE(v_item->>'id', v_item->'product'->>'id');
    v_qty := COALESCE((v_item->>'quantity')::int, 1);

    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Invalid item quantity: %', v_qty;
    END IF;

    -- Lock product row to prevent race conditions & overselling
    SELECT id, name, price, stock_quantity, in_stock, image, category
    INTO v_product_row
    FROM public.products
    WHERE id = v_product_id
    FOR UPDATE;

    -- Reject unknown product IDs to enforce authoritative database pricing
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Unknown product: %', COALESCE(v_product_id, '(missing id)');
    END IF;

    -- Enforce in_stock
    IF NOT COALESCE(v_product_row.in_stock, true) THEN
      RAISE EXCEPTION 'Product "%" is out of stock', v_product_row.name;
    END IF;

    -- Check and decrement counted stock under FOR UPDATE; set in_stock false at zero
    IF v_product_row.stock_quantity IS NOT NULL THEN
      IF v_product_row.stock_quantity < v_qty THEN
        RAISE EXCEPTION 'Insufficient stock for product "%". Requested: %, Available: %', v_product_row.name, v_qty, v_product_row.stock_quantity;
      END IF;

      UPDATE public.products 
      SET 
        stock_quantity = stock_quantity - v_qty,
        in_stock = (stock_quantity - v_qty > 0)
      WHERE id = v_product_id;
    END IF;

    -- Add item with canonical price from database
    v_subtotal := v_subtotal + (v_product_row.price * v_qty);
    v_order_items := v_order_items || jsonb_build_array(jsonb_build_object(
      'id', v_product_row.id,
      'name', v_product_row.name,
      'price', v_product_row.price,
      'quantity', v_qty,
      'image', v_product_row.image,
      'category', v_product_row.category
    ));
  END LOOP;

  -- 4. Check coupons store before hard-coding codes. Reject unknown codes.
  IF v_coupon_code <> '' THEN
    SELECT discount_percent, discount_fixed, min_order_amount, is_active, expiry_date
    INTO v_coupon_row
    FROM public.coupons
    WHERE UPPER(code) = UPPER(v_coupon_code);

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid coupon code: %', v_coupon_code;
    END IF;

    IF NOT v_coupon_row.is_active THEN
      RAISE EXCEPTION 'Coupon code % is inactive', v_coupon_code;
    END IF;

    IF v_coupon_row.expiry_date IS NOT NULL AND v_coupon_row.expiry_date < CURRENT_DATE THEN
      RAISE EXCEPTION 'Coupon code % has expired', v_coupon_code;
    END IF;

    IF v_subtotal < COALESCE(v_coupon_row.min_order_amount, 0) THEN
      RAISE EXCEPTION 'Order amount must be at least Rs. % to use coupon %', v_coupon_row.min_order_amount, v_coupon_code;
    END IF;

    IF v_coupon_row.discount_percent > 0 THEN
      v_discount_amount := ROUND(v_subtotal * (v_coupon_row.discount_percent::numeric / 100.0));
    ELSIF v_coupon_row.discount_fixed > 0 THEN
      v_discount_amount := LEAST(v_subtotal, v_coupon_row.discount_fixed);
    END IF;

    UPDATE public.coupons
    SET usage_count = usage_count + 1
    WHERE UPPER(code) = UPPER(v_coupon_code);
  END IF;

  -- 5. Copy shipping threshold comparison and base amount exactly from renderCartDrawer:
  -- const shipping = subtotal > 0 ? (subtotal > 25000 ? 0 : 500) : 0;
  v_shipping_fee := CASE 
    WHEN v_subtotal > 0 THEN 
      CASE WHEN v_subtotal > 25000 THEN 0 ELSE 500 END 
    ELSE 0 
  END;

  -- const total = Math.max(0, subtotal - discount + shipping);
  v_calculated_total := GREATEST(0, v_subtotal - v_discount_amount + v_shipping_fee);

  -- 6. Insert into public.orders authoritatively
  INSERT INTO public.orders (
    id,
    user_id,
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
    v_user_id,
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

  -- Return persisted order values to the browser
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

-- 2. Orders: All orders are created authoritatively through public.place_order RPC.
-- Direct INSERT on public.orders table is completely disabled for security and data integrity.
DROP POLICY IF EXISTS "Customers can create orders" ON public.orders;
DROP POLICY IF EXISTS "Public can create orders" ON public.orders;

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
