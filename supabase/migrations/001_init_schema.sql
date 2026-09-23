-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table with role-based access
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('customer', 'admin_staff', 'super_admin', 'owner')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
  category TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product inventory (real-time stock tracking)
CREATE TABLE public.product_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INT NOT NULL CHECK (quantity >= 0),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id)
);

-- Inventory logs (audit trail of all inventory changes)
CREATE TABLE public.inventory_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity_change INT NOT NULL,
  reason TEXT NOT NULL,
  order_id UUID,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table (with full lifecycle: pending_payment → confirmed → processing → shipped → delivered)
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  customer_email TEXT,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  items JSONB NOT NULL, -- Array of {product_id, quantity, price}
  total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount > 0),
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN (
    'pending_payment',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled'
  )),
  payment_method TEXT CHECK (payment_method IN ('cod', 'jazz_cash', 'easypaisa')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'confirmed', 'failed')),
  delivery_method TEXT CHECK (delivery_method IN ('self', 'courier')),
  delivery_date DATE,
  delivery_time_slot TEXT, -- e.g., "10:00-12:00"
  assigned_to UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments table (COD, JazzCash, Easypaisa with verification)
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL CHECK (method IN ('cod', 'jazz_cash', 'easypaisa')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  transaction_id TEXT, -- For JazzCash/Easypaisa
  verified_by_admin_id UUID REFERENCES public.users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order requests (for printing, bulk orders, product custom requests)
CREATE TABLE public.order_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('printing', 'bulk', 'custom_product')),
  details JSONB NOT NULL, -- Request-specific data
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by_admin_id UUID REFERENCES public.users(id),
  admin_notes TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity logs (complete audit trail for all admin actions)
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'order', 'payment', 'product', 'user', etc.
  entity_id UUID,
  changes JSONB, -- What changed: {field: {old_value, new_value}}
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES - Role-based access control
-- ============================================

-- USERS table policies
-- Customers can only see their own profile
CREATE POLICY "Customers see only their own profile" ON public.users
  FOR SELECT
  USING (
    (auth.uid()::text = id::text) OR
    (auth.jwt() ->> 'role' IN ('super_admin', 'owner'))
  );

-- Admin Staff and above can see all customer profiles
CREATE POLICY "Admin staff see all customers" ON public.users
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' IN ('admin_staff', 'super_admin', 'owner')
  );

-- Only Owner/Super Admin can modify user roles
CREATE POLICY "Only owner/super_admin modify roles" ON public.users
  FOR UPDATE
  USING (auth.jwt() ->> 'role' IN ('super_admin', 'owner'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('super_admin', 'owner'));

-- PRODUCTS table policies (public read)
CREATE POLICY "Anyone can view products" ON public.products
  FOR SELECT
  USING (true);

-- Only admin staff and above can modify products
CREATE POLICY "Only admin staff modify products" ON public.products
  FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' IN ('admin_staff', 'super_admin', 'owner'));

CREATE POLICY "Only admin staff modify products (update)" ON public.products
  FOR UPDATE
  USING (auth.jwt() ->> 'role' IN ('admin_staff', 'super_admin', 'owner'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('admin_staff', 'super_admin', 'owner'));

-- PRODUCT_INVENTORY table policies
CREATE POLICY "Anyone can view inventory" ON public.product_inventory
  FOR SELECT
  USING (true);

CREATE POLICY "Only admin staff modify inventory" ON public.product_inventory
  FOR UPDATE
  USING (auth.jwt() ->> 'role' IN ('admin_staff', 'super_admin', 'owner'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('admin_staff', 'super_admin', 'owner'));

-- INVENTORY_LOGS table policies (audit trail - read only for admins)
CREATE POLICY "Admin staff view inventory logs" ON public.inventory_logs
  FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('admin_staff', 'super_admin', 'owner'));

CREATE POLICY "System insert inventory logs" ON public.inventory_logs
  FOR INSERT
  WITH CHECK (true);

-- ORDERS table policies
-- Customers see only their own orders
CREATE POLICY "Customers see their own orders" ON public.orders
  FOR SELECT
  USING (
    (auth.uid()::text = customer_id::text) OR
    (auth.jwt() ->> 'role' IN ('admin_staff', 'super_admin', 'owner'))
  );

-- Customers can insert their own orders
CREATE POLICY "Customers create orders" ON public.orders
  FOR INSERT
  WITH CHECK (
    (auth.uid()::text = customer_id::text)
  );

-- Admin staff can update orders
CREATE POLICY "Admin staff update orders" ON public.orders
  FOR UPDATE
  USING (auth.jwt() ->> 'role' IN ('admin_staff', 'super_admin', 'owner'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('admin_staff', 'super_admin', 'owner'));

-- PAYMENTS table policies
-- Customers see their own payments
CREATE POLICY "Customers see own payments" ON public.payments
  FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM public.orders
      WHERE customer_id = auth.uid()
    ) OR
    (auth.jwt() ->> 'role' IN ('admin_staff', 'super_admin', 'owner'))
  );

-- Only admin staff can insert/update payments
CREATE POLICY "Admin staff manage payments" ON public.payments
  FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' IN ('admin_staff', 'super_admin', 'owner'));

CREATE POLICY "Admin staff update payments" ON public.payments
  FOR UPDATE
  USING (auth.jwt() ->> 'role' IN ('admin_staff', 'super_admin', 'owner'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('admin_staff', 'super_admin', 'owner'));

-- ORDER_REQUESTS table policies
-- Customers see their own order requests
CREATE POLICY "Customers see own requests" ON public.order_requests
  FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM public.orders
      WHERE customer_id = auth.uid()
    ) OR
    (auth.jwt() ->> 'role' IN ('admin_staff', 'super_admin', 'owner'))
  );

-- Customers can create requests for their orders
CREATE POLICY "Customers create requests" ON public.order_requests
  FOR INSERT
  WITH CHECK (
    order_id IN (
      SELECT id FROM public.orders
      WHERE customer_id = auth.uid()
    )
  );

-- Admin staff can update order requests
CREATE POLICY "Admin staff update requests" ON public.order_requests
  FOR UPDATE
  USING (auth.jwt() ->> 'role' IN ('admin_staff', 'super_admin', 'owner'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('admin_staff', 'super_admin', 'owner'));

-- ACTIVITY_LOGS table policies (admin-only, audit trail)
CREATE POLICY "Admin staff view activity logs" ON public.activity_logs
  FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('admin_staff', 'super_admin', 'owner'));

CREATE POLICY "System insert activity logs" ON public.activity_logs
  FOR INSERT
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX idx_payments_order_id ON public.payments(order_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_inventory_logs_product_id ON public.inventory_logs(product_id);
CREATE INDEX idx_inventory_logs_created_at ON public.inventory_logs(created_at DESC);
CREATE INDEX idx_activity_logs_admin_id ON public.activity_logs(admin_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
