from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
import bcrypt
import jwt
import secrets
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta

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

class WalletTopUp(BaseModel):
    amount: float

class VerifyUser(BaseModel):
    user_id: str
    verified: bool

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

@api_router.post("/jobs")
async def create_job(data: JobCreate, user: dict = Depends(get_current_user)):
    if user["role"] != "employer":
        raise HTTPException(status_code=403, detail="Only employers can post jobs")
    job_doc = {
        **data.model_dump(),
        "employer_id": user["_id"],
        "employer_name": user.get("name", ""),
        "company_name": user.get("company_name", ""),
        "status": "open",
        "applications_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.jobs.insert_one(job_doc)
    job_doc["_id"] = str(result.inserted_id)
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
    return {"message": f"Application {new_status}"}

# ============ Tool Rental Endpoints ============

@api_router.post("/tools")
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
