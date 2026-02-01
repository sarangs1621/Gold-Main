#!/usr/bin/env python3
"""
Test report endpoints directly to capture actual errors
"""
import sys
import asyncio
sys.path.insert(0, '/app/backend')

from server import app
from fastapi.testclient import TestClient

client = TestClient(app)

# Create a test user token first
login_response = client.post("/api/auth/login", json={
    "username": "admin",
    "password": "admin123"
})

if login_response.status_code == 200:
    token = login_response.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    print("=" * 80)
    print("Testing FAILING endpoints:")
    print("=" * 80)
    
    # Test Inventory Excel Export
    print("\n1. Testing Inventory Excel Export...")
    try:
        response = client.get(
            "/api/reports/inventory-export?start_date=2026-02-01&end_date=2026-02-01",
            headers=headers
        )
        print(f"Status: {response.status_code}")
        if response.status_code != 200:
            print(f"Error: {response.text[:500]}")
    except Exception as e:
        print(f"Exception: {str(e)}")
    
    # Test Invoice Excel Export
    print("\n2. Testing Invoice Excel Export...")
    try:
        response = client.get(
            "/api/reports/invoices-export?start_date=2026-02-01&end_date=2026-02-01",
            headers=headers
        )
        print(f"Status: {response.status_code}")
        if response.status_code != 200:
            print(f"Error: {response.text[:500]}")
    except Exception as e:
        print(f"Exception: {str(e)}")
    
    # Test Outstanding PDF
    print("\n3. Testing Outstanding PDF...")
    try:
        response = client.get(
            "/api/reports/outstanding-pdf",
            headers=headers
        )
        print(f"Status: {response.status_code}")
        if response.status_code != 200:
            print(f"Error: {response.text[:500]}")
    except Exception as e:
        print(f"Exception: {str(e)}")
    
    # Test Transaction PDF
    print("\n4. Testing Transaction PDF...")
    try:
        response = client.get(
            "/api/reports/transactions-pdf?start_date=2026-02-01&end_date=2026-02-01",
            headers=headers
        )
        print(f"Status: {response.status_code}")
        if response.status_code != 200:
            print(f"Error: {response.text[:500]}")
    except Exception as e:
        print(f"Exception: {str(e)}")
    
    # Test Sales History PDF
    print("\n5. Testing Sales History PDF...")
    try:
        response = client.get(
            "/api/reports/sales-history-pdf?date_from=2026-02-01&date_to=2026-02-01",
            headers=headers
        )
        print(f"Status: {response.status_code}")
        if response.status_code != 200:
            print(f"Error: {response.text[:500]}")
    except Exception as e:
        print(f"Exception: {str(e)}")
    
    print("\n" + "=" * 80)
    print("Testing WORKING endpoints for comparison:")
    print("=" * 80)
    
    # Test Parties PDF (working)
    print("\n6. Testing Parties PDF (should work)...")
    try:
        response = client.get(
            "/api/reports/parties-pdf",
            headers=headers
        )
        print(f"Status: {response.status_code}")
        if response.status_code != 200:
            print(f"Error: {response.text[:500]}")
    except Exception as e:
        print(f"Exception: {str(e)}")
    
else:
    print(f"Login failed: {login_response.text}")
