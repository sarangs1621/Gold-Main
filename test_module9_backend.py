#!/usr/bin/env python3
"""
MODULE 9 - Backend Comprehensive Testing
Tests all finance dashboard and reconciliation endpoints
"""
import requests
import json
from datetime import datetime, timezone
from decimal import Decimal

BACKEND_URL = "https://audit-readiness.preview.emergentagent.com/api"

def test_login():
    """Test login and get auth token"""
    print("\n" + "="*80)
    print("TEST 1: Authentication")
    print("="*80)
    
    response = requests.post(
        f"{BACKEND_URL}/auth/login",
        json={"username": "admin", "password": "Admin@123456"}
    )
    
    if response.status_code == 200:
        data = response.json()
        token = data.get('access_token')
        csrf_token = data.get('csrf_token')
        print(f"✅ Login successful")
        print(f"   Token: {token[:20]}...")
        print(f"   CSRF: {csrf_token[:20]}...")
        return token, csrf_token
    else:
        print(f"❌ Login failed: {response.status_code}")
        print(f"   Response: {response.text}")
        return None, None

def test_finance_dashboard(token, csrf_token):
    """Test finance dashboard endpoint"""
    print("\n" + "="*80)
    print("TEST 2: Finance Dashboard - Current Month (Default)")
    print("="*80)
    
    headers = {
        "Authorization": f"Bearer {token}",
        "X-CSRF-Token": csrf_token
    }
    
    response = requests.get(f"{BACKEND_URL}/dashboard/finance", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Finance dashboard loaded successfully")
        print(f"\n📊 Dashboard Metrics:")
        print(f"   Cash Balance:   {data.get('cash_balance'):>15.3f}")
        print(f"   Bank Balance:   {data.get('bank_balance'):>15.3f}")
        print(f"   Total Credit:   {data.get('total_credit'):>15.3f}")
        print(f"   Total Debit:    {data.get('total_debit'):>15.3f}")
        print(f"   Net Flow:       {data.get('net_flow'):>15.3f}")
        
        period = data.get('period', {})
        print(f"\n📅 Period:")
        print(f"   Start: {period.get('start_date')}")
        print(f"   End:   {period.get('end_date')}")
        
        # Verify decimal precision (3 decimals)
        for key in ['cash_balance', 'bank_balance', 'total_credit', 'total_debit', 'net_flow']:
            value = data.get(key, 0)
            # Check if value has proper precision
            str_value = f"{value:.3f}"
            print(f"   {key}: {str_value} ✅")
        
        return True, data
    else:
        print(f"❌ Finance dashboard failed: {response.status_code}")
        print(f"   Response: {response.text}")
        return False, None

def test_finance_dashboard_filters(token, csrf_token):
    """Test finance dashboard with filters"""
    print("\n" + "="*80)
    print("TEST 3: Finance Dashboard - Date Range Filter")
    print("="*80)
    
    headers = {
        "Authorization": f"Bearer {token}",
        "X-CSRF-Token": csrf_token
    }
    
    # Test with specific date range
    params = {
        "start_date": "2024-01-01T00:00:00Z",
        "end_date": "2024-12-31T23:59:59Z"
    }
    
    response = requests.get(f"{BACKEND_URL}/dashboard/finance", headers=headers, params=params)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Date filter works")
        print(f"   Total Credit: {data.get('total_credit'):.3f}")
        print(f"   Total Debit:  {data.get('total_debit'):.3f}")
        
        # Test account type filter (cash)
        print("\n" + "="*80)
        print("TEST 4: Finance Dashboard - Account Type Filter (Cash)")
        print("="*80)
        
        params['account_type'] = 'cash'
        response = requests.get(f"{BACKEND_URL}/dashboard/finance", headers=headers, params=params)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Cash filter works")
            print(f"   Cash Balance: {data.get('cash_balance'):.3f}")
            
            # Test bank filter
            print("\n" + "="*80)
            print("TEST 5: Finance Dashboard - Account Type Filter (Bank)")
            print("="*80)
            
            params['account_type'] = 'bank'
            response = requests.get(f"{BACKEND_URL}/dashboard/finance", headers=headers, params=params)
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Bank filter works")
                print(f"   Bank Balance: {data.get('bank_balance'):.3f}")
                return True
            else:
                print(f"❌ Bank filter failed: {response.status_code}")
                return False
        else:
            print(f"❌ Cash filter failed: {response.status_code}")
            return False
    else:
        print(f"❌ Date filter failed: {response.status_code}")
        return False

def test_finance_reconciliation(token, csrf_token):
    """Test finance reconciliation endpoint"""
    print("\n" + "="*80)
    print("TEST 6: Finance Reconciliation")
    print("="*80)
    
    headers = {
        "Authorization": f"Bearer {token}",
        "X-CSRF-Token": csrf_token
    }
    
    response = requests.get(f"{BACKEND_URL}/system/reconcile/finance", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        is_reconciled = data.get('is_reconciled')
        
        if is_reconciled:
            print(f"✅ Finance reconciliation PASSED")
        else:
            print(f"❌ Finance reconciliation FAILED")
        
        print(f"\n📊 Expected (Dashboard):")
        expected = data.get('expected', {})
        print(f"   Total Credit: {expected.get('total_credit'):.3f}")
        print(f"   Total Debit:  {expected.get('total_debit'):.3f}")
        print(f"   Net Flow:     {expected.get('net_flow'):.3f}")
        
        print(f"\n📊 Actual (Transactions SUM):")
        actual = data.get('actual', {})
        print(f"   Total Credit: {actual.get('total_credit'):.3f}")
        print(f"   Total Debit:  {actual.get('total_debit'):.3f}")
        print(f"   Net Flow:     {actual.get('net_flow'):.3f}")
        
        print(f"\n📊 Difference:")
        difference = data.get('difference', {})
        print(f"   Credit Diff:   {difference.get('credit_diff'):.3f}")
        print(f"   Debit Diff:    {difference.get('debit_diff'):.3f}")
        print(f"   Net Flow Diff: {difference.get('net_flow_diff'):.3f}")
        
        print(f"\n💬 Message: {data.get('message')}")
        
        return is_reconciled
    else:
        print(f"❌ Finance reconciliation request failed: {response.status_code}")
        print(f"   Response: {response.text}")
        return False

def test_inventory_reconciliation(token, csrf_token):
    """Test inventory reconciliation endpoint"""
    print("\n" + "="*80)
    print("TEST 7: Inventory Reconciliation")
    print("="*80)
    
    headers = {
        "Authorization": f"Bearer {token}",
        "X-CSRF-Token": csrf_token
    }
    
    response = requests.get(f"{BACKEND_URL}/system/reconcile/inventory", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        is_reconciled = data.get('is_reconciled')
        
        if is_reconciled:
            print(f"✅ Inventory reconciliation PASSED")
        else:
            print(f"❌ Inventory reconciliation FAILED")
        
        summary = data.get('summary', {})
        print(f"\n📊 Summary:")
        print(f"   Total Headers:      {summary.get('total_headers')}")
        print(f"   Reconciled Headers: {summary.get('reconciled_headers')}")
        print(f"   Mismatched Headers: {summary.get('mismatched_headers')}")
        
        mismatches = data.get('mismatches', [])
        if mismatches:
            print(f"\n⚠️  Mismatches:")
            for mismatch in mismatches[:5]:  # Show first 5
                print(f"   - {mismatch.get('header_name')}")
                print(f"     Reported: {mismatch.get('reported_weight'):.3f}g")
                print(f"     Actual:   {mismatch.get('actual_weight'):.3f}g")
                print(f"     Diff:     {mismatch.get('weight_diff'):.3f}g")
        
        print(f"\n💬 Message: {data.get('message')}")
        
        return is_reconciled
    else:
        print(f"❌ Inventory reconciliation request failed: {response.status_code}")
        print(f"   Response: {response.text}")
        return False

def test_gold_reconciliation(token, csrf_token):
    """Test gold reconciliation endpoint"""
    print("\n" + "="*80)
    print("TEST 8: Gold Reconciliation")
    print("="*80)
    
    headers = {
        "Authorization": f"Bearer {token}",
        "X-CSRF-Token": csrf_token
    }
    
    response = requests.get(f"{BACKEND_URL}/system/reconcile/gold", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        is_reconciled = data.get('is_reconciled')
        
        if is_reconciled:
            print(f"✅ Gold reconciliation PASSED")
        else:
            print(f"❌ Gold reconciliation FAILED")
        
        summary = data.get('summary', {})
        print(f"\n📊 Summary:")
        print(f"   Total Parties:      {summary.get('total_parties')}")
        print(f"   Checked Parties:    {summary.get('checked_parties')}")
        print(f"   Reconciled Parties: {summary.get('reconciled_parties')}")
        print(f"   Mismatched Parties: {summary.get('mismatched_parties')}")
        
        mismatches = data.get('mismatches', [])
        if mismatches:
            print(f"\n⚠️  Mismatches:")
            for mismatch in mismatches[:5]:  # Show first 5
                print(f"   - {mismatch.get('party_name')}")
                print(f"     Issue: {mismatch.get('issue')}")
        
        print(f"\n💬 Message: {data.get('message')}")
        
        return is_reconciled
    else:
        print(f"❌ Gold reconciliation request failed: {response.status_code}")
        print(f"   Response: {response.text}")
        return False

def test_validation_checklist(token, csrf_token):
    """Test system validation checklist endpoint"""
    print("\n" + "="*80)
    print("TEST 9: System Validation Checklist")
    print("="*80)
    
    headers = {
        "Authorization": f"Bearer {token}",
        "X-CSRF-Token": csrf_token
    }
    
    response = requests.get(f"{BACKEND_URL}/system/validation-checklist", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        all_passed = data.get('all_passed')
        go_live_ready = data.get('go_live_ready')
        
        if go_live_ready:
            print(f"✅ System is GO-LIVE READY!")
        else:
            print(f"❌ System is NOT GO-LIVE READY")
        
        print(f"\n📊 Summary:")
        summary = data.get('summary', {})
        print(f"   Total Checks:  {summary.get('total_checks')}")
        print(f"   Passed Checks: {summary.get('passed_checks')}")
        print(f"   Failed Checks: {summary.get('failed_checks')}")
        
        print(f"\n📋 Validation Results by Category:")
        checks = data.get('checks', [])
        for category_data in checks:
            category = category_data.get('category')
            category_checks = category_data.get('checks', [])
            print(f"\n   {category}:")
            for check in category_checks:
                name = check.get('name')
                status = check.get('status')
                print(f"      {status} {name}")
        
        return go_live_ready
    else:
        print(f"❌ Validation checklist request failed: {response.status_code}")
        print(f"   Response: {response.text}")
        return False

def test_permission_denied(token, csrf_token):
    """Test that staff users cannot access finance dashboard"""
    print("\n" + "="*80)
    print("TEST 10: Permission Control (Staff Access Denied)")
    print("="*80)
    
    # Try to login as staff (if exists)
    staff_response = requests.post(
        f"{BACKEND_URL}/auth/login",
        json={"username": "staff", "password": "Staff@123456"}
    )
    
    if staff_response.status_code == 200:
        staff_data = staff_response.json()
        staff_token = staff_data.get('access_token')
        staff_csrf = staff_data.get('csrf_token')
        
        headers = {
            "Authorization": f"Bearer {staff_token}",
            "X-CSRF-Token": staff_csrf
        }
        
        response = requests.get(f"{BACKEND_URL}/dashboard/finance", headers=headers)
        
        if response.status_code == 403:
            print(f"✅ Staff correctly denied access to finance dashboard")
            return True
        elif response.status_code == 200:
            print(f"❌ Staff should NOT have access to finance dashboard")
            return False
        else:
            print(f"⚠️  Unexpected response: {response.status_code}")
            return False
    else:
        print(f"⚠️  Staff user doesn't exist, skipping permission test")
        return True

def run_all_tests():
    """Run all backend tests"""
    print("\n" + "="*80)
    print("MODULE 9 - BACKEND COMPREHENSIVE TESTING")
    print("="*80)
    
    results = {
        "total": 0,
        "passed": 0,
        "failed": 0
    }
    
    # Test 1: Login
    token, csrf_token = test_login()
    results["total"] += 1
    if token:
        results["passed"] += 1
    else:
        results["failed"] += 1
        print("\n❌ Cannot proceed without authentication")
        return results
    
    # Test 2: Finance Dashboard
    results["total"] += 1
    success, dashboard_data = test_finance_dashboard(token, csrf_token)
    if success:
        results["passed"] += 1
    else:
        results["failed"] += 1
    
    # Test 3-5: Filters
    results["total"] += 1
    if test_finance_dashboard_filters(token, csrf_token):
        results["passed"] += 1
    else:
        results["failed"] += 1
    
    # Test 6: Finance Reconciliation
    results["total"] += 1
    if test_finance_reconciliation(token, csrf_token):
        results["passed"] += 1
    else:
        results["failed"] += 1
    
    # Test 7: Inventory Reconciliation
    results["total"] += 1
    if test_inventory_reconciliation(token, csrf_token):
        results["passed"] += 1
    else:
        results["failed"] += 1
    
    # Test 8: Gold Reconciliation
    results["total"] += 1
    if test_gold_reconciliation(token, csrf_token):
        results["passed"] += 1
    else:
        results["failed"] += 1
    
    # Test 9: Validation Checklist
    results["total"] += 1
    if test_validation_checklist(token, csrf_token):
        results["passed"] += 1
    else:
        results["failed"] += 1
    
    # Test 10: Permission Control
    results["total"] += 1
    if test_permission_denied(token, csrf_token):
        results["passed"] += 1
    else:
        results["failed"] += 1
    
    # Final Summary
    print("\n" + "="*80)
    print("FINAL TEST SUMMARY")
    print("="*80)
    print(f"Total Tests:  {results['total']}")
    print(f"Passed:       {results['passed']} ✅")
    print(f"Failed:       {results['failed']} ❌")
    print(f"Success Rate: {(results['passed']/results['total']*100):.1f}%")
    
    if results['failed'] == 0:
        print("\n🎉 ALL BACKEND TESTS PASSED!")
    else:
        print(f"\n⚠️  {results['failed']} test(s) failed")
    
    return results

if __name__ == "__main__":
    run_all_tests()
