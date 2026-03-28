# LabourHub - Labour Hiring & Management Platform

## Problem Statement
Build a dashboard for Real estate, Construction builders, Labours and general people to hire verified labour. Features: employer registration with credentials, labour profiles with government verification, tool rental marketplace, wage payment/transfer, Stripe payments, document uploads, reviews, notifications/SMS.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI (port 3000)
- **Backend**: FastAPI + MongoDB (port 8001)
- **Auth**: JWT (httpOnly cookies + Bearer token), bcrypt password hashing
- **Payments**: Stripe Checkout (via emergentintegrations)
- **Storage**: Emergent Object Storage for document uploads
- **Theme**: Dark blue (#0B132B) + Electric blue (#00A8E8)

## User Personas & Roles
1. **Employer** - Posts jobs, manages applications, pays wages, uploads documents
2. **Labour** - Browses/applies for jobs, manages profile, receives wages, uploads docs
3. **Vendor** - Lists tools/equipment for rental
4. **Admin** - Verifies users & documents, monitors platform stats

## What's Been Implemented

### Phase 1 (2026-03-28)
- Full JWT authentication system with role-based access
- Role-based dashboards (Employer, Labour, Admin, Vendor)
- Job posting CRUD with search/filter
- Job applications (apply, accept, reject)
- Tool rental marketplace with category filters
- Wallet system (top-up, transfers, transaction history)
- Admin stats dashboard & user verification
- Labour directory with search & verified filter
- Brute force login protection

### Phase 2 (2026-03-28)
- **Stripe Payment Gateway** - Checkout sessions for wallet top-up via Stripe
- **Document Upload** - Aadhaar/Licence proof uploads with admin verification
- **Mutual Review System** - 1-5 star ratings with comments (both employers and labourers)
- **Notifications System** - In-app notifications for job alerts, applications, payments, reviews
- **SMS Alerts** - Mock SMS logging for new job matches, application updates

## Testing Results (Phase 2)
- Backend: 96.1% (49/51 passed)
- Frontend: 98%
- Integration: 100%
- New Features: 95%

## Prioritized Backlog
### P1
- Real Twilio SMS integration
- Real email notifications (SendGrid/Resend)
- Mobile-responsive improvements

### P2
- Real-time chat between employer and labour
- Job contract generation (PDF)
- Push notifications
- Advanced analytics dashboard
- Labour skill verification badges
