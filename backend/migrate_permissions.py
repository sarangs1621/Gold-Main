#!/usr/bin/env python3
"""
Migration script to add permissions to existing users based on their roles.
Run this after deploying the RBAC system to populate permissions for existing users.
"""

import asyncio
import os
import sys
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Role-Permission Mappings (must match server.py)
ROLE_PERMISSIONS = {
    'admin': [
        'users.view', 'users.create', 'users.update', 'users.delete',
        'parties.view', 'parties.create', 'parties.update', 'parties.delete',
        'invoices.view', 'invoices.create', 'invoices.finalize', 'invoices.delete',
        'purchases.view', 'purchases.create', 'purchases.finalize', 'purchases.delete',
        'finance.view', 'finance.create', 'finance.delete',
        'inventory.view', 'inventory.adjust',
        'jobcards.view', 'jobcards.create', 'jobcards.update', 'jobcards.delete',
        'reports.view',
        'audit.view',
    ],
    'manager': [
        'users.view', 'users.create', 'users.update',
        'parties.view', 'parties.create', 'parties.update', 'parties.delete',
        'invoices.view', 'invoices.create', 'invoices.finalize',
        'purchases.view', 'purchases.create', 'purchases.finalize',
        'finance.view', 'finance.create',
        'inventory.view', 'inventory.adjust',
        'jobcards.view', 'jobcards.create', 'jobcards.update', 'jobcards.delete',
        'reports.view',
    ],
    'staff': [
        'parties.view',
        'invoices.view', 'invoices.create',
        'purchases.view', 'purchases.create',
        'finance.view',
        'inventory.view',
        'jobcards.view', 'jobcards.create', 'jobcards.update',
        'reports.view',
    ],
}

async def migrate_permissions():
    """Add permissions to all existing users based on their roles"""
    
    # Connect to MongoDB
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME')
    
    if not mongo_url or not db_name:
        print("ERROR: MONGO_URL and DB_NAME must be set in .env file")
        sys.exit(1)
    
    print(f"Connecting to MongoDB: {db_name}")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    try:
        # Get all users
        users = await db.users.find({"is_deleted": False}).to_list(10000)
        print(f"Found {len(users)} active users")
        
        updated_count = 0
        for user in users:
            user_id = user.get('id')
            username = user.get('username')
            role = user.get('role', 'staff')
            current_permissions = user.get('permissions', [])
            
            # Get permissions for role
            role_permissions = ROLE_PERMISSIONS.get(role, ROLE_PERMISSIONS['staff'])
            
            # Only update if permissions are different
            if set(current_permissions) != set(role_permissions):
                await db.users.update_one(
                    {"id": user_id},
                    {"$set": {
                        "permissions": role_permissions,
                        "failed_login_attempts": 0,
                        "locked_until": None
                    }}
                )
                updated_count += 1
                print(f"✓ Updated user: {username} (role: {role}, {len(role_permissions)} permissions)")
            else:
                print(f"  Skipped user: {username} (already has correct permissions)")
        
        print(f"\n✅ Migration complete! Updated {updated_count} users")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    print("=" * 70)
    print("RBAC Permission Migration Script")
    print("=" * 70)
    print()
    asyncio.run(migrate_permissions())
