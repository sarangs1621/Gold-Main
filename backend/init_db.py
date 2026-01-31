"""
Database Initialization Script
Automatically creates default users on startup to prevent login issues
"""
import asyncio
import uuid
import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Get database configuration from environment
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'gold_shop_erp')

async def initialize_database():
    """Initialize database with default users if they don't exist"""
    try:
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        
        print(f"🔄 Initializing database: {DB_NAME}")
        
        # Create admin user if doesn't exist
        admin = await db.users.find_one({"username": "admin", "is_deleted": False})
        if not admin:
            admin_user = {
                "id": str(uuid.uuid4()),
                "username": "admin",
                "full_name": "Administrator",
                "email": "admin@goldshop.com",
                "hashed_password": pwd_context.hash("admin123"),
                "role": "admin",
                "is_active": True,
                "created_at": datetime.now(timezone.utc),
                "is_deleted": False
            }
            await db.users.insert_one(admin_user)
            print("✅ Default admin user created")
            print("   Username: admin")
            print("   Password: admin123")
        else:
            print("✅ Admin user already exists")
        
        # Create staff user if doesn't exist
        staff = await db.users.find_one({"username": "staff", "is_deleted": False})
        if not staff:
            staff_user = {
                "id": str(uuid.uuid4()),
                "username": "staff",
                "full_name": "Staff User",
                "email": "staff@goldshop.com",
                "hashed_password": pwd_context.hash("staff123"),
                "role": "staff",
                "is_active": True,
                "created_at": datetime.now(timezone.utc),
                "is_deleted": False
            }
            await db.users.insert_one(staff_user)
            print("✅ Default staff user created")
            print("   Username: staff")
            print("   Password: staff123")
        else:
            print("✅ Staff user already exists")
        
        print("✅ Database initialization complete\n")
        
        client.close()
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        # Don't fail startup, just log the error
        pass

if __name__ == "__main__":
    asyncio.run(initialize_database())
