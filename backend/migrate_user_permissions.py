#!/usr/bin/env python3
"""
Migration script to assign permissions to existing users based on their roles.
This script should be run after implementing the permission system.
"""

import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Role-Permission Mappings (same as in server.py)
ROLE_PERMISSIONS = {
    'admin': [
        # Admin has all permissions
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
        # Manager has most permissions except user deletion and audit logs
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
        # Staff has limited permissions - mostly view and create
        'parties.view',
        'invoices.view', 'invoices.create',
        'purchases.view', 'purchases.create',
        'finance.view',
        'inventory.view',
        'jobcards.view', 'jobcards.create', 'jobcards.update',
        'reports.view',
    ],
}

async def migrate_user_permissions():
    """Migrate existing users to have permissions based on their roles"""
    
    try:
        # Connect to MongoDB
        mongo_url = os.environ['MONGO_URL']
        db_name = os.environ.get('DB_NAME', 'gold_shop_erp')
        
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        
        print("🔗 Connected to MongoDB")
        print(f"📊 Database: {db_name}")
        print("=" * 60)
        
        # Get all non-deleted users
        users = await db.users.find({"is_deleted": False}).to_list(1000)
        
        print(f"👥 Found {len(users)} active users")
        print("=" * 60)
        
        updated_count = 0
        skipped_count = 0
        
        for user in users:
            user_id = user.get('id')
            username = user.get('username')
            role = user.get('role', 'staff')
            existing_permissions = user.get('permissions', [])
            
            # Get permissions for the role
            role_permissions = ROLE_PERMISSIONS.get(role, ROLE_PERMISSIONS['staff'])
            
            # Check if permissions need to be updated
            if set(existing_permissions) == set(role_permissions):
                print(f"⏭️  SKIP: {username} ({role}) - permissions already up to date")
                skipped_count += 1
                continue
            
            # Update user with permissions
            result = await db.users.update_one(
                {"id": user_id},
                {"$set": {"permissions": role_permissions}}
            )
            
            if result.modified_count > 0:
                print(f"✅ UPDATE: {username} ({role}) - assigned {len(role_permissions)} permissions")
                updated_count += 1
            else:
                print(f"⚠️  WARNING: Failed to update {username}")
        
        print("=" * 60)
        print(f"✅ Migration complete!")
        print(f"   - Updated: {updated_count} users")
        print(f"   - Skipped: {skipped_count} users (already up to date)")
        print(f"   - Total: {len(users)} users")
        print("=" * 60)
        
        # Show role distribution
        role_counts = {}
        for user in users:
            role = user.get('role', 'staff')
            role_counts[role] = role_counts.get(role, 0) + 1
        
        print("\n📊 Role Distribution:")
        for role, count in sorted(role_counts.items()):
            permissions_count = len(ROLE_PERMISSIONS.get(role, []))
            print(f"   {role.upper()}: {count} users ({permissions_count} permissions each)")
        
        # Close connection
        client.close()
        print("\n✅ Done!")
        
    except Exception as e:
        print(f"❌ Error during migration: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("🔐 PERMISSION MIGRATION SCRIPT")
    print("=" * 60)
    print("This script will assign permissions to all existing users")
    print("based on their roles (admin, manager, staff).")
    print("=" * 60)
    
    # Run the migration
    asyncio.run(migrate_user_permissions())
