# LabourHub - Labour Hiring & Management Platform

## Problem Statement
Build a dashboard for Real estate, Construction builders, Labours and general people to hire verified labour. Features: employer registration with credentials (licence, Aadhaar), labour profiles with government verification, tool rental marketplace, wage payment/transfer system.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI (port 3000)
- **Backend**: FastAPI + MongoDB (port 8001)
- **Auth**: JWT (httpOnly cookies + Bearer token), bcrypt password hashing
- **Theme**: Dark blue (#0B132B) + Electric blue (#00A8E8) - "Jewel Authority" aesthetic

## User Personas & Roles
1. **Employer** - Posts jobs, manages applications, pays wages
2. **Labour** - Browses/applies for jobs, manages profile, receives wages
3. **Vendor** - Lists tools/equipment for rental
4. **Admin** - Verifies users, monitors platform stats

## Core Requirements (Static)
- JWT-based auth with role-based access control
- Employer job postings with project details, pay rates, safety precautions
- Labour profiles with Aadhaar, skills, experience, verification status
- Tool rental marketplace from vendors
- Wallet system with top-up and wage transfer
- Admin dashboard with user verification

## What's Been Implemented (2026-03-28)
- Full authentication system (register, login, logout, refresh)
- Role-based dashboards (Employer, Labour, Admin, Vendor)
- Job posting CRUD with search/filter
- Job applications (apply, accept, reject)
- Tool rental marketplace with category filters
- Wallet system (top-up, transfers, transaction history)
- Admin stats dashboard & user verification
- Labour directory with search & verified filter
- Brute force login protection
- Responsive dark blue UI with sidebar navigation

## Testing Results
- Backend: 94.1% (32/34 passed)
- Frontend: 95% (all major flows working)
- Integration: 100%

## Prioritized Backlog
### P0 (Critical)
- All core features implemented

### P1 (Important)
- Real payment gateway integration (Stripe/Razorpay)
- Real government API verification (Aadhaar, DigiLocker)
- Email notifications for applications & payments
- File upload for documents (licence, ID proofs)

### P2 (Nice to Have)
- Real-time chat between employer and labour
- Rating/review system for labours and employers
- Job contract generation (PDF)
- Mobile responsive improvements
- Push notifications
- Reports & analytics dashboard

## Next Tasks
1. Add real payment gateway (Stripe) for wage payments
2. Implement document upload for verification
3. Add email notifications
4. Build rating/review system
