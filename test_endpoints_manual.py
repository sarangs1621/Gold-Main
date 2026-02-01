#!/usr/bin/env python3
"""Test the failing endpoints by importing and calling them"""
import sys
import os
sys.path.insert(0, '/app/backend')
os.chdir('/app/backend')

# Set up environment
from dotenv import load_dotenv
load_dotenv('/app/backend/.env')

import asyncio
from server import (
    export_inventory, 
    export_invoices,
    export_outstanding,
    export_transactions,
    export_outstanding_pdf,
    export_transactions_pdf,
    export_sales_history_pdf
)

# Mock user object
class MockUser:
    user_id = "test_user"
    username = "admin"
    role = "admin"
    permissions = ["reports.view"]

async def test_endpoints():
    user = MockUser()
    
    print("=" * 80)
    print("Testing INVENTORY EXCEL EXPORT")
    print("=" * 80)
    try:
        result = await export_inventory(
            start_date="2026-02-01",
            end_date="2026-02-01",
            movement_type=None,
            category=None,
            current_user=user
        )
        print(f"✅ SUCCESS: {type(result)}")
    except Exception as e:
        print(f"❌ FAILED: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "=" * 80)
    print("Testing INVOICE EXCEL EXPORT")
    print("=" * 80)
    try:
        result = await export_invoices(
            start_date="2026-02-01",
            end_date="2026-02-01",
            invoice_type=None,
            payment_status=None,
            current_user=user
        )
        print(f"✅ SUCCESS: {type(result)}")
    except Exception as e:
        print(f"❌ FAILED: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "=" * 80)
    print("Testing OUTSTANDING PDF")
    print("=" * 80)
    try:
        result = await export_outstanding_pdf(
            party_id=None,
            party_type=None,
            start_date=None,
            end_date=None,
            current_user=user
        )
        print(f"✅ SUCCESS: {type(result)}")
    except Exception as e:
        print(f"❌ FAILED: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "=" * 80)
    print("Testing TRANSACTIONS PDF")
    print("=" * 80)
    try:
        result = await export_transactions_pdf(
            start_date="2026-02-01",
            end_date="2026-02-01",
            transaction_type=None,
            party_id=None,
            current_user=user
        )
        print(f"✅ SUCCESS: {type(result)}")
    except Exception as e:
        print(f"❌ FAILED: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "=" * 80)
    print("Testing SALES HISTORY PDF")
    print("=" * 80)
    try:
        result = await export_sales_history_pdf(
            date_from="2026-02-01",
            date_to="2026-02-01",
            party_id=None,
            search=None,
            current_user=user
        )
        print(f"✅ SUCCESS: {type(result)}")
    except Exception as e:
        print(f"❌ FAILED: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_endpoints())
