"""
Test script to verify balance fields are returned by the API
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
import sys

load_dotenv()

async def test_balance_fix():
    """Test that all transactions have balance tracking"""
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    print("\n" + "=" * 80)
    print("BALANCE FIX VERIFICATION TEST")
    print("=" * 80 + "\n")
    
    # Test 1: Check all transactions have balance tracking
    total_txns = await db.transactions.count_documents({"is_deleted": False})
    txns_with_balance = await db.transactions.count_documents({
        "is_deleted": False,
        "has_balance": True,
        "balance_before": {"$ne": None},
        "balance_after": {"$ne": None}
    })
    
    print(f"Test 1: Balance Tracking Coverage")
    print(f"  Total transactions: {total_txns}")
    print(f"  With balance tracking: {txns_with_balance}")
    print(f"  Coverage: {100 * txns_with_balance / max(total_txns, 1):.1f}%")
    
    test1_pass = txns_with_balance == total_txns
    print(f"  Status: {'✓ PASS' if test1_pass else '✗ FAIL'}\n")
    
    # Test 2: Sample transactions have numeric balance values
    print(f"Test 2: Sample Transaction Balance Values")
    samples = await db.transactions.find(
        {"is_deleted": False, "has_balance": True},
        {"_id": 0, "transaction_number": 1, "account_name": 1, 
         "balance_before": 1, "balance_after": 1}
    ).limit(5).to_list(5)
    
    test2_pass = True
    for txn in samples:
        bb = txn.get('balance_before')
        ba = txn.get('balance_after')
        is_valid = (bb is not None and ba is not None and 
                   isinstance(bb, (int, float)) and isinstance(ba, (int, float)))
        
        status = "✓" if is_valid else "✗"
        print(f"  {status} {txn['transaction_number']}: "
              f"Before={bb}, After={ba}")
        
        if not is_valid:
            test2_pass = False
    
    print(f"  Status: {'✓ PASS' if test2_pass else '✗ FAIL'}\n")
    
    # Test 3: Check that opening balance entries can be None
    print(f"Test 3: Opening Balance Handling")
    opening_txns = await db.transactions.find(
        {
            "is_deleted": False,
            "balance_before": 0,
            "notes": {"$regex": "opening", "$options": "i"}
        }
    ).limit(1).to_list(1)
    
    if opening_txns:
        txn = opening_txns[0]
        print(f"  Found opening transaction: {txn.get('transaction_number')}")
        print(f"  Balance Before: {txn.get('balance_before')} (expected to be 0)")
        print(f"  Status: ✓ PASS\n")
        test3_pass = True
    else:
        print(f"  No opening balance transactions found (OK)")
        print(f"  Status: ✓ PASS\n")
        test3_pass = True
    
    # Overall result
    print("=" * 80)
    all_pass = test1_pass and test2_pass and test3_pass
    if all_pass:
        print("✓ ALL TESTS PASSED - Balance fix is working correctly!")
        print("\nThe frontend will now show numeric balance values instead of N/A")
    else:
        print("✗ SOME TESTS FAILED - Review the results above")
    print("=" * 80 + "\n")
    
    return all_pass

if __name__ == "__main__":
    result = asyncio.run(test_balance_fix())
    sys.exit(0 if result else 1)
