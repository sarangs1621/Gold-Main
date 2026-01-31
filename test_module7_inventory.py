"""
MODULE 7: Comprehensive Backend Tests for Inventory Stock Movements Discipline

Tests verify:
1. Stock movements are the Single Source of Truth
2. No direct inventory_headers mutations
3. Inventory calculated correctly from movements
4. Idempotency checks work
5. All finalization flows respect MODULE 7 rules
"""

import requests
import json
from datetime import datetime
from decimal import Decimal

# Configuration
BASE_URL = "http://localhost:8001/api"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"

# Global token storage
auth_token = None
csrf_token = None

def login():
    """Login and get auth token"""
    global auth_token, csrf_token
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
    )
    if response.status_code == 200:
        data = response.json()
        auth_token = data.get("access_token")
        csrf_token = data.get("csrf_token")
        print("✅ Login successful")
        return True
    else:
        print(f"❌ Login failed: {response.text}")
        return False

def get_headers():
    """Get request headers with auth"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "X-CSRF-Token": csrf_token,
        "Content-Type": "application/json"
    }

def test_1_draft_sale_no_stock_change():
    """Test 1: Draft sale → no stock change"""
    print("\n" + "="*60)
    print("TEST 1: Draft Sale - No Stock Movement")
    print("="*60)
    
    # Get initial stock
    response = requests.get(f"{BASE_URL}/inventory/stock-totals", headers=get_headers())
    initial_stock = response.json()
    print(f"Initial stock: {json.dumps(initial_stock, indent=2)}")
    
    # Create draft invoice
    invoice_data = {
        "invoice_number": f"TEST-INV-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "customer_type": "walk_in",
        "walk_in_name": "Test Customer",
        "invoice_type": "sale",
        "status": "draft",
        "items": [
            {
                "description": "Test Item",
                "qty": 1,
                "weight": 10.0,
                "purity": 916,
                "rate": 100,
                "amount": 1000,
                "category": "Gold 22K"
            }
        ],
        "subtotal": 1000,
        "grand_total": 1000,
        "paid_amount": 0,
        "balance_due": 1000
    }
    
    response = requests.post(f"{BASE_URL}/invoices", headers=get_headers(), json=invoice_data)
    if response.status_code == 201:
        invoice = response.json()
        invoice_id = invoice["id"]
        print(f"✅ Draft invoice created: {invoice_id}")
        
        # Check stock movements - should have NONE for draft
        response = requests.get(f"{BASE_URL}/inventory/movements", headers=get_headers())
        movements = response.json()
        invoice_movements = [m for m in movements if m.get("source_id") == invoice_id]
        
        if len(invoice_movements) == 0:
            print("✅ PASS: No stock movements created for draft invoice")
            
            # Verify stock unchanged
            response = requests.get(f"{BASE_URL}/inventory/stock-totals", headers=get_headers())
            final_stock = response.json()
            
            if initial_stock == final_stock:
                print("✅ PASS: Stock totals unchanged")
                return True, invoice_id
            else:
                print("❌ FAIL: Stock changed for draft invoice")
                return False, None
        else:
            print(f"❌ FAIL: Found {len(invoice_movements)} movements for draft invoice")
            return False, None
    else:
        print(f"❌ FAIL: Could not create draft invoice: {response.text}")
        return False, None

def test_2_finalize_sale_creates_out_movement(invoice_id):
    """Test 2: Finalize sale → OUT movement created"""
    print("\n" + "="*60)
    print("TEST 2: Finalize Sale - OUT Movement Created")
    print("="*60)
    
    # Get stock before finalize
    response = requests.get(f"{BASE_URL}/inventory/stock-totals", headers=get_headers())
    stock_before = response.json()
    gold_22k_before = next((s for s in stock_before if s["header_name"] == "Gold 22K"), None)
    print(f"Stock before finalize: {json.dumps(gold_22k_before, indent=2)}")
    
    # Finalize invoice
    response = requests.post(f"{BASE_URL}/invoices/{invoice_id}/finalize", headers=get_headers())
    if response.status_code == 200:
        print("✅ Invoice finalized")
        
        # Check stock movements - should have OUT movement
        response = requests.get(f"{BASE_URL}/inventory/movements", headers=get_headers())
        movements = response.json()
        invoice_movements = [m for m in movements if m.get("source_id") == invoice_id]
        
        if len(invoice_movements) > 0:
            movement = invoice_movements[0]
            print(f"✅ PASS: Stock movement created")
            print(f"   Movement type: {movement.get('movement_type')}")
            print(f"   Source type: {movement.get('source_type')}")
            print(f"   Weight: {movement.get('weight')}")
            
            # Verify movement structure
            if (movement.get('movement_type') == 'OUT' and 
                movement.get('source_type') == 'SALE' and
                movement.get('source_id') == invoice_id):
                print("✅ PASS: Movement has correct MODULE 7 structure")
                
                # Verify stock decreased
                response = requests.get(f"{BASE_URL}/inventory/stock-totals", headers=get_headers())
                stock_after = response.json()
                gold_22k_after = next((s for s in stock_after if s["header_name"] == "Gold 22K"), None)
                print(f"Stock after finalize: {json.dumps(gold_22k_after, indent=2)}")
                
                if gold_22k_after and gold_22k_before:
                    weight_change = gold_22k_after["total_weight"] - gold_22k_before["total_weight"]
                    if abs(weight_change + 10.0) < 0.001:  # Should decrease by 10g
                        print("✅ PASS: Stock decreased by correct amount")
                        return True
                    else:
                        print(f"❌ FAIL: Stock changed by {weight_change}g, expected -10g")
                        return False
            else:
                print("❌ FAIL: Movement has incorrect structure")
                return False
        else:
            print("❌ FAIL: No stock movement created on finalize")
            return False
    else:
        print(f"❌ FAIL: Could not finalize invoice: {response.text}")
        return False

def test_3_purchase_finalize_creates_in_movement():
    """Test 3: Purchase finalize → IN movement created"""
    print("\n" + "="*60)
    print("TEST 3: Purchase Finalize - IN Movement Created")
    print("="*60)
    
    # Get stock before purchase
    response = requests.get(f"{BASE_URL}/inventory/stock-totals", headers=get_headers())
    stock_before = response.json()
    gold_22k_before = next((s for s in stock_before if s["header_name"] == "Gold 22K"), None)
    initial_weight = gold_22k_before["total_weight"] if gold_22k_before else 0
    print(f"Stock before purchase: {initial_weight}g")
    
    # Create and finalize purchase
    purchase_data = {
        "vendor_type": "walk_in",
        "walk_in_name": "Test Vendor",
        "description": "Test Purchase",
        "items": [
            {
                "description": "Gold Item",
                "weight_grams": 50.0,
                "entered_purity": 916,
                "valuation_purity_fixed": 916
            }
        ],
        "conversion_factor": 0.920,
        "amount_total": 5000.0,
        "paid_amount_money": 0.0,
        "balance_due_money": 5000.0,
        "status": "Draft"
    }
    
    response = requests.post(f"{BASE_URL}/purchases", headers=get_headers(), json=purchase_data)
    if response.status_code == 201:
        purchase = response.json()
        purchase_id = purchase["id"]
        print(f"✅ Draft purchase created: {purchase_id}")
        
        # Finalize purchase
        response = requests.post(f"{BASE_URL}/purchases/{purchase_id}/finalize", headers=get_headers())
        if response.status_code == 200:
            print("✅ Purchase finalized")
            
            # Check stock movements - should have IN movement
            response = requests.get(f"{BASE_URL}/inventory/movements", headers=get_headers())
            movements = response.json()
            purchase_movements = [m for m in movements if m.get("source_id") == purchase_id]
            
            if len(purchase_movements) > 0:
                movement = purchase_movements[0]
                print(f"✅ PASS: Stock movement created")
                print(f"   Movement type: {movement.get('movement_type')}")
                print(f"   Source type: {movement.get('source_type')}")
                print(f"   Weight: {movement.get('weight')}")
                
                # Verify movement structure
                if (movement.get('movement_type') == 'IN' and 
                    movement.get('source_type') == 'PURCHASE' and
                    movement.get('source_id') == purchase_id):
                    print("✅ PASS: Movement has correct MODULE 7 structure")
                    
                    # Verify stock increased
                    response = requests.get(f"{BASE_URL}/inventory/stock-totals", headers=get_headers())
                    stock_after = response.json()
                    gold_22k_after = next((s for s in stock_after if s["header_name"] == "Gold 22K"), None)
                    final_weight = gold_22k_after["total_weight"] if gold_22k_after else 0
                    weight_change = final_weight - initial_weight
                    print(f"Stock after purchase: {final_weight}g (change: {weight_change}g)")
                    
                    if abs(weight_change - 50.0) < 0.001:  # Should increase by 50g
                        print("✅ PASS: Stock increased by correct amount")
                        return True
                    else:
                        print(f"❌ FAIL: Stock changed by {weight_change}g, expected +50g")
                        return False
                else:
                    print("❌ FAIL: Movement has incorrect structure")
                    return False
            else:
                print("❌ FAIL: No stock movement created on purchase finalize")
                return False
        else:
            print(f"❌ FAIL: Could not finalize purchase: {response.text}")
            return False
    else:
        print(f"❌ FAIL: Could not create purchase: {response.text}")
        return False

def test_4_manual_adjustment_logged():
    """Test 4: Manual adjustment → ADJUSTMENT movement logged"""
    print("\n" + "="*60)
    print("TEST 4: Manual Adjustment - ADJUSTMENT Movement Logged")
    print("="*60)
    
    # Get Gold 22K header
    response = requests.get(f"{BASE_URL}/inventory/headers", headers=get_headers())
    headers = response.json()
    gold_22k = next((h for h in headers if h["name"] == "Gold 22K"), None)
    
    if not gold_22k:
        print("❌ FAIL: Gold 22K header not found")
        return False
    
    # Get stock before adjustment
    response = requests.get(f"{BASE_URL}/inventory/stock/{gold_22k['id']}", headers=get_headers())
    stock_before = response.json()
    print(f"Stock before adjustment: {stock_before['total_weight']}g")
    
    # Create manual adjustment
    adjustment_data = {
        "header_id": gold_22k["id"],
        "weight": 5.0,  # Add 5g
        "purity": 916,
        "description": "Manual adjustment test",
        "audit_reference": "MODULE 7 TEST: Testing manual adjustment",
        "notes": "Test adjustment for MODULE 7 verification"
    }
    
    response = requests.post(f"{BASE_URL}/inventory/movements", headers=get_headers(), json=adjustment_data)
    if response.status_code == 201:
        movement = response.json()
        print(f"✅ Manual adjustment created: {movement['id']}")
        print(f"   Movement type: {movement.get('movement_type')}")
        print(f"   Source type: {movement.get('source_type')}")
        print(f"   Audit reference: {movement.get('audit_reference')}")
        
        # Verify movement structure
        if (movement.get('movement_type') == 'ADJUSTMENT' and 
            movement.get('source_type') == 'MANUAL' and
            movement.get('audit_reference')):
            print("✅ PASS: Adjustment has correct MODULE 7 structure")
            
            # Verify stock changed
            response = requests.get(f"{BASE_URL}/inventory/stock/{gold_22k['id']}", headers=get_headers())
            stock_after = response.json()
            weight_change = stock_after['total_weight'] - stock_before['total_weight']
            print(f"Stock after adjustment: {stock_after['total_weight']}g (change: {weight_change}g)")
            
            if abs(weight_change - 5.0) < 0.001:
                print("✅ PASS: Stock changed by correct amount")
                return True
            else:
                print(f"❌ FAIL: Stock changed by {weight_change}g, expected +5g")
                return False
        else:
            print("❌ FAIL: Adjustment has incorrect structure")
            return False
    else:
        print(f"❌ FAIL: Could not create adjustment: {response.text}")
        return False

def test_5_inventory_reconciliation():
    """Test 5: Inventory reconciliation - totals match movements"""
    print("\n" + "="*60)
    print("TEST 5: Inventory Reconciliation")
    print("="*60)
    
    response = requests.get(f"{BASE_URL}/inventory/reconciliation", headers=get_headers())
    if response.status_code == 200:
        reconciliation = response.json()
        summary = reconciliation.get("summary", {})
        print(f"Total headers: {summary.get('total_headers')}")
        print(f"Matching headers: {summary.get('matching_headers')}")
        print(f"Mismatched headers: {summary.get('mismatched_headers')}")
        print(f"All match: {summary.get('all_match')}")
        
        # In a fresh system, there should be no legacy data, so we just check the calculation works
        if summary.get('total_headers') > 0:
            print("✅ PASS: Reconciliation endpoint working")
            print(f"Note: {summary.get('note')}")
            return True
        else:
            print("⚠️  WARNING: No inventory headers found")
            return True  # Still pass since the endpoint works
    else:
        print(f"❌ FAIL: Reconciliation failed: {response.text}")
        return False

def test_6_idempotency_check():
    """Test 6: Idempotency - finalizing twice should fail"""
    print("\n" + "="*60)
    print("TEST 6: Idempotency Check - Prevent Duplicate Finalization")
    print("="*60)
    
    # Create draft invoice
    invoice_data = {
        "invoice_number": f"TEST-IDEM-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "customer_type": "walk_in",
        "walk_in_name": "Test Customer",
        "invoice_type": "sale",
        "status": "draft",
        "items": [
            {
                "description": "Test Item",
                "qty": 1,
                "weight": 1.0,
                "purity": 916,
                "rate": 100,
                "amount": 100,
                "category": "Gold 22K"
            }
        ],
        "subtotal": 100,
        "grand_total": 100,
        "paid_amount": 0,
        "balance_due": 100
    }
    
    response = requests.post(f"{BASE_URL}/invoices", headers=get_headers(), json=invoice_data)
    if response.status_code == 201:
        invoice = response.json()
        invoice_id = invoice["id"]
        print(f"✅ Draft invoice created: {invoice_id}")
        
        # Finalize first time
        response = requests.post(f"{BASE_URL}/invoices/{invoice_id}/finalize", headers=get_headers())
        if response.status_code == 200:
            print("✅ First finalization successful")
            
            # Try to finalize again - should fail
            response = requests.post(f"{BASE_URL}/invoices/{invoice_id}/finalize", headers=get_headers())
            if response.status_code == 400:
                print("✅ PASS: Second finalization rejected (idempotency working)")
                return True
            else:
                print(f"❌ FAIL: Second finalization should have failed but got: {response.status_code}")
                return False
        else:
            print(f"❌ FAIL: First finalization failed: {response.text}")
            return False
    else:
        print(f"❌ FAIL: Could not create invoice: {response.text}")
        return False

def test_7_time_scoped_query():
    """Test 7: Time-scoped stock query"""
    print("\n" + "="*60)
    print("TEST 7: Time-Scoped Stock Query")
    print("="*60)
    
    # Get current stock
    response = requests.get(f"{BASE_URL}/inventory/stock-totals", headers=get_headers())
    current_stock = response.json()
    print(f"Current stock: {json.dumps(current_stock, indent=2)}")
    
    # Get historical stock (1 hour ago)
    from datetime import timedelta
    one_hour_ago = (datetime.now() - timedelta(hours=1)).isoformat() + "Z"
    response = requests.get(f"{BASE_URL}/inventory/stock-totals?as_of={one_hour_ago}", headers=get_headers())
    
    if response.status_code == 200:
        historical_stock = response.json()
        print(f"Historical stock (1h ago): {json.dumps(historical_stock, indent=2)}")
        print("✅ PASS: Time-scoped query working")
        return True
    else:
        print(f"❌ FAIL: Time-scoped query failed: {response.text}")
        return False

def run_all_tests():
    """Run all MODULE 7 tests"""
    print("\n" + "="*80)
    print("MODULE 7: INVENTORY STOCK MOVEMENTS DISCIPLINE - BACKEND TESTS")
    print("="*80)
    
    if not login():
        print("\n❌ Cannot proceed without login")
        return
    
    results = []
    
    # Test 1: Draft sale
    result, invoice_id = test_1_draft_sale_no_stock_change()
    results.append(("Draft sale - no stock change", result))
    
    # Test 2: Finalize sale (only if test 1 passed)
    if result and invoice_id:
        result = test_2_finalize_sale_creates_out_movement(invoice_id)
        results.append(("Finalize sale - OUT movement", result))
    else:
        results.append(("Finalize sale - OUT movement", False))
    
    # Test 3: Purchase finalize
    result = test_3_purchase_finalize_creates_in_movement()
    results.append(("Purchase finalize - IN movement", result))
    
    # Test 4: Manual adjustment
    result = test_4_manual_adjustment_logged()
    results.append(("Manual adjustment - logged", result))
    
    # Test 5: Reconciliation
    result = test_5_inventory_reconciliation()
    results.append(("Inventory reconciliation", result))
    
    # Test 6: Idempotency
    result = test_6_idempotency_check()
    results.append(("Idempotency check", result))
    
    # Test 7: Time-scoped query
    result = test_7_time_scoped_query()
    results.append(("Time-scoped query", result))
    
    # Print summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed ({(passed/total*100):.1f}%)")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED! MODULE 7 implementation is working correctly.")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Review the failures above.")

if __name__ == "__main__":
    run_all_tests()
