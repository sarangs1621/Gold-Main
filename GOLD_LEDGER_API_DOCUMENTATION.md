# Gold Ledger Module - API Documentation

## Overview
The Gold Ledger module tracks gold received from and given to parties (customers/vendors). It maintains a complete audit trail of all gold transactions and calculates party-wise gold balances.

## Concepts

### Entry Types
- **IN**: Shop receives gold from party (party owes shop gold)
- **OUT**: Shop gives gold to party (shop owes party gold)

### Purpose Types
- **job_work**: Gold given for job work (making jewelry)
- **exchange**: Gold exchange transactions
- **advance_gold**: Advance gold received from party
- **adjustment**: Manual adjustments

### Gold Balance Calculation
- **gold_due_from_party**: Total gold shop received from party (SUM of IN entries)
- **gold_due_to_party**: Total gold shop gave to party (SUM of OUT entries)
- **net_gold_balance**: gold_due_from_party - gold_due_to_party
  - Positive value = Party owes gold to shop
  - Negative value = Shop owes gold to party

## API Endpoints

### 1. Create Gold Ledger Entry
**Endpoint**: `POST /api/gold-ledger`

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "party_id": "uuid-of-party",
  "type": "IN",
  "weight_grams": 125.456,
  "purity_entered": 22,
  "purpose": "advance_gold",
  "reference_type": "manual",
  "reference_id": "optional-uuid",
  "notes": "Advance gold received from customer"
}
```

**Response** (200 OK):
```json
{
  "id": "entry-uuid",
  "party_id": "party-uuid",
  "date": "2026-01-21T19:59:03.000Z",
  "type": "IN",
  "weight_grams": 125.456,
  "purity_entered": 22,
  "purpose": "advance_gold",
  "reference_type": "manual",
  "reference_id": null,
  "notes": "Advance gold received from customer",
  "created_at": "2026-01-21T19:59:03.000Z",
  "created_by": "admin-user-id",
  "is_deleted": false,
  "deleted_at": null,
  "deleted_by": null
}
```

**Validations**:
- `party_id`: Required, must exist in parties collection
- `type`: Required, must be "IN" or "OUT"
- `weight_grams`: Required, will be rounded to 3 decimals
- `purity_entered`: Required, integer
- `purpose`: Required, must be one of: job_work, exchange, advance_gold, adjustment
- `reference_type`: Optional (invoice, jobcard, purchase, manual)
- `reference_id`: Optional
- `notes`: Optional

---

### 2. Get Gold Ledger Entries
**Endpoint**: `GET /api/gold-ledger`

**Headers**:
```
Authorization: Bearer <token>
```

**Query Parameters**:
- `party_id` (optional): Filter by specific party
- `date_from` (optional): Start date (ISO format: YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)
- `date_to` (optional): End date (ISO format)

**Examples**:
```
GET /api/gold-ledger
GET /api/gold-ledger?party_id=party-uuid
GET /api/gold-ledger?date_from=2026-01-01&date_to=2026-01-31
GET /api/gold-ledger?party_id=party-uuid&date_from=2026-01-01
```

**Response** (200 OK):
```json
[
  {
    "id": "entry-uuid-1",
    "party_id": "party-uuid",
    "date": "2026-01-21T19:59:03.000Z",
    "type": "OUT",
    "weight_grams": 50.123,
    "purity_entered": 22,
    "purpose": "job_work",
    "reference_type": "jobcard",
    "reference_id": "jobcard-uuid",
    "notes": "Gold given for job work",
    "created_at": "2026-01-21T19:59:03.000Z",
    "created_by": "admin-user-id",
    "is_deleted": false,
    "deleted_at": null,
    "deleted_by": null
  },
  {
    "id": "entry-uuid-2",
    "party_id": "party-uuid",
    "date": "2026-01-21T19:59:02.000Z",
    "type": "IN",
    "weight_grams": 125.456,
    "purity_entered": 22,
    "purpose": "advance_gold",
    "reference_type": "manual",
    "reference_id": null,
    "notes": "Advance gold received",
    "created_at": "2026-01-21T19:59:02.000Z",
    "created_by": "admin-user-id",
    "is_deleted": false,
    "deleted_at": null,
    "deleted_by": null
  }
]
```

**Note**: Entries are sorted by date in descending order (most recent first)

---

### 3. Delete Gold Ledger Entry (Soft Delete)
**Endpoint**: `DELETE /api/gold-ledger/{entry_id}`

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "message": "Gold ledger entry deleted successfully"
}
```

**Response** (404 Not Found):
```json
{
  "detail": "Gold ledger entry not found"
}
```

**Note**: This is a soft delete. The entry is marked as deleted (is_deleted=true) but remains in the database for audit purposes. Deleted entries do not appear in GET requests.

---

### 4. Get Party Gold Summary
**Endpoint**: `GET /api/parties/{party_id}/gold-summary`

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "party_id": "party-uuid",
  "party_name": "Gold Test Party",
  "gold_due_from_party": 125.456,
  "gold_due_to_party": 50.123,
  "net_gold_balance": 75.333,
  "total_entries": 2
}
```

**Field Descriptions**:
- `gold_due_from_party`: Total gold shop received from party (party owes shop) - SUM of all IN entries
- `gold_due_to_party`: Total gold shop gave to party (shop owes party) - SUM of all OUT entries
- `net_gold_balance`: Net balance = gold_due_from_party - gold_due_to_party
  - Positive value: Party owes gold to shop
  - Negative value: Shop owes gold to party
  - Zero: No outstanding gold balance
- `total_entries`: Number of gold ledger entries for this party

**Response** (404 Not Found):
```json
{
  "detail": "Party not found"
}
```

---

## Usage Examples

### Scenario 1: Customer Brings Advance Gold
When a customer brings gold as advance for future jewelry making:

```bash
curl -X POST "http://localhost:8001/api/gold-ledger" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "party_id": "customer-uuid",
    "type": "IN",
    "weight_grams": 50.250,
    "purity_entered": 22,
    "purpose": "advance_gold",
    "reference_type": "manual",
    "notes": "Advance gold received for future order"
  }'
```

### Scenario 2: Shop Gives Gold for Job Work
When shop gives gold to a worker/vendor for job work:

```bash
curl -X POST "http://localhost:8001/api/gold-ledger" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "party_id": "vendor-uuid",
    "type": "OUT",
    "weight_grams": 100.000,
    "purity_entered": 22,
    "purpose": "job_work",
    "reference_type": "jobcard",
    "reference_id": "jobcard-uuid",
    "notes": "Gold given to worker for making chains"
  }'
```

### Scenario 3: Check Customer's Gold Balance
To see how much gold a customer owes or is owed:

```bash
curl -X GET "http://localhost:8001/api/parties/customer-uuid/gold-summary" \
  -H "Authorization: Bearer <token>"
```

### Scenario 4: View All Gold Transactions for a Party
To see complete gold transaction history:

```bash
curl -X GET "http://localhost:8001/api/gold-ledger?party_id=party-uuid" \
  -H "Authorization: Bearer <token>"
```

### Scenario 5: Monthly Gold Ledger Report
To get all gold transactions for a specific month:

```bash
curl -X GET "http://localhost:8001/api/gold-ledger?date_from=2026-01-01&date_to=2026-01-31" \
  -H "Authorization: Bearer <token>"
```

---

## Business Logic

### Gold Balance Interpretation

**Example 1: Party Owes Shop**
```
IN entries (party gave to shop): 150.000g
OUT entries (shop gave to party): 50.000g
Net balance: +100.000g (positive = party owes shop 100g)
```

**Example 2: Shop Owes Party**
```
IN entries (party gave to shop): 50.000g
OUT entries (shop gave to party): 150.000g
Net balance: -100.000g (negative = shop owes party 100g)
```

**Example 3: Balanced**
```
IN entries (party gave to shop): 100.000g
OUT entries (shop gave to party): 100.000g
Net balance: 0.000g (no outstanding balance)
```

---

## Data Precision

All weight values are maintained with **3 decimal place precision**:
- Input: 125.4567g → Stored as: 125.457g (rounded)
- Display: Always show 3 decimals (e.g., 100.000g, not 100g)
- Calculations: All balance calculations maintain 3 decimal precision

---

## Audit Trail

Every gold ledger operation is logged in the audit_logs collection:
- **create**: When a new entry is created
- **delete**: When an entry is soft deleted

Audit logs include:
- User who performed the action
- Timestamp
- Module: "gold_ledger"
- Record ID
- Action type
- Changes made (for updates)

---

## Integration Points

The Gold Ledger can be integrated with:

1. **Job Cards**: Reference job card when giving gold for job work
   - Use `reference_type: "jobcard"` and `reference_id: jobcard_id`

2. **Invoices**: Reference invoice for gold transactions related to sales
   - Use `reference_type: "invoice"` and `reference_id: invoice_id`

3. **Purchases**: Reference purchase orders for gold purchased from vendors
   - Use `reference_type: "purchase"` and `reference_id: purchase_id`

4. **Manual Entries**: For general adjustments or corrections
   - Use `reference_type: "manual"` and `reference_id: null`

---

## Testing

All endpoints have been tested with 100% success rate:
- ✅ Create IN/OUT entries with proper validation
- ✅ Filter by party ID
- ✅ Filter by date range
- ✅ Calculate accurate gold balances
- ✅ Soft delete functionality
- ✅ Precision maintained at 3 decimals
- ✅ Audit logging working

See `/app/test_gold_ledger.py` for comprehensive test suite.

---

## Future Enhancements (Not in Module 1)

Potential future enhancements could include:
- Gold purity conversion (e.g., 22K to 24K equivalent)
- Gold rate tracking and valuation
- Automated alerts for high outstanding balances
- Export gold ledger reports (PDF/Excel)
- Gold balance reconciliation tools
- Integration with inventory for automatic IN/OUT entries

---

## Support

For issues or questions about the Gold Ledger module, refer to:
- Test suite: `/app/test_gold_ledger.py`
- Implementation: `/app/backend/server.py` (lines 260-270 for model, lines 568-700 for endpoints)
- Test results: `/app/test_result.md`
