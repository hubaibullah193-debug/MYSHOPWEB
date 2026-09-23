# Hubaib One Stop Shop — Master Project Specification

**Business:** Hubaib One Stop Shop  
**Tagline:** "Your Goals, Your Game, Your Words."  
**Location:** Pandiali, Danishkool Road Adda Bazar, District Mohmand, KPK, Pakistan  
**Business Type:** Physical local shop + online ecommerce + printing/document services  
**Shop Hours:** Monday–Sunday, 7:00 AM–8:00 PM  
**Online Orders:** 24/7

---

## 1. Project Overview

### 1.1 Purpose

The website has four primary purposes:

- Sell sports products online
- Sell stationery and educational products online
- Provide printing/document services
- Establish and promote the physical shop locally

### 1.2 Brand Identity

**The website must not feel like a generic ecommerce template.**

It should communicate:

| Category | Tone |
|----------|------|
| **Sports** | Energetic |
| **Education/Stationery** | Clean and student-friendly |
| **Printing** | Professional and practical |
| **Physical Shop** | Local, trustworthy and accessible |

### 1.3 Core Customer Actions

- Buy Online
- Visit Shop
- Search Products
- Contact/WhatsApp
- Request Product
- Request Printing
- Bulk Order
- Track Order

---

## 1.4 Multiple Order Channels

**The website supplements, not replaces, existing order channels.**

Hubaib One Stop Shop operates three concurrent order channels:

1. **Website** — customer self-service checkout
2. **WhatsApp** — ongoing manual channel
3. **Phone calls** — ongoing manual channel

All channels feed into the same admin dashboard and inventory system.

**Inventory is synchronized across all channels:**
- Website orders instantly deduct stock (automatic)
- WhatsApp/phone orders require admin/staff to manually adjust inventory after confirmation
- Single source of truth prevents overselling

**Order entry:**
- Website orders auto-recorded in system
- WhatsApp/phone orders kept separate (not entered into website system)
- Both affect the same inventory pool

**Why:** The physical shop is already operating with existing customer communication patterns. Forcing customers to a new channel would lose business.

---

## 2. Product Categories

### 2.1 Sports

- Cricket bats
- Cricket balls
- Wickets
- Gloves
- Tape
- Safeguards
- Sports shirts
- Footballs
- Volleyballs
- Volleyball nets
- Tennis equipment
- Other sports equipment

### 2.2 Stationery & Educational

- School caps
- Class 9–12 books
- Guides
- Notebooks
- Registers
- Pens
- Markers
- Bags
- English tenses
- Grammar books
- Islamic Dua books
- Other educational/stationery products

### 2.3 Printing & Document Services

- Photocopy/Photostat
- Original card hard copies
- Bike/vehicle cards
- Book/notebook binding
- University/job applications
- Design/logo creation
- Passport-size photos
- 4×6 photos
- A4 photos

---

## 3. Target Customers

**Primary audiences:**

- Local sportspeople
- Sports teams
- School students
- College students
- Teachers
- Families
- Job applicants
- University applicants
- Schools
- Organizations
- Small businesses
- Customers referred for printing services

---

## 4. Website Structure

### 4.1 Public Pages

- Home
- Shop (all products)
- Categories
- Product Details
- Cart
- Checkout
- Order Tracking
- Printing Services Hub
- Individual Printing Service Pages
- Bulk Orders (customer form)
- About Us
- Contact Us
- Visit Shop
- Delivery Information
- Returns & Refunds
- FAQ
- Terms & Conditions
- Privacy Policy

### 4.2 Admin/Private Areas

- Admin Dashboard
- Orders
- Products
- Categories
- Inventory
- Printing Requests
- Bulk Orders
- Customers
- Reviews
- Analytics
- Website Content
- Payments
- Delivery Zones
- Refunds/Returns
- Settings
- Activity Log

---

## 5. Homepage & UX Direction

### 5.1 Homepage Sections

**Required elements in order:**

1. Brand introduction
2. Strong hero
3. **Category Chip Strip** (Sports | Stationery | Printing) — recognizable visual element
4. Sports section
5. Stationery/Education section
6. Printing section
7. Featured products
8. Latest products
9. Popular/best-selling products
10. Recommended products (admin-controlled)
11. Printing services highlight
12. Bulk order CTA
13. Visit Shop section (location/map/hours/WhatsApp CTA)
14. Relevant promotional sections
15. Footer with signature element

### 5.2 UX Philosophy

- Shopping + physical-store identity combined
- Support both online and offline discovery
- Mobile-first approach

---

## 6. Product Management

### 6.1 Product Data Model

Each product includes:

- Name
- Description
- Price
- Discount (if applicable) — supports percentage or fixed-amount discounts
- Multiple images (up to 8 images max)
- Category
- Subcategory
- Variants with independent stock and pricing
- Availability status
- Size, Color (where applicable)
- SEO metadata (title, description, slug, structured data)

**Pricing & Discounts:**
- Base price per product/variant
- Support both percentage (e.g., 20% off) and fixed-amount (e.g., PKR 500 off) discounts
- Different prices/discounts per variant supported
- Scheduled discounts with start/end dates + manual enable/disable
- Owner/Super Admin and Admin Staff can manage discounts

**Note:** SKU, brand, and detailed specifications not required initially; SEO metadata handled separately.

### 6.2 Product Images

**Admin capabilities:**

- Upload
- Replace
- Reorder
- Remove

**Image constraints:**

- Max 5 MB per image
- Up to 8 images per product
- Admin-only uploads (not customer-uploaded)

**Image system features:**

- Automatic resize/compression
- WebP/AVIF optimization where appropriate
- Responsive sizes
- Lazy loading
- Proper loading priority
- Appropriate aspect ratios
- Automatic responsive image generation
- Cloud object storage + CDN

### 6.3 Product Variants

Variants support independent stock tracking.

**Example:**

```
Sports Shirt
├── Small    → 5 units
├── Medium   → 8 units
├── Large    → 3 units
└── XL       → 0 units
```

Availability displays actual variant inventory.

### 6.4 Product Deletion

Products can be permanently deleted. However, historical orders must retain a product snapshot with essential information so old orders don't break.

### 6.5 Product Discovery

Customers discover products through:

- Category browsing
- Search (product names, descriptions, keywords, categories)
- Filters (category, price, availability, size, color, other variants)
- Featured products
- Latest products
- Popular/best-selling products
- Admin-controlled Recommended products

**Search features:**
- Search covers: product names, descriptions, relevant keywords, categories, subcategories
- Autocomplete suggestions appear as customer types
- No results handling: show clear message + alternative categories + recommended products + WhatsApp contact option

### 6.6 Product Cards

Display:

- Product image
- Name
- Price
- Discount (where applicable)
- Availability status
- Relevant variant information
- Primary action (Add to Cart)
- Quick View option

Requirements:

- Touch-friendly
- Accessible
- Visually restrained
- Consistent
- Responsive

### 6.7 Product Categories

Hierarchy:

```
Main Category
├── Subcategory
│   ├── Product
│   └── Product
└── Subcategory
    └── Product
```

Admin can:

- Create/edit/delete subcategories
- Manage category hierarchy

---

## 7. Shopping Experience

### 7.1 Cart

- Persistent access throughout shopping
- After adding a product: clear confirmation + "Continue Shopping" option
- Customers can: continue shopping, view cart, or checkout
- Easy quantity/variant adjustment
- Item removal

### 7.2 Checkout Flow

**Recommended final flow:**

1. Customer Information
2. Delivery/Pickup Selection
3. Payment Method
4. Review Order
5. Confirmation

**Design principles:**

- Short and focused
- Mobile-first
- Accessible
- Clear language
- Low-friction

### 7.3 Customer Checkout (Guest + Optional Accounts)

**Flexible checkout options:**

**Option 1 — Guest Checkout (Default):**
- Browse freely without account
- Checkout as guest
- Track order by Order ID + WhatsApp number
- No account created

**Option 2 — Create Account (Optional):**
- Create account during checkout
- Email + password login
- Log in anytime to view order confirmation and order history
- Account optional, not required

**Required customer information:**

- Name
- WhatsApp
- Email
- Delivery address (for home delivery)
- Delivery method

**Note:** Order tracking always works with Order ID + WhatsApp, even without an account.

---

## 8. Delivery & Pickup

### 8.1 Delivery Types

#### Home Delivery

- Fixed delivery-zone charges (not distance-based)
- No minimum order amount
- **Admin decides** whether to self-deliver or use courier service
- **Admin assigns delivery date/time** after order is placed (based on their schedule)
- Requires full address, area/village, landmark, city/district
- Customer does not specify preferred delivery time at checkout

#### Shop Pickup

- PKR 0 delivery fee
- Available during shop hours (7:00 AM–8:00 PM)
- **No appointment required** — customer picks up anytime during shop hours
- Order must be "Ready" first (payment confirmed)
- Admin does not restrict pickup to a fixed appointment time

### 8.2 Delivery Zones

Admin manages (Super Admin only):

- Create/edit/delete zones
- Name
- Fixed delivery charge (configurable, not hard-coded)
- Enable/disable availability

**Three delivery zones:**

1. **Pandiali** — Local residential area where physical shop is located
2. **Mohmand** — Entire District Mohmand
3. **KPK** — Wider Khyber Pakhtunkhwa province

### 8.3 Outside Delivery Zone

If customer's location isn't covered:

- Home Delivery unavailable
- Show WhatsApp/contact option

---

## 9. Order Management

### 9.1 Order Lifecycle

**Complete customer-facing status progression:**

```
Order Received → Pending Payment → Processing → Ready → Out for Delivery → Delivered
```

**Status details:**

- **Order Received:** Order placed, confirmation sent to customer
- **Pending Payment:** Awaiting payment confirmation
  - COD: awaiting in-person payment
  - JazzCash/Easypaisa: awaiting screenshot verification
- **Processing:** Payment confirmed, order being prepared for fulfillment
- **Ready:** Order prepared and ready
  - For Shop Pickup: "Ready for Pickup" (customer can pick up anytime 7 AM–8 PM)
  - For Home Delivery: Awaiting delivery assignment
- **Out for Delivery:** Assigned to delivery (self or courier), in transit (home delivery only)
- **Delivered:** Order completed
  - Shop Pickup: Customer picked up during shop hours
  - Home Delivery: Delivered to address

**Alternative terminal states:**

- Cancelled (only before Processing state)

### 9.2 Stock Deduction

**Critical rule:** Stock is deducted in real-time across all order channels.

**Website orders:** Stock deducted immediately when order is placed (before payment confirmation).

**WhatsApp/Phone orders:** Admin/staff manually adjusts inventory in admin panel after the order is confirmed through WhatsApp.

**Deduction behavior:**
- Happens exactly once per order
- If any item lacks sufficient stock, order cannot proceed until resolved
- No partial stock deduction
- Admin can manually adjust stock anytime
- Single source of truth across all channels (website, WhatsApp, phone)

### 9.3 Order Cancellation

- Customers cannot directly cancel orders
- Must contact/request through shop
- Cancellation allowed only before Processing state
- Paid orders cannot be cancelled through normal workflow

### 9.4 Order Tracking

Customers track using:

- Order ID + WhatsApp number

Tracking displays:

- Order status
- Order items
- Total price
- Payment status
- Delivery/pickup information
- Assigned date/time (where applicable)

---

## 10. Payments

### 10.1 Payment Methods

- COD (Cash on Delivery)
- JazzCash
- Easypaisa

### 10.2 Payment Confirmation Required

**Critical rule:** Orders do NOT move to Processing until payment is confirmed.

**For COD (Cash on Delivery):**
- Customer places order → Order Received → Pending Payment
- Order awaits payment in person
- Once paid, order moves to Paid status
- Order can then proceed to Processing

**For JazzCash/Easypaisa (manual verification):**
- Customer places order → Order Received → Pending Payment
- Customer sends payment screenshot via WhatsApp or upload
- Admin verifies payment details and reference
- Admin marks order as Paid in admin panel
- Order can then proceed to Processing

**Gateway integration available for online payments, with manual fallback for screenshot verification.**

### 10.3 COD Behavior

- Customer submits order → Order Received immediately
- Admin later reviews and can move to Processing (after payment received)
- Available for: Home Delivery + Shop Pickup

### 10.4 Online Payments

Online payment must complete successfully before order becomes confirmed.

**On failed payment:**

- Show clear explanation
- Allow retry
- Preserve safe checkout information where appropriate

### 10.5 Manual JazzCash/Easypaisa

Workflow:

1. Customer pays → enters transaction/reference ID → submits screenshot
2. Order waits for admin verification
3. Admin verifies: reference, screenshot, payment details
4. Admin records payment status

### 10.6 Payment Status Lifecycle

```
Pending → Paid → Failed → Refunded
```

Admin can manually override payment status with appropriate logging.

### 10.7 Payment Security

Architecture requires:

- Server-side verification
- Signature verification
- Webhook verification (where applicable)
- Idempotency
- Transaction/reference validation
- Secure error handling

**Refund:**

- Automatic gateway refund where supported
- Fallback: Admin manually records JazzCash/Easypaisa refund

---

## 11. Returns & Refunds

### 11.1 Returns Tracking

**All returns tracked in admin panel, even if customer initiates via WhatsApp.**

Process:

1. Customer initiates return request via WhatsApp
2. Admin logs/creates the return request in admin panel
3. Admin tracks entire return process:
   - Approval/rejection
   - Return type (normal vs damaged/wrong product)
   - Items being returned
   - Return shipping status
   - Refund processing status
4. Customer communication happens via WhatsApp
5. All record-keeping centralized in admin system

### 11.2 Normal Returns

- Request through WhatsApp/contact
- Within 1 day after delivery
- Product must be unopened
- Customer pays return shipping

### 11.3 Damaged/Wrong Product

- Separate process from normal returns
- Opening product for inspection doesn't disqualify damaged/wrong-product claim
- Shop pays return shipping

### 11.4 Refund Processing

- Requires admin approval
- Processed within 2–3 business days after approval
- Via JazzCash/Easypaisa
- Automatic gateway refund where supported
- Manual fallback for manual refund recording

### 11.5 Stock After Refund/Cancellation

Admin manually adjusts stock.

---

## 12. Bulk Orders

### 12.1 Bulk Order Eligibility

Available for:

- Schools
- Teams
- Organizations

### 12.2 Bulk Order Form

Customer provides:

- Name
- WhatsApp
- Organization/school/team name
- Products & quantities
- Optional message

### 12.3 Bulk Order Workflow

**Customer submits → Auto-confirmed → Admin contacts via WhatsApp → Processing**

```
Requested → Processing → Completed / Cancelled
```

**Detailed process:**

1. Customer submits bulk order request (organization name, products, quantities, message)
2. Request is **auto-confirmed immediately**
3. Request appears in admin panel
4. Admin reviews and contacts customer via WhatsApp to:
   - Discuss pricing (negotiate/finalize)
   - Confirm delivery/pickup details
   - Arrange timeline
5. Admin manages entire order from admin panel:
   - Add notes
   - Adjust quantities if needed
   - Track status
   - Update delivery/pickup details

Pricing handled manually through WhatsApp. No formal quotation system required.

**Important:** Bulk orders have **NO payment method** (no COD, JazzCash, Easypaisa). Payment completely handled offline via WhatsApp negotiation. No payment status tracking in website system for bulk orders.

---

## 13. Printing Services

### 13.1 Available Services

All nine services available:

1. Photocopy/Photostat
2. Original card hard copies
3. Bike/vehicle cards
4. Book/notebook binding
5. University/job applications
6. Design/logo creation
7. Passport-size photos
8. 4×6 photos
9. A4 photos

### 13.2 Printing Service Pricing

Fixed and admin-managed. Owner/Super Admin sets prices in admin panel for each of the 9 printing services.

**Customers see prices** on the Printing Services page before submitting a request.

Admin can update/edit prices anytime.

### 13.3 Customer Printing Request

Customer selects:

- Service
- Quantity (where applicable)
- Service-specific options
- Pickup/delivery preference
- Optional message

**Important:** No document upload through website. Documents sent via WhatsApp.

### 13.4 Printing Request Workflow

**Customer submits → Admin approves → Admin contacts via WhatsApp → Processing**

```
Requested → Processing → Ready → Completed / Cancelled
```

**Detailed process:**

1. Customer submits printing request on website
2. Request appears in admin panel
3. Admin reviews and approves/rejects the request
4. Once approved, admin contacts customer via WhatsApp to:
   - Confirm details
   - Finalize pricing
   - Arrange delivery/pickup timing
5. Customer confirms via WhatsApp
6. Request moves to Processing → Ready → Completed

When Ready: Admin manually contacts customer through WhatsApp with pickup/delivery instructions.

### 13.5 Printing Request Tracking

Customer receives: **Request ID**

Customer can track using:

- Request ID + WhatsApp number

Tracking displays:

- Customer name
- Service
- Quantity
- Status
- Relevant details

### 13.6 Printing WhatsApp Integration

Prefilled WhatsApp message can include:

- Request ID
- Customer name
- Selected service
- Quantity

**Note:** No automatic WhatsApp notifications; manual contact only.

---

## 14. Product & Service Requests

### 14.1 Customer Product Requests

For unavailable products, customer submits:

- Name
- WhatsApp
- Product name
- Desired quantity
- Optional message

### 14.2 Product Request Workflow

**Customer submits → Auto-confirmed → Admin contacts via WhatsApp**

```
Pending → Contacted → Completed / Cancelled
```

**Detailed process:**

1. Customer submits product request (name, WhatsApp, product name, quantity, message)
2. Request is **auto-confirmed immediately**
3. Request appears in admin panel
4. Admin reviews and contacts customer via WhatsApp to:
   - Confirm if the product can be sourced
   - Discuss pricing if available
   - Communicate timeline for sourcing

Admin can see all request details and follow up accordingly.

---

## 15. Reviews

### 15.1 Review System

Customers can submit:

- Rating (star rating)
- Written review

### 15.2 Review System Details

- **Who can review:** Only customers who have purchased the product
- **When reviews appear:** Immediately after submission (no pre-moderation)
- **Admin control:** Admin can remove reviews if needed
- **Customer control:** Customers cannot edit or delete their own reviews
- **Data captured:** Star rating + written review text

**Implication:** System must track which products each customer has purchased, and only allow reviews for those products.

---

## 16. Recommendations

### 16.1 Recommended Products

Remain part of website experience.

**Manual curation by Admin:**
- Admin can select, add, remove, replace, and reorder recommended products anytime
- Display locations:
  - Dedicated homepage section
  - Relevant product/category listing pages
- No automatic AI recommendation engine

**Implementation:** Admin panel needs simple interface to manage the list (drag-to-reorder, add/remove buttons).

---

## 17. Admin Dashboard

### 17.1 Dashboard Overview

- Total orders
- Pending orders
- Processing orders
- Delivered orders
- Total sales
- Low stock items
- Out of stock items
- Pending bulk requests
- Product requests
- Recent orders
- Recent reviews
- Notifications

### 17.2 Admin Main Navigation

- Dashboard
- Orders
- Products
- Categories
- Inventory
- Printing Requests
- Bulk Orders
- Customers
- Reviews
- Analytics
- Website Content
- Payments
- Delivery Zones
- Refunds/Returns
- Settings
- Activity Log

Admin account management lives under Settings.

---

## 18. Admin Roles & Permissions

### 18.1 Admin Team

**Expected size:** 1-2 Admin staff + 1 Owner/Super Admin

### 18.2 Role Hierarchy

#### Owner / Super Admin

Full access:

- Create/delete/manage other admin accounts
- Activate/deactivate admins
- Reset admin passwords
- Change roles/permissions
- Change critical system/security settings
- Change payment gateway configuration/credentials
- Delete/archive historical records
- Modify core business rules
- Full business management
- Manage delivery zone charges
- Manage printing service pricing
- Manage website critical content (Terms, Privacy Policy, etc.)

#### Admin Staff (1-2 people)

Business management access:

- **Orders:** View, update status, assign delivery/pickup details, view customer/order info
- **Inventory:** View stock, adjust levels, manage low/out-of-stock alerts
- **Products:** Add, edit, update prices, images, categories, variants, discounts, availability
- **Payments:** Verify JazzCash/Easypaisa payments, view payment status, record refunds
- **Printing Requests:** Manage requests, update status
- **Bulk Orders:** View requests, add notes, update status, communicate via WhatsApp
- **Customers:** View customer/order history and information
- **Reviews:** View and remove reviews
- **Analytics:** View sales, orders, popular products, category performance, inventory trends
- **Website Content:** Manage approved business content (About, Services, FAQs, delivery info, etc.)

**Cannot do:**

- ❌ Create, delete, or manage other admin accounts
- ❌ Change admin roles or permissions
- ❌ Change critical system/security settings
- ❌ Change payment gateway configuration/credentials
- ❌ Delete historical orders or important business records
- ❌ Modify core business rules
- ❌ Set delivery zone charges (read-only)
- ❌ Set printing service pricing (read-only)
- ❌ Manage critical policies (Terms, Privacy Policy)

---

## 19. Admin Authentication & Security

### 19.1 Authentication Requirements

- Email + password login
- Strong password hashing
- Secure sessions
- Session expiration
- Logout all devices capability
- Session revocation
- Password reset
- Rate limiting
- Brute-force protection
- Suspicious-login protection

**Note:** 2FA not currently required.

### 19.2 Password Reset

Requirements:

- Secure expiring token
- One-time use
- Token invalidation after password change
- Secure email reset
- Owner/Super Admin manual reset capability

---

## 20. Admin Notifications

### 20.1 Customer Notifications & Communication

**No automatic notifications:**
- No automatic customer emails
- No automatic WhatsApp notifications

**Order confirmation:**
- You (admin) manually send WhatsApp message with order details after order is placed/payment confirmed

**Status updates:**
- No automatic notifications
- Customer checks tracking page themselves by Order ID + WhatsApp number

**Manual WhatsApp:**
- You contact customer via WhatsApp only when needed (exceptions, issues, special cases)

### 20.2 Admin Dashboard Notifications

Notification-only approach (dashboard alerts, no automatic WhatsApp/email system required).

Important events:

- New order
- Out-of-stock product
- Product request
- New review
- Payment received
- Cancellation request
- Other important business events

---

## 21. Admin Features

### 21.1 Activity Log

Log important events:

- Orders
- Stock changes
- Products
- Payments
- Refunds
- Content changes
- Important authentication/security events
- Important admin actions

**Avoid:** Excessive logging of routine page views.

Use tamper-resistant audit approach where practical.

### 21.2 Customer Directory

Admin can search/view customers based on order history.

Information displayed:

- Name
- WhatsApp
- Email
- Delivery address
- Previous orders
- Total orders
- Total amount spent

Search by WhatsApp.

**Constraints:**

- Admin cannot directly edit customer information
- No customer export system required

### 21.3 Customer Data Deletion

Customer contacts shop → Admin manually handles:

- Deletion
- Anonymization
- Retention policies

### 21.4 Content Management

**Owner/Super Admin (full control):**
- Critical policies: Terms & Conditions, Privacy Policy
- System-level content
- Security-related content

**Admin Staff (routine business content):**
- About Us
- Services description
- FAQs
- Delivery information
- Returns/refund policy
- Homepage promotional sections
- Other routine business content

**Update frequency:**
- Promotions/homepage: Frequently (staff manages)
- Routine business content: As needed (staff manages)
- Critical/static pages: Rarely (owner only)

---

## 22. Analytics & Monitoring

### 22.1 Analytics & Reporting

**Metrics to track:**

- Sales (revenue totals)
- Orders (count, trends)
- Average order value
- Top-selling products
- Category performance (Sports vs Stationery vs Printing)
- Customer insights (repeat customers, new vs returning)
- Inventory trends (fast-moving, slow-stock items)
- Printing-service performance (which services most requested)
- Payment methods (COD vs JazzCash vs Easypaisa usage)
- Delivery/pickup breakdown (home delivery vs shop pickup)

**Time period support:**

- Daily
- Weekly
- Monthly
- Yearly

**Usage pattern:**

- **Daily:** Operational metrics (today's orders, sales, pending orders, out-of-stock alerts)
- **Weekly/Monthly:** Broader business trends (top products, category performance, customer patterns)

**Analytics tools:**

- Google Analytics
- Google Search Console
- Privacy-friendly analytics

**Note:** Final implementation should avoid unnecessary tracking and respect privacy requirements.

---

## 23. SEO Strategy

### 23.1 Target Geography

- Pandiali
- District Mohmand
- Wider KPK

### 23.2 SEO Coverage Keywords

- Sports shop
- Sports equipment
- Stationery
- Educational books
- Printing services
- Document services
- Local variations of these keywords

Additional relevant local keywords will be generated during SEO specification phase.

### 23.3 Business SEO

Exact business name appears appropriately in:

- SEO titles
- Meta descriptions
- Headings/content
- Relevant image alt text

### 23.4 Product SEO

Each public product includes:

- SEO title
- Meta description
- Optimized slug
- Product structured data/schema

### 23.5 Service SEO

Structure:

- Main Printing page (`/printing`)
- Individual important service pages:
  - `/printing/photocopy`
  - `/printing/passport-photos`
  - etc.

### 23.6 Structured Data

Implement appropriate schema for:

- Local/business information
- Products
- Breadcrumbs
- Reviews
- Services

**Only where appropriate and supported by actual page content.**

### 23.7 Google Business Profile

Physical shop should have a Google Business Profile. (User plans to create later.)

Website designed to support this local-search strategy.

### 23.8 Google Maps

Contact/Visit Shop section provides:

- Embedded Google Map
- Directions link

### 23.9 Social SEO

Support:

- Facebook
- WhatsApp
- Other active platforms

Social metadata includes Open Graph and relevant social sharing metadata.

### 23.10 Indexing

**Public pages:** Indexable

**Private pages must be noindex:**

- Admin
- Dashboard
- Private/order-management areas
- Other sensitive/private workflows

### 23.11 Sitemap & Robots

Implement:

- XML sitemap
- robots.txt
- Automatic sitemap updates when relevant public products/pages change

### 23.12 Image SEO

Images require:

- Proper filenames
- Contextual alt text
- Optimized sizes
- Modern formats
- Responsive image generation
- Correct loading priority

Decorative images: appropriate accessibility treatment.

### 23.13 SEO Administration

Admin SEO controls include:

- SEO title
- Meta description
- Keywords (where useful)
- Open Graph/social metadata
- Canonical URL
- Advanced SEO controls

---

## 24. Performance

### 24.1 Performance Goals

- Maximum practical performance without sacrificing required functionality/design
- Excellent Core Web Vitals on mobile and desktop

### 24.2 Performance Architecture

Use:

- Server-first rendering
- Minimal Client Components
- Code splitting
- Lazy loading
- Strategic caching
- Revalidation
- Indexed database queries
- Pagination
- Optimized APIs
- Deferred third-party scripts
- Responsive images
- Optimized fonts

### 24.3 Performance Budgets

Define explicit budgets for:

- Page weight
- JavaScript
- Images
- Fonts
- API response times
- Database queries

Measure with:

- Lighthouse
- PageSpeed Insights
- Core Web Vitals
- Production monitoring

---

## 25. Accessibility

### 25.1 Accessibility Target

**WCAG 2.2 AA**

### 25.2 Accessibility Requirements

- Keyboard navigation
- Visible focus indicators
- Logical focus order
- Semantic HTML
- Appropriate ARIA
- Accessible names/states
- Contextual alt text
- Accessible forms
- Accessible validation
- Accessible modals
- Accessible mobile drawer
- Screen-reader-friendly dynamic updates
- Respect `prefers-reduced-motion`

### 25.3 Color Accessibility

Never rely on color alone for:

- Availability
- Errors
- Payment status
- Order status
- Success
- Warnings

Use text and/or icons as supporting indicators.

### 25.4 Testing & Verification

- Keyboard navigation
- Screen-reader testing
- Automated accessibility testing
- No critical blockers before launch

---

## 26. Responsive Design

### 26.1 Design Philosophy

Mobile-first approach.

### 26.2 Device Support

- Phones
- Tablets
- Laptops
- Desktop

Layouts gracefully adapt to available space.

### 26.3 Mobile UX

Mobile experience includes:

- Accessible drawer/navigation
- Prominent search
- Responsive product grids
- Touch-friendly cards
- Full product gallery
- Accessible Quick View
- Persistent cart
- Short checkout flow
- Order tracking
- Printing request flow
- Visit Shop section
- Map & directions
- Contact actions

---

## 27. Visual Design System

### 27.1 Overall Direction

**Modern + Professional + Energetic**

Distinctive identity — NOT copying competitors. Hubaib One Stop Shop must have its own authentic, memorable identity.

**Emotional tone:**
- Modern
- Professional
- Energetic
- Trustworthy
- Locally connected

**Business positioning:** Real, established local business with a modern digital presence — NOT a generic ecommerce template.

### 27.2 Avoid

- Generic ecommerce appearance
- Generic Shopify-style templates
- Excessive animations
- Heavy shadows
- Clutter
- Overly futuristic appearance
- AI-generated aesthetics

Design must feel specifically created for **Hubaib One Stop Shop.**

### 27.3 Category Visual Treatments

| Category | Treatment |
|----------|-----------|
| **Sports** | Bold, energetic, active |
| **Stationery** | Clean, organized, friendly, student-focused |
| **Printing** | Practical, professional, service-focused |

All three remain under one cohesive brand system.

### 27.4 Color System

**Design tokens:**

| Role | Color | Usage |
|------|-------|-------|
| Primary | #0A3D2F | Main actions, key elements, brand strength |
| Secondary | #D16B46 | Supporting accents, energetic moments, sports highlights |
| Neutral | #F7F0E7 | Background, surfaces, breathing room |
| Support | #6B8A6B | Tertiary accent, calm elements |
| Text | #212121 | Body text, headers |

### 27.5 Typography

**Display Font:** Cormorant Garamond
- Major headings
- Brand moments
- Hero sections

**Body Font:** Inter
- Body text
- UI elements
- Accessibility-first reading

**Initial scale:**

| Element | Size |
|---------|------|
| H1 | 60px |
| H2 | 48px |
| H3 | 36px |
| Body | 16px |
| Small | 14px |

Responsive adjustments on smaller screens.

### 27.6 Design System Components

Formal design system includes:

- Color tokens
- Typography tokens
- Spacing scale
- Border radius
- Shadows
- Responsive breakpoints
- Buttons (3 variants)
- Cards
- Forms & inputs
- Navigation
- Product cards
- Service cards
- Status components
- Dialogs/modals
- Loading states
- Error states
- Empty states

### 27.7 Buttons

**Three main variants:**

| Variant | Usage | Example |
|---------|-------|---------|
| **Primary** | Main action | "Add to Cart" |
| **Secondary** | Supporting action | "Quick View" |
| **Tertiary** | Low-emphasis action | "View Details" |

Each state:

- Default
- Hover
- Focus
- Active
- Disabled

### 27.8 Borders & Shadows

- Subtle borders
- Restrained shadows
- Avoid excessive floating cards
- Shadows primarily for elements where depth communicates function:
  - Modals
  - Important overlays
  - Hero elements (where appropriate)

### 27.9 Animation & Motion

Use purposeful micro-interactions:

- Button hover
- Focus states
- Image loading
- Subtle page transitions

**Respect:** `prefers-reduced-motion` CSS media feature.

No unnecessary movement.

### 27.10 Icons

Use one consistent professional icon system.

Icons must have:

- Consistent visual weight
- Appropriate size
- Accessible labels (where needed)
- Proper semantic treatment

---

## 28. Technical Architecture

### 28.1 Expected Technology Stack

**Frontend:**

- Next.js
- App Router
- React
- Strict TypeScript
- Tailwind CSS
- Design tokens

**Backend:**

- Next.js Route Handlers / Server Actions
- PostgreSQL
- Type-safe ORM
- Production-grade authentication
- Zod/shared validation
- Webhooks where needed

**Infrastructure:**

- Object storage/CDN
- Transactional email
- Payment provider integration

**Specific providers/libraries:** Architecture-phase decisions after inspecting actual codebase.

### 28.2 Authentication Architecture

Must provide:

- Secure sessions
- RBAC (Role-Based Access Control)
- Password hashing (bcrypt or equivalent)
- Password reset workflow
- Rate limiting
- Brute-force protection
- Session revocation
- Logout all devices capability
- Secure HTTP-only cookies
- Server-side authorization

### 28.3 API & Server Security

Every protected operation enforces:

- Authentication
- Authorization
- Input validation
- Rate limiting (where appropriate)
- Safe error messages
- Output handling

**Golden rule:** Never trust frontend restrictions as security.

### 28.4 Input Security

User input requires:

- Strict validation
- Sanitization
- Output escaping
- XSS protection
- Injection protection (SQL, NoSQL, command, etc.)

### 28.5 Database Security

Use:

- Least privilege
- Application authorization
- Database security controls
- RLS (Row-Level Security) where applicable
- Proper indexes
- Query optimization

### 28.6 Upload Security

Any uploaded content requires:

- MIME type validation
- File type validation
- Size limits
- Safe filename handling
- Storage isolation
- Security/malware considerations

### 28.7 Customer Data

Use:

- Encryption in transit (HTTPS)
- Minimal data collection
- Secure storage
- Access controls
- Retention controls
- Deletion/anonymization procedures

### 28.8 Error Handling

**Users receive:** Safe, understandable errors.

**Server logs contain:** Appropriate diagnostic information.

**Never expose:**

- Secrets
- Stack traces
- Internal architecture
- Sensitive payment/customer information

### 28.9 Hosting & Deployment

Hosting selected based on:

- Performance
- Security
- Payment webhooks
- Database connectivity
- Scheduled jobs
- Image processing
- Deployment requirements

**Note:** Vercel may be appropriate, but must be validated against actual requirements before final deployment.

### 28.10 Environments

Use:

- Development
- Staging/Preview
- Production

**Secrets:** Stored securely, never in Git/source code.

### 28.11 Logging

- Structured logging with sensitive-data protection
- Important business/security events must be auditable

---

## 29. Testing Strategy

### 29.1 Testing Levels

**Unit Tests:**

- Business-critical logic

**Integration Tests:**

- Database
- Payment processing
- Authentication
- Authorization

**End-to-End Tests:**

- Customer journeys
- Admin workflows

**Security Tests:**

- Authentication
- Authorization
- Input validation

**Accessibility Tests:**

- Keyboard navigation
- Screen-reader compatibility
- Automated accessibility scanning

**Performance Tests:**

- Lighthouse
- PageSpeed Insights
- Core Web Vitals

### 29.2 Testing Timeline

Critical security/payment/order/inventory rules tested **before launch**, not postponed.

---

## 30. Implementation Approach

### 30.1 Development Method

**Specification-driven + phased + verification-gated**

No uncontrolled "build everything" approach.

### 30.2 Phase Gate Process

Each major phase:

1. **Implement** → specifications to code
2. **Test** → unit, integration, E2E
3. **Verify** → against spec and acceptance criteria
4. **Audit** → security, accessibility, performance
5. **Approval** → stakeholder sign-off
6. **Next phase** → proceed only after gates pass

### 30.3 AI Coding Agent Rules

Claude Code / coding agents should:

- Read the specification thoroughly
- Inspect actual codebase before implementation
- Verify existing implementation
- Avoid assumptions about structure
- Avoid unrelated changes
- Follow architecture rules
- Follow business rules
- Run required tests before handoff
- Report changes accurately
- Verify own work
- Stop at phase boundaries
- Wait for explicit permission before moving to next major phase

---

## 31. Documentation Artifacts

Before implementation, create:

- **AGENTS.md** — Rules for coding agents
- **CLAUDE.md** — Project-specific Claude Code instructions
- **specs/** directory — Requirements and feature specifications
- **design/** directory — Visual system, UX and UI specifications
- **Technical Architecture** — System architecture and infrastructure decisions
- **User Flow Specification** — Customer/admin journeys
- **Acceptance Criteria** — Measurable conditions for each major feature
- **Implementation Plan** — Controlled development phases
- **Verification Plan** — Testing and quality gates

---

## 32. Final Quality Gates

**Before production release, verify:**

### 32.1 Functional

Everything works according to specification.

### 32.2 Business Rules

All business rules correctly enforced:

- Stock deduction exactly once
- Payment verification
- Order lifecycle
- Cancellation rules
- Refund processing
- Delivery zones
- Bulk order workflow
- Printing request workflow

### 32.3 Security

No critical security blockers:

- Authentication/authorization
- Password security
- Input validation
- Secure error handling
- Data protection

### 32.4 Accessibility

WCAG 2.2 AA target achieved with **no critical blockers**.

### 32.5 Performance

- Performance budgets met
- Core Web Vitals excellent
- Mobile and desktop verified

### 32.6 SEO

- Technical SEO implemented
- Local SEO strategy in place
- Product SEO complete
- Service SEO complete
- Structured data implemented

### 32.7 Responsive Design

- Mobile verified
- Tablet verified
- Desktop verified

### 32.8 Payments & Transactions

- COD workflow tested
- Online payment integration tested
- Webhook verification tested
- Refund process tested
- Manual payment override tested

### 32.9 Inventory

- Order-to-stock behavior verified
- Stock deduction tested
- Multiple product orders tested
- Stock insufficiency handling tested
- Admin manual adjustment tested

### 32.10 Admin Workflows

- All admin tasks verified
- Permissions working correctly
- Activity logging working
- Dashboard accurate

### 32.11 Final Audit

Requirements → Specification → Code → Tests must all match.

---

## 33. Final Product Philosophy

**The website is not simply an online catalog.**

It is a **digital version of the business:**

> **Hubaib One Stop Shop = Sports + Education + Printing + Local Community**

### 33.1 Customer Journey Support

The website allows customers to:

- **Find** products and services
- **Understand** offerings and local presence
- **Buy** online easily
- **Track** orders
- **Visit** the physical shop
- **Contact** directly

**Without forcing every customer into the same journey.**

### 33.2 Design Philosophy

The design should make the **business recognizable** rather than looking like another generic ecommerce template.

---

## 32. Language & Localization

### 32.1 Bilingual Approach

**Urdu + English**

**English role:**
- Product names and categories
- SEO metadata
- General website content
- Technical/formal information

**Urdu role:**
- Navigation
- Shopping interface
- Checkout process
- Order tracking
- Printing services descriptions
- Delivery information
- Important instructions

### 32.2 Language Switcher

- Clearly visible in header
- Available in mobile menu
- Easy toggle between languages
- Default language: English

### 32.3 Content Management

- Admin manages both English and Urdu content through Admin Panel
- Manual translations (no automatic machine translation)
- Important business content reviewed for accuracy

### 32.4 SEO & Internationalization

- Localized SEO metadata for both languages
- Appropriate language/URL handling (e.g., `/en/products` vs `/ur/products`)
- Both versions indexed and discoverable
- **Urdu RTL support required**

### 32.5 Future Flexibility

Architecture supports adding more languages later without major restructuring.

---

## 33. Launch Strategy: Phased Approach

**Each phase must be fully production-ready before release. No partial features. No rushing.**

### 33.1 Phase 1 (MVP) — Core Product Shop

**Features:**
- Product catalog with categories and search
- Guest + optional customer accounts
- Checkout flow (Customer Info → Delivery/Pickup → Payment → Review → Confirmation)
- Payment methods: COD + online (JazzCash/Easypaisa)
- Real-time inventory management (across website, WhatsApp, phone channels)
- Orders (Order Received → Pending Payment → Processing → Ready → Out for Delivery / Ready for Pickup → Delivered)
- Delivery zones + shop pickup
- Order tracking (by Order ID + WhatsApp)
- Admin dashboard (overview, orders, products, inventory, payments, customers, analytics)
- Admin authentication + roles (Owner/Super Admin + Admin Staff)
- Security essentials
- SEO implementation
- Accessibility (WCAG 2.2 AA)
- Performance optimization
- Essential website content (About, Contact, Terms, etc.)
- Bilingual support (Urdu + English)

**Release criteria:**
- All functional requirements met
- Zero critical security issues
- WCAG 2.2 AA compliance verified
- Core Web Vitals excellent
- All business rules correctly enforced
- E2E tests passing
- Production monitoring ready

**Timeline:** No fixed deadline. Launch when ready.

### 33.2 Phase 2 — Secondary Business Features

**Features:**
- Printing services + requests + tracking + manual approval workflow
- Bulk orders + requests + auto-confirmation
- Product requests + auto-confirmation
- Customer reviews (purchased product verification)
- Returns/refunds workflow (tracked in admin panel)
- Advanced analytics
- Other secondary business features

**Release criteria:** Same as Phase 1

**Trigger:** Only after Phase 1 approval

### 33.3 Phase 3 — Future Enhancements

**Possible features:**
- Mobile app
- Advanced automation
- Courier API integration
- Additional integrations
- Features based on real customer needs
- Further optimization

**Trigger:** Post-launch based on actual usage patterns

### 33.4 Development Process

1. **Implement** → Code phase
2. **Test** → Unit, integration, E2E
3. **Verify** → Against spec + acceptance criteria
4. **Audit** → Security, accessibility, performance
5. **Approval** → Explicit sign-off from owner
6. **Next phase** → Proceed only after approval

### 33.5 Key Principle

**Quality > Timeline**

No arbitrary deadlines. No partially working features in production. Each phase must meet all production-readiness gates.

---

## 34. Admin Dashboard

### 34.1 Dashboard Layout

**First impression:** Dashboard Overview appears first when admins log in.

**Layout approach:**
- Summary cards + actionable tables/lists
- Quick actions for:
  - Pending orders
  - Products (add, edit, manage)
  - Low stock alerts
  - Out of stock items
  - Printing requests
  - Bulk orders
  - New reviews
  - Payment verification needed

**Overview metrics:**
- Total orders
- Pending orders (awaiting payment)
- Processing orders
- Delivered orders
- Total sales (today, this week, this month)
- Low stock items
- Out of stock items
- Pending bulk requests
- Product requests
- Recent orders
- Recent reviews
- Notifications

### 34.2 Admin Main Navigation

- Dashboard
- Orders (view, update status, assign delivery)
- Products (add, edit, manage variants, pricing, discounts)
- Categories (manage hierarchy, subcategories)
- Inventory (view stock, adjust levels, manage alerts)
- Printing Requests (view, approve/reject, track status)
- Bulk Orders (view, add notes, update status)
- Customers (view customer info, order history)
- Reviews (view, remove inappropriate reviews)
- Analytics (sales, orders, products, categories, inventory trends, printing performance, payments, delivery breakdown)
- Website Content (manage business content, promotions, pages)
- Payments (verify payments, view payment status, record refunds)
- Delivery Zones (manage zones, set delivery charges)
- Refunds/Returns (track returns, process refunds)
- Settings (admin account management, security settings, payment gateway config, system settings)
- Activity Log (view important events, audit trail)

---

## 35. Activity Logging

### 35.1 What to Log

Log important business and security actions only:

- Orders (created, status changes, cancellations)
- Stock changes (manual adjustments, deductions)
- Products (created, edited, deleted)
- Payments (recorded, verified, refunded)
- Refunds (processed, recorded)
- Content changes (major policy/content updates)
- Important authentication/security events (admin login, failed attempts, password resets)
- Important admin actions (user creation, permission changes, system settings)

**Do NOT log:**
- Routine page views
- Every product view
- Every search query
- Every cart addition

### 35.2 Retention

- Retain logs as long as reasonably required for:
  - Security audit trail
  - Business/operational purposes
  - Compliance with legal requirements
- No automatic deletion after fixed period
- Owner can manually archive/delete logs if needed

---

## 36. Payment Integration

### 36.1 Payment Methods

- **COD** (Cash on Delivery)
- **JazzCash** (online gateway + manual screenshot verification)
- **Easypaisa** (online gateway + manual screenshot verification)

### 36.2 JazzCash/Easypaisa Integration

**Gateway integration + manual fallback:**

**Option 1 — Gateway Integration (if APIs available):**
- Direct payment processing through official APIs
- Real-time payment confirmation
- Automatic order status updates

**Option 2 — Manual Verification (fallback):**
- Customer sends transaction/reference ID + screenshot
- Admin verifies reference against merchant account
- Admin verifies screenshot shows payment confirmation
- Admin records payment status in admin panel

**Merchant/API availability will be verified during implementation phase.**

### 36.3 Payment Security

- Server-side verification
- Signature verification (where applicable)
- Webhook verification (where applicable)
- Idempotency (prevent duplicate charges)
- Transaction/reference validation
- Secure error handling
- No exposing sensitive payment information in logs/errors

---

## 37. Delivery Management

### 37.1 Delivery Approach

**Manual delivery management at launch** (no courier API integration initially).

**Admin decides delivery method per order:**
- Self-delivery (owner delivers)
- Courier service (TCS, Leopards, etc.)

**Admin assigns delivery details:**
- Delivery date
- Delivery time
- Delivery method
- Courier/handler assignment (if applicable)

**Courier integration can be added later** when:
- Specific courier partner is selected
- APIs become available
- Volume justifies integration effort

---

## 38. Infrastructure & Hosting

### 38.1 Hosting Requirements

Production-grade cloud hosting selected during architecture phase based on:

- Performance requirements
- Security capabilities
- Payment webhook support
- Database connectivity
- Scheduled jobs/background tasks
- Image processing/optimization
- Deployment and scaling requirements

**Candidates to evaluate:**
- Vercel (after technical validation against requirements)
- AWS
- Other cloud platforms

### 38.2 Environments

- **Development** — local development
- **Staging/Preview** — pre-production testing
- **Production** — live website

**Secrets management:**
- Stored securely in environment variables
- Never committed to Git/source code
- Different secrets per environment

### 38.3 Internationalization Support

- **Urdu RTL (right-to-left) text display required**
- Proper text direction handling
- Date/time formatting for local context
- Currency display (PKR)

---

## 39. File Uploads & Document Handling

### 39.1 Customer File Uploads

**Printing document submission:**
- Customers send documents via WhatsApp ONLY
- No website upload for printing documents
- Admin contacts customer after printing request approval to request documents

**Why:** Simplifies document management, keeps workflow aligned with existing WhatsApp communication.

### 39.2 Admin File Uploads

Admin can upload relevant files to:
- Orders (invoices, receipts, documentation)
- Printing requests (reference images, specifications)
- Bulk orders (quotes, contracts)

**Security requirements:**
- MIME type validation
- File type validation (whitelist)
- Size limits
- Safe filename handling
- Storage isolation
- Secure access controls

---

## 40. Customer Data & Privacy

### 40.1 Data Retention

**Keep data as long as there's legitimate business/legal need:**

- Active customers: Keep indefinitely (for order history, repeat orders, customer service)
- Inactive customers: Retain while there's business/legal purpose (tax records, dispute resolution, etc.)
- Do NOT automatically delete after fixed short period
- Subject to applicable legal requirements (data protection laws)

### 40.2 Data Deletion & Anonymization

**Customer-initiated:**
- Customer contacts shop requesting deletion
- Admin manually handles:
  - Full deletion of personal data
  - Anonymization of order records (keep order history without personal details)
  - Based on legal/business requirements

### 40.3 Customer Data Access

**Data collected:**
- Name
- Email
- WhatsApp
- Delivery address(es)
- Order history
- Payment information (reference only, not credit card details)

**Access controls:**
- Only authorized admins who need it for business operations
- No customer self-service data export
- Admin cannot directly edit customer information (only view)
- Customers contact shop to correct information; admin updates manually

### 40.4 Privacy & Security

- Collect only necessary information
- Protect data securely (encryption in transit, secure storage)
- Clear Privacy Policy explaining:
  - What data is collected
  - How it's used
  - How long it's retained
  - How customers can request deletion
  - Data security measures

---

**End of Specification Document**

*Last Updated: 2026-09-23*
*Compiled from Master Specification + 38-Question Interview*
