# HostelHub — Project PRD

## Problem Statement
A full-stack hostel management system for VIT Girls' Hostel with Google OAuth restricted to @vitstudent.ac.in (students) and @vit.ac.in (wardens).

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI + MongoDB (motor)
- **Auth**: Google OAuth (react-oauth/google) + JWT
- **Charts**: Recharts

## What's Been Implemented (as of 2026-04-04)

### Authentication
- Google OAuth login via @react-oauth/google
- Backend verifies Google ID token using google-auth library
- Domain restriction enforced on both frontend and backend
- JWT issued after successful login, stored in localStorage
- Role extraction: student (@vitstudent.ac.in) / warden (@vit.ac.in)
- Reg number auto-extracted from email prefix for students

### Theme
- Light/Dark mode toggle (top right, sun/moon icon)
- Preference stored in localStorage
- Colors: #1D9E75 primary, #1a1a2e dark bg, white light bg

### Student Pages (5)
1. **Home Dashboard** — Welcome, 4 quick-action cards, circular health score ring, issues feed, today's menu preview
2. **Maintenance Reporter** — 3-step form (category grid → details → schedule), 5-step live tracker, ticket detail view
3. **Lost & Found** — Lost/Found tabs, card grid, post form with photo upload, resolve button
4. **Mess Corner** — Today's menu, emoji meal ratings (one per meal per day), complaint form, weekly stats
5. **Other Issues** — Category icon grid (10 types), description form, urgency selector, anonymous toggle, 5-step tracker

### Warden Dashboard (6 tabs)
1. **Overview** — Summary cards (maintenance/issues/urgency/mess score), recent activity feed
2. **Maintenance** — Filterable table + side panel with status updater + warden notes
3. **Lost & Found** — Grid view of all items, mark resolved
4. **Mess** — Edit daily menu, rating pie chart (Recharts), complaints management
5. **Other Issues** — Table + side panel with status/notes updater
6. **Analytics** — 4 Recharts charts: health score trend, category distribution, mess rating trend, resolution time

### Navigation
- Top nav: logo, page title, dark/light toggle, profile avatar with dropdown (logout)
- Bottom nav (mobile only): 5 icons for student pages

### Seed Data
- 4 users (3 students + 1 warden)
- 5 maintenance tickets in various stages
- 4 lost/found items with images
- 7 days of mess menus
- 55 mess ratings across 7 days
- 3 mess complaints
- 3 other issues

## API Endpoints
- POST /api/auth/google — Google token verification + JWT
- GET/PATCH /api/users/me
- GET/POST /api/maintenance, PATCH /api/maintenance/{id}/status
- GET/POST /api/lost-found, PATCH /api/lost-found/{id}
- GET /api/mess/menu, GET /api/mess/menu/week, PUT /api/mess/menu
- POST /api/mess/rating, GET /api/mess/ratings, GET /api/mess/stats
- POST/GET /api/mess/complaint, PATCH /api/mess/complaints/{id}/status
- GET/POST /api/issues, PATCH /api/issues/{id}/status
- GET /api/analytics, GET /api/dashboard/overview, GET /api/health-score
- POST /api/seed

### Stray Animal Reports (added 2026-04-04)
- Student page `/stray` with red/amber warning banner at top
- Mandatory photo upload with auto geotag capture (if browser permission granted)
- 7 issue types: Injured / Aggressive / Hungry or Malnourished / Pregnant / Sick / Lost / Other
- 150-char description (enforced on backend)
- Report card grid showing photo, issue type badge, status, timestamp, location
- Warden Dashboard — new "Stray Animals" tab (7th tab)
  - Card grid of all reports with photo thumbnail, issue type, floor, student name
  - Side panel: full details + status dropdown (Reported → Being Handled → Resolved) + warden notes
- 2 seed stray reports (Injured dog, Hungry cat)
- Backend: GET/POST /api/stray, PATCH /api/stray/{id}/status


### P0 (Critical — blocked without these)
- Real Google OAuth: Users need actual @vitstudent.ac.in / @vit.ac.in accounts

### P1 (High Value)
- Push notifications for status changes
- Email notifications when ticket status changes
- File upload to external storage (currently base64 in MongoDB)

### P2 (Nice to have)
- Warden can message students directly
- Export tickets to CSV/PDF
- Student floor/room number auto-population from college records
- Multi-hostel support


## Next Tasks
1. Add Google Cloud Console authorized origins for production domain
2. Test with actual VIT Google accounts
3. Consider adding FCM push notifications for real-time updates
