"""
ACCOUNTING DATA BACKUP SCRIPT
==============================
Creates a complete backup of all accounting-related data before migration.
Backup can be used to restore system if migration fails.

Usage:
    python backup_accounting_data.py
"""

import asyncio
import json
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from datetime import datetime, timezone
from pathlib import Path

# Load environment
load_dotenv()

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

def datetime_converter(obj):
    """Convert datetime objects to ISO format for JSON serialization"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

async def backup_accounting_data():
    """Create comprehensive backup of accounting data"""
    
    print("=" * 80)
    print("ACCOUNTING DATA BACKUP - STARTING")
    print("=" * 80)
    
    # Create backup directory
    backup_dir = Path("/app/backup")
    backup_dir.mkdir(exist_ok=True)
    
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    backup_file = backup_dir / f"accounting_backup_{timestamp}.json"
    
    print(f"\nBackup location: {backup_file}")
    
    # Collect all data
    backup_data = {
        "backup_timestamp": datetime.now(timezone.utc).isoformat(),
        "backup_type": "accounting_full",
        "collections": {}
    }
    
    # Backup accounts
    print("\n[1/5] Backing up accounts...")
    accounts = await db.accounts.find({}, {"_id": 0}).to_list(None)
    backup_data["collections"]["accounts"] = accounts
    print(f"  ✓ Backed up {len(accounts)} accounts")
    
    # Backup transactions
    print("[2/5] Backing up transactions...")
    transactions = await db.transactions.find({}, {"_id": 0}).to_list(None)
    backup_data["collections"]["transactions"] = transactions
    print(f"  ✓ Backed up {len(transactions)} transactions")
    
    # Backup invoices (for reference)
    print("[3/5] Backing up invoices...")
    invoices = await db.invoices.find({}, {"_id": 0}).to_list(None)
    backup_data["collections"]["invoices"] = invoices
    print(f"  ✓ Backed up {len(invoices)} invoices")
    
    # Backup daily closings
    print("[4/5] Backing up daily closings...")
    daily_closings = await db.daily_closings.find({}, {"_id": 0}).to_list(None)
    backup_data["collections"]["daily_closings"] = daily_closings
    print(f"  ✓ Backed up {len(daily_closings)} daily closings")
    
    # Backup gold ledger (related to gold exchange payments)
    print("[5/5] Backing up gold ledger...")
    gold_ledger = await db.gold_ledger.find({}, {"_id": 0}).to_list(None)
    backup_data["collections"]["gold_ledger"] = gold_ledger
    print(f"  ✓ Backed up {len(gold_ledger)} gold ledger entries")
    
    # Calculate statistics
    stats = {
        "total_accounts": len(accounts),
        "total_transactions": len(transactions),
        "active_transactions": len([t for t in transactions if not t.get('is_deleted', False)]),
        "deleted_transactions": len([t for t in transactions if t.get('is_deleted', False)]),
        "total_invoices": len(invoices),
        "finalized_invoices": len([i for i in invoices if i.get('status') == 'finalized']),
        "invoices_with_payments": len([i for i in invoices if i.get('paid_amount', 0) > 0]),
    }
    backup_data["statistics"] = stats
    
    # Write backup file
    print("\nWriting backup file...")
    with open(backup_file, 'w') as f:
        json.dump(backup_data, f, indent=2, default=datetime_converter)
    
    file_size_mb = backup_file.stat().st_size / (1024 * 1024)
    print(f"  ✓ Backup file created: {file_size_mb:.2f} MB")
    
    # Print statistics
    print("\n" + "=" * 80)
    print("BACKUP STATISTICS")
    print("=" * 80)
    for key, value in stats.items():
        print(f"  {key.replace('_', ' ').title()}: {value}")
    
    print("\n" + "=" * 80)
    print("BACKUP COMPLETED SUCCESSFULLY")
    print("=" * 80)
    print(f"\nBackup saved to: {backup_file}")
    print("\nTo restore from this backup:")
    print(f"  python restore_accounting_data.py {backup_file}")
    print("=" * 80)
    
    return str(backup_file)

if __name__ == "__main__":
    asyncio.run(backup_accounting_data())
