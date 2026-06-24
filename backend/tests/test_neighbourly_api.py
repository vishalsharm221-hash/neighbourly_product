"""Backend API tests for Neighbourly app."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://delhi-neighbours.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

PRIYA = {"email": "priya@neighbourly.in", "password": "password123"}


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def priya_token(session):
    r = session.post(f"{API}/auth/login", json=PRIYA, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()["token"]


def auth(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------- Health ----------
class TestHealth:
    def test_root(self, session):
        r = session.get(f"{API}/", timeout=10)
        assert r.status_code == 200
        assert "Neighbourly" in r.json()["message"]


# ---------- Auth ----------
class TestAuth:
    def test_login_seed_user(self, session):
        r = session.post(f"{API}/auth/login", json=PRIYA, timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert "token" in data
        assert data["user"]["email"] == PRIYA["email"]
        assert data["user"]["city"] == "Gurugram"
        assert data["user"]["locality"] == "DLF Phase 1"

    def test_login_wrong_password(self, session):
        r = session.post(f"{API}/auth/login", json={"email": PRIYA["email"], "password": "wrong"}, timeout=10)
        assert r.status_code == 401

    def test_signup_and_me(self, session):
        email = f"test_{uuid.uuid4().hex[:8]}@neighbourly.in"
        r = session.post(f"{API}/auth/signup", json={"name": "Test User", "email": email, "password": "password123"}, timeout=20)
        assert r.status_code == 200, r.text
        token = r.json()["token"]
        assert r.json()["user"]["city"] is None  # not onboarded yet

        # me
        r = session.get(f"{API}/me", headers=auth(token), timeout=10)
        assert r.status_code == 200
        assert r.json()["email"] == email

        # duplicate signup
        r = session.post(f"{API}/auth/signup", json={"name": "Dup", "email": email, "password": "pw"}, timeout=10)
        assert r.status_code == 400

        # onboard
        r = session.post(f"{API}/me/onboard", json={"city": "Noida", "locality": "Sector 18"}, headers=auth(token), timeout=10)
        assert r.status_code == 200
        assert r.json()["city"] == "Noida"

    def test_me_no_token(self, session):
        r = session.get(f"{API}/me", timeout=10)
        assert r.status_code == 401


# ---------- Localities ----------
class TestLocalities:
    def test_localities(self, session):
        r = session.get(f"{API}/localities", timeout=10)
        assert r.status_code == 200
        data = r.json()
        for city in ["Delhi", "Gurugram", "Noida", "Ghaziabad"]:
            assert city in data
            assert len(data[city]) >= 4
        assert "DLF Phase 1" in data["Gurugram"]
        assert "Indirapuram" in data["Ghaziabad"]


# ---------- Posts ----------
class TestPosts:
    def test_list_posts_filtered_by_city(self, session, priya_token):
        r = session.get(f"{API}/posts", headers=auth(priya_token), timeout=10)
        assert r.status_code == 200
        posts = r.json()
        assert len(posts) >= 1
        for p in posts:
            assert p["city"] == "Gurugram"
            assert "author" in p
            assert "like_count" in p
            assert "liked_by_me" in p
            assert "_id" not in p

    def test_filter_by_category(self, session, priya_token):
        r = session.get(f"{API}/posts?category=safety", headers=auth(priya_token), timeout=10)
        assert r.status_code == 200
        for p in r.json():
            assert p["category"] == "safety"

    def test_create_and_like_post(self, session, priya_token):
        r = session.post(f"{API}/posts", json={"content": "TEST_ post content", "category": "general"},
                         headers=auth(priya_token), timeout=10)
        assert r.status_code == 200, r.text
        post = r.json()
        pid = post["id"]
        assert post["city"] == "Gurugram"
        assert post["like_count"] == 0

        # like (toggle on)
        r = session.post(f"{API}/posts/{pid}/like", headers=auth(priya_token), timeout=10)
        assert r.status_code == 200
        assert r.json()["liked"] is True
        assert r.json()["like_count"] == 1

        # like (toggle off)
        r = session.post(f"{API}/posts/{pid}/like", headers=auth(priya_token), timeout=10)
        assert r.json()["liked"] is False
        assert r.json()["like_count"] == 0

        # verify via list
        r = session.get(f"{API}/posts", headers=auth(priya_token), timeout=10)
        ids = [p["id"] for p in r.json()]
        assert pid in ids

    def test_like_non_existent(self, session, priya_token):
        r = session.post(f"{API}/posts/nonexistent-id/like", headers=auth(priya_token), timeout=10)
        assert r.status_code == 404


# ---------- Events ----------
class TestEvents:
    def test_list_events(self, session, priya_token):
        r = session.get(f"{API}/events", headers=auth(priya_token), timeout=10)
        assert r.status_code == 200
        evs = r.json()
        assert len(evs) >= 1
        for e in evs:
            assert e["city"] == "Gurugram"
            assert "rsvp_count" in e
            assert "rsvped" in e

    def test_create_and_rsvp(self, session, priya_token):
        r = session.post(f"{API}/events", json={
            "title": "TEST_ event", "description": "test", "date": "2026-12-01", "location": "Test"
        }, headers=auth(priya_token), timeout=10)
        assert r.status_code == 200
        eid = r.json()["id"]

        r = session.post(f"{API}/events/{eid}/rsvp", headers=auth(priya_token), timeout=10)
        assert r.status_code == 200
        assert r.json()["rsvped"] is True
        assert r.json()["rsvp_count"] == 1

        r = session.post(f"{API}/events/{eid}/rsvp", headers=auth(priya_token), timeout=10)
        assert r.json()["rsvped"] is False


# ---------- Marketplace ----------
class TestMarketplace:
    def test_list_market(self, session, priya_token):
        r = session.get(f"{API}/marketplace", headers=auth(priya_token), timeout=10)
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 1
        for m in items:
            assert m["city"] == "Gurugram"
            assert "seller" in m
            assert "price" in m

    def test_create_market(self, session, priya_token):
        r = session.post(f"{API}/marketplace", json={
            "title": "TEST_ item", "price": 99.0, "description": "test desc"
        }, headers=auth(priya_token), timeout=10)
        assert r.status_code == 200
        assert r.json()["title"] == "TEST_ item"
        assert r.json()["price"] == 99.0


# ---------- AI Translate ----------
class TestAITranslate:
    def test_translate_to_hindi(self, session, priya_token):
        r = session.post(f"{API}/ai/translate",
                         json={"text": "Hello neighbours, how are you?", "target": "hindi"},
                         headers=auth(priya_token), timeout=60)
        assert r.status_code == 200, r.text
        translation = r.json()["translation"]
        assert isinstance(translation, str)
        assert len(translation) > 0
        # Should contain Devanagari characters
        has_devanagari = any("\u0900" <= ch <= "\u097f" for ch in translation)
        assert has_devanagari, f"Expected Hindi (Devanagari), got: {translation}"

    def test_translate_to_english(self, session, priya_token):
        r = session.post(f"{API}/ai/translate",
                         json={"text": "नमस्ते पड़ोसी", "target": "english"},
                         headers=auth(priya_token), timeout=60)
        assert r.status_code == 200, r.text
        translation = r.json()["translation"]
        assert isinstance(translation, str)
        assert len(translation) > 0


# ---------- Seed data verification ----------
class TestSeedData:
    def test_seed_users_login(self, session):
        for email in ["priya", "rahul", "ananya", "arjun", "meera"]:
            r = session.post(f"{API}/auth/login",
                             json={"email": f"{email}@neighbourly.in", "password": "password123"},
                             timeout=10)
            assert r.status_code == 200, f"Failed login for {email}: {r.text}"

    def test_each_city_has_content(self, session):
        cities = {"Gurugram": "priya", "Noida": "ananya", "Delhi": "arjun", "Ghaziabad": "meera"}
        for city, who in cities.items():
            r = session.post(f"{API}/auth/login",
                             json={"email": f"{who}@neighbourly.in", "password": "password123"},
                             timeout=10)
            token = r.json()["token"]
            posts = session.get(f"{API}/posts", headers=auth(token), timeout=10).json()
            assert len(posts) >= 1, f"No posts for {city}"
            for p in posts:
                assert p["city"] == city
