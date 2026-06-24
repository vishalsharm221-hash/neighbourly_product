"""Idempotent migration v2 — extends profiles + adds follows collection."""
import os, time
from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.permission import Permission
from appwrite.role import Role
from appwrite.exception import AppwriteException

ENDPOINT = os.environ["APPWRITE_ENDPOINT"]
PROJECT_ID = os.environ["APPWRITE_PROJECT_ID"]
API_KEY = os.environ["APPWRITE_API_KEY"]
DB_ID = "neighbourly"

client = Client().set_endpoint(ENDPOINT).set_project(PROJECT_ID).set_key(API_KEY)
db = Databases(client)


def safe(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except AppwriteException as e:
        msg = str(e)
        if "already exists" in msg or e.code == 409:
            print(f"  [skip] {kwargs.get('key', '')}: exists")
            return None
        print(f"  [err] {fn.__name__}: {msg}")
        return None


# Extend profiles
print("Extending profiles…")
extras = [
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="profiles", key="gender", size=24, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="profiles", key="dob", size=24, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="profiles", key="bio", size=500, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="profiles", key="avatarFileId", size=64, required=False)),
    (db.create_integer_attribute, dict(database_id=DB_ID, collection_id="profiles", key="followerCount", required=False, default=0)),
    (db.create_integer_attribute, dict(database_id=DB_ID, collection_id="profiles", key="followingCount", required=False, default=0)),
    (db.create_integer_attribute, dict(database_id=DB_ID, collection_id="profiles", key="postCount", required=False, default=0)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="profiles", key="handle", size=32, required=False)),
]
for fn, kw in extras:
    safe(fn, **kw)

# Create follows collection
print("Creating follows collection…")
safe(db.create_collection,
     database_id=DB_ID,
     collection_id="follows",
     name="Follows",
     permissions=[Permission.create(Role.users()), Permission.read(Role.users())],
     document_security=True,
     enabled=True)

for fn, kw in [
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="follows", key="followerId", size=64, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="follows", key="followedId", size=64, required=True)),
]:
    safe(fn, **kw)

time.sleep(8)
safe(db.create_index, database_id=DB_ID, collection_id="follows", key="pair_idx", type="key", attributes=["followerId", "followedId"])
safe(db.create_index, database_id=DB_ID, collection_id="follows", key="followed_idx", type="key", attributes=["followedId"])
safe(db.create_index, database_id=DB_ID, collection_id="profiles", key="handle_idx", type="key", attributes=["handle"])

print("Migration v2 complete ✓")
