#!/usr/bin/env python3
"""
Additional verification tests for specific data counts mentioned in review request
"""

import requests
import json

<<<<<<< HEAD
BASE_URL = "https://filter-finance.preview.emergentagent.com/api"
=======
BASE_URL = "https://filter-finance.preview.emergentagent.com/api"
>>>>>>> b31b2899369e7f105da7aa8839d08cfdd4516b95

def get_auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/auth/login", json={
        "username": "admin",
        "password": "admin123"
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    return None

def test_specific_counts():
    """Test specific data counts mentioned in review request"""
    token = get_auth_token()
    if not token:
        print("❌ Authentication failed")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    print("🔍 Verifying Specific Data Counts from Review Request")
    print("=" * 60)
    
    # Test specific counts
    tests = [
        ("Inventory Headers", "/inventory/headers", 8, "categories"),
        ("Stock Movements", "/inventory/movements", 178, "movements"),
        ("Parties Total", "/parties", 18, "parties"),
        ("Job Cards", "/jobcards", 28, "job cards"),
        ("Invoices", "/invoices", 21, "invoices"),
        ("Accounts", "/accounts", 4, "accounts"),
        ("Transactions", "/transactions", 32, "transactions"),
        ("Daily Closings", "/daily-closings", 15, "daily closings")
    ]
    
    for test_name, endpoint, expected_count, item_type in tests:
        try:
            response = requests.get(f"{BASE_URL}{endpoint}", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Handle different response formats
                if isinstance(data, dict) and "items" in data:
                    actual_count = data.get("pagination", {}).get("total_count", len(data["items"]))
                elif isinstance(data, list):
                    actual_count = len(data)
                else:
                    actual_count = 0
                
                if actual_count >= expected_count:
                    print(f"✅ {test_name}: {actual_count} {item_type} (expected {expected_count}+)")
                else:
                    print(f"❌ {test_name}: {actual_count} {item_type} (expected {expected_count}+)")
            else:
                print(f"❌ {test_name}: HTTP {response.status_code}")
                
        except Exception as e:
            print(f"❌ {test_name}: Exception - {str(e)}")
    
    # Test party type filtering
    print("\n🔍 Verifying Party Type Filtering")
    print("-" * 40)
    
    party_filters = [
        ("Customers", "customer", 10),
        ("Vendors", "vendor", 4),
        ("Workers", "worker", 4)
    ]
    
    for filter_name, party_type, expected_count in party_filters:
        try:
            response = requests.get(f"{BASE_URL}/parties?party_type={party_type}", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                if isinstance(data, dict) and "items" in data:
                    actual_count = data.get("pagination", {}).get("total_count", len(data["items"]))
                elif isinstance(data, list):
                    actual_count = len(data)
                else:
                    actual_count = 0
                
                if actual_count >= expected_count:
                    print(f"✅ {filter_name}: {actual_count} (expected {expected_count})")
                else:
                    print(f"❌ {filter_name}: {actual_count} (expected {expected_count})")
            else:
                print(f"❌ {filter_name}: HTTP {response.status_code}")
                
        except Exception as e:
            print(f"❌ {filter_name}: Exception - {str(e)}")

if __name__ == "__main__":
    test_specific_counts()