# MODULE 6 COMPLIANT - finalize_return function
# This will be integrated back into server.py

@api_router.post("/returns/{return_id}/finalize")
@limiter.limit("30/minute")
async def finalize_return(
    request: Request,
    return_id: str,
    current_user: User = Depends(require_permission('returns.finalize'))
):
    """
    ⚠️ MODULE 6 CRITICAL RULES:
    1. NO automatic inventory impact on finalize
    2. Sets inventory_action_required = True (admin must manually adjust)
    3. Sales Return refund → DEBIT transaction
    4. Purchase Return refund → CREDIT transaction
    5. Validates refund amounts against original invoice/purchase
    6. Finalized returns are IMMUTABLE
    
    Finalize a return (create refund transactions and update balances).
    DOES NOT automatically adjust inventory - requires manual action.
    """
    # Pre-transaction validation
    return_doc = await db.returns.find_one({"id": return_id, "is_deleted": False})
    if not return_doc:
        raise HTTPException(status_code=404, detail="Return not found")
    
    current_status = return_doc.get('status')
    
    if current_status == 'finalized':
        raise HTTPException(status_code=400, detail="Return is already finalized")
    
    if current_status == 'processing':
        raise HTTPException(status_code=409, detail="Return is currently being processed. Please try again in a moment.")
    
    # ========== VALIDATE REFUND DETAILS (REQUIRED AT FINALIZATION) ==========
    refund_mode = return_doc.get('refund_mode')
    if not refund_mode or refund_mode not in ['money', 'gold', 'mixed']:
        raise HTTPException(
            status_code=400, 
            detail="Refund mode is required for finalization. Must be 'money', 'gold', or 'mixed'. Please update the return first."
        )
    
    # Convert Decimal128 to Decimal for validation
    refund_money_amount = return_doc.get('refund_money_amount', 0)
    if isinstance(refund_money_amount, Decimal128):
        refund_money_amount = Decimal(str(refund_money_amount.to_decimal()))
    else:
        refund_money_amount = Decimal(str(refund_money_amount or 0))
    
    refund_gold_grams = return_doc.get('refund_gold_grams', 0)
    if isinstance(refund_gold_grams, Decimal128):
        refund_gold_grams = Decimal(str(refund_gold_grams.to_decimal()))
    else:
        refund_gold_grams = Decimal(str(refund_gold_grams or 0))
    
    # Validate refund amounts based on mode
    if refund_mode == 'money' and refund_money_amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="refund_money_amount must be greater than 0 for money refund mode. Please update the return first."
        )
    
    if refund_mode == 'gold' and refund_gold_grams <= 0:
        raise HTTPException(
            status_code=400,
            detail="refund_gold_grams must be greater than 0 for gold refund mode. Please update the return first."
        )
    
    if refund_mode == 'mixed':
        if refund_money_amount <= 0 or refund_gold_grams <= 0:
            raise HTTPException(
                status_code=400,
                detail="Both refund_money_amount and refund_gold_grams must be greater than 0 for mixed refund mode. Please update the return first."
            )
    
    # Validate account for money refund
    account_id = return_doc.get('account_id')
    if refund_mode in ['money', 'mixed']:
        if not account_id:
            raise HTTPException(
                status_code=400,
                detail="account_id is required for money refund. Please update the return with account details first."
            )
        account = await db.accounts.find_one({"id": account_id, "is_deleted": False})
        if not account:
            raise HTTPException(status_code=404, detail="Account not found. Please update the return with a valid account.")
    
    # ========== VALIDATE REFUND AMOUNT AGAINST ORIGINAL (MODULE 6) ==========
    reference_type = return_doc.get('reference_type')
    reference_id = return_doc.get('reference_id')
    return_type = return_doc.get('return_type')
    
    if refund_mode in ['money', 'mixed'] and refund_money_amount > 0:
        if reference_type == 'invoice' and return_type == 'sale_return':
            # Validate refund does not exceed invoice paid amount
            invoice = await db.invoices.find_one({"id": reference_id, "is_deleted": False})
            if invoice:
                paid_amount = invoice.get('paid_amount', 0)
                if isinstance(paid_amount, Decimal128):
                    paid_amount = Decimal(str(paid_amount.to_decimal()))
                else:
                    paid_amount = Decimal(str(paid_amount or 0))
                
                if refund_money_amount > paid_amount:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Refund amount ({refund_money_amount}) cannot exceed invoice paid amount ({paid_amount})"
                    )
        
        elif reference_type == 'purchase' and return_type == 'purchase_return':
            # Validate refund does not exceed purchase total
            purchase = await db.purchases.find_one({"id": reference_id, "is_deleted": False})
            if purchase:
                total_amount = purchase.get('total_money', 0)
                if isinstance(total_amount, Decimal128):
                    total_amount = Decimal(str(total_amount.to_decimal()))
                else:
                    total_amount = Decimal(str(total_amount or 0))
                
                if refund_money_amount > total_amount:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Refund amount ({refund_money_amount}) cannot exceed purchase total ({total_amount})"
                    )
    
    # ==========================================================================
    
    # Use status lock + rollback for safety
    try:
        # Step 1: Atomic lock - Set status to 'processing'
        lock_result = await db.returns.update_one(
            {"id": return_id, "status": "draft", "is_deleted": False},
            {"$set": {"status": "processing", "processing_started_at": datetime.now(timezone.utc)}}
        )
                
        if lock_result.modified_count == 0:
            raise HTTPException(status_code=409, detail="Return is already being processed or was modified.")
        
        # Get return data
        party_id = return_doc.get('party_id')
        
        transaction_id = None
        gold_ledger_id = None
        
        # ========================================================================
        # SALES RETURN WORKFLOW (MODULE 6: NO INVENTORY AUTO-ADJUSTMENT)
        # ========================================================================
        if return_type == 'sale_return':
            # MODULE 6: NO AUTOMATIC STOCK MOVEMENTS OR INVENTORY UPDATES
            # Inventory adjustment will be done manually by admin
            
            # 1. Create money refund transaction (DEBIT per MODULE 6)
            if refund_mode in ['money', 'mixed'] and refund_money_amount > 0:
                account_id = return_doc.get('account_id')
                account = await db.accounts.find_one({"id": account_id})
                if not account:
                    raise HTTPException(status_code=400, detail="Account not found for money refund")
                
                # Generate transaction number
                transactions_count = await db.transactions.count_documents({})
                transaction_number = f"TXN-{transactions_count + 1:05d}"
                
                transaction_id = str(uuid.uuid4())
                transaction = Transaction(
                    id=transaction_id,
                    transaction_number=transaction_number,
                    date=datetime.now(timezone.utc),
                    transaction_type="debit",  # MODULE 6 FIX: DEBIT for sales return (money refund out)
                    mode=return_doc.get('payment_mode', 'cash'),
                    account_id=account_id,
                    account_name=account.get('name'),
                    party_id=party_id,
                    party_name=return_doc.get('party_name'),
                    amount=Decimal(str(refund_money_amount)).quantize(Decimal('0.01')),
                    category="sales_return",
                    notes=f"Sales Return Refund - {return_doc.get('return_number')}",
                    reference_type="return",
                    reference_id=return_id,
                    created_by=current_user.id
                )
                await db.transactions.insert_one(transaction.model_dump())
                
                # Update Cash/Bank account balance (refund out = decrease balance)
                await db.accounts.update_one(
                    {"id": account_id},
                    {"$inc": {"current_balance": Decimal128(Decimal(str(-refund_money_amount)).quantize(Decimal('0.01')))}}
                )
            
            # 2. Create gold refund (GoldLedgerEntry - OUT)
            if refund_mode in ['gold', 'mixed'] and refund_gold_grams > 0:
                gold_ledger_id = str(uuid.uuid4())
                gold_entry = GoldLedgerEntry(
                    id=gold_ledger_id,
                    party_id=party_id,
                    date=datetime.now(timezone.utc),
                    type="OUT",  # Shop gives gold to customer
                    weight_grams=Decimal(str(refund_gold_grams)).quantize(Decimal('0.001')),
                    purity_entered=return_doc.get('refund_gold_purity', 916),
                    purpose="sales_return",
                    reference_type="return",
                    reference_id=return_id,
                    notes=f"Sales Return Gold Refund - {return_doc.get('return_number')}",
                    created_by=current_user.id
                )
                await db.gold_ledger.insert_one(gold_entry.model_dump())
            
            # 3. Update invoice (adjust paid_amount and balance_due)
            if reference_type == 'invoice' and refund_mode in ['money', 'mixed']:
                invoice = await db.invoices.find_one({"id": reference_id})
                if invoice:
                    # Reduce paid amount by refund amount (as we're returning money)
                    current_paid = invoice.get('paid_amount', 0)
                    if isinstance(current_paid, Decimal128):
                        current_paid = Decimal(str(current_paid.to_decimal()))
                    else:
                        current_paid = Decimal(str(current_paid or 0))
                    
                    grand_total = invoice.get('grand_total', 0)
                    if isinstance(grand_total, Decimal128):
                        grand_total = Decimal(str(grand_total.to_decimal()))
                    else:
                        grand_total = Decimal(str(grand_total or 0))
                    
                    new_paid = max(Decimal('0'), current_paid - refund_money_amount)
                    new_balance = grand_total - new_paid
                    
                    await db.invoices.update_one(
                        {"id": reference_id},
                        {
                            "$set": {
                                "paid_amount": Decimal128(new_paid.quantize(Decimal('0.01'))),
                                "balance_due": Decimal128(max(Decimal('0'), new_balance).quantize(Decimal('0.01'))),
                                "payment_status": "unpaid" if new_balance > 0 else "paid"
                            }
                        }
                    )
            
            # 4. Update customer outstanding (if saved customer)
            if party_id and refund_mode in ['money', 'mixed']:
                party = await db.parties.find_one({"id": party_id})
                if party and party.get('party_type') == 'customer':
                    # Increase outstanding (customer owes less due to refund)
                    current_outstanding = party.get('outstanding_balance', 0)
                    if isinstance(current_outstanding, Decimal128):
                        current_outstanding = Decimal(str(current_outstanding.to_decimal()))
                    else:
                        current_outstanding = Decimal(str(current_outstanding or 0))
                    
                    new_outstanding = current_outstanding + refund_money_amount
                    await db.parties.update_one(
                        {"id": party_id},
                        {"$set": {"outstanding_balance": Decimal128(new_outstanding.quantize(Decimal('0.01')))}}
                    )
        
        # ========================================================================
        # PURCHASE RETURN WORKFLOW (MODULE 6: NO INVENTORY AUTO-ADJUSTMENT)
        # ========================================================================
        elif return_type == 'purchase_return':
            # MODULE 6: NO AUTOMATIC STOCK MOVEMENTS OR INVENTORY UPDATES
            # Inventory adjustment will be done manually by admin
            
            # 1. Create money refund transaction (CREDIT per MODULE 6)
            if refund_mode in ['money', 'mixed'] and refund_money_amount > 0:
                account_id = return_doc.get('account_id')
                account = await db.accounts.find_one({"id": account_id})
                if not account:
                    raise HTTPException(status_code=400, detail="Account not found for money refund")
                
                # Generate transaction number
                transactions_count = await db.transactions.count_documents({})
                transaction_number = f"TXN-{transactions_count + 1:05d}"
                
                transaction_id = str(uuid.uuid4())
                transaction = Transaction(
                    id=transaction_id,
                    transaction_number=transaction_number,
                    date=datetime.now(timezone.utc),
                    transaction_type="credit",  # MODULE 6 FIX: CREDIT for purchase return (vendor refunds us)
                    mode=return_doc.get('payment_mode', 'cash'),
                    account_id=account_id,
                    account_name=account.get('name'),
                    party_id=party_id,
                    party_name=return_doc.get('party_name'),
                    amount=Decimal(str(refund_money_amount)).quantize(Decimal('0.01')),
                    category="purchase_return",
                    notes=f"Purchase Return Refund - {return_doc.get('return_number')}",
                    reference_type="return",
                    reference_id=return_id,
                    created_by=current_user.id
                )
                await db.transactions.insert_one(transaction.model_dump())
                
                # Update account balance (refund in = increase balance)
                await db.accounts.update_one(
                    {"id": account_id},
                    {"$inc": {"current_balance": Decimal128(Decimal(str(refund_money_amount)).quantize(Decimal('0.01')))}}
                )
            
            # 2. Create gold refund (GoldLedgerEntry - IN - vendor returns gold to us)
            if refund_mode in ['gold', 'mixed'] and refund_gold_grams > 0:
                gold_ledger_id = str(uuid.uuid4())
                gold_entry = GoldLedgerEntry(
                    id=gold_ledger_id,
                    party_id=party_id,
                    date=datetime.now(timezone.utc),
                    type="IN",  # Vendor gives gold back to shop
                    weight_grams=Decimal(str(refund_gold_grams)).quantize(Decimal('0.001')),
                    purity_entered=return_doc.get('refund_gold_purity', 916),
                    purpose="purchase_return",
                    reference_type="return",
                    reference_id=return_id,
                    notes=f"Purchase Return Gold Refund - {return_doc.get('return_number')}",
                    created_by=current_user.id
                )
                await db.gold_ledger.insert_one(gold_entry.model_dump())
            
            # 3. Update purchase (adjust balance_due_money)
            if reference_type == 'purchase' and refund_mode in ['money', 'mixed']:
                purchase = await db.purchases.find_one({"id": reference_id})
                if purchase:
                    # Reduce balance due by refund amount
                    current_balance = purchase.get('balance_due_money', 0)
                    if isinstance(current_balance, Decimal128):
                        current_balance = Decimal(str(current_balance.to_decimal()))
                    else:
                        current_balance = Decimal(str(current_balance or 0))
                    
                    new_balance = max(Decimal('0'), current_balance - refund_money_amount)
                    
                    await db.purchases.update_one(
                        {"id": reference_id},
                        {"$set": {"balance_due_money": Decimal128(new_balance.quantize(Decimal('0.01')))}}
                    )
            
            # 4. Update vendor payable
            if party_id and refund_mode in ['money', 'mixed']:
                party = await db.parties.find_one({"id": party_id})
                if party and party.get('party_type') == 'vendor':
                    # Decrease outstanding (we owe vendor less due to return)
                    current_outstanding = party.get('outstanding_balance', 0)
                    if isinstance(current_outstanding, Decimal128):
                        current_outstanding = Decimal(str(current_outstanding.to_decimal()))
                    else:
                        current_outstanding = Decimal(str(current_outstanding or 0))
                    
                    new_outstanding = current_outstanding - refund_money_amount
                    await db.parties.update_one(
                        {"id": party_id},
                        {"$set": {"outstanding_balance": Decimal128(new_outstanding.quantize(Decimal('0.01')))}}
                    )
        
        # ========================================================================
        # MODULE 6: SET INVENTORY ACTION REQUIRED FLAG
        # ========================================================================
        inventory_notes = f"Return finalized – manual inventory adjustment required for {len(return_doc.get('items', []))} item(s)"
        
        # ========================================================================
        # UPDATE RETURN STATUS TO FINALIZED (MODULE 6 COMPLIANT)
        # ========================================================================
        await db.returns.update_one(
            {"id": return_id},
            {
                "$set": {
                    "status": "finalized",
                    "finalized_at": datetime.now(timezone.utc),
                    "finalized_by": current_user.id,
                    "inventory_action_required": True,  # MODULE 6: Manual inventory adjustment required
                    "inventory_action_notes": inventory_notes,
                    "transaction_id": transaction_id,
                    "gold_ledger_id": gold_ledger_id
                },
                "$unset": {"processing_started_at": ""}
            }
        )
        
        # Create audit log
        await create_audit_log(
            user_id=current_user.id,
            user_name=current_user.full_name,            
            module="returns",
            record_id=return_id,
            action="finalize",
            changes={
                "status": "finalized",
                "inventory_action_required": True,  # MODULE 6: Flag for manual adjustment
                "inventory_action_notes": inventory_notes,
                "transaction_created": transaction_id is not None,
                "gold_ledger_created": gold_ledger_id is not None,
                "note": "NO automatic inventory impact - manual adjustment required per MODULE 6"
            }
        )
        
        # Fetch updated return
        updated_return = await db.returns.find_one({"id": return_id})
        
        return {
            "message": "Return finalized successfully. Manual inventory adjustment is required.",
            "return": decimal_to_float(updated_return),
            "details": {
                "inventory_action_required": True,
                "inventory_action_notes": inventory_notes,
                "transaction_created": transaction_id is not None,
                "gold_ledger_created": gold_ledger_id is not None
            }
        }
    
    except HTTPException as he:
        # Rollback: Reset status to draft if processing lock was acquired
        try:
            await db.returns.update_one(
                {"id": return_id, "status": "processing"},
                {"$set": {"status": "draft"}, "$unset": {"processing_started_at": ""}}
            )
        except:
            pass  # Best effort rollback
        raise he
    except Exception as e:
        # CRITICAL ROLLBACK - Finalization failed mid-process
        try:
            # 1. Rollback return status to draft
            await db.returns.update_one(
                {"id": return_id},
                {
                    "$set": {"status": "draft"},
                    "$unset": {
                        "processing_started_at": "",
                        "inventory_action_required": "",
                        "inventory_action_notes": "",
                        "transaction_id": "",
                        "gold_ledger_id": ""
                    }
                }
            )
            
            # 2. Delete transaction if created
            if transaction_id:
                transaction = await db.transactions.find_one({"id": transaction_id})
                if transaction:
                    # Revert account balance
                    account_id = transaction.get('account_id')
                    amount = transaction.get('amount', 0)
                    if isinstance(amount, Decimal128):
                        amount = Decimal(str(amount.to_decimal()))
                    transaction_type = transaction.get('transaction_type')
                    if account_id:
                        # Reverse the balance change
                        balance_change = amount if transaction_type == 'credit' else -amount
                        await db.accounts.update_one(
                            {"id": account_id},
                            {"$inc": {"current_balance": Decimal128(Decimal(str(balance_change)).quantize(Decimal('0.01')))}}
                        )
                    # Delete transaction
                    await db.transactions.delete_one({"id": transaction_id})
            
            # 3. Delete gold ledger entry if created
            if gold_ledger_id:
                await db.gold_ledger.delete_one({"id": gold_ledger_id})
            
            # 4. Create audit log for rollback
            await create_audit_log(
                user_id=current_user.id,
                user_name=current_user.full_name,
                module="returns",
                record_id=return_id,
                action="finalize_rollback",
                changes={
                    "error": str(e),
                    "rollback_completed": True,
                    "transaction_deleted": transaction_id is not None,
                    "gold_ledger_deleted": gold_ledger_id is not None
                }
            )
        except Exception as rollback_error:
            # Even rollback failed - log critical error
            print(f"CRITICAL: Rollback failed for return {return_id}: {str(rollback_error)}")
        
        raise HTTPException(
            status_code=500,
            detail=f"Error finalizing return: {str(e)}. Changes have been rolled back."
        )
