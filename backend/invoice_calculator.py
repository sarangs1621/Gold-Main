"""
Invoice Calculation Helper Module
----------------------------------
Centralizes all invoice calculation logic to ensure consistency across:
- UI display
- PDF generation
- Excel exports
- API responses

All monetary values are calculated to 3 decimal places (OMR standard)
"""

from typing import Dict, List, Any, Tuple
from decimal import Decimal, ROUND_HALF_UP


def round_money(value: float, decimals: int = 3) -> float:
    """Round money values to specified decimal places (default 3 for OMR)"""
    if value is None:
        return 0.0
    d = Decimal(str(value))
    return float(d.quantize(Decimal(10) ** -decimals, rounding=ROUND_HALF_UP))


def calculate_line_item(item: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculate all financial values for a single invoice line item
    
    Formula:
    1. Gold Value = Weight (g) × Gold Rate (per gram)
    2. Making Charge = (per item or per gram based calculation)
    3. Stone Charges = (if applicable)
    4. Wastage Charges = (if applicable)
    5. Subtotal = Gold Value + Making + Stone + Wastage - Item Discount
    6. VAT = Subtotal × VAT %
    7. Line Total = Subtotal + VAT
    
    Args:
        item: Dictionary containing item details
        
    Returns:
        Dictionary with calculated values added
    """
    # Extract values with defaults
    qty = item.get('qty', 1)
    weight = item.get('weight', 0.0)
    gross_weight = item.get('gross_weight', weight)
    stone_weight = item.get('stone_weight', 0.0)
    net_gold_weight = item.get('net_gold_weight', gross_weight - stone_weight)
    
    metal_rate = item.get('metal_rate', 0.0)
    making_value = item.get('making_value', 0.0)
    stone_charges = item.get('stone_charges', 0.0)
    wastage_charges = item.get('wastage_charges', 0.0)
    item_discount = item.get('item_discount', 0.0)
    vat_percent = item.get('vat_percent', 5.0)
    
    # Step 1: Calculate Gold Value
    # Gold Value = Net Weight × Rate per gram
    gold_value = round_money(net_gold_weight * metal_rate)
    
    # Step 2: Calculate subtotal before VAT
    # Subtotal = Gold Value + Making + Stone + Wastage - Item Discount
    subtotal_before_vat = round_money(
        gold_value + making_value + stone_charges + wastage_charges - item_discount
    )
    
    # Step 3: Calculate VAT
    # VAT Amount = Subtotal × (VAT % / 100)
    vat_amount = round_money(subtotal_before_vat * (vat_percent / 100))
    
    # Step 4: Calculate Line Total
    # Line Total = Subtotal + VAT
    line_total = round_money(subtotal_before_vat + vat_amount)
    
    # Return item with calculated values
    calculated_item = item.copy()
    calculated_item.update({
        'gross_weight': gross_weight,
        'stone_weight': stone_weight,
        'net_gold_weight': net_gold_weight,
        'gold_value': gold_value,
        'subtotal_before_vat': subtotal_before_vat,
        'vat_amount': vat_amount,
        'line_total': line_total
    })
    
    return calculated_item


def calculate_invoice_totals(items: List[Dict[str, Any]], discount_amount: float = 0.0) -> Dict[str, float]:
    """
    Calculate invoice-level totals from line items
    
    Formula:
    1. Metal Total = Σ (Gold Value for all items)
    2. Making Total = Σ (Making Charges for all items)
    3. Stone Total = Σ (Stone Charges for all items)
    4. Wastage Total = Σ (Wastage Charges for all items)
    5. Item Discounts Total = Σ (Item Discounts)
    6. Subtotal = Metal + Making + Stone + Wastage - Item Discounts
    7. After Invoice Discount = Subtotal - Invoice Discount
    8. VAT Total = Σ (VAT Amount for all items) OR calculate on taxable amount
    9. Grand Total = After Invoice Discount + VAT Total
    
    Args:
        items: List of calculated line items
        discount_amount: Invoice-level discount amount
        
    Returns:
        Dictionary with all invoice totals
    """
    # Calculate component totals
    metal_total = sum(item.get('gold_value', 0) for item in items)
    making_total = sum(item.get('making_value', 0) for item in items)
    stone_total = sum(item.get('stone_charges', 0) for item in items)
    wastage_total = sum(item.get('wastage_charges', 0) for item in items)
    item_discounts_total = sum(item.get('item_discount', 0) for item in items)
    
    # Calculate subtotal (before invoice discount and VAT)
    subtotal = round_money(metal_total + making_total + stone_total + wastage_total - item_discounts_total)
    
    # Apply invoice-level discount
    after_invoice_discount = round_money(subtotal - discount_amount)
    
    # Calculate VAT total from line items
    vat_total = sum(item.get('vat_amount', 0) for item in items)
    vat_total = round_money(vat_total)
    
    # Calculate grand total
    grand_total = round_money(after_invoice_discount + vat_total)
    
    # Total weight calculations
    total_weight = sum(item.get('weight', 0) for item in items)
    total_gross_weight = sum(item.get('gross_weight', 0) for item in items)
    total_stone_weight = sum(item.get('stone_weight', 0) for item in items)
    total_net_gold_weight = sum(item.get('net_gold_weight', 0) for item in items)
    
    return {
        'metal_total': round_money(metal_total),
        'making_total': round_money(making_total),
        'stone_total': round_money(stone_total),
        'wastage_total': round_money(wastage_total),
        'item_discounts_total': round_money(item_discounts_total),
        'subtotal': subtotal,
        'discount_amount': round_money(discount_amount),
        'after_invoice_discount': after_invoice_discount,
        'vat_total': vat_total,
        'grand_total': grand_total,
        'total_weight': round_money(total_weight),
        'total_gross_weight': round_money(total_gross_weight),
        'total_stone_weight': round_money(total_stone_weight),
        'total_net_gold_weight': round_money(total_net_gold_weight),
        'total_items': len(items)
    }


def calculate_payment_summary(grand_total: float, paid_amount: float = 0.0) -> Dict[str, Any]:
    """
    Calculate payment status and balance due
    
    Args:
        grand_total: Invoice grand total
        paid_amount: Total amount paid
        
    Returns:
        Dictionary with payment summary
    """
    balance_due = round_money(grand_total - paid_amount)
    
    # Determine payment status
    if paid_amount <= 0:
        payment_status = 'unpaid'
    elif balance_due > 0.001:  # Tolerance for floating point
        payment_status = 'partial'
    else:
        payment_status = 'paid'
    
    return {
        'grand_total': round_money(grand_total),
        'paid_amount': round_money(paid_amount),
        'balance_due': balance_due,
        'payment_status': payment_status
    }


def calculate_tax_breakdown(vat_total: float, tax_type: str = 'cgst_sgst', gst_percent: float = 5.0) -> Dict[str, float]:
    """
    Calculate tax breakdown (CGST/SGST or IGST)
    
    Args:
        vat_total: Total VAT/Tax amount
        tax_type: 'cgst_sgst' for intra-state, 'igst' for inter-state
        gst_percent: GST percentage (default 5%)
        
    Returns:
        Dictionary with tax breakdown
    """
    if tax_type == 'cgst_sgst':
        # Split equally between CGST and SGST
        cgst = round_money(vat_total / 2)
        sgst = round_money(vat_total / 2)
        return {
            'tax_type': 'cgst_sgst',
            'cgst_percent': round_money(gst_percent / 2, 2),
            'sgst_percent': round_money(gst_percent / 2, 2),
            'cgst_total': cgst,
            'sgst_total': sgst,
            'igst_total': 0.0,
            'total_tax': round_money(cgst + sgst)
        }
    else:
        # IGST for inter-state
        igst = round_money(vat_total)
        return {
            'tax_type': 'igst',
            'igst_percent': round_money(gst_percent, 2),
            'cgst_total': 0.0,
            'sgst_total': 0.0,
            'igst_total': igst,
            'total_tax': igst
        }


def calculate_full_invoice(invoice_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Complete invoice calculation - process all items and totals
    
    This is the main function to use for complete invoice calculations
    
    Args:
        invoice_data: Dictionary containing invoice details with items
        
    Returns:
        Complete invoice data with all calculations
    """
    # Calculate each line item
    calculated_items = []
    for item in invoice_data.get('items', []):
        calculated_item = calculate_line_item(item)
        calculated_items.append(calculated_item)
    
    # Calculate invoice totals
    discount_amount = invoice_data.get('discount_amount', 0.0)
    totals = calculate_invoice_totals(calculated_items, discount_amount)
    
    # Calculate payment summary
    paid_amount = invoice_data.get('paid_amount', 0.0)
    payment_summary = calculate_payment_summary(totals['grand_total'], paid_amount)
    
    # Calculate tax breakdown
    tax_type = invoice_data.get('tax_type', 'cgst_sgst')
    gst_percent = invoice_data.get('gst_percent', 5.0)
    tax_breakdown = calculate_tax_breakdown(totals['vat_total'], tax_type, gst_percent)
    
    # Combine all calculations
    result = invoice_data.copy()
    result['items'] = calculated_items
    result.update(totals)
    result.update(payment_summary)
    result.update(tax_breakdown)
    
    return result


def format_calculation_summary(invoice: Dict[str, Any]) -> Dict[str, str]:
    """
    Format calculation summary for display/print with formulas
    
    Returns human-readable calculation breakdown with formulas
    """
    items = invoice.get('items', [])
    
    # Build formula strings
    metal_formula = ' + '.join([f"{item.get('net_gold_weight', 0):.3f}g × {item.get('metal_rate', 0):.3f}" for item in items])
    metal_total = invoice.get('metal_total', 0)
    
    making_values = [f"{item.get('making_value', 0):.3f}" for item in items]
    making_formula = ' + '.join(making_values) if making_values else '0.000'
    making_total = invoice.get('making_total', 0)
    
    subtotal = invoice.get('subtotal', 0)
    discount = invoice.get('discount_amount', 0)
    vat_total = invoice.get('vat_total', 0)
    grand_total = invoice.get('grand_total', 0)
    
    return {
        'metal_formula': f"Metal Total = {metal_formula} = {metal_total:.3f} OMR",
        'making_formula': f"Making Total = {making_formula} = {making_total:.3f} OMR",
        'subtotal_formula': f"Subtotal = Metal + Making = {metal_total:.3f} + {making_total:.3f} = {subtotal:.3f} OMR",
        'discount_formula': f"Discount = {discount:.3f} OMR" if discount > 0 else "No discount applied",
        'taxable_formula': f"Taxable Amount = Subtotal - Discount = {subtotal:.3f} - {discount:.3f} = {(subtotal - discount):.3f} OMR",
        'vat_formula': f"VAT = Taxable Amount × {invoice.get('gst_percent', 5):.1f}% = {vat_total:.3f} OMR",
        'grand_total_formula': f"Grand Total = Taxable + VAT = {(subtotal - discount):.3f} + {vat_total:.3f} = {grand_total:.3f} OMR"
    }
