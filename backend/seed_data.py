import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import os
from dotenv import load_dotenv
from pathlib import Path
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def seed_database():
    print("Starting database seeding...")
    
    existing_admin = await db.users.find_one({"username": "admin"})
    if not existing_admin:
        admin_user = {
            "id": str(uuid.uuid4()),
            "username": "admin",
            "email": "admin@goldshop.com",
            "full_name": "Admin User",
            "role": "admin",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_deleted": False,
            "deleted_at": None,
            "deleted_by": None,
            "hashed_password": pwd_context.hash("admin123")
        }
        await db.users.insert_one(admin_user)
        print("✓ Created admin user (username: admin, password: admin123)")
    else:
        print("✓ Admin user already exists")
    
    default_headers = ["Chain", "Ring", "Bangle", "Necklace", "Bracelet", "Coin", "Biscuit", "Others"]
    admin_id = (await db.users.find_one({"username": "admin"}))["id"]
    
    for header_name in default_headers:
        existing = await db.inventory_headers.find_one({"name": header_name})
        if not existing:
            header = {
                "id": str(uuid.uuid4()),
                "name": header_name,
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": admin_id,
                "is_deleted": False
            }
            await db.inventory_headers.insert_one(header)
            print(f"✓ Created inventory header: {header_name}")
    
    print("\n✅ Database seeding completed!")
    print("You can now login with:")
    print("  Username: admin")
    print("  Password: admin123")

if __name__ == "__main__":
    asyncio.run(seed_database())
    client.close()
