from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from jose import JWTError, jwt
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import os, uuid, logging, random
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

GOOGLE_CLIENT_ID = os.environ['GOOGLE_CLIENT_ID']
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
ALLOWED_DOMAINS = ['vitstudent.ac.in', 'vit.ac.in']

app = FastAPI()
api_router = APIRouter(prefix="/api")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/google", auto_error=False)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ─── Helpers ────────────────────────────────────────────────────────────────

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def days_ago_iso(days: int = 0, hours: int = 0) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days, hours=hours)).isoformat()

def gen_id() -> str:
    return str(uuid.uuid4())

def gen_ticket_num(prefix: str) -> str:
    month = datetime.now(timezone.utc).strftime('%Y%m')
    suffix = str(uuid.uuid4())[:4].upper()
    return f"{prefix}-{month}-{suffix}"


# ─── Request Models ──────────────────────────────────────────────────────────

class GoogleAuthRequest(BaseModel):
    credential: str

class UpdateStatusRequest(BaseModel):
    status: str
    warden_notes: Optional[str] = ""

class CreateMaintenanceRequest(BaseModel):
    category: str
    description: str = ""
    photo_url: Optional[str] = None
    room_number: str = ""
    floor_number: str = ""
    urgency: str
    scheduled_date: str
    time_slot: str

class CreateLostFoundRequest(BaseModel):
    type: str
    item_name: str
    description: str = ""
    location: str
    where_kept: Optional[str] = None
    date_reported: str
    photo_url: Optional[str] = None

class UpdateMenuRequest(BaseModel):
    date: str
    breakfast: str = ""
    lunch: str = ""
    snacks: str = ""
    dinner: str = ""

class CreateRatingRequest(BaseModel):
    meal_type: str
    date: str
    rating: str
    negative_reasons: List[str] = []

class CreateComplaintRequest(BaseModel):
    category: str
    description: str
    date: str
    meal_type: str
    photo_url: Optional[str] = None

class CreateIssueRequest(BaseModel):
    category: str
    description: str
    photo_url: Optional[str] = None
    urgency: str
    anonymous: bool = True


# ─── Auth Utilities ──────────────────────────────────────────────────────────

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    to_encode["exp"] = datetime.now(timezone.utc) + timedelta(days=7)
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_warden(current_user=Depends(get_current_user)):
    if current_user.get('role') != 'warden':
        raise HTTPException(status_code=403, detail="Warden access required")
    return current_user


# ─── Auth Routes ─────────────────────────────────────────────────────────────

@api_router.get("/")
async def root():
    return {"status": "ok", "app": "HostelHub", "version": "1.0.0"}


@api_router.post("/auth/google")
async def google_auth(body: GoogleAuthRequest):
    try:
        idinfo = id_token.verify_oauth2_token(
            body.credential, google_requests.Request(), GOOGLE_CLIENT_ID
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid Google token: {str(e)}")

    email = idinfo.get("email", "")
    domain = email.split("@")[-1] if "@" in email else ""

    if domain not in ALLOWED_DOMAINS:
        raise HTTPException(status_code=403, detail="Access restricted to VIT students and staff only.")

    role = "student" if domain == "vitstudent.ac.in" else "warden"
    name = idinfo.get("name", email)
    reg_number = email.split("@")[0] if role == "student" else None

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_data = existing
    else:
        user_data = {
            "id": gen_id(), "email": email, "name": name, "role": role,
            "reg_number": reg_number, "floor_number": "", "room_number": "",
            "created_at": now_iso()
        }
        await db.users.insert_one({**user_data, "_id": user_data["id"]})

    token = create_access_token({"sub": user_data["id"], "role": role, "email": email})
    return {"token": token, "user": user_data}


@api_router.get("/users/me")
async def get_me(current_user=Depends(get_current_user)):
    return current_user

@api_router.patch("/users/me")
async def update_me(body: dict, current_user=Depends(get_current_user)):
    allowed = ["room_number", "floor_number"]
    update_data = {k: v for k, v in body.items() if k in allowed}
    if update_data:
        await db.users.update_one({"id": current_user["id"]}, {"$set": update_data})
    return {"message": "Updated"}


# ─── Maintenance ─────────────────────────────────────────────────────────────

@api_router.get("/maintenance")
async def get_maintenance(current_user=Depends(get_current_user)):
    query = {} if current_user["role"] == "warden" else {"student_id": current_user["id"]}
    return await db.maintenance.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)

@api_router.post("/maintenance")
async def create_maintenance(req: CreateMaintenanceRequest, current_user=Depends(get_current_user)):
    ticket = {
        "id": gen_id(), "ticket_number": gen_ticket_num("MAINT"),
        "student_id": current_user["id"], "student_name": current_user["name"],
        "room_number": req.room_number or current_user.get("room_number", ""),
        "floor_number": req.floor_number or current_user.get("floor_number", ""),
        "category": req.category, "description": req.description,
        "photo_url": req.photo_url, "urgency": req.urgency,
        "scheduled_date": req.scheduled_date, "time_slot": req.time_slot,
        "status": "submitted", "warden_notes": "", "created_at": now_iso()
    }
    await db.maintenance.insert_one({**ticket, "_id": ticket["id"]})
    return ticket

@api_router.patch("/maintenance/{ticket_id}/status")
async def update_maintenance_status(ticket_id: str, req: UpdateStatusRequest, current_user=Depends(require_warden)):
    result = await db.maintenance.update_one(
        {"id": ticket_id},
        {"$set": {"status": req.status, "warden_notes": req.warden_notes}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return {"message": "Updated"}


# ─── Lost & Found ─────────────────────────────────────────────────────────────

@api_router.get("/lost-found")
async def get_lost_found(current_user=Depends(get_current_user)):
    return await db.lost_found.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)

@api_router.post("/lost-found")
async def create_lost_found(req: CreateLostFoundRequest, current_user=Depends(get_current_user)):
    item = {
        "id": gen_id(), "type": req.type, "student_id": current_user["id"],
        "contact_floor": current_user.get("floor_number", ""),
        "item_name": req.item_name, "description": req.description,
        "location": req.location, "where_kept": req.where_kept,
        "date_reported": req.date_reported, "photo_url": req.photo_url,
        "status": "active", "created_at": now_iso()
    }
    await db.lost_found.insert_one({**item, "_id": item["id"]})
    return item

@api_router.patch("/lost-found/{item_id}")
async def update_lost_found(item_id: str, body: dict, current_user=Depends(get_current_user)):
    await db.lost_found.update_one({"id": item_id}, {"$set": body})
    return {"message": "Updated"}


# ─── Mess ─────────────────────────────────────────────────────────────────────

@api_router.get("/mess/menu")
async def get_menu(current_user=Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    menu = await db.mess_menu.find_one({"date": today}, {"_id": 0})
    if not menu:
        menu = await db.mess_menu.find_one({}, {"_id": 0}, sort=[("date", -1)])
    return menu

@api_router.get("/mess/menu/week")
async def get_week_menu(current_user=Depends(get_current_user)):
    today = datetime.now(timezone.utc)
    dates = [(today - timedelta(days=i)).strftime('%Y-%m-%d') for i in range(7)]
    return await db.mess_menu.find({"date": {"$in": dates}}, {"_id": 0}).sort("date", -1).to_list(7)

@api_router.put("/mess/menu")
async def update_menu(req: UpdateMenuRequest, current_user=Depends(require_warden)):
    existing = await db.mess_menu.find_one({"date": req.date})
    if existing:
        await db.mess_menu.update_one({"date": req.date}, {"$set": req.model_dump()})
    else:
        doc = {**req.model_dump(), "id": gen_id()}
        await db.mess_menu.insert_one({**doc, "_id": doc["id"]})
    return {"message": "Menu updated"}

@api_router.post("/mess/rating")
async def submit_rating(req: CreateRatingRequest, current_user=Depends(get_current_user)):
    existing = await db.mess_ratings.find_one({
        "student_id": current_user["id"], "meal_type": req.meal_type, "date": req.date
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already rated this meal today")
    rating = {
        "id": gen_id(), "student_id": current_user["id"],
        "meal_type": req.meal_type, "date": req.date, "rating": req.rating,
        "negative_reasons": req.negative_reasons, "created_at": now_iso()
    }
    await db.mess_ratings.insert_one({**rating, "_id": rating["id"]})
    return rating

@api_router.get("/mess/ratings")
async def get_ratings(current_user=Depends(get_current_user)):
    if current_user["role"] == "warden":
        return await db.mess_ratings.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    return await db.mess_ratings.find(
        {"student_id": current_user["id"], "date": today}, {"_id": 0}
    ).to_list(20)

@api_router.get("/mess/stats")
async def get_mess_stats(current_user=Depends(get_current_user)):
    today = datetime.now(timezone.utc)
    week_dates = [(today - timedelta(days=i)).strftime('%Y-%m-%d') for i in range(7)]
    ratings = await db.mess_ratings.find({"date": {"$in": week_dates}}, {"_id": 0}).to_list(1000)
    rating_map = {"loved": 5, "okay": 3, "disliked": 1}
    if ratings:
        avg = sum(rating_map.get(r.get('rating', 'okay'), 3) for r in ratings) / len(ratings)
        health_score = round((avg - 1) / 4 * 100, 1)
    else:
        health_score = 0
    counts = {"loved": 0, "okay": 0, "disliked": 0}
    meal_scores = {}
    for r in ratings:
        rat = r.get('rating', 'okay')
        counts[rat] = counts.get(rat, 0) + 1
        mt = r.get('meal_type', 'lunch')
        meal_scores.setdefault(mt, []).append(rating_map.get(rat, 3))
    best_meal = max(meal_scores, key=lambda k: sum(meal_scores[k]) / len(meal_scores[k])) if meal_scores else None
    worst_meal = min(meal_scores, key=lambda k: sum(meal_scores[k]) / len(meal_scores[k])) if meal_scores else None
    return {"health_score": health_score, "rating_counts": counts, "total": len(ratings),
            "best_meal": best_meal, "worst_meal": worst_meal}

@api_router.post("/mess/complaint")
async def create_complaint(req: CreateComplaintRequest, current_user=Depends(get_current_user)):
    complaint = {
        "id": gen_id(), "ticket_number": gen_ticket_num("MESS"),
        "student_id": current_user["id"], "student_name": current_user["name"],
        "category": req.category, "description": req.description,
        "date": req.date, "meal_type": req.meal_type, "photo_url": req.photo_url,
        "status": "submitted", "created_at": now_iso()
    }
    await db.mess_complaints.insert_one({**complaint, "_id": complaint["id"]})
    return complaint

@api_router.get("/mess/complaints")
async def get_complaints(current_user=Depends(get_current_user)):
    query = {} if current_user["role"] == "warden" else {"student_id": current_user["id"]}
    return await db.mess_complaints.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)

@api_router.patch("/mess/complaints/{complaint_id}/status")
async def update_complaint_status(complaint_id: str, req: UpdateStatusRequest, current_user=Depends(require_warden)):
    await db.mess_complaints.update_one({"id": complaint_id}, {"$set": {"status": req.status}})
    return {"message": "Updated"}


# ─── Other Issues ─────────────────────────────────────────────────────────────

@api_router.get("/issues")
async def get_issues(current_user=Depends(get_current_user)):
    query = {} if current_user["role"] == "warden" else {"student_id": current_user["id"]}
    return await db.other_issues.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)

@api_router.post("/issues")
async def create_issue(req: CreateIssueRequest, current_user=Depends(get_current_user)):
    display_name = f"Anonymous, Floor {current_user.get('floor_number', '?')}" if req.anonymous else current_user["name"]
    issue = {
        "id": gen_id(), "ticket_number": gen_ticket_num("ISSUE"),
        "student_id": current_user["id"], "student_name": display_name,
        "floor_number": current_user.get("floor_number", ""),
        "category": req.category, "description": req.description,
        "photo_url": req.photo_url, "urgency": req.urgency, "anonymous": req.anonymous,
        "status": "submitted", "warden_notes": "", "created_at": now_iso()
    }
    await db.other_issues.insert_one({**issue, "_id": issue["id"]})
    return issue

@api_router.patch("/issues/{issue_id}/status")
async def update_issue_status(issue_id: str, req: UpdateStatusRequest, current_user=Depends(require_warden)):
    await db.other_issues.update_one(
        {"id": issue_id},
        {"$set": {"status": req.status, "warden_notes": req.warden_notes}}
    )
    return {"message": "Updated"}


# ─── Dashboard Overview ───────────────────────────────────────────────────────

@api_router.get("/dashboard/overview")
async def get_overview(current_user=Depends(require_warden)):
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    new_maintenance = await db.maintenance.count_documents({"status": "submitted"})
    open_issues = await db.other_issues.count_documents({"status": {"$ne": "resolved"}})
    urgent_flags = await db.maintenance.count_documents({"urgency": "urgent", "status": {"$ne": "resolved"}})
    today_ratings = await db.mess_ratings.find({"date": today}, {"_id": 0}).to_list(100)
    rating_map = {"loved": 5, "okay": 3, "disliked": 1}
    mess_score = round(sum(rating_map.get(r.get('rating', 'okay'), 3) for r in today_ratings) / len(today_ratings), 1) if today_ratings else 0
    recent_m = await db.maintenance.find({}, {"_id": 0}).sort("created_at", -1).to_list(5)
    recent_i = await db.other_issues.find({}, {"_id": 0}).sort("created_at", -1).to_list(3)
    recent_c = await db.mess_complaints.find({}, {"_id": 0}).sort("created_at", -1).to_list(3)
    all_recent = (
        [{**r, "item_type": "maintenance"} for r in recent_m] +
        [{**r, "item_type": "issue"} for r in recent_i] +
        [{**r, "item_type": "complaint"} for r in recent_c]
    )
    all_recent.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return {"new_maintenance": new_maintenance, "open_issues": open_issues,
            "urgent_flags": urgent_flags, "mess_score": mess_score, "recent_activity": all_recent[:10]}


@api_router.get("/health-score")
async def get_health_score(current_user=Depends(get_current_user)):
    today = datetime.now(timezone.utc)
    week_dates = [(today - timedelta(days=i)).strftime('%Y-%m-%d') for i in range(7)]
    ratings = await db.mess_ratings.find({"date": {"$in": week_dates}}, {"_id": 0}).to_list(1000)
    rating_map = {"loved": 5, "okay": 3, "disliked": 1}
    if ratings:
        avg = sum(rating_map.get(r.get('rating', 'okay'), 3) for r in ratings) / len(ratings)
        score = round((avg - 1) / 4 * 100, 1)
    else:
        score = 72
    return {"score": score}


# ─── Analytics ────────────────────────────────────────────────────────────────

@api_router.get("/analytics")
async def get_analytics(current_user=Depends(require_warden)):
    today = datetime.now(timezone.utc)
    rating_map = {"loved": 5, "okay": 3, "disliked": 1}

    weekly_scores = []
    for i in range(6, -1, -1):
        ds = (today - timedelta(days=i)).strftime('%Y-%m-%d')
        day_r = await db.mess_ratings.find({"date": ds}, {"_id": 0}).to_list(100)
        if day_r:
            avg = sum(rating_map.get(r.get('rating', 'okay'), 3) for r in day_r) / len(day_r)
            score = round((avg - 1) / 4 * 100, 1)
        else:
            score = 0
        weekly_scores.append({"date": ds, "score": score, "day": (today - timedelta(days=i)).strftime('%a')})

    m_tickets = await db.maintenance.find({}, {"_id": 0, "category": 1}).to_list(1000)
    o_issues = await db.other_issues.find({}, {"_id": 0, "category": 1}).to_list(1000)
    cat_counts = {}
    for item in m_tickets + o_issues:
        cat = item.get("category", "Other")
        cat_counts[cat] = cat_counts.get(cat, 0) + 1
    cat_data = sorted([{"category": k, "count": v} for k, v in cat_counts.items()], key=lambda x: -x["count"])[:8]

    mess_trend = []
    for i in range(6, -1, -1):
        ds = (today - timedelta(days=i)).strftime('%Y-%m-%d')
        day_r = await db.mess_ratings.find({"date": ds}, {"_id": 0}).to_list(100)
        counts = {"loved": 0, "okay": 0, "disliked": 0}
        for r in day_r:
            counts[r.get("rating", "okay")] = counts.get(r.get("rating", "okay"), 0) + 1
        mess_trend.append({"date": ds, "day": (today - timedelta(days=i)).strftime('%a'), **counts})

    res_data = [
        {"category": "Bathroom", "avg_days": 2.3},
        {"category": "Electricity", "avg_days": 1.5},
        {"category": "WiFi", "avg_days": 3.1},
        {"category": "Fan/AC", "avg_days": 4.2},
        {"category": "Door/Lock", "avg_days": 1.8},
        {"category": "Cleaning", "avg_days": 0.9},
    ]
    return {"weekly_health_scores": weekly_scores, "category_distribution": cat_data,
            "mess_rating_trend": mess_trend, "resolution_times": res_data}


# ─── Seed ─────────────────────────────────────────────────────────────────────

@api_router.post("/seed")
async def seed():
    for col in ["users", "maintenance", "lost_found", "mess_menu", "mess_ratings", "mess_complaints", "other_issues"]:
        await db[col].delete_many({})

    users = [
        {"id": "student1", "email": "20BCE1234@vitstudent.ac.in", "name": "Priya Sharma", "role": "student",
         "reg_number": "20BCE1234", "floor_number": "2", "room_number": "204", "created_at": days_ago_iso(30)},
        {"id": "student2", "email": "20BCE5678@vitstudent.ac.in", "name": "Ananya Rao", "role": "student",
         "reg_number": "20BCE5678", "floor_number": "3", "room_number": "312", "created_at": days_ago_iso(25)},
        {"id": "student3", "email": "20BCE9012@vitstudent.ac.in", "name": "Meera Singh", "role": "student",
         "reg_number": "20BCE9012", "floor_number": "1", "room_number": "108", "created_at": days_ago_iso(20)},
        {"id": "warden1", "email": "anita.kapoor@vit.ac.in", "name": "Dr. Anita Kapoor", "role": "warden",
         "reg_number": None, "floor_number": None, "room_number": None, "created_at": days_ago_iso(60)},
    ]
    for u in users:
        await db.users.insert_one({**u, "_id": u["id"]})

    maintenance = [
        {"id": "m1", "ticket_number": "MAINT-202502-A1B2", "student_id": "student1", "student_name": "Priya Sharma",
         "room_number": "204", "floor_number": "2", "category": "Bathroom",
         "description": "Water leaking from shower head continuously for 2 days. The floor stays wet.",
         "photo_url": None, "urgency": "urgent", "scheduled_date": "2026-02-12", "time_slot": "8–10 AM",
         "status": "in_progress", "warden_notes": "Plumber assigned, will fix by tomorrow", "created_at": days_ago_iso(2)},
        {"id": "m2", "ticket_number": "MAINT-202502-C3D4", "student_id": "student2", "student_name": "Ananya Rao",
         "room_number": "312", "floor_number": "3", "category": "Electricity",
         "description": "Power socket near study table is sparking when I plug in my charger. Dangerous.",
         "photo_url": None, "urgency": "urgent", "scheduled_date": "2026-02-11", "time_slot": "10 AM–12 PM",
         "status": "seen", "warden_notes": "", "created_at": days_ago_iso(1)},
        {"id": "m3", "ticket_number": "MAINT-202502-E5F6", "student_id": "student3", "student_name": "Meera Singh",
         "room_number": "108", "floor_number": "1", "category": "WiFi",
         "description": "No internet connection on entire floor 1 since this morning. Very inconvenient.",
         "photo_url": None, "urgency": "soon", "scheduled_date": "2026-02-12", "time_slot": "2–4 PM",
         "status": "submitted", "warden_notes": "", "created_at": days_ago_iso(hours=6)},
        {"id": "m4", "ticket_number": "MAINT-202502-G7H8", "student_id": "student1", "student_name": "Priya Sharma",
         "room_number": "204", "floor_number": "2", "category": "Fan/AC",
         "description": "AC remote not working, unable to change temperature settings.",
         "photo_url": None, "urgency": "minor", "scheduled_date": "2026-02-07", "time_slot": "4–6 PM",
         "status": "resolved", "warden_notes": "Remote battery replaced and AC serviced", "created_at": days_ago_iso(5)},
        {"id": "m5", "ticket_number": "MAINT-202502-I9J0", "student_id": "student2", "student_name": "Ananya Rao",
         "room_number": "312", "floor_number": "3", "category": "Door/Lock",
         "description": "Bathroom door lock is broken, door won't latch properly. Privacy concern.",
         "photo_url": None, "urgency": "urgent", "scheduled_date": "2026-02-09", "time_slot": "10 AM–12 PM",
         "status": "assigned", "warden_notes": "Maintenance team notified", "created_at": days_ago_iso(3)},
    ]
    for m in maintenance:
        await db.maintenance.insert_one({**m, "_id": m["id"]})

    lost_found = [
        {"id": "lf1", "type": "lost", "student_id": "student1", "contact_floor": "2",
         "item_name": "Sony WH-1000XM4 Headphones",
         "description": "Black over-ear noise cancelling headphones with black case and Sony logo",
         "location": "Mess", "where_kept": None, "date_reported": days_ago_iso(2)[:10],
         "photo_url": "https://images.unsplash.com/photo-1711843250662-2a688ef2c114?w=400&q=80",
         "status": "active", "created_at": days_ago_iso(2)},
        {"id": "lf2", "type": "lost", "student_id": "student3", "contact_floor": "1",
         "item_name": "Math Notebook (Blue Cover)",
         "description": "A4 size blue notebook with 'Engineering Mathematics' on cover, Semester 6 notes",
         "location": "Floor 3", "where_kept": None, "date_reported": days_ago_iso(1)[:10],
         "photo_url": "https://images.unsplash.com/photo-1711843250662-2a688ef2c114?w=400&q=80",
         "status": "active", "created_at": days_ago_iso(1)},
        {"id": "lf3", "type": "found", "student_id": "student2", "contact_floor": "3",
         "item_name": "Purple Water Bottle",
         "description": "1L purple Tupperware bottle with 'AR' initials written in marker on the side",
         "location": "Common Room", "where_kept": "Common Room",
         "date_reported": days_ago_iso(3)[:10],
         "photo_url": "https://images.unsplash.com/photo-1428223501723-d821c5d00ca3?w=400&q=80",
         "status": "active", "created_at": days_ago_iso(3)},
        {"id": "lf4", "type": "found", "student_id": "student1", "contact_floor": "2",
         "item_name": "Keys with Pink Keychain",
         "description": "Single room key with a pink pom-pom keychain, found near washbasins",
         "location": "Bathroom Floor 2", "where_kept": "Warden Office",
         "date_reported": days_ago_iso(hours=5)[:10],
         "photo_url": "https://images.unsplash.com/photo-1428223501723-d821c5d00ca3?w=400&q=80",
         "status": "active", "created_at": days_ago_iso(hours=5)},
    ]
    for lf in lost_found:
        await db.lost_found.insert_one({**lf, "_id": lf["id"]})

    menus_data = [
        {"breakfast": "Idli (4 pcs), Sambar, Coconut Chutney, Boiled Egg",
         "lunch": "Steamed Rice, Dal Tadka, Bhindi Fry, Roti (3), Curd, Pickle",
         "snacks": "Bread Pakora (2 pcs), Masala Tea", "dinner": "Roti (3), Paneer Butter Masala, Dal Makhani, Jeera Rice, Salad"},
        {"breakfast": "Poha, Jalebi, Boiled Egg",
         "lunch": "Rice, Rajma Masala, Mix Veg, Roti (3), Buttermilk",
         "snacks": "Samosa (2 pcs), Green Chutney, Tea", "dinner": "Roti (3), Chicken Curry, Yellow Dal, Rice, Raita"},
        {"breakfast": "Dosa (2), Sambar, Coconut Chutney, Boiled Egg",
         "lunch": "Rice, Chole, Aloo Gobi, Roti (3), Curd, Papad",
         "snacks": "Vada Pav, Masala Tea", "dinner": "Roti (3), Egg Curry, Dal Fry, Rice, Salad"},
        {"breakfast": "Upma, Coconut Chutney, Boiled Egg, Banana",
         "lunch": "Rice, Sambar, Beans Fry, Roti (3), Curd",
         "snacks": "Maggi, Tea", "dinner": "Roti (3), Palak Paneer, Dal, Rice, Pickle"},
        {"breakfast": "Paratha (2), Curd, Pickle, Boiled Egg",
         "lunch": "Rice, Dal, Aloo Matar, Roti (3), Curd, Papad",
         "snacks": "Bread Butter, Tea", "dinner": "Roti (3), Fish Curry, Dal, Rice, Raita"},
        {"breakfast": "Rava Idli (3), Sambar, Chutney, Boiled Egg",
         "lunch": "Rice, Dal, Bhindi Masala, Roti (3), Buttermilk",
         "snacks": "Pani Puri, Tea", "dinner": "Roti (3), Paneer Tikka Masala, Dal, Rice, Salad"},
        {"breakfast": "Puri (3), Aloo Sabzi, Boiled Egg",
         "lunch": "Rice, Rajma, Jeera Aloo, Roti (3), Curd",
         "snacks": "Vegetable Sandwich, Tea", "dinner": "Roti (3), Mutton Curry, Dal Fry, Rice, Raita"},
    ]
    today_dt = datetime.now(timezone.utc)
    for i, menu_item in enumerate(menus_data):
        date_str = (today_dt - timedelta(days=i)).strftime('%Y-%m-%d')
        menu_doc = {"id": gen_id(), "date": date_str, **menu_item}
        await db.mess_menu.insert_one({**menu_doc, "_id": menu_doc["id"]})

    random.seed(42)
    ratings_seed = []
    students = ["student1", "student2", "student3"]
    meals = ["breakfast", "lunch", "snacks", "dinner"]
    rating_options = ["loved", "loved", "loved", "okay", "okay", "disliked"]
    for i in range(7):
        date_str = (today_dt - timedelta(days=i)).strftime('%Y-%m-%d')
        for student_id in students:
            for meal in meals:
                if random.random() > 0.3:
                    rating = random.choice(rating_options)
                    neg_reasons = []
                    if rating == "disliked":
                        neg_reasons = random.sample(["Too spicy", "Not fresh", "Less quantity", "Tasteless"], k=random.randint(1, 2))
                    ratings_seed.append({
                        "id": gen_id(), "student_id": student_id, "meal_type": meal,
                        "date": date_str, "rating": rating, "negative_reasons": neg_reasons,
                        "created_at": (today_dt - timedelta(days=i)).isoformat()
                    })
    for r in ratings_seed:
        await db.mess_ratings.insert_one({**r, "_id": r["id"]})

    complaints = [
        {"id": "mc1", "ticket_number": "MESS-202502-K1L2", "student_id": "student1",
         "student_name": "Priya Sharma", "category": "Hygiene",
         "description": "Found a hair in dal during lunch. Very unhygienic. Please ensure kitchen cleanliness.",
         "date": days_ago_iso(3)[:10], "meal_type": "lunch", "photo_url": None,
         "status": "submitted", "created_at": days_ago_iso(3)},
        {"id": "mc2", "ticket_number": "MESS-202502-M3N4", "student_id": "student2",
         "student_name": "Ananya Rao", "category": "Food quality",
         "description": "The roti during dinner was extremely hard and cold. Nearly inedible. Please maintain food quality.",
         "date": days_ago_iso(2)[:10], "meal_type": "dinner", "photo_url": None,
         "status": "in_progress", "created_at": days_ago_iso(2)},
        {"id": "mc3", "ticket_number": "MESS-202502-O5P6", "student_id": "student3",
         "student_name": "Meera Singh", "category": "Quantity",
         "description": "Dinner portions have been very small all week. Only 2 rotis instead of the usual 3.",
         "date": days_ago_iso(1)[:10], "meal_type": "dinner", "photo_url": None,
         "status": "submitted", "created_at": days_ago_iso(1)},
    ]
    for c in complaints:
        await db.mess_complaints.insert_one({**c, "_id": c["id"]})

    issues = [
        {"id": "oi1", "ticket_number": "ISSUE-202502-Q1R2", "student_id": "student3",
         "student_name": "Meera Singh", "floor_number": "1", "category": "WiFi issue",
         "description": "WiFi router on floor 1 corridor has been down for 3 days. Have to use mobile data which is very costly.",
         "photo_url": None, "urgency": "urgent", "anonymous": False,
         "status": "in_progress", "warden_notes": "IT team contacted, will fix by Thursday", "created_at": days_ago_iso(2)},
        {"id": "oi2", "ticket_number": "ISSUE-202502-S3T4", "student_id": "student1",
         "student_name": "Anonymous, Floor 2", "floor_number": "2", "category": "Noise complaint",
         "description": "Loud music and shouting in the room above after 11 PM for the past week. Unable to sleep or study.",
         "photo_url": None, "urgency": "minor", "anonymous": True,
         "status": "submitted", "warden_notes": "", "created_at": days_ago_iso(1)},
        {"id": "oi3", "ticket_number": "ISSUE-202502-U5V6", "student_id": "student2",
         "student_name": "Ananya Rao", "floor_number": "3", "category": "Common area lights",
         "description": "Two tube lights near the staircase on floor 3 have been broken for over a week. Very dark at night.",
         "photo_url": None, "urgency": "soon", "anonymous": False,
         "status": "assigned", "warden_notes": "Electrician will replace bulbs by Friday", "created_at": days_ago_iso(4)},
    ]
    for oi in issues:
        await db.other_issues.insert_one({**oi, "_id": oi["id"]})

    return {"message": "Database seeded successfully",
            "counts": {"users": 4, "maintenance": len(maintenance), "lost_found": len(lost_found),
                       "mess_menus": len(menus_data), "mess_ratings": len(ratings_seed),
                       "mess_complaints": len(complaints), "other_issues": len(issues)}}


# ─── App Setup ────────────────────────────────────────────────────────────────

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown():
    client.close()
