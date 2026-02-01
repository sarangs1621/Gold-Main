"""
Database Initialization Script
Creates or fixes default users safely on startup.
- Hashes passwords correctly
- Resets account lockouts
- Safe to re-run multiple times
"""

import asyncio
import uuid
import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

# Password hashing (MUST match server.py)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Database config
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "gold_shop_erp")


async def upsert_user(db, *, username, password, role, full_name, email):
    """
    Create or update a user safely.
    - Ensures hashed password
    - Unlocks account
    - Resets failed attempts
    """
    hashed_password = pwd_context.hash(password)

    await db.users.update_one(
        {"username": username},
        {
            "$set": {
                "full_name": full_name,
                "email": email,
                "role": role,
                "hashed_password": hashed_password,
                "is_active": True,
                "is_deleted": False,
                "failed_login_attempts": 0,
                "locked_until": None,
                "updated_at": datetime.now(timezone.utc),
            },
            "$setOnInsert": {
                "id": str(uuid.uuid4()),
                "created_at": datetime.now(timezone.utc),
            },
        },
        upsert=True,
    )

    print(f"✅ User ensured: {username} / {password}")


async def initialize_database():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    try:
        print(f"\n🔄 Initializing database: {DB_NAME}\n")

        # --- ADMIN USER ---
        await upsert_user(
            db,
            username="admin",
            password="admin123",
            role="admin",
            full_name="Administrator",
            email="admin@goldshop.com",
        )

        # --- STAFF USER ---
        await upsert_user(
            db,
            username="staff",
            password="staff123",
            role="staff",
            full_name="Staff User",
            email="staff@goldshop.com",
        )

        print("\n✅ Database initialization completed successfully\n")

    except Exception as e:
        print(f"\n❌ Database initialization failed: {e}\n")

    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(initialize_database())
