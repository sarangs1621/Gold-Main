#!/usr/bin/env python3
"""Analyze which API endpoints have permission checks"""

import re

# Read the server.py file
with open('/app/backend/server.py', 'r') as f:
    content = f.read()

# Find all endpoint definitions
endpoint_pattern = r'@api_router\.(get|post|patch|delete)\("([^"]+)"[^\n]*\n[^\n]*\nasync def ([^(]+)\(([^)]*)\)'
endpoints = re.findall(endpoint_pattern, content, re.MULTILINE | re.DOTALL)

# Check which ones have require_permission
protected_endpoints = []
unprotected_endpoints = []

for method, path, func_name, params in endpoints:
    # Check if params contain require_permission
    has_permission = 'require_permission' in params
    
    endpoint_info = {
        'method': method.upper(),
        'path': path,
        'function': func_name,
        'protected': has_permission
    }
    
    if has_permission:
        # Extract the permission name
        perm_match = re.search(r"require_permission\('([^']+)'\)", params)
        if perm_match:
            endpoint_info['permission'] = perm_match.group(1)
        protected_endpoints.append(endpoint_info)
    else:
        unprotected_endpoints.append(endpoint_info)

print("=" * 80)
print(f"TOTAL ENDPOINTS: {len(endpoints)}")
print(f"PROTECTED: {len(protected_endpoints)}")
print(f"UNPROTECTED: {len(unprotected_endpoints)}")
print("=" * 80)
print()

print("UNPROTECTED ENDPOINTS (Need Permission Checks):")
print("=" * 80)
for ep in unprotected_endpoints:
    print(f"{ep['method']:6} {ep['path']:50} ({ep['function']})")

print()
print("=" * 80)
print("PROTECTED ENDPOINTS:")
print("=" * 80)
for ep in protected_endpoints:
    perm = ep.get('permission', 'UNKNOWN')
    print(f"{ep['method']:6} {ep['path']:50} -> {perm}")
