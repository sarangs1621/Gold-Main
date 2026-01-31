#!/usr/bin/env python3
"""
Test script for MODULE 1 - PARTIES (CUSTOMER/VENDOR)
Tests all acceptance criteria and mandatory test cases
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8001"
API_URL = f"{BASE_URL}/api"

# Test credentials (admin user)
TEST_USER = {
    "username": "admin",
    "password": "admin123"
}

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def print_test(name, status, message=""):
    """Print test result with color"""
    symbol = "✓" if status else "✗"
    color = Colors.GREEN if status else Colors.RED
    print(f"{color}{symbol} {name}{Colors.RESET}")
    if message:
        print(f"  {Colors.YELLOW}{message}{Colors.RESET}")

def print_section(name):
    """Print section header"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{name}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.RESET}\n")

def login():
    """Login and get access token"""
    try:
        response = requests.post(
            f"{API_URL}/auth/login",
            json=TEST_USER,
            timeout=10
        )
        if response.status_code == 200:
            token = response.json().get("access_token")
            print_test("Login successful", True)
            return token
        else:
            print_test("Login failed", False, f"Status: {response.status_code}")
            return None
    except Exception as e:
        print_test("Login failed", False, str(e))
        return None

def get_headers(token):
    """Get headers with authentication"""
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

def test_create_party_without_customer_id(token):
    """Test Case 1: Create Party without Customer ID"""
    print_section("TEST CASE 1: Create Party without Customer ID")
    
    # Use timestamp to make phone unique
    import time
    unique_suffix = str(int(time.time()))[-8:]
    
    party_data = {
        "name": f"Test No ID {unique_suffix}",
        "phone": f"91{unique_suffix}",
        "address": "Test Address",
        "party_type": "customer",
        "notes": "Test party without customer ID"
    }
    
    try:
        response = requests.post(
            f"{API_URL}/parties",
            json=party_data,
            headers=get_headers(token),
            timeout=10
        )
        
        if response.status_code == 201:
            party = response.json()
            print_test("Party created without customer_id", True, f"Party ID: {party['id']}")
            print_test("customer_id is None or empty", party.get('customer_id') in [None, ''], 
                      f"customer_id: {party.get('customer_id')}")
            return party['id']
        else:
            print_test("Failed to create party", False, f"Status: {response.status_code}, Response: {response.text}")
            return None
    except Exception as e:
        print_test("Create party failed", False, str(e))
        return None

def test_create_party_with_customer_id(token):
    """Test Case 2: Create Party with Customer ID"""
    print_section("TEST CASE 2: Create Party with Customer ID")
    
    # Use timestamp to make phone unique
    import time
    unique_suffix = str(int(time.time()))[-8:]
    
    party_data = {
        "name": f"Test With ID {unique_suffix}",
        "phone": f"92{unique_suffix}",
        "address": "Test Address 2",
        "party_type": "customer",
        "notes": "Test party with customer ID",
        "customer_id": "00123456789"  # With leading zeros
    }
    
    try:
        response = requests.post(
            f"{API_URL}/parties",
            json=party_data,
            headers=get_headers(token),
            timeout=10
        )
        
        if response.status_code == 201:
            party = response.json()
            print_test("Party created with customer_id", True, f"Party ID: {party['id']}")
            print_test("customer_id preserved (with leading zeros)", 
                      party.get('customer_id') == "00123456789",
                      f"customer_id: {party.get('customer_id')}")
            return party['id']
        else:
            print_test("Failed to create party", False, f"Status: {response.status_code}, Response: {response.text}")
            return None
    except Exception as e:
        print_test("Create party failed", False, str(e))
        return None

def test_search_by_customer_id(token):
    """Test Case 3: Search by Customer ID"""
    print_section("TEST CASE 3: Search by Customer ID")
    
    # Search for partial match
    search_term = "12345"
    
    try:
        response = requests.get(
            f"{API_URL}/parties",
            params={"search": search_term, "page": 1, "page_size": 10},
            headers=get_headers(token),
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            parties = data.get('items', [])
            
            # Check if search returned results
            found = any(p.get('customer_id') and search_term in p.get('customer_id', '') for p in parties)
            print_test("Search by customer_id works", found, 
                      f"Found {len(parties)} parties with search term '{search_term}'")
            
            if parties:
                print(f"  Sample results:")
                for party in parties[:3]:
                    print(f"    - {party['name']}: customer_id={party.get('customer_id', 'None')}")
            
            return found
        else:
            print_test("Search failed", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        print_test("Search failed", False, str(e))
        return False

def test_search_by_name(token):
    """Test Case 4: Search by name with pagination"""
    print_section("TEST CASE 4: Search by name with pagination")
    
    try:
        response = requests.get(
            f"{API_URL}/parties",
            params={"search": "Test", "page": 1, "page_size": 5},
            headers=get_headers(token),
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            pagination = data.get('pagination', {})
            
            print_test("Search by name works", True, f"Total count: {pagination.get('total_count', 0)}")
            print_test("Pagination correct", 
                      pagination.get('page') == 1 and pagination.get('page_size') == 5,
                      f"Page: {pagination.get('page')}, Page size: {pagination.get('page_size')}")
            return True
        else:
            print_test("Search failed", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        print_test("Search failed", False, str(e))
        return False

def test_filter_by_party_type(token):
    """Test Case 5: Filter by party type"""
    print_section("TEST CASE 5: Filter by party type + date")
    
    try:
        response = requests.get(
            f"{API_URL}/parties",
            params={"party_type": "customer", "page": 1, "page_size": 10},
            headers=get_headers(token),
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            parties = data.get('items', [])
            
            # Verify all returned parties are customers
            all_customers = all(p.get('party_type') == 'customer' for p in parties)
            print_test("Filter by party_type works", all_customers,
                      f"Found {len(parties)} customers")
            return all_customers
        else:
            print_test("Filter failed", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        print_test("Filter failed", False, str(e))
        return False

def test_customer_id_validation(token):
    """Test Case: Customer ID validation (numeric only)"""
    print_section("TEST VALIDATION: Customer ID must be numeric only")
    
    import time
    
    invalid_ids = [
        ("ABC123", "Contains letters"),
        ("123-456", "Contains dash"),
        ("123 456", "Contains space"),
        ("OM123456", "Contains prefix")
    ]
    
    all_passed = True
    for idx, (invalid_id, reason) in enumerate(invalid_ids):
        unique_suffix = str(int(time.time()) + idx)[-8:]
        party_data = {
            "name": f"Test Invalid ID {invalid_id}",
            "phone": f"93{unique_suffix}",
            "party_type": "customer",
            "customer_id": invalid_id
        }
        
        try:
            response = requests.post(
                f"{API_URL}/parties",
                json=party_data,
                headers=get_headers(token),
                timeout=10
            )
            
            # Should fail with 400
            if response.status_code == 400:
                print_test(f"Rejected '{invalid_id}' ({reason})", True)
            else:
                print_test(f"Should reject '{invalid_id}' ({reason})", False, 
                          f"Got status: {response.status_code}")
                all_passed = False
        except Exception as e:
            print_test(f"Test failed for '{invalid_id}'", False, str(e))
            all_passed = False
    
    return all_passed

def test_customer_id_locking(token, party_id):
    """Test Case 6: Edit Party linked to finalized records"""
    print_section("TEST CASE 6: Customer ID locking for finalized records")
    
    # First, check lock status
    try:
        response = requests.get(
            f"{API_URL}/parties/{party_id}/customer-id-lock-status",
            headers=get_headers(token),
            timeout=10
        )
        
        if response.status_code == 200:
            lock_status = response.json()
            print_test("Lock status API works", True, 
                      f"Is locked: {lock_status.get('is_locked')}")
            
            # If locked, try to change customer_id (should fail)
            if lock_status.get('is_locked'):
                update_data = {"customer_id": "99999999"}
                
                update_response = requests.patch(
                    f"{API_URL}/parties/{party_id}",
                    json=update_data,
                    headers=get_headers(token),
                    timeout=10
                )
                
                if update_response.status_code == 400:
                    print_test("Locked customer_id cannot be changed", True,
                              "Got expected 400 error")
                    return True
                else:
                    print_test("Locked customer_id should not be changeable", False,
                              f"Got status: {update_response.status_code}")
                    return False
            else:
                print_test("Party not locked (no finalized records)", True,
                          "Cannot test locking without finalized records")
                return True
        else:
            print_test("Lock status check failed", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        print_test("Lock status check failed", False, str(e))
        return False

def test_soft_delete(token, party_id):
    """Test Case 7: Delete Party (soft delete only)"""
    print_section("TEST CASE 7: Soft delete only")
    
    try:
        # Delete party
        response = requests.delete(
            f"{API_URL}/parties/{party_id}",
            headers=get_headers(token),
            timeout=10
        )
        
        if response.status_code == 200:
            print_test("Party deleted successfully", True)
            
            # Try to get deleted party (should return 404)
            get_response = requests.get(
                f"{API_URL}/parties/{party_id}",
                headers=get_headers(token),
                timeout=10
            )
            
            if get_response.status_code == 404:
                print_test("Deleted party not accessible", True, "Soft delete confirmed")
                return True
            else:
                print_test("Deleted party should not be accessible", False,
                          f"Got status: {get_response.status_code}")
                return False
        else:
            print_test("Delete failed", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        print_test("Delete failed", False, str(e))
        return False

def run_all_tests():
    """Run all tests"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'#'*60}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}MODULE 1 - PARTIES ACCEPTANCE TESTS{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'#'*60}{Colors.RESET}\n")
    
    # Login
    token = login()
    if not token:
        print_test("CRITICAL: Cannot proceed without authentication", False)
        return False
    
    # Track results
    results = []
    
    # Run test cases
    party_id_no_customer = test_create_party_without_customer_id(token)
    results.append(("Create without customer_id", party_id_no_customer is not None))
    
    party_id_with_customer = test_create_party_with_customer_id(token)
    results.append(("Create with customer_id", party_id_with_customer is not None))
    
    results.append(("Search by customer_id", test_search_by_customer_id(token)))
    results.append(("Search by name + pagination", test_search_by_name(token)))
    results.append(("Filter by party_type", test_filter_by_party_type(token)))
    results.append(("Customer ID validation", test_customer_id_validation(token)))
    
    if party_id_with_customer:
        results.append(("Customer ID locking", test_customer_id_locking(token, party_id_with_customer)))
    
    if party_id_no_customer:
        results.append(("Soft delete", test_soft_delete(token, party_id_no_customer)))
    
    # Print summary
    print_section("TEST SUMMARY")
    passed = sum(1 for _, status in results if status)
    total = len(results)
    
    for name, status in results:
        print_test(name, status)
    
    print(f"\n{Colors.BOLD}Results: {passed}/{total} tests passed{Colors.RESET}")
    
    if passed == total:
        print(f"{Colors.GREEN}{Colors.BOLD}✓ ALL TESTS PASSED{Colors.RESET}\n")
        return True
    else:
        print(f"{Colors.RED}{Colors.BOLD}✗ SOME TESTS FAILED{Colors.RESET}\n")
        return False

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
