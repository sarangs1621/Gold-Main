# Balance Calculation Bug Fix

## Problem Identified

**Issue**: When users credited money to a cash account, the balance was **decreasing** instead of **increasing**.

### Example from User Report:
- **Account**: Test Cash Account - Reports
- **Transaction**: Credit +10,000.00 OMR
- **Balance Before**: 50,000.00 OMR
- **Balance After**: 40,000.00 OMR ❌ (WRONG - Decreased by 10,000)
- **Expected**: 60,000.00 OMR ✓ (Should increase by 10,000)

## Root Cause

The backend was using **traditional accounting rules** where:
- For ASSET accounts (Cash/Bank): 
  - Debit = Increase balance
  - Credit = Decrease balance

But the frontend UI showed **user-friendly labels**:
- "Credit (Money IN)" - Users expected balance to INCREASE
- "Debit (Money OUT)" - Users expected balance to DECREASE

This mismatch caused the inverse behavior from what users expected.

## Solution Applied

Modified the `calculate_balance_delta` function in `/app/backend/server.py` to use **simplified, user-friendly logic**:

```python
# NEW LOGIC (User-Friendly)
def calculate_balance_delta(account_type: str, transaction_type: str, amount: float) -> float:
    """
    Credit = Money IN = INCREASES balance (+)
    Debit = Money OUT = DECREASES balance (-)
    """
    return amount if transaction_type == 'credit' else -amount
```

### Before vs After:

| Transaction Type | UI Label | OLD Behavior (Asset Account) | NEW Behavior (All Accounts) |
|-----------------|----------|------------------------------|----------------------------|
| Credit | Money IN | Decreased balance ❌ | Increases balance ✓ |
| Debit | Money OUT | Increased balance ❌ | Decreases balance ✓ |

## Testing Results

```
Initial Balance: 50,000.00

Transaction 1: Credit +10,000.00
  Result: 50,000 → 60,000 ✓ (INCREASED)

Transaction 2: Debit -5,000.00
  Result: 60,000 → 55,000 ✓ (DECREASED)
```

## Impact

- **Fixed**: All credit transactions now correctly INCREASE account balances
- **Fixed**: All debit transactions now correctly DECREASE account balances
- **Consistency**: Backend logic now matches frontend UI labels
- **User Experience**: Intuitive behavior that matches user expectations

## Files Modified

1. `/app/backend/server.py` - Updated `calculate_balance_delta` function (lines 48-69)

## Next Steps

Users should:
1. Test manual transactions in the Finance module
2. Verify that credit transactions increase balances
3. Verify that debit transactions decrease balances
4. Check historical transaction balances if needed (some may need recalculation)
