#!/usr/bin/env python3
"""
Stock Reconciliation Script
Calculates current stock totals from stock movements and updates inventory headers
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent / 'backend'
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'gold_shop_erp')

async def reconcile_inventory_stock():
    """Reconcile inventory stock from movements"""
    print("="*80)
    print("INVENTORY STOCK RECONCILIATION")
    print("="*80)
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Step 1: Get all inventory headers
    print("\n[Step 1] Fetching inventory headers...")
    headers = await db.inventory_headers.find({"is_deleted": False}).to_list(1000)
    print(f"  ✓ Found {len(headers)} inventory headers")
    
    # Step 2: Get all stock movements
    print("\n[Step 2] Fetching stock movements...")
    movements = await db.stock_movements.find({"is_deleted": False}).to_list(10000)
    print(f"  ✓ Found {len(movements)} stock movements")
    
    # Step 3: Calculate totals from movements
    print("\n[Step 3] Calculating stock totals from movements...")
    header_totals = {}
    
    for movement in movements:
        header_id = movement.get('header_id')
        if not header_id:
            continue
            
        if header_id not in header_totals:
            header_totals[header_id] = {
                'qty': 0.0,
                'weight': 0.0
            }
        
        # Add the deltas
        qty_delta = movement.get('qty_delta', 0)
        weight_delta = movement.get('weight_delta', 0)
        
        header_totals[header_id]['qty'] += qty_delta
        header_totals[header_id]['weight'] += weight_delta
    
    print(f"  ✓ Calculated totals for {len(header_totals)} headers")
    
    # Step 4: Update inventory headers with calculated totals
    print("\n[Step 4] Updating inventory headers...")
    updated_count = 0
    
    for header in headers:
        header_id = header['id']
        header_name = header['name']
        
        # Get calculated totals (default to 0 if no movements)
        calculated_qty = header_totals.get(header_id, {}).get('qty', 0.0)
        calculated_weight = header_totals.get(header_id, {}).get('weight', 0.0)
        
        # Ensure non-negative values
        calculated_qty = max(0, calculated_qty)
        calculated_weight = max(0, calculated_weight)
        
        # Get current values
        current_qty = header.get('current_qty', 0)
        current_weight = header.get('current_weight', 0)
        
        # Update if different or missing
        if abs(current_qty - calculated_qty) > 0.001 or abs(current_weight - calculated_weight) > 0.001:
            await db.inventory_headers.update_one(
                {"id": header_id},
                {
                    "$set": {
                        "current_qty": round(calculated_qty, 2),
                        "current_weight": round(calculated_weight, 3)
                    }
                }
            )
            updated_count += 1
            print(f"  ✓ Updated {header_name}:")
            print(f"      Old: qty={current_qty}, weight={current_weight}g")
            print(f"      New: qty={round(calculated_qty, 2)}, weight={round(calculated_weight, 3)}g")
    
    print(f"\n  ✓ Updated {updated_count} inventory headers")
    
    # Step 5: Verification
    print("\n[Step 5] Verification...")
    updated_headers = await db.inventory_headers.find({"is_deleted": False}).to_list(1000)
    
    total_qty = sum(h.get('current_qty', 0) for h in updated_headers)
    total_weight = sum(h.get('current_weight', 0) for h in updated_headers)
    headers_with_stock = len([h for h in updated_headers if h.get('current_qty', 0) > 0])
    
    print(f"\n  Total categories: {len(updated_headers)}")
    print(f"  Categories with stock: {headers_with_stock}")
    print(f"  Total quantity across all categories: {round(total_qty, 2)}")
    print(f"  Total weight across all categories: {round(total_weight, 3)}g")
    
    print("\n" + "="*80)
    print("✅ STOCK RECONCILIATION COMPLETED SUCCESSFULLY!")
    print("="*80)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(reconcile_inventory_stock())
