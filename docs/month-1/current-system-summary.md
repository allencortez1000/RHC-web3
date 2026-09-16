# RHC Web3 Ecosystem — Current System Summary

## 1. Customer App

**URL:**

```text
http://localhost:3002
```

The customer app is for customers, buyers, residents, and demo users.

### Customer Features

- Customer login
- Demo customer authentication
- Customer dashboard
- Customer profile
- Customer settings
- Security page
- Notifications page
- Property browsing
- Property search/filter
- Property detail page
- Property reservation action
- Customer reservations page
- RHC Digital ID page
- Public RHC Digital ID verification page
- Marketplace placeholder
- Web3 placeholder pages
- Custom 404 page
- Customer-only route protection

### Customer Sidebar Sections

The customer sidebar contains:

```text
Overview
Web3
Marketplace
Ecosystem
System
```

The following section was removed from the customer view:

```text
Management
Users
Analytics
Reports
```

---

## 2. Admin App

**URL:**

```text
http://localhost:3003
```

The admin app is for RHC staff and administrators.

### Admin Features

- Admin login support through shared login flow
- Admin dashboard / command center
- Admin-only route protection
- Customers management page
- RHC Digital IDs registry
- Companies page
- Projects page
- Properties / inventory page
- Reservations page
- Customer properties page
- Business services page
- Users page
- Roles page
- User roles page
- Permissions page
- Integrations page
- Feature flags page
- Audit logs page
- System settings page
- Verification review page
- Custom 404 page
- Access denied behavior for non-admin users

---

## 3. Login and Authentication

The system uses the same customer login page for both customer and admin/staff accounts.

**Login page:**

```text
http://localhost:3002/login
```

### Customer Demo Login

```text
Email: demo@rhc.local
Password: Demo123456!
Redirect: http://localhost:3002/dashboard
```

### Admin/Staff Demo Login

Password for all demo admin/staff accounts:

```text
Demo123456!
```

Admin/staff emails:

```text
superadmin@example.com
systemadmin@example.com
sales@example.com
finance@example.com
propertyadmin@example.com
compliance@example.com
auditor@example.com
```

Admin/staff redirect:

```text
http://localhost:3003/
```

### Auth Behavior

- Customer credentials go to the customer dashboard.
- Admin credentials go to the admin app.
- Admin app requires an admin/staff role.
- Customer sessions cannot access the admin app.
- Demo auth works without Supabase locally.
- Supabase remains the production authentication path when configured.
- Demo credentials are local/development only.

---

## 4. RHC Digital ID

The system has Month 1 RHC Digital ID functionality.

### Customer Digital ID

Customer can view:

- RHC Digital ID
- Account status
- Verification status
- Eligibility checklist
- Linked property access
- Privacy/security notes
- Verification reference / QR-style visual

Relevant customer pages:

```text
/digital-id
/rhc-id
```

### Public Digital ID Verification

Public verification page:

```text
/verify/rhc-id/[token]
```

Demo example:

```text
http://localhost:3002/verify/rhc-id/UkhDLTIwMjYtMDAwMDAwMDE
```

Public verification shows only safe information:

- Valid / invalid / revoked / inactive status
- RHC Digital ID
- Masked holder name
- Verification status
- Issued date

It does **not** expose:

- Email
- Phone
- Birthday
- Address
- Private documents
- Wallet data
- Blockchain ownership
- Property title

### Admin Digital ID Registry

Admin route:

```text
/rhc-digital-ids
```

Used for viewing/administering RHC Digital ID records.

---

## 5. Property System

The system has Month 1 property inventory functionality.

### Customer Side

Customer can:

- Browse properties
- Search properties
- Filter properties
- View property details
- See property status
- Reserve available property
- View reservations

Customer property routes:

```text
/properties
/properties/[id]
/reservations
```

### Admin Side

Admin app includes property/inventory pages:

```text
/properties
/amica-tower-inventory
/customer-properties
```

Admin can work with:

- Property list
- Property records
- Project association
- Status
- Customer-property relationships
- Reservation association

### Property Statuses Supported by Schema

```text
AVAILABLE
HELD
RESERVED
CONTRACTED
SOLD
FOR_TURNOVER
TURNED_OVER
BLOCKED
```

Business meaning:

```text
HELD = temporarily locked
CONTRACTED = under contract
```

---

## 6. Reservation System

The backend includes a real reservation service.

### Reservation Behavior

Reservation flow supports:

```text
Select property
Check availability
Create reservation
Generate reservation number
Hold property
Create audit event
Create activity event
Return result
```

### Reservation Statuses

```text
PENDING
CONFIRMED
EXPIRED
CANCELLED
CONVERTED
```

### Reservation Business Rules

Backend enforces:

- Only `AVAILABLE` properties can be reserved.
- Property is changed to `HELD` after reservation.
- Existing active reservation prevents another reservation.
- Reservation transitions are validated.
- Reservation actions create audit/events.
- Customer can cancel their own reservation.
- Admin can manage reservations based on permissions.

### Admin Reservation Actions

Admin API supports:

```text
confirm
expire
cancel
convert
```

---

## 7. Company Management

Admin route:

```text
http://localhost:3003/companies
```

Supported company records include:

- Rabino Holdings Corporation
- Amica
- Rabino Home Builders Corporation
- Amica Water
- Amica Mart
- Rabino Security Services
- Other demo companies from seed/mock data

Capabilities exist through API/UI foundation for:

- List companies
- Create company
- Edit company
- Activate/deactivate style status changes
- View company-related project data

---

## 8. Project Management

Admin route:

```text
http://localhost:3003/projects
```

Demo Amica projects include:

- Amica Residences 1
- Amica Residences 2
- Amica Residences Parang 4PH

Capabilities include:

- List projects
- Create project
- Edit project
- Filter by company/status where supported
- View associated properties
- Track project status

---

## 9. Customer Management

Admin route:

```text
http://localhost:3003/customers
```

Capabilities include:

- List customers
- View customer account data
- View customer profile summary
- View RHC ID reference
- View verification/account status
- Work with related reservations/properties through admin modules

Customer sensitive data is not exposed through the public verification page.

---

## 10. Users, Roles and Permissions

Admin routes:

```text
/users
/roles
/user-roles
/permissions
```

Backend includes permission-based authorization.

Permission areas include:

- Customer access
- Company access
- Project access
- Property access
- Reservation access
- Role access
- Permission access
- Integration access
- Feature flag access
- Audit access
- User access
- System settings access

Important notes:

- Backend does not rely only on frontend `isAdminAccount`.
- Protected admin APIs use guards and permission checks.
- Demo admin/staff accounts map to admin-style roles locally.
- Customer users cannot access admin APIs normally.

---

## 11. Audit Logs

Admin route:

```text
http://localhost:3003/audit-logs
```

Audit system records important actions such as:

- Profile updates
- RHC ID issuance
- Company creation/update
- Project creation/update
- Property creation/update/status change
- Reservation creation/status changes
- Role/permission changes
- User role assignment/removal
- Feature flag changes
- System setting changes

Audit output uses safe data redaction.

---

## 12. Notifications

Customer route:

```text
http://localhost:3002/notifications
```

Notification-related backend/customer support exists for:

- Customer notification listing
- Notifications tied to user account
- Reservation and Digital ID events through service/event foundation

---

## 13. API Backend

The backend API workspace exists and is functional.

### Public Endpoints

```text
GET /companies
GET /business-services
GET /projects
GET /properties
GET /properties/:id
GET /verify/rhc-id/:token
```

### Customer Endpoints

```text
GET /me
PATCH /me
GET /me/rhc-id
POST /me/rhc-id
GET /me/properties
GET /me/notifications
GET /me/reservations
POST /me/reservations
POST /me/reservations/:id/cancel
```

### Admin Endpoints

```text
GET /admin/dashboard
GET /admin/users
GET /admin/customers
GET /admin/companies
POST /admin/companies
PATCH /admin/companies/:id
GET /admin/projects
POST /admin/projects
PATCH /admin/projects/:id
GET /admin/properties
POST /admin/properties
PATCH /admin/properties/:id
GET /admin/customer-properties
POST /admin/customer-properties
PATCH /admin/customer-properties/:id
GET /admin/reservations
POST /admin/reservations
POST /admin/reservations/:id/confirm
POST /admin/reservations/:id/expire
POST /admin/reservations/:id/cancel
POST /admin/reservations/:id/convert
GET /admin/roles
POST /admin/roles
PATCH /admin/roles/:id
DELETE /admin/roles/:id
PUT /admin/roles/:id/permissions
GET /admin/permissions
GET /admin/user-roles
POST /admin/user-roles
DELETE /admin/user-roles/:id
GET /admin/audit-logs
GET /admin/system-settings
PUT /admin/system-settings/:key
GET /admin/integrations
POST /admin/integrations
PATCH /admin/integrations/:id
GET /admin/business-services
POST /admin/business-services
PATCH /admin/business-services/:id
GET /admin/feature-flags
PATCH /admin/feature-flags/:id
```

---

## 14. Database and Seed

Database package:

```text
packages/database
packages/database/prisma/schema.prisma
packages/database/prisma/seed.ts
packages/database/prisma/migrations
```

Seed includes demo business data for:

- Companies
- Projects
- Properties
- Customers
- Staff users
- Roles
- Permissions
- RHC Digital IDs
- Reservations
- Property locks
- Notifications
- Audit logs
- System settings
- Web3 placeholders

Important note:

```text
PostgreSQL was not running locally, so seed execution was not verified in the current environment.
```

The architecture remains Prisma/PostgreSQL-first.

---

## 15. Web3 Month 2 Placeholders

The system includes Web3-related pages, but they are correctly treated as future Month 2 modules.

Customer pages include:

```text
/token
/wallet
/transactions
/blockchain
/blockchain-activity
/marketplace
/rhc-points
/points
/white-paper
```

Month 2 status:

```text
RHC Wallet: Not activated
RHC Token: Not deployed
Smart contracts: Not deployed
Blockchain: Not activated
Marketplace transactions: Month 2
```

The system should not show fake:

- Token balances
- Wallet addresses
- Transaction hashes
- Staking
- Blockchain ownership
- Crypto custody

---

## 16. System Security Foundation

Current security foundation includes:

- Auth guard
- Permission guard
- RBAC service
- Rate limiting
- API exception filter
- API response envelope
- Audit logging
- Safe data redaction
- Admin-only app protection
- Customer/admin route separation
- Demo-vs-production auth separation
- No service-role key exposure in browser code
- Public Digital ID verification privacy boundary

---

## 17. Ports and Run Commands

### Start Customer and Admin

```bash
npm run dev
```

Expected:

```text
Customer: http://localhost:3002
Admin:    http://localhost:3003
```

### Free Ports

```bash
npm run free:customer-port
npm run free:admin-port
```

### Start API, Customer and Admin

```bash
npm run dev:all
```

### Clear Stale Next.js Cache

```bash
npx kill-port 3002 3003
rm -rf apps/customer-web/.next
rm -rf apps/admin-web/.next
```

---

## 18. Validation Status

Recently executed and passed:

```text
npm run typecheck -w @rhc/ui
npm run typecheck -w @rhc/customer-web
npm run typecheck -w @rhc/api
npm run typecheck -w @rhc/admin-web
```

```text
npm run lint -w @rhc/api
npm run lint -w @rhc/customer-web
```

```text
npm run test -w @rhc/api
```

Result:

```text
12 test suites passed
213 tests passed
```

```text
npm run test:e2e -w @rhc/api
```

Result:

```text
8 test suites passed
140 tests passed
```

```text
npm run build -w @rhc/api
npm run build -w @rhc/customer-web
npm run build -w @rhc/admin-web
```

Result:

```text
PASS
```

---

## Short Summary

The system currently has:

```text
Customer portal
Admin portal
Shared customer/admin login
Demo authentication
Role-based admin redirect
Admin-only protection
Customer dashboard
Customer profile
Customer notifications
RHC Digital ID
Public Digital ID verification
Property browsing
Property details
Reservation workflow
Admin command center
Company management
Project management
Customer management
Property inventory
Reservation management
Users
Roles
Permissions
Audit logs
Feature flags
System settings
API backend
Prisma/PostgreSQL architecture
Demo seed data
Month 2 Web3 placeholders
Custom 404 pages
Security/RBAC foundation
Passing builds/tests
```
