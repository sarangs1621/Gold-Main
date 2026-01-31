"""
ACCOUNT TYPE VALIDATION SCRIPT
===============================
Checks all accounts in the system and validates they have correct types.
Highlights any accounts that may need type correction.
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

# Load environment from backend/.env
load_dotenv('/app/backend/.env')

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'gold_shop_erp')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Expected account type mappings
EXPECTED_TYPES = {
    'cash': 'asset',
    'bank': 'asset',
    'petty cash': 'asset',
    'sales': 'income',
    'sales income': 'income',
    'gold exchange': 'income',
    'gold exchange income': 'income',
    'making charges': 'income',
    'making charges income': 'income',
    'stone charges': 'income',
    'stone charges income': 'income',
    'service income': 'income',
    'gst payable': 'liability',
    'vat payable': 'liability',
    'customer advance': 'liability',
    'rent': 'expense',
    'rent expense': 'expense',
    'wages': 'expense',
    'wages expense': 'expense',
    'bank charges': 'expense',
    'accounts receivable': 'asset',
    'accounts payable': 'liability',
    'capital': 'equity',
    'retained earnings': 'equity'
}

async def validate_account_types():
    """Validate all account types in the system"""
    
    print("=" * 80)
    print("ACCOUNT TYPE VALIDATION")
    print("=" * 80)
    
    # Get all active accounts
    accounts = await db.accounts.find({"is_deleted": False}).to_list(None)
    
    if not accounts:
        print("\n⚠️  No accounts found in the system.")
        print("This is normal for a fresh installation.")
        print("\nAccounts will be created automatically when:")
        print("  - First payment is added (creates Cash, Sales Income)")
        print("  - Gold exchange payment (creates Gold Exchange Income)")
        return
    
    print(f"\nFound {len(accounts)} active accounts\n")
    
    # Group by type
    by_type = {}
    issues = []
    
    for account in accounts:
        account_name = account.get('name', 'Unknown')
        account_type = account.get('account_type', 'unknown').lower()
        balance = account.get('current_balance', 0)
        
        # Check if account type is valid
        if account_type not in ['asset', 'income', 'expense', 'liability', 'equity']:
            issues.append({
                'name': account_name,
                'current_type': account_type,
                'issue': 'Invalid account type',
                'suggestion': 'Change to one of: asset, income, expense, liability, equity'
            })
        
        # Check if account name suggests a different type
        name_lower = account_name.lower()
        for keyword, expected_type in EXPECTED_TYPES.items():
            if keyword in name_lower:
                if account_type != expected_type:
                    issues.append({
                        'name': account_name,
                        'current_type': account_type,
                        'expected_type': expected_type,
                        'issue': f'Type mismatch - name suggests "{expected_type}"',
                        'suggestion': f'Change account_type to "{expected_type}"'
                    })
                break
        
        # Group for display
        if account_type not in by_type:
            by_type[account_type] = []
        by_type[account_type].append({
            'name': account_name,
            'balance': balance
        })
    
    # Display accounts by type
    print("ACCOUNTS BY TYPE:")
    print("-" * 80)
    
    for acc_type in ['asset', 'income', 'expense', 'liability', 'equity', 'unknown']:
        if acc_type not in by_type:
            continue
        
        type_accounts = by_type[acc_type]
        total_balance = sum(a['balance'] for a in type_accounts)
        
        print(f"\n{acc_type.upper()} ({len(type_accounts)} accounts, Total: {total_balance:.2f})")
        for acc in type_accounts:
            print(f"  • {acc['name']:<40} {acc['balance']:>15.2f}")
    
    # Display issues
    print("\n" + "=" * 80)
    if issues:
        print(f"⚠️  FOUND {len(issues)} POTENTIAL ISSUES:")
        print("=" * 80)
        
        for idx, issue in enumerate(issues, 1):
            print(f"\n[{idx}] {issue['name']}")
            print(f"    Current type: {issue['current_type']}")
            if 'expected_type' in issue:
                print(f"    Expected type: {issue['expected_type']}")
            print(f"    Issue: {issue['issue']}")
            print(f"    ➜ {issue['suggestion']}")
        
        print("\n" + "=" * 80)
        print("RECOMMENDATION:")
        print("=" * 80)
        print("\nRun the comprehensive accounting fix to correct these issues:")
        print("  cd /app/backend")
        print("  python comprehensive_accounting_fix.py")
        print("\nThis will:")
        print("  1. Create backup of current data")
        print("  2. Fix all account types automatically")
        print("  3. Rebuild transactions with correct accounting")
        print("  4. Validate trial balance")
        print("  5. Generate audit report")
    else:
        print("✅ ALL ACCOUNTS HAVE CORRECT TYPES!")
        print("=" * 80)
        print("\nYour accounting system is properly configured.")
        print("All account types match the accounting taxonomy.")
    
    print("=" * 80)

if __name__ == "__main__":
    asyncio.run(validate_account_types())
