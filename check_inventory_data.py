#!/usr/bin/env python3
"""Check inventory data in the database"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def check_data():
    # Connect to MongoDB
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'gold_shop_erp')
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("=" * 80)
    print("INVENTORY HEADERS CHECK")
    print("=" * 80)
    
    # Check inventory headers
    headers = await db.inventory_headers.find({"is_deleted": False}).to_list(20)
    print(f"Total inventory headers: {len(headers)}")
    print()
    
    if headers:
        print("Sample header data:")
        for i, h in enumerate(headers[:3], 1):
            print(f"\n{i}. Header: {h.get('name')}")
            print(f"   ID: {h.get('id')}")
            print(f"   current_qty: {h.get('current_qty', 'MISSING')}")
            print(f"   current_weight: {h.get('current_weight', 'MISSING')}")
            print(f"   is_active: {h.get('is_active')}")
    
    print("\n" + "=" * 80)
    print("STOCK MOVEMENTS CHECK")
    print("=" * 80)
    
    # Check stock movements
    movements = await db.stock_movements.find({"is_deleted": False}).to_list(100)
    print(f"Total stock movements: {len(movements)}")
    print()
    
    if movements:
        print("Sample movement data:")
        for i, m in enumerate(movements[:3], 1):
            print(f"\n{i}. Movement: {m.get('description')}")
            print(f"   Header: {m.get('header_name')}")
            print(f"   Type: {m.get('movement_type')}")
            print(f"   qty_delta: {m.get('qty_delta')}")
            print(f"   weight_delta: {m.get('weight_delta')}")
            print(f"   Date: {m.get('date')}")
    
    # Calculate what current totals SHOULD be based on movements
    print("\n" + "=" * 80)
    print("CALCULATED TOTALS FROM MOVEMENTS")
    print("=" * 80)
    
    header_totals = {}
    for movement in movements:
        header_id = movement.get('header_id')
        if header_id not in header_totals:
            header_totals[header_id] = {
                'header_name': movement.get('header_name'),
                'qty': 0,
                'weight': 0,
                'in_movements': 0,
                'out_movements': 0
            }
        
        qty_delta = movement.get('qty_delta', 0)
        weight_delta = movement.get('weight_delta', 0)
        
        header_totals[header_id]['qty'] += qty_delta
        header_totals[header_id]['weight'] += weight_delta
        
        if movement.get('movement_type') == 'IN':
            header_totals[header_id]['in_movements'] += 1
        else:
            header_totals[header_id]['out_movements'] += 1
    
    print(f"\nCalculated totals for {len(header_totals)} headers:\n")
    for header_id, totals in list(header_totals.items())[:5]:
        print(f"Header: {totals['header_name']}")
        print(f"  Calculated qty: {totals['qty']}")
        print(f"  Calculated weight: {round(totals['weight'], 3)}g")
        print(f"  IN movements: {totals['in_movements']}")
        print(f"  OUT movements: {totals['out_movements']}")
        print()
    
    # Compare with actual header data
    print("=" * 80)
    print("COMPARISON: CALCULATED vs STORED")
    print("=" * 80)
    
    headers_by_id = {h['id']: h for h in headers}
    
    print("\nHeaders with mismatched data:\n")
    mismatches = 0
    for header_id, calculated in header_totals.items():
        stored = headers_by_id.get(header_id, {})
        stored_qty = stored.get('current_qty', 0)
        stored_weight = stored.get('current_weight', 0)
        
        if abs(stored_qty - calculated['qty']) > 0.01 or abs(stored_weight - calculated['weight']) > 0.01:
            mismatches += 1
            print(f"❌ {calculated['header_name']}")
            print(f"   Stored: qty={stored_qty}, weight={stored_weight}g")
            print(f"   Calculated: qty={calculated['qty']}, weight={round(calculated['weight'], 3)}g")
            print(f"   Diff: qty={calculated['qty'] - stored_qty}, weight={round(calculated['weight'] - stored_weight, 3)}g")
            print()
    
    if mismatches == 0:
        print("✅ All headers match calculated values!")
    else:
        print(f"Found {mismatches} headers with mismatched data")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check_data())
