"""Migration v4 — adds Nextdoor-equivalent collections, attributes, and indexes.
Idempotent — safe to re-run."""
import os
import time

from appwrite.client import Client
from appwrite.services.databases import Databases
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
    "chats": "Chats",
    "messages": "Messages",
    "comments": "Comments",
    "groups": "Neighborhood Groups",
    "group_members": "Group Members",
    "group_posts": "Group Posts",
    "businesses": "Businesses",
    "reviews": "Reviews",
    "recommendations": "Recommendations",
    "listings": "Listings",
    "saved_items": "Saved Items",
    "reports": "Reports",
    "notifications": "Notifications",
    "polls": "Polls",
    "poll_votes": "Poll Votes",
    "news": "News",
    "safety_alerts": "Safety Alerts",
    "services": "Services",
}

client = Client().set_endpoint(ENDPOINT).set_project(PROJECT_ID).set_key(API_KEY)
db = Databases(client)


def safe(fn, **kw):
    try:
        return fn(**kw)
    except AppwriteException as e:
        if "already exists" in str(e) or e.code == 409:
            print(f"  [skip] {kw.get('key', kw.get('collection_id', ''))}")
        else:
            print(f"  [err] {fn.__name__}: {e}")


collection_perms = [
    Permission.create(Role.users()),
    Permission.read(Role.users()),
]

# ----- Collections -----
print("Creating / verifying collections…")
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

attribute_tasks = [
    # groups
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="groups", key="name", size=128, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="groups", key="description", size=2000, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="groups", key="city", size=64, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="groups", key="locality", size=128, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="groups", key="college", size=128, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="groups", key="creatorId", size=64, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="groups", key="creatorName", size=128, required=False)),
    (db.create_integer_attribute, dict(database_id=DB_ID, collection_id="groups", key="memberCount", required=False, default=0)),
    (db.create_boolean_attribute, dict(database_id=DB_ID, collection_id="groups", key="isPublic", required=False, default=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="groups", key="imageFileId", size=64, required=False)),
    # group_members
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="group_members", key="groupId", size=64, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="group_members", key="userId", size=64, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="group_members", key="joinedAt", size=32, required=True)),
    # group_posts
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="group_posts", key="groupId", size=64, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="group_posts", key="authorId", size=64, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="group_posts", key="authorName", size=128, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="group_posts", key="content", size=5000, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="group_posts", key="imageFileId", size=64, required=False)),
    (db.create_integer_attribute, dict(database_id=DB_ID, collection_id="group_posts", key="likeCount", required=False, default=0)),
    (db.create_integer_attribute, dict(database_id=DB_ID, collection_id="group_posts", key="commentCount", required=False, default=0)),
    # businesses
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="businesses", key="ownerId", size=64, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="businesses", key="name", size=128, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="businesses", key="category", size=64, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="businesses", key="description", size=2000, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="businesses", key="address", size=256, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="businesses", key="city", size=64, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="businesses", key="locality", size=128, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="businesses", key="phone", size=32, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="businesses", key="email", size=256, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="businesses", key="website", size=256, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="businesses", key="imageFileId", size=64, required=False)),
    (db.create_boolean_attribute, dict(database_id=DB_ID, collection_id="businesses", key="verified", required=False, default=False)),
    (db.create_float_attribute, dict(database_id=DB_ID, collection_id="businesses", key="rating", required=False, default=0.0)),
    (db.create_integer_attribute, dict(database_id=DB_ID, collection_id="businesses", key="reviewCount", required=False, default=0)),
    # reviews
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="reviews", key="businessId", size=64, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="reviews", key="userId", size=64, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="reviews", key="userName", size=128, required=True)),
    (db.create_integer_attribute, dict(database_id=DB_ID, collection_id="reviews", key="rating", required=True, min=1, max=5)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="reviews", key="comment", size=1000, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="reviews", key="city", size=64, required=True)),
    # recommendations
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="recommendations", key="authorId", size=64, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="recommendations", key="authorName", size=128, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="recommendations", key="category", size=64, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="recommendations", key="title", size=200, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="recommendations", key="content", size=2000, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="recommendations", key="city", size=64, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="recommendations", key="locality", size=128, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="recommendations", key="imageFileId", size=64, required=False)),
    (db.create_integer_attribute, dict(database_id=DB_ID, collection_id="recommendations", key="likeCount", required=False, default=0)),
    (db.create_integer_attribute, dict(database_id=DB_ID, collection_id="recommendations", key="commentCount", required=False, default=0)),
    # listings
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="listings", key="hostId", size=64, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="listings", key="hostName", size=128, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="listings", key="type", size=32, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="listings", key="title", size=200, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="listings", key="description", size=2000, required=False)),
    (db.create_float_attribute, dict(database_id=DB_ID, collection_id="listings", key="price", required=True, min=0)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="listings", key="address", size=256, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="listings", key="city", size=64, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="listings", key="locality", size=128, required=False)),
    (db.create_integer_attribute, dict(database_id=DB_ID, collection_id="listings", key="bedrooms", required=False)),
    (db.create_integer_attribute, dict(database_id=DB_ID, collection_id="listings", key="bathrooms", required=False)),
    (db.create_integer_attribute, dict(database_id=DB_ID, collection_id="listings", key="area_sqft", required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="listings", key="imageFileId", size=64, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="listings", key="contactPhone", size=32, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="listings", key="contactEmail", size=256, required=False)),
    # saved_items
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="saved_items", key="userId", size=64, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="saved_items", key="itemType", size=32, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="saved_items", key="itemId", size=64, required=True)),
    # reports
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="reports", key="reporterId", size=64, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="reports", key="reporterName", size=128, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="reports", key="targetType", size=32, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="reports", key="targetId", size=64, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="reports", key="reason", size=64, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="reports", key="details", size=1000, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="reports", key="status", size=32, required=False, default="pending")),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="reports", key="resolvedBy", size=64, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="reports", key="resolvedAt", size=32, required=False)),
    # notifications
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="notifications", key="userId", size=64, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="notifications", key="type", size=32, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="notifications", key="title", size=128, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="notifications", key="body", size=500, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="notifications", key="data", size=2000, required=False)),
    (db.create_boolean_attribute, dict(database_id=DB_ID, collection_id="notifications", key="read", required=False, default=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="notifications", key="createdAt", size=32, required=True)),
    # polls
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="polls", key="creatorId", size=64, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="polls", key="creatorName", size=128, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="polls", key="question", size=500, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="polls", key="options", size=2000, required=True, array=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="polls", key="city", size=64, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="polls", key="locality", size=128, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="polls", key="groupId", size=64, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="polls", key="expiresAt", size=32, required=False)),
    (db.create_integer_attribute, dict(database_id=DB_ID, collection_id="polls", key="totalVotes", required=False, default=0)),
    # poll_votes
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="poll_votes", key="pollId", size=64, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="poll_votes", key="userId", size=64, required=True)),
    (db.create_integer_attribute, dict(database_id=DB_ID, collection_id="poll_votes", key="optionIndex", required=True)),
    # news
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="news", key="title", size=256, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="news", key="summary", size=1000, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="news", key="content", size=5000, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="news", key="source", size=128, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="news", key="sourceUrl", size=500, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="news", key="imageUrl", size=500, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="news", key="city", size=64, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="news", key="category", size=64, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="news", key="publishedAt", size=32, required=True)),
    # safety_alerts
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="safety_alerts", key="title", size=256, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="safety_alerts", key="description", size=2000, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="safety_alerts", key="alertType", size=32, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="safety_alerts", key="severity", size=16, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="safety_alerts", key="city", size=64, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="safety_alerts", key="locality", size=128, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="safety_alerts", key="source", size=128, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="safety_alerts", key="expiresAt", size=32, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="safety_alerts", key="imageUrl", size=500, required=False)),
    # services
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="services", key="providerId", size=64, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="services", key="providerName", size=128, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="services", key="serviceType", size=64, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="services", key="description", size=2000, required=False)),
    (db.create_float_attribute, dict(database_id=DB_ID, collection_id="services", key="hourlyRate", required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="services", key="city", size=64, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="services", key="locality", size=128, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="services", key="phone", size=32, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="services", key="email", size=256, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="services", key="imageFileId", size=64, required=False)),
    (db.create_float_attribute, dict(database_id=DB_ID, collection_id="services", key="rating", required=False, default=0.0)),
    (db.create_integer_attribute, dict(database_id=DB_ID, collection_id="services", key="reviewCount", required=False, default=0)),
    (db.create_boolean_attribute, dict(database_id=DB_ID, collection_id="services", key="verified", required=False, default=False)),
    # extend existing: profiles
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="profiles", key="gender", size=24, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="profiles", key="dob", size=24, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="profiles", key="handle", size=32, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="profiles", key="bio", size=500, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="profiles", key="avatarFileId", size=64, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="profiles", key="userType", size=16, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="profiles", key="college", size=128, required=False)),
    (db.create_integer_attribute, dict(database_id=DB_ID, collection_id="profiles", key="followerCount", required=False, default=0)),
    (db.create_integer_attribute, dict(database_id=DB_ID, collection_id="profiles", key="followingCount", required=False, default=0)),
    (db.create_integer_attribute, dict(database_id=DB_ID, collection_id="profiles", key="postCount", required=False, default=0)),
    # extend existing: posts
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="posts", key="authorAvatar", size=64, required=False)),
    (db.create_boolean_attribute, dict(database_id=DB_ID, collection_id="posts", key="authorVerified", required=False, default=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="posts", key="audience", size=16, required=False)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="posts", key="college", size=128, required=False)),
    (db.create_integer_attribute, dict(database_id=DB_ID, collection_id="posts", key="commentCount", required=False, default=0)),
    # extend existing: events
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="events", key="imageFileId", size=64, required=False)),
    (db.create_integer_attribute, dict(database_id=DB_ID, collection_id="events", key="attendeeCount", required=False, default=0)),
    # extend existing: market
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="market", key="imageFileId", size=64, required=False)),
    # comments
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="comments", key="postId", size=64, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="comments", key="authorId", size=64, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="comments", key="authorName", size=128, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="comments", key="content", size=2000, required=True)),
    # chats
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="chats", key="participantIds", size=64, required=True, array=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="chats", key="updatedAt", size=32, required=True)),
    # messages
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="messages", key="chatId", size=64, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="messages", key="senderId", size=64, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="messages", key="receiverId", size=64, required=True)),
    (db.create_string_attribute, dict(database_id=DB_ID, collection_id="messages", key="content", size=4000, required=True)),
]

for fn, kw in attribute_tasks:
    safe(fn, **kw)

print("Waiting for attributes to settle…")
time.sleep(7)

# ----- Indexes -----
print("Creating indexes…")
for db_id, col, key, idx_type, attrs in [
    (DB_ID, "groups", "city_idx", "key", ["city"]),
    (DB_ID, "group_members", "group_user_idx", "key", ["groupId", "userId"]),
    (DB_ID, "group_members", "user_idx", "key", ["userId"]),
    (DB_ID, "group_posts", "group_idx", "key", ["groupId"]),
    (DB_ID, "businesses", "city_idx", "key", ["city"]),
    (DB_ID, "businesses", "category_idx", "key", ["category"]),
    (DB_ID, "reviews", "business_idx", "key", ["businessId"]),
    (DB_ID, "reviews", "user_idx", "key", ["userId"]),
    (DB_ID, "recommendations", "city_idx", "key", ["city"]),
    (DB_ID, "recommendations", "category_idx", "key", ["category"]),
    (DB_ID, "listings", "city_idx", "key", ["city"]),
    (DB_ID, "listings", "type_idx", "key", ["type"]),
    (DB_ID, "saved_items", "user_idx", "key", ["userId"]),
    (DB_ID, "saved_items", "item_idx", "key", ["userId", "itemType", "itemId"]),
    (DB_ID, "reports", "status_idx", "key", ["status"]),
    (DB_ID, "notifications", "user_idx", "key", ["userId"]),
    (DB_ID, "polls", "city_idx", "key", ["city"]),
    (DB_ID, "polls", "group_idx", "key", ["groupId"]),
    (DB_ID, "poll_votes", "poll_user_idx", "key", ["pollId", "userId"]),
    (DB_ID, "news", "city_idx", "key", ["city"]),
    (DB_ID, "safety_alerts", "city_idx", "key", ["city"]),
    (DB_ID, "services", "city_idx", "key", ["city"]),
    (DB_ID, "services", "type_idx", "key", ["serviceType"]),
    (DB_ID, "profiles", "handle_idx", "key", ["handle"]),
    (DB_ID, "posts", "author_idx", "key", ["authorId"]),
    (DB_ID, "posts", "college_idx", "key", ["college"]),
    (DB_ID, "events", "date_idx", "key", ["date"]),
    (DB_ID, "market", "seller_idx", "key", ["sellerId"]),
    (DB_ID, "comments", "post_idx", "key", ["postId"]),
    (DB_ID, "chats", "participant_idx", "key", ["participantIds"]),
    (DB_ID, "messages", "chat_idx", "key", ["chatId"]),
]:
    safe(db.create_index, database_id=db_id, collection_id=col, key=key, type=idx_type, attributes=attrs)

print("Migration v4 complete ✓")
