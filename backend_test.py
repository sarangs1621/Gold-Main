#!/usr/bin/env python3
"""
Backend API Testing for Module 2 - Job Cards Enhancement
Tests Per-Inch making charge and Work Types functionality
"""

import requests
import json
import sys
from datetime import datetime
from decimal import Decimal

class JobCardsModule2Tester:
    def __init__(self, base_url="https://gold-valuation-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.csrf_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data storage
        self.test_customer_id = None
        self.test_worker_id = None
        self.test_worktype_id = None
        self.test_jobcard_id = None

    def log_result(self, test_name, success, details="", error=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name}")
        else:
            print(f"❌ {test_name} - {error}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "error": error
        })

    def make_request(self, method, endpoint, data=None, expected_status=200):
        """Make authenticated API request"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        if self.csrf_token:
            headers['X-CSRF-Token'] = self.csrf_token

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            return success, response.json() if success else {}, response.status_code, response.text

        except Exception as e:
            return False, {}, 0, str(e)

    def test_authentication(self):
        """Test login and get authentication tokens"""
        print("\n🔐 Testing Authentication...")
        
        # Try to login with default admin credentials
        login_data = {
            "username": "admin",
            "password": "admin123"
        }
        
        success, response, status_code, error_text = self.make_request(
            'POST', 'auth/login', login_data, 200
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.csrf_token = response.get('csrf_token')
            self.log_result("Authentication", True, "Successfully logged in as admin")
            return True
        else:
            self.log_result("Authentication", False, "", f"Login failed: {error_text}")
            return False

    def test_work_types_api(self):
        """Test Work Types CRUD operations"""
        print("\n🔧 Testing Work Types API...")
        
        # Test 1: Get existing work types
        success, response, _, error = self.make_request('GET', 'worktypes')
        if success:
            work_types = response.get('worktypes', [])
            self.log_result("Get Work Types", True, f"Found {len(work_types)} work types")
        else:
            self.log_result("Get Work Types", False, "", error)
            return False

        # Test 2: Create new work type
        new_worktype_data = {
            "name": "Test Work Type",
            "is_active": True
        }
        
        success, response, _, error = self.make_request(
            'POST', 'worktypes', new_worktype_data, 201
        )
        
        if success:
            self.test_worktype_id = response.get('id')
            self.log_result("Create Work Type", True, f"Created work type with ID: {self.test_worktype_id}")
        else:
            self.log_result("Create Work Type", False, "", error)
            return False

        # Test 3: Update work type
        update_data = {
            "name": "Updated Test Work Type",
            "is_active": True
        }
        
        success, response, _, error = self.make_request(
            'PATCH', f'worktypes/{self.test_worktype_id}', update_data
        )
        
        if success:
            self.log_result("Update Work Type", True, "Successfully updated work type name")
        else:
            self.log_result("Update Work Type", False, "", error)

        # Test 4: Deactivate work type (soft delete)
        success, response, _, error = self.make_request(
            'DELETE', f'worktypes/{self.test_worktype_id}', expected_status=200
        )
        
        if success:
            self.log_result("Deactivate Work Type", True, "Successfully deactivated work type")
        else:
            self.log_result("Deactivate Work Type", False, "", error)

        # Test 5: Verify deactivated work type not in active list
        success, response, _, error = self.make_request('GET', 'worktypes')
        if success:
            active_work_types = [wt for wt in response.get('worktypes', []) if wt.get('is_active')]
            deactivated_found = any(wt.get('id') == self.test_worktype_id for wt in active_work_types)
            
            if not deactivated_found:
                self.log_result("Deactivated Work Type Hidden", True, "Deactivated work type not in active list")
            else:
                self.log_result("Deactivated Work Type Hidden", False, "", "Deactivated work type still showing in active list")
        
        return True

    def setup_test_data(self):
        """Setup required test data (customer, worker)"""
        print("\n📋 Setting up test data...")
        
        # Get existing customers
        success, response, _, error = self.make_request('GET', 'parties?party_type=customer')
        if success and response.get('items'):
            self.test_customer_id = response['items'][0]['id']
            self.log_result("Get Test Customer", True, f"Using customer ID: {self.test_customer_id}")
        else:
            # Create test customer if none exist
            customer_data = {
                "name": "Test Customer",
                "party_type": "customer",
                "phone": "12345678"
            }
            success, response, _, error = self.make_request('POST', 'parties', customer_data, 201)
            if success:
                self.test_customer_id = response.get('id')
                self.log_result("Create Test Customer", True, f"Created customer ID: {self.test_customer_id}")
            else:
                self.log_result("Create Test Customer", False, "", error)
                return False

        # Get existing workers
        success, response, _, error = self.make_request('GET', 'workers?active=true')
        if success and response.get('items'):
            self.test_worker_id = response['items'][0]['id']
            self.log_result("Get Test Worker", True, f"Using worker ID: {self.test_worker_id}")
        else:
            # Create test worker if none exist
            worker_data = {
                "name": "Test Worker",
                "role": "Goldsmith",
                "active": True
            }
            success, response, _, error = self.make_request('POST', 'workers', worker_data, 201)
            if success:
                self.test_worker_id = response.get('id')
                self.log_result("Create Test Worker", True, f"Created worker ID: {self.test_worker_id}")
            else:
                self.log_result("Create Test Worker", False, "", error)
                return False

        return True

    def test_per_inch_making_charge(self):
        """Test Per-Inch making charge functionality"""
        print("\n📏 Testing Per-Inch Making Charge...")
        
        # Test 1: Create job card with per_inch making charge
        jobcard_data = {
            "customer_type": "saved",
            "customer_id": self.test_customer_id,
            "worker_id": self.test_worker_id,
            "delivery_date": "2025-02-15",
            "notes": "Test per-inch making charge",
            "items": [{
                "category": "Chain",
                "description": "Test chain with per-inch charge",
                "qty": 1,
                "weight_in": 10.5,
                "purity": 916,
                "work_type": "polish",
                "making_charge_type": "per_inch",
                "length_in_inches": 24.5,
                "rate_per_inch": 2.5,
                "vat_percent": 5
            }]
        }
        
        success, response, _, error = self.make_request(
            'POST', 'jobcards', jobcard_data, 201
        )
        
        if success:
            self.test_jobcard_id = response.get('id')
            job_number = response.get('job_card_number')
            
            # Verify the making charge was calculated correctly
            items = response.get('items', [])
            if items:
                item = items[0]
                expected_charge = 24.5 * 2.5  # length × rate = 61.25
                actual_charge = item.get('making_charge_value', 0)
                
                if abs(float(actual_charge) - expected_charge) < 0.01:
                    self.log_result("Per-Inch Calculation", True, 
                                  f"Correct calculation: {expected_charge} OMR")
                else:
                    self.log_result("Per-Inch Calculation", False, "", 
                                  f"Expected {expected_charge}, got {actual_charge}")
            
            self.log_result("Create Per-Inch Job Card", True, 
                          f"Created job card {job_number} with per-inch charge")
        else:
            self.log_result("Create Per-Inch Job Card", False, "", error)
            return False

        # Test 2: Validation - per_inch without required fields should fail
        invalid_jobcard_data = {
            "customer_type": "saved",
            "customer_id": self.test_customer_id,
            "items": [{
                "category": "Ring",
                "description": "Invalid per-inch item",
                "qty": 1,
                "weight_in": 5.0,
                "purity": 916,
                "work_type": "resize",
                "making_charge_type": "per_inch",
                # Missing length_in_inches and rate_per_inch
                "vat_percent": 5
            }]
        }
        
        success, response, status_code, error = self.make_request(
            'POST', 'jobcards', invalid_jobcard_data, 400
        )
        
        if not success and status_code == 400:
            self.log_result("Per-Inch Validation", True, 
                          "Correctly rejected per-inch without required fields")
        else:
            self.log_result("Per-Inch Validation", False, "", 
                          "Should have rejected invalid per-inch data")

        return True

    def test_backward_compatibility(self):
        """Test backward compatibility with existing making charge types"""
        print("\n🔄 Testing Backward Compatibility...")
        
        # Test 1: Flat making charge (existing functionality)
        flat_jobcard_data = {
            "customer_type": "saved",
            "customer_id": self.test_customer_id,
            "items": [{
                "category": "Ring",
                "description": "Test flat making charge",
                "qty": 1,
                "weight_in": 8.0,
                "purity": 916,
                "work_type": "polish",
                "making_charge_type": "flat",
                "making_charge_value": 25.0,
                "vat_percent": 5
            }]
        }
        
        success, response, _, error = self.make_request(
            'POST', 'jobcards', flat_jobcard_data, 201
        )
        
        if success:
            self.log_result("Flat Making Charge", True, "Successfully created job card with flat charge")
        else:
            self.log_result("Flat Making Charge", False, "", error)

        # Test 2: Per-gram making charge (existing functionality)
        per_gram_jobcard_data = {
            "customer_type": "saved",
            "customer_id": self.test_customer_id,
            "items": [{
                "category": "Bracelet",
                "description": "Test per-gram making charge",
                "qty": 1,
                "weight_in": 12.0,
                "purity": 916,
                "work_type": "repair",
                "making_charge_type": "per_gram",
                "making_charge_value": 3.5,  # 3.5 OMR per gram
                "vat_percent": 5
            }]
        }
        
        success, response, _, error = self.make_request(
            'POST', 'jobcards', per_gram_jobcard_data, 201
        )
        
        if success:
            self.log_result("Per-Gram Making Charge", True, "Successfully created job card with per-gram charge")
        else:
            self.log_result("Per-Gram Making Charge", False, "", error)

        return True

    def test_finalized_jobcard_immutability(self):
        """Test that finalized job cards cannot be edited"""
        print("\n🔒 Testing Finalized Job Card Immutability...")
        
        if not self.test_jobcard_id:
            self.log_result("Finalized Job Card Test", False, "", "No test job card available")
            return False

        # First, try to update the job card (should work when not finalized)
        update_data = {
            "notes": "Updated notes - should work"
        }
        
        success, response, _, error = self.make_request(
            'PATCH', f'jobcards/{self.test_jobcard_id}', update_data
        )
        
        if success:
            self.log_result("Update Non-Finalized Job Card", True, "Successfully updated job card")
        else:
            self.log_result("Update Non-Finalized Job Card", False, "", error)

        # Note: We can't easily test finalized job card immutability without 
        # converting to invoice and finalizing, which requires more complex setup
        # This would be better tested in the frontend E2E tests
        
        return True

    def test_decimal_precision(self):
        """Test decimal precision in per-inch calculations"""
        print("\n🔢 Testing Decimal Precision...")
        
        # Test with precise decimal values
        precision_jobcard_data = {
            "customer_type": "saved",
            "customer_id": self.test_customer_id,
            "items": [{
                "category": "Chain",
                "description": "Precision test",
                "qty": 1,
                "weight_in": 7.333,
                "purity": 916,
                "work_type": "polish",
                "making_charge_type": "per_inch",
                "length_in_inches": 15.75,  # Precise decimal
                "rate_per_inch": 1.333,     # Precise decimal
                "vat_percent": 5
            }]
        }
        
        success, response, _, error = self.make_request(
            'POST', 'jobcards', precision_jobcard_data, 201
        )
        
        if success:
            items = response.get('items', [])
            if items:
                item = items[0]
                # Expected: 15.75 * 1.333 = 20.99475
                expected_charge = Decimal('15.75') * Decimal('1.333')
                actual_charge = Decimal(str(item.get('making_charge_value', 0)))
                
                # Allow small tolerance for decimal precision
                if abs(actual_charge - expected_charge) < Decimal('0.01'):
                    self.log_result("Decimal Precision", True, 
                                  f"Precise calculation: {actual_charge}")
                else:
                    self.log_result("Decimal Precision", False, "", 
                                  f"Expected {expected_charge}, got {actual_charge}")
            else:
                self.log_result("Decimal Precision", False, "", "No items in response")
        else:
            self.log_result("Decimal Precision", False, "", error)

        return True

    def run_all_tests(self):
        """Run all Module 2 tests"""
        print("🚀 Starting Module 2 - Job Cards Enhancement Tests")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        # Authentication is required for all other tests
        if not self.test_authentication():
            print("\n❌ Authentication failed - cannot continue with other tests")
            return False
        
        # Setup test data
        if not self.setup_test_data():
            print("\n❌ Test data setup failed - cannot continue")
            return False
        
        # Run all test suites
        self.test_work_types_api()
        self.test_per_inch_making_charge()
        self.test_backward_compatibility()
        self.test_finalized_jobcard_immutability()
        self.test_decimal_precision()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

    def get_test_results(self):
        """Get detailed test results"""
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": self.tests_run - self.tests_passed,
            "success_rate": (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0,
            "results": self.test_results
        }

def main():
    """Main test execution"""
    tester = JobCardsModule2Tester()
    
    try:
        success = tester.run_all_tests()
        
        # Save detailed results
        results = tester.get_test_results()
        with open('/app/backend_test_results.json', 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        return 0 if success else 1
        
    except Exception as e:
        print(f"\n💥 Test execution failed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())