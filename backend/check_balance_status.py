"""
Quick check script to see current transaction balance status
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

async def check_status():
    print("\n" + "=" * 80)
    print("CURRENT TRANSACTION BALANCE STATUS")
    print("=" * 80 + "\n")
    
    # Total transactions
    total = await db.transactions.count_documents({"is_deleted": False})
    print(f"Total active transactions: {total}")
    
    # Transactions with balance tracking
    with_balance = await db.transactions.count_documents({
        "is_deleted": False,
        "has_balance": True,
        "balance_before": {"$ne": None}
    })
    
    # Transactions without balance tracking
    without_balance = total - with_balance
    
    print(f"\nTransactions with balance tracking: {with_balance} ({100*with_balance/max(total,1):.1f}%)")
    print(f"Transactions without balance tracking: {without_balance} ({100*without_balance/max(total,1):.1f}%)")
    
    # Sample transactions without balance
    if without_balance > 0:
        print(f"\nSample transactions missing balance tracking:")
        samples = await db.transactions.find(
            {
                "is_deleted": False,
                "$or": [
                    {"has_balance": {"$ne": True}},
                    {"balance_before": None}
                ]
            },
            {"_id": 0, "transaction_number": 1, "date": 1, "account_name": 1, "amount": 1}
        ).limit(5).to_list(5)
        
        for txn in samples:
            print(f"  - {txn.get('transaction_number')}: {txn.get('account_name')} - ₹{txn.get('amount', 0):,.2f}")
    
    print("\n" + "=" * 80)
    
    if without_balance > 0:
        print("\n⚠ ACTION REQUIRED: Run migration to fix missing balances")
        print("\nNext steps:")
        print("  1. Dry run: python migrate_transaction_balances.py --dry-run")
        print("  2. Execute: python migrate_transaction_balances.py --execute")
    else:
        print("\n✓ All transactions have balance tracking!")
    
    print("=" * 80 + "\n")

if __name__ == "__main__":
    asyncio.run(check_status())
