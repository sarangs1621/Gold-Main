"""
Comprehensive Dummy Data Generator for Gold Inventory Management System
This script creates realistic test data for ALL modules and features
"""
import asyncio
from pymongo import MongoClient
from datetime import datetime, timedelta, timezone
import random
import uuid
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
DB_NAME = os.environ.get('DB_NAME', 'gold_shop_erp')
client = MongoClient(MONGO_URL)
db = client[DB_NAME]

def generate_uuid():
    return str(uuid.uuid4())

def random_date(days_ago_max=90, days_ago_min=0):
    """Generate random date within specified range"""
    days = random.randint(days_ago_min, days_ago_max)
    return datetime.now(timezone.utc) - timedelta(days=days)

def clear_existing_data():
    """Clear all existing data - CAUTION!"""
    print("⚠️  Clearing existing data...")
    collections = [
        'users', 'inventory_headers', 'stock_movements', 'parties', 
        'jobcards', 'invoices', 'accounts', 'transactions', 
        'daily_closings', 'audit_logs', 'gold_ledger', 'purchases'
    ]
    for coll in collections:
        if coll != 'users':  # Keep users
            db[coll].delete_many({})
    print("✅ Data cleared (kept users)")

def create_admin_user():
    """Create admin user if not exists"""
    existing = db.users.find_one({'username': 'admin'})
    if not existing:
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        
        admin_user = {
            'id': generate_uuid(),
            'username': 'admin',
            'email': 'admin@goldshop.com',
            'full_name': 'Admin User',
            'role': 'admin',
            'is_active': True,
            'created_at': datetime.now(timezone.utc),
            'is_deleted': False,
            'deleted_at': None,
            'deleted_by': None,
            'hashed_password': pwd_context.hash('admin123')
        }
        db.users.insert_one(admin_user)
        print("✅ Admin user created (username: admin, password: admin123)")
        return admin_user['id']
    else:
        print("ℹ️  Admin user already exists")
        return existing['id']

def create_accounts(user_id):
    """Create financial accounts"""
    print("\n📊 Creating Financial Accounts...")
    accounts = [
        {'name': 'Cash Account', 'account_type': 'cash', 'opening_balance': 50000.00, 'current_balance': 50000.00},
        {'name': 'Bank - ABC Bank', 'account_type': 'bank', 'opening_balance': 150000.00, 'current_balance': 150000.00},
        {'name': 'Bank - XYZ Bank', 'account_type': 'bank', 'opening_balance': 85000.00, 'current_balance': 85000.00},
        {'name': 'Sales Account', 'account_type': 'revenue', 'opening_balance': 0.00, 'current_balance': 0.00},
        {'name': 'Purchase Account', 'account_type': 'expense', 'opening_balance': 0.00, 'current_balance': 0.00},
    ]
    
    created_accounts = []
    for acc in accounts:
        account = {
            'id': generate_uuid(),
            'name': acc['name'],
            'account_type': acc['account_type'],
            'opening_balance': acc['opening_balance'],
            'current_balance': acc['current_balance'],
            'created_at': datetime.now(timezone.utc),
            'created_by': user_id,
            'is_deleted': False
        }
        db.accounts.insert_one(account)
        created_accounts.append(account)
    
    print(f"✅ Created {len(created_accounts)} accounts")
    return created_accounts

def create_inventory_categories(user_id):
    """Create inventory headers/categories"""
    print("\n📦 Creating Inventory Categories...")
    categories = [
        {'name': 'Chain', 'current_qty': 50.0, 'current_weight': 1250.500},
        {'name': 'Ring', 'current_qty': 100.0, 'current_weight': 2500.750},
        {'name': 'Bangle', 'current_qty': 75.0, 'current_weight': 1800.250},
        {'name': 'Necklace', 'current_qty': 45.0, 'current_weight': 3200.000},
        {'name': 'Bracelet', 'current_qty': 60.0, 'current_weight': 1500.500},
        {'name': 'Coin', 'current_qty': 200.0, 'current_weight': 500.000},
        {'name': 'Biscuit', 'current_qty': 30.0, 'current_weight': 7500.000},
        {'name': 'Others', 'current_qty': 85.0, 'current_weight': 2100.250},
    ]
    
    created_categories = []
    for cat in categories:
        category = {
            'id': generate_uuid(),
            'name': cat['name'],
            'current_qty': cat['current_qty'],
            'current_weight': cat['current_weight'],
            'is_active': True,
            'created_at': datetime.now(timezone.utc),
            'created_by': user_id,
            'is_deleted': False
        }
        db.inventory_headers.insert_one(category)
        created_categories.append(category)
    
    print(f"✅ Created {len(created_categories)} inventory categories")
    return created_categories

def create_stock_movements(categories, user_id):
    """Create stock IN/OUT movements"""
    print("\n📥 Creating Stock Movements...")
    movements = []
    
    for category in categories:
        # Create 5-10 random movements per category
        num_movements = random.randint(5, 10)
        for i in range(num_movements):
            movement_type = random.choice(['Stock IN', 'Stock OUT'])
            qty = random.randint(1, 10)
            weight = round(random.uniform(10.0, 100.0), 3)
            purity = random.choice([999, 916, 750, 585])
            
            if movement_type == 'Stock OUT':
                qty = -qty
                weight = -weight
            
            movement = {
                'id': generate_uuid(),
                'date': random_date(60, 0),
                'movement_type': movement_type,
                'header_id': category['id'],
                'header_name': category['name'],
                'description': f'Test {movement_type} movement for {category["name"]}',
                'qty_delta': float(qty),
                'weight_delta': float(weight),
                'purity': purity,
                'reference_type': None,
                'reference_id': None,
                'created_by': user_id,
                'notes': f'Dummy {movement_type} entry',
                'is_deleted': False
            }
            db.stock_movements.insert_one(movement)
            movements.append(movement)
    
    print(f"✅ Created {len(movements)} stock movements")
    return movements

def create_parties(user_id):
    """Create customer and vendor parties"""
    print("\n👥 Creating Parties (Customers & Vendors)...")
    
    customers = [
        {'name': 'Ahmed Al-Farsi', 'phone': '+968-9123-4567', 'address': 'Muscat, Oman', 'party_type': 'customer'},
        {'name': 'Fatima Hassan', 'phone': '+968-9234-5678', 'address': 'Salalah, Oman', 'party_type': 'customer'},
        {'name': 'Mohammed Al-Balushi', 'phone': '+968-9345-6789', 'address': 'Sohar, Oman', 'party_type': 'customer'},
        {'name': 'Sara Al-Hinai', 'phone': '+968-9456-7890', 'address': 'Nizwa, Oman', 'party_type': 'customer'},
        {'name': 'Khalid Al-Rawahi', 'phone': '+968-9567-8901', 'address': 'Sur, Oman', 'party_type': 'customer'},
        {'name': 'Aisha Al-Maamari', 'phone': '+968-9678-9012', 'address': 'Barka, Oman', 'party_type': 'customer'},
        {'name': 'Abdullah Al-Siyabi', 'phone': '+968-9789-0123', 'address': 'Rustaq, Oman', 'party_type': 'customer'},
        {'name': 'Maryam Al-Jabri', 'phone': '+968-9890-1234', 'address': 'Ibri, Oman', 'party_type': 'customer'},
    ]
    
    vendors = [
        {'name': 'Gold Suppliers LLC', 'phone': '+968-2412-3456', 'address': 'Industrial Area, Muscat', 'party_type': 'vendor'},
        {'name': 'Premium Metals Trading', 'phone': '+968-2423-4567', 'address': 'Muttrah, Muscat', 'party_type': 'vendor'},
        {'name': 'Diamond Imports Co', 'phone': '+968-2434-5678', 'address': 'Ruwi, Muscat', 'party_type': 'vendor'},
        {'name': 'Silver Wholesalers', 'phone': '+968-2445-6789', 'address': 'Al Khuwair, Muscat', 'party_type': 'vendor'},
    ]
    
    workers = [
        {'name': 'Rajesh Kumar', 'phone': '+968-9111-2222', 'address': 'Muscat', 'party_type': 'worker'},
        {'name': 'Sanjay Patel', 'phone': '+968-9222-3333', 'address': 'Muscat', 'party_type': 'worker'},
        {'name': 'Vijay Singh', 'phone': '+968-9333-4444', 'address': 'Muscat', 'party_type': 'worker'},
    ]
    
    all_parties = customers + vendors + workers
    created_parties = []
    
    for party_data in all_parties:
        party = {
            'id': generate_uuid(),
            'name': party_data['name'],
            'phone': party_data['phone'],
            'address': party_data['address'],
            'party_type': party_data['party_type'],
            'notes': f'Test {party_data["party_type"]}',
            'created_at': datetime.now(timezone.utc),
            'created_by': user_id,
            'is_deleted': False
        }
        db.parties.insert_one(party)
        created_parties.append(party)
    
    customers_list = [p for p in created_parties if p['party_type'] == 'customer']
    vendors_list = [p for p in created_parties if p['party_type'] == 'vendor']
    workers_list = [p for p in created_parties if p['party_type'] == 'worker']
    
    print(f"✅ Created {len(customers_list)} customers, {len(vendors_list)} vendors, {len(workers_list)} workers")
    return customers_list, vendors_list, workers_list

def create_gold_ledger_entries(parties, user_id):
    """Create gold ledger entries for parties"""
    print("\n🪙 Creating Gold Ledger Entries...")
    entries = []
    
    for party in parties[:6]:  # Create entries for first 6 parties
        num_entries = random.randint(2, 5)
        for i in range(num_entries):
            entry_type = random.choice(['IN', 'OUT'])
            purpose = random.choice(['job_work', 'exchange', 'advance_gold', 'adjustment'])
            
            entry = {
                'id': generate_uuid(),
                'party_id': party['id'],
                'date': random_date(45, 0),
                'type': entry_type,
                'weight_grams': round(random.uniform(10.0, 150.0), 3),
                'purity_entered': random.choice([999, 916, 750]),
                'purpose': purpose,
                'reference_type': 'manual',
                'reference_id': None,
                'notes': f'Test {entry_type} entry - {purpose}',
                'created_at': datetime.utcnow(),
                'created_by': user_id,
                'is_deleted': False
            }
            db.gold_ledger.insert_one(entry)
            entries.append(entry)
    
    print(f"✅ Created {len(entries)} gold ledger entries")
    return entries

def create_purchases(vendors, accounts, user_id):
    """Create purchase records with vendors"""
    print("\n🛒 Creating Purchases...")
    purchases = []
    
    for vendor in vendors:
        num_purchases = random.randint(2, 4)
        for i in range(num_purchases):
            weight = round(random.uniform(50.0, 500.0), 3)
            rate = round(random.uniform(40.0, 60.0), 2)
            amount = round(weight * rate, 2)
            
            # Random payment scenarios
            scenario = random.choice(['full_paid', 'partial_paid', 'unpaid'])
            if scenario == 'full_paid':
                paid_amount = amount
            elif scenario == 'partial_paid':
                paid_amount = round(amount * random.uniform(0.3, 0.7), 2)
            else:
                paid_amount = 0.0
            
            balance_due = round(amount - paid_amount, 2)
            
            purchase = {
                'id': generate_uuid(),
                'vendor_party_id': vendor['id'],
                'date': random_date(60, 0),
                'description': f'Gold purchase from {vendor["name"]}',
                'weight_grams': weight,
                'entered_purity': random.choice([999, 995, 916]),
                'valuation_purity_fixed': 916,
                'rate_per_gram': rate,
                'amount_total': amount,
                'paid_amount_money': paid_amount,
                'balance_due_money': balance_due,
                'payment_mode': random.choice(['Cash', 'Bank Transfer', 'Cheque']) if paid_amount > 0 else None,
                'account_id': random.choice(accounts)['id'] if paid_amount > 0 else None,
                'advance_in_gold_grams': round(random.uniform(5.0, 25.0), 3) if random.random() > 0.7 else None,
                'exchange_in_gold_grams': round(random.uniform(3.0, 15.0), 3) if random.random() > 0.8 else None,
                'status': random.choice(['draft', 'finalized']),
                'finalized_at': datetime.utcnow() if random.random() > 0.3 else None,
                'finalized_by': user_id if random.random() > 0.3 else None,
                'locked': random.random() > 0.5,
                'created_at': datetime.utcnow(),
                'created_by': user_id,
                'is_deleted': False
            }
            db.purchases.insert_one(purchase)
            purchases.append(purchase)
    
    print(f"✅ Created {len(purchases)} purchases")
    return purchases

def create_job_cards(customers, categories, user_id):
    """Create job cards"""
    print("\n📋 Creating Job Cards...")
    job_cards = []
    
    for customer in customers[:6]:  # Job cards for first 6 customers
        num_cards = random.randint(2, 4)
        for i in range(num_cards):
            items = []
            num_items = random.randint(1, 3)
            
            for j in range(num_items):
                category = random.choice(categories)
                qty = random.randint(1, 5)
                weight = round(random.uniform(5.0, 50.0), 3)
                rate = round(random.uniform(30.0, 80.0), 2)
                amount = round(weight * rate, 2)
                
                # Add making charge and VAT
                making_type = random.choice(['flat', 'per_gram', None])
                if making_type == 'flat':
                    making_value = round(random.uniform(50.0, 200.0), 2)
                elif making_type == 'per_gram':
                    making_value = round(random.uniform(2.0, 10.0), 2)
                else:
                    making_value = None
                
                vat_percent = 5.0 if random.random() > 0.5 else None
                vat_amount = round((amount * vat_percent / 100), 2) if vat_percent else None
                
                item = {
                    'category': category['name'],
                    'qty': qty,
                    'weight': weight,
                    'purity': random.choice([999, 916, 750, 585]),
                    'rate': rate,
                    'amount': amount,
                    'making_charge_type': making_type,
                    'making_charge_value': making_value,
                    'vat_percent': vat_percent,
                    'vat_amount': vat_amount
                }
                items.append(item)
            
            job_card = {
                'id': generate_uuid(),
                'jobcard_number': f'JC-{datetime.utcnow().year}-{str(random.randint(1000, 9999))}',
                'customer_type': 'saved',
                'customer_id': customer['id'],
                'customer_name': customer['name'],
                'walk_in_name': None,
                'walk_in_phone': None,
                'date': random_date(30, 0),
                'status': random.choice(['created', 'in_progress', 'completed', 'delivered']),
                'items': items,
                'notes': f'Test job card for {customer["name"]}',
                'locked': False,
                'created_at': datetime.utcnow(),
                'created_by': user_id,
                'is_deleted': False
            }
            db.jobcards.insert_one(job_card)
            job_cards.append(job_card)
    
    # Add some walk-in job cards
    walk_in_names = ['John Smith', 'Emma Wilson', 'David Brown', 'Lisa Anderson']
    for name in walk_in_names:
        items = []
        category = random.choice(categories)
        item = {
            'category': category['name'],
            'qty': random.randint(1, 3),
            'weight': round(random.uniform(10.0, 40.0), 3),
            'purity': random.choice([999, 916, 750, 585]),
            'rate': round(random.uniform(40.0, 70.0), 2),
            'amount': round(random.uniform(500.0, 2000.0), 2),
            'making_charge_type': 'flat',
            'making_charge_value': round(random.uniform(50.0, 150.0), 2),
            'vat_percent': 5.0,
            'vat_amount': round(random.uniform(25.0, 100.0), 2)
        }
        items.append(item)
        
        job_card = {
            'id': generate_uuid(),
            'jobcard_number': f'JC-{datetime.utcnow().year}-{str(random.randint(5000, 5999))}',
            'customer_type': 'walk_in',
            'customer_id': None,
            'customer_name': None,
            'walk_in_name': name,
            'walk_in_phone': f'+968-{random.randint(9000, 9999)}-{random.randint(1000, 9999)}',
            'date': random_date(15, 0),
            'status': random.choice(['completed', 'delivered']),
            'items': items,
            'notes': f'Walk-in customer: {name}',
            'locked': False,
            'created_at': datetime.utcnow(),
            'created_by': user_id,
            'is_deleted': False
        }
        db.jobcards.insert_one(job_card)
        job_cards.append(job_card)
    
    print(f"✅ Created {len(job_cards)} job cards")
    return job_cards

def create_invoices(customers, job_cards, categories, user_id):
    """Create invoices (both from job cards and direct)"""
    print("\n🧾 Creating Invoices...")
    invoices = []
    
    # Create invoices from some completed job cards
    completed_cards = [jc for jc in job_cards if jc['status'] in ['completed', 'delivered']]
    for job_card in completed_cards[:10]:  # First 10 completed cards
        items = []
        for jc_item in job_card['items']:
            item = {
                'category': jc_item['category'],
                'description': f'{jc_item["category"]} item',
                'qty': jc_item['qty'],
                'weight': jc_item['weight'],
                'purity': jc_item['purity'],
                'rate': jc_item['rate'],
                'amount': jc_item['amount']
            }
            items.append(item)
        
        subtotal = sum(item['amount'] for item in items)
        discount = round(subtotal * random.uniform(0, 0.1), 2)
        tax = round((subtotal - discount) * 0.05, 2)
        grand_total = round(subtotal - discount + tax, 2)
        
        # Random payment status
        payment_scenario = random.choice(['paid', 'partial', 'unpaid'])
        if payment_scenario == 'paid':
            paid_amount = grand_total
        elif payment_scenario == 'partial':
            paid_amount = round(grand_total * random.uniform(0.3, 0.7), 2)
        else:
            paid_amount = 0.0
        
        balance_due = round(grand_total - paid_amount, 2)
        
        invoice = {
            'id': generate_uuid(),
            'invoice_number': f'INV-{datetime.utcnow().year}-{str(len(invoices) + 1).zfill(4)}',
            'jobcard_id': job_card['id'],
            'customer_type': job_card['customer_type'],
            'customer_id': job_card.get('customer_id'),
            'customer_name': job_card.get('customer_name') or job_card.get('walk_in_name'),
            'walk_in_name': job_card.get('walk_in_name'),
            'walk_in_phone': job_card.get('walk_in_phone'),
            'invoice_date': random_date(25, 0),
            'due_date': random_date(0, -10) if random.random() > 0.5 else None,
            'invoice_type': 'Service',
            'items': items,
            'subtotal': subtotal,
            'discount': discount,
            'tax': tax,
            'grand_total': grand_total,
            'paid_amount': paid_amount,
            'balance_due': balance_due,
            'status': random.choice(['draft', 'finalized']),
            'finalized_at': datetime.utcnow() if random.random() > 0.3 else None,
            'finalized_by': user_id if random.random() > 0.3 else None,
            'notes': f'Invoice for job card {job_card["jobcard_number"]}',
            'created_at': datetime.utcnow(),
            'created_by': user_id,
            'is_deleted': False
        }
        db.invoices.insert_one(invoice)
        invoices.append(invoice)
    
    print(f"✅ Created {len(invoices)} invoices")
    return invoices

def create_transactions(parties, invoices, accounts, user_id):
    """Create financial transactions"""
    print("\n💰 Creating Transactions...")
    transactions = []
    
    # Create transactions for invoice payments
    paid_invoices = [inv for inv in invoices if inv['paid_amount'] > 0]
    for invoice in paid_invoices:
        transaction = {
            'id': generate_uuid(),
            'transaction_number': f'TXN-{datetime.utcnow().year}-{str(len(transactions) + 1).zfill(4)}',
            'date': invoice['invoice_date'] + timedelta(days=random.randint(0, 5)),
            'transaction_type': 'debit',
            'mode': random.choice(['Cash', 'Bank Transfer', 'Card', 'UPI']),
            'party_id': invoice.get('customer_id'),
            'party_name': invoice['customer_name'],
            'account_id': random.choice(accounts)['id'],
            'amount': invoice['paid_amount'],
            'category': 'Sales Invoice',
            'reference_type': 'invoice',
            'reference_id': invoice['id'],
            'notes': f'Payment for invoice {invoice["invoice_number"]}',
            'created_at': datetime.utcnow(),
            'created_by': user_id,
            'is_deleted': False
        }
        db.transactions.insert_one(transaction)
        transactions.append(transaction)
    
    # Create some standalone credit transactions (vendor payables)
    vendors_subset = random.sample([p for p in parties if p['party_type'] == 'vendor'], min(3, len([p for p in parties if p['party_type'] == 'vendor'])))
    for vendor in vendors_subset:
        transaction = {
            'id': generate_uuid(),
            'transaction_number': f'TXN-{datetime.utcnow().year}-{str(len(transactions) + 1).zfill(4)}',
            'date': random_date(40, 0),
            'transaction_type': 'credit',
            'mode': 'Vendor Payable',
            'party_id': vendor['id'],
            'party_name': vendor['name'],
            'account_id': random.choice(accounts)['id'],
            'amount': round(random.uniform(1000.0, 10000.0), 2),
            'category': 'Purchase',
            'reference_type': 'purchase',
            'reference_id': None,
            'notes': f'Vendor payable for {vendor["name"]}',
            'created_at': datetime.utcnow(),
            'created_by': user_id,
            'is_deleted': False
        }
        db.transactions.insert_one(transaction)
        transactions.append(transaction)
    
    print(f"✅ Created {len(transactions)} transactions")
    return transactions

def create_daily_closings(user_id):
    """Create daily closing records"""
    print("\n🔒 Creating Daily Closings...")
    closings = []
    
    for i in range(10):
        closing_date = datetime.utcnow() - timedelta(days=i)
        expected = round(random.uniform(45000.0, 55000.0), 2)
        actual = expected + round(random.uniform(-500.0, 500.0), 2)
        
        closing = {
            'id': generate_uuid(),
            'date': closing_date,
            'expected_closing': expected,
            'actual_closing': actual,
            'difference': round(actual - expected, 2),
            'notes': f'Daily closing for {closing_date.date()}',
            'is_locked': random.random() > 0.3,
            'created_at': datetime.utcnow(),
            'created_by': user_id
        }
        db.daily_closings.insert_one(closing)
        closings.append(closing)
    
    print(f"✅ Created {len(closings)} daily closings")
    return closings

def create_audit_logs(user_id):
    """Create audit log entries"""
    print("\n📝 Creating Audit Logs...")
    
    actions = [
        'user_login', 'user_logout', 'create_invoice', 'finalize_invoice',
        'create_jobcard', 'update_jobcard', 'create_party', 'create_purchase',
        'stock_movement', 'payment_received', 'gold_ledger_entry'
    ]
    
    logs = []
    for i in range(50):
        log = {
            'id': generate_uuid(),
            'timestamp': random_date(30, 0),
            'user_id': user_id,
            'action': random.choice(actions),
            'entity_type': random.choice(['invoice', 'jobcard', 'party', 'purchase', 'transaction']),
            'entity_id': generate_uuid(),
            'details': {'test': 'Dummy audit log entry'},
            'ip_address': f'192.168.1.{random.randint(1, 255)}'
        }
        db.audit_logs.insert_one(log)
        logs.append(log)
    
    print(f"✅ Created {len(logs)} audit log entries")
    return logs

def main():
    print("=" * 60)
    print("🎯 COMPREHENSIVE DUMMY DATA GENERATOR")
    print("Gold Inventory Management System")
    print("=" * 60)
    
    # Step 1: Clear existing data (except users)
    response = input("\n⚠️  Clear existing data? This will delete all data except users (y/N): ")
    if response.lower() == 'y':
        clear_existing_data()
    
    # Step 2: Create/Get admin user
    user_id = create_admin_user()
    
    # Step 3: Create all data
    print("\n" + "=" * 60)
    print("🚀 Starting Data Generation...")
    print("=" * 60)
    
    accounts = create_accounts(user_id)
    categories = create_inventory_categories(user_id)
    movements = create_stock_movements(categories, user_id)
    customers, vendors, workers = create_parties(user_id)
    all_parties = customers + vendors
    gold_entries = create_gold_ledger_entries(all_parties, user_id)
    purchases = create_purchases(vendors, accounts, user_id)
    job_cards = create_job_cards(customers, categories, user_id)
    invoices = create_invoices(customers, job_cards, categories, user_id)
    transactions = create_transactions(all_parties, invoices, accounts, user_id)
    closings = create_daily_closings(user_id)
    logs = create_audit_logs(user_id)
    
    # Summary
    print("\n" + "=" * 60)
    print("✅ DATA GENERATION COMPLETE!")
    print("=" * 60)
    print(f"""
    📊 Summary:
    -----------
    • Accounts: {len(accounts)}
    • Inventory Categories: {len(categories)}
    • Stock Movements: {len(movements)}
    • Customers: {len(customers)}
    • Vendors: {len(vendors)}
    • Gold Ledger Entries: {len(gold_entries)}
    • Purchases: {len(purchases)}
    • Job Cards: {len(job_cards)}
    • Invoices: {len(invoices)}
    • Transactions: {len(transactions)}
    • Daily Closings: {len(closings)}
    • Audit Logs: {len(logs)}
    
    🔑 Admin Login:
    Email: admin@example.com
    Password: admin123
    
    🎉 All modules now have test data!
    """)

if __name__ == "__main__":
    main()
