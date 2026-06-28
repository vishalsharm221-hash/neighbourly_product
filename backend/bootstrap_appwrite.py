"""
Bootstrap Appwrite Cloud for Localy.
Creates database, collections, attributes, indexes, and storage bucket.
Idempotent — safe to re-run.
"""
import os
import sys
import time

from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.services.storage import Storage
from appwrite.permission import Permission
from appwrite.role import Role
from appwrite.exception import AppwriteException

ENDPOINT = os.environ["APPWRITE_ENDPOINT"]
PROJECT_ID = os.environ["APPWRITE_PROJECT_ID"]
API_KEY = os.environ["APPWRITE_API_KEY"]

DB_ID = "localy"

COLLECTIONS = {
    "profiles": "Profiles",
    "posts": "Posts",
    "events": "Events",
    "market": "Marketplace",
    "likes": "Likes",
    "rsvps": "RSVPs",
}

BUCKET_ID = "media"

client = (
    Client()
    .set_endpoint(ENDPOINT)
    .set_project(PROJECT_ID)
    .set_key(API_KEY)
)
db = Databases(client)
storage = Storage(client)


def safe(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except AppwriteException as e:
        msg = str(e)
        if "already exists" in msg or "Attribute already exists" in msg or e.code == 409:
            print(f"  [skip] {fn.__name__}: already exists")
            return None
        print(f"  [error] {fn.__name__}({kwargs}): {msg}")
        raise


# ----- Database -----
print("Creating database…")
safe(db.create, DB_ID, "Localy")

# ----- Collections -----
print("Creating collections…")
collection_perms = [
    Permission.create(Role.users()),
    Permission.read(Role.users()),
]
for col_id, col_name in COLLECTIONS.items():
    safe(
        db.create_collection,
        database_id=DB_ID,
        collection_id=col_id,
        name=col_name,
        permissions=collection_perms,
        document_security=True,
        enabled=True,
    )

# ----- Attributes -----
print("Creating attributes…")

# profiles
for fn, kwargs in [
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="profiles", key="userId", size=64, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="profiles", key="name", size=128, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="profiles", key="email", size=256, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="profiles", key="city", size=64, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="profiles", key="locality", size=128, required=False)),
    (db.create_boolean_attribute, dict(database_id=DB_ID, collection_id="profiles", key="verified", required=False, default=False)),
]:
    safe(fn, **kwargs)

# posts
for fn, kwargs in [
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="posts", key="authorId", size=64, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="posts", key="authorName", size=128, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="posts", key="authorLocality", size=128, required=False)),
    (db.create_boolean_attribute, dict(database_id=DB_ID, collection_id="posts", key="authorVerified", required=False, default=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="posts", key="category", size=32, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="posts", key="content", size=5000, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="posts", key="city", size=64, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="posts", key="locality", size=128, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="posts", key="imageFileId", size=64, required=False)),
]:
    safe(fn, **kwargs)

# events
for fn, kwargs in [
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="events", key="hostId", size=64, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="events", key="hostName", size=128, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="events", key="title", size=200, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="events", key="description", size=2000, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="events", key="date", size=32, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="events", key="location", size=256, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="events", key="city", size=64, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="events", key="locality", size=128, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="events", key="imageFileId", size=64, required=False)),
]:
    safe(fn, **kwargs)

# market
for fn, kwargs in [
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="market", key="sellerId", size=64, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="market", key="sellerName", size=128, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="market", key="sellerLocality", size=128, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="market", key="title", size=200, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="market", key="description", size=2000, required=True)),
    (db.create_float_attribute, dict(database_id=DB_ID, collection_id="market", key="price", required=True, min=0, max=10000000)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="market", key="city", size=64, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="market", key="locality", size=128, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="market", key="imageFileId", size=64, required=False)),
]:
    safe(fn, **kwargs)

# likes
for fn, kwargs in [
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="likes", key="postId", size=64, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="likes", key="userId", size=64, required=True)),
]:
    safe(fn, **kwargs)

# rsvps
for fn, kwargs in [
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="rsvps", key="eventId", size=64, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="rsvps", key="userId", size=64, required=True)),
]:
    safe(fn, **kwargs)

print("Waiting for attributes to settle…")
time.sleep(8)

# ----- Indexes -----
print("Creating indexes…")
for db_id, col, key, attrs in [
    (DB_ID, "profiles", "userId_idx", ["userId"]),
    (DB_ID, "posts", "city_idx", ["city"]),
    (DB_ID, "posts", "category_idx", ["category"]),
    (DB_ID, "events", "city_idx", ["city"]),
    (DB_ID, "market", "city_idx", ["city"]),
    (DB_ID, "likes", "post_user_idx", ["postId", "userId"]),
    (DB_ID, "rsvps", "event_user_idx", ["eventId", "userId"]),
]:
    safe(db.create_index, database_id=db_id, collection_id=col, key=key, type="key", attributes=attrs)

# ----- Bucket -----
print("Creating storage bucket…")
try:
    storage.create_bucket(
        bucket_id=BUCKET_ID,
        name="Media",
        permissions=[Permission.create(Role.users()), Permission.read(Role.users())],
        file_security=True,
        enabled=True,
        maximum_file_size=5 * 1024 * 1024,
        allowed_file_extensions=["jpg", "jpeg", "png", "webp"],
        encryption=False,
        antivirus=False,
    )
except AppwriteException as e:
    if "already exists" in str(e) or e.code == 409:
        print(f"  [skip] bucket already exists")
    else:
        raise

print("Bootstrap complete ✓")
