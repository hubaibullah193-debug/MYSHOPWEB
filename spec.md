

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
- Discount (if applicable)
- Multiple images
- Category
- Subcategory
- Variants with independent stock
- Availability status
- Size, Color (where applicable)
- SEO metadata (title, description, slug, structured data)

**Note:** SKU, brand, and detailed specifications not required initially; SEO metadata handled separately.

### 6.2 Product Images

Admin capabilities:

- Upload
- Replace
- Reorder
- Remove

Image system features:

- Responsive sizes
- WebP/AVIF support where appropriate
- Automatic optimization
- Lazy loading
- Proper loading priority
- Appropriate aspect ratios
- Automatic responsive image generation

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
- Search
- Filters (category, price, availability, size, color, other variants)
- Featured products
- Latest products
- Popular/best-selling products
- Admin-controlled Recommended products

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

### 7.3 Guest Checkout

**No customer accounts.** All purchases are guest orders.

Required customer information:

- Name
- WhatsApp
- Delivery address (for home delivery)
- Email
- Delivery method

---

## 8. Delivery & Pickup

### 8.1 Delivery Types

#### Home Delivery

- Fixed delivery-zone charges (not distance-based)
- No minimum order amount
- Admin assigns delivery date/time
- Requires full address, area/village, landmark, city/district

#### Shop Pickup

- PKR 0 delivery fee
- Available during shop hours (7:00 AM–8:00 PM)
- Admin may suggest/assign pickup time, but not restricted to appointment

### 8.2 Delivery Zones

Admin manages:

- Create/edit/delete zones
- Name
- Fixed delivery charge
- Enable/disable availability

### 8.3 Outside Delivery Zone

If customer location isn't covered:

- Home Delivery unavailable
- Show WhatsApp/contact option

---

## 9. Order Management

### 9.1 Order Lifecycle

**Standard progression:**

```
Order Received → Processing → Ready → Out for Delivery → Delivered
```

**Alternative terminal state:**

- Cancelled

### 9.2 Stock Deduction

**Critical rule:** Stock deducted when order transitions from Received → Processing.

- Deduction happens exactly once
- If any item lacks sufficient stock, transition fails until resolved
- No partial stock deduction
- Admin can manually adjust stock

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

### 10.2 COD Behavior

- Customer submits order → Order Received immediately
- Admin later reviews and can move to Processing
- Available for: Home Delivery + Shop Pickup

### 10.3 Online Payments

Online payment must complete successfully before order becomes confirmed.

**On failed payment:**

- Show clear explanation
- Allow retry
- Preserve safe checkout information where appropriate

### 10.4 Manual JazzCash/Easypaisa

Workflow:

1. Customer pays → enters transaction/reference ID → submits screenshot
2. Order waits for admin verification
3. Admin verifies: reference, screenshot, payment details
4. Admin records payment status

### 10.5 Payment Status Lifecycle

```
Pending → Paid → Failed → Refunded
```

Admin can manually override payment status with appropriate logging.

### 10.6 Payment Security

Architecture requires:

- Server-side verification
- Signature verification
- Webhook verification
- Idempotency
- Transaction/reference validation
- Secure error handling

**Refund:**

- Automatic gateway refund where supported
- Fallback: Admin manually records JazzCash/Easypaisa refund

---

## 11. Returns & Refunds

### 11.1 Normal Returns

- Request through WhatsApp/contact
- Within 1 day after delivery
- Product must be unopened
- Customer pays return shipping

### 11.2 Damaged/Wrong Product

- Separate process from normal returns
- Opening product for inspection doesn't disqualify damaged/wrong-product claim
- Shop pays return shipping

### 11.3 Refund Processing

- Requires admin approval
- Processed within 2–3 business days after approval
- Via JazzCash/Easypaisa
- Automatic gateway refund where supported
- Manual fallback for manual refund recording

### 11.4 Stock After Refund/Cancellation

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

```
Requested → Processing → Completed / Cancelled
```

Pricing handled manually through WhatsApp. No formal quotation system required.

Admin can add notes to requests.

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

Fixed and admin-managed.

### 13.3 Customer Printing Request

Customer selects:

- Service
- Quantity (where applicable)
- Service-specific options
- Pickup/delivery preference
- Optional message

**Important:** No document upload through website. Documents sent via WhatsApp.

### 13.4 Printing Request Workflow

```
Requested → Processing → Ready → Completed / Cancelled
```

When Ready: Admin manually contacts customer through WhatsApp.

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

```
Pending → Contacted → Completed / Cancelled
```

Admin can see all request details and follow up.

---

## 15. Reviews

### 15.1 Review System

Customers can submit:

- Rating (star rating)
- Written review

### 15.2 Review Behavior

- Appear immediately upon submission
- Admin can remove reviews
- Admin cannot edit customer reviews

---

## 16. Recommendations

### 16.1 Recommended Products

Remain part of website experience.

**Key distinction:** Admin manually controls Recommended products.

**No automatic AI recommendation engine required.**

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

### 18.1 Role Hierarchy

#### Owner / Super Admin

Full access:

- Create admins
- Remove admins
- Activate/deactivate admins
- Reset admin passwords
- Change roles/permissions
- Full business management

#### Admin

Business management access but **cannot** manage administrator accounts.

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

### 20.1 Dashboard Notifications

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

Admin manages:

- About Us
- Services
- Contact
- Address
- Business hours
- Homepage promotional sections
- FAQs
- Delivery information
- Returns/refund policy
- Terms & Conditions
- Privacy Policy
- Other major public content

---

## 22. Analytics & Monitoring

### 22.1 Analytics Tools

Use:

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

### 27.2 Avoid

- Generic ecommerce appearance
- Generic Shopify-style templates

Design must feel specifically created for **Hubaib One Stop Shop.**

### 27.3 Category Visual Treatments

| Category | Treatment |
|----------|-----------|
| **Sports** | Energetic/sporty |
| **Stationery** | Clean, friendly, student-focused |
| **Printing** | Practical, professional, service-focused |

All three remain under one cohesive brand system.

### 27.4 Color System

**Design tokens:**

| Role | Color | Usage |
|------|-------|-------|
| Primary | #0A3D2F | Main actions, key elements |
| Secondary | #D16B46 | Supporting, accents |
| Neutral | #F7F0E7 | Background, surfaces |
| Support | #6B8A6B | Tertiary accent |
| Text | #212121 | Body text, headers |

### 27.5 Typography

**Display Font:** Cormorant Garamond

**Body Font:** Inter

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

**End of Specification Document**

*Last Updated: 2026-09-20*
