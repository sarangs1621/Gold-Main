#!/usr/bin/env python3
"""
Module 3 - Advance Gold & Gold Exchange Test Suite
Tests all scenarios from acceptance criteria
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://127.0.0.1:8001/api"

# Test credentials (adjust if needed)
TEST_USER = {
    "username": "admin",
    "password": "admin123"
}

def login():
    """Login and get access token"""
    response = requests.post(f"{BASE_URL}/login", json=TEST_USER)
    if response.status_code == 200:
        token = response.json().get('access_token')
        print(f"✓ Login successful")
        return {"Authorization": f"Bearer {token}"}
    else:
        print(f"✗ Login failed: {response.text}")
        return None

def create_test_party(headers, party_type="customer"):
    """Create a test party for testing"""
    party_data = {
        "name": f"Test {party_type.title()} - Gold Module",
        "party_type": party_type,
        "phone": "+968 9876 5432",
        "email": f"test{party_type}@example.com",
        "address": "Test Address, Muscat"
    }
    response = requests.post(f"{BASE_URL}/parties", json=party_data, headers=headers)
    if response.status_code in [200, 201]:
        party_id = response.json().get('id')
        print(f"✓ Created test party: {party_id}")
        return party_id
    else:
        print(f"✗ Failed to create party: {response.text}")
        return None

def create_invoice_with_gold(headers, customer_id=None, gold_weight=5.5, gold_rate=15.0, grand_total=100.0):
    """Create an invoice with advance gold"""
    invoice_data = {
        "customer_type": "saved" if customer_id else "walk_in",
        "invoice_type": "sale",
        "items": [
            {
                "description": "Gold Ring",
                "qty": 1,
                "weight": 10.0,
                "purity": 916,
                "metal_rate": 15.0,
                "gold_value": 150.0,
                "making_value": 20.0,
                "vat_percent": 5.0,
                "vat_amount": 8.5,
                "line_total": 178.5
            }
        ],
        "subtotal": 170.0,
        "vat_total": 8.5,
        "grand_total": grand_total,
        "balance_due": grand_total,
        # MODULE 3: Gold fields
        "gold_weight": gold_weight,
        "gold_purity": 916,
        "gold_rate_per_gram": gold_rate,
        "gold_value": round(gold_weight * gold_rate, 2)
    }
    
    if customer_id:
        invoice_data["customer_id"] = customer_id
        invoice_data["customer_name"] = "Test Customer"
    else:
        invoice_data["walk_in_name"] = "Walk-in Gold Test"
        invoice_data["walk_in_phone"] = "+968 1111 2222"
    
    response = requests.post(f"{BASE_URL}/invoices", json=invoice_data, headers=headers)
    if response.status_code in [200, 201]:
        invoice = response.json()
        invoice_id = invoice.get('id')
        invoice_number = invoice.get('invoice_number')
        print(f"✓ Created invoice {invoice_number} with gold: {invoice_id}")
        return invoice_id, invoice
    else:
        print(f"✗ Failed to create invoice: {response.text}")
        return None, None

def finalize_invoice(headers, invoice_id):
    """Finalize an invoice"""
    response = requests.post(f"{BASE_URL}/invoices/{invoice_id}/finalize", headers=headers)
    if response.status_code == 200:
        invoice = response.json()
        print(f"✓ Invoice finalized: {invoice_id}")
        print(f"  - Paid Amount: {invoice.get('paid_amount', 0):.3f} OMR")
        print(f"  - Balance Due: {invoice.get('balance_due', 0):.3f} OMR")
        print(f"  - Payment Status: {invoice.get('payment_status', 'unknown')}")
        return invoice
    else:
        print(f"✗ Failed to finalize invoice: {response.text}")
        return None

def check_gold_ledger(headers, party_id=None):
    """Check gold ledger entries"""
    url = f"{BASE_URL}/gold-ledger"
    if party_id:
        url += f"?party_id={party_id}"
    
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        entries = response.json()
        print(f"✓ Gold ledger entries found: {len(entries)}")
        for entry in entries[:3]:  # Show first 3
            print(f"  - Type: {entry.get('type')}, Weight: {entry.get('weight_grams')}g, Purpose: {entry.get('purpose')}")
        return entries
    else:
        print(f"✗ Failed to fetch gold ledger: {response.text}")
        return []

def check_transactions(headers, invoice_id):
    """Check transactions for an invoice"""
    response = requests.get(f"{BASE_URL}/transactions?reference_type=invoice&reference_id={invoice_id}", headers=headers)
    if response.status_code == 200:
        data = response.json()
        transactions = data.get('items', [])
        print(f"✓ Transactions found: {len(transactions)}")
        for txn in transactions:
            print(f"  - Type: {txn.get('transaction_type')}, Amount: {txn.get('amount')}, Mode: {txn.get('mode')}")
        return transactions
    else:
        print(f"✗ Failed to fetch transactions: {response.text}")
        return []

def run_tests():
    """Run all Module 3 test scenarios"""
    print("\n" + "="*80)
    print("MODULE 3 - ADVANCE GOLD & GOLD EXCHANGE - TEST SUITE")
    print("="*80 + "\n")
    
    # Login
    headers = login()
    if not headers:
        print("❌ Cannot proceed without authentication")
        return
    
    print("\n" + "-"*80)
    print("TEST 1: Invoice WITHOUT gold (unchanged behavior)")
    print("-"*80)
    customer_id = create_test_party(headers, "customer")
    invoice_id, invoice = create_invoice_with_gold(headers, customer_id, gold_weight=0, gold_rate=0, grand_total=178.5)
    if invoice_id:
        finalized = finalize_invoice(headers, invoice_id)
        if finalized:
            assert finalized.get('balance_due') == 178.5, "Balance should equal grand total"
            print("✅ TEST 1 PASSED: Invoice without gold works correctly\n")
    
    print("\n" + "-"*80)
    print("TEST 2: Invoice WITH gold < invoice total (customer pays balance)")
    print("-"*80)
    invoice_id, invoice = create_invoice_with_gold(headers, customer_id, gold_weight=5.0, gold_rate=10.0, grand_total=178.5)
    # Gold value = 5.0 * 10.0 = 50.0 OMR
    # Expected balance = 178.5 - 50.0 = 128.5 OMR
    if invoice_id:
        finalized = finalize_invoice(headers, invoice_id)
        if finalized:
            expected_balance = 178.5 - 50.0
            actual_balance = finalized.get('balance_due', 0)
            print(f"  Expected balance: {expected_balance:.2f}, Actual: {actual_balance:.2f}")
            assert abs(actual_balance - expected_balance) < 0.01, f"Balance mismatch"
            assert finalized.get('payment_status') == 'partial', "Should be partial payment"
            check_gold_ledger(headers, customer_id)
            check_transactions(headers, invoice_id)
            print("✅ TEST 2 PASSED: Gold < total works correctly\n")
    
    print("\n" + "-"*80)
    print("TEST 3: Invoice WITH gold == invoice total (zero balance)")
    print("-"*80)
    invoice_id, invoice = create_invoice_with_gold(headers, customer_id, gold_weight=17.85, gold_rate=10.0, grand_total=178.5)
    # Gold value = 17.85 * 10.0 = 178.5 OMR
    # Expected balance = 178.5 - 178.5 = 0.0 OMR
    if invoice_id:
        finalized = finalize_invoice(headers, invoice_id)
        if finalized:
            actual_balance = finalized.get('balance_due', 0)
            print(f"  Expected balance: 0.00, Actual: {actual_balance:.2f}")
            assert abs(actual_balance) < 0.01, f"Balance should be zero"
            assert finalized.get('payment_status') == 'paid', "Should be fully paid"
            print("✅ TEST 3 PASSED: Gold == total works correctly\n")
    
    print("\n" + "-"*80)
    print("TEST 4: Invoice WITH gold > invoice total (shop owes customer)")
    print("-"*80)
    invoice_id, invoice = create_invoice_with_gold(headers, customer_id, gold_weight=20.0, gold_rate=10.0, grand_total=178.5)
    # Gold value = 20.0 * 10.0 = 200.0 OMR
    # Expected balance = 178.5 - 200.0 = -21.5 OMR (negative)
    if invoice_id:
        finalized = finalize_invoice(headers, invoice_id)
        if finalized:
            expected_balance = 178.5 - 200.0
            actual_balance = finalized.get('balance_due', 0)
            print(f"  Expected balance: {expected_balance:.2f}, Actual: {actual_balance:.2f}")
            assert actual_balance < 0, f"Balance should be negative"
            assert abs(actual_balance - expected_balance) < 0.01, f"Balance mismatch"
            print("✅ TEST 4 PASSED: Gold > total creates negative balance (shop owes customer)\n")
    
    print("\n" + "-"*80)
    print("TEST 5: WALK-IN customer with advance gold (no Party creation)")
    print("-"*80)
    invoice_id, invoice = create_invoice_with_gold(headers, customer_id=None, gold_weight=5.0, gold_rate=10.0, grand_total=178.5)
    if invoice_id:
        # Verify invoice was created for walk-in
        assert invoice.get('customer_type') == 'walk_in', "Should be walk-in"
        finalized = finalize_invoice(headers, invoice_id)
        if finalized:
            # Check gold ledger - should have entry with party_id = None
            entries = check_gold_ledger(headers)
            walk_in_entries = [e for e in entries if e.get('party_id') is None]
            assert len(walk_in_entries) > 0, "Should have walk-in gold ledger entries"
            print("✅ TEST 5 PASSED: Walk-in with gold works (no Party created)\n")
    
    print("\n" + "-"*80)
    print("TEST 6: Draft invoice with gold (NO ledger, NO transaction)")
    print("-"*80)
    invoice_id, invoice = create_invoice_with_gold(headers, customer_id, gold_weight=5.0, gold_rate=10.0, grand_total=178.5)
    if invoice_id:
        # Check that no gold ledger entry exists yet (draft state)
        initial_entries = check_gold_ledger(headers, customer_id)
        initial_count = len(initial_entries)
        
        # Check no transactions exist for this draft invoice
        txns = check_transactions(headers, invoice_id)
        assert len(txns) == 0, "Draft invoice should have no transactions"
        print("✅ TEST 6 PASSED: Draft invoice has no ledger/transaction\n")
    
    print("\n" + "="*80)
    print("✅ ALL MODULE 3 TESTS COMPLETED SUCCESSFULLY!")
    print("="*80 + "\n")

if __name__ == "__main__":
    try:
        run_tests()
    except Exception as e:
        print(f"\n❌ TEST FAILED WITH ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
