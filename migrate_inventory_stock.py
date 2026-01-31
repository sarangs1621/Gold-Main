#!/usr/bin/env python3
"""
Migration script to initialize current_qty and current_weight fields 
in inventory headers based on existing stock movements.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent / 'backend'
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

async def migrate_inventory():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("Starting inventory migration...")
    print("=" * 60)
    
    # Get all inventory headers
    headers = await db.inventory_headers.find({"is_deleted": False}).to_list(1000)
    print(f"Found {len(headers)} inventory headers")
    
    for header in headers:
        header_id = header['id']
        header_name = header['name']
        
        # Calculate total qty and weight from all stock movements
        pipeline = [
            {
                "$match": {
                    "header_id": header_id,
                    "is_deleted": False
                }
            },
            {
                "$group": {
                    "_id": None,
                    "total_qty": {"$sum": "$qty_delta"},
                    "total_weight": {"$sum": "$weight_delta"}
                }
            }
        ]
        
        result = await db.stock_movements.aggregate(pipeline).to_list(1)
        
        if result:
            total_qty = result[0]['total_qty']
            total_weight = result[0]['total_weight']
        else:
            total_qty = 0
            total_weight = 0
        
        # Update header with calculated values
        await db.inventory_headers.update_one(
            {"id": header_id},
            {"$set": {
                "current_qty": total_qty,
                "current_weight": total_weight
            }}
        )
        
        print(f"✓ {header_name}: {total_qty} qty, {total_weight:.3f}g")
    
    print("=" * 60)
    print("✅ Migration completed successfully!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(migrate_inventory())
