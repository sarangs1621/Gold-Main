"""
TRANSACTION BALANCE MIGRATION SCRIPT
=====================================
Backfills balance_before and balance_after for all existing transactions.

This script:
1. Creates automatic backup before migration
2. Processes accounts in priority order (asset/liability first)
3. Calculates running balances for each account
4. Updates transactions with proper balance tracking
5. Supports dry-run mode for safety
6. Provides detailed logging and verification

Usage:
    # Dry run (no changes to database)
    python migrate_transaction_balances.py --dry-run
    
    # Execute migration
    python migrate_transaction_balances.py --execute
    
    # Execute with specific account types
    python migrate_transaction_balances.py --execute --account-types asset,liability

Safety Features:
- Automatic backup before execution
- Dry-run mode
- Transaction-level validation
- Rollback capability
- Comprehensive logging
"""

import asyncio
import argparse
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from decimal import Decimal
import os
import sys
from dotenv import load_dotenv
from pathlib import Path
import logging
from typing import List, Dict, Optional

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent))
from backup_accounting_data import backup_accounting_data

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

# Account type priorities and valid types
ACCOUNT_TYPE_PRIORITY = {
    'asset': 1,
    'liability': 2,
    'income': 3,
    'expense': 4,
    'equity': 5
}

VALID_ACCOUNT_TYPES = {'asset', 'income', 'expense', 'liability', 'equity'}


def calculate_balance_delta(account_type: str, transaction_type: str, amount: float) -> float:
    """
    Calculate balance change based on account type and transaction type.
    
    ACCOUNTING RULES:
    - ASSET/EXPENSE: Debit increases (+), Credit decreases (-)
    - INCOME/LIABILITY/EQUITY: Credit increases (+), Debit decreases (-)
    """
    account_type = account_type.lower()
    
    if account_type in ['asset', 'expense']:
        return amount if transaction_type == 'debit' else -amount
    else:  # income, liability, equity
        return amount if transaction_type == 'credit' else -amount


def safe_float(value, default=0.0) -> float:
    """Safely convert value to float"""
    if value is None:
        return default
    try:
        return float(str(value))
    except (ValueError, TypeError):
        return default


class TransactionBalanceMigrator:
    """Handles migration of transaction balances"""
    
    def __init__(self, dry_run: bool = True, account_types: Optional[List[str]] = None):
        self.dry_run = dry_run
        self.account_types = account_types or list(VALID_ACCOUNT_TYPES)
        self.stats = {
            'accounts_processed': 0,
            'transactions_updated': 0,
            'transactions_skipped': 0,
            'errors': 0,
            'accounts_by_type': {},
            'backup_file': None
        }
        
    async def create_backup(self) -> str:
        """Create backup before migration"""
        logger.info("=" * 80)
        logger.info("STEP 1: CREATING BACKUP")
        logger.info("=" * 80)
        
        try:
            backup_file = await backup_accounting_data()
            self.stats['backup_file'] = backup_file
            logger.info(f"✓ Backup created successfully: {backup_file}")
            return backup_file
        except Exception as e:
            logger.error(f"✗ Backup failed: {str(e)}")
            raise
    
    async def get_accounts_sorted(self) -> List[Dict]:
        """Get accounts sorted by priority"""
        logger.info("\n" + "=" * 80)
        logger.info("STEP 2: FETCHING ACCOUNTS")
        logger.info("=" * 80)
        
        # Fetch all non-deleted accounts
        query = {"is_deleted": False}
        if self.account_types != list(VALID_ACCOUNT_TYPES):
            query["account_type"] = {"$in": self.account_types}
        
        accounts = await db.accounts.find(query, {"_id": 0}).to_list(None)
        
        # Sort by priority
        accounts.sort(key=lambda x: ACCOUNT_TYPE_PRIORITY.get(x.get('account_type', 'equity').lower(), 99))
        
        # Statistics
        for account in accounts:
            acc_type = account.get('account_type', 'unknown').lower()
            self.stats['accounts_by_type'][acc_type] = self.stats['accounts_by_type'].get(acc_type, 0) + 1
        
        logger.info(f"Found {len(accounts)} accounts:")
        for acc_type, count in sorted(self.stats['accounts_by_type'].items()):
            logger.info(f"  - {acc_type.upper()}: {count} accounts")
        
        return accounts
    
    async def get_account_transactions(self, account_id: str) -> List[Dict]:
        """Get all non-deleted transactions for an account, sorted by date"""
        transactions = await db.transactions.find(
            {"account_id": account_id, "is_deleted": False},
            {"_id": 0}
        ).sort("date", 1).to_list(None)
        
        return transactions
    
    async def migrate_account_transactions(self, account: Dict) -> Dict:
        """Migrate all transactions for a single account"""
        account_id = account['id']
        account_name = account['name']
        account_type = account.get('account_type', 'asset').lower()
        
        logger.info(f"\n{'─' * 80}")
        logger.info(f"Processing Account: {account_name} ({account_type.upper()})")
        logger.info(f"Account ID: {account_id}")
        
        # Get all transactions for this account
        transactions = await self.get_account_transactions(account_id)
        
        if not transactions:
            logger.info("  ⊘ No transactions found - skipping")
            return {
                'account_id': account_id,
                'account_name': account_name,
                'transactions_updated': 0,
                'transactions_skipped': 0
            }
        
        logger.info(f"  Found {len(transactions)} transactions")
        
        # Starting balance is the account's opening balance
        running_balance = safe_float(account.get('opening_balance', 0))
        logger.info(f"  Starting balance: ₹{running_balance:,.2f}")
        
        updates_made = 0
        skipped = 0
        
        # Process each transaction in chronological order
        for idx, txn in enumerate(transactions, 1):
            txn_id = txn['id']
            txn_number = txn.get('transaction_number', 'N/A')
            txn_type = txn.get('transaction_type', 'debit')
            amount = safe_float(txn.get('amount', 0))
            txn_date = txn.get('date')
            
            # Check if transaction already has balance tracking
            if txn.get('has_balance') and txn.get('balance_before') is not None:
                logger.debug(f"  [{idx}/{len(transactions)}] {txn_number} - Already has balance - skipping")
                skipped += 1
                
                # Update running balance based on existing balance_after
                running_balance = safe_float(txn.get('balance_after', running_balance))
                continue
            
            # Calculate balances
            balance_before = running_balance
            delta = calculate_balance_delta(account_type, txn_type, amount)
            balance_after = round(balance_before + delta, 2)
            
            # Log the update
            logger.info(
                f"  [{idx}/{len(transactions)}] {txn_number} | "
                f"{txn_type.upper()}: ₹{amount:,.2f} | "
                f"Before: ₹{balance_before:,.2f} → After: ₹{balance_after:,.2f}"
            )
            
            # Update transaction in database (if not dry run)
            if not self.dry_run:
                try:
                    result = await db.transactions.update_one(
                        {"id": txn_id},
                        {
                            "$set": {
                                "balance_before": balance_before,
                                "balance_after": balance_after,
                                "has_balance": True
                            }
                        }
                    )
                    
                    if result.modified_count == 1:
                        updates_made += 1
                    else:
                        logger.warning(f"    ⚠ Failed to update transaction {txn_number}")
                        self.stats['errors'] += 1
                        
                except Exception as e:
                    logger.error(f"    ✗ Error updating {txn_number}: {str(e)}")
                    self.stats['errors'] += 1
                    continue
            else:
                updates_made += 1
            
            # Update running balance for next transaction
            running_balance = balance_after
        
        # Verify final balance matches account current_balance
        expected_balance = safe_float(account.get('current_balance', 0))
        balance_match = abs(running_balance - expected_balance) < 0.01
        
        logger.info(f"\n  Final Balance Verification:")
        logger.info(f"    Calculated: ₹{running_balance:,.2f}")
        logger.info(f"    Expected:   ₹{expected_balance:,.2f}")
        logger.info(f"    Status:     {'✓ MATCH' if balance_match else '✗ MISMATCH'}")
        
        if not balance_match:
            logger.warning(f"  ⚠ Balance mismatch for account {account_name}")
            self.stats['errors'] += 1
        
        return {
            'account_id': account_id,
            'account_name': account_name,
            'account_type': account_type,
            'transactions_updated': updates_made,
            'transactions_skipped': skipped,
            'balance_match': balance_match,
            'final_balance': running_balance
        }
    
    async def migrate_all_accounts(self):
        """Main migration process"""
        logger.info("\n" + "=" * 80)
        logger.info("STEP 3: MIGRATING TRANSACTION BALANCES")
        logger.info("=" * 80)
        logger.info(f"Mode: {'DRY RUN (no changes will be made)' if self.dry_run else 'EXECUTE (database will be updated)'}")
        
        accounts = await self.get_accounts_sorted()
        
        if not accounts:
            logger.warning("No accounts to process!")
            return
        
        account_results = []
        
        for idx, account in enumerate(accounts, 1):
            logger.info(f"\n[Account {idx}/{len(accounts)}]")
            
            try:
                result = await self.migrate_account_transactions(account)
                account_results.append(result)
                
                self.stats['accounts_processed'] += 1
                self.stats['transactions_updated'] += result['transactions_updated']
                self.stats['transactions_skipped'] += result['transactions_skipped']
                
            except Exception as e:
                logger.error(f"✗ Error processing account {account.get('name', 'unknown')}: {str(e)}")
                self.stats['errors'] += 1
        
        return account_results
    
    async def print_summary(self, account_results: List[Dict]):
        """Print migration summary"""
        logger.info("\n" + "=" * 80)
        logger.info("MIGRATION SUMMARY")
        logger.info("=" * 80)
        
        logger.info(f"\nMode: {'DRY RUN' if self.dry_run else 'EXECUTION'}")
        logger.info(f"Backup File: {self.stats.get('backup_file', 'N/A')}")
        
        logger.info(f"\nAccounts Processed: {self.stats['accounts_processed']}")
        for acc_type, count in sorted(self.stats['accounts_by_type'].items()):
            logger.info(f"  - {acc_type.upper()}: {count}")
        
        logger.info(f"\nTransactions:")
        logger.info(f"  - Updated: {self.stats['transactions_updated']}")
        logger.info(f"  - Skipped: {self.stats['transactions_skipped']}")
        logger.info(f"  - Errors: {self.stats['errors']}")
        
        # Balance verification summary
        if account_results:
            balance_mismatches = [r for r in account_results if not r.get('balance_match', True)]
            if balance_mismatches:
                logger.warning(f"\n⚠ Balance Mismatches: {len(balance_mismatches)} accounts")
                for result in balance_mismatches:
                    logger.warning(f"  - {result['account_name']} ({result['account_type']})")
            else:
                logger.info("\n✓ All account balances match!")
        
        logger.info("\n" + "=" * 80)
        if self.dry_run:
            logger.info("DRY RUN COMPLETED - No changes were made to the database")
            logger.info("Run with --execute flag to apply changes")
        else:
            logger.info("MIGRATION COMPLETED SUCCESSFULLY")
            if self.stats['errors'] > 0:
                logger.warning(f"⚠ Completed with {self.stats['errors']} errors - Review logs above")
        logger.info("=" * 80)
    
    async def run(self):
        """Execute the complete migration process"""
        try:
            # Step 1: Create backup (only if executing)
            if not self.dry_run:
                await self.create_backup()
            else:
                logger.info("=" * 80)
                logger.info("DRY RUN MODE - Skipping backup")
                logger.info("=" * 80)
            
            # Step 2 & 3: Migrate accounts
            account_results = await self.migrate_all_accounts()
            
            # Step 4: Print summary
            await self.print_summary(account_results)
            
            return self.stats
            
        except Exception as e:
            logger.error(f"Migration failed: {str(e)}")
            logger.error("Database was not modified" if self.dry_run else "Restore from backup if needed")
            raise


async def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='Migrate transaction balances',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Dry run (safe - no changes)
  python migrate_transaction_balances.py --dry-run

  # Execute migration for all accounts
  python migrate_transaction_balances.py --execute

  # Execute for specific account types only
  python migrate_transaction_balances.py --execute --account-types asset,liability
        """
    )
    
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--dry-run', action='store_true', help='Simulate migration without making changes')
    group.add_argument('--execute', action='store_true', help='Execute migration (requires confirmation)')
    
    parser.add_argument(
        '--account-types',
        type=str,
        help='Comma-separated list of account types to process (default: all)',
        default=None
    )
    
    args = parser.parse_args()
    
    # Parse account types if provided
    account_types = None
    if args.account_types:
        account_types = [t.strip().lower() for t in args.account_types.split(',')]
        invalid_types = [t for t in account_types if t not in VALID_ACCOUNT_TYPES]
        if invalid_types:
            logger.error(f"Invalid account types: {', '.join(invalid_types)}")
            logger.error(f"Valid types are: {', '.join(VALID_ACCOUNT_TYPES)}")
            return
    
    # Confirmation for execution mode
    if args.execute:
        logger.warning("=" * 80)
        logger.warning("⚠ EXECUTION MODE - Database will be modified")
        logger.warning("=" * 80)
        logger.warning("This will update transaction balance fields in the database.")
        logger.warning("A backup will be created automatically before migration.")
        
        if account_types:
            logger.warning(f"Account types to process: {', '.join(account_types)}")
        else:
            logger.warning("All account types will be processed.")
        
        response = input("\nType 'YES' to continue: ")
        if response != 'YES':
            logger.info("Migration cancelled by user")
            return
    
    # Run migration
    migrator = TransactionBalanceMigrator(
        dry_run=args.dry_run,
        account_types=account_types
    )
    
    await migrator.run()


if __name__ == "__main__":
    asyncio.run(main())
