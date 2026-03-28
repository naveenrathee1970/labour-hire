#!/usr/bin/env python3
"""
Comprehensive backend API testing for Labour Hire Hub platform
Tests all endpoints including auth, jobs, applications, tools, wallet, admin functions,
and NEW FEATURES: Stripe payments, document upload, notifications/SMS, reviews system
"""

import requests
import sys
import json
import io
from datetime import datetime
from typing import Dict, Any, Optional

class LabourHireAPITester:
    def __init__(self, base_url: str = "https://labor-hire-hub.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        self.employer_token = None
        self.labour_token = None
        self.vendor_token = None
        self.admin_id = None
        self.employer_id = None
        self.labour_id = None
        self.vendor_id = None
        self.job_id = None
        self.application_id = None
        self.tool_id = None
        self.document_id = None
        self.review_id = None
        self.notification_id = None
        
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log(self, message: str, level: str = "INFO"):
        """Log test messages with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Optional[Dict] = None, headers: Optional[Dict] = None, 
                 auth_token: Optional[str] = None, files: Optional[Dict] = None) -> tuple[bool, Dict]:
        """Run a single API test"""
        url = f"{self.api_url}{endpoint}"
        test_headers = {}
        
        # Only set Content-Type for JSON requests
        if not files:
            test_headers['Content-Type'] = 'application/json'
        
        if headers:
            test_headers.update(headers)
        if auth_token:
            test_headers['Authorization'] = f'Bearer {auth_token}'

        self.tests_run += 1
        self.log(f"🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                if files:
                    # For file uploads, don't set Content-Type header
                    if 'Content-Type' in test_headers:
                        del test_headers['Content-Type']
                    response = requests.post(url, files=files, data=data, headers=test_headers, timeout=30)
                else:
                    response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}")
                self.log(f"   Response: {response.text[:200]}")
                self.failed_tests.append(f"{name}: Expected {expected_status}, got {response.status_code}")
                try:
                    return False, response.json()
                except:
                    return False, {"error": response.text}

        except Exception as e:
            self.log(f"❌ {name} - Error: {str(e)}", "ERROR")
            self.failed_tests.append(f"{name}: {str(e)}")
            return False, {"error": str(e)}

    def test_root_endpoint(self):
        """Test API root endpoint"""
        success, response = self.run_test("API Root", "GET", "/", 200)
        return success

    def test_admin_login(self):
        """Test admin login with credentials from test_credentials.md"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "/auth/login",
            200,
            data={"email": "admin@example.com", "password": "admin123"}
        )
        if success and 'token' in response:
            self.admin_token = response['token']
            self.admin_id = response.get('id')
            self.log(f"✅ Admin logged in successfully, ID: {self.admin_id}")
            return True
        return False

    def test_user_registration(self):
        """Test user registration for all roles"""
        timestamp = datetime.now().strftime("%H%M%S")
        
        # Test employer registration
        success, response = self.run_test(
            "Employer Registration",
            "POST",
            "/auth/register",
            200,
            data={
                "email": f"employer_{timestamp}@test.com",
                "password": "testpass123",
                "name": "Test Employer",
                "role": "employer",
                "phone": "+91 9876543210"
            }
        )
        if success and 'token' in response:
            self.employer_token = response['token']
            self.employer_id = response.get('id')
            self.log(f"✅ Employer registered, ID: {self.employer_id}")

        # Test labour registration
        success, response = self.run_test(
            "Labour Registration",
            "POST",
            "/auth/register",
            200,
            data={
                "email": f"labour_{timestamp}@test.com",
                "password": "testpass123",
                "name": "Test Labour",
                "role": "labour",
                "phone": "+91 9876543211"
            }
        )
        if success and 'token' in response:
            self.labour_token = response['token']
            self.labour_id = response.get('id')
            self.log(f"✅ Labour registered, ID: {self.labour_id}")

        # Test vendor registration
        success, response = self.run_test(
            "Vendor Registration",
            "POST",
            "/auth/register",
            200,
            data={
                "email": f"vendor_{timestamp}@test.com",
                "password": "testpass123",
                "name": "Test Vendor",
                "role": "vendor",
                "phone": "+91 9876543212"
            }
        )
        if success and 'token' in response:
            self.vendor_token = response['token']
            self.vendor_id = response.get('id')
            self.log(f"✅ Vendor registered, ID: {self.vendor_id}")

        return self.employer_token and self.labour_token and self.vendor_token

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        # Test /auth/me for each user
        if self.admin_token:
            self.run_test("Admin Auth Me", "GET", "/auth/me", 200, auth_token=self.admin_token)
        
        if self.employer_token:
            self.run_test("Employer Auth Me", "GET", "/auth/me", 200, auth_token=self.employer_token)
        
        if self.labour_token:
            self.run_test("Labour Auth Me", "GET", "/auth/me", 200, auth_token=self.labour_token)

        # Test invalid login
        self.run_test(
            "Invalid Login",
            "POST",
            "/auth/login",
            401,
            data={"email": "invalid@test.com", "password": "wrongpass"}
        )

        # Test logout
        if self.employer_token:
            self.run_test("Logout", "POST", "/auth/logout", 200, auth_token=self.employer_token)

    def test_job_endpoints(self):
        """Test job-related endpoints"""
        if not self.employer_token:
            self.log("❌ No employer token for job tests", "ERROR")
            return False

        # Create a job
        job_data = {
            "title": "Test Construction Job",
            "description": "Building construction work for residential project",
            "project_type": "residential",
            "location": "Mumbai, Maharashtra",
            "labours_needed": 5,
            "duration_days": 30,
            "pay_type": "daily",
            "pay_amount": 800,
            "safety_precautions": "Hard hats and safety boots required",
            "skills_required": ["masonry", "painting"],
            "licence_number": "REG-12345"
        }
        
        success, response = self.run_test(
            "Create Job",
            "POST",
            "/jobs",
            201,
            data=job_data,
            auth_token=self.employer_token
        )
        if success and '_id' in response:
            self.job_id = response['_id']
            self.log(f"✅ Job created with ID: {self.job_id}")

        # List jobs
        self.run_test("List All Jobs", "GET", "/jobs", 200)
        
        # List employer's jobs
        if self.employer_id:
            self.run_test(
                "List Employer Jobs",
                "GET",
                f"/jobs?employer_id={self.employer_id}",
                200
            )

        # Get specific job
        if self.job_id:
            self.run_test("Get Job Details", "GET", f"/jobs/{self.job_id}", 200)

        # Test job status update
        if self.job_id and self.employer_token:
            self.run_test(
                "Update Job Status",
                "PATCH",
                f"/jobs/{self.job_id}/status",
                200,
                data={"status": "closed"},
                auth_token=self.employer_token
            )

        return True

    def test_application_endpoints(self):
        """Test job application endpoints"""
        if not self.labour_token or not self.job_id:
            self.log("❌ Missing labour token or job ID for application tests", "ERROR")
            return False

        # Apply for job
        success, response = self.run_test(
            "Apply for Job",
            "POST",
            "/applications",
            201,
            data={
                "job_id": self.job_id,
                "message": "I have 5 years experience in construction work"
            },
            auth_token=self.labour_token
        )
        if success and '_id' in response:
            self.application_id = response['_id']
            self.log(f"✅ Application created with ID: {self.application_id}")

        # List applications (labour view)
        self.run_test(
            "List Labour Applications",
            "GET",
            "/applications",
            200,
            auth_token=self.labour_token
        )

        # List applications (employer view)
        if self.employer_token:
            self.run_test(
                "List Employer Applications",
                "GET",
                "/applications",
                200,
                auth_token=self.employer_token
            )

        # Accept application
        if self.application_id and self.employer_token:
            self.run_test(
                "Accept Application",
                "PATCH",
                f"/applications/{self.application_id}/status",
                200,
                data={"status": "accepted"},
                auth_token=self.employer_token
            )

        return True

    def test_tool_endpoints(self):
        """Test tool rental endpoints"""
        if not self.vendor_token:
            self.log("❌ No vendor token for tool tests", "ERROR")
            return False

        # Create tool
        tool_data = {
            "name": "Concrete Mixer",
            "description": "Heavy duty concrete mixer for construction projects",
            "category": "heavy_machinery",
            "daily_rate": 500,
            "weekly_rate": 3000,
            "monthly_rate": 10000,
            "available_quantity": 2,
            "vendor_url": "https://example-vendor.com"
        }
        
        success, response = self.run_test(
            "Create Tool",
            "POST",
            "/tools",
            201,
            data=tool_data,
            auth_token=self.vendor_token
        )
        if success and '_id' in response:
            self.tool_id = response['_id']
            self.log(f"✅ Tool created with ID: {self.tool_id}")

        # List all tools
        self.run_test("List All Tools", "GET", "/tools", 200)

        # List vendor's tools
        if self.vendor_id:
            self.run_test(
                "List Vendor Tools",
                "GET",
                f"/tools?vendor_id={self.vendor_id}",
                200
            )

        # Filter tools by category
        self.run_test(
            "Filter Tools by Category",
            "GET",
            "/tools?category=heavy_machinery",
            200
        )

        return True

    def test_wallet_endpoints(self):
        """Test wallet and transaction endpoints"""
        if not self.employer_token:
            self.log("❌ No employer token for wallet tests", "ERROR")
            return False

        # Get wallet
        self.run_test(
            "Get Wallet",
            "GET",
            "/wallet",
            200,
            auth_token=self.employer_token
        )

        # Top up wallet
        self.run_test(
            "Wallet Top-up",
            "POST",
            "/wallet/topup",
            200,
            data={"amount": 5000},
            auth_token=self.employer_token
        )

        # Transfer funds (if we have labour ID)
        if self.labour_id:
            self.run_test(
                "Transfer Funds",
                "POST",
                "/wallet/transfer",
                200,
                data={
                    "to_user_id": self.labour_id,
                    "amount": 800,
                    "description": "Daily wage payment",
                    "job_id": self.job_id
                },
                auth_token=self.employer_token
            )

        # Get transactions
        self.run_test(
            "Get Transactions",
            "GET",
            "/transactions",
            200,
            auth_token=self.employer_token
        )

        return True

    def test_admin_endpoints(self):
        """Test admin-only endpoints"""
        if not self.admin_token:
            self.log("❌ No admin token for admin tests", "ERROR")
            return False

        # Get admin stats
        self.run_test(
            "Admin Stats",
            "GET",
            "/admin/stats",
            200,
            auth_token=self.admin_token
        )

        # List all users
        self.run_test(
            "Admin List Users",
            "GET",
            "/admin/users",
            200,
            auth_token=self.admin_token
        )

        # Filter users by role
        self.run_test(
            "Admin List Employers",
            "GET",
            "/admin/users?role=employer",
            200,
            auth_token=self.admin_token
        )

        # Verify user
        if self.labour_id:
            self.run_test(
                "Verify User",
                "POST",
                "/admin/verify",
                200,
                data={"user_id": self.labour_id, "verified": True},
                auth_token=self.admin_token
            )

        return True

    def test_labour_search(self):
        """Test labour search endpoint"""
        # List all labours
        self.run_test("List All Labours", "GET", "/labours", 200)

        # Search verified labours
        self.run_test(
            "Search Verified Labours",
            "GET",
            "/labours?verified=true",
            200
        )

        # Search by skill
        self.run_test(
            "Search by Skill",
            "GET",
            "/labours?skill=masonry",
            200
        )

    def test_profile_endpoints(self):
        """Test profile management"""
        if not self.labour_token or not self.labour_id:
            self.log("❌ Missing labour token for profile tests", "ERROR")
            return False

        # Update profile
        profile_data = {
            "name": "Updated Labour Name",
            "phone": "+91 9876543299",
            "aadhaar_number": "1234 5678 9012",
            "address": "Mumbai, Maharashtra",
            "skills": ["masonry", "painting", "plumbing"],
            "experience_years": 5,
            "daily_rate": 800,
            "bio": "Experienced construction worker with 5 years in the field"
        }
        
        self.run_test(
            "Update Profile",
            "PUT",
            "/profile",
            200,
            data=profile_data,
            auth_token=self.labour_token
        )

        # Get profile
        self.run_test(
            "Get Profile",
            "GET",
            f"/profile/{self.labour_id}",
            200
        )

        return True

    def test_geocoding_endpoints(self):
        """Test geocoding functionality"""
        # Test geocoding Mumbai
        success, response = self.run_test(
            "Geocode Mumbai",
            "GET",
            "/geocode?address=Mumbai",
            200
        )
        if success:
            self.log(f"✅ Mumbai geocoded to: {response.get('lat')}, {response.get('lng')}")

        # Test geocoding Delhi
        success, response = self.run_test(
            "Geocode Delhi",
            "GET",
            "/geocode?address=Delhi",
            200
        )
        if success:
            self.log(f"✅ Delhi geocoded to: {response.get('lat')}, {response.get('lng')}")

        # Test invalid address
        self.run_test(
            "Geocode Invalid Address",
            "GET",
            "/geocode?address=NonExistentPlace12345",
            404
        )

        return True

    def test_geo_job_creation(self):
        """Test job creation with geo-location features"""
        if not self.employer_token:
            self.log("❌ No employer token for geo job tests", "ERROR")
            return False

        # Create job with explicit coordinates
        geo_job_data = {
            "title": "Geo-tagged Construction Job",
            "description": "Building work with GPS coordinates",
            "project_type": "residential",
            "location": "Mumbai, Maharashtra",
            "latitude": 19.0760,
            "longitude": 72.8777,
            "labours_needed": 3,
            "duration_days": 15,
            "pay_type": "daily",
            "pay_amount": 900,
            "safety_precautions": "GPS tracking required"
        }
        
        success, response = self.run_test(
            "Create Geo-tagged Job",
            "POST",
            "/jobs",
            201,
            data=geo_job_data,
            auth_token=self.employer_token
        )
        if success and '_id' in response:
            geo_job_id = response['_id']
            self.log(f"✅ Geo-tagged job created with ID: {geo_job_id}")

        # Create job with only location text (auto-geocoding)
        auto_geo_job_data = {
            "title": "Auto-geocoded Job",
            "description": "Job that should auto-geocode from location",
            "project_type": "commercial",
            "location": "Pune, Maharashtra",
            "labours_needed": 2,
            "duration_days": 10,
            "pay_type": "daily",
            "pay_amount": 850
        }
        
        success, response = self.run_test(
            "Create Auto-geocoded Job",
            "POST",
            "/jobs",
            201,
            data=auto_geo_job_data,
            auth_token=self.employer_token
        )
        if success and '_id' in response:
            auto_geo_job_id = response['_id']
            self.log(f"✅ Auto-geocoded job created with ID: {auto_geo_job_id}")

        return True

    def test_nearby_jobs_endpoints(self):
        """Test nearby jobs functionality"""
        if not self.labour_token:
            self.log("❌ No labour token for nearby jobs tests", "ERROR")
            return False

        # Test nearby jobs search (Mumbai coordinates)
        mumbai_lat, mumbai_lng = 19.0760, 72.8777
        success, response = self.run_test(
            "Get Nearby Jobs (Mumbai 100km)",
            "GET",
            f"/jobs/nearby?latitude={mumbai_lat}&longitude={mumbai_lng}&radius_km=100",
            200,
            auth_token=self.labour_token
        )
        if success:
            jobs = response.get('jobs', [])
            total = response.get('total', 0)
            self.log(f"✅ Found {total} jobs within 100km of Mumbai")
            if jobs:
                for job in jobs[:2]:  # Log first 2 jobs
                    distance = job.get('distance_km', 'N/A')
                    self.log(f"   - {job.get('title', 'Unknown')} ({distance} km away)")

        # Test nearby jobs with small radius (should exclude far jobs)
        success, response = self.run_test(
            "Get Nearby Jobs (Mumbai 5km)",
            "GET",
            f"/jobs/nearby?latitude={mumbai_lat}&longitude={mumbai_lng}&radius_km=5",
            200,
            auth_token=self.labour_token
        )
        if success:
            small_radius_total = response.get('total', 0)
            self.log(f"✅ Found {small_radius_total} jobs within 5km of Mumbai")

        # Test nearby jobs with large radius (should include more jobs)
        success, response = self.run_test(
            "Get Nearby Jobs (Mumbai 200km)",
            "GET",
            f"/jobs/nearby?latitude={mumbai_lat}&longitude={mumbai_lng}&radius_km=200",
            200,
            auth_token=self.labour_token
        )
        if success:
            large_radius_total = response.get('total', 0)
            self.log(f"✅ Found {large_radius_total} jobs within 200km of Mumbai")

        # Test nearby jobs count endpoint
        success, response = self.run_test(
            "Get Nearby Jobs Count",
            "GET",
            f"/jobs/nearby/count?latitude={mumbai_lat}&longitude={mumbai_lng}&radius_km=100",
            200,
            auth_token=self.labour_token
        )
        if success:
            count = response.get('count', 0)
            self.log(f"✅ Nearby jobs count: {count}")

        # Test with project type filter
        success, response = self.run_test(
            "Get Nearby Jobs (Residential only)",
            "GET",
            f"/jobs/nearby?latitude={mumbai_lat}&longitude={mumbai_lng}&radius_km=100&project_type=residential",
            200,
            auth_token=self.labour_token
        )
        if success:
            filtered_total = response.get('total', 0)
            self.log(f"✅ Found {filtered_total} residential jobs within 100km")

        return True

    def test_geo_profile_updates(self):
        """Test profile updates with geo-location"""
        if not self.labour_token:
            self.log("❌ No labour token for geo profile tests", "ERROR")
            return False

        # Update profile with geo-location and radius preference
        geo_profile_data = {
            "latitude": 19.0760,
            "longitude": 72.8777,
            "preferred_radius_km": 75,
            "address": "Mumbai, Maharashtra"
        }
        
        success, response = self.run_test(
            "Update Profile with Geo-location",
            "PUT",
            "/profile",
            200,
            data=geo_profile_data,
            auth_token=self.labour_token
        )
        
        if success:
            geo_location = response.get('geo_location')
            if geo_location:
                self.log(f"✅ Profile updated with GeoJSON: {geo_location}")
            else:
                self.log("⚠️ Profile updated but no geo_location field found")

        # Verify the profile has geo data
        success, response = self.run_test(
            "Get Profile with Geo-location",
            "GET",
            f"/profile/{self.labour_id}",
            200
        )
        
        if success:
            lat = response.get('latitude')
            lng = response.get('longitude')
            radius = response.get('preferred_radius_km')
            geo_location = response.get('geo_location')
            
            if lat and lng:
                self.log(f"✅ Profile has coordinates: {lat}, {lng}")
            if radius:
                self.log(f"✅ Profile has radius preference: {radius} km")
            if geo_location:
                self.log(f"✅ Profile has GeoJSON: {geo_location.get('type')} at {geo_location.get('coordinates')}")

        return True

    def test_stripe_payment_endpoints(self):
        """Test Stripe payment integration endpoints"""
        if not self.employer_token:
            self.log("❌ No employer token for Stripe payment tests", "ERROR")
            return False

        # Test create checkout session
        success, response = self.run_test(
            "Create Stripe Checkout",
            "POST",
            "/payments/create-checkout",
            200,
            data={
                "amount": 50.0,
                "origin_url": self.base_url
            },
            auth_token=self.employer_token
        )
        
        session_id = None
        if success and 'session_id' in response:
            session_id = response['session_id']
            self.log(f"✅ Stripe checkout session created: {session_id}")

        # Test payment status check (will be pending/unpaid)
        if session_id:
            self.run_test(
                "Check Payment Status",
                "GET",
                f"/payments/status/{session_id}",
                200,
                auth_token=self.employer_token
            )

        return True

    def test_document_upload_endpoints(self):
        """Test document upload and verification endpoints"""
        if not self.labour_token:
            self.log("❌ No labour token for document tests", "ERROR")
            return False

        # Create a test file (simulate a PDF)
        test_file_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000074 00000 n \n0000000120 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n179\n%%EOF"
        test_file = io.BytesIO(test_file_content)
        
        # Test document upload
        success, response = self.run_test(
            "Upload Document",
            "POST",
            "/documents/upload?doc_type=aadhaar",
            200,
            files={'file': ('test_aadhaar.pdf', test_file, 'application/pdf')},
            auth_token=self.labour_token
        )
        
        if success and '_id' in response:
            self.document_id = response['_id']
            self.log(f"✅ Document uploaded with ID: {self.document_id}")

        # Test list documents
        self.run_test(
            "List Documents",
            "GET",
            "/documents",
            200,
            auth_token=self.labour_token
        )

        # Test admin document verification
        if self.document_id and self.admin_token:
            self.run_test(
                "Verify Document (Admin)",
                "POST",
                f"/documents/{self.document_id}/verify",
                200,
                data={"verified": True},
                auth_token=self.admin_token
            )

        return True

    def test_review_endpoints(self):
        """Test mutual review and rating system"""
        if not self.employer_token or not self.labour_id:
            self.log("❌ Missing tokens for review tests", "ERROR")
            return False

        # Create a review
        success, response = self.run_test(
            "Create Review",
            "POST",
            "/reviews",
            200,
            data={
                "reviewed_user_id": self.labour_id,
                "rating": 5,
                "comment": "Excellent work quality and punctuality!",
                "job_id": self.job_id
            },
            auth_token=self.employer_token
        )
        
        if success and '_id' in response:
            self.review_id = response['_id']
            self.log(f"✅ Review created with ID: {self.review_id}")

        # Get reviews for a user
        if self.labour_id:
            self.run_test(
                "Get User Reviews",
                "GET",
                f"/reviews/{self.labour_id}",
                200
            )

        # Get reviews given by current user
        self.run_test(
            "Get My Given Reviews",
            "GET",
            "/reviews/given/me",
            200,
            auth_token=self.employer_token
        )

        # Test invalid rating (should fail)
        self.run_test(
            "Invalid Rating Review",
            "POST",
            "/reviews",
            400,
            data={
                "reviewed_user_id": self.labour_id,
                "rating": 6,  # Invalid rating > 5
                "comment": "Test invalid rating"
            },
            auth_token=self.employer_token
        )

        return True

    def test_notification_endpoints(self):
        """Test notification system"""
        if not self.labour_token:
            self.log("❌ No labour token for notification tests", "ERROR")
            return False

        # List notifications
        success, response = self.run_test(
            "List Notifications",
            "GET",
            "/notifications",
            200,
            auth_token=self.labour_token
        )
        
        # Get first notification ID if available
        if success and isinstance(response, list) and len(response) > 0:
            self.notification_id = response[0].get('_id')

        # Get unread count
        self.run_test(
            "Get Unread Count",
            "GET",
            "/notifications/unread-count",
            200,
            auth_token=self.labour_token
        )

        # Mark notification as read (if we have one)
        if self.notification_id:
            self.run_test(
                "Mark Notification Read",
                "PATCH",
                f"/notifications/{self.notification_id}/read",
                200,
                auth_token=self.labour_token
            )

        # Mark all notifications as read
        self.run_test(
            "Mark All Notifications Read",
            "POST",
            "/notifications/mark-all-read",
            200,
            auth_token=self.labour_token
        )

        return True

    def test_error_cases(self):
        """Test various error scenarios"""
        # Unauthorized access
        self.run_test(
            "Unauthorized Job Creation",
            "POST",
            "/jobs",
            401,
            data={"title": "Test Job"}
        )

        # Invalid role registration
        self.run_test(
            "Invalid Role Registration",
            "POST",
            "/auth/register",
            400,
            data={
                "email": "invalid@test.com",
                "password": "test123",
                "name": "Test User",
                "role": "invalid_role"
            }
        )

        # Duplicate email registration
        self.run_test(
            "Duplicate Email Registration",
            "POST",
            "/auth/register",
            400,
            data={
                "email": "admin@example.com",  # Admin email already exists
                "password": "test123",
                "name": "Test User",
                "role": "employer"
            }
        )

        # Non-existent job
        self.run_test(
            "Get Non-existent Job",
            "GET",
            "/jobs/507f1f77bcf86cd799439011",  # Valid ObjectId format
            404
        )

    def run_all_tests(self):
        """Run comprehensive test suite"""
        self.log("🚀 Starting Labour Hire Hub API Tests")
        self.log(f"🌐 Testing against: {self.base_url}")
        
        # Test sequence
        test_methods = [
            ("API Root", self.test_root_endpoint),
            ("Admin Login", self.test_admin_login),
            ("User Registration", self.test_user_registration),
            ("Auth Endpoints", self.test_auth_endpoints),
            ("Geocoding Endpoints", self.test_geocoding_endpoints),
            ("Geo Job Creation", self.test_geo_job_creation),
            ("Job Endpoints", self.test_job_endpoints),
            ("Nearby Jobs Endpoints", self.test_nearby_jobs_endpoints),
            ("Application Endpoints", self.test_application_endpoints),
            ("Tool Endpoints", self.test_tool_endpoints),
            ("Wallet Endpoints", self.test_wallet_endpoints),
            ("Stripe Payment Endpoints", self.test_stripe_payment_endpoints),
            ("Document Upload Endpoints", self.test_document_upload_endpoints),
            ("Review Endpoints", self.test_review_endpoints),
            ("Notification Endpoints", self.test_notification_endpoints),
            ("Admin Endpoints", self.test_admin_endpoints),
            ("Labour Search", self.test_labour_search),
            ("Profile Endpoints", self.test_profile_endpoints),
            ("Geo Profile Updates", self.test_geo_profile_updates),
            ("Error Cases", self.test_error_cases),
        ]

        for test_name, test_method in test_methods:
            self.log(f"\n📋 Running {test_name} tests...")
            try:
                test_method()
            except Exception as e:
                self.log(f"❌ {test_name} test suite failed: {str(e)}", "ERROR")
                self.failed_tests.append(f"{test_name}: {str(e)}")

        # Print summary
        self.print_summary()

    def print_summary(self):
        """Print test results summary"""
        self.log("\n" + "="*60)
        self.log("📊 TEST SUMMARY")
        self.log("="*60)
        self.log(f"✅ Tests Passed: {self.tests_passed}")
        self.log(f"❌ Tests Failed: {len(self.failed_tests)}")
        self.log(f"📈 Total Tests: {self.tests_run}")
        
        if self.tests_run > 0:
            success_rate = (self.tests_passed / self.tests_run) * 100
            self.log(f"🎯 Success Rate: {success_rate:.1f}%")
        
        if self.failed_tests:
            self.log("\n❌ FAILED TESTS:")
            for i, failure in enumerate(self.failed_tests, 1):
                self.log(f"   {i}. {failure}")
        
        self.log("="*60)
        
        return len(self.failed_tests) == 0

def main():
    """Main test execution"""
    tester = LabourHireAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())