# LabourHub - Labour Hiring & Management Platform

## Problem Statement
Build a dashboard for Real estate, Construction builders, Labours and general people to hire verified labour. Features: employer registration with credentials, labour profiles with government verification, tool rental marketplace, wage payment/transfer, Stripe payments, document uploads, reviews, notifications/SMS, geo-location job matching.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI (port 3000)
- **Backend**: FastAPI + MongoDB (port 8001)
- **Auth**: JWT (httpOnly cookies + Bearer token), bcrypt password hashing
- **Payments**: Stripe Checkout (via emergentintegrations)
- **Storage**: Emergent Object Storage for document uploads
- **Geocoding**: Nominatim + 25+ Indian city fallback lookup
- **Geospatial**: MongoDB 2dsphere index + $geoNear aggregation
- **Theme**: Dark blue (#0B132B) + Electric blue (#00A8E8)

## What's Been Implemented

### Phase 1 - Core MVP
- JWT auth with role-based access (employer, labour, vendor, admin)
- Job posting CRUD with search/filter
- Job applications (apply, accept, reject)
- Tool rental marketplace with vendors
- Wallet system with transfers and transaction history
- Admin dashboard with user verification

### Phase 2 - Integrations
- Stripe Payment Gateway for wallet top-ups
- Document Upload (Aadhaar/Licence proofs) with admin verification
- Mutual Review & Rating System (1-5 stars)
- Notifications system with SMS alerts (mocked)

### Phase 3 - Geo-Location Job Matching
- Address geocoding (Nominatim + 25+ Indian city fallback)
- MongoDB geospatial indexing (2dsphere)
- Nearby Jobs page with distance badges + radius slider
- Auto-geocoding on job creation
- Geo-targeted notifications (only workers within radius get alerts)
- Profile location settings with preferred radius
- Employer job form with geo-locate button

## Testing Results (Phase 3)
- Backend: 98.4% (63/64 passed)
- Frontend: 95%
- Integration: 100%
- Geo Features: 100%

## Prioritized Backlog
### P1
- Real Twilio SMS integration
- Real email notifications (SendGrid/Resend)
- Mobile-responsive improvements

### P2
- Interactive map visualization (Leaflet/Mapbox)
- Real-time chat between employer and labour
- Job contract generation (PDF)
- Push notifications
- Advanced analytics dashboard
