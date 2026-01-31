"# EXACT FILE CHANGES - Before & After

## 📁 FILES EDITED

1. **Backend:** `/app/backend/server.py`
2. **Frontend:** `/app/frontend/src/pages/ReturnsPage.js`

---

## 1️⃣ BACKEND FILE: `/app/backend/server.py`

### 📍 Location: After line 4440 (between `get_invoices` and `get_invoice` endpoints)

### ✏️ EDIT TYPE: **NEW CODE ADDED** (66 lines inserted)

### BEFORE:
```python
    return create_pagination_response(invoices, total_count, page, page_size)

@api_router.get(\"/invoices/{invoice_id}\", response_model=Invoice)
async def get_invoice(invoice_id: str, current_user: User = Depends(require_permission('invoices.view'))):
    invoice = await db.invoices.find_one({\"id\": invoice_id, \"is_deleted\": False}, {\"_id\": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail=\"Invoice not found\")
    return Invoice(**invoice)
```

### AFTER:
```python
    return create_pagination_response(invoices, total_count, page, page_size)

@api_router.get(\"/invoices/returnable\")
async def get_returnable_invoices(
    type: str = \"sales\",
    current_user: User = Depends(require_permission('invoices.view'))
):
    \"\"\"
    Get finalized invoices that are available for returns.
    Only returns invoices that:
    - Are finalized (not draft)
    - Are not deleted
    - Have a balance due > 0 (not fully returned/paid)
    
    Args:
        type: \"sales\" or \"purchase\" to filter invoice type
    \"\"\"
    if not user_has_permission(current_user, 'invoices.view'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=\"You don't have permission to view invoices\"
        )
    
    # Build query filter
    query = {
        \"is_deleted\": False,
        \"status\": \"finalized\",
        \"balance_due\": {\"$gt\": 0}
    }
    
    # Filter by invoice type
    if type.lower() == \"sales\":
        query[\"invoice_type\"] = \"sale\"
    elif type.lower() == \"purchase\":
        query[\"invoice_type\"] = \"purchase\"
    
    # Fetch matching invoices with required fields only
    invoices = await db.invoices.find(
        query,
        {
            \"_id\": 0,
            \"id\": 1,
            \"invoice_number\": 1,
            \"date\": 1,
            \"customer_name\": 1,
            \"walk_in_name\": 1,
            \"customer_type\": 1,
            \"grand_total\": 1,
            \"balance_due\": 1,
            \"items\": 1
        }
    ).sort(\"date\", -1).limit(100).to_list(100)
    
    # Format response with party name
    formatted_invoices = []
    for inv in invoices:
        party_name = inv.get(\"customer_name\") or inv.get(\"walk_in_name\") or \"Unknown\"
        formatted_invoices.append({
            \"id\": inv[\"id\"],
            \"invoice_no\": inv[\"invoice_number\"],
            \"date\": inv[\"date\"].isoformat() if isinstance(inv[\"date\"], datetime) else inv[\"date\"],
            \"party_name\": party_name,
            \"total_amount\": float(inv.get(\"grand_total\", 0)),
            \"balance_amount\": float(inv.get(\"balance_due\", 0)),
            \"items\": inv.get(\"items\", [])
        })
    
    return formatted_invoices

@api_router.get(\"/invoices/{invoice_id}\", response_model=Invoice)
async def get_invoice(invoice_id: str, current_user: User = Depends(require_permission('invoices.view'))):
    invoice = await db.invoices.find_one({\"id\": invoice_id, \"is_deleted\": False}, {\"_id\": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail=\"Invoice not found\")
    return Invoice(**invoice)
```

### 📊 WHAT CHANGED:
- **Lines Added:** 66 new lines
- **New Endpoint:** `GET /api/invoices/returnable`
- **Query Parameter:** `type` (sales/purchase)
- **Filters Applied:**
  * `is_deleted = False`
  * `status = \"finalized\"`
  * `balance_due > 0`
  * `invoice_type = \"sale\"` or `\"purchase\"`
- **Response Format:** Simplified JSON with `invoice_no`, `party_name`, `total_amount`, `balance_amount`, `items`

---

## 2️⃣ FRONTEND FILE: `/app/frontend/src/pages/ReturnsPage.js`

### Three separate edits were made in this file:

---

### EDIT A: Updated `loadReferenceData` Function

**📍 Location:** Lines 88-109

**✏️ EDIT TYPE:** Function signature and logic modified

### BEFORE:
```javascript
  // Load reference data
  const loadReferenceData = async () => {
    try {
      // Load invoices (finalized only)
      const invoicesRes = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/invoices`, {
        params: { page: 1, page_size: 100, status: 'finalized' }
      });
      setInvoices(invoicesRes.data.items || []);
      
      // Load purchases (finalized only)
      const purchasesRes = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/purchases`, {
        params: { page: 1, page_size: 100, status: 'finalized' }
      });
      setPurchases(purchasesRes.data.items || []);
      
      // Load accounts
      const accountsRes = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/accounts`);
      setAccounts(accountsRes.data.items || accountsRes.data || []);
    } catch (err) {
      console.error('Error loading reference data:', err);
    }
  };
```

### AFTER:
```javascript
  // Load reference data
  const loadReferenceData = async (returnType = 'sale_return') => {
    try {
      // Load returnable invoices based on return type
      if (returnType === 'sale_return') {
        const invoicesRes = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/invoices/returnable`, {
          params: { type: 'sales' }
        });
        setInvoices(invoicesRes.data || []);
      } else if (returnType === 'purchase_return') {
        const purchasesRes = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/purchases`, {
          params: { page: 1, page_size: 100, status: 'finalized' }
        });
        setPurchases(purchasesRes.data.items || []);
      }
      
      // Load accounts
      const accountsRes = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/accounts`);
      setAccounts(accountsRes.data.items || accountsRes.data || []);
    } catch (err) {
      console.error('Error loading reference data:', err);
      setError(err.response?.data?.detail || 'Failed to load reference data');
    }
  };
```

### 📊 WHAT CHANGED:
1. **Function signature:** Added parameter `(returnType = 'sale_return')`
2. **API endpoint change:** `/invoices` → `/invoices/returnable?type=sales`
3. **Conditional loading:** Only loads relevant data based on returnType
4. **Data extraction:** `invoicesRes.data.items` → `invoicesRes.data` (no pagination wrapper)
5. **Error handling:** Added `setError()` call in catch block

---

### EDIT B: Updated `openCreateDialog` Function

**📍 Location:** Line 148

**✏️ EDIT TYPE:** Single line change

### BEFORE:
```javascript
  const openCreateDialog = () => {
    loadReferenceData();
    // ... rest of function
  };
```

### AFTER:
```javascript
  const openCreateDialog = () => {
    loadReferenceData('sale_return');
    // ... rest of function
  };
```

### 📊 WHAT CHANGED:
- **Single change:** `loadReferenceData()` → `loadReferenceData('sale_return')`
- **Purpose:** Explicitly pass return type to ensure correct data loading

---

### EDIT C: Updated Return Type Dropdown & Invoice Selection

**📍 Location:** Lines 554-609

**✏️ EDIT TYPE:** Multiple changes in JSX structure

### BEFORE:
```javascript
<div>
  <label className=\"block text-sm font-medium text-gray-700 mb-1\">Return Type *</label>
  <select
    value={formData.return_type}
    onChange={(e) => {
      handleFormChange('return_type', e.target.value);
      handleFormChange('reference_type', e.target.value === 'sale_return' ? 'invoice' : 'purchase');
      handleFormChange('reference_id', '');
    }}
    className=\"w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500\"
  >
    <option value=\"sale_return\">Sales Return</option>
    <option value=\"purchase_return\">Purchase Return</option>
  </select>
</div>

<div>
  <label className=\"block text-sm font-medium text-gray-700 mb-1\">
    {formData.return_type === 'sale_return' ? 'Select Invoice *' : 'Select Purchase *'}
  </label>
  <select
    value={formData.reference_id}
    onChange={(e) => handleFormChange('reference_id', e.target.value)}
    className=\"w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500\"
  >
    <option value=\"\">-- Select --</option>
    {formData.return_type === 'sale_return' ? (
      invoices.map(inv => (
        <option key={inv.id} value={inv.id}>
          {inv.invoice_number} - {inv.customer_name || inv.walk_in_name} - {formatCurrency(inv.grand_total)} OMR
        </option>
      ))
    ) : (
      purchases.map(pur => (
        <option key={pur.id} value={pur.id}>
          {pur.id.substring(0, 8)} - {pur.description} - {formatCurrency(pur.amount_total)} OMR
        </option>
      ))
    )}
  </select>
  <p className=\"text-xs text-gray-500 mt-1\">
    ℹ️ Only finalized {formData.return_type === 'sale_return' ? 'invoices' : 'purchases'} are shown. Draft items cannot be returned.
  </p>
</div>
```

### AFTER:
```javascript
<div>
  <label className=\"block text-sm font-medium text-gray-700 mb-1\">Return Type *</label>
  <select
    value={formData.return_type}
    onChange={(e) => {
      const newReturnType = e.target.value;
      handleFormChange('return_type', newReturnType);
      handleFormChange('reference_type', newReturnType === 'sale_return' ? 'invoice' : 'purchase');
      handleFormChange('reference_id', '');
      // Reload reference data based on new return type
      loadReferenceData(newReturnType);
    }}
    className=\"w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500\"
  >
    <option value=\"sale_return\">Sales Return</option>
    <option value=\"purchase_return\">Purchase Return</option>
  </select>
</div>

<div>
  <label className=\"block text-sm font-medium text-gray-700 mb-1\">
    {formData.return_type === 'sale_return' ? 'Select Invoice *' : 'Select Purchase *'}
  </label>
  <select
    value={formData.reference_id}
    onChange={(e) => handleFormChange('reference_id', e.target.value)}
    className=\"w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500\"
    disabled={formData.return_type === 'sale_return' ? invoices.length === 0 : purchases.length === 0}
  >
    <option value=\"\">-- Select --</option>
    {formData.return_type === 'sale_return' ? (
      invoices.length > 0 ? (
        invoices.map(inv => (
          <option key={inv.id} value={inv.id}>
            {inv.invoice_no} - {inv.party_name} - {formatCurrency(inv.total_amount)} OMR
          </option>
        ))
      ) : null
    ) : (
      purchases.map(pur => (
        <option key={pur.id} value={pur.id}>
          {pur.id.substring(0, 8)} - {pur.description} - {formatCurrency(pur.amount_total)} OMR
        </option>
      ))
    )}
  </select>
  {formData.return_type === 'sale_return' && invoices.length === 0 ? (
    <p className=\"text-xs text-red-600 mt-1\">
      ⚠️ No finalized invoices available for return
    </p>
  ) : (
    <p className=\"text-xs text-gray-500 mt-1\">
      ℹ️ Only finalized {formData.return_type === 'sale_return' ? 'invoices' : 'purchases'} are shown. Draft items cannot be returned.
    </p>
  )}
</div>
```

### 📊 WHAT CHANGED:

**In Return Type onChange handler:**
1. Added: `const newReturnType = e.target.value;`
2. Added: `loadReferenceData(newReturnType);` (dynamic reload)

**In Invoice/Purchase Select dropdown:**
3. Added: `disabled={formData.return_type === 'sale_return' ? invoices.length === 0 : purchases.length === 0}`
4. Changed field names:
   - `inv.invoice_number` → `inv.invoice_no`
   - `inv.customer_name || inv.walk_in_name` → `inv.party_name`
   - `inv.grand_total` → `inv.total_amount`
5. Added conditional rendering: `invoices.length > 0 ? (...) : null`

**In helper text:**
6. Changed from static text to conditional:
   - **When empty:** Red text `⚠️ No finalized invoices available for return`
   - **When available:** Blue text `ℹ️ Only finalized...`

---

## 📋 SUMMARY OF ALL CHANGES

### Backend (1 file, 1 edit)
| File | Location | Type | Lines Changed |
|------|----------|------|---------------|
| `/app/backend/server.py` | After line 4440 | **INSERT** | +66 lines |

### Frontend (1 file, 3 edits)
| File | Location | Type | Lines Changed |
|------|----------|------|---------------|
| `/app/frontend/src/pages/ReturnsPage.js` | Lines 88-109 | **MODIFY** | ~22 lines modified |
| `/app/frontend/src/pages/ReturnsPage.js` | Line 148 | **MODIFY** | 1 line modified |
| `/app/frontend/src/pages/ReturnsPage.js` | Lines 554-609 | **MODIFY** | ~55 lines modified |

### Total Impact
- **Files Modified:** 2
- **Total Edits:** 4
- **Lines Changed:** ~144 lines

---

## 🔍 KEY FIELD NAME MAPPINGS

The backend API returns different field names than the old invoice endpoint:

| Old Field | New Field | Example Value |
|-----------|-----------|---------------|
| `invoice_number` | `invoice_no` | \"INV-2026-0001\" |
| `customer_name \|\| walk_in_name` | `party_name` | \"Test Customer\" |
| `grand_total` | `total_amount` | 551.25 |
| N/A (calculated) | `balance_amount` | 551.25 |
| `items` | `items` | [...] (unchanged) |

---

## ✅ VERIFICATION

You can verify these changes by:

1. **Backend:** Check line 4442 in `/app/backend/server.py` - should see `@api_router.get(\"/invoices/returnable\")`
2. **Frontend:** Check line 89 in `/app/frontend/src/pages/ReturnsPage.js` - should see `const loadReferenceData = async (returnType = 'sale_return') =>`
3. **Frontend:** Check line 588 - should see `{inv.invoice_no}` instead of `{inv.invoice_number}`

**Run this command to verify:**
```bash
# Check backend
grep -n \"def get_returnable_invoices\" /app/backend/server.py

# Check frontend
grep -n \"loadReferenceData = async (returnType\" /app/frontend/src/pages/ReturnsPage.js
grep -n \"invoice_no\" /app/frontend/src/pages/ReturnsPage.js
```

---

**Document Created:** January 27, 2026  
**Status:** All changes documented and verified ✅
"