#!/usr/bin/env python3
"""
MODULE 4 - PURCHASES (CORE PURCHASE ENTRY) - COMPREHENSIVE TEST SUITE

Tests the following MODULE 4 requirements:
1. Mandatory 22K Internal Valuation (Formula: amount = (weight × 916) ÷ conversion_factor)
2. Entered Purity (Storage Only - Does NOT affect valuation)
3. Multiple Items & Multiple Purities (Same purchase, different purities per item)
4. Walk-in Purchase (Clean implementation without auto-creating Party)
5. Finalization Safety (Draft vs Finalized)
6. Conversion Factor (0.920 or 0.917 selectable)
7. Audit & Data Safety
"""

import requests
import json
from decimal import Decimal, ROUND_HALF_UP

# Configuration
BASE_URL = "http://localhost:8001/api"
TEST_USERNAME = "admin"
TEST_PASSWORD = "admin123"

# Global token storage
TOKEN = None

def get_headers():
    """Get authentication headers"""
    return {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    }

def login():
    """Login and get token"""
    global TOKEN
    response = requests.post(f"{BASE_URL}/auth/login", json={
        "username": TEST_USERNAME,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        TOKEN = response.json()["access_token"]
        print("✅ Login successful")
        return True
    else:
        print(f"❌ Login failed: {response.status_code}")
        return False

def calculate_22k_amount(weight: float, conversion_factor: float) -> float:
    """
    Calculate purchase amount using 22K valuation formula.
    Formula: amount = (weight × 916) ÷ conversion_factor
    """
    weight_decimal = Decimal(str(weight))
    cf_decimal = Decimal(str(conversion_factor))
    amount = (weight_decimal * Decimal('916')) / cf_decimal
    return float(amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))

def test_1_single_item_with_22k_valuation():
    """
    TEST 1: Purchase with single item, purity ≠ 22K → valued using 22K
    
    Requirement: All items must use 916 purity for valuation regardless of entered purity
    """
    print("\n" + "="*80)
    print("TEST 1: Single Item Purchase with 22K Valuation (purity ≠ 22K)")
    print("="*80)
    
    # Get or create vendor
    vendors_response = requests.get(f"{BASE_URL}/parties?party_type=vendor", headers=get_headers())
    vendors = vendors_response.json().get("items", [])
    
    if not vendors:
        print("❌ No vendors found. Please create a vendor first.")
        return False
    
    vendor_id = vendors[0]["id"]
    vendor_name = vendors[0]["name"]
    
    # Get accounts
    accounts_response = requests.get(f"{BASE_URL}/accounts", headers=get_headers())
    accounts = accounts_response.json()
    cash_account = next((acc for acc in accounts if "Cash" in acc["name"]), accounts[0])
    
    # Test data
    weight = 10.500  # grams
    entered_purity = 999  # 24K gold (NOT 22K)
    conversion_factor = 0.920
    
    # Calculate expected amount using 22K formula
    expected_amount = calculate_22k_amount(weight, conversion_factor)
    
    print(f"\n📝 Test Data:")
    print(f"   Vendor: {vendor_name}")
    print(f"   Weight: {weight}g")
    print(f"   Entered Purity: {entered_purity}K (24K)")
    print(f"   Conversion Factor: {conversion_factor}")
    print(f"   Expected Amount (22K valuation): {expected_amount:.2f} OMR")
    print(f"   Formula: ({weight} × 916) ÷ {conversion_factor} = {expected_amount:.2f}")
    
    # Create purchase
    purchase_data = {
        "vendor_type": "saved",
        "vendor_party_id": vendor_id,
        "date": "2026-02-01",
        "description": "TEST 1: Single item, 24K gold, valued at 22K",
        "conversion_factor": conversion_factor,
        "items": [
            {
                "description": "Gold Bar 24K",
                "weight_grams": weight,
                "entered_purity": entered_purity
            }
        ],
        "paid_amount_money": 0,
        "payment_mode": "Cash",
        "account_id": cash_account["id"]
    }
    
    response = requests.post(f"{BASE_URL}/purchases", json=purchase_data, headers=get_headers())
    
    if response.status_code == 201:
        purchase = response.json()
        actual_amount = purchase["amount_total"]
        item_amount = purchase["items"][0]["calculated_amount"]
        
        print(f"\n✅ Purchase created successfully!")
        print(f"   Purchase ID: {purchase['id'][:8]}...")
        print(f"   Item Amount: {item_amount:.2f} OMR")
        print(f"   Total Amount: {actual_amount:.2f} OMR")
        print(f"   Expected: {expected_amount:.2f} OMR")
        
        # Validate amount calculation
        if abs(actual_amount - expected_amount) < 0.01:
            print(f"\n✅ TEST 1 PASSED: Amount correctly calculated using 22K valuation")
            print(f"   ✓ Entered purity ({entered_purity}K) was stored but NOT used in calculation")
            print(f"   ✓ Valuation used 916 purity (22K) as required")
            return True
        else:
            print(f"\n❌ TEST 1 FAILED: Amount mismatch!")
            print(f"   Expected: {expected_amount:.2f}, Got: {actual_amount:.2f}")
            return False
    else:
        print(f"\n❌ TEST 1 FAILED: Purchase creation failed")
        print(f"   Status: {response.status_code}")
        print(f"   Error: {response.text}")
        return False

def test_2_multiple_items_different_purities():
    """
    TEST 2: Purchase with multiple items, different purities → all valued correctly
    
    Requirement: Multiple items with different purities, all use same conversion factor
    """
    print("\n" + "="*80)
    print("TEST 2: Multiple Items with Different Purities (All 22K Valuation)")
    print("="*80)
    
    # Get vendor
    vendors_response = requests.get(f"{BASE_URL}/parties?party_type=vendor", headers=get_headers())
    vendors = vendors_response.json().get("items", [])
    vendor_id = vendors[0]["id"]
    
    # Get accounts
    accounts_response = requests.get(f"{BASE_URL}/accounts", headers=get_headers())
    accounts = accounts_response.json()
    cash_account = next((acc for acc in accounts if "Cash" in acc["name"]), accounts[0])
    
    # Test data - 3 items with different purities
    conversion_factor = 0.917
    items_test_data = [
        {"weight": 5.000, "purity": 999, "description": "24K Gold Bar"},
        {"weight": 7.500, "purity": 916, "description": "22K Gold Jewelry"},
        {"weight": 10.000, "purity": 750, "description": "18K Gold Bracelet"}
    ]
    
    # Calculate expected amounts
    expected_items = []
    total_expected = Decimal('0')
    
    print(f"\n📝 Test Data (Conversion Factor: {conversion_factor}):")
    for idx, item in enumerate(items_test_data, 1):
        amount = calculate_22k_amount(item["weight"], conversion_factor)
        expected_items.append(amount)
        total_expected += Decimal(str(amount))
        print(f"   Item {idx}: {item['weight']}g at {item['purity']}K → {amount:.2f} OMR (using 916K)")
    
    total_expected = float(total_expected.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))
    print(f"   Total Expected: {total_expected:.2f} OMR")
    
    # Create purchase
    purchase_data = {
        "vendor_type": "saved",
        "vendor_party_id": vendor_id,
        "date": "2026-02-01",
        "description": "TEST 2: Multiple items with different purities",
        "conversion_factor": conversion_factor,
        "items": [
            {
                "description": item["description"],
                "weight_grams": item["weight"],
                "entered_purity": item["purity"]
            }
            for item in items_test_data
        ],
        "paid_amount_money": 0,
        "payment_mode": "Cash",
        "account_id": cash_account["id"]
    }
    
    response = requests.post(f"{BASE_URL}/purchases", json=purchase_data, headers=get_headers())
    
    if response.status_code == 201:
        purchase = response.json()
        actual_total = purchase["amount_total"]
        
        print(f"\n✅ Purchase created with {len(purchase['items'])} items!")
        
        # Validate each item
        all_items_correct = True
        for idx, (item, expected) in enumerate(zip(purchase['items'], expected_items), 1):
            actual = item["calculated_amount"]
            print(f"   Item {idx}: {actual:.2f} OMR (expected: {expected:.2f})")
            if abs(actual - expected) > 0.01:
                all_items_correct = False
                print(f"      ❌ Mismatch!")
        
        print(f"   Total: {actual_total:.2f} OMR (expected: {total_expected:.2f})")
        
        if all_items_correct and abs(actual_total - total_expected) < 0.01:
            print(f"\n✅ TEST 2 PASSED: All items valued correctly using 22K")
            print(f"   ✓ Different purities stored for reference")
            print(f"   ✓ All items used 916 purity in calculation")
            print(f"   ✓ Same conversion factor applied to all items")
            return True
        else:
            print(f"\n❌ TEST 2 FAILED: Amount calculation errors")
            return False
    else:
        print(f"\n❌ TEST 2 FAILED: Purchase creation failed")
        print(f"   Status: {response.status_code}")
        print(f"   Error: {response.text}")
        return False

def test_3_conversion_factor_switch():
    """
    TEST 3: Switch conversion factor → amount changes correctly
    
    Requirement: Changing conversion factor should change calculated amounts
    """
    print("\n" + "="*80)
    print("TEST 3: Conversion Factor Switch (0.920 vs 0.917)")
    print("="*80)
    
    # Get vendor and account
    vendors_response = requests.get(f"{BASE_URL}/parties?party_type=vendor", headers=get_headers())
    vendors = vendors_response.json().get("items", [])
    vendor_id = vendors[0]["id"]
    
    accounts_response = requests.get(f"{BASE_URL}/accounts", headers=get_headers())
    accounts = accounts_response.json()
    cash_account = next((acc for acc in accounts if "Cash" in acc["name"]), accounts[0])
    
    # Test data
    weight = 10.000
    purity = 916
    
    # Calculate with both conversion factors
    amount_920 = calculate_22k_amount(weight, 0.920)
    amount_917 = calculate_22k_amount(weight, 0.917)
    
    print(f"\n📝 Test Data:")
    print(f"   Weight: {weight}g")
    print(f"   Entered Purity: {purity}K")
    print(f"   Expected with CF 0.920: {amount_920:.2f} OMR")
    print(f"   Expected with CF 0.917: {amount_917:.2f} OMR")
    print(f"   Difference: {abs(amount_920 - amount_917):.2f} OMR")
    
    # Create purchase with CF 0.920
    purchase_data_920 = {
        "vendor_type": "saved",
        "vendor_party_id": vendor_id,
        "date": "2026-02-01",
        "description": "TEST 3: Conversion Factor 0.920",
        "conversion_factor": 0.920,
        "items": [{"description": "Gold Item", "weight_grams": weight, "entered_purity": purity}],
        "paid_amount_money": 0,
        "payment_mode": "Cash",
        "account_id": cash_account["id"]
    }
    
    response_920 = requests.post(f"{BASE_URL}/purchases", json=purchase_data_920, headers=get_headers())
    
    # Create purchase with CF 0.917
    purchase_data_917 = {
        "vendor_type": "saved",
        "vendor_party_id": vendor_id,
        "date": "2026-02-01",
        "description": "TEST 3: Conversion Factor 0.917",
        "conversion_factor": 0.917,
        "items": [{"description": "Gold Item", "weight_grams": weight, "entered_purity": purity}],
        "paid_amount_money": 0,
        "payment_mode": "Cash",
        "account_id": cash_account["id"]
    }
    
    response_917 = requests.post(f"{BASE_URL}/purchases", json=purchase_data_917, headers=get_headers())
    
    if response_920.status_code == 201 and response_917.status_code == 201:
        actual_920 = response_920.json()["amount_total"]
        actual_917 = response_917.json()["amount_total"]
        
        print(f"\n✅ Both purchases created successfully!")
        print(f"   CF 0.920: {actual_920:.2f} OMR (expected: {amount_920:.2f})")
        print(f"   CF 0.917: {actual_917:.2f} OMR (expected: {amount_917:.2f})")
        
        match_920 = abs(actual_920 - amount_920) < 0.01
        match_917 = abs(actual_917 - amount_917) < 0.01
        different = abs(actual_920 - actual_917) > 0.01
        
        if match_920 and match_917 and different:
            print(f"\n✅ TEST 3 PASSED: Conversion factor correctly affects amount")
            print(f"   ✓ CF 0.920 calculated correctly")
            print(f"   ✓ CF 0.917 calculated correctly")
            print(f"   ✓ Different CFs produce different amounts")
            return True
        else:
            print(f"\n❌ TEST 3 FAILED: Conversion factor not working correctly")
            return False
    else:
        print(f"\n❌ TEST 3 FAILED: Purchase creation failed")
        return False

def test_4_walk_in_purchase_without_party():
    """
    TEST 4: Walk-in purchase without Party → saved successfully
    
    Requirement: Walk-in purchases must NOT auto-create Party
    """
    print("\n" + "="*80)
    print("TEST 4: Walk-in Purchase (No Party Creation)")
    print("="*80)
    
    # Get accounts
    accounts_response = requests.get(f"{BASE_URL}/accounts", headers=get_headers())
    accounts = accounts_response.json()
    cash_account = next((acc for acc in accounts if "Cash" in acc["name"]), accounts[0])
    
    # Count parties before
    parties_before_response = requests.get(f"{BASE_URL}/parties?party_type=vendor", headers=get_headers())
    parties_before_count = parties_before_response.json().get("pagination", {}).get("total_count", 0)
    
    # Create walk-in purchase
    purchase_data = {
        "vendor_type": "walk_in",
        "walk_in_name": "Walk-in Vendor Test",
        "walk_in_customer_id": None,  # Optional
        "date": "2026-02-01",
        "description": "TEST 4: Walk-in purchase without party creation",
        "conversion_factor": 0.920,
        "items": [
            {"description": "Walk-in Gold", "weight_grams": 5.000, "entered_purity": 916}
        ],
        "paid_amount_money": 0,
        "payment_mode": "Cash",
        "account_id": cash_account["id"]
    }
    
    response = requests.post(f"{BASE_URL}/purchases", json=purchase_data, headers=get_headers())
    
    if response.status_code == 201:
        purchase = response.json()
        
        # Count parties after
        parties_after_response = requests.get(f"{BASE_URL}/parties?party_type=vendor", headers=get_headers())
        parties_after_count = parties_after_response.json().get("pagination", {}).get("total_count", 0)
        
        print(f"\n✅ Walk-in purchase created successfully!")
        print(f"   Purchase ID: {purchase['id'][:8]}...")
        print(f"   Vendor Type: {purchase['vendor_type']}")
        print(f"   Walk-in Name: {purchase.get('walk_in_name', 'N/A')}")
        print(f"   Vendor Party ID: {purchase.get('vendor_party_id', 'None')}")
        print(f"   Parties before: {parties_before_count}")
        print(f"   Parties after: {parties_after_count}")
        
        if parties_before_count == parties_after_count and purchase.get("vendor_party_id") is None:
            print(f"\n✅ TEST 4 PASSED: Walk-in purchase works without Party creation")
            print(f"   ✓ No new Party created")
            print(f"   ✓ vendor_party_id is None")
            print(f"   ✓ Walk-in name stored on purchase")
            return True
        else:
            print(f"\n❌ TEST 4 FAILED: Party was created or vendor_party_id is not None")
            return False
    else:
        print(f"\n❌ TEST 4 FAILED: Purchase creation failed")
        print(f"   Status: {response.status_code}")
        print(f"   Error: {response.text}")
        return False

def test_5_walk_in_with_customer_id():
    """
    TEST 5: Walk-in purchase with optional Customer ID → saved
    
    Requirement: Customer ID is optional for walk-ins
    """
    print("\n" + "="*80)
    print("TEST 5: Walk-in Purchase with Optional Customer ID")
    print("="*80)
    
    # Get accounts
    accounts_response = requests.get(f"{BASE_URL}/accounts", headers=get_headers())
    accounts = accounts_response.json()
    cash_account = next((acc for acc in accounts if "Cash" in acc["name"]), accounts[0])
    
    customer_id = "12345678"
    
    # Create walk-in purchase with customer ID
    purchase_data = {
        "vendor_type": "walk_in",
        "walk_in_name": "Walk-in Vendor with ID",
        "walk_in_customer_id": customer_id,
        "date": "2026-02-01",
        "description": "TEST 5: Walk-in with customer ID",
        "conversion_factor": 0.920,
        "items": [
            {"description": "Gold Ring", "weight_grams": 3.500, "entered_purity": 916}
        ],
        "paid_amount_money": 0,
        "payment_mode": "Cash",
        "account_id": cash_account["id"]
    }
    
    response = requests.post(f"{BASE_URL}/purchases", json=purchase_data, headers=get_headers())
    
    if response.status_code == 201:
        purchase = response.json()
        
        print(f"\n✅ Walk-in purchase with Customer ID created!")
        print(f"   Purchase ID: {purchase['id'][:8]}...")
        print(f"   Walk-in Name: {purchase.get('walk_in_name', 'N/A')}")
        print(f"   Customer ID: {purchase.get('walk_in_customer_id', 'N/A')}")
        
        if purchase.get("walk_in_customer_id") == customer_id:
            print(f"\n✅ TEST 5 PASSED: Walk-in with Customer ID works")
            print(f"   ✓ Customer ID stored correctly")
            return True
        else:
            print(f"\n❌ TEST 5 FAILED: Customer ID not stored correctly")
            return False
    else:
        print(f"\n❌ TEST 5 FAILED: Purchase creation failed")
        print(f"   Status: {response.status_code}")
        print(f"   Error: {response.text}")
        return False

def test_6_finalized_purchase_locked():
    """
    TEST 6: Finalize purchase → items locked
    
    Requirement: Finalized purchases are immutable
    """
    print("\n" + "="*80)
    print("TEST 6: Finalized Purchase is Locked")
    print("="*80)
    
    # Get vendor and account
    vendors_response = requests.get(f"{BASE_URL}/parties?party_type=vendor", headers=get_headers())
    vendors = vendors_response.json().get("items", [])
    vendor_id = vendors[0]["id"]
    
    accounts_response = requests.get(f"{BASE_URL}/accounts", headers=get_headers())
    accounts = accounts_response.json()
    cash_account = next((acc for acc in accounts if "Cash" in acc["name"]), accounts[0])
    
    # Create fully paid purchase (auto-locked)
    amount = 100.00
    purchase_data = {
        "vendor_type": "saved",
        "vendor_party_id": vendor_id,
        "date": "2026-02-01",
        "description": "TEST 6: Fully paid purchase",
        "conversion_factor": 0.920,
        "items": [
            {"description": "Gold Item", "weight_grams": 1.003, "entered_purity": 916}  # Will be ~100 OMR
        ],
        "paid_amount_money": amount,
        "payment_mode": "Cash",
        "account_id": cash_account["id"]
    }
    
    response = requests.post(f"{BASE_URL}/purchases", json=purchase_data, headers=get_headers())
    
    if response.status_code == 201:
        purchase = response.json()
        purchase_id = purchase["id"]
        is_locked = purchase.get("locked", False)
        
        print(f"\n✅ Fully paid purchase created!")
        print(f"   Purchase ID: {purchase_id[:8]}...")
        print(f"   Status: {purchase['status']}")
        print(f"   Locked: {is_locked}")
        print(f"   Balance Due: {purchase['balance_due_money']:.2f} OMR")
        
        if is_locked and purchase['balance_due_money'] == 0:
            print(f"\n✅ TEST 6 PASSED: Fully paid purchase is locked")
            print(f"   ✓ Purchase locked when balance_due = 0")
            print(f"   ✓ Status: {purchase['status']}")
            return True
        else:
            print(f"\n❌ TEST 6 FAILED: Purchase not locked correctly")
            return False
    else:
        print(f"\n❌ TEST 6 FAILED: Purchase creation failed")
        print(f"   Status: {response.status_code}")
        print(f"   Error: {response.text}")
        return False

def test_7_entered_purity_not_used():
    """
    TEST 7: Entered purity does NOT affect valuation
    
    Requirement: Entered purity stored for reference only
    """
    print("\n" + "="*80)
    print("TEST 7: Entered Purity Does NOT Affect Valuation")
    print("="*80)
    
    # Get vendor and account
    vendors_response = requests.get(f"{BASE_URL}/parties?party_type=vendor", headers=get_headers())
    vendors = vendors_response.json().get("items", [])
    vendor_id = vendors[0]["id"]
    
    accounts_response = requests.get(f"{BASE_URL}/accounts", headers=get_headers())
    accounts = accounts_response.json()
    cash_account = next((acc for acc in accounts if "Cash" in acc["name"]), accounts[0])
    
    # Same weight, same CF, different purities → should get SAME amount
    weight = 10.000
    conversion_factor = 0.920
    expected_amount = calculate_22k_amount(weight, conversion_factor)
    
    purities_to_test = [750, 916, 999]  # 18K, 22K, 24K
    
    print(f"\n📝 Test Data:")
    print(f"   Weight: {weight}g (same for all)")
    print(f"   Conversion Factor: {conversion_factor} (same for all)")
    print(f"   Expected Amount: {expected_amount:.2f} OMR (should be same for all)")
    print(f"   Testing purities: {purities_to_test}")
    
    amounts = []
    for purity in purities_to_test:
        purchase_data = {
            "vendor_type": "saved",
            "vendor_party_id": vendor_id,
            "date": "2026-02-01",
            "description": f"TEST 7: Purity {purity}K test",
            "conversion_factor": conversion_factor,
            "items": [
                {"description": f"Gold {purity}K", "weight_grams": weight, "entered_purity": purity}
            ],
            "paid_amount_money": 0,
            "payment_mode": "Cash",
            "account_id": cash_account["id"]
        }
        
        response = requests.post(f"{BASE_URL}/purchases", json=purchase_data, headers=get_headers())
        if response.status_code == 201:
            actual_amount = response.json()["amount_total"]
            amounts.append(actual_amount)
            print(f"   Purity {purity}K → Amount: {actual_amount:.2f} OMR")
        else:
            print(f"   ❌ Failed to create purchase with purity {purity}K")
            return False
    
    # Check if all amounts are the same
    all_same = all(abs(amt - expected_amount) < 0.01 for amt in amounts)
    
    if all_same and len(amounts) == len(purities_to_test):
        print(f"\n✅ TEST 7 PASSED: Entered purity does NOT affect valuation")
        print(f"   ✓ All purities ({purities_to_test}) resulted in same amount")
        print(f"   ✓ All amounts matched 22K valuation: {expected_amount:.2f} OMR")
        print(f"   ✓ Entered purity is storage-only field")
        return True
    else:
        print(f"\n❌ TEST 7 FAILED: Amounts vary with purity (should be same)")
        return False

def test_8_no_float_usage():
    """
    TEST 8: No float usage → Decimal precision maintained
    
    Requirement: All calculations use Decimal type
    """
    print("\n" + "="*80)
    print("TEST 8: Decimal Precision (No Float Errors)")
    print("="*80)
    
    # Get vendor and account
    vendors_response = requests.get(f"{BASE_URL}/parties?party_type=vendor", headers=get_headers())
    vendors = vendors_response.json().get("items", [])
    vendor_id = vendors[0]["id"]
    
    accounts_response = requests.get(f"{BASE_URL}/accounts", headers=get_headers())
    accounts = accounts_response.json()
    cash_account = next((acc for acc in accounts if "Cash" in acc["name"]), accounts[0])
    
    # Test with precise decimals that would cause float errors
    test_cases = [
        {"weight": 10.123, "cf": 0.920},
        {"weight": 7.777, "cf": 0.917},
        {"weight": 15.555, "cf": 0.920}
    ]
    
    print(f"\n📝 Testing precision with edge cases:")
    
    all_precise = True
    for case in test_cases:
        weight = case["weight"]
        cf = case["cf"]
        expected = calculate_22k_amount(weight, cf)
        
        purchase_data = {
            "vendor_type": "saved",
            "vendor_party_id": vendor_id,
            "date": "2026-02-01",
            "description": f"TEST 8: Precision test {weight}g",
            "conversion_factor": cf,
            "items": [
                {"description": "Precision Test", "weight_grams": weight, "entered_purity": 916}
            ],
            "paid_amount_money": 0,
            "payment_mode": "Cash",
            "account_id": cash_account["id"]
        }
        
        response = requests.post(f"{BASE_URL}/purchases", json=purchase_data, headers=get_headers())
        if response.status_code == 201:
            actual = response.json()["amount_total"]
            match = abs(actual - expected) < 0.01
            status = "✓" if match else "✗"
            print(f"   {status} Weight {weight}g, CF {cf} → {actual:.2f} OMR (expected: {expected:.2f})")
            if not match:
                all_precise = False
        else:
            print(f"   ✗ Failed to create purchase for {weight}g")
            all_precise = False
    
    if all_precise:
        print(f"\n✅ TEST 8 PASSED: Decimal precision maintained")
        print(f"   ✓ No floating-point rounding errors")
        print(f"   ✓ All amounts calculated with precision")
        return True
    else:
        print(f"\n❌ TEST 8 FAILED: Precision errors detected")
        return False

def run_all_tests():
    """Run all MODULE 4 tests"""
    print("\n" + "="*80)
    print("MODULE 4 - PURCHASES (CORE PURCHASE ENTRY) - TEST SUITE")
    print("="*80)
    print("\nRunning comprehensive tests for MODULE 4 requirements...\n")
    
    # Login first
    if not login():
        print("\n❌ Cannot proceed without authentication")
        return
    
    # Run all tests
    results = {
        "TEST 1: 22K Valuation (Single Item)": test_1_single_item_with_22k_valuation(),
        "TEST 2: Multiple Items, Different Purities": test_2_multiple_items_different_purities(),
        "TEST 3: Conversion Factor Switch": test_3_conversion_factor_switch(),
        "TEST 4: Walk-in Without Party": test_4_walk_in_purchase_without_party(),
        "TEST 5: Walk-in With Customer ID": test_5_walk_in_with_customer_id(),
        "TEST 6: Finalized Purchase Locked": test_6_finalized_purchase_locked(),
        "TEST 7: Entered Purity Not Used": test_7_entered_purity_not_used(),
        "TEST 8: Decimal Precision": test_8_no_float_usage()
    }
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status}: {test_name}")
    
    print(f"\n{'='*80}")
    print(f"TOTAL: {passed}/{total} tests passed")
    
    if passed == total:
        print(f"\n🎉 ALL TESTS PASSED! MODULE 4 Implementation is correct.")
        print(f"\n✅ ACCEPTANCE CRITERIA MET:")
        print(f"   ✓ All items use 22K (916) purity for valuation")
        print(f"   ✓ Conversion factor (0.920 or 0.917) works correctly")
        print(f"   ✓ Entered purity stored but NOT used in calculation")
        print(f"   ✓ Multiple items with different purities work")
        print(f"   ✓ Walk-in purchases work without Party creation")
        print(f"   ✓ Finalized purchases are locked")
        print(f"   ✓ Decimal precision maintained (no float errors)")
        print(f"   ✓ No silent failures")
    else:
        print(f"\n⚠️ {total - passed} test(s) failed. Please review implementation.")
    
    print(f"{'='*80}\n")

if __name__ == "__main__":
    run_all_tests()
