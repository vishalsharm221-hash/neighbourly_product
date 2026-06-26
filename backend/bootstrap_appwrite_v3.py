"""Migration v3 — adds userType + college to profiles, audience + college to posts.
Adds 'newhere' as a valid category by virtue of schema (category is string)."""
import os, time
from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.exception import AppwriteException

ENDPOINT = os.environ["APPWRITE_ENDPOINT"]
PROJECT_ID = os.environ["APPWRITE_PROJECT_ID"]
API_KEY = os.environ["APPWRITE_API_KEY"]
DB_ID = "localy"

client = Client().set_endpoint(ENDPOINT).set_project(PROJECT_ID).set_key(API_KEY)
db = Databases(client)


def safe(fn, **kw):
    try:
        return fn(**kw)
    except AppwriteException as e:
        if "already exists" in str(e) or e.code == 409:
            print(f"  [skip] {kw.get('key', '')}")
        else:
            print(f"  [err] {fn.__name__}: {e}")


print("Extending profiles + posts…")
for fn, kw in [
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="profiles", key="userType", size=16, required=False)),  # resident | student
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="profiles", key="college", size=128, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="posts", key="audience", size=16, required=False)),  # all | college | locality
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="posts", key="college", size=128, required=False)),
]:
    safe(fn, **kw)

time.sleep(6)
safe(db.create_index, database_id=DB_ID, collection_id="posts", key="college_idx", type="key", attributes=["college"])
print("v3 done ✓")
