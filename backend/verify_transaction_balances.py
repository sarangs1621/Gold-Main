"""
TRANSACTION BALANCE VERIFICATION SCRIPT
========================================
Verifies that all transactions have proper balance tracking.

This script checks:
1. Transactions with balance fields set
2. Running balance calculations are correct
3. Account balances match transaction history
4. No orphaned or invalid balance data

Usage:
    python verify_transaction_balances.py
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import os
from dotenv import load_dotenv
from pathlib import Path
import logging
from collections import defaultdict

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment
load_dotenv()

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


def safe_float(value, default=0.0) -> float:
    """Safely convert value to float"""
    if value is None:
        return default
    try:
        return float(str(value))
    except (ValueError, TypeError):
        return default


def calculate_balance_delta(account_type: str, transaction_type: str, amount: float) -> float:
    """Calculate balance change based on account type and transaction type"""
    account_type = account_type.lower()
    
    if account_type in ['asset', 'expense']:
        return amount if transaction_type == 'debit' else -amount
    else:  # income, liability, equity
        return amount if transaction_type == 'credit' else -amount


async def verify_transaction_balances():
    """Main verification function"""
    
    logger.info("=" * 80)
    logger.info("TRANSACTION BALANCE VERIFICATION")
    logger.info("=" * 80)
    
    # Statistics
    stats = {
        'total_accounts': 0,
        'total_transactions': 0,
        'transactions_with_balance': 0,
        'transactions_without_balance': 0,
        'accounts_with_errors': 0,
        'balance_mismatches': [],
        'accounts_by_type': defaultdict(int)
    }
    
    # Get all accounts
    accounts = await db.accounts.find({"is_deleted": False}, {"_id": 0}).to_list(None)
    stats['total_accounts'] = len(accounts)
    
    logger.info(f"\nFound {len(accounts)} accounts to verify\n")
    
    for idx, account in enumerate(accounts, 1):
        account_id = account['id']
        account_name = account['name']
        account_type = account.get('account_type', 'asset').lower()
        current_balance = safe_float(account.get('current_balance', 0))
        opening_balance = safe_float(account.get('opening_balance', 0))
        
        stats['accounts_by_type'][account_type] += 1
        
        logger.info(f"[{idx}/{len(accounts)}] {account_name} ({account_type.upper()})")
        logger.info(f"  Opening Balance: ₹{opening_balance:,.2f}")
        logger.info(f"  Current Balance: ₹{current_balance:,.2f}")
        
        # Get all transactions for this account
        transactions = await db.transactions.find(
            {"account_id": account_id, "is_deleted": False},
            {"_id": 0}
        ).sort("date", 1).to_list(None)
        
        if not transactions:
            logger.info("  No transactions - skipping\n")
            continue
        
        stats['total_transactions'] += len(transactions)
        
        # Check balance tracking
        with_balance = sum(1 for t in transactions if t.get('has_balance') and t.get('balance_before') is not None)
        without_balance = len(transactions) - with_balance
        
        stats['transactions_with_balance'] += with_balance
        stats['transactions_without_balance'] += without_balance
        
        logger.info(f"  Transactions: {len(transactions)} total")
        logger.info(f"    - With balance tracking: {with_balance}")
        logger.info(f"    - Without balance tracking: {without_balance}")
        
        # Verify running balances
        running_balance = opening_balance
        errors = []
        
        for txn_idx, txn in enumerate(transactions):
            txn_number = txn.get('transaction_number', 'N/A')
            txn_type = txn.get('transaction_type', 'debit')
            amount = safe_float(txn.get('amount', 0))
            
            # Check if transaction has balance tracking
            if not txn.get('has_balance') or txn.get('balance_before') is None:
                errors.append(f"Transaction {txn_number} missing balance tracking")
                continue
            
            balance_before = safe_float(txn.get('balance_before'))
            balance_after = safe_float(txn.get('balance_after'))
            
            # Verify balance_before matches running balance
            if abs(balance_before - running_balance) > 0.01:
                errors.append(
                    f"Transaction {txn_number}: balance_before mismatch - "
                    f"Expected ₹{running_balance:,.2f}, Got ₹{balance_before:,.2f}"
                )
            
            # Verify balance_after calculation
            delta = calculate_balance_delta(account_type, txn_type, amount)
            expected_after = round(balance_before + delta, 2)
            
            if abs(balance_after - expected_after) > 0.01:
                errors.append(
                    f"Transaction {txn_number}: balance_after calculation error - "
                    f"Expected ₹{expected_after:,.2f}, Got ₹{balance_after:,.2f}"
                )
            
            # Update running balance
            running_balance = balance_after
        
        # Verify final balance matches account current_balance
        if abs(running_balance - current_balance) > 0.01:
            errors.append(
                f"Final balance mismatch - "
                f"Calculated: ₹{running_balance:,.2f}, "
                f"Account Balance: ₹{current_balance:,.2f}, "
                f"Difference: ₹{abs(running_balance - current_balance):,.2f}"
            )
        
        # Report errors
        if errors:
            logger.warning(f"  ✗ Found {len(errors)} errors:")
            for error in errors:
                logger.warning(f"    - {error}")
            stats['accounts_with_errors'] += 1
            stats['balance_mismatches'].append({
                'account_name': account_name,
                'account_type': account_type,
                'errors': errors
            })
        else:
            logger.info(f"  ✓ All balances verified correctly")
        
        logger.info("")
    
    # Print summary
    logger.info("=" * 80)
    logger.info("VERIFICATION SUMMARY")
    logger.info("=" * 80)
    
    logger.info(f"\nAccounts:")
    logger.info(f"  Total: {stats['total_accounts']}")
    for acc_type, count in sorted(stats['accounts_by_type'].items()):
        logger.info(f"    - {acc_type.upper()}: {count}")
    
    logger.info(f"\nTransactions:")
    logger.info(f"  Total: {stats['total_transactions']}")
    logger.info(f"  With balance tracking: {stats['transactions_with_balance']} "
                f"({100 * stats['transactions_with_balance'] / max(stats['total_transactions'], 1):.1f}%)")
    logger.info(f"  Without balance tracking: {stats['transactions_without_balance']} "
                f"({100 * stats['transactions_without_balance'] / max(stats['total_transactions'], 1):.1f}%)")
    
    logger.info(f"\nErrors:")
    logger.info(f"  Accounts with errors: {stats['accounts_with_errors']}")
    
    if stats['balance_mismatches']:
        logger.warning(f"\n⚠ Accounts with Balance Issues:")
        for mismatch in stats['balance_mismatches']:
            logger.warning(f"  - {mismatch['account_name']} ({mismatch['account_type']}): "
                          f"{len(mismatch['errors'])} errors")
    
    logger.info("\n" + "=" * 80)
    if stats['transactions_without_balance'] == 0 and stats['accounts_with_errors'] == 0:
        logger.info("✓ VERIFICATION PASSED - All transactions have correct balance tracking")
    else:
        logger.warning("⚠ VERIFICATION FAILED - Issues found (see details above)")
    logger.info("=" * 80)
    
    return stats


if __name__ == "__main__":
    asyncio.run(verify_transaction_balances())
