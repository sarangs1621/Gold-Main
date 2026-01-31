"""
Enhanced Dummy Data Generator for Gold Shop ERP
Matches the exact schema from server.py
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
import random
import uuid
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def gen_uuid():
    return str(uuid.uuid4())

def rand_date(days_ago=30):
    """Generate a random date. Use positive for past, negative for future"""
    if days_ago < 0:
        # Future date
        return datetime.now(timezone.utc) + timedelta(days=random.randint(0, abs(days_ago)))
    else:
        # Past date
        return datetime.now(timezone.utc) - timedelta(days=random.randint(0, days_ago))

async def create_dummy_data():
    print("=" * 70)
    print("🎯 GOLD SHOP ERP - COMPREHENSIVE DUMMY DATA GENERATOR")
    print("=" * 70)
    
    # Step 1: Get admin user
    admin = await db.users.find_one({"username": "admin"})
    if not admin:
        print("❌ Admin user not found. Please run seed_data.py first!")
        return
    
    admin_id = admin['id']
    print(f"✅ Found admin user: {admin['username']}")
    
    # Step 2: Create additional users
    print("\n👤 Creating Users...")
    users = [
        {'username': 'manager', 'email': 'manager@goldshop.com', 'full_name': 'Shop Manager', 'role': 'manager', 'password': 'manager123'},
        {'username': 'staff1', 'email': 'staff1@goldshop.com', 'full_name': 'Staff Member 1', 'role': 'staff', 'password': 'staff123'},
        {'username': 'staff2', 'email': 'staff2@goldshop.com', 'full_name': 'Staff Member 2', 'role': 'staff', 'password': 'staff123'},
    ]
    
    created_users = []
    for u in users:
        existing = await db.users.find_one({'username': u['username']})
        if not existing:
            user_doc = {
                'id': gen_uuid(),
                'username': u['username'],
                'email': u['email'],
                'full_name': u['full_name'],
                'role': u['role'],
                'is_active': True,
                'created_at': datetime.now(timezone.utc),
                'is_deleted': False,
                'deleted_at': None,
                'deleted_by': None,
                'hashed_password': pwd_context.hash(u['password'])
            }
            await db.users.insert_one(user_doc)
            created_users.append(user_doc)
            print(f"  ✓ Created user: {u['username']}")
        else:
            created_users.append(existing)
            print(f"  ℹ User exists: {u['username']}")
    
    # Step 3: Get inventory headers
    print("\n📦 Getting Inventory Headers...")
    headers = await db.inventory_headers.find({'is_deleted': False}).to_list(length=100)
    print(f"  ✓ Found {len(headers)} inventory categories")
    
    # Step 4: Create Stock Movements
    print("\n📥 Creating Stock Movements...")
    movement_count = 0
    for header in headers:
        for i in range(random.randint(8, 15)):
            movement_type = random.choice(['Stock IN', 'Stock OUT', 'Adjustment'])
            qty = random.randint(1, 10) * (1 if movement_type == 'Stock IN' else -1 if movement_type == 'Stock OUT' else random.choice([1, -1]))
            weight = round(random.uniform(10.0, 150.0), 3) * (1 if qty > 0 else -1)
            
            movement = {
                'id': gen_uuid(),
                'date': rand_date(60),
                'movement_type': movement_type,
                'header_id': header['id'],
                'header_name': header['name'],
                'description': f'{movement_type} - {header["name"]}',
                'qty_delta': float(qty),
                'weight_delta': weight,
                'purity': random.choice([999, 916, 750, 585, 375]),
                'reference_type': None,
                'reference_id': None,
                'created_by': admin_id,
                'notes': f'Dummy {movement_type}',
                'is_deleted': False
            }
            await db.stock_movements.insert_one(movement)
            movement_count += 1
    
    print(f"  ✓ Created {movement_count} stock movements")
    
    # Step 5: Create Parties
    print("\n👥 Creating Parties...")
    
    customers_data = [
        {'name': 'Ahmed Al-Farsi', 'phone': '+968-9123-4567', 'address': 'Al Khuwair, Muscat', 'party_type': 'customer'},
        {'name': 'Fatima Hassan', 'phone': '+968-9234-5678', 'address': 'Ruwi, Muscat', 'party_type': 'customer'},
        {'name': 'Mohammed Al-Balushi', 'phone': '+968-9345-6789', 'address': 'Azaiba, Muscat', 'party_type': 'customer'},
        {'name': 'Sara Al-Hinai', 'phone': '+968-9456-7890', 'address': 'Bousher, Muscat', 'party_type': 'customer'},
        {'name': 'Khalid Al-Rawahi', 'phone': '+968-9567-8901', 'address': 'Seeb, Muscat', 'party_type': 'customer'},
        {'name': 'Aisha Al-Maamari', 'phone': '+968-9678-9012', 'address': 'Ghubra, Muscat', 'party_type': 'customer'},
        {'name': 'Abdullah Al-Siyabi', 'phone': '+968-9789-0123', 'address': 'Al Hail, Muscat', 'party_type': 'customer'},
        {'name': 'Maryam Al-Jabri', 'phone': '+968-9890-1234', 'address': 'Qurum, Muscat', 'party_type': 'customer'},
        {'name': 'Hassan Al-Lawati', 'phone': '+968-9901-2345', 'address': 'Madinat Sultan Qaboos', 'party_type': 'customer'},
        {'name': 'Noora Al-Kindi', 'phone': '+968-9012-3456', 'address': 'Wattayah, Muscat', 'party_type': 'customer'},
    ]
    
    vendors_data = [
        {'name': 'Gold Suppliers International LLC', 'phone': '+968-2412-3456', 'address': 'Industrial Area, Rusayl', 'party_type': 'vendor'},
        {'name': 'Premium Metals Trading Est', 'phone': '+968-2423-4567', 'address': 'Muttrah, Muscat', 'party_type': 'vendor'},
        {'name': 'Diamond & Gems Imports Co', 'phone': '+968-2434-5678', 'address': 'Ruwi Commercial Center', 'party_type': 'vendor'},
        {'name': 'Silver & Gold Wholesalers', 'phone': '+968-2445-6789', 'address': 'Al Khuwair Industrial', 'party_type': 'vendor'},
    ]
    
    workers_data = [
        {'name': 'Rajesh Kumar (Goldsmith)', 'phone': '+968-9111-2222', 'address': 'Wadi Kabir', 'party_type': 'worker'},
        {'name': 'Sanjay Patel (Craftsman)', 'phone': '+968-9222-3333', 'address': 'Ruwi', 'party_type': 'worker'},
        {'name': 'Vijay Singh (Polisher)', 'phone': '+968-9333-4444', 'address': 'Azaiba', 'party_type': 'worker'},
        {'name': 'Mukesh Sharma (Designer)', 'phone': '+968-9444-5555', 'address': 'Ghubra', 'party_type': 'worker'},
    ]
    
    all_parties_data = customers_data + vendors_data + workers_data
    created_parties = []
    
    for p_data in all_parties_data:
        existing = await db.parties.find_one({'name': p_data['name']})
        if not existing:
            party = {
                'id': gen_uuid(),
                'name': p_data['name'],
                'phone': p_data['phone'],
                'address': p_data['address'],
                'party_type': p_data['party_type'],
                'notes': f'Test {p_data["party_type"]} - {p_data["name"]}',
                'created_at': datetime.now(timezone.utc),
                'created_by': admin_id,
                'is_deleted': False
            }
            await db.parties.insert_one(party)
            created_parties.append(party)
    
    print(f"  ✓ Created {len(created_parties)} parties")
    
    # Fetch all parties for use
    customers = await db.parties.find({'party_type': 'customer'}).to_list(length=100)
    vendors = await db.parties.find({'party_type': 'vendor'}).to_list(length=100)
    workers = await db.parties.find({'party_type': 'worker'}).to_list(length=100)
    
    # Step 6: Create Accounts
    print("\n💰 Creating Accounts...")
    accounts_data = [
        {'name': 'Main Cash Account', 'account_type': 'cash', 'opening_balance': 75000.0, 'current_balance': 75000.0},
        {'name': 'Bank of Muscat - Checking', 'account_type': 'bank', 'opening_balance': 250000.0, 'current_balance': 250000.0},
        {'name': 'HSBC Bank - Savings', 'account_type': 'bank', 'opening_balance': 150000.0, 'current_balance': 150000.0},
        {'name': 'Petty Cash', 'account_type': 'cash', 'opening_balance': 5000.0, 'current_balance': 5000.0},
    ]
    
    created_accounts = []
    for acc_data in accounts_data:
        existing = await db.accounts.find_one({'name': acc_data['name']})
        if not existing:
            account = {
                'id': gen_uuid(),
                'name': acc_data['name'],
                'account_type': acc_data['account_type'],
                'opening_balance': acc_data['opening_balance'],
                'current_balance': acc_data['current_balance'],
                'created_at': datetime.now(timezone.utc),
                'created_by': admin_id,
                'is_deleted': False
            }
            await db.accounts.insert_one(account)
            created_accounts.append(account)
    
    print(f"  ✓ Created {len(created_accounts)} accounts")
    accounts = await db.accounts.find({'is_deleted': False}).to_list(length=100)
    
    # Step 7: Create Job Cards
    print("\n📋 Creating Job Cards...")
    job_card_count = 0
    
    for customer in customers[:8]:  # Create job cards for first 8 customers
        for i in range(random.randint(2, 4)):
            items = []
            num_items = random.randint(1, 3)
            
            for j in range(num_items):
                header = random.choice(headers)
                making_type = random.choice(['flat', 'per_gram', None])
                making_value = round(random.uniform(50, 300), 2) if making_type == 'flat' else round(random.uniform(2, 15), 2) if making_type == 'per_gram' else None
                vat_percent = 5.0 if random.random() > 0.3 else None
                weight_in = round(random.uniform(10.0, 100.0), 3)
                
                item = {
                    'id': gen_uuid(),
                    'category': header['name'],
                    'description': f'{header["name"]} work',
                    'qty': random.randint(1, 5),
                    'weight_in': weight_in,
                    'weight_out': round(weight_in * random.uniform(0.95, 0.99), 3) if random.random() > 0.5 else None,
                    'purity': random.choice([999, 916, 750, 585]),
                    'work_type': random.choice(['New Making', 'Repair', 'Polish', 'Resize', 'Stone Setting']),
                    'remarks': f'Test {header["name"]} work',
                    'making_charge_type': making_type,
                    'making_charge_value': making_value,
                    'vat_percent': vat_percent,
                    'vat_amount': round(making_value * vat_percent / 100, 2) if making_value and vat_percent else None
                }
                items.append(item)
            
            worker = random.choice(workers) if workers else None
            status = random.choice(['created', 'in_progress', 'completed', 'delivered'])
            
            job_card = {
                'id': gen_uuid(),
                'job_card_number': f'JC-2025-{str(job_card_count + 1001).zfill(4)}',
                'card_type': random.choice(['new_making', 'repair', 'exchange']),
                'date_created': rand_date(45),
                'delivery_date': rand_date(-5) if random.random() > 0.5 else None,
                'status': status,
                'customer_type': 'saved',
                'customer_id': customer['id'],
                'customer_name': customer['name'],
                'walk_in_name': None,
                'walk_in_phone': None,
                'worker_id': worker['id'] if worker else None,
                'worker_name': worker['name'] if worker else None,
                'items': items,
                'notes': f'Job card for {customer["name"]}',
                'gold_rate_at_jobcard': round(random.uniform(60.0, 75.0), 2),
                'locked': False,
                'locked_at': None,
                'locked_by': None,
                'created_by': admin_id,
                'is_deleted': False
            }
            await db.jobcards.insert_one(job_card)
            job_card_count += 1
    
    # Create walk-in job cards
    walk_in_names = ['John Smith', 'Emma Wilson', 'David Brown', 'Lisa Anderson', 'Michael Johnson']
    for name in walk_in_names:
        items = []
        header = random.choice(headers)
        item = {
            'id': gen_uuid(),
            'category': header['name'],
            'description': f'{header["name"]} repair',
            'qty': random.randint(1, 2),
            'weight_in': round(random.uniform(15.0, 50.0), 3),
            'weight_out': None,
            'purity': random.choice([916, 750, 585]),
            'work_type': 'Repair',
            'remarks': f'Walk-in customer repair',
            'making_charge_type': 'flat',
            'making_charge_value': round(random.uniform(100, 250), 2),
            'vat_percent': 5.0,
            'vat_amount': round(random.uniform(5, 12.5), 2)
        }
        items.append(item)
        
        job_card = {
            'id': gen_uuid(),
            'job_card_number': f'JC-2025-{str(job_card_count + 1001).zfill(4)}',
            'card_type': 'repair',
            'date_created': rand_date(20),
            'delivery_date': None,
            'status': random.choice(['completed', 'delivered']),
            'customer_type': 'walk_in',
            'customer_id': None,
            'customer_name': None,
            'walk_in_name': name,
            'walk_in_phone': f'+968-9{random.randint(100, 999)}-{random.randint(1000, 9999)}',
            'worker_id': random.choice(workers)['id'] if workers else None,
            'worker_name': random.choice(workers)['name'] if workers else None,
            'items': items,
            'notes': f'Walk-in customer: {name}',
            'gold_rate_at_jobcard': round(random.uniform(60.0, 75.0), 2),
            'locked': False,
            'locked_at': None,
            'locked_by': None,
            'created_by': admin_id,
            'is_deleted': False
        }
        await db.jobcards.insert_one(job_card)
        job_card_count += 1
    
    print(f"  ✓ Created {job_card_count} job cards")
    
    # Step 8: Create Invoices
    print("\n🧾 Creating Invoices...")
    
    job_cards = await db.jobcards.find({'is_deleted': False}).to_list(length=100)
    invoice_count = 0
    
    for customer in customers[:10]:
        for i in range(random.randint(1, 3)):
            items = []
            num_items = random.randint(1, 4)
            
            for j in range(num_items):
                header = random.choice(headers)
                weight = round(random.uniform(5.0, 80.0), 3)
                purity = random.choice([999, 916, 750, 585])
                metal_rate = round(random.uniform(55.0, 75.0), 2)
                gold_value = round(weight * metal_rate, 2)
                making_value = round(random.uniform(100, 500), 2)
                vat_percent = 5.0
                vat_amount = round((gold_value + making_value) * vat_percent / 100, 2)
                line_total = gold_value + making_value + vat_amount
                
                item = {
                    'id': gen_uuid(),
                    'category': header['name'],
                    'description': f'{header["name"]} item',
                    'qty': random.randint(1, 3),
                    'weight': weight,
                    'purity': purity,
                    'metal_rate': metal_rate,
                    'gold_value': gold_value,
                    'making_value': making_value,
                    'vat_percent': vat_percent,
                    'vat_amount': vat_amount,
                    'line_total': line_total
                }
                items.append(item)
            
            subtotal = sum(item['gold_value'] + item['making_value'] for item in items)
            discount = round(subtotal * random.uniform(0, 0.08), 2)
            vat_total = sum(item['vat_amount'] for item in items)
            grand_total = round(subtotal - discount + vat_total, 2)
            
            payment_scenario = random.choice(['paid', 'partial', 'unpaid'])
            if payment_scenario == 'paid':
                paid_amount = grand_total
                payment_status = 'paid'
            elif payment_scenario == 'partial':
                paid_amount = round(grand_total * random.uniform(0.4, 0.8), 2)
                payment_status = 'partial'
            else:
                paid_amount = 0.0
                payment_status = 'unpaid'
            
            balance_due = round(grand_total - paid_amount, 2)
            status = random.choice(['draft', 'finalized'])
            
            invoice = {
                'id': gen_uuid(),
                'invoice_number': f'INV-2025-{str(invoice_count + 1001).zfill(4)}',
                'date': rand_date(40),
                'due_date': rand_date(-10) if random.random() > 0.6 else None,
                'customer_type': 'saved',
                'customer_id': customer['id'],
                'customer_name': customer['name'],
                'walk_in_name': None,
                'walk_in_phone': None,
                'invoice_type': random.choice(['sale', 'exchange', 'service']),
                'payment_status': payment_status,
                'status': status,
                'finalized_at': datetime.now(timezone.utc) if status == 'finalized' else None,
                'finalized_by': admin_id if status == 'finalized' else None,
                'items': items,
                'subtotal': subtotal,
                'discount_amount': discount,
                'vat_total': vat_total,
                'grand_total': grand_total,
                'paid_amount': paid_amount,
                'balance_due': balance_due,
                'notes': f'Invoice for {customer["name"]}',
                'jobcard_id': random.choice(job_cards)['id'] if job_cards and random.random() > 0.5 else None,
                'created_by': admin_id,
                'is_deleted': False
            }
            await db.invoices.insert_one(invoice)
            invoice_count += 1
    
    print(f"  ✓ Created {invoice_count} invoices")
    
    # Step 9: Create Transactions
    print("\n💸 Creating Transactions...")
    
    invoices = await db.invoices.find({'is_deleted': False, 'paid_amount': {'$gt': 0}}).to_list(length=100)
    transaction_count = 0
    
    for invoice in invoices:
        if invoice['paid_amount'] > 0:
            transaction = {
                'id': gen_uuid(),
                'transaction_number': f'TXN-2025-{str(transaction_count + 1001).zfill(4)}',
                'date': invoice['date'] + timedelta(days=random.randint(0, 5)),
                'transaction_type': random.choice(['receipt', 'payment']),
                'mode': random.choice(['cash', 'bank_transfer', 'card', 'upi']),
                'account_id': random.choice(accounts)['id'],
                'account_name': random.choice(accounts)['name'],
                'party_id': invoice.get('customer_id'),
                'party_name': invoice.get('customer_name'),
                'amount': invoice['paid_amount'],
                'category': 'Invoice Payment',
                'notes': f'Payment for invoice {invoice["invoice_number"]}',
                'reference_type': 'invoice',
                'reference_id': invoice['id'],
                'created_by': admin_id,
                'is_deleted': False
            }
            await db.transactions.insert_one(transaction)
            transaction_count += 1
    
    # Add some standalone transactions
    for i in range(20):
        party = random.choice(customers + vendors)
        transaction = {
            'id': gen_uuid(),
            'transaction_number': f'TXN-2025-{str(transaction_count + 1001).zfill(4)}',
            'date': rand_date(60),
            'transaction_type': random.choice(['receipt', 'payment']),
            'mode': random.choice(['cash', 'bank_transfer', 'card']),
            'account_id': random.choice(accounts)['id'],
            'account_name': random.choice(accounts)['name'],
            'party_id': party['id'],
            'party_name': party['name'],
            'amount': round(random.uniform(500, 15000), 2),
            'category': random.choice(['Sales', 'Purchase', 'Expense', 'Other']),
            'notes': f'Standalone transaction - {party["name"]}',
            'reference_type': None,
            'reference_id': None,
            'created_by': admin_id,
            'is_deleted': False
        }
        await db.transactions.insert_one(transaction)
        transaction_count += 1
    
    print(f"  ✓ Created {transaction_count} transactions")
    
    # Step 10: Create Daily Closings
    print("\n🔒 Creating Daily Closings...")
    closing_count = 0
    
    for i in range(15):
        date = datetime.now(timezone.utc) - timedelta(days=i)
        opening_cash = 50000.0 if i == 14 else round(random.uniform(45000, 55000), 2)
        total_credit = round(random.uniform(10000, 30000), 2)
        total_debit = round(random.uniform(8000, 25000), 2)
        expected_closing = opening_cash + total_credit - total_debit
        actual_closing = expected_closing + round(random.uniform(-500, 500), 2)
        difference = actual_closing - expected_closing
        
        closing = {
            'id': gen_uuid(),
            'date': date,
            'opening_cash': opening_cash,
            'total_credit': total_credit,
            'total_debit': total_debit,
            'expected_closing': expected_closing,
            'actual_closing': actual_closing,
            'difference': difference,
            'is_locked': i > 7,  # Lock older records
            'closed_by': admin_id,
            'notes': f'Daily closing for {date.date()}',
            'created_at': datetime.now(timezone.utc)
        }
        await db.daily_closings.insert_one(closing)
        closing_count += 1
    
    print(f"  ✓ Created {closing_count} daily closings")
    
    # Step 11: Create Audit Logs
    print("\n📝 Creating Audit Logs...")
    
    modules = ['users', 'inventory', 'jobcards', 'invoices', 'parties', 'transactions', 'accounts', 'stock_movements']
    actions = ['create', 'update', 'delete', 'finalize', 'lock', 'unlock', 'login', 'logout']
    log_count = 0
    
    for i in range(100):
        log = {
            'id': gen_uuid(),
            'timestamp': rand_date(45),
            'user_id': admin_id,
            'user_name': 'admin',
            'module': random.choice(modules),
            'record_id': gen_uuid(),
            'action': random.choice(actions),
            'changes': {'test_field': 'test_value', 'operation': 'dummy_data'}
        }
        await db.audit_logs.insert_one(log)
        log_count += 1
    
    print(f"  ✓ Created {log_count} audit logs")
    
    # Summary
    print("\n" + "=" * 70)
    print("✅ DUMMY DATA GENERATION COMPLETE!")
    print("=" * 70)
    
    # Get counts
    user_count = await db.users.count_documents({})
    header_count = await db.inventory_headers.count_documents({})
    movement_count_total = await db.stock_movements.count_documents({})
    party_count = await db.parties.count_documents({})
    account_count = await db.accounts.count_documents({})
    jobcard_count = await db.jobcards.count_documents({})
    invoice_count_total = await db.invoices.count_documents({})
    transaction_count_total = await db.transactions.count_documents({})
    closing_count_total = await db.daily_closings.count_documents({})
    log_count_total = await db.audit_logs.count_documents({})
    
    print(f"""
📊 Database Summary:
{'─' * 70}
👤 Users:                  {user_count}
📦 Inventory Categories:   {header_count}
📥 Stock Movements:        {movement_count_total}
👥 Parties:                {party_count}
💰 Accounts:               {account_count}
📋 Job Cards:              {jobcard_count}
🧾 Invoices:               {invoice_count_total}
💸 Transactions:           {transaction_count_total}
🔒 Daily Closings:         {closing_count_total}
📝 Audit Logs:             {log_count_total}

🔑 Login Credentials:
{'─' * 70}
Admin:     username: admin     | password: admin123
Manager:   username: manager   | password: manager123
Staff 1:   username: staff1    | password: staff123
Staff 2:   username: staff2    | password: staff123

🎉 All dummy data has been successfully added!
You can now test all features of the Gold Shop ERP system.
    """)

if __name__ == "__main__":
    asyncio.run(create_dummy_data())
    client.close()
