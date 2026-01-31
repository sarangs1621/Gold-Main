#!/usr/bin/env python3
"""
Script to apply permission decorators to all API endpoints in server.py
"""

import re

# Define the permission mapping for each endpoint pattern
ENDPOINT_PERMISSIONS = {
    # Inventory
    r'@api_router\.patch\("/inventory/headers/': 'inventory.adjust',
    r'@api_router\.delete\("/inventory/headers/': 'inventory.adjust',
    r'@api_router\.get\("/inventory/movements"': 'inventory.view',
    r'@api_router\.post\("/inventory/movements"': 'inventory.adjust',
    r'@api_router\.delete\("/inventory/movements/': 'inventory.adjust',
    r'@api_router\.get\("/inventory/stock-totals"': 'inventory.view',
    r'@api_router\.get\("/inventory"': 'inventory.view',
    
    # Dashboard & Reports
    r'@api_router\.get\("/dashboard"': 'reports.view',
    r'@api_router\.get\("/reports': 'reports.view',
    
    # Parties
    r'@api_router\.get\("/parties"': 'parties.view',
    r'@api_router\.post\("/parties"': 'parties.create',
    r'@api_router\.get\("/parties/': 'parties.view',
    r'@api_router\.patch\("/parties/': 'parties.update',
    r'@api_router\.delete\("/parties/': 'parties.delete',
    
    # Gold Ledger
    r'@api_router\.post\("/gold-ledger"': 'finance.create',
    r'@api_router\.get\("/gold-ledger"': 'finance.view',
    r'@api_router\.delete\("/gold-ledger/': 'finance.delete',
    r'@api_router\.post\("/gold-deposits"': 'finance.create',
    r'@api_router\.get\("/gold-deposits"': 'finance.view',
    
    # Purchases
    r'@api_router\.post\("/purchases"': 'purchases.create',
    r'@api_router\.get\("/purchases"': 'purchases.view',
    r'@api_router\.patch\("/purchases/': 'purchases.create',
    r'@api_router\.get\("/purchases/\{purchase_id\}/impact"': 'purchases.view',
    r'@api_router\.post\("/purchases/\{purchase_id\}/finalize"': 'purchases.finalize',
    
    # Job Cards
    r'@api_router\.get\("/jobcards"': 'jobcards.view',
    r'@api_router\.post\("/jobcards"': 'jobcards.create',
    r'@api_router\.get\("/jobcards/\{jobcard_id\}"': 'jobcards.view',
    r'@api_router\.patch\("/jobcards/': 'jobcards.update',
    r'@api_router\.delete\("/jobcards/': 'jobcards.delete',
    r'@api_router\.post\("/jobcards/\{jobcard_id\}/convert-to-invoice"': 'jobcards.create',
    r'@api_router\.get\("/jobcard-templates"': 'jobcards.view',
    r'@api_router\.post\("/jobcard-templates"': 'jobcards.create',
    r'@api_router\.patch\("/jobcard-templates/': 'jobcards.update',
    r'@api_router\.delete\("/jobcard-templates/': 'jobcards.delete',
    
    # Invoices
    r'@api_router\.get\("/invoices"': 'invoices.view',
    r'@api_router\.get\("/invoices/\{invoice_id\}"': 'invoices.view',
    r'@api_router\.patch\("/invoices/': 'invoices.create',
    r'@api_router\.post\("/invoices/\{invoice_id\}/finalize"': 'invoices.finalize',
    r'@api_router\.post\("/invoices/\{invoice_id\}/add-payment"': 'invoices.create',
    r'@api_router\.delete\("/invoices/': 'invoices.delete',
    r'@api_router\.get\("/invoices/\{invoice_id\}/pdf"': 'invoices.view',
    r'@api_router\.post\("/invoices"[^/]': 'invoices.create',
    
    # Accounts & Transactions
    r'@api_router\.get\("/accounts"': 'finance.view',
    r'@api_router\.post\("/accounts"': 'finance.create',
    r'@api_router\.patch\("/accounts/': 'finance.create',
    r'@api_router\.delete\("/accounts/': 'finance.delete',
    r'@api_router\.get\("/transactions"': 'finance.view',
    r'@api_router\.post\("/transactions"': 'finance.create',
    
    # Daily Closings
    r'@api_router\.get\("/daily-closings"': 'finance.view',
    r'@api_router\.post\("/daily-closings"': 'finance.create',
    r'@api_router\.patch\("/daily-closings/': 'finance.create',
    
    # Audit Logs
    r'@api_router\.get\("/audit-logs"': 'audit.view',
}

def apply_permissions(file_path):
    """Read the file and apply permission decorators"""
    with open(file_path, 'r') as f:
        content = f.read()
    
    lines = content.split('\n')
    modified = False
    
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Check if this is an API router decorator
        if line.strip().startswith('@api_router.'):
            # Find the matching permission
            permission = None
            for pattern, perm in ENDPOINT_PERMISSIONS.items():
                if re.search(pattern, line):
                    permission = perm
                    break
            
            if permission:
                # Look for the function definition (next few lines)
                j = i + 1
                while j < len(lines) and j < i + 5:
                    func_line = lines[j]
                    # Check if it has current_user with Depends(get_current_user)
                    if 'current_user' in func_line and 'Depends(get_current_user)' in func_line:
                        # Replace with require_permission
                        new_func_line = func_line.replace(
                            'Depends(get_current_user)',
                            f"Depends(require_permission('{permission}'))"
                        )
                        if new_func_line != func_line:
                            lines[j] = new_func_line
                            modified = True
                            print(f"Updated line {j+1}: {line.strip()[:60]}... -> {permission}")
                        break
                    j += 1
        
        i += 1
    
    if modified:
        # Write back
        with open(file_path, 'w') as f:
            f.write('\n'.join(lines))
        print(f"\n✅ Applied permissions to {file_path}")
        return True
    else:
        print(f"\n⚠️  No changes made to {file_path}")
        return False

if __name__ == '__main__':
    apply_permissions('/app/backend/server.py')
