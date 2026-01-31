"""
Comprehensive Dummy Data Generator for Dashboard Testing
This script creates realistic test data for all Dashboard components:
- Inventory headers (categories)
- Stock movements
- Parties (customers and vendors)
- Invoices (with outstanding amounts)
- Purchases
- Job cards
- Finance accounts and transactions
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import os
from dotenv import load_dotenv
from pathlib import Path
import uuid
from datetime import datetime, timezone, timedelta
import random

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ==================== HELPER FUNCTIONS ====================

def get_random_date(days_back=90):
    """Generate a random date within the last N days"""
    return datetime.now(timezone.utc) - timedelta(days=random.randint(0, days_back))

def generate_id():
    """Generate UUID"""
    return str(uuid.uuid4())

# ==================== DATA GENERATION ====================

async def seed_comprehensive_dashboard_data():
    print("="*80)
    print("STARTING COMPREHENSIVE DASHBOARD DATA GENERATION")
    print("="*80)
    
    # Get or create admin user
    admin_user = await db.users.find_one({"username": "admin"})
    if not admin_user:
        admin_user = {
            "id": str(uuid.uuid4()),
            "username": "admin",
            "email": "admin@goldshop.com",
            "full_name": "Admin User",
            "role": "admin",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_deleted": False,
            "deleted_at": None,
            "deleted_by": None,
            "hashed_password": pwd_context.hash("admin123"),
            "permissions": []  # Will be populated by migration script
        }
        await db.users.insert_one(admin_user)
        print("✓ Created admin user")
    admin_id = admin_user["id"]
    
    # ==================== 1. INVENTORY HEADERS (Categories) ====================
    print("\n[1/8] Creating Inventory Headers...")
    inventory_headers = [
        "Chain", "Ring", "Bangle", "Necklace", 
        "Bracelet", "Coin", "Biscuit", "Others",
        "Earrings", "Pendant"
    ]
    
    header_ids = []
    header_names = {}  # Store mapping for header_id -> header_name
    for header_name in inventory_headers:
        existing = await db.inventory_headers.find_one({"name": header_name, "is_deleted": False})
        if not existing:
            header_id = generate_id()
            header = {
                "id": header_id,
                "name": header_name,
                "current_qty": 0.0,  # Initialize stock tracking fields
                "current_weight": 0.0,  # Initialize weight tracking fields
                "is_active": True,
                "created_at": get_random_date(180).isoformat(),
                "created_by": admin_id,
                "is_deleted": False
            }
            await db.inventory_headers.insert_one(header)
            header_ids.append(header_id)
            header_names[header_id] = header_name
            print(f"  ✓ Created header: {header_name}")
        else:
            header_ids.append(existing["id"])
            header_names[existing["id"]] = existing["name"]
            print(f"  ✓ Header exists: {header_name}")
    
    # ==================== 2. STOCK MOVEMENTS ====================
    print("\n[2/8] Creating Stock Movements...")
    purities = [916, 875, 999, 750]  # Different gold purities
    movement_count = 0
    
    # Track totals per header for updating
    header_totals = {hid: {'qty': 0.0, 'weight': 0.0} for hid in header_ids}
    
    for header_id in header_ids[:8]:  # First 8 headers get stock
        # Start with initial stock (IN movements)
        num_in_movements = random.randint(8, 12)  # More IN movements first
        for _ in range(num_in_movements):
            movement_id = generate_id()
            purity = random.choice(purities)
            qty = random.randint(5, 15)  # Larger quantities for IN
            weight = round(random.uniform(10.0, 200.0), 3)  # Larger weights for IN
            
            # IN movement
            qty_delta = qty
            weight_delta = weight
            
            # Update running totals
            header_totals[header_id]['qty'] += qty_delta
            header_totals[header_id]['weight'] += weight_delta
            
            movement = {
                "id": movement_id,
                "date": get_random_date(60),
                "movement_type": "IN",
                "header_id": header_id,
                "header_name": header_names[header_id],
                "description": f"Stock IN - {random.choice(['Purchase', 'Return', 'Opening Stock', 'Transfer In'])}",
                "qty_delta": qty_delta,
                "weight_delta": round(weight_delta, 3),
                "purity": purity,
                "created_by": admin_id,
                "notes": f"Test stock data - purity {purity}",
                "is_deleted": False
            }
            await db.stock_movements.insert_one(movement)
            movement_count += 1
        
        # Then add some OUT movements (less than IN to maintain positive stock)
        num_out_movements = random.randint(2, 5)  # Fewer OUT movements
        for _ in range(num_out_movements):
            movement_id = generate_id()
            purity = random.choice(purities)
            
            # Calculate max we can take out (leave at least 50% stock)
            max_qty_out = max(1, int(header_totals[header_id]['qty'] * 0.3))
            max_weight_out = max(10.0, header_totals[header_id]['weight'] * 0.3)
            
            qty = random.randint(1, max_qty_out)
            weight = round(random.uniform(5.0, min(50.0, max_weight_out)), 3)
            
            # OUT movement (negative deltas)
            qty_delta = -qty
            weight_delta = -weight
            
            # Update running totals
            header_totals[header_id]['qty'] += qty_delta
            header_totals[header_id]['weight'] += weight_delta
            
            movement = {
                "id": movement_id,
                "date": get_random_date(60),
                "movement_type": "OUT",
                "header_id": header_id,
                "header_name": header_names[header_id],
                "description": f"Stock OUT - {random.choice(['Sale', 'Job Card', 'Transfer Out', 'Adjustment'])}",
                "qty_delta": qty_delta,
                "weight_delta": round(weight_delta, 3),
                "purity": purity,
                "created_by": admin_id,
                "notes": f"Test stock data - purity {purity}",
                "is_deleted": False
            }
            await db.stock_movements.insert_one(movement)
            movement_count += 1
    
    # Update inventory headers with calculated totals
    print(f"  ✓ Created {movement_count} stock movements across {len(header_ids[:8])} categories")
    print("  ✓ Updating inventory headers with stock totals...")
    
    for header_id, totals in header_totals.items():
        if header_id in header_ids[:8]:  # Only update headers that got movements
            await db.inventory_headers.update_one(
                {"id": header_id},
                {
                    "$set": {
                        "current_qty": max(0, round(totals['qty'], 2)),  # Ensure non-negative
                        "current_weight": max(0, round(totals['weight'], 3))  # Ensure non-negative
                    }
                }
            )
    print("  ✓ Updated inventory header totals")
    
    # ==================== 3. PARTIES (Customers & Vendors) ====================
    print("\n[3/8] Creating Parties...")
    
    customer_names = [
        "Ahmed Al-Farsi", "Fatima Hassan", "Mohammed Al-Balushi",
        "Aisha Al-Zadjali", "Khalid Al-Harthi", "Mariam Al-Rawahi",
        "Salem Al-Busaidi", "Noura Al-Habsi", "Abdullah Al-Mahrouqi",
        "Layla Al-Kharusi", "Rashid Al-Ghafri", "Sumaya Al-Sinani"
    ]
    
    vendor_names = [
        "Gold Suppliers LLC", "Premium Metals Trading",
        "Al-Dhahab Gold House", "International Bullion Co."
    ]
    
    customer_ids = []
    vendor_ids = []
    
    # Create customers
    for name in customer_names:
        existing = await db.parties.find_one({"name": name, "is_deleted": False})
        if not existing:
            party_id = generate_id()
            party = {
                "id": party_id,
                "name": name,
                "party_type": "customer",
                "phone": f"+968 {random.randint(90000000, 99999999)}",
                "email": f"{name.lower().replace(' ', '.')}@example.om",
                "address": f"Building {random.randint(1, 200)}, Street {random.randint(1, 50)}, Muscat",
                "notes": "Test customer data",
                "credit_limit": round(random.uniform(5000.0, 20000.0), 2),
                "current_balance": round(random.uniform(-5000.0, 10000.0), 2),
                "created_at": get_random_date(180).isoformat(),
                "created_by": admin_id,
                "is_deleted": False
            }
            await db.parties.insert_one(party)
            customer_ids.append(party_id)
            print(f"  ✓ Created customer: {name}")
        else:
            customer_ids.append(existing["id"])
    
    # Create vendors
    for name in vendor_names:
        existing = await db.parties.find_one({"name": name, "is_deleted": False})
        if not existing:
            party_id = generate_id()
            party = {
                "id": party_id,
                "name": name,
                "party_type": "vendor",
                "phone": f"+968 {random.randint(90000000, 99999999)}",
                "email": f"{name.lower().replace(' ', '.')}@example.om",
                "address": f"Industrial Area, Muscat",
                "notes": "Test vendor data",
                "credit_limit": round(random.uniform(50000.0, 200000.0), 2),
                "current_balance": round(random.uniform(-20000.0, 0.0), 2),
                "created_at": get_random_date(180).isoformat(),
                "created_by": admin_id,
                "is_deleted": False
            }
            await db.parties.insert_one(party)
            vendor_ids.append(party_id)
            print(f"  ✓ Created vendor: {name}")
        else:
            vendor_ids.append(existing["id"])
    
    print(f"  ✓ Created {len(customer_ids)} customers and {len(vendor_ids)} vendors")
    
    # ==================== 4. INVOICES (with Outstanding Amounts) ====================
    print("\n[4/8] Creating Invoices...")
    
    invoice_count = 0
    for customer_id in customer_ids[:8]:  # Create invoices for 8 customers
        # Create 2-5 invoices per customer
        num_invoices = random.randint(2, 5)
        for _ in range(num_invoices):
            invoice_id = generate_id()
            invoice_number = f"INV-{random.randint(1000, 9999)}"
            total_amount = round(random.uniform(500.0, 5000.0), 2)
            
            # Some invoices fully paid, some partially, some unpaid
            payment_status = random.choice(["full", "partial", "none"])
            if payment_status == "full":
                paid_amount = total_amount
                balance_due = 0.0
            elif payment_status == "partial":
                paid_amount = round(total_amount * random.uniform(0.2, 0.8), 2)
                balance_due = round(total_amount - paid_amount, 2)
            else:
                paid_amount = 0.0
                balance_due = total_amount
            
            invoice = {
                "id": invoice_id,
                "invoice_number": invoice_number,
                "customer_party_id": customer_id,
                "invoice_date": get_random_date(90).isoformat(),
                "due_date": (get_random_date(90) + timedelta(days=30)).isoformat(),
                "status": "finalized" if random.random() > 0.2 else "draft",
                "items": [
                    {
                        "header_id": random.choice(header_ids[:8]),
                        "description": f"Gold {random.choice(['Chain', 'Ring', 'Bangle', 'Necklace'])}",
                        "gross_weight": round(random.uniform(10.0, 50.0), 3),
                        "stone_weight": round(random.uniform(0.0, 5.0), 3),
                        "net_weight": round(random.uniform(10.0, 50.0), 3),
                        "purity": random.choice(purities),
                        "rate_per_gram": round(random.uniform(45.0, 65.0), 2),
                        "making_charges": round(random.uniform(50.0, 200.0), 2),
                        "item_total": round(random.uniform(200.0, 2000.0), 2)
                    }
                ],
                "subtotal": total_amount,
                "discount_percentage": round(random.uniform(0.0, 5.0), 2),
                "discount_amount": round(total_amount * random.uniform(0.0, 0.05), 2),
                "vat_percentage": 5.0,
                "vat_amount": round(total_amount * 0.05, 2),
                "total_amount": total_amount,
                "paid_amount_money": paid_amount,
                "balance_due": balance_due,
                "notes": "Test invoice data",
                "created_at": get_random_date(90).isoformat(),
                "created_by": admin_id,
                "is_deleted": False
            }
            await db.invoices.insert_one(invoice)
            invoice_count += 1
    
    print(f"  ✓ Created {invoice_count} invoices with varying outstanding amounts")
    
    # ==================== 5. PURCHASES ====================
    print("\n[5/8] Creating Purchases...")
    
    purchase_count = 0
    for vendor_id in vendor_ids:  # Create purchases from all vendors
        num_purchases = random.randint(3, 8)
        for _ in range(num_purchases):
            purchase_id = generate_id()
            purchase_number = f"PUR-{random.randint(1000, 9999)}"
            weight = round(random.uniform(100.0, 500.0), 3)
            rate = round(random.uniform(45.0, 55.0), 2)
            total_amount = round(weight * rate, 2)
            
            purchase = {
                "id": purchase_id,
                "purchase_number": purchase_number,
                "vendor_party_id": vendor_id,
                "date": get_random_date(90).isoformat(),
                "description": f"Gold purchase - {random.choice(['Bars', 'Scrap', 'Jewelry'])}",
                "weight_grams": weight,
                "entered_purity": random.choice(purities),
                "rate_per_gram": rate,
                "amount_total": total_amount,
                "paid_amount_money": round(total_amount * random.uniform(0.0, 1.0), 2),
                "balance_due": round(total_amount * random.uniform(0.0, 0.5), 2),
                "status": "finalized" if random.random() > 0.3 else "draft",
                "notes": "Test purchase data",
                "created_at": get_random_date(90).isoformat(),
                "created_by": admin_id,
                "is_deleted": False
            }
            await db.purchases.insert_one(purchase)
            purchase_count += 1
    
    print(f"  ✓ Created {purchase_count} purchases")
    
    # ==================== 6. JOB CARDS ====================
    print("\n[6/8] Creating Job Cards...")
    
    job_statuses = ["pending", "in_progress", "completed", "delivered"]
    job_count = 0
    
    for customer_id in customer_ids[:10]:  # Create job cards for 10 customers
        num_jobs = random.randint(1, 3)
        for _ in range(num_jobs):
            job_id = generate_id()
            job_number = f"JOB-{random.randint(1000, 9999)}"
            
            jobcard = {
                "id": job_id,
                "job_number": job_number,
                "customer_party_id": customer_id,
                "customer_name": None,  # Using party
                "worker_name": random.choice(["Ali", "Hassan", "Khalid", "Omar", "Zaid"]),
                "job_type": random.choice(["repair", "making", "polishing", "resizing"]),
                "description": f"Gold {random.choice(['chain repair', 'ring resize', 'bangle polish', 'necklace making'])}",
                "received_items": f"{random.randint(1, 3)} pieces",
                "gross_weight": round(random.uniform(10.0, 100.0), 3),
                "stone_weight": round(random.uniform(0.0, 10.0), 3),
                "net_weight": round(random.uniform(10.0, 100.0), 3),
                "purity": random.choice(purities),
                "due_date": (datetime.now(timezone.utc) + timedelta(days=random.randint(1, 30))).isoformat(),
                "status": random.choice(job_statuses),
                "labour_charges": round(random.uniform(50.0, 500.0), 2),
                "material_cost": round(random.uniform(0.0, 1000.0), 2),
                "total_cost": round(random.uniform(100.0, 1500.0), 2),
                "paid_amount": round(random.uniform(0.0, 500.0), 2),
                "notes": "Test job card data",
                "created_at": get_random_date(60).isoformat(),
                "created_by": admin_id,
                "is_deleted": False
            }
            await db.jobcards.insert_one(jobcard)
            job_count += 1
    
    print(f"  ✓ Created {job_count} job cards")
    
    # ==================== 7. FINANCE ACCOUNTS ====================
    print("\n[7/8] Creating Finance Accounts...")
    
    account_names = [
        "Cash Account - Main", "Bank Account - Commercial Bank",
        "Bank Account - National Bank", "Petty Cash",
        "Sales Account", "Purchase Account"
    ]
    
    account_ids = []
    for acc_name in account_names:
        existing = await db.accounts.find_one({"name": acc_name, "is_deleted": False})
        if not existing:
            account_id = generate_id()
            account = {
                "id": account_id,
                "name": acc_name,
                "account_type": "cash" if "Cash" in acc_name else "bank",
                "opening_balance": round(random.uniform(5000.0, 50000.0), 2),
                "current_balance": round(random.uniform(10000.0, 100000.0), 2),
                "notes": "Test account data",
                "created_at": get_random_date(180).isoformat(),
                "created_by": admin_id,
                "is_deleted": False
            }
            await db.accounts.insert_one(account)
            account_ids.append(account_id)
            print(f"  ✓ Created account: {acc_name}")
        else:
            account_ids.append(existing["id"])
    
    # ==================== 8. TRANSACTIONS ====================
    print("\n[8/8] Creating Transactions...")
    
    transaction_categories = ["sales", "purchase", "expense", "salary", "rent", "utilities"]
    transaction_count = 0
    
    for account_id in account_ids:
        num_transactions = random.randint(10, 20)
        for _ in range(num_transactions):
            transaction_id = generate_id()
            
            transaction = {
                "id": transaction_id,
                "account_id": account_id,
                "transaction_type": random.choice(["credit", "debit"]),
                "mode": random.choice(["cash", "bank_transfer", "cheque", "card"]),
                "amount": round(random.uniform(100.0, 5000.0), 2),
                "date": get_random_date(90).isoformat(),
                "party_name": random.choice([None, "Ahmed", "Fatima", "Mohammed"]),
                "category": random.choice(transaction_categories),
                "notes": "Test transaction data",
                "reference_number": f"TXN-{random.randint(10000, 99999)}",
                "created_at": get_random_date(90).isoformat(),
                "created_by": admin_id,
                "is_deleted": False
            }
            await db.transactions.insert_one(transaction)
            transaction_count += 1
    
    print(f"  ✓ Created {transaction_count} transactions")
    
    # ==================== SUMMARY ====================
    print("\n" + "="*80)
    print("✅ COMPREHENSIVE DASHBOARD DATA GENERATION COMPLETED!")
    print("="*80)
    print(f"""
Summary of Generated Data:
  • Inventory Headers: {len(header_ids)} categories
  • Stock Movements: {movement_count} movements
  • Parties: {len(customer_ids)} customers, {len(vendor_ids)} vendors
  • Invoices: {invoice_count} invoices (with outstanding amounts)
  • Purchases: {purchase_count} purchases
  • Job Cards: {job_count} job cards
  • Finance Accounts: {len(account_ids)} accounts
  • Transactions: {transaction_count} transactions

Dashboard is now ready for comprehensive testing with realistic data!

Login Credentials:
  Username: admin
  Password: admin123
    """)

if __name__ == "__main__":
    asyncio.run(seed_comprehensive_dashboard_data())
    client.close()
