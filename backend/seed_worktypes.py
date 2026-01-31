"""
Seed default work types for job cards
Run this script once to populate the worktypes collection with default values
"""
import asyncio
import os
import uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def seed_worktypes():
    """Seed default work types if they don't exist"""
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    # Default work types
    default_worktypes = [
        "Polish",
        "Resize",
        "Repair",
        "Custom"
    ]
    
    print("Seeding work types...")
    
    for name in default_worktypes:
        # Check if work type already exists (case-insensitive)
        existing = await db.worktypes.find_one({
            "name": {"$regex": f"^{name}$", "$options": "i"},
            "is_deleted": False
        })
        
        if existing:
            print(f"  ✓ Work type '{name}' already exists")
        else:
            # Create new work type
            worktype = {
                "id": str(uuid.uuid4()),
                "name": name,
                "is_active": True,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
                "created_by": "system",
                "is_deleted": False
            }
            
            await db.worktypes.insert_one(worktype)
            print(f"  + Created work type '{name}'")
    
    print("\n✅ Work types seeded successfully!")
    
    # Display all work types
    all_worktypes = await db.worktypes.find({"is_deleted": False}).sort("name", 1).to_list(None)
    print(f"\nTotal work types in database: {len(all_worktypes)}")
    for wt in all_worktypes:
        status = "✓ Active" if wt.get("is_active") else "✗ Inactive"
        print(f"  - {wt['name']}: {status}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_worktypes())
