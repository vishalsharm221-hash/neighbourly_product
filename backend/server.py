from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'dev-secret')
JWT_ALGO = "HS256"
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ---------- Helpers ----------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def create_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=30)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        user_id = payload.get("sub")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# ---------- Models ----------
class SignupReq(BaseModel):
    name: str
    email: EmailStr
    password: str

class LoginReq(BaseModel):
    email: EmailStr
    password: str

class OnboardReq(BaseModel):
    city: str
    locality: str

class PostCreate(BaseModel):
    content: str
    category: str  # general, recommendations, safety, events, forsale
    image_base64: Optional[str] = None

class EventCreate(BaseModel):
    title: str
    description: str
    date: str
    location: str
    image_base64: Optional[str] = None

class MarketCreate(BaseModel):
    title: str
    price: float
    description: str
    image_base64: Optional[str] = None

class TranslateReq(BaseModel):
    text: str
    target: str  # "hindi" or "english"

# ---------- Auth ----------
@api_router.post("/auth/signup")
async def signup(body: SignupReq):
    exists = await db.users.find_one({"email": body.email.lower()})
    if exists:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "name": body.name,
        "email": body.email.lower(),
        "password_hash": hash_password(body.password),
        "city": None,
        "locality": None,
        "avatar": None,
        "verified": False,
        "created_at": now_iso(),
    }
    await db.users.insert_one(user_doc)
    token = create_token(user_id)
    user_doc.pop("password_hash", None)
    user_doc.pop("_id", None)
    return {"token": token, "user": user_doc}

@api_router.post("/auth/login")
async def login(body: LoginReq):
    user = await db.users.find_one({"email": body.email.lower()})
    if not user or not verify_password(body.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(user["id"])
    user.pop("password_hash", None)
    user.pop("_id", None)
    return {"token": token, "user": user}

@api_router.get("/me")
async def me(user=Depends(get_current_user)):
    return user

@api_router.post("/me/onboard")
async def onboard(body: OnboardReq, user=Depends(get_current_user)):
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"city": body.city, "locality": body.locality}}
    )
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return updated

# ---------- Localities ----------
LOCALITIES = {
    "Delhi": ["Connaught Place", "Hauz Khas", "Saket", "Dwarka Sector 12", "Lajpat Nagar", "Karol Bagh", "Vasant Kunj", "Rohini Sector 7"],
    "Gurugram": ["DLF Phase 1", "DLF Phase 2", "Sector 14", "Sector 56", "Sushant Lok", "Golf Course Road", "Sohna Road", "MG Road"],
    "Noida": ["Sector 18", "Sector 62", "Sector 137", "Sector 50", "Sector 76", "Greater Noida West", "Sector 15A", "Sector 128"],
    "Ghaziabad": ["Indirapuram", "Vaishali", "Vasundhara", "Kaushambi", "Crossings Republik", "Raj Nagar Extension", "Shipra Sun City", "Pratap Vihar"],
}

@api_router.get("/localities")
async def localities():
    return LOCALITIES

# ---------- Posts ----------
async def serialize_post(p: dict, viewer_id: Optional[str] = None):
    p.pop("_id", None)
    likes = p.get("likes", [])
    p["like_count"] = len(likes)
    p["liked_by_me"] = viewer_id in likes if viewer_id else False
    p.pop("likes", None)
    # attach author info
    author = await db.users.find_one({"id": p.get("author_id")}, {"_id": 0, "name": 1, "city": 1, "locality": 1, "avatar": 1, "verified": 1})
    p["author"] = author or {"name": "Unknown"}
    return p

@api_router.get("/posts")
async def list_posts(city: Optional[str] = None, category: Optional[str] = None, user=Depends(get_current_user)):
    q = {}
    target_city = city or user.get("city")
    if target_city:
        q["city"] = target_city
    if category and category != "all":
        q["category"] = category
    cursor = db.posts.find(q, {"_id": 0}).sort("created_at", -1).limit(100)
    items = await cursor.to_list(100)
    return [await serialize_post(p, user["id"]) for p in items]

@api_router.post("/posts")
async def create_post(body: PostCreate, user=Depends(get_current_user)):
    if not user.get("city"):
        raise HTTPException(status_code=400, detail="Complete onboarding first")
    pid = str(uuid.uuid4())
    doc = {
        "id": pid,
        "author_id": user["id"],
        "content": body.content,
        "category": body.category,
        "image_base64": body.image_base64,
        "city": user["city"],
        "locality": user.get("locality"),
        "likes": [],
        "comments_count": 0,
        "created_at": now_iso(),
    }
    await db.posts.insert_one(doc)
    doc.pop("_id", None)
    return await serialize_post(doc, user["id"])

@api_router.post("/posts/{post_id}/like")
async def toggle_like(post_id: str, user=Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    likes = set(post.get("likes", []))
    if user["id"] in likes:
        likes.remove(user["id"])
    else:
        likes.add(user["id"])
    await db.posts.update_one({"id": post_id}, {"$set": {"likes": list(likes)}})
    return {"liked": user["id"] in likes, "like_count": len(likes)}

# ---------- Events ----------
@api_router.get("/events")
async def list_events(user=Depends(get_current_user)):
    q = {"city": user.get("city")} if user.get("city") else {}
    cursor = db.events.find(q, {"_id": 0}).sort("date", 1).limit(50)
    items = await cursor.to_list(50)
    for ev in items:
        rsvps = ev.get("rsvps", [])
        ev["rsvp_count"] = len(rsvps)
        ev["rsvped"] = user["id"] in rsvps
        ev.pop("rsvps", None)
    return items

@api_router.post("/events")
async def create_event(body: EventCreate, user=Depends(get_current_user)):
    if not user.get("city"):
        raise HTTPException(status_code=400, detail="Complete onboarding first")
    eid = str(uuid.uuid4())
    doc = {
        "id": eid,
        "title": body.title,
        "description": body.description,
        "date": body.date,
        "location": body.location,
        "image_base64": body.image_base64,
        "city": user["city"],
        "host_id": user["id"],
        "host_name": user["name"],
        "rsvps": [],
        "created_at": now_iso(),
    }
    await db.events.insert_one(doc)
    doc.pop("_id", None)
    doc["rsvp_count"] = 0
    doc["rsvped"] = False
    doc.pop("rsvps", None)
    return doc

@api_router.post("/events/{event_id}/rsvp")
async def rsvp_event(event_id: str, user=Depends(get_current_user)):
    ev = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    rsvps = set(ev.get("rsvps", []))
    if user["id"] in rsvps:
        rsvps.remove(user["id"])
    else:
        rsvps.add(user["id"])
    await db.events.update_one({"id": event_id}, {"$set": {"rsvps": list(rsvps)}})
    return {"rsvped": user["id"] in rsvps, "rsvp_count": len(rsvps)}

# ---------- Marketplace ----------
@api_router.get("/marketplace")
async def list_market(user=Depends(get_current_user)):
    q = {"city": user.get("city")} if user.get("city") else {}
    cursor = db.marketplace.find(q, {"_id": 0}).sort("created_at", -1).limit(50)
    items = await cursor.to_list(50)
    for m in items:
        seller = await db.users.find_one({"id": m.get("seller_id")}, {"_id": 0, "name": 1, "locality": 1})
        m["seller"] = seller or {"name": "Unknown"}
    return items

@api_router.post("/marketplace")
async def create_market(body: MarketCreate, user=Depends(get_current_user)):
    if not user.get("city"):
        raise HTTPException(status_code=400, detail="Complete onboarding first")
    mid = str(uuid.uuid4())
    doc = {
        "id": mid,
        "title": body.title,
        "price": body.price,
        "description": body.description,
        "image_base64": body.image_base64,
        "city": user["city"],
        "locality": user.get("locality"),
        "seller_id": user["id"],
        "created_at": now_iso(),
    }
    await db.marketplace.insert_one(doc)
    doc.pop("_id", None)
    doc["seller"] = {"name": user["name"], "locality": user.get("locality")}
    return doc

# ---------- AI Translate ----------
@api_router.post("/ai/translate")
async def ai_translate(body: TranslateReq, user=Depends(get_current_user)):
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        target_lang = "Hindi (Devanagari)" if body.target == "hindi" else "English"
        sys_msg = f"You are a translator. Translate the user's text to {target_lang}. Reply with ONLY the translation, no preface, no quotes."
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"translate-{user['id']}",
            system_message=sys_msg,
        ).with_model("anthropic", "claude-sonnet-4-6")
        msg = UserMessage(text=body.text)
        reply = await chat.send_message(msg)
        return {"translation": reply.strip() if isinstance(reply, str) else str(reply).strip()}
    except Exception as e:
        logging.exception("translate failed")
        raise HTTPException(status_code=500, detail=f"Translate failed: {e}")

# ---------- Seed ----------
SEED_USERS = [
    {"id": "seed-priya", "name": "Priya Sharma", "email": "priya@neighbourly.in", "password_hash": hash_password("password123"), "city": "Gurugram", "locality": "DLF Phase 1", "avatar": None, "verified": True, "created_at": now_iso()},
    {"id": "seed-rahul", "name": "Rahul Verma", "email": "rahul@neighbourly.in", "password_hash": hash_password("password123"), "city": "Gurugram", "locality": "Sector 56", "avatar": None, "verified": True, "created_at": now_iso()},
    {"id": "seed-ananya", "name": "Ananya Singh", "email": "ananya@neighbourly.in", "password_hash": hash_password("password123"), "city": "Noida", "locality": "Sector 18", "avatar": None, "verified": False, "created_at": now_iso()},
    {"id": "seed-arjun", "name": "Arjun Kapoor", "email": "arjun@neighbourly.in", "password_hash": hash_password("password123"), "city": "Delhi", "locality": "Hauz Khas", "avatar": None, "verified": True, "created_at": now_iso()},
    {"id": "seed-meera", "name": "Meera Iyer", "email": "meera@neighbourly.in", "password_hash": hash_password("password123"), "city": "Ghaziabad", "locality": "Indirapuram", "avatar": None, "verified": False, "created_at": now_iso()},
]

SEED_POSTS = [
    {"author_id": "seed-priya", "city": "Gurugram", "locality": "DLF Phase 1", "category": "recommendations", "content": "Anyone know a reliable RO water purifier technician in DLF Phase 1? Mine has been making weird noises for the past two days. Pls share contact!"},
    {"author_id": "seed-rahul", "city": "Gurugram", "locality": "Sector 56", "category": "safety", "content": "Heads up neighbours - saw a stray dog with injured leg near Sector 56 main market. Coordinating with Friendicoes. DM me if you want to help."},
    {"author_id": "seed-ananya", "city": "Noida", "locality": "Sector 18", "category": "events", "content": "Holi celebration this Sunday at Atta Market plaza, 10 AM onwards. Free thandai & gujiyas! Kids welcome 🌸"},
    {"author_id": "seed-arjun", "city": "Delhi", "locality": "Hauz Khas", "category": "general", "content": "Power cut in Hauz Khas Village since 6 AM. Anyone else affected? BSES site is down. Will update when I know more."},
    {"author_id": "seed-meera", "city": "Ghaziabad", "locality": "Indirapuram", "category": "forsale", "content": "Selling a like-new Royal Enfield helmet (size L). Used twice. ₹1,800. Pickup from Shipra Mall area."},
    {"author_id": "seed-priya", "city": "Gurugram", "locality": "DLF Phase 1", "category": "general", "content": "Welcome to all new families who moved in this month! There's a small kids park behind tower B - super safe and lots of friendly families gather there in evenings 🌳"},
]

SEED_EVENTS = [
    {"title": "Sunday Morning Yoga in the Park", "description": "Free community yoga session led by certified instructor Anjali. Bring your own mat!", "date": "2026-06-15", "location": "Leisure Valley Park, DLF Phase 1", "city": "Gurugram", "host_id": "seed-priya", "host_name": "Priya Sharma"},
    {"title": "Diwali Mela 2026", "description": "Annual community mela with food stalls, live music, and games for kids. All neighbours welcome.", "date": "2026-11-01", "location": "Sector 56 Community Centre", "city": "Gurugram", "host_id": "seed-rahul", "host_name": "Rahul Verma"},
    {"title": "Plant Swap Sunday", "description": "Bring a plant, take a plant! Great way to meet green-thumbed neighbours.", "date": "2026-06-22", "location": "Atta Market Plaza", "city": "Noida", "host_id": "seed-ananya", "host_name": "Ananya Singh"},
    {"title": "Cultural Walk - Hauz Khas Heritage", "description": "Guided walk through historic Hauz Khas village ruins. ₹100 contribution for guide.", "date": "2026-07-05", "location": "Hauz Khas Deer Park Gate", "city": "Delhi", "host_id": "seed-arjun", "host_name": "Arjun Kapoor"},
]

SEED_MARKET = [
    {"title": "IKEA Study Desk (White)", "price": 4500, "description": "2 years old, great condition. Includes drawer unit. Pickup only.", "city": "Gurugram", "locality": "DLF Phase 1", "seller_id": "seed-priya"},
    {"title": "Cricket Kit - Full Set", "price": 2800, "description": "Bat, pads, gloves, helmet. Used for one season. My son outgrew it.", "city": "Gurugram", "locality": "Sector 56", "seller_id": "seed-rahul"},
    {"title": "Home Cooked Tiffin Service", "price": 3500, "description": "Monthly subscription, North Indian veg meals, delivered hot. Sample available.", "city": "Noida", "locality": "Sector 18", "seller_id": "seed-ananya"},
    {"title": "Vintage Wooden Bookshelf", "price": 6000, "description": "Solid sheesham wood, 5 shelves. Selling because we're shifting cities.", "city": "Delhi", "locality": "Hauz Khas", "seller_id": "seed-arjun"},
    {"title": "Kids Bicycle (Age 8-12)", "price": 2200, "description": "Hero brand, blue colour, gear-less. Hardly used. Good for first bike.", "city": "Ghaziabad", "locality": "Indirapuram", "seller_id": "seed-meera"},
]

async def seed_data():
    if await db.users.count_documents({"id": {"$in": [u["id"] for u in SEED_USERS]}}) < len(SEED_USERS):
        for u in SEED_USERS:
            await db.users.update_one({"id": u["id"]}, {"$setOnInsert": u}, upsert=True)

    if await db.posts.count_documents({}) == 0:
        for p in SEED_POSTS:
            doc = {
                "id": str(uuid.uuid4()),
                "author_id": p["author_id"],
                "content": p["content"],
                "category": p["category"],
                "image_base64": None,
                "city": p["city"],
                "locality": p["locality"],
                "likes": [],
                "comments_count": 0,
                "created_at": now_iso(),
            }
            await db.posts.insert_one(doc)

    if await db.events.count_documents({}) == 0:
        for e in SEED_EVENTS:
            doc = {
                "id": str(uuid.uuid4()),
                "title": e["title"],
                "description": e["description"],
                "date": e["date"],
                "location": e["location"],
                "image_base64": None,
                "city": e["city"],
                "host_id": e["host_id"],
                "host_name": e["host_name"],
                "rsvps": [],
                "created_at": now_iso(),
            }
            await db.events.insert_one(doc)

    if await db.marketplace.count_documents({}) == 0:
        for m in SEED_MARKET:
            doc = {
                "id": str(uuid.uuid4()),
                "title": m["title"],
                "price": m["price"],
                "description": m["description"],
                "image_base64": None,
                "city": m["city"],
                "locality": m["locality"],
                "seller_id": m["seller_id"],
                "created_at": now_iso(),
            }
            await db.marketplace.insert_one(doc)

@api_router.get("/")
async def root():
    return {"message": "Neighbourly API"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def on_start():
    await seed_data()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
