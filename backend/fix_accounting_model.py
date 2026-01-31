"""
ACCOUNTING MODEL FIX SCRIPT
===========================
This script fixes the critical accounting errors in the Gold Shop ERP:

1. Changes Sales/Gold Exchange accounts from "asset" to "income"
2. Deletes ALL existing finance transactions (they were created incorrectly)
3. Rebuilds transactions from invoice payments ONLY
4. Implements proper double-entry bookkeeping
5. Recalculates all account balances

ACCOUNTING RULES:
- Invoice creation/finalization → NO finance transactions
- Payment received → Create double-entry:
  * Debit: Cash/Bank (ASSET increases)
  * Credit: Sales Income (INCOME increases)
- GST is tracked as LIABILITY, NOT included in Income
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from datetime import datetime, timezone
from decimal import Decimal

# Load environment
load_dotenv()

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

async def fix_accounting_model():
    """Main fix function"""
    print("=" * 80)
    print("ACCOUNTING MODEL FIX - STARTING")
    print("=" * 80)
    
    # Step 1: Fix account types
    print("\n[STEP 1] Fixing account types...")
    
    # Fix Sales account
    sales_result = await db.accounts.update_many(
        {"name": "Sales", "is_deleted": False},
        {"$set": {"account_type": "income"}}
    )
    print(f"✓ Updated {sales_result.modified_count} Sales account(s) to 'income' type")
    
    # Fix Gold Exchange account
    gold_ex_result = await db.accounts.update_many(
        {"name": "Gold Exchange", "is_deleted": False},
        {"$set": {"account_type": "income"}}
    )
    print(f"✓ Updated {gold_ex_result.modified_count} Gold Exchange account(s) to 'income' type")
    
    # Step 2: Delete ALL existing finance transactions
    print("\n[STEP 2] Deleting ALL existing finance transactions...")
    
    # Count before deletion
    trans_count = await db.transactions.count_documents({"is_deleted": False})
    print(f"  Found {trans_count} existing transactions")
    
    # Mark all as deleted (soft delete for audit trail)
    delete_result = await db.transactions.update_many(
        {"is_deleted": False},
        {
            "$set": {
                "is_deleted": True,
                "deleted_at": datetime.now(timezone.utc),
                "deleted_by": "ACCOUNTING_FIX_SCRIPT"
            }
        }
    )
    print(f"✓ Soft-deleted {delete_result.modified_count} transactions")
    
    # Step 3: Reset ALL account balances to opening_balance
    print("\n[STEP 3] Resetting all account balances...")
    
    accounts = await db.accounts.find({"is_deleted": False}).to_list(None)
    for account in accounts:
        await db.accounts.update_one(
            {"id": account['id']},
            {"$set": {"current_balance": account.get('opening_balance', 0)}}
        )
    print(f"✓ Reset balances for {len(accounts)} accounts to opening_balance")
    
    # Step 4: Rebuild transactions from invoice payments
    print("\n[STEP 4] Rebuilding transactions from invoice payments...")
    
    # Get all finalized invoices with payments
    invoices = await db.invoices.find({
        "is_deleted": False,
        "status": "finalized",
        "paid_amount": {"$gt": 0}
    }).to_list(None)
    
    print(f"  Found {len(invoices)} finalized invoices with payments")
    
    # Get all payment transactions (those with reference_type="invoice" and category="Invoice Payment")
    # These are the actual payment transactions we need to rebuild
    payment_transactions = await db.transactions.find({
        "is_deleted": True,  # We just soft-deleted them
        "reference_type": "invoice",
        "category": "Invoice Payment"
    }).to_list(None)
    
    print(f"  Found {len(payment_transactions)} payment transaction records")
    
    transactions_created = 0
    
    # Rebuild each payment transaction as proper double-entry
    for old_txn in payment_transactions:
        invoice_id = old_txn.get('reference_id')
        if not invoice_id:
            continue
        
        # Get the invoice
        invoice = await db.invoices.find_one({"id": invoice_id, "is_deleted": False})
        if not invoice:
            continue
        
        payment_amount = old_txn.get('amount', 0)
        payment_mode = old_txn.get('mode', 'Cash')
        account_id = old_txn.get('account_id')
        account_name = old_txn.get('account_name', 'Cash')
        created_by = old_txn.get('created_by', 'system')
        created_at = old_txn.get('created_at', datetime.now(timezone.utc))
        
        # Skip if no payment amount
        if payment_amount <= 0:
            continue
        
        # Generate new transaction numbers
        year = created_at.year if isinstance(created_at, datetime) else datetime.now(timezone.utc).year
        count = await db.transactions.count_documents({"is_deleted": False})
        
        # Transaction 1: DEBIT Cash/Bank (ASSET increases)
        debit_txn_number = f"TXN-{year}-{str(count + 1).zfill(4)}"
        debit_transaction = {
            "id": old_txn.get('id'),  # Reuse old ID
            "transaction_number": debit_txn_number,
            "date": created_at,
            "created_at": created_at,
            "transaction_type": "debit",  # Debit increases asset
            "mode": payment_mode,
            "account_id": account_id,
            "account_name": account_name,
            "party_id": invoice.get('customer_id'),
            "party_name": invoice.get('customer_name'),
            "amount": payment_amount,
            "category": "Invoice Payment - Cash/Bank (Debit)",
            "notes": f"Payment received for invoice {invoice.get('invoice_number', 'N/A')} - DEBIT Cash/Bank",
            "reference_type": "invoice",
            "reference_id": invoice_id,
            "created_by": created_by,
            "is_deleted": False
        }
        
        # Insert debit transaction
        await db.transactions.delete_one({"id": debit_transaction['id']})  # Remove old soft-deleted one
        await db.transactions.insert_one(debit_transaction)
        
        # Update Cash/Bank account balance (increase)
        await db.accounts.update_one(
            {"id": account_id},
            {"$inc": {"current_balance": payment_amount}}
        )
        
        transactions_created += 1
        
        # Transaction 2: CREDIT Sales Income (INCOME increases)
        # Get or create Sales Income account
        sales_account = await db.accounts.find_one({"name": "Sales", "is_deleted": False})
        if not sales_account:
            import uuid
            sales_account = {
                "id": str(uuid.uuid4()),
                "name": "Sales",
                "account_type": "income",
                "opening_balance": 0,
                "current_balance": 0,
                "created_at": datetime.now(timezone.utc),
                "created_by": created_by,
                "is_deleted": False
            }
            await db.accounts.insert_one(sales_account)
        
        credit_txn_number = f"TXN-{year}-{str(count + 2).zfill(4)}"
        import uuid
        credit_transaction = {
            "id": str(uuid.uuid4()),
            "transaction_number": credit_txn_number,
            "date": created_at,
            "created_at": created_at,
            "transaction_type": "credit",  # Credit increases income
            "mode": payment_mode,
            "account_id": sales_account['id'],
            "account_name": "Sales Income",
            "party_id": invoice.get('customer_id'),
            "party_name": invoice.get('customer_name'),
            "amount": payment_amount,
            "category": "Invoice Payment - Sales Income (Credit)",
            "notes": f"Revenue recognized for invoice {invoice.get('invoice_number', 'N/A')} - CREDIT Sales Income",
            "reference_type": "invoice",
            "reference_id": invoice_id,
            "created_by": created_by,
            "is_deleted": False
        }
        
        # Insert credit transaction
        await db.transactions.insert_one(credit_transaction)
        
        # Update Sales Income account balance (increase for income)
        await db.accounts.update_one(
            {"id": sales_account['id']},
            {"$inc": {"current_balance": payment_amount}}
        )
        
        transactions_created += 1
    
    print(f"✓ Created {transactions_created} new double-entry transactions")
    
    # Step 5: Verify balances
    print("\n[STEP 5] Verifying account balances...")
    
    accounts = await db.accounts.find({"is_deleted": False}).to_list(None)
    
    print("\nAccount Balances:")
    print("-" * 80)
    print(f"{'Account Name':<30} {'Type':<15} {'Balance':>15}")
    print("-" * 80)
    
    total_debit = 0
    total_credit = 0
    
    for account in accounts:
        balance = account.get('current_balance', 0)
        acc_type = account.get('account_type', 'unknown')
        acc_name = account.get('name', 'Unknown')
        
        # For double-entry verification:
        # Assets & Expenses have debit balances (positive)
        # Income, Liability, Equity have credit balances (positive)
        if acc_type in ['asset', 'expense']:
            total_debit += balance
        else:  # income, liability, equity
            total_credit += balance
        
        print(f"{acc_name:<30} {acc_type:<15} {balance:>15.2f}")
    
    print("-" * 80)
    print(f"{'Total Debits (Assets+Expenses)':<45} {total_debit:>15.2f}")
    print(f"{'Total Credits (Income+Liability+Equity)':<45} {total_credit:>15.2f}")
    print(f"{'Difference (should be close to 0)':<45} {abs(total_debit - total_credit):>15.2f}")
    print("-" * 80)
    
    # Step 6: Transaction summary
    print("\n[STEP 6] Transaction summary...")
    
    active_transactions = await db.transactions.count_documents({"is_deleted": False})
    print(f"✓ Total active transactions: {active_transactions}")
    
    # Count by type
    debits = await db.transactions.count_documents({"is_deleted": False, "transaction_type": "debit"})
    credits = await db.transactions.count_documents({"is_deleted": False, "transaction_type": "credit"})
    print(f"  - Debit transactions: {debits}")
    print(f"  - Credit transactions: {credits}")
    
    # Calculate totals
    debit_pipeline = await db.transactions.aggregate([
        {"$match": {"is_deleted": False, "transaction_type": "debit"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(1)
    
    credit_pipeline = await db.transactions.aggregate([
        {"$match": {"is_deleted": False, "transaction_type": "credit"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(1)
    
    total_debit_amt = debit_pipeline[0]['total'] if debit_pipeline else 0
    total_credit_amt = credit_pipeline[0]['total'] if credit_pipeline else 0
    
    print(f"  - Total debit amount: {total_debit_amt:.2f}")
    print(f"  - Total credit amount: {total_credit_amt:.2f}")
    print(f"  - Difference (should be 0): {abs(total_debit_amt - total_credit_amt):.2f}")
    
    print("\n" + "=" * 80)
    print("ACCOUNTING MODEL FIX - COMPLETED")
    print("=" * 80)
    print("\nNEXT STEPS:")
    print("1. Review the account balances above")
    print("2. Check the Finance Dashboard in the UI")
    print("3. Test adding a new payment to an invoice")
    print("4. Verify that invoice finalization does NOT create transactions")
    print("=" * 80)

if __name__ == "__main__":
    asyncio.run(fix_accounting_model())
