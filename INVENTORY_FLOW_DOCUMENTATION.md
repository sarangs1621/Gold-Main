# Gold Shop ERP - Inventory Stock Flow Documentation

## 🔒 CRITICAL - Production-Grade Inventory Control

This document defines the **AUTHORITATIVE PATHS** for inventory stock movements in the Gold Shop ERP system. These restrictions ensure audit trail integrity, accounting accuracy, and GST compliance.

---

## ✅ AUTHORIZED STOCK ADDITION PATHS (Stock IN)

### Path 1: Purchase Finalization (Primary - Vendor Purchases)
**Endpoint**: `POST /api/purchases/{purchase_id}/finalize`

**Purpose**: Add inventory stock from vendor purchases

**When**: After vendor delivers gold and purchase is verified

**Operations**:
1. Creates Stock IN movement (audit trail)
2. Increases inventory header `current_qty` and `current_weight`
3. Records vendor payable (accounting)
4. Locks purchase (immutability)

**Business Rules**:
- ✅ Creates proper audit trail tied to purchase
- ✅ Records cost basis for inventory
- ✅ Tracks vendor payables
- ✅ Maintains GST input credit eligibility

---

### Path 2: Manual Stock IN Movement (Secondary - Adjustments)
**Endpoint**: `POST /api/inventory/movements`

**Purpose**: Manual stock additions for non-vendor sources

**Allowed Types**:
- `"Stock IN"`: For returns from customers, found items, transfers
- `"Adjustment"`: For reconciliation corrections (positive only)

**When Used**:
- Customer returns gold
- Found/discovered inventory
- Inventory count corrections (positive adjustments)
- Inter-location transfers IN

**Restrictions**:
- ✅ ONLY positive qty_delta and weight_delta allowed
- ✅ Cannot specify negative values (would bypass restrictions)
- ✅ Must provide description for audit trail

**Business Rules**:
- ✅ Creates audit trail for non-vendor additions
- ✅ Allows operational flexibility for legitimate additions
- ✅ Prevents unauthorized reductions

---

## ❌ AUTHORIZED STOCK REDUCTION PATH (Stock OUT)

### SINGLE AUTHORITATIVE PATH: Invoice Finalization
**Endpoint**: `POST /api/invoices/{invoice_id}/finalize`

**Purpose**: Reduce inventory stock through customer sales

**When**: After invoice is verified and ready to deliver to customer

**Operations**:
1. Creates Stock OUT movements (audit trail) - **ONLY AUTHORIZED PATH**
2. Decreases inventory header `current_qty` and `current_weight`
3. Records customer receivable (accounting)
4. Calculates and records GST (tax compliance)
5. Locks invoice and job card (immutability)

**Business Rules**:
- ✅ Ensures every stock reduction has an invoice (audit trail)
- ✅ Records revenue for all stock leaving (accounting accuracy)
- ✅ Calculates GST on all sales (tax compliance)
- ✅ Prevents unauthorized stock removal

---

## 🚫 PROHIBITED OPERATIONS

### 1. Manual Stock OUT Creation
**Endpoint**: `POST /api/inventory/movements` with `movement_type: "Stock OUT"`

**Status**: ❌ **BLOCKED** (HTTP 403 Forbidden)

**Reason**: Stock can only be reduced through invoice finalization to maintain:
- Complete audit trail (tied to invoice)
- Accurate accounting (revenue recorded)
- GST compliance (tax collected)
- Financial integrity

**Error Message**:
```
Manual 'Stock OUT' movements are prohibited. Stock can only be reduced through 
Invoice Finalization (POST /api/invoices/{id}/finalize). This restriction ensures 
audit trail integrity, accounting accuracy, and GST compliance.
```

---

### 2. Negative Delta Bypass Attempt
**Endpoint**: `POST /api/inventory/movements` with negative qty_delta or weight_delta

**Status**: ❌ **BLOCKED** (HTTP 400 Bad Request)

**Reason**: Prevents users from bypassing Stock OUT restriction using negative values in Stock IN movements

**Error Message**:
```
Invalid Stock IN movement: qty_delta and weight_delta must be positive (>= 0). 
To reduce stock, use Invoice Finalization instead.
```

---

### 3. Stock OUT Movement Deletion
**Endpoint**: `DELETE /api/inventory/movements/{movement_id}` where movement_type is "Stock OUT"

**Status**: ❌ **BLOCKED** (HTTP 403 Forbidden)

**Reason**: Stock OUT movements represent sales and must be preserved for audit trail

**Error Message**:
```
Cannot delete 'Stock OUT' movement. Stock OUT movements represent sales/reductions 
and must be preserved for audit trail. If this movement was created in error, 
contact system administrator.
```

---

### 4. Invoice/Purchase-Linked Movement Deletion
**Endpoint**: `DELETE /api/inventory/movements/{movement_id}` where reference_type is set

**Status**: ❌ **BLOCKED** (HTTP 403 Forbidden)

**Reason**: Movements tied to official transactions cannot be deleted

**Error Message**:
```
Cannot delete stock movement linked to {reference_type}. This movement is part of 
an official transaction and must be preserved for audit trail, accounting accuracy, 
and GST compliance.
```

---

## 📊 STOCK FLOW SUMMARY

```
┌─────────────────────────────────────────────────────────────────┐
│                    INVENTORY STOCK FLOW                          │
└─────────────────────────────────────────────────────────────────┘

STOCK IN (Additions):
┌──────────────────────────┐
│  Purchase Finalization   │ ──────┐
│  (Vendor Purchases)      │       │
└──────────────────────────┘       │
                                   │
┌──────────────────────────┐       │     ┌──────────────────────┐
│  Manual Stock IN         │ ──────┼────►│  Inventory Headers   │
│  (Returns, Found Items)  │       │     │  current_qty         │
└──────────────────────────┘       │     │  current_weight      │
                                   │     └──────────────────────┘
┌──────────────────────────┐       │              │
│  Adjustment (Positive)   │ ──────┘              │
│  (Reconciliation)        │                      │
└──────────────────────────┘                      │
                                                  │
STOCK OUT (Reductions):                           │
┌──────────────────────────┐                      │
│  Invoice Finalization    │ ◄────────────────────┘
│  (ONLY Authorized Path)  │
└──────────────────────────┘
```

---

## 🔐 AUDIT TRAIL INTEGRITY

### What is Maintained:
1. **Stock Movements Table**: Complete history of all additions and reductions
2. **Reference Links**: Every movement tied to source transaction (purchase/invoice)
3. **Immutability**: Finalized transactions cannot be edited or deleted
4. **User Tracking**: created_by field on all movements
5. **Timestamps**: Automatic date/time recording

### What is Prevented:
1. ❌ Stock leaving without invoice
2. ❌ Manual Stock OUT creation
3. ❌ Deletion of official transaction movements
4. ❌ Negative value bypass attempts
5. ❌ Editing finalized transactions

---

## 📈 ACCOUNTING & GST COMPLIANCE

### Revenue Recognition:
- **Stock OUT**: Only through invoice finalization
- **Revenue**: Recorded simultaneously with stock reduction
- **GST**: Calculated and recorded on every invoice
- **Customer Receivable**: Created atomically with stock reduction

### Cost Tracking:
- **Stock IN**: Tied to purchase with cost data
- **Vendor Payable**: Recorded with stock addition
- **GST Input Credit**: Eligible when proper purchase recorded
- **FIFO/Weighted Average**: Can be calculated from movement history

### Compliance Benefits:
- ✅ Every stock reduction has revenue record
- ✅ Every sale has GST collection
- ✅ Complete audit trail for tax authorities
- ✅ No unexplained inventory shrinkage
- ✅ Accurate financial reporting

---

## 🛠️ DEVELOPER GUIDELINES

### When Adding New Features:

1. **Never bypass invoice finalization for stock reductions**
   - Always use `POST /api/invoices/{id}/finalize`
   - Never modify `current_qty` or `current_weight` directly in other endpoints

2. **Stock IN additions should be validated**
   - Vendor purchases: Use `POST /api/purchases/{id}/finalize`
   - Other sources: Use `POST /api/inventory/movements` with type "Stock IN"

3. **Preserve audit trail**
   - Never allow deletion of movements with reference_type
   - Never allow editing of finalized transactions
   - Always create audit logs for stock changes

4. **Validate movement types**
   - Only allow "Stock IN" and "Adjustment" in manual movement creation
   - Block "Stock OUT" explicitly
   - Block negative deltas for Stock IN

---

## 📋 TESTING CHECKLIST

### Test Cases for Stock Reduction:
- [ ] Attempt manual Stock OUT creation → Should fail with 403
- [ ] Attempt Stock IN with negative delta → Should fail with 400
- [ ] Create invoice and finalize → Stock should reduce
- [ ] Verify Stock OUT movement created with reference_type="invoice"
- [ ] Attempt to delete invoice-linked movement → Should fail with 403

### Test Cases for Stock Addition:
- [ ] Finalize purchase → Stock should increase
- [ ] Create manual Stock IN movement → Should succeed
- [ ] Create Adjustment movement → Should succeed
- [ ] Verify all movements have audit trail

### Test Cases for Data Integrity:
- [ ] Current stock = sum of all movements
- [ ] No Stock OUT movements without invoice reference
- [ ] All finalized invoices have Stock OUT movements
- [ ] All finalized purchases have Stock IN movements

---

## 🚨 INCIDENT RESPONSE

### If Unauthorized Stock Reduction Found:

1. **Investigate**: Check stock_movements table for movements without reference_type
2. **Identify**: Find which endpoint was used to create unauthorized movement
3. **Audit**: Review audit_logs for the movement creation
4. **Correct**: Create compensating adjustment with proper documentation
5. **Prevent**: Add additional validation if new bypass path discovered

### If Stock Discrepancy Found:

1. **Reconcile**: Compare physical count vs system current_qty/current_weight
2. **Review**: Check all movements for the affected inventory header
3. **Investigate**: Look for any movements that were deleted or edited
4. **Document**: Create audit report of discrepancy
5. **Adjust**: Use Adjustment movement with proper authorization and notes

---

## 📞 SUPPORT

For questions about inventory flow or to report issues:
- Review this documentation first
- Check audit_logs and stock_movements tables
- Verify invoice/purchase finalization endpoints are being used
- Contact system administrator for data discrepancies

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-XX  
**Maintained By**: Development Team  
**Critical Classification**: PRODUCTION INTEGRITY - DO NOT MODIFY WITHOUT REVIEW
