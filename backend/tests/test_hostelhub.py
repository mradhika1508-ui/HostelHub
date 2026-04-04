"""HostelHub backend API tests"""
import pytest
import requests
import os
import jwt as pyjwt

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
JWT_SECRET = 'hostelhub_super_secret_jwt_key_2026_vit_hostel_mgmt'

def make_student_token():
    return pyjwt.encode(
        {'sub': 'student1', 'role': 'student', 'email': '20BCE1234@vitstudent.ac.in', 'exp': 9999999999},
        JWT_SECRET, algorithm='HS256'
    )

def make_warden_token():
    return pyjwt.encode(
        {'sub': 'warden1', 'role': 'warden', 'email': 'anita.kapoor@vit.ac.in', 'exp': 9999999999},
        JWT_SECRET, algorithm='HS256'
    )

# Health check
def test_health():
    r = requests.get(f"{BASE_URL}/api/")
    assert r.status_code == 200
    print("Health check passed")

# Seed data
def test_seed():
    r = requests.post(f"{BASE_URL}/api/seed")
    assert r.status_code == 200
    data = r.json()
    print(f"Seed response: {data}")
    assert 'users' in str(data).lower() or 'message' in data or 'status' in data

# Domain restriction: non-VIT token
def test_domain_restriction():
    r = requests.post(f"{BASE_URL}/api/auth/google", json={"credential": "invalid_token"})
    # Should return 400 or 403 (invalid token, not just wrong domain, but should not return 200)
    assert r.status_code in [400, 401, 403, 422]
    print(f"Domain restriction test: status={r.status_code}")

# Auth-protected endpoints without token -> 401
def test_maintenance_no_auth():
    r = requests.get(f"{BASE_URL}/api/maintenance")
    assert r.status_code == 401

def test_mess_menu_no_auth():
    r = requests.get(f"{BASE_URL}/api/mess/menu")
    assert r.status_code == 401

def test_lost_found_no_auth():
    r = requests.get(f"{BASE_URL}/api/lost-found")
    assert r.status_code == 401

def test_issues_no_auth():
    r = requests.get(f"{BASE_URL}/api/issues")
    assert r.status_code == 401

# Authenticated endpoints with student JWT
def test_health_score_with_student_jwt():
    token = make_student_token()
    r = requests.get(f"{BASE_URL}/api/health-score", headers={"Authorization": f"Bearer {token}"})
    print(f"Health score: {r.status_code} {r.text[:200]}")
    assert r.status_code == 200

def test_mess_stats():
    token = make_student_token()
    r = requests.get(f"{BASE_URL}/api/mess/stats", headers={"Authorization": f"Bearer {token}"})
    print(f"Mess stats: {r.status_code} {r.text[:200]}")
    assert r.status_code == 200
    data = r.json()
    assert 'health_score' in data

def test_maintenance_with_student_jwt():
    token = make_student_token()
    r = requests.get(f"{BASE_URL}/api/maintenance", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200

def test_lost_found_with_student_jwt():
    token = make_student_token()
    r = requests.get(f"{BASE_URL}/api/lost-found", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
