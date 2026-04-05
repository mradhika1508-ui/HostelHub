#!/usr/bin/env python3
"""
HostelHub Backend API Test Suite
Tests all ticket creation endpoints after fixing axios baseURL issue
"""

import requests
import json
import sys
from datetime import datetime, timedelta
from jose import jwt
import os

# Configuration
BACKEND_URL = "https://46fb3a74-d3e4-430e-92a1-57af7e6ca461.preview.emergentagent.com/api"
JWT_SECRET = "your_jwt_secret_key_change_this_in_production_use_long_random_string"
JWT_ALGORITHM = "HS256"

class HostelHubTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.test_token = None
        self.test_user = None
        
    def log(self, message, level="INFO"):
        """Log test messages"""
        print(f"[{level}] {message}")
        
    def create_test_jwt(self, user_data):
        """Create a test JWT token for authentication"""
        payload = {
            "sub": user_data["id"],
            "role": user_data["role"],
            "email": user_data["email"],
            "exp": datetime.utcnow() + timedelta(days=1)
        }
        return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
        
    def test_health_check(self):
        """Test basic API health"""
        self.log("Testing API health check...")
        try:
            response = self.session.get(f"{self.base_url}/")
            if response.status_code == 200:
                data = response.json()
                self.log(f"✅ API Health Check: {data}")
                return True
            else:
                self.log(f"❌ API Health Check failed: {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ API Health Check error: {str(e)}", "ERROR")
            return False
            
    def seed_database(self):
        """Seed the database with test data"""
        self.log("Seeding database with test data...")
        try:
            response = self.session.post(f"{self.base_url}/seed")
            if response.status_code == 200:
                data = response.json()
                self.log(f"✅ Database seeded successfully: {data['counts']}")
                return True
            else:
                self.log(f"❌ Database seeding failed: {response.status_code} - {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Database seeding error: {str(e)}", "ERROR")
            return False
            
    def setup_test_user(self):
        """Setup test user and authentication token"""
        self.log("Setting up test user authentication...")
        
        # Use the seeded student data
        test_user_data = {
            "id": "student1",
            "email": "20BCE1234@vitstudent.ac.in",
            "name": "Priya Sharma",
            "role": "student",
            "reg_number": "20BCE1234",
            "floor_number": "2",
            "room_number": "204"
        }
        
        self.test_user = test_user_data
        self.test_token = self.create_test_jwt(test_user_data)
        self.session.headers.update({"Authorization": f"Bearer {self.test_token}"})
        
        self.log(f"✅ Test user setup complete: {test_user_data['name']} ({test_user_data['email']})")
        return True
        
    def test_maintenance_ticket(self):
        """Test maintenance ticket creation"""
        self.log("Testing maintenance ticket creation...")
        
        payload = {
            "category": "Bathroom",
            "description": "Test maintenance request - shower head leaking water continuously",
            "photo_url": None,
            "room_number": "204",
            "floor_number": "2",
            "urgency": "urgent",
            "scheduled_date": (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d'),
            "time_slot": "10 AM–12 PM"
        }
        
        try:
            response = self.session.post(f"{self.base_url}/maintenance", json=payload)
            if response.status_code in [200, 201]:
                data = response.json()
                if "ticket_number" in data and data["ticket_number"].startswith("MAINT-"):
                    self.log(f"✅ Maintenance ticket created: {data['ticket_number']}")
                    return True
                else:
                    self.log(f"❌ Maintenance ticket missing ticket_number: {data}", "ERROR")
                    return False
            else:
                self.log(f"❌ Maintenance ticket creation failed: {response.status_code} - {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Maintenance ticket creation error: {str(e)}", "ERROR")
            return False
            
    def test_issues_ticket(self):
        """Test other issues ticket creation"""
        self.log("Testing other issues ticket creation...")
        
        payload = {
            "category": "WiFi issue",
            "description": "Test issue report - WiFi connection unstable on floor 2",
            "photo_url": None,
            "urgency": "soon",
            "anonymous": False
        }
        
        try:
            response = self.session.post(f"{self.base_url}/issues", json=payload)
            if response.status_code in [200, 201]:
                data = response.json()
                if "ticket_number" in data and data["ticket_number"].startswith("ISSUE-"):
                    self.log(f"✅ Issues ticket created: {data['ticket_number']}")
                    return True
                else:
                    self.log(f"❌ Issues ticket missing ticket_number: {data}", "ERROR")
                    return False
            else:
                self.log(f"❌ Issues ticket creation failed: {response.status_code} - {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Issues ticket creation error: {str(e)}", "ERROR")
            return False
            
    def test_mess_complaint(self):
        """Test mess complaint creation"""
        self.log("Testing mess complaint creation...")
        
        payload = {
            "category": "Food quality",
            "description": "Test mess complaint - food was cold during lunch service",
            "date": datetime.now().strftime('%Y-%m-%d'),
            "meal_type": "lunch",
            "photo_url": None
        }
        
        try:
            response = self.session.post(f"{self.base_url}/mess/complaint", json=payload)
            if response.status_code in [200, 201]:
                data = response.json()
                if "ticket_number" in data and data["ticket_number"].startswith("MESS-"):
                    self.log(f"✅ Mess complaint created: {data['ticket_number']}")
                    return True
                else:
                    self.log(f"❌ Mess complaint missing ticket_number: {data}", "ERROR")
                    return False
            else:
                self.log(f"❌ Mess complaint creation failed: {response.status_code} - {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Mess complaint creation error: {str(e)}", "ERROR")
            return False
            
    def test_visitor_request(self):
        """Test visitor request creation"""
        self.log("Testing visitor request creation...")
        
        payload = {
            "visitor_name": "Test Visitor",
            "visitor_phone": "9876543210",
            "relationship": "Parent",
            "visit_date": (datetime.now() + timedelta(days=2)).strftime('%Y-%m-%d'),
            "visit_time": "14:00",
            "purpose": "Test visitor request for API testing"
        }
        
        try:
            response = self.session.post(f"{self.base_url}/visitors", json=payload)
            if response.status_code in [200, 201]:
                data = response.json()
                if "ticket_number" in data and data["ticket_number"].startswith("VISIT-"):
                    self.log(f"✅ Visitor request created: {data['ticket_number']}")
                    return True
                else:
                    self.log(f"❌ Visitor request missing ticket_number: {data}", "ERROR")
                    return False
            else:
                self.log(f"❌ Visitor request creation failed: {response.status_code} - {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Visitor request creation error: {str(e)}", "ERROR")
            return False
            
    def test_stray_report(self):
        """Test stray animal report creation"""
        self.log("Testing stray animal report creation...")
        
        payload = {
            "issue_type": "Injured",
            "description": "Test stray report - injured dog near hostel gate",
            "photo_url": "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&q=80",
            "location_meta": "12.96929, 79.15529"
        }
        
        try:
            response = self.session.post(f"{self.base_url}/stray", json=payload)
            if response.status_code in [200, 201]:
                data = response.json()
                if "ticket_number" in data and data["ticket_number"].startswith("STRAY-"):
                    self.log(f"✅ Stray report created: {data['ticket_number']}")
                    return True
                else:
                    self.log(f"❌ Stray report missing ticket_number: {data}", "ERROR")
                    return False
            else:
                self.log(f"❌ Stray report creation failed: {response.status_code} - {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Stray report creation error: {str(e)}", "ERROR")
            return False
            
    def run_all_tests(self):
        """Run all backend tests"""
        self.log("=" * 60)
        self.log("HOSTELHUB BACKEND API TEST SUITE")
        self.log("=" * 60)
        
        results = {}
        
        # Test 1: API Health Check
        results['health_check'] = self.test_health_check()
        
        # Test 2: Database Seeding
        results['database_seed'] = self.seed_database()
        
        # Test 3: Setup Authentication
        results['auth_setup'] = self.setup_test_user()
        
        if not all([results['health_check'], results['database_seed'], results['auth_setup']]):
            self.log("❌ Basic setup failed, skipping ticket tests", "ERROR")
            return results
            
        # Test 4: Ticket Creation Endpoints
        results['maintenance_ticket'] = self.test_maintenance_ticket()
        results['issues_ticket'] = self.test_issues_ticket()
        results['mess_complaint'] = self.test_mess_complaint()
        results['visitor_request'] = self.test_visitor_request()
        results['stray_report'] = self.test_stray_report()
        
        # Summary
        self.log("=" * 60)
        self.log("TEST RESULTS SUMMARY")
        self.log("=" * 60)
        
        passed = sum(1 for result in results.values() if result)
        total = len(results)
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            self.log(f"{test_name.replace('_', ' ').title()}: {status}")
            
        self.log(f"\nOverall: {passed}/{total} tests passed")
        
        if passed == total:
            self.log("🎉 ALL TESTS PASSED! Ticket creation is working correctly.", "SUCCESS")
        else:
            self.log(f"⚠️  {total - passed} tests failed. Check the errors above.", "WARNING")
            
        return results

def main():
    """Main test execution"""
    tester = HostelHubTester()
    results = tester.run_all_tests()
    
    # Exit with appropriate code
    if all(results.values()):
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
    
