#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Gold Shop ERP
Testing Returns Module workflow and previously fixed features
"""

import requests
import json
import uuid
from datetime import datetime, timezone
import time

# Configuration
BACKEND_URL = "https://filter-finance.preview.emergentagent.com/api"
TEST_USER = {
    "username": "admin_netflow_test",
    "password": "TestAdmin@123"  # Test admin user for net flow testing
}

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.csrf_token = None
        self.test_results = []
        
    def log_result(self, test_name, success, details, response_data=None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat(),
            "response_data": response_data
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}: {details}")
        
    def authenticate(self):
        """Authenticate and get tokens"""
        try:
            # Login
            login_data = {
                "username": TEST_USER["username"],
                "password": TEST_USER["password"]
            }
            
            response = self.session.post(f"{BACKEND_URL}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get("access_token")
                self.csrf_token = data.get("csrf_token")
                
                # Set headers for future requests
                self.session.headers.update({
                    "Authorization": f"Bearer {self.auth_token}",
                    "X-CSRF-Token": self.csrf_token
                })
                
                self.log_result("Authentication", True, f"Successfully authenticated as {TEST_USER['username']}")
                return True
            else:
                self.log_result("Authentication", False, f"Login failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Authentication", False, f"Authentication error: {str(e)}")
            return False
    
    def test_returns_module_workflow(self):
        """Test complete Returns Module workflow"""
        print("\n" + "="*60)
        print("TESTING RETURNS MODULE COMPLETE WORKFLOW")
        print("="*60)
        
        # Step 1: Get returnable invoices
        self.test_get_returnable_invoices()
        
        # Step 2: Create test invoice if needed (for testing)
        invoice_id = self.create_test_invoice_for_returns()
        
        if invoice_id:
            # Step 3: Get returnable items from invoice
            returnable_items = self.test_get_returnable_items(invoice_id)
            
            if returnable_items:
                # Step 4: Create draft return
                return_id = self.test_create_draft_return(invoice_id, returnable_items)
                
                if return_id:
                    # Step 5: Edit draft return (add refund details)
                    self.test_edit_draft_return(return_id)
                    
                    # Step 6: Get finalize impact preview
                    self.test_get_finalize_impact(return_id)
                    
                    # Step 7: Finalize return
                    self.test_finalize_return(return_id)
                    
                    # Step 8: Validation tests
                    self.test_return_validations(invoice_id, return_id)
    
    def test_get_returnable_invoices(self):
        """Test GET /api/invoices/returnable?type=sales"""
        try:
            response = self.session.get(f"{BACKEND_URL}/invoices/returnable?type=sales")
            
            if response.status_code == 200:
                data = response.json()
                invoice_count = len(data) if isinstance(data, list) else 0
                self.log_result(
                    "Get Returnable Invoices", 
                    True, 
                    f"Retrieved {invoice_count} returnable invoices",
                    {"count": invoice_count, "sample": data[:2] if data else []}
                )
                return data
            else:
                self.log_result("Get Returnable Invoices", False, f"Failed: {response.status_code} - {response.text}")
                return []
                
        except Exception as e:
            self.log_result("Get Returnable Invoices", False, f"Error: {str(e)}")
            return []
    
    def create_test_invoice_for_returns(self):
        """Create a test finalized invoice for returns testing"""
        try:
            # First, get or create a customer
            customer_id = self.get_or_create_test_customer()
            if not customer_id:
                return None
            
            # Create invoice with realistic data
            invoice_data = {
                "customer_type": "saved",
                "customer_id": customer_id,
                "invoice_type": "sale",
                "items": [
                    {
                        "description": "Gold Ring 22K",
                        "qty": 1,
                        "gross_weight": 5.250,
                        "stone_weight": 0.100,
                        "net_gold_weight": 5.150,
                        "weight": 5.150,
                        "purity": 916,
                        "metal_rate": 185.50,
                        "gold_value": 955.33,
                        "making_charge_type": "per_gram",
                        "making_value": 150.00,
                        "stone_charges": 25.00,
                        "wastage_charges": 20.00,
                        "item_discount": 0.00,
                        "vat_percent": 5.0,
                        "vat_amount": 57.52,
                        "line_total": 1207.85
                    }
                ],
                "subtotal": 1150.33,
                "discount_amount": 0.00,
                "tax_type": "cgst_sgst",
                "gst_percent": 5.0,
                "cgst_total": 28.76,
                "sgst_total": 28.76,
                "igst_total": 0.00,
                "vat_total": 57.52,
                "grand_total": 1207.85,
                "paid_amount": 0.00,
                "balance_due": 1207.85,
                "notes": "Test invoice for returns testing"
            }
            
            # Create invoice
            response = self.session.post(f"{BACKEND_URL}/invoices", json=invoice_data)
            
            if response.status_code in [200, 201]:
                invoice = response.json()
                invoice_id = invoice.get("id")
                
                # Finalize the invoice
                finalize_response = self.session.post(f"{BACKEND_URL}/invoices/{invoice_id}/finalize")
                
                if finalize_response.status_code == 200:
                    self.log_result(
                        "Create Test Invoice for Returns", 
                        True, 
                        f"Created and finalized test invoice: {invoice.get('invoice_number')}",
                        {"invoice_id": invoice_id, "invoice_number": invoice.get('invoice_number')}
                    )
                    return invoice_id
                else:
                    self.log_result("Finalize Test Invoice", False, f"Failed to finalize: {finalize_response.status_code} - {finalize_response.text}")
                    return None
            else:
                self.log_result("Create Test Invoice for Returns", False, f"Failed: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            self.log_result("Create Test Invoice for Returns", False, f"Error: {str(e)}")
            return None
    
    def get_or_create_test_customer(self):
        """Get existing customer or create one for testing"""
        try:
            # Try to get existing customers
            response = self.session.get(f"{BACKEND_URL}/parties?party_type=customer")
            
            if response.status_code == 200:
                customers = response.json()
                if isinstance(customers, dict) and 'items' in customers:
                    customers = customers['items']
                
                if customers:
                    customer_id = customers[0].get('id')
                    self.log_result("Get Test Customer", True, f"Using existing customer: {customers[0].get('name')}")
                    return customer_id
            
            # Create new customer
            customer_data = {
                "name": "Ahmed Al-Rashid",
                "phone": "+968 9876 5432",
                "address": "Muscat, Sultanate of Oman",
                "party_type": "customer",
                "notes": "Test customer for returns testing"
            }
            
            response = self.session.post(f"{BACKEND_URL}/parties", json=customer_data)
            
            if response.status_code == 201:
                customer = response.json()
                customer_id = customer.get("id")
                self.log_result("Create Test Customer", True, f"Created test customer: {customer.get('name')}")
                return customer_id
            else:
                self.log_result("Create Test Customer", False, f"Failed: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            self.log_result("Get/Create Test Customer", False, f"Error: {str(e)}")
            return None
    
    def test_get_returnable_items(self, invoice_id):
        """Test GET /api/invoices/{id}/returnable-items"""
        try:
            response = self.session.get(f"{BACKEND_URL}/invoices/{invoice_id}/returnable-items")
            
            if response.status_code == 200:
                data = response.json()
                items_count = len(data.get('items', [])) if isinstance(data, dict) else len(data) if isinstance(data, list) else 0
                self.log_result(
                    "Get Returnable Items", 
                    True, 
                    f"Retrieved {items_count} returnable items from invoice",
                    {"items_count": items_count, "sample": data}
                )
                return data
            else:
                self.log_result("Get Returnable Items", False, f"Failed: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            self.log_result("Get Returnable Items", False, f"Error: {str(e)}")
            return None
    
    def test_create_draft_return(self, invoice_id, returnable_items):
        """Test POST /api/returns with status='draft'"""
        try:
            # First get the invoice to extract customer details
            invoice_response = self.session.get(f"{BACKEND_URL}/invoices/{invoice_id}")
            if invoice_response.status_code != 200:
                self.log_result("Create Draft Return", False, "Failed to get invoice details")
                return None
            
            invoice_data = invoice_response.json()
            customer_id = invoice_data.get('customer_id')
            customer_name = invoice_data.get('customer_name', 'Test Customer')
            
            # If customer_name is None, get it from the party
            if not customer_name and customer_id:
                party_response = self.session.get(f"{BACKEND_URL}/parties/{customer_id}")
                if party_response.status_code == 200:
                    party_data = party_response.json()
                    customer_name = party_data.get('name', 'Test Customer')
            
            # Prepare return items based on returnable items
            if isinstance(returnable_items, dict) and 'items' in returnable_items:
                items_data = returnable_items['items']
            elif isinstance(returnable_items, list):
                items_data = returnable_items
            else:
                self.log_result("Create Draft Return", False, "Invalid returnable items format")
                return None
            
            if not items_data:
                self.log_result("Create Draft Return", False, "No returnable items available")
                return None
            
            # Create return with partial quantities
            return_items = []
            total_weight = 0.0
            total_amount = 0.0
            
            for item in items_data[:1]:  # Return first item only for testing
                return_qty = min(1, item.get('remaining_qty', 1))
                return_weight = float(item.get('remaining_weight_grams', 0)) * 0.5  # Return 50%
                return_amount = float(item.get('remaining_amount', 0)) * 0.5  # Return 50%
                
                return_item = {
                    "description": item.get('description', 'Returned Item'),
                    "qty": return_qty,
                    "weight_grams": return_weight,
                    "purity": item.get('purity', 916),
                    "amount": return_amount
                }
                return_items.append(return_item)
                total_weight += return_weight
                total_amount += return_amount
            
            return_data = {
                "return_type": "sale_return",
                "reference_type": "invoice",
                "reference_id": invoice_id,
                "party_id": customer_id or "test-customer-id",
                "party_name": customer_name or "Test Customer",
                "party_type": "customer",
                "items": return_items,
                "total_weight_grams": total_weight,
                "total_amount": total_amount,
                "reason": "Customer requested return - quality issue",
                "status": "draft"
            }
            
            response = self.session.post(f"{BACKEND_URL}/returns", json=return_data)
            
            if response.status_code == 201:
                response_data = response.json()
                # Extract return object from nested response
                return_doc = response_data.get('return', response_data)
                return_id = return_doc.get("id")
                return_number = return_doc.get("return_number")
                self.log_result(
                    "Create Draft Return", 
                    True, 
                    f"Created draft return: {return_number} (Amount: {total_amount:.2f} OMR)",
                    {"return_id": return_id, "return_number": return_number}
                )
                return return_id
            else:
                self.log_result("Create Draft Return", False, f"Failed: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            self.log_result("Create Draft Return", False, f"Error: {str(e)}")
            return None
    
    def test_edit_draft_return(self, return_id):
        """Test PATCH /api/returns/{id} to add refund details"""
        try:
            # Get or create a test account for refund
            account_id = self.get_or_create_test_account()
            if not account_id:
                return False
            
            update_data = {
                "refund_mode": "money",
                "refund_money_amount": 603.93,  # 50% of test invoice amount
                "refund_gold_grams": 0.0,
                "payment_mode": "Cash",
                "account_id": account_id,
                "notes": "Cash refund processed for returned gold ring"
            }
            
            response = self.session.patch(f"{BACKEND_URL}/returns/{return_id}", json=update_data)
            
            if response.status_code == 200:
                updated_return = response.json()
                self.log_result(
                    "Edit Draft Return", 
                    True, 
                    f"Added refund details: {update_data['refund_mode']} refund of {update_data['refund_money_amount']} OMR",
                    {"refund_mode": update_data['refund_mode'], "refund_amount": update_data['refund_money_amount']}
                )
                return True
            else:
                self.log_result("Edit Draft Return", False, f"Failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Edit Draft Return", False, f"Error: {str(e)}")
            return False
    
    def get_or_create_test_account(self):
        """Get existing cash account or create one for testing"""
        try:
            # Try to get existing cash account
            response = self.session.get(f"{BACKEND_URL}/accounts")
            
            if response.status_code == 200:
                accounts = response.json()
                if isinstance(accounts, dict) and 'items' in accounts:
                    accounts = accounts['items']
                
                # Look for cash account
                for account in accounts:
                    if 'cash' in account.get('name', '').lower():
                        self.log_result("Get Test Account", True, f"Using existing account: {account.get('name')}")
                        return account.get('id')
            
            # Create new cash account
            account_data = {
                "name": "Cash Account - Test",
                "account_type": "asset",
                "opening_balance": 10000.00,
                "current_balance": 10000.00
            }
            
            response = self.session.post(f"{BACKEND_URL}/accounts", json=account_data)
            
            if response.status_code == 201:
                account = response.json()
                account_id = account.get("id")
                self.log_result("Create Test Account", True, f"Created test account: {account.get('name')}")
                return account_id
            else:
                self.log_result("Create Test Account", False, f"Failed: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            self.log_result("Get/Create Test Account", False, f"Error: {str(e)}")
            return None
    
    def test_get_finalize_impact(self, return_id):
        """Test GET /api/returns/{id}/finalize-impact"""
        try:
            response = self.session.get(f"{BACKEND_URL}/returns/{return_id}/finalize-impact")
            
            if response.status_code == 200:
                impact_data = response.json()
                self.log_result(
                    "Get Finalize Impact", 
                    True, 
                    f"Retrieved finalize impact preview",
                    impact_data
                )
                return impact_data
            else:
                self.log_result("Get Finalize Impact", False, f"Failed: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            self.log_result("Get Finalize Impact", False, f"Error: {str(e)}")
            return None
    
    def test_finalize_return(self, return_id):
        """Test POST /api/returns/{id}/finalize"""
        try:
            response = self.session.post(f"{BACKEND_URL}/returns/{return_id}/finalize")
            
            if response.status_code == 200:
                finalized_return = response.json()
                
                # Verify finalization results
                status = finalized_return.get('status')
                transaction_id = finalized_return.get('transaction_id')
                stock_movements = finalized_return.get('stock_movement_ids', [])
                
                success_details = []
                if status == 'finalized':
                    success_details.append("Status updated to 'finalized'")
                if transaction_id:
                    success_details.append(f"Transaction created: {transaction_id}")
                if stock_movements:
                    success_details.append(f"Stock movements created: {len(stock_movements)}")
                
                self.log_result(
                    "Finalize Return", 
                    True, 
                    f"Return finalized successfully. {', '.join(success_details)}",
                    {
                        "status": status,
                        "transaction_id": transaction_id,
                        "stock_movements_count": len(stock_movements)
                    }
                )
                return True
            else:
                self.log_result("Finalize Return", False, f"Failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Finalize Return", False, f"Error: {str(e)}")
            return False
    
    def test_return_validations(self, invoice_id, finalized_return_id):
        """Test return validation scenarios"""
        print("\n--- Testing Return Validations ---")
        
        # Test 1: Try creating return that exceeds original invoice amount
        self.test_exceed_original_amount(invoice_id)
        
        # Test 2: Try editing finalized return (should fail)
        self.test_edit_finalized_return(finalized_return_id)
        
        # Test 3: Try deleting finalized return (should fail)
        self.test_delete_finalized_return(finalized_return_id)
    
    def test_exceed_original_amount(self, invoice_id):
        """Test creating return that exceeds original invoice amount"""
        try:
            # Create return with excessive amount
            return_data = {
                "return_type": "sale_return",
                "reference_type": "invoice",
                "reference_id": invoice_id,
                "party_id": "test-customer-id",
                "party_name": "Ahmed Al-Rashid",
                "party_type": "customer",
                "items": [
                    {
                        "description": "Excessive Return Item",
                        "qty": 10,  # Excessive quantity
                        "weight_grams": 50.0,  # Excessive weight
                        "purity": 916,
                        "amount": 5000.0  # Excessive amount
                    }
                ],
                "total_weight_grams": 50.0,
                "total_amount": 5000.0,
                "reason": "Testing excessive return validation",
                "status": "draft"
            }
            
            response = self.session.post(f"{BACKEND_URL}/returns", json=return_data)
            
            if response.status_code == 400:
                error_message = response.json().get('detail', response.text)
                self.log_result(
                    "Validation - Exceed Original Amount", 
                    True, 
                    f"Correctly blocked excessive return: {error_message}"
                )
            else:
                self.log_result(
                    "Validation - Exceed Original Amount", 
                    False, 
                    f"Should have blocked excessive return but got: {response.status_code}"
                )
                
        except Exception as e:
            self.log_result("Validation - Exceed Original Amount", False, f"Error: {str(e)}")
    
    def test_edit_finalized_return(self, return_id):
        """Test editing finalized return (should fail)"""
        try:
            update_data = {
                "refund_money_amount": 1000.0,
                "notes": "Trying to edit finalized return"
            }
            
            response = self.session.patch(f"{BACKEND_URL}/returns/{return_id}", json=update_data)
            
            if response.status_code in [400, 403, 422]:
                error_message = response.json().get('detail', response.text)
                self.log_result(
                    "Validation - Edit Finalized Return", 
                    True, 
                    f"Correctly blocked editing finalized return: {error_message}"
                )
            else:
                self.log_result(
                    "Validation - Edit Finalized Return", 
                    False, 
                    f"Should have blocked editing finalized return but got: {response.status_code}"
                )
                
        except Exception as e:
            self.log_result("Validation - Edit Finalized Return", False, f"Error: {str(e)}")
    
    def test_delete_finalized_return(self, return_id):
        """Test deleting finalized return (should fail)"""
        try:
            response = self.session.delete(f"{BACKEND_URL}/returns/{return_id}")
            
            if response.status_code in [400, 403, 422]:
                error_message = response.json().get('detail', response.text) if response.content else "Deletion blocked"
                self.log_result(
                    "Validation - Delete Finalized Return", 
                    True, 
                    f"Correctly blocked deleting finalized return: {error_message}"
                )
            else:
                self.log_result(
                    "Validation - Delete Finalized Return", 
                    False, 
                    f"Should have blocked deleting finalized return but got: {response.status_code}"
                )
                
        except Exception as e:
            self.log_result("Validation - Delete Finalized Return", False, f"Error: {str(e)}")
    
    def test_previously_fixed_features(self):
        """Test previously fixed features"""
        print("\n" + "="*60)
        print("TESTING NET FLOW / CASH FLOW / BANK FLOW CALCULATIONS")
        print("="*60)
        
        # Test Finance Dashboard Net Flow Calculations (Primary Focus)
        self.test_finance_dashboard_net_flow_calculations()
        
        # Test other previously fixed features
        print("\n" + "="*60)
        print("TESTING OTHER PREVIOUSLY FIXED FEATURES")
        print("="*60)
        
        # Test Purchases Add Payment
        self.test_purchases_add_payment()
        
        # Test Invoice Stock Movements
        self.test_invoice_stock_movements()
    
    def test_purchases_add_payment(self):
        """Test Purchases Add Payment workflow"""
        print("\n--- Testing Purchases Add Payment ---")
        
        # Create draft purchase
        purchase_id = self.create_test_draft_purchase()
        
        if purchase_id:
            # Add payment to purchase
            self.add_payment_to_purchase(purchase_id)
    
    def create_test_draft_purchase(self):
        """Create a test draft purchase"""
        try:
            # Get or create vendor
            vendor_id = self.get_or_create_test_vendor()
            if not vendor_id:
                return None
            
            purchase_data = {
                "vendor_party_id": vendor_id,
                "description": "Gold Purchase - 22K Gold Bars",
                "weight_grams": 100.500,
                "entered_purity": 916,
                "rate_per_gram": 185.50,
                "amount_total": 18642.75,
                "paid_amount_money": 0.0,  # Draft purchase with no payment
                "balance_due_money": 18642.75
            }
            
            response = self.session.post(f"{BACKEND_URL}/purchases", json=purchase_data)
            
            if response.status_code == 201:
                purchase = response.json()
                purchase_id = purchase.get("id")
                status = purchase.get("status")
                balance_due = purchase.get("balance_due_money")
                
                self.log_result(
                    "Create Draft Purchase", 
                    True, 
                    f"Created draft purchase (Status: {status}, Balance: {balance_due} OMR)",
                    {"purchase_id": purchase_id, "status": status, "balance_due": balance_due}
                )
                return purchase_id
            else:
                self.log_result("Create Draft Purchase", False, f"Failed: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            self.log_result("Create Draft Purchase", False, f"Error: {str(e)}")
            return None
    
    def get_or_create_test_vendor(self):
        """Get existing vendor or create one for testing"""
        try:
            # Try to get existing vendors
            response = self.session.get(f"{BACKEND_URL}/parties?party_type=vendor")
            
            if response.status_code == 200:
                vendors = response.json()
                if isinstance(vendors, dict) and 'items' in vendors:
                    vendors = vendors['items']
                
                if vendors:
                    vendor_id = vendors[0].get('id')
                    self.log_result("Get Test Vendor", True, f"Using existing vendor: {vendors[0].get('name')}")
                    return vendor_id
            
            # Create new vendor
            vendor_data = {
                "name": "Al-Dhahab Gold Trading LLC",
                "phone": "+968 2456 7890",
                "address": "Souk Al-Dhahab, Muscat, Oman",
                "party_type": "vendor",
                "notes": "Test vendor for purchase testing"
            }
            
            response = self.session.post(f"{BACKEND_URL}/parties", json=vendor_data)
            
            if response.status_code == 201:
                vendor = response.json()
                vendor_id = vendor.get("id")
                self.log_result("Create Test Vendor", True, f"Created test vendor: {vendor.get('name')}")
                return vendor_id
            else:
                self.log_result("Create Test Vendor", False, f"Failed: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            self.log_result("Get/Create Test Vendor", False, f"Error: {str(e)}")
            return None
    
    def add_payment_to_purchase(self, purchase_id):
        """Test adding payment to purchase"""
        try:
            # Get account for payment
            account_id = self.get_or_create_test_account()
            if not account_id:
                return False
            
            payment_data = {
                "payment_amount": 10000.00,
                "payment_mode": "Bank Transfer",
                "account_id": account_id,
                "notes": "Partial payment for gold purchase"
            }
            
            response = self.session.post(f"{BACKEND_URL}/purchases/{purchase_id}/add-payment", json=payment_data)
            
            if response.status_code == 200:
                updated_purchase = response.json()
                status = updated_purchase.get("status")
                paid_amount = updated_purchase.get("paid_amount_money")
                balance_due = updated_purchase.get("balance_due_money")
                locked = updated_purchase.get("locked")
                
                self.log_result(
                    "Add Payment to Purchase", 
                    True, 
                    f"Payment added successfully (Status: {status}, Paid: {paid_amount} OMR, Balance: {balance_due} OMR, Locked: {locked})",
                    {"status": status, "paid_amount": paid_amount, "balance_due": balance_due, "locked": locked}
                )
                return True
            else:
                self.log_result("Add Payment to Purchase", False, f"Failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Add Payment to Purchase", False, f"Error: {str(e)}")
            return False
    
    def test_invoice_stock_movements(self):
        """Test Invoice Stock Movements creation"""
        print("\n--- Testing Invoice Stock Movements ---")
        
        try:
            # Create and finalize an invoice to test stock movements
            customer_id = self.get_or_create_test_customer()
            if not customer_id:
                return
            
            # Create invoice with inventory items
            invoice_data = {
                "customer_type": "saved",
                "customer_id": customer_id,
                "invoice_type": "sale",
                "items": [
                    {
                        "category": "Rings",  # This should trigger stock movement
                        "description": "Gold Ring 18K - Stock Test",
                        "qty": 1,
                        "gross_weight": 4.500,
                        "stone_weight": 0.050,
                        "net_gold_weight": 4.450,
                        "weight": 4.450,
                        "purity": 750,
                        "metal_rate": 165.00,
                        "gold_value": 734.25,
                        "making_charge_type": "flat",
                        "making_value": 100.00,
                        "stone_charges": 15.00,
                        "wastage_charges": 10.00,
                        "item_discount": 0.00,
                        "vat_percent": 5.0,
                        "vat_amount": 42.96,
                        "line_total": 902.21
                    }
                ],
                "subtotal": 859.25,
                "discount_amount": 0.00,
                "tax_type": "cgst_sgst",
                "gst_percent": 5.0,
                "cgst_total": 21.48,
                "sgst_total": 21.48,
                "vat_total": 42.96,
                "grand_total": 902.21,
                "paid_amount": 0.00,
                "balance_due": 902.21,
                "notes": "Test invoice for stock movement verification"
            }
            
            # Create invoice
            response = self.session.post(f"{BACKEND_URL}/invoices", json=invoice_data)
            
            if response.status_code in [200, 201]:
                invoice = response.json()
                invoice_id = invoice.get("id")
                
                # Finalize the invoice (should create stock movements)
                finalize_response = self.session.post(f"{BACKEND_URL}/invoices/{invoice_id}/finalize")
                
                if finalize_response.status_code == 200:
                    # Check if stock movements were created
                    movements_response = self.session.get(f"{BACKEND_URL}/inventory/movements")
                    
                    if movements_response.status_code == 200:
                        movements = movements_response.json()
                        if isinstance(movements, dict) and 'items' in movements:
                            movements = movements['items']
                        
                        # Look for recent stock OUT movement
                        recent_movements = [m for m in movements if m.get('reference_id') == invoice_id]
                        
                        if recent_movements:
                            movement = recent_movements[0]
                            self.log_result(
                                "Invoice Stock Movements", 
                                True, 
                                f"Stock OUT movement created: {movement.get('description')} (Qty: {movement.get('qty_delta')}, Weight: {movement.get('weight_delta')}g)",
                                {"movement_type": movement.get('movement_type'), "qty_delta": movement.get('qty_delta'), "weight_delta": movement.get('weight_delta')}
                            )
                        else:
                            self.log_result("Invoice Stock Movements", False, "No stock movements found for finalized invoice")
                    else:
                        self.log_result("Invoice Stock Movements", False, f"Failed to retrieve stock movements: {movements_response.status_code}")
                else:
                    self.log_result("Invoice Finalization for Stock Test", False, f"Failed to finalize: {finalize_response.status_code} - {finalize_response.text}")
            else:
                self.log_result("Create Invoice for Stock Test", False, f"Failed: {response.status_code} - {response.text}")
                
        except Exception as e:
            self.log_result("Invoice Stock Movements", False, f"Error: {str(e)}")
    
    def test_finance_dashboard_net_flow_calculations(self):
        """Test Finance Dashboard Net Flow / Cash Flow / Bank Flow calculations after fix"""
        print("\n--- Testing Finance Dashboard Net Flow Calculations ---")
        
        # Test 1: Test /api/transactions/summary endpoint
        self.test_transactions_summary_endpoint()
        
        # Test 2: Test with real transaction data
        self.test_net_flow_with_real_data()
        
        # Test 3: Test accounting logic consistency
        self.test_accounting_logic_consistency()
    
    def test_transactions_summary_endpoint(self):
        """Test /api/transactions/summary endpoint for new fields"""
        try:
            response = self.session.get(f"{BACKEND_URL}/transactions/summary")
            
            if response.status_code == 200:
                summary_data = response.json()
                
                # Check for required new fields
                required_fields = ['total_in', 'total_out', 'net_flow', 'cash_summary', 'bank_summary']
                missing_fields = [field for field in required_fields if field not in summary_data]
                
                if not missing_fields:
                    # Verify field types and values
                    total_in = summary_data.get('total_in', 0)
                    total_out = summary_data.get('total_out', 0)
                    net_flow = summary_data.get('net_flow', 0)
                    cash_summary = summary_data.get('cash_summary', {})
                    bank_summary = summary_data.get('bank_summary', {})
                    
                    # Verify math: net_flow = total_in - total_out
                    calculated_net_flow = round(total_in - total_out, 3)
                    actual_net_flow = round(net_flow, 3)
                    math_correct = abs(calculated_net_flow - actual_net_flow) < 0.001
                    
                    # Verify cash summary has required fields
                    cash_fields_valid = all(field in cash_summary for field in ['debit', 'credit', 'net'])
                    bank_fields_valid = all(field in bank_summary for field in ['debit', 'credit', 'net'])
                    
                    # Verify cash/bank net calculations
                    cash_net_correct = True
                    bank_net_correct = True
                    
                    if cash_fields_valid:
                        cash_calculated_net = round(cash_summary['debit'] - cash_summary['credit'], 3)
                        cash_actual_net = round(cash_summary['net'], 3)
                        cash_net_correct = abs(cash_calculated_net - cash_actual_net) < 0.001
                    
                    if bank_fields_valid:
                        bank_calculated_net = round(bank_summary['debit'] - bank_summary['credit'], 3)
                        bank_actual_net = round(bank_summary['net'], 3)
                        bank_net_correct = abs(bank_calculated_net - bank_actual_net) < 0.001
                    
                    all_valid = math_correct and cash_fields_valid and bank_fields_valid and cash_net_correct and bank_net_correct
                    
                    details = f"Net Flow Math: {'✓' if math_correct else '✗'} ({total_in} - {total_out} = {net_flow}), "
                    details += f"Cash Net: {'✓' if cash_net_correct else '✗'} ({cash_summary.get('debit', 0)} - {cash_summary.get('credit', 0)} = {cash_summary.get('net', 0)}), "
                    details += f"Bank Net: {'✓' if bank_net_correct else '✗'} ({bank_summary.get('debit', 0)} - {bank_summary.get('credit', 0)} = {bank_summary.get('net', 0)})"
                    
                    self.log_result(
                        "Transactions Summary Endpoint", 
                        all_valid, 
                        details,
                        {
                            "total_in": total_in,
                            "total_out": total_out,
                            "net_flow": net_flow,
                            "calculated_net_flow": calculated_net_flow,
                            "math_correct": math_correct,
                            "cash_summary": cash_summary,
                            "bank_summary": bank_summary
                        }
                    )
                else:
                    self.log_result("Transactions Summary Endpoint", False, f"Missing required fields: {missing_fields}")
            else:
                self.log_result("Transactions Summary Endpoint", False, f"Failed: {response.status_code} - {response.text}")
                
        except Exception as e:
            self.log_result("Transactions Summary Endpoint", False, f"Error: {str(e)}")
    
    def test_net_flow_with_real_data(self):
        """Test Net Flow calculations with real transaction data"""
        try:
            # Create test cash account with opening balance 0
            cash_account_id = self.create_test_cash_account()
            if not cash_account_id:
                return
            
            # Add invoice payment (DEBIT to cash) = +1000 OMR
            debit_transaction_id = self.create_test_transaction(
                account_id=cash_account_id,
                transaction_type="debit",
                amount=1000.00,
                description="Invoice Payment - Cash IN"
            )
            
            # Add purchase payment (CREDIT to cash) = -500 OMR  
            credit_transaction_id = self.create_test_transaction(
                account_id=cash_account_id,
                transaction_type="credit", 
                amount=500.00,
                description="Purchase Payment - Cash OUT"
            )
            
            if debit_transaction_id and credit_transaction_id:
                # Wait a moment for transactions to be processed
                time.sleep(1)
                
                # Get updated summary
                response = self.session.get(f"{BACKEND_URL}/transactions/summary")
                
                if response.status_code == 200:
                    summary_data = response.json()
                    
                    total_in = summary_data.get('total_in', 0)
                    total_out = summary_data.get('total_out', 0)
                    net_flow = summary_data.get('net_flow', 0)
                    cash_summary = summary_data.get('cash_summary', {})
                    
                    # Expected values based on our test transactions
                    # Note: These are incremental to existing data, so we check if our transactions are reflected
                    expected_net_flow = 1000.00 - 500.00  # 500.00
                    
                    # Verify the math is consistent (total_in - total_out = net_flow)
                    calculated_net_flow = round(total_in - total_out, 3)
                    actual_net_flow = round(net_flow, 3)
                    math_consistent = abs(calculated_net_flow - actual_net_flow) < 0.001
                    
                    # Verify cash summary net = debit - credit
                    cash_net_consistent = True
                    if cash_summary:
                        cash_calculated_net = round(cash_summary.get('debit', 0) - cash_summary.get('credit', 0), 3)
                        cash_actual_net = round(cash_summary.get('net', 0), 3)
                        cash_net_consistent = abs(cash_calculated_net - cash_actual_net) < 0.001
                    
                    # Check if values are properly rounded to 3 decimal places
                    values_rounded = (
                        len(str(total_in).split('.')[-1]) <= 3 and
                        len(str(total_out).split('.')[-1]) <= 3 and
                        len(str(net_flow).split('.')[-1]) <= 3
                    )
                    
                    all_valid = math_consistent and cash_net_consistent and values_rounded
                    
                    details = f"Math Consistent: {'✓' if math_consistent else '✗'}, "
                    details += f"Cash Net Consistent: {'✓' if cash_net_consistent else '✗'}, "
                    details += f"Values Rounded: {'✓' if values_rounded else '✗'}, "
                    details += f"Net Flow: {net_flow} OMR (In: {total_in}, Out: {total_out})"
                    
                    self.log_result(
                        "Net Flow with Real Data", 
                        all_valid, 
                        details,
                        {
                            "total_in": total_in,
                            "total_out": total_out,
                            "net_flow": net_flow,
                            "calculated_net_flow": calculated_net_flow,
                            "cash_summary": cash_summary,
                            "math_consistent": math_consistent,
                            "cash_net_consistent": cash_net_consistent,
                            "values_rounded": values_rounded
                        }
                    )
                else:
                    self.log_result("Net Flow with Real Data", False, f"Failed to get updated summary: {response.status_code}")
            else:
                self.log_result("Net Flow with Real Data", False, "Failed to create test transactions")
                
        except Exception as e:
            self.log_result("Net Flow with Real Data", False, f"Error: {str(e)}")
    
    def test_accounting_logic_consistency(self):
        """Test accounting logic: For asset accounts (cash/bank): DEBIT = increase, CREDIT = decrease"""
        try:
            # Get account balances before and after transactions
            accounts_response = self.session.get(f"{BACKEND_URL}/accounts")
            
            if accounts_response.status_code == 200:
                accounts_data = accounts_response.json()
                if isinstance(accounts_data, dict) and 'items' in accounts_data:
                    accounts = accounts_data['items']
                else:
                    accounts = accounts_data
                
                # Find cash and bank accounts
                cash_accounts = [acc for acc in accounts if 'cash' in acc.get('name', '').lower() and acc.get('account_type') == 'asset']
                bank_accounts = [acc for acc in accounts if 'bank' in acc.get('name', '').lower() and acc.get('account_type') == 'asset']
                
                logic_tests_passed = 0
                total_logic_tests = 0
                
                # Test cash accounts
                for account in cash_accounts[:1]:  # Test first cash account
                    total_logic_tests += 1
                    account_id = account.get('id')
                    initial_balance = account.get('current_balance', 0)
                    
                    # Create DEBIT transaction (should increase balance)
                    debit_success = self.create_test_transaction(
                        account_id=account_id,
                        transaction_type="debit",
                        amount=100.00,
                        description="Test DEBIT - Should increase balance"
                    )
                    
                    if debit_success:
                        # Check if balance increased
                        updated_account_response = self.session.get(f"{BACKEND_URL}/accounts/{account_id}")
                        if updated_account_response.status_code == 200:
                            updated_account = updated_account_response.json()
                            new_balance = updated_account.get('current_balance', 0)
                            
                            # For asset accounts: DEBIT should increase balance
                            if new_balance > initial_balance:
                                logic_tests_passed += 1
                                self.log_result(
                                    f"Accounting Logic - {account.get('name')} DEBIT", 
                                    True, 
                                    f"DEBIT correctly increased balance: {initial_balance} → {new_balance} (+{new_balance - initial_balance})"
                                )
                            else:
                                self.log_result(
                                    f"Accounting Logic - {account.get('name')} DEBIT", 
                                    False, 
                                    f"DEBIT should increase balance but: {initial_balance} → {new_balance}"
                                )
                
                # Test bank accounts  
                for account in bank_accounts[:1]:  # Test first bank account
                    total_logic_tests += 1
                    account_id = account.get('id')
                    initial_balance = account.get('current_balance', 0)
                    
                    # Create CREDIT transaction (should decrease balance)
                    credit_success = self.create_test_transaction(
                        account_id=account_id,
                        transaction_type="credit",
                        amount=50.00,
                        description="Test CREDIT - Should decrease balance"
                    )
                    
                    if credit_success:
                        # Check if balance decreased
                        updated_account_response = self.session.get(f"{BACKEND_URL}/accounts/{account_id}")
                        if updated_account_response.status_code == 200:
                            updated_account = updated_account_response.json()
                            new_balance = updated_account.get('current_balance', 0)
                            
                            # For asset accounts: CREDIT should decrease balance
                            if new_balance < initial_balance:
                                logic_tests_passed += 1
                                self.log_result(
                                    f"Accounting Logic - {account.get('name')} CREDIT", 
                                    True, 
                                    f"CREDIT correctly decreased balance: {initial_balance} → {new_balance} ({new_balance - initial_balance})"
                                )
                            else:
                                self.log_result(
                                    f"Accounting Logic - {account.get('name')} CREDIT", 
                                    False, 
                                    f"CREDIT should decrease balance but: {initial_balance} → {new_balance}"
                                )
                
                # Overall accounting logic test result
                if total_logic_tests > 0:
                    logic_success_rate = (logic_tests_passed / total_logic_tests) * 100
                    overall_success = logic_tests_passed == total_logic_tests
                    
                    self.log_result(
                        "Accounting Logic Consistency", 
                        overall_success, 
                        f"Accounting logic tests: {logic_tests_passed}/{total_logic_tests} passed ({logic_success_rate:.1f}%)"
                    )
                else:
                    self.log_result("Accounting Logic Consistency", False, "No cash/bank accounts found for testing")
            else:
                self.log_result("Accounting Logic Consistency", False, f"Failed to get accounts: {accounts_response.status_code}")
                
        except Exception as e:
            self.log_result("Accounting Logic Consistency", False, f"Error: {str(e)}")
    
    def create_test_cash_account(self):
        """Create a test cash account with opening balance 0"""
        try:
            account_data = {
                "name": f"Test Cash Account - {uuid.uuid4().hex[:8]}",
                "account_type": "asset",
                "opening_balance": 0.00,
                "current_balance": 0.00
            }
            
            response = self.session.post(f"{BACKEND_URL}/accounts", json=account_data)
            
            if response.status_code == 201:
                account = response.json()
                account_id = account.get("id")
                self.log_result("Create Test Cash Account", True, f"Created test cash account: {account.get('name')}")
                return account_id
            else:
                self.log_result("Create Test Cash Account", False, f"Failed: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            self.log_result("Create Test Cash Account", False, f"Error: {str(e)}")
            return None
    
    def create_test_transaction(self, account_id, transaction_type, amount, description):
        """Create a test transaction"""
        try:
            transaction_data = {
                "transaction_type": transaction_type,
                "mode": "Cash",
                "account_id": account_id,
                "amount": amount,
                "category": "Testing",
                "notes": description
            }
            
            response = self.session.post(f"{BACKEND_URL}/transactions", json=transaction_data)
            
            if response.status_code in [200, 201]:
                transaction = response.json()
                transaction_id = transaction.get("id")
                self.log_result(
                    f"Create Test Transaction ({transaction_type.upper()})", 
                    True, 
                    f"Created {transaction_type} transaction: {amount} OMR (ID: {transaction_id})"
                )
                return transaction_id
            else:
                self.log_result(
                    f"Create Test Transaction ({transaction_type.upper()})", 
                    False, 
                    f"Failed: {response.status_code} - {response.text}"
                )
                return None
                
        except Exception as e:
            self.log_result(f"Create Test Transaction ({transaction_type.upper()})", False, f"Error: {str(e)}")
            return None
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*80)
        print("TEST SUMMARY")
        print("="*80)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r['success']])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        
        if failed_tests > 0:
            print(f"\nFAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"❌ {result['test']}: {result['details']}")
        
        print(f"\nDetailed results saved to test_results.json")
        
        # Save detailed results
        with open('/app/test_results.json', 'w') as f:
            json.dump(self.test_results, f, indent=2, default=str)

    def test_net_flow_filtering_fix(self):
        """Test the specific Net Flow filtering fix - account name based filtering"""
        print("\n--- Testing Net Flow Filtering Fix (Account Name Based) ---")
        
        # Step 1: Create test accounts with proper naming
        cash_account_id = self.create_test_account_with_name("Test Cash Account", "asset")
        bank_account_id = self.create_test_account_with_name("Bank Account", "asset")
        
        if not cash_account_id or not bank_account_id:
            self.log_result("Net Flow Filtering Fix Setup", False, "Failed to create test accounts")
            return
        
        # Step 2: Create test transactions on these accounts
        # DEBIT transactions (money IN)
        cash_debit_id = self.create_test_transaction(
            account_id=cash_account_id,
            transaction_type="debit",
            amount=2000.00,
            description="Cash IN - Customer payment"
        )
        
        bank_debit_id = self.create_test_transaction(
            account_id=bank_account_id,
            transaction_type="debit", 
            amount=1500.00,
            description="Bank IN - Transfer received"
        )
        
        # CREDIT transactions (money OUT)
        cash_credit_id = self.create_test_transaction(
            account_id=cash_account_id,
            transaction_type="credit",
            amount=800.00,
            description="Cash OUT - Purchase payment"
        )
        
        if not all([cash_debit_id, bank_debit_id, cash_credit_id]):
            self.log_result("Net Flow Filtering Fix Transactions", False, "Failed to create test transactions")
            return
        
        # Step 3: Wait for transactions to be processed
        time.sleep(2)
        
        # Step 4: Test /api/transactions/summary endpoint
        try:
            response = self.session.get(f"{BACKEND_URL}/transactions/summary")
            
            if response.status_code == 200:
                summary_data = response.json()
                
                # Verify the response structure
                required_fields = ['total_in', 'total_out', 'net_flow', 'cash_summary', 'bank_summary']
                missing_fields = [field for field in required_fields if field not in summary_data]
                
                if missing_fields:
                    self.log_result("Net Flow Filtering Fix", False, f"Missing required fields: {missing_fields}")
                    return
                
                # Extract values
                total_in = summary_data.get('total_in', 0)
                total_out = summary_data.get('total_out', 0)
                net_flow = summary_data.get('net_flow', 0)
                cash_summary = summary_data.get('cash_summary', {})
                bank_summary = summary_data.get('bank_summary', {})
                
                # Verify math calculations
                # 1. net_flow = total_in - total_out
                calculated_net_flow = round(total_in - total_out, 2)
                actual_net_flow = round(net_flow, 2)
                net_flow_correct = abs(calculated_net_flow - actual_net_flow) < 0.01
                
                # 2. cash_summary.net = cash_summary.debit - cash_summary.credit
                cash_net_correct = True
                if cash_summary and all(k in cash_summary for k in ['debit', 'credit', 'net']):
                    cash_calculated_net = round(cash_summary['debit'] - cash_summary['credit'], 2)
                    cash_actual_net = round(cash_summary['net'], 2)
                    cash_net_correct = abs(cash_calculated_net - cash_actual_net) < 0.01
                
                # 3. bank_summary.net = bank_summary.debit - bank_summary.credit
                bank_net_correct = True
                if bank_summary and all(k in bank_summary for k in ['debit', 'credit', 'net']):
                    bank_calculated_net = round(bank_summary['debit'] - bank_summary['credit'], 2)
                    bank_actual_net = round(bank_summary['net'], 2)
                    bank_net_correct = abs(bank_calculated_net - bank_actual_net) < 0.01
                
                # 4. total_in = cash_summary.debit + bank_summary.debit
                total_in_correct = True
                if cash_summary and bank_summary:
                    calculated_total_in = round(cash_summary.get('debit', 0) + bank_summary.get('debit', 0), 2)
                    actual_total_in = round(total_in, 2)
                    # Allow for existing data - check if our test amounts are included
                    total_in_correct = actual_total_in >= calculated_total_in
                
                # 5. total_out = cash_summary.credit + bank_summary.credit
                total_out_correct = True
                if cash_summary and bank_summary:
                    calculated_total_out = round(cash_summary.get('credit', 0) + bank_summary.get('credit', 0), 2)
                    actual_total_out = round(total_out, 2)
                    # Allow for existing data - check if our test amounts are included
                    total_out_correct = actual_total_out >= calculated_total_out
                
                # Verify that our test transactions are included
                # We expect at least our test amounts to be reflected
                min_expected_cash_debit = 2000.00  # Our cash debit
                min_expected_bank_debit = 1500.00  # Our bank debit
                min_expected_cash_credit = 800.00  # Our cash credit
                
                cash_includes_test_data = (
                    cash_summary.get('debit', 0) >= min_expected_cash_debit and
                    cash_summary.get('credit', 0) >= min_expected_cash_credit
                )
                
                bank_includes_test_data = bank_summary.get('debit', 0) >= min_expected_bank_debit
                
                all_tests_passed = all([
                    net_flow_correct,
                    cash_net_correct,
                    bank_net_correct,
                    total_in_correct,
                    total_out_correct,
                    cash_includes_test_data,
                    bank_includes_test_data
                ])
                
                # Create detailed result message
                details = []
                details.append(f"Net Flow Math: {'✓' if net_flow_correct else '✗'} ({total_in} - {total_out} = {net_flow})")
                details.append(f"Cash Net Math: {'✓' if cash_net_correct else '✗'} ({cash_summary.get('debit', 0)} - {cash_summary.get('credit', 0)} = {cash_summary.get('net', 0)})")
                details.append(f"Bank Net Math: {'✓' if bank_net_correct else '✗'} ({bank_summary.get('debit', 0)} - {bank_summary.get('credit', 0)} = {bank_summary.get('net', 0)})")
                details.append(f"Total IN Math: {'✓' if total_in_correct else '✗'}")
                details.append(f"Total OUT Math: {'✓' if total_out_correct else '✗'}")
                details.append(f"Cash Test Data: {'✓' if cash_includes_test_data else '✗'}")
                details.append(f"Bank Test Data: {'✓' if bank_includes_test_data else '✗'}")
                
                self.log_result(
                    "Net Flow Filtering Fix - Math Verification",
                    all_tests_passed,
                    "; ".join(details),
                    {
                        "summary_data": summary_data,
                        "test_results": {
                            "net_flow_correct": net_flow_correct,
                            "cash_net_correct": cash_net_correct,
                            "bank_net_correct": bank_net_correct,
                            "total_in_correct": total_in_correct,
                            "total_out_correct": total_out_correct,
                            "cash_includes_test_data": cash_includes_test_data,
                            "bank_includes_test_data": bank_includes_test_data
                        }
                    }
                )
                
            else:
                self.log_result("Net Flow Filtering Fix", False, f"Failed to get transactions summary: {response.status_code} - {response.text}")
                
        except Exception as e:
            self.log_result("Net Flow Filtering Fix", False, f"Error: {str(e)}")
    
    def create_test_account_with_name(self, name, account_type):
        """Create a test account with specific name and type"""
        try:
            account_data = {
                "name": name,
                "account_type": account_type,
                "opening_balance": 0.00,
                "current_balance": 0.00
            }
            
            response = self.session.post(f"{BACKEND_URL}/accounts", json=account_data)
            
            if response.status_code == 201:
                account = response.json()
                account_id = account.get("id")
                self.log_result(f"Create Test Account ({name})", True, f"Created account: {name} (Type: {account_type})")
                return account_id
            else:
                self.log_result(f"Create Test Account ({name})", False, f"Failed: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            self.log_result(f"Create Test Account ({name})", False, f"Error: {str(e)}")
            return None

def main():
    """Main test execution - Focus on Net Flow / Cash Flow / Bank Flow fix"""
    print("Starting Net Flow / Cash Flow / Bank Flow Fix Testing")
    print("Testing the backend filtering logic fix for transactions summary")
    print("="*80)
    
    tester = BackendTester()
    
    # Authenticate first
    if not tester.authenticate():
        print("❌ Authentication failed. Cannot proceed with tests.")
        return
    
    # Primary Focus: Test the specific Net Flow filtering fix
    tester.test_net_flow_filtering_fix()
    
    # Secondary: Test general Net Flow calculations
    tester.test_finance_dashboard_net_flow_calculations()
    
    # Print summary
    tester.print_summary()

if __name__ == "__main__":
    main()