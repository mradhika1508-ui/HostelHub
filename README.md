# HostelHub

A hostel management web application built for VIT Vellore ladies' hostels. It replaces verbal complaints and scattered complaint books with a unified digital platform for students and wardens.

---

## Features

**Student Dashboard**  
Submit and track complaints, access all services, and receive real-time status updates from a single interface.

**Warden Dashboard**  
Manage all incoming complaints, view analytics, monitor mess ratings, and update issue statuses.

**Lost & Found**  
Post lost or found items with basic privacy controls so the right people can be contacted without exposing personal details.

**Mess Corner**  
Rate daily meals and report food quality or hygiene issues directly to management.

**Maintenance Reporter**  
Report maintenance issues with photos, set urgency levels, and follow repair progress in real time.

**Visitor Management**  
Students submit visitor requests through the app. Wardens approve or reject them with live status updates visible to both parties.

**Stray Animal Alerts**  
Report stray animals near the hostel with location and photo for faster response.

**General Complaints**  
Report room issues, Wi-Fi problems, safety concerns, or roommate conflicts.

---

## Tech Stack

- **Frontend** — React.js, TailwindCSS
- **Backend** — FastAPI (Python)
- **Database** — MongoDB
- **Auth** — Google OAuth 2.0
- **Deployment** — Vercel (frontend), Railway (backend)

---

## Access Control

Login is restricted to official VIT email addresses:

- Students — `@vitstudent.ac.in`
- Wardens — `@vit.ac.in`

---

## Local Setup

### Prerequisites

- Node.js 18+
- Python 3.10+
- MongoDB running locally or a MongoDB Atlas URI
- Google OAuth 2.0 credentials

### Clone

```bash
git clone https://github.com/mradhika1508-ui/HostelHub.git
cd HostelHub
```

### Backend

```bash
cd app/backend
pip install -r requirements.txt
```

Create `app/backend/.env`:

```
MONGO_URL=mongodb://localhost:27017/
DB_NAME=hostelhub
GOOGLE_CLIENT_ID=your_google_client_id
JWT_SECRET=your_secret_key
```

```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend

```bash
cd app/frontend
npm install --legacy-peer-deps
```

Create `app/frontend/.env`:

```
REACT_APP_BACKEND_URL=http://localhost:8001/api
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
```

```bash
npm start
```

App runs at `http://localhost:3000`.

---

## Project Structure

```
HostelHub/
├── app/
│   ├── backend/
│   │   ├── server.py
│   │   ├── requirements.txt
│   │   └── tests/
│   └── frontend/
│       ├── src/
│       ├── public/
│       ├── package.json
│       └── craco.config.js
```

---

## Deployment

| Service  | URL |
|----------|-----|
| Backend  | https://hostelhub-production.up.railway.app |
| Frontend | https://hostelhub.vercel.app |

---

## Built By

Tanishka Chakraborty and Radhika — built at Herzion Hackathon, Track 3: Enhancing Hostel Living.
