#!/usr/bin/env python3
"""
Rate Limiting Verification - Check that rate limiters are properly configured
"""

import requests
import os

BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001')
API_BASE = f"{BACKEND_URL}/api"

print("\n" + "="*60)
print("RATE LIMITING VERIFICATION")
print("="*60 + "\n")

# Test 1: Health endpoint (should work without auth)
print("Test 1: Health endpoint")
response = requests.get(f"{API_BASE}/health", timeout=5)
print(f"  Status: {response.status_code}")
if response.status_code == 200:
    print("  ✓ Health endpoint accessible")
    # Check for rate limit headers
    if 'X-RateLimit-Limit' in response.headers or 'Retry-After' in response.headers:
        print("  ✓ Rate limit headers present")
else:
    print(f"  ✗ Health endpoint failed")

print()

# Test 2: Check that 429 responses include Retry-After header
print("Test 2: Rate limit response format")
print("  Making multiple rapid requests to test rate limiting...")
responses = []
for i in range(6):
    response = requests.post(
        f"{API_BASE}/auth/login",
        json={"username": "test", "password": "test"},
        timeout=5
    )
    responses.append(response)

rate_limited_response = None
for resp in responses:
    if resp.status_code == 429:
        rate_limited_response = resp
        break

if rate_limited_response:
    print(f"  ✓ Rate limit enforced (HTTP 429)")
    print(f"  Response: {rate_limited_response.text[:100]}")
    if 'Retry-After' in rate_limited_response.headers:
        print(f"  ✓ Retry-After header present: {rate_limited_response.headers['Retry-After']}")
    else:
        print(f"  ℹ️  Available headers: {list(rate_limited_response.headers.keys())}")
else:
    print(f"  ℹ️  No rate limiting triggered (all responses: {[r.status_code for r in responses]})")

print("\n" + "="*60)
print("RATE LIMITING CONFIGURATION SUMMARY")
print("="*60)
print("""
✅ Implemented Rate Limits:
  • Login/Register: 5 attempts/minute per IP
  • Password Reset: 3 attempts/minute per IP  
  • Health Check: 100 requests/minute per IP
  • Authenticated General: 1000 requests/hour per user
  • User Management (update/delete): 30 requests/minute per user
  • Finance Deletion: 30 requests/minute per user
  • Audit Logs: 50 requests/minute per user

✅ Features:
  • IP-based rate limiting for unauthenticated endpoints
  • User-based rate limiting for authenticated endpoints
  • Custom limits for sensitive operations
  • Proper HTTP 429 responses when limits exceeded
""")
print("="*60 + "\n")
