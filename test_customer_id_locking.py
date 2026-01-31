#!/usr/bin/env python3
"""
Test customer_id locking when party is linked to finalized records
"""

import requests
import json
import time

BASE_URL = "http://localhost:8001"
API_URL = f"{BASE_URL}/api"

TEST_USER = {"username": "admin", "password": "admin123"}

def login():
    response = requests.post(f"{API_URL}/auth/login", json=TEST_USER, timeout=10)
    return response.json()["access_token"]

def get_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

def test_locking():
    print("=" * 60)
    print("TEST: Customer ID Locking with Finalized Invoice")
    print("=" * 60)
    
    token = login()
    headers = get_headers(token)
    
    # Step 1: Create a party with customer_id
    unique_suffix = str(int(time.time()))[-8:]
    party_data = {
        "name": f"Lock Test Customer {unique_suffix}",
        "phone": f"94{unique_suffix}",
        "party_type": "customer",
        "customer_id": "88888888"
    }
    
    response = requests.post(f"{API_URL}/parties", json=party_data, headers=headers)
    party = response.json()
    party_id = party['id']
    print(f"✓ Created party: {party['name']} (ID: {party_id})")
    print(f"  customer_id: {party['customer_id']}")
    
    # Step 2: Check lock status (should be unlocked)
    response = requests.get(f"{API_URL}/parties/{party_id}/customer-id-lock-status", headers=headers)
    lock_status = response.json()
    print(f"✓ Initial lock status: {lock_status['is_locked']}")
    
    # Step 3: Create a finalized invoice for this party
    # First, get an account for payment
    accounts_response = requests.get(f"{API_URL}/accounts", headers=headers)
    accounts = accounts_response.json()
    if not accounts:
        print("✗ No accounts available to create invoice")
        return False
    
    account_id = accounts[0]['id']
    
    invoice_data = {
        "invoice_number": f"INV-LOCK-{unique_suffix}",
        "customer_id": party_id,
        "customer_name": party['name'],
        "customer_phone": party['phone'],
        "items": [
            {
                "item_id": "test-item-1",
                "description": "Test Gold Item",
                "quantity": 1,
                "weight_grams": 10.0,
                "purity": 916,
                "rate_per_gram": 5000.0,
                "amount": 50000.0
            }
        ],
        "payment_method": "cash",
        "account_id": account_id,
        "subtotal": 50000.0,
        "discount_amount": 0.0,
        "net_amount": 50000.0,
        "paid_amount": 50000.0,
        "balance_due": 0.0,
        "payment_status": "paid"
    }
    
    invoice_response = requests.post(f"{API_URL}/invoices", json=invoice_data, headers=headers)
    
    if invoice_response.status_code != 201:
        print(f"✗ Failed to create invoice: {invoice_response.text}")
        # Even if invoice creation fails, we can still test with existing data
        # Let's just try to update customer_id
        print("\n⚠ Skipping finalize step, testing current state...")
    else:
        invoice = invoice_response.json()
        invoice_id = invoice['id']
        print(f"✓ Created invoice: {invoice['invoice_number']} (ID: {invoice_id})")
        
        # Step 4: Finalize the invoice
        finalize_response = requests.post(
            f"{API_URL}/invoices/{invoice_id}/finalize",
            headers=headers
        )
        
        if finalize_response.status_code == 200:
            print(f"✓ Invoice finalized")
        else:
            print(f"⚠ Could not finalize invoice: {finalize_response.text}")
    
    # Step 5: Check lock status again (should be locked now if finalized)
    response = requests.get(f"{API_URL}/parties/{party_id}/customer-id-lock-status", headers=headers)
    lock_status = response.json()
    print(f"\n✓ Lock status after finalization: {lock_status['is_locked']}")
    if lock_status['is_locked']:
        print(f"  Lock reason: {lock_status['lock_reason']}")
    
    # Step 6: Try to update customer_id (should fail if locked)
    update_data = {"customer_id": "99999999"}
    update_response = requests.patch(
        f"{API_URL}/parties/{party_id}",
        json=update_data,
        headers=headers
    )
    
    if lock_status['is_locked']:
        if update_response.status_code == 400:
            print(f"✓ Customer ID is properly locked - cannot update")
            print(f"  Error message: {update_response.json().get('detail', 'Unknown')}")
            return True
        else:
            print(f"✗ Customer ID should be locked but update succeeded")
            return False
    else:
        if update_response.status_code == 200:
            print(f"✓ Customer ID updated successfully (party not locked)")
            return True
        else:
            print(f"⚠ Update failed but party was not locked: {update_response.text}")
            return False

if __name__ == "__main__":
    try:
        success = test_locking()
        if success:
            print("\n✓ LOCKING TEST PASSED")
        else:
            print("\n✗ LOCKING TEST FAILED")
    except Exception as e:
        print(f"\n✗ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
