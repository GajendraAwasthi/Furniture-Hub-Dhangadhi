-- ==========================================================================
-- FURNITURE HUB SUPABASE DATABASE SCHEMA
-- Execute this script in your Supabase Project's SQL Editor
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

-- Row Level Security (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Anonymous users can read products, coupons, and public settings
CREATE POLICY "Public can view products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Public can view active coupons" ON public.coupons FOR SELECT USING (is_active = true);
CREATE POLICY "Public can view store settings" ON public.store_settings FOR SELECT USING (true);

-- Authenticated users (Admin) can insert, update, and delete everything
CREATE POLICY "Admin full access to products" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access to orders" ON public.orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access to coupons" ON public.coupons FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access to store settings" ON public.store_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow anonymous users to place orders
CREATE POLICY "Public can create orders" ON public.orders FOR INSERT WITH CHECK (true);

-- ==========================================================================
-- SEED INITIAL STORE SETTINGS & DEFAULT COUPON
-- ==========================================================================
INSERT INTO public.coupons (code, discount_percent, min_order_amount, is_active)
VALUES ('SOHO10', 10, 5000, true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.store_settings (key, value)
VALUES 
  ('general', '{"storeName": "Furniture Hub", "contactEmail": "support@furniturehub.com.np", "phone": "+977 9841234567", "address": "Baluwatar Ward 4, Kathmandu, Nepal", "currency": "Rs.", "operatingHours": "Sun-Fri 9:00 AM - 7:00 PM"}'::jsonb),
  ('shipping', '{"insideValleyFee": 250, "outsideValleyFee": 500, "freeShippingThreshold": 20000, "codEnabled": true, "esewaEnabled": true, "khaltiEnabled": true}'::jsonb),
  ('inventory', '{"lowStockThreshold": 3, "maintenanceMode": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;
