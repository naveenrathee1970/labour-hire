from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File, Header, Query
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
import bcrypt
import jwt
import secrets
import uuid
import math
import requests as http_requests
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime, timezone, timedelta
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_ALGORITHM = "HS256"

def get_jwt_secret():
    return os.environ["JWT_SECRET"]

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(minutes=60), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")

def serialize_doc(doc):
    if doc is None:
        return None
    doc["_id"] = str(doc["_id"])
    for key, val in doc.items():
        if isinstance(val, ObjectId):
            doc[key] = str(val)
        if isinstance(val, datetime):
            doc[key] = val.isoformat()
    return doc

# ============ Object Storage ============
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "labourhub"
storage_key = None

def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    resp = http_requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = http_requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str):
    key = init_storage()
    resp = http_requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# ============ Notification Helper ============
async def create_notification(user_id: str, title: str, message: str, ntype: str = "info", sms: bool = False, phone: str = ""):
    notif = {
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": ntype,
        "read": False,
        "sms_sent": sms,
        "sms_phone": phone,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.notifications.insert_one(notif)
    if sms and phone:
        logger.info(f"[SMS ALERT] To: {phone} | {title}: {message}")
    logger.info(f"[NOTIFICATION] User {user_id}: {title} - {message}")

# ============ Geocoding Helper ============
def geocode_address(address: str) -> Optional[Dict]:
    """Geocode an address using Nominatim (OpenStreetMap) with fallback for common cities."""
    # Fallback for common Indian cities
    common_cities = {
        "mumbai": {"lat": 19.0760, "lng": 72.8777, "display_name": "Mumbai, Maharashtra, India"},
        "delhi": {"lat": 28.6139, "lng": 77.2090, "display_name": "Delhi, India"},
        "new delhi": {"lat": 28.6139, "lng": 77.2090, "display_name": "New Delhi, India"},
        "bangalore": {"lat": 12.9716, "lng": 77.5946, "display_name": "Bangalore, Karnataka, India"},
        "bengaluru": {"lat": 12.9716, "lng": 77.5946, "display_name": "Bengaluru, Karnataka, India"},
        "chennai": {"lat": 13.0827, "lng": 80.2707, "display_name": "Chennai, Tamil Nadu, India"},
        "hyderabad": {"lat": 17.3850, "lng": 78.4867, "display_name": "Hyderabad, Telangana, India"},
        "kolkata": {"lat": 22.5726, "lng": 88.3639, "display_name": "Kolkata, West Bengal, India"},
        "pune": {"lat": 18.5204, "lng": 73.8567, "display_name": "Pune, Maharashtra, India"},
        "ahmedabad": {"lat": 23.0225, "lng": 72.5714, "display_name": "Ahmedabad, Gujarat, India"},
        "jaipur": {"lat": 26.9124, "lng": 75.7873, "display_name": "Jaipur, Rajasthan, India"},
        "lucknow": {"lat": 26.8467, "lng": 80.9462, "display_name": "Lucknow, Uttar Pradesh, India"},
        "chandigarh": {"lat": 30.7333, "lng": 76.7794, "display_name": "Chandigarh, India"},
        "noida": {"lat": 28.5355, "lng": 77.3910, "display_name": "Noida, Uttar Pradesh, India"},
        "gurgaon": {"lat": 28.4595, "lng": 77.0266, "display_name": "Gurgaon, Haryana, India"},
        "gurugram": {"lat": 28.4595, "lng": 77.0266, "display_name": "Gurugram, Haryana, India"},
        "surat": {"lat": 21.1702, "lng": 72.8311, "display_name": "Surat, Gujarat, India"},
        "patna": {"lat": 25.6093, "lng": 85.1376, "display_name": "Patna, Bihar, India"},
        "indore": {"lat": 22.7196, "lng": 75.8577, "display_name": "Indore, Madhya Pradesh, India"},
        "bhopal": {"lat": 23.2599, "lng": 77.4126, "display_name": "Bhopal, Madhya Pradesh, India"},
        "nagpur": {"lat": 21.1458, "lng": 79.0882, "display_name": "Nagpur, Maharashtra, India"},
        "thane": {"lat": 19.2183, "lng": 72.9781, "display_name": "Thane, Maharashtra, India"},
        "new york": {"lat": 40.7128, "lng": -74.0060, "display_name": "New York, NY, USA"},
        "london": {"lat": 51.5074, "lng": -0.1278, "display_name": "London, UK"},
    }
    addr_lower = address.strip().lower()
    for city, coords in common_cities.items():
        if city in addr_lower:
            return coords
    # Try Nominatim
    try:
        import time
        time.sleep(1)  # Rate limit compliance
        resp = http_requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": address, "format": "json", "limit": 1},
            headers={"User-Agent": "LabourHub/1.0 (contact@labourhub.in)"},
            timeout=10
        )
        resp.raise_for_status()
        results = resp.json()
        if results:
            return {
                "lat": float(results[0]["lat"]),
                "lng": float(results[0]["lon"]),
                "display_name": results[0].get("display_name", address)
            }
    except Exception as e:
        logger.error(f"Geocoding failed for '{address}': {e}")
    return None

def haversine_km(lat1, lng1, lat2, lng2):
    """Calculate distance between two points in km."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def make_geo_point(lng: float, lat: float) -> dict:
    """Create GeoJSON Point. MongoDB uses [longitude, latitude] order."""
    return {"type": "Point", "coordinates": [lng, lat]}

# Create the main app
app = FastAPI()

# Create router
api_router = APIRouter(prefix="/api")

# ============ Pydantic Models ============

class RegisterInput(BaseModel):
    email: str
    password: str
    name: str
    role: str  # employer, labour, vendor
    phone: Optional[str] = None

class LoginInput(BaseModel):
    email: str
    password: str

class JobCreate(BaseModel):
    title: str
    description: str
    project_type: str  # residential, commercial, industrial, infrastructure
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    labours_needed: int = 1
    duration_days: int = 30
    pay_type: str = "daily"  # daily, weekly, monthly
    pay_amount: float = 0
    safety_precautions: Optional[str] = None
    skills_required: Optional[List[str]] = []
    licence_number: Optional[str] = None

class JobApplicationCreate(BaseModel):
    job_id: str
    message: Optional[str] = ""

class ToolRentalCreate(BaseModel):
    name: str
    description: str
    category: str  # power_tools, heavy_machinery, safety_equipment, hand_tools
    daily_rate: float
    weekly_rate: Optional[float] = None
    monthly_rate: Optional[float] = None
    available_quantity: int = 1
    vendor_url: Optional[str] = None

class TransferCreate(BaseModel):
    to_user_id: str
    amount: float
    description: str = ""
    job_id: Optional[str] = None

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    aadhaar_number: Optional[str] = None
    licence_number: Optional[str] = None
    company_name: Optional[str] = None
    address: Optional[str] = None
    skills: Optional[List[str]] = None
    experience_years: Optional[int] = None
    daily_rate: Optional[float] = None
    bio: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    preferred_radius_km: Optional[float] = None

class WalletTopUp(BaseModel):
    amount: float

class VerifyUser(BaseModel):
    user_id: str
    verified: bool

class ReviewCreate(BaseModel):
    reviewed_user_id: str
    job_id: Optional[str] = None
    rating: int  # 1-5
    comment: str = ""

class CheckoutRequest(BaseModel):
    amount: float
    origin_url: str

TOPUP_PACKAGES = {
    "500": 500.0,
    "1000": 1000.0,
    "5000": 5000.0,
    "10000": 10000.0,
    "25000": 25000.0,
    "50000": 50000.0,
}

# ============ Auth Endpoints ============

@api_router.post("/auth/register")
async def register(input_data: RegisterInput, response: Response):
    email = input_data.email.lower().strip()
    if input_data.role not in ["employer", "labour", "vendor"]:
        raise HTTPException(status_code=400, detail="Invalid role. Must be employer, labour, or vendor")
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_doc = {
        "email": email,
        "password_hash": hash_password(input_data.password),
        "name": input_data.name,
        "role": input_data.role,
        "phone": input_data.phone or "",
        "verified": False,
        "aadhaar_number": "",
        "licence_number": "",
        "company_name": "",
        "address": "",
        "skills": [],
        "experience_years": 0,
        "daily_rate": 0,
        "bio": "",
        "latitude": None,
        "longitude": None,
        "preferred_radius_km": 50,
        "geo_location": None,
        "avg_rating": 0,
        "review_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    # Create wallet
    await db.wallets.insert_one({
        "user_id": user_id,
        "balance": 0.0,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    set_auth_cookies(response, access_token, refresh_token)
    return {
        "id": user_id,
        "email": email,
        "name": input_data.name,
        "role": input_data.role,
        "verified": False,
        "token": access_token
    }

@api_router.post("/auth/login")
async def login(input_data: LoginInput, request: Request, response: Response):
    email = input_data.email.lower().strip()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"
    # Brute force check
    attempt = await db.login_attempts.find_one({"identifier": identifier}, {"_id": 0})
    if attempt and attempt.get("count", 0) >= 5:
        locked_until = attempt.get("locked_until", "")
        if locked_until and datetime.fromisoformat(locked_until) > datetime.now(timezone.utc):
            raise HTTPException(status_code=429, detail="Too many login attempts. Try again in 15 minutes.")
        else:
            await db.login_attempts.delete_one({"identifier": identifier})

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(input_data.password, user["password_hash"]):
        # Increment failed attempts
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {
                "$inc": {"count": 1},
                "$set": {"locked_until": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()}
            },
            upsert=True
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Clear attempts on success
    await db.login_attempts.delete_many({"identifier": identifier})

    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    set_auth_cookies(response, access_token, refresh_token)

    return {
        "id": user_id,
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "verified": user.get("verified", False),
        "token": access_token
    }

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user

@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user_id = str(user["_id"])
        access_token = create_access_token(user_id, user["email"])
        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
        return {"message": "Token refreshed"}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

# ============ Profile Endpoints ============

@api_router.put("/profile")
async def update_profile(data: ProfileUpdate, user: dict = Depends(get_current_user)):
    update_fields = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    # Build GeoJSON point if coordinates provided
    lat = update_fields.pop("latitude", None)
    lng = update_fields.pop("longitude", None)
    radius = update_fields.pop("preferred_radius_km", None)
    if lat is not None and lng is not None:
        update_fields["geo_location"] = make_geo_point(lng, lat)
        update_fields["latitude"] = lat
        update_fields["longitude"] = lng
    if radius is not None:
        update_fields["preferred_radius_km"] = radius
    await db.users.update_one({"_id": ObjectId(user["_id"])}, {"$set": update_fields})
    updated = await db.users.find_one({"_id": ObjectId(user["_id"])}, {"password_hash": 0})
    return serialize_doc(updated)

@api_router.get("/profile/{user_id}")
async def get_profile(user_id: str):
    user = await db.users.find_one({"_id": ObjectId(user_id)}, {"password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return serialize_doc(user)

# ============ Job Endpoints ============

@api_router.post("/jobs", status_code=201)
async def create_job(data: JobCreate, user: dict = Depends(get_current_user)):
    if user["role"] != "employer":
        raise HTTPException(status_code=403, detail="Only employers can post jobs")
    job_dict = data.model_dump()
    lat = job_dict.pop("latitude", None)
    lng = job_dict.pop("longitude", None)
    # Auto-geocode if coords not provided
    if (lat is None or lng is None) and data.location:
        geo = geocode_address(data.location)
        if geo:
            lat, lng = geo["lat"], geo["lng"]
    job_doc = {
        **job_dict,
        "employer_id": user["_id"],
        "employer_name": user.get("name", ""),
        "company_name": user.get("company_name", ""),
        "status": "open",
        "applications_count": 0,
        "latitude": lat,
        "longitude": lng,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    if lat is not None and lng is not None:
        job_doc["geo_location"] = make_geo_point(lng, lat)
    result = await db.jobs.insert_one(job_doc)
    job_doc["_id"] = str(result.inserted_id)
    # Smart geo-targeted notifications: only notify labourers within radius or all if no geo
    labours = await db.users.find({"role": "labour"}, {"_id": 1, "phone": 1, "name": 1, "latitude": 1, "longitude": 1, "preferred_radius_km": 1}).to_list(500)
    for l in labours:
        lid = str(l["_id"])
        should_notify = True
        distance_text = ""
        if lat is not None and lng is not None and l.get("latitude") and l.get("longitude"):
            dist = haversine_km(l["latitude"], l["longitude"], lat, lng)
            radius = l.get("preferred_radius_km", 50) or 50
            if dist > radius:
                should_notify = False
            else:
                distance_text = f" ({dist:.1f} km away)"
        if should_notify:
            await create_notification(
                lid,
                "New Job Nearby" if distance_text else "New Job Available",
                f"'{data.title}' in {data.location}{distance_text} - Rs {data.pay_amount}/{data.pay_type}. Apply now!",
                "job_alert",
                sms=True,
                phone=l.get("phone", "")
            )
    return serialize_doc(job_doc)

@api_router.get("/jobs")
async def list_jobs(
    status: Optional[str] = None,
    project_type: Optional[str] = None,
    search: Optional[str] = None,
    employer_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 20
):
    query = {}
    if status:
        query["status"] = status
    if project_type:
        query["project_type"] = project_type
    if employer_id:
        query["employer_id"] = employer_id
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"location": {"$regex": search, "$options": "i"}},
        ]
    jobs = await db.jobs.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.jobs.count_documents(query)
    return {"jobs": [serialize_doc(j) for j in jobs], "total": total}

@api_router.get("/jobs/nearby")
async def get_nearby_jobs(
    latitude: float = Query(..., description="User latitude"),
    longitude: float = Query(..., description="User longitude"),
    radius_km: float = Query(50, description="Search radius in km"),
    status: Optional[str] = "open",
    project_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    user: dict = Depends(get_current_user)
):
    """Find jobs near a location using MongoDB geospatial query."""
    radius_meters = radius_km * 1000
    pipeline = [
        {
            "$geoNear": {
                "near": {"type": "Point", "coordinates": [longitude, latitude]},
                "distanceField": "distance_meters",
                "maxDistance": radius_meters,
                "spherical": True,
                "query": {}
            }
        }
    ]
    match_stage = {}
    if status:
        match_stage["status"] = status
    if project_type:
        match_stage["project_type"] = project_type
    if match_stage:
        pipeline[0]["$geoNear"]["query"] = match_stage
    pipeline.append({"$addFields": {"distance_km": {"$round": [{"$divide": ["$distance_meters", 1000]}, 1]}}})
    pipeline.append({"$sort": {"distance_meters": 1}})
    count_pipeline = pipeline.copy()
    count_pipeline.append({"$count": "total"})
    count_result = await db.jobs.aggregate(count_pipeline).to_list(1)
    total = count_result[0]["total"] if count_result else 0
    pipeline.append({"$skip": skip})
    pipeline.append({"$limit": limit})
    jobs = await db.jobs.aggregate(pipeline).to_list(limit)
    serialized = []
    for j in jobs:
        j["_id"] = str(j["_id"])
        for key, val in j.items():
            if isinstance(val, ObjectId):
                j[key] = str(val)
            if isinstance(val, datetime):
                j[key] = val.isoformat()
        j.pop("geo_location", None)
        j.pop("distance_meters", None)
        serialized.append(j)
    return {"jobs": serialized, "total": total, "radius_km": radius_km, "center": {"latitude": latitude, "longitude": longitude}}

@api_router.get("/jobs/nearby/count")
async def count_nearby_jobs(
    latitude: float = Query(...),
    longitude: float = Query(...),
    radius_km: float = Query(50),
    user: dict = Depends(get_current_user)
):
    """Count nearby open jobs for badge display."""
    radius_meters = radius_km * 1000
    pipeline = [
        {
            "$geoNear": {
                "near": {"type": "Point", "coordinates": [longitude, latitude]},
                "distanceField": "distance_meters",
                "maxDistance": radius_meters,
                "spherical": True,
                "query": {"status": "open"}
            }
        },
        {"$count": "total"}
    ]
    result = await db.jobs.aggregate(pipeline).to_list(1)
    return {"count": result[0]["total"] if result else 0, "radius_km": radius_km}

@api_router.get("/jobs/{job_id}")
async def get_job(job_id: str):
    job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return serialize_doc(job)

@api_router.put("/jobs/{job_id}")
async def update_job(job_id: str, data: JobCreate, user: dict = Depends(get_current_user)):
    job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["employer_id"] != user["_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.jobs.update_one({"_id": ObjectId(job_id)}, {"$set": data.model_dump()})
    updated = await db.jobs.find_one({"_id": ObjectId(job_id)})
    return serialize_doc(updated)

@api_router.delete("/jobs/{job_id}")
async def delete_job(job_id: str, user: dict = Depends(get_current_user)):
    job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["employer_id"] != user["_id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.jobs.delete_one({"_id": ObjectId(job_id)})
    return {"message": "Job deleted"}

@api_router.patch("/jobs/{job_id}/status")
async def update_job_status(job_id: str, request: Request, user: dict = Depends(get_current_user)):
    body = await request.json()
    new_status = body.get("status")
    if new_status not in ["open", "closed", "in_progress", "completed"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["employer_id"] != user["_id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.jobs.update_one({"_id": ObjectId(job_id)}, {"$set": {"status": new_status}})
    return {"message": "Status updated"}

# ============ Job Application Endpoints ============

@api_router.post("/applications")
async def apply_for_job(data: JobApplicationCreate, user: dict = Depends(get_current_user)):
    if user["role"] != "labour":
        raise HTTPException(status_code=403, detail="Only labourers can apply for jobs")
    job = await db.jobs.find_one({"_id": ObjectId(data.job_id)})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    existing = await db.job_applications.find_one({"job_id": data.job_id, "labour_id": user["_id"]})
    if existing:
        raise HTTPException(status_code=400, detail="Already applied for this job")
    app_doc = {
        "job_id": data.job_id,
        "job_title": job.get("title", ""),
        "labour_id": user["_id"],
        "labour_name": user.get("name", ""),
        "employer_id": job["employer_id"],
        "message": data.message,
        "status": "pending",  # pending, accepted, rejected
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.job_applications.insert_one(app_doc)
    await db.jobs.update_one({"_id": ObjectId(data.job_id)}, {"$inc": {"applications_count": 1}})
    app_doc["_id"] = str(result.inserted_id)
    # Notify employer
    employer = await db.users.find_one({"_id": ObjectId(job["employer_id"])}, {"password_hash": 0})
    if employer:
        await create_notification(
            job["employer_id"],
            "New Job Application",
            f"{user.get('name', 'A worker')} applied for '{job.get('title', 'your job')}'.",
            "application",
            sms=True,
            phone=employer.get("phone", "")
        )
    return serialize_doc(app_doc)

@api_router.get("/applications")
async def list_applications(
    job_id: Optional[str] = None,
    labour_id: Optional[str] = None,
    employer_id: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {}
    if job_id:
        query["job_id"] = job_id
    if labour_id:
        query["labour_id"] = labour_id
    if employer_id:
        query["employer_id"] = employer_id
    if status:
        query["status"] = status
    # Filter based on role
    if user["role"] == "labour":
        query["labour_id"] = user["_id"]
    elif user["role"] == "employer":
        query["employer_id"] = user["_id"]
    apps = await db.job_applications.find(query).sort("created_at", -1).to_list(100)
    return [serialize_doc(a) for a in apps]

@api_router.patch("/applications/{app_id}/status")
async def update_application_status(app_id: str, request: Request, user: dict = Depends(get_current_user)):
    body = await request.json()
    new_status = body.get("status")
    if new_status not in ["accepted", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    application = await db.job_applications.find_one({"_id": ObjectId(app_id)})
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    if application["employer_id"] != user["_id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.job_applications.update_one({"_id": ObjectId(app_id)}, {"$set": {"status": new_status}})
    # Notify labour about application status
    labour = await db.users.find_one({"_id": ObjectId(application["labour_id"])}, {"password_hash": 0})
    if labour:
        status_msg = "accepted! Congratulations!" if new_status == "accepted" else "not accepted at this time."
        await create_notification(
            application["labour_id"],
            f"Application {new_status.title()}",
            f"Your application for '{application.get('job_title', 'the job')}' has been {status_msg}",
            "application",
            sms=True,
            phone=labour.get("phone", "")
        )
    return {"message": f"Application {new_status}"}

# ============ Tool Rental Endpoints ============

@api_router.post("/tools", status_code=201)
async def create_tool(data: ToolRentalCreate, user: dict = Depends(get_current_user)):
    if user["role"] != "vendor" and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only vendors can list tools")
    tool_doc = {
        **data.model_dump(),
        "vendor_id": user["_id"],
        "vendor_name": user.get("name", ""),
        "status": "available",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.tool_rentals.insert_one(tool_doc)
    tool_doc["_id"] = str(result.inserted_id)
    return serialize_doc(tool_doc)

@api_router.get("/tools")
async def list_tools(
    category: Optional[str] = None,
    search: Optional[str] = None,
    vendor_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 20
):
    query = {}
    if category:
        query["category"] = category
    if vendor_id:
        query["vendor_id"] = vendor_id
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
        ]
    tools = await db.tool_rentals.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.tool_rentals.count_documents(query)
    return {"tools": [serialize_doc(t) for t in tools], "total": total}

@api_router.delete("/tools/{tool_id}")
async def delete_tool(tool_id: str, user: dict = Depends(get_current_user)):
    tool = await db.tool_rentals.find_one({"_id": ObjectId(tool_id)})
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    if tool["vendor_id"] != user["_id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.tool_rentals.delete_one({"_id": ObjectId(tool_id)})
    return {"message": "Tool deleted"}

# ============ Wallet & Transaction Endpoints ============

@api_router.get("/wallet")
async def get_wallet(user: dict = Depends(get_current_user)):
    wallet = await db.wallets.find_one({"user_id": user["_id"]}, {"_id": 0})
    if not wallet:
        wallet = {"user_id": user["_id"], "balance": 0.0}
        await db.wallets.insert_one({**wallet, "created_at": datetime.now(timezone.utc).isoformat()})
    return wallet

@api_router.post("/wallet/topup")
async def topup_wallet(data: WalletTopUp, user: dict = Depends(get_current_user)):
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    await db.wallets.update_one(
        {"user_id": user["_id"]},
        {"$inc": {"balance": data.amount}},
        upsert=True
    )
    # Record transaction
    txn = {
        "from_user_id": "system",
        "to_user_id": user["_id"],
        "amount": data.amount,
        "type": "topup",
        "description": "Wallet top-up",
        "status": "completed",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.transactions.insert_one(txn)
    wallet = await db.wallets.find_one({"user_id": user["_id"]}, {"_id": 0})
    return wallet

@api_router.post("/wallet/transfer")
async def transfer_funds(data: TransferCreate, user: dict = Depends(get_current_user)):
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    # Check sender wallet
    sender_wallet = await db.wallets.find_one({"user_id": user["_id"]})
    if not sender_wallet or sender_wallet.get("balance", 0) < data.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    # Check receiver exists
    receiver = await db.users.find_one({"_id": ObjectId(data.to_user_id)})
    if not receiver:
        raise HTTPException(status_code=404, detail="Recipient not found")
    # Transfer
    await db.wallets.update_one({"user_id": user["_id"]}, {"$inc": {"balance": -data.amount}})
    await db.wallets.update_one({"user_id": data.to_user_id}, {"$inc": {"balance": data.amount}}, upsert=True)
    # Record transaction
    txn = {
        "from_user_id": user["_id"],
        "from_user_name": user.get("name", ""),
        "to_user_id": data.to_user_id,
        "to_user_name": receiver.get("name", ""),
        "amount": data.amount,
        "type": "transfer",
        "description": data.description or "Wage payment",
        "job_id": data.job_id or "",
        "status": "completed",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.transactions.insert_one(txn)
    txn["_id"] = str(result.inserted_id)
    return serialize_doc(txn)

@api_router.get("/transactions")
async def list_transactions(user: dict = Depends(get_current_user)):
    query = {"$or": [{"from_user_id": user["_id"]}, {"to_user_id": user["_id"]}]}
    txns = await db.transactions.find(query).sort("created_at", -1).to_list(100)
    return [serialize_doc(t) for t in txns]

# ============ Admin Endpoints ============

@api_router.get("/admin/stats")
async def admin_stats(user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    total_users = await db.users.count_documents({})
    total_employers = await db.users.count_documents({"role": "employer"})
    total_labours = await db.users.count_documents({"role": "labour"})
    total_vendors = await db.users.count_documents({"role": "vendor"})
    total_jobs = await db.jobs.count_documents({})
    open_jobs = await db.jobs.count_documents({"status": "open"})
    total_tools = await db.tool_rentals.count_documents({})
    total_txns = await db.transactions.count_documents({})
    verified_users = await db.users.count_documents({"verified": True})
    return {
        "total_users": total_users,
        "total_employers": total_employers,
        "total_labours": total_labours,
        "total_vendors": total_vendors,
        "total_jobs": total_jobs,
        "open_jobs": open_jobs,
        "total_tools": total_tools,
        "total_transactions": total_txns,
        "verified_users": verified_users,
    }

@api_router.get("/admin/users")
async def admin_list_users(role: Optional[str] = None, verified: Optional[str] = None, user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    query = {}
    if role:
        query["role"] = role
    if verified is not None:
        query["verified"] = verified == "true"
    users = await db.users.find(query, {"password_hash": 0}).sort("created_at", -1).to_list(200)
    return [serialize_doc(u) for u in users]

@api_router.post("/admin/verify")
async def admin_verify_user(data: VerifyUser, user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    target = await db.users.find_one({"_id": ObjectId(data.user_id)})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    await db.users.update_one({"_id": ObjectId(data.user_id)}, {"$set": {"verified": data.verified}})
    return {"message": f"User {'verified' if data.verified else 'unverified'}"}

# ============ Labour Search ============

@api_router.get("/labours")
async def list_labours(
    search: Optional[str] = None,
    verified: Optional[str] = None,
    skill: Optional[str] = None,
    skip: int = 0,
    limit: int = 20
):
    query = {"role": "labour"}
    if verified is not None:
        query["verified"] = verified == "true"
    if skill:
        query["skills"] = {"$in": [skill]}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"bio": {"$regex": search, "$options": "i"}},
        ]
    labours = await db.users.find(query, {"password_hash": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.users.count_documents(query)
    return {"labours": [serialize_doc(l) for l in labours], "total": total}

# ============ Geocoding & Nearby Jobs ============

@api_router.get("/geocode")
async def geocode_location(address: str):
    """Geocode an address to lat/lng coordinates."""
    result = geocode_address(address)
    if not result:
        raise HTTPException(status_code=404, detail="Could not geocode this address. Try a more specific location.")
    return result

# ============ Stripe Payment Endpoints ============

@api_router.post("/payments/create-checkout")
async def create_checkout(data: CheckoutRequest, request: Request, user: dict = Depends(get_current_user)):
    amount = data.amount
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Payment not configured")
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    origin = data.origin_url.rstrip("/")
    success_url = f"{origin}/wallet?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/wallet"
    metadata = {"user_id": user["_id"], "user_email": user["email"], "type": "wallet_topup"}
    checkout_req = CheckoutSessionRequest(
        amount=float(amount),
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata
    )
    session = await stripe_checkout.create_checkout_session(checkout_req)
    # Record payment transaction
    await db.payment_transactions.insert_one({
        "session_id": session.session_id,
        "user_id": user["_id"],
        "user_email": user["email"],
        "amount": float(amount),
        "currency": "usd",
        "metadata": metadata,
        "payment_status": "initiated",
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/payments/status/{session_id}")
async def payment_status(session_id: str, user: dict = Depends(get_current_user)):
    api_key = os.environ.get("STRIPE_API_KEY")
    host_url = "https://labor-hire-hub.preview.emergentagent.com"
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    status = await stripe_checkout.get_checkout_status(session_id)
    # Update payment transaction
    ptxn = await db.payment_transactions.find_one({"session_id": session_id})
    if ptxn and ptxn.get("payment_status") != "paid":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": status.payment_status, "status": status.status}}
        )
        # Credit wallet only once
        if status.payment_status == "paid" and ptxn.get("payment_status") != "paid":
            amount = ptxn["amount"]
            uid = ptxn["user_id"]
            await db.wallets.update_one({"user_id": uid}, {"$inc": {"balance": amount}}, upsert=True)
            await db.transactions.insert_one({
                "from_user_id": "stripe",
                "to_user_id": uid,
                "amount": amount,
                "type": "stripe_topup",
                "description": f"Stripe top-up (Session: {session_id[:12]}...)",
                "status": "completed",
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            await create_notification(uid, "Payment Successful", f"Rs {amount} added to your wallet via Stripe.", "payment")
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency,
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    try:
        body = await request.body()
        api_key = os.environ.get("STRIPE_API_KEY")
        host_url = str(request.base_url).rstrip("/")
        webhook_url = f"{host_url}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
        sig = request.headers.get("Stripe-Signature", "")
        webhook_response = await stripe_checkout.handle_webhook(body, sig)
        if webhook_response.payment_status == "paid":
            ptxn = await db.payment_transactions.find_one({"session_id": webhook_response.session_id})
            if ptxn and ptxn.get("payment_status") != "paid":
                await db.payment_transactions.update_one(
                    {"session_id": webhook_response.session_id},
                    {"$set": {"payment_status": "paid", "status": "complete"}}
                )
                amount = ptxn["amount"]
                uid = ptxn["user_id"]
                await db.wallets.update_one({"user_id": uid}, {"$inc": {"balance": amount}}, upsert=True)
                await db.transactions.insert_one({
                    "from_user_id": "stripe",
                    "to_user_id": uid,
                    "amount": amount,
                    "type": "stripe_topup",
                    "description": f"Stripe webhook payment",
                    "status": "completed",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                })
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error"}

# ============ Document Upload Endpoints ============

@api_router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    doc_type: str = Query("aadhaar", description="Document type: aadhaar, licence, other"),
    user: dict = Depends(get_current_user)
):
    allowed_types = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP, PDF allowed")
    if file.size and file.size > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")
    ext = file.filename.split(".")[-1] if "." in file.filename else "bin"
    path = f"{APP_NAME}/documents/{user['_id']}/{uuid.uuid4()}.{ext}"
    data = await file.read()
    result = put_object(path, data, file.content_type or "application/octet-stream")
    doc_record = {
        "user_id": user["_id"],
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": file.content_type,
        "size": result.get("size", len(data)),
        "doc_type": doc_type,
        "is_deleted": False,
        "verified": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    insert_result = await db.documents.insert_one(doc_record)
    doc_record["_id"] = str(insert_result.inserted_id)
    await create_notification(user["_id"], "Document Uploaded", f"Your {doc_type} document has been uploaded for verification.", "document")
    return serialize_doc(doc_record)

@api_router.get("/documents")
async def list_documents(user_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"is_deleted": False}
    if user["role"] == "admin" and user_id:
        query["user_id"] = user_id
    else:
        query["user_id"] = user["_id"]
    docs = await db.documents.find(query).sort("created_at", -1).to_list(50)
    return [serialize_doc(d) for d in docs]

@api_router.get("/documents/file/{path:path}")
async def download_document(path: str, auth: str = Query(None), user: dict = Depends(get_current_user)):
    record = await db.documents.find_one({"storage_path": path, "is_deleted": False})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    if record["user_id"] != user["_id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    data, content_type = get_object(path)
    return Response(content=data, media_type=record.get("content_type", content_type))

@api_router.post("/documents/{doc_id}/verify")
async def verify_document(doc_id: str, request: Request, user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    body = await request.json()
    verified = body.get("verified", True)
    doc = await db.documents.find_one({"_id": ObjectId(doc_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    await db.documents.update_one({"_id": ObjectId(doc_id)}, {"$set": {"verified": verified}})
    status_text = "verified" if verified else "rejected"
    await create_notification(doc["user_id"], "Document Verification", f"Your {doc.get('doc_type', 'document')} has been {status_text}.", "verification")
    return {"message": f"Document {status_text}"}

# ============ Review & Rating Endpoints ============

@api_router.post("/reviews")
async def create_review(data: ReviewCreate, user: dict = Depends(get_current_user)):
    if data.rating < 1 or data.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be 1-5")
    if data.reviewed_user_id == user["_id"]:
        raise HTTPException(status_code=400, detail="Cannot review yourself")
    target = await db.users.find_one({"_id": ObjectId(data.reviewed_user_id)})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    # Prevent duplicate review for same job
    if data.job_id:
        existing = await db.reviews.find_one({
            "reviewer_id": user["_id"],
            "reviewed_user_id": data.reviewed_user_id,
            "job_id": data.job_id
        })
        if existing:
            raise HTTPException(status_code=400, detail="Already reviewed this user for this job")
    review_doc = {
        "reviewer_id": user["_id"],
        "reviewer_name": user.get("name", ""),
        "reviewer_role": user.get("role", ""),
        "reviewed_user_id": data.reviewed_user_id,
        "reviewed_user_name": target.get("name", ""),
        "job_id": data.job_id or "",
        "rating": data.rating,
        "comment": data.comment,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.reviews.insert_one(review_doc)
    review_doc["_id"] = str(result.inserted_id)
    # Update average rating on user
    pipeline = [
        {"$match": {"reviewed_user_id": data.reviewed_user_id}},
        {"$group": {"_id": None, "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}}
    ]
    agg = await db.reviews.aggregate(pipeline).to_list(1)
    if agg:
        avg_rating = round(agg[0]["avg"], 1)
        review_count = agg[0]["count"]
        await db.users.update_one(
            {"_id": ObjectId(data.reviewed_user_id)},
            {"$set": {"avg_rating": avg_rating, "review_count": review_count}}
        )
    rating_labels = {1: "Poor", 2: "Fair", 3: "Good", 4: "Very Good", 5: "Excellent"}
    await create_notification(
        data.reviewed_user_id,
        "New Review",
        f"{user.get('name', 'Someone')} rated you {data.rating}/5 ({rating_labels.get(data.rating, '')}).",
        "review",
        sms=True,
        phone=target.get("phone", "")
    )
    return serialize_doc(review_doc)

@api_router.get("/reviews/{user_id}")
async def get_user_reviews(user_id: str):
    reviews = await db.reviews.find({"reviewed_user_id": user_id}).sort("created_at", -1).to_list(50)
    # Compute stats
    pipeline = [
        {"$match": {"reviewed_user_id": user_id}},
        {"$group": {"_id": None, "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}}
    ]
    agg = await db.reviews.aggregate(pipeline).to_list(1)
    stats = {"avg_rating": 0, "review_count": 0}
    if agg:
        stats = {"avg_rating": round(agg[0]["avg"], 1), "review_count": agg[0]["count"]}
    return {"reviews": [serialize_doc(r) for r in reviews], **stats}

@api_router.get("/reviews/given/me")
async def get_my_given_reviews(user: dict = Depends(get_current_user)):
    reviews = await db.reviews.find({"reviewer_id": user["_id"]}).sort("created_at", -1).to_list(50)
    return [serialize_doc(r) for r in reviews]

# ============ Notification Endpoints ============

@api_router.get("/notifications")
async def list_notifications(user: dict = Depends(get_current_user)):
    notifs = await db.notifications.find({"user_id": user["_id"]}).sort("created_at", -1).to_list(50)
    return [serialize_doc(n) for n in notifs]

@api_router.get("/notifications/unread-count")
async def unread_count(user: dict = Depends(get_current_user)):
    count = await db.notifications.count_documents({"user_id": user["_id"], "read": False})
    return {"count": count}

@api_router.patch("/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one(
        {"_id": ObjectId(notif_id), "user_id": user["_id"]},
        {"$set": {"read": True}}
    )
    return {"message": "Marked as read"}

@api_router.post("/notifications/mark-all-read")
async def mark_all_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": user["_id"], "read": False},
        {"$set": {"read": True}}
    )
    return {"message": "All marked as read"}

# ============ Root ============

@api_router.get("/")
async def root():
    return {"message": "Labour Hire Hub API"}

# Include the router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Startup
@app.on_event("startup")
async def startup():
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.jobs.create_index("employer_id")
    await db.jobs.create_index("status")
    await db.job_applications.create_index("job_id")
    await db.job_applications.create_index("labour_id")
    await db.wallets.create_index("user_id", unique=True)
    await db.transactions.create_index("from_user_id")
    await db.transactions.create_index("to_user_id")
    await db.payment_transactions.create_index("session_id", unique=True)
    await db.documents.create_index("user_id")
    await db.reviews.create_index("reviewed_user_id")
    await db.reviews.create_index("reviewer_id")
    await db.notifications.create_index("user_id")
    # Geospatial indexes
    await db.jobs.create_index([("geo_location", "2dsphere")])
    await db.users.create_index([("geo_location", "2dsphere")])
    # Init storage
    try:
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
    # Seed admin
    await seed_admin()
    logger.info("Server started, admin seeded, indexes created")

async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        hashed = hash_password(admin_password)
        result = await db.users.insert_one({
            "email": admin_email,
            "password_hash": hashed,
            "name": "Admin",
            "role": "admin",
            "phone": "",
            "verified": True,
            "aadhaar_number": "",
            "licence_number": "",
            "company_name": "",
            "address": "",
            "skills": [],
            "experience_years": 0,
            "daily_rate": 0,
            "bio": "",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        admin_id = str(result.inserted_id)
        await db.wallets.insert_one({"user_id": admin_id, "balance": 100000.0, "created_at": datetime.now(timezone.utc).isoformat()})
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})

    # Write test credentials
    Path("/app/memory").mkdir(exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write(f"# Test Credentials\n\n")
        f.write(f"## Admin\n- Email: {admin_email}\n- Password: {admin_password}\n- Role: admin\n\n")
        f.write(f"## Auth Endpoints\n- POST /api/auth/register\n- POST /api/auth/login\n- POST /api/auth/logout\n- GET /api/auth/me\n- POST /api/auth/refresh\n")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
