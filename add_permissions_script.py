#!/usr/bin/env python3
"""
Script to add permission checks to API endpoints that are missing them.
This ensures comprehensive RBAC enforcement across all endpoints.
"""

# Endpoint permission mappings
# Format: (endpoint_pattern, http_method, required_permission)
ENDPOINT_PERMISSIONS = [
    # Purchases
    ("/purchases/{purchase_id}", "PATCH", "purchases.update"),
    ("/purchases/{purchase_id}/finalize", "POST", "purchases.finalize"),
    ("/purchases/{purchase_id}", "DELETE", "purchases.delete"),
    
    # Invoices
    ("/invoices", "GET", "invoices.view"),
    ("/invoices", "POST", "invoices.create"),
    ("/invoices/{invoice_id}", "PATCH", "invoices.create"),  # Update uses create permission
    ("/invoices/{invoice_id}/finalize", "POST", "invoices.finalize"),
    ("/invoices/{invoice_id}", "DELETE", "invoices.delete"),
    
    # Job Cards
    ("/jobcards", "GET", "jobcards.view"),
    ("/jobcards", "POST", "jobcards.create"),
    ("/jobcards/{jobcard_id}", "PATCH", "jobcards.update"),
    ("/jobcards/{jobcard_id}", "DELETE", "jobcards.delete"),
    
    # Inventory
    ("/inventory-headers", "GET", "inventory.view"),
    ("/inventory-headers", "POST", "inventory.adjust"),
    ("/stock-movements", "GET", "inventory.view"),
    ("/stock-movements", "POST", "inventory.adjust"),
    ("/stock-movements/{movement_id}", "DELETE", "inventory.adjust"),
    
    # Finance/Accounts/Transactions
    ("/accounts", "GET", "finance.view"),
    ("/accounts", "POST", "finance.create"),
    ("/accounts/{account_id}", "DELETE", "finance.delete"),
    ("/transactions", "GET", "finance.view"),
    ("/transactions", "POST", "finance.create"),
    ("/transactions/{transaction_id}", "DELETE", "finance.delete"),
    
    # Gold Ledger
    ("/gold-ledger", "POST", "finance.create"),
    ("/gold-ledger/{entry_id}", "DELETE", "finance.delete"),
    ("/gold-deposits", "POST", "finance.create"),
    
    # Reports
    ("/reports", "GET", "reports.view"),
    ("/dashboard", "GET", "reports.view"),
    
    # Audit Logs
    ("/audit-logs", "GET", "audit.view"),
]

print("Permission mapping reference created.")
print("Manual implementation required in server.py")
print("\nEndpoints that need permission checks:")
for endpoint, method, permission in ENDPOINT_PERMISSIONS:
    print(f"  {method:6} {endpoint:50} -> {permission}")
