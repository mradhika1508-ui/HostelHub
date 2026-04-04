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


# ─── Visitor Management Tests ─────────────────────────────────────────────────

def test_visitors_no_auth():
    r = requests.get(f"{BASE_URL}/api/visitors")
    assert r.status_code == 401

def test_get_visitors_seeded():
    """GET /api/visitors should return 3 seeded visitor records"""
    # Seed first
    requests.post(f"{BASE_URL}/api/seed")
    token = make_warden_token()
    r = requests.get(f"{BASE_URL}/api/visitors", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 3, f"Expected >= 3 visitors, got {len(data)}"
    print(f"Visitor records: {len(data)}")

def test_create_visitor_request():
    """POST /api/visitors creates a new visitor request with status=pending"""
    token = make_student_token()
    payload = {
        "visitor_name": "TEST_VisitorMom",
        "visitor_phone": "9876543210",
        "relationship": "Parent",
        "visit_date": "2026-03-15",
        "visit_time": "14:00",
        "purpose": "Family visit"
    }
    r = requests.post(f"{BASE_URL}/api/visitors", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "pending"
    assert data["visitor_name"] == "TEST_VisitorMom"
    assert "id" in data
    assert "ticket_number" in data
    print(f"Created visitor request: {data['id']} status={data['status']}")
    return data["id"]

def test_update_visitor_status_approve():
    """PATCH /api/visitors/{id}/status updates status to approved"""
    # Create a visitor first
    student_token = make_student_token()
    payload = {
        "visitor_name": "TEST_ApproveVisitor",
        "visitor_phone": "9999999999",
        "relationship": "Sibling",
        "visit_date": "2026-03-20",
        "visit_time": "10:00",
        "purpose": "Document pickup"
    }
    create_r = requests.post(f"{BASE_URL}/api/visitors", json=payload, headers={"Authorization": f"Bearer {student_token}"})
    assert create_r.status_code == 200
    visit_id = create_r.json()["id"]

    # Approve it as warden
    warden_token = make_warden_token()
    patch_r = requests.patch(
        f"{BASE_URL}/api/visitors/{visit_id}/status",
        json={"status": "approved", "warden_notes": "Approved for 2PM visit"},
        headers={"Authorization": f"Bearer {warden_token}"}
    )
    assert patch_r.status_code == 200
    print(f"Approved visitor request {visit_id}")

def test_update_visitor_status_reject():
    """PATCH /api/visitors/{id}/status updates status to rejected"""
    student_token = make_student_token()
    payload = {
        "visitor_name": "TEST_RejectVisitor",
        "visitor_phone": "8888888888",
        "relationship": "Friend",
        "visit_date": "2026-03-21",
        "visit_time": "11:00",
        "purpose": "General visit"
    }
    create_r = requests.post(f"{BASE_URL}/api/visitors", json=payload, headers={"Authorization": f"Bearer {student_token}"})
    assert create_r.status_code == 200
    visit_id = create_r.json()["id"]

    warden_token = make_warden_token()
    patch_r = requests.patch(
        f"{BASE_URL}/api/visitors/{visit_id}/status",
        json={"status": "rejected", "warden_notes": "Not allowed during exams"},
        headers={"Authorization": f"Bearer {warden_token}"}
    )
    assert patch_r.status_code == 200
    print(f"Rejected visitor request {visit_id}")

def test_update_visitor_status_not_warden():
    """Student cannot update visitor status"""
    student_token = make_student_token()
    payload = {
        "visitor_name": "TEST_StudentPatch",
        "visitor_phone": "7777777777",
        "relationship": "Other",
        "visit_date": "2026-03-22",
        "visit_time": "12:00",
        "purpose": "Test"
    }
    create_r = requests.post(f"{BASE_URL}/api/visitors", json=payload, headers={"Authorization": f"Bearer {student_token}"})
    visit_id = create_r.json()["id"]

    patch_r = requests.patch(
        f"{BASE_URL}/api/visitors/{visit_id}/status",
        json={"status": "approved", "warden_notes": ""},
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert patch_r.status_code in [401, 403]
    print(f"Student patch blocked: {patch_r.status_code}")

def test_get_visitors_student_filtered():
    """Student only sees their own visitor requests"""
    token = make_student_token()
    r = requests.get(f"{BASE_URL}/api/visitors", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    data = r.json()
    for v in data:
        assert v.get("student_id") == "student1", f"Got visitor for another student: {v.get('student_id')}"
    print(f"Student sees {len(data)} visitor requests (all own)")
