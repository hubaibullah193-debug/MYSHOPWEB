# Database Schema & RLS Policies

## Overview

The Hubaib One Stop Shop database is built on PostgreSQL (via Supabase) with Row-Level Security (RLS) to enforce role-based access control. All data access is enforced at the database layer, not just the application layer.

## Tables

### `users`
Stores user accounts with role-based access levels.

**Columns:**
- `id` (UUID): Primary key
- `email` (TEXT): Unique email address
- `phone` (TEXT): Contact phone number
- `full_name` (TEXT): User's full name
- `role` (TEXT): One of `customer`, `admin_staff`, `super_admin`, `owner`
- `created_at`, `updated_at` (TIMESTAMP): Audit timestamps

**Roles:**
- **customer**: Can view their own orders, make purchases, submit requests
- **admin_staff**: Can manage orders, verify payments, update inventory, view all orders/customers. Cannot modify system settings or user roles.
- **super_admin**: Full admin access except cannot modify the owner
- **owner**: Full access to all data and system settings

---

### `products`
Public product catalog.

**Columns:**
- `id` (UUID): Primary key
- `name` (TEXT): Product name
- `description` (TEXT): Product description
- `price` (DECIMAL): Price in PKR
- `category` (TEXT): Product category for filtering
- `image_url` (TEXT): URL to product image (stored in Supabase Storage)
- `created_at`, `updated_at` (TIMESTAMP): Audit timestamps

**Access:**
- Public read (all users can view)
- Only admin_staff and above can create/modify

---

### `product_inventory`
Real-time inventory tracking (one row per product).

**Columns:**
- `id` (UUID): Primary key
- `product_id` (UUID): Foreign key to products
- `quantity` (INT): Current stock count (≥ 0)
- `last_updated` (TIMESTAMP): When inventory was last changed

**Purpose:** Maintains real-time stock levels. Deductions happen here when orders are confirmed.

**Access:**
- Public read (customers see availability)
- Only admin_staff and above can update

---

### `inventory_logs`
Audit trail for all inventory changes (append-only).

**Columns:**
- `id` (UUID): Primary key
- `product_id` (UUID): Foreign key to products
- `quantity_change` (INT): Amount added/removed (can be negative)
- `reason` (TEXT): Why inventory changed (e.g., "order_confirmed", "manual_adjustment", "return")
- `order_id` (UUID): Related order (if applicable)
- `created_by` (UUID): Admin who made the change
- `created_at` (TIMESTAMP): When the change happened

**Purpose:** Complete audit trail for inventory reconciliation and compliance.

**Access:**
- Only admin_staff and above can view
- System auto-inserts on inventory changes

---

### `orders`
Core order table with complete lifecycle tracking.

**Columns:**
- `id` (UUID): Primary key
- `customer_id` (UUID): Foreign key to customers
- `customer_email` (TEXT): Snapshot of customer email at order time
- `customer_phone` (TEXT): Customer's phone number
- `customer_address` (TEXT): Delivery address
- `items` (JSONB): Array of `{product_id, quantity, price}` (price snapshot at order time)
- `total_amount` (DECIMAL): Total order value in PKR
- `status` (TEXT): Order lifecycle state
  - `pending_payment`: Awaiting payment confirmation
  - `confirmed`: Payment confirmed, awaiting fulfillment
  - `processing`: Admin preparing order
  - `shipped`: Order sent to courier or customer
  - `delivered`: Confirmed delivered
  - `cancelled`: Order cancelled
- `payment_method` (TEXT): `cod`, `jazz_cash`, or `easypaisa`
- `payment_status` (TEXT): `pending`, `confirmed`, or `failed`
- `delivery_method` (TEXT): `self` (customer pickup) or `courier` (shipped)
- `delivery_date` (DATE): Scheduled delivery date (set by admin)
- `delivery_time_slot` (TEXT): Time range e.g., "10:00-12:00" (set by admin)
- `assigned_to` (UUID): Admin staff member handling this order
- `created_at`, `updated_at` (TIMESTAMP): Audit timestamps

**Order Lifecycle:**
1. Customer creates order → `pending_payment`
2. Customer pays → Admin confirms payment in dashboard → `confirmed`
3. Admin assigns delivery method/date/time → `processing`
4. Order sent to courier or ready for pickup → `shipped`
5. Customer receives → Admin marks → `delivered`

**Inventory Deduction:**
- Real-time on website: inventory decremented immediately when order created
- Manual for WhatsApp/phone: admin manually adjusts inventory when order entered

**Access:**
- Customers see only their own orders
- Admin staff and above see all orders
- Only admins can update status/assign delivery

---

### `payments`
Payment records with verification workflow.

**Columns:**
- `id` (UUID): Primary key
- `order_id` (UUID): Foreign key to orders
- `amount` (DECIMAL): Payment amount in PKR
- `method` (TEXT): `cod`, `jazz_cash`, or `easypaisa`
- `status` (TEXT): `pending`, `confirmed`, or `failed`
- `transaction_id` (TEXT): External transaction ID (for JazzCash/Easypaisa)
- `verified_by_admin_id` (UUID): Admin who confirmed payment
- `verified_at` (TIMESTAMP): When payment was confirmed
- `admin_notes` (TEXT): Admin's notes on payment
- `created_at`, `updated_at` (TIMESTAMP): Audit timestamps

**Payment Workflow (spec §10):**
1. Order created with payment method selected
2. Payment record inserted with `status='pending'`
3. **COD**: Admin manually confirms in dashboard → `status='confirmed'` → order moves to `confirmed`
4. **JazzCash/Easypaisa**: 
   - Webhook received with transaction details
   - Admin verifies in dashboard (manual step)
   - Admin clicks "confirm" → `status='confirmed'` + `verified_by_admin_id` + `verified_at` set
   - Order moves to `confirmed`

**Access:**
- Customers see their own payments
- Admin staff and above see all payments and can confirm

---

### `order_requests`
Special requests tied to orders (printing, bulk discounts, custom products).

**Columns:**
- `id` (UUID): Primary key
- `order_id` (UUID): Foreign key to orders
- `type` (TEXT): `printing`, `bulk`, or `custom_product`
- `details` (JSONB): Request-specific data (varies by type)
- `status` (TEXT): `pending`, `approved`, or `rejected`
- `approved_by_admin_id` (UUID): Admin who approved
- `admin_notes` (TEXT): Admin's notes
- `approved_at` (TIMESTAMP): When approved
- `created_at`, `updated_at` (TIMESTAMP): Audit timestamps

**Auto-Confirmation (spec §12-14):**
- **bulk** requests: Auto-approved if quantity ≥ threshold
- **custom_product** requests: Auto-approved (system auto-creates product)
- **printing** requests: Manual approval required

**Access:**
- Customers see their own requests
- Admin staff can approve/reject

---

### `activity_logs`
Complete audit trail of all admin actions.

**Columns:**
- `id` (UUID): Primary key
- `admin_id` (UUID): Admin who performed action
- `action` (TEXT): Action type (e.g., "order_status_updated", "payment_confirmed", "product_created")
- `entity_type` (TEXT): What was modified (e.g., "order", "payment", "product")
- `entity_id` (UUID): ID of the entity modified
- `changes` (JSONB): What changed `{field: {old_value, new_value}}`
- `ip_address` (TEXT): Admin's IP address
- `created_at` (TIMESTAMP): When action occurred

**Purpose:** Complete compliance audit trail (spec §19).

**Access:**
- Admin staff and above can view (read-only)
- System auto-inserts on all admin modifications

---

## Row-Level Security (RLS) Policies

All tables have RLS enabled. The policies enforce:

### By Role:

**Customer:**
- See only their own profile, orders, payments, and requests
- Can create orders and requests
- Cannot modify or see other customers' data

**Admin Staff:**
- See all customers and orders
- Can update orders (status, delivery method, assignment)
- Can confirm payments
- Can approve/reject order requests
- View activity logs and inventory logs
- **Cannot**: Modify user roles, modify system settings, create/delete users

**Super Admin:**
- Same as Admin Staff
- **Can** modify user roles and system settings
- **Cannot**: Delete/modify Owner

**Owner:**
- Full access to all data
- Can modify any user role
- Can delete/archive data
- Can change system settings

### By Table:

| Table | Customer | Admin Staff | Super Admin | Owner |
|-------|----------|-------------|-------------|-------|
| users | See own | See all | Modify (except owner) | Full |
| products | Read | Read/Write | Read/Write | Full |
| product_inventory | Read | Read/Write | Read/Write | Full |
| inventory_logs | — | Read | Read | Full |
| orders | Own only | All | All | Full |
| payments | Own only | All | All | Full |
| order_requests | Own only | All | All | Full |
| activity_logs | — | Read | Read | Full |

---

## Indexes

Performance indexes are created on:
- `orders.customer_id` — fast lookup of customer's orders
- `orders.status` — filtering by order status in admin dashboard
- `orders.created_at DESC` — recent orders first
- `payments.order_id` — fast payment lookup per order
- `payments.status` — filtering pending payments
- `inventory_logs.product_id` — audit trail per product
- `inventory_logs.created_at DESC` — recent changes first
- `activity_logs.admin_id` — audit trail per admin
- `activity_logs.created_at DESC` — recent actions first

---

## Data Integrity

### Constraints:
- Prices and amounts > 0
- Inventory quantities ≥ 0
- Email addresses are unique per user
- Order status restricted to valid states
- Payment method and status restricted to valid values

### Foreign Keys:
- All `_id` references cascade on delete for audit trail integrity
- Inventory logs and activity logs preserve even if related entity deleted

---

## Migrations

Migrations are stored in `supabase/migrations/`:
- `001_init_schema.sql` — Initial schema with all tables, RLS policies, and indexes

To run locally:
```bash
supabase db reset  # Apply all migrations and seed.sql
```

---

## Testing RLS Policies

To verify RLS policies work correctly:

```sql
-- Test 1: Customer can only see own orders
SET REQUEST.JWT.CLAIMS = '{"sub": "550e8400-e29b-41d4-a716-446655440003", "role": "customer"}';
SELECT * FROM public.orders;  -- Should return only customer's orders

-- Test 2: Admin_staff can see all orders
SET REQUEST.JWT.CLAIMS = '{"sub": "550e8400-e29b-41d4-a716-446655440002", "role": "admin_staff"}';
SELECT * FROM public.orders;  -- Should return all orders

-- Test 3: Customer cannot modify another customer's order (should fail)
SET REQUEST.JWT.CLAIMS = '{"sub": "550e8400-e29b-41d4-a716-446655440003", "role": "customer"}';
UPDATE public.orders SET status = 'confirmed' WHERE customer_id = '550e8400-e29b-41d4-a716-446655440004'::uuid;  -- Error

-- Test 4: Admin staff can update order
SET REQUEST.JWT.CLAIMS = '{"sub": "550e8400-e29b-41d4-a716-446655440002", "role": "admin_staff"}';
UPDATE public.orders SET status = 'confirmed' WHERE id = '750e8400-e29b-41d4-a716-446655440001'::uuid;  -- Success
```

---

## Seed Data

Development seed data is in `supabase/seed.sql`:
- 4 test users (owner, admin_staff, 2 customers)
- 4 products with inventory
- 1 test order in `pending_payment` state
- 1 payment record

Run with:
```bash
supabase db reset
```
