-- Test data seed for development

-- Create test users with different roles
INSERT INTO public.users (id, email, phone, full_name, role) VALUES
  ('550e8400-e29b-41d4-a716-446655440001'::uuid, 'owner@hubaib.local', '03001234567', 'Shop Owner', 'owner'),
  ('550e8400-e29b-41d4-a716-446655440002'::uuid, 'admin@hubaib.local', '03001234568', 'Admin Staff', 'admin_staff'),
  ('550e8400-e29b-41d4-a716-446655440003'::uuid, 'customer1@test.com', '03001234569', 'Test Customer 1', 'customer'),
  ('550e8400-e29b-41d4-a716-446655440004'::uuid, 'customer2@test.com', '03001234570', 'Test Customer 2', 'customer');

-- Create test products
INSERT INTO public.products (id, name, description, price, category, image_url) VALUES
  ('650e8400-e29b-41d4-a716-446655440001'::uuid, 'Wireless Headphones', 'High-quality Bluetooth headphones', 2999.00, 'Electronics', 'https://via.placeholder.com/300?text=Headphones'),
  ('650e8400-e29b-41d4-a716-446655440002'::uuid, 'USB-C Cable', 'Fast charging USB-C cable', 499.00, 'Accessories', 'https://via.placeholder.com/300?text=Cable'),
  ('650e8400-e29b-41d4-a716-446655440003'::uuid, 'Phone Case', 'Protective phone case', 799.00, 'Accessories', 'https://via.placeholder.com/300?text=Case'),
  ('650e8400-e29b-41d4-a716-446655440004'::uuid, 'Screen Protector', 'Tempered glass screen protector', 299.00, 'Accessories', 'https://via.placeholder.com/300?text=Protector');

-- Initialize product inventory
INSERT INTO public.product_inventory (product_id, quantity) VALUES
  ('650e8400-e29b-41d4-a716-446655440001'::uuid, 50),
  ('650e8400-e29b-41d4-a716-446655440002'::uuid, 200),
  ('650e8400-e29b-41d4-a716-446655440003'::uuid, 150),
  ('650e8400-e29b-41d4-a716-446655440004'::uuid, 300);

-- Create test order (pending payment)
INSERT INTO public.orders (
  id, customer_id, customer_email, customer_phone, customer_address,
  items, total_amount, status, payment_method, payment_status
) VALUES (
  '750e8400-e29b-41d4-a716-446655440001'::uuid,
  '550e8400-e29b-41d4-a716-446655440003'::uuid,
  'customer1@test.com',
  '03001234569',
  'Karachi, Pakistan',
  '[{"product_id": "650e8400-e29b-41d4-a716-446655440001", "quantity": 1, "price": 2999.00}]'::jsonb,
  2999.00,
  'pending_payment',
  'cod',
  'pending'
);

-- Create test payment record
INSERT INTO public.payments (order_id, amount, method, status) VALUES (
  '750e8400-e29b-41d4-a716-446655440001'::uuid,
  2999.00,
  'cod',
  'pending'
);
