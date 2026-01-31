import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Badge } from './ui/badge';
import { AlertTriangle, Info, Lock, TrendingUp, TrendingDown } from 'lucide-react';

/**
 * Reusable confirmation dialog with impact summary for irreversible actions
 * 
 * @param {boolean} open - Dialog open state
 * @param {function} onOpenChange - Callback when dialog open state changes
 * @param {function} onConfirm - Callback when user confirms action
 * @param {string} title - Dialog title
 * @param {string} description - Main description text
 * @param {object} impact - Impact summary data from backend API
 * @param {string} actionLabel - Confirm button label (default: "Confirm")
 * @param {string} actionType - Type of action: "danger", "warning", "info" (default: "danger")
 * @param {boolean} loading - Loading state for confirm button
 */
export function ConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  impact,
  actionLabel = "Confirm",
  actionType = "danger",
  loading = false
}) {
  const actionColors = {
    danger: "bg-red-600 hover:bg-red-700",
    warning: "bg-yellow-600 hover:bg-yellow-700",
    info: "bg-blue-600 hover:bg-blue-700"
  };

  const iconColors = {
    danger: "text-red-600",
    warning: "text-yellow-600",
    info: "text-blue-600"
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            {actionType === "danger" && <AlertTriangle className={`h-6 w-6 ${iconColors[actionType]}`} />}
            {actionType === "warning" && <AlertTriangle className={`h-6 w-6 ${iconColors[actionType]}`} />}
            {actionType === "info" && <Info className={`h-6 w-6 ${iconColors[actionType]}`} />}
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base mt-3">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {impact && (
          <div className="space-y-4 my-4">
            {/* Impact Summary Section */}
            <div className="bg-slate-50 rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Impact Summary
              </h4>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                {/* Display impact details based on data structure */}
                {impact.current_status && (
                  <div>
                    <span className="text-slate-600">Current Status:</span>
                    <Badge variant="outline" className="ml-2">{impact.current_status}</Badge>
                  </div>
                )}
                
                {impact.status && (
                  <div>
                    <span className="text-slate-600">Status:</span>
                    <Badge variant="outline" className="ml-2">{impact.status}</Badge>
                  </div>
                )}
                
                {impact.status_change && (
                  <div className="col-span-2">
                    <span className="text-slate-600">Status Change:</span>
                    <span className="font-medium ml-2 text-blue-600">{impact.status_change}</span>
                  </div>
                )}
                
                {impact.invoice_number && (
                  <div className="col-span-2">
                    <span className="text-slate-600">Invoice:</span>
                    <span className="font-medium ml-2">{impact.invoice_number}</span>
                  </div>
                )}
                
                {impact.item_count !== undefined && (
                  <div>
                    <span className="text-slate-600">Items:</span>
                    <span className="font-medium ml-2">{impact.item_count}</span>
                  </div>
                )}
                
                {impact.total_items !== undefined && (
                  <div>
                    <span className="text-slate-600">Total Items:</span>
                    <span className="font-medium ml-2">{impact.total_items}</span>
                  </div>
                )}
                
                {impact.total_weight !== undefined && (
                  <div>
                    <span className="text-slate-600">Total Weight:</span>
                    <span className="font-medium ml-2">{impact.total_weight?.toFixed(3)}g</span>
                  </div>
                )}
                
                {impact.weight !== undefined && (
                  <div>
                    <span className="text-slate-600">Weight:</span>
                    <span className="font-medium ml-2">{impact.weight?.toFixed(3)}g</span>
                  </div>
                )}
                
                {impact.total_weight_grams !== undefined && (
                  <div>
                    <span className="text-slate-600">Total Weight:</span>
                    <span className="font-medium ml-2">{impact.total_weight_grams}g</span>
                  </div>
                )}
                
                {impact.total_making_charges !== undefined && (
                  <div>
                    <span className="text-slate-600">Making Charges:</span>
                    <span className="font-medium ml-2">{impact.total_making_charges?.toFixed(2)} OMR</span>
                  </div>
                )}
                
                {impact.grand_total !== undefined && (
                  <div>
                    <span className="text-slate-600">Grand Total:</span>
                    <span className="font-medium ml-2">{impact.grand_total?.toFixed(2)} OMR</span>
                  </div>
                )}
                
                {impact.amount_total !== undefined && (
                  <div>
                    <span className="text-slate-600">Amount:</span>
                    <span className="font-medium ml-2">{impact.amount_total?.toFixed(2)} OMR</span>
                  </div>
                )}
                
                {impact.amount !== undefined && (
                  <div>
                    <span className="text-slate-600">Amount:</span>
                    <span className="font-medium ml-2">{impact.amount?.toFixed(2)} OMR</span>
                  </div>
                )}
                
                {impact.paid_amount !== undefined && impact.paid_amount > 0 && (
                  <div>
                    <span className="text-slate-600">Paid Amount:</span>
                    <span className="font-medium ml-2 text-green-600">{impact.paid_amount?.toFixed(2)} OMR</span>
                  </div>
                )}
                
                {impact.paid_amount_money !== undefined && impact.paid_amount_money > 0 && (
                  <div>
                    <span className="text-slate-600">Paid:</span>
                    <span className="font-medium ml-2 text-green-600">{impact.paid_amount_money?.toFixed(2)} OMR</span>
                  </div>
                )}
                
                {impact.balance_due !== undefined && impact.balance_due > 0 && (
                  <div>
                    <span className="text-slate-600">Balance Due:</span>
                    <span className="font-medium ml-2 text-red-600">{impact.balance_due?.toFixed(2)} OMR</span>
                  </div>
                )}
                
                {impact.balance_due_money !== undefined && impact.balance_due_money > 0 && (
                  <div>
                    <span className="text-slate-600">Balance:</span>
                    <span className="font-medium ml-2 text-red-600">{impact.balance_due_money?.toFixed(2)} OMR</span>
                  </div>
                )}
                
                {impact.payment_count !== undefined && (
                  <div>
                    <span className="text-slate-600">Payments:</span>
                    <span className="font-medium ml-2">{impact.payment_count}</span>
                  </div>
                )}
                
                {impact.transaction_type && (
                  <div>
                    <span className="text-slate-600">Type:</span>
                    <span className="font-medium ml-2">{impact.transaction_type}</span>
                  </div>
                )}
                
                {impact.category && (
                  <div>
                    <span className="text-slate-600">Category:</span>
                    <span className="font-medium ml-2">{impact.category}</span>
                  </div>
                )}
                
                {impact.transaction_number && (
                  <div className="col-span-2">
                    <span className="text-slate-600">Transaction:</span>
                    <span className="font-medium ml-2">{impact.transaction_number}</span>
                  </div>
                )}
                
                {impact.stock_will_increase_by !== undefined && (
                  <div>
                    <span className="text-slate-600">Stock Increase:</span>
                    <span className="font-medium ml-2 text-green-600">+{impact.stock_will_increase_by}g</span>
                  </div>
                )}
                
                {impact.vendor_payable_will_be !== undefined && impact.vendor_payable_will_be > 0 && (
                  <div>
                    <span className="text-slate-600">Vendor Payable:</span>
                    <span className="font-medium ml-2 text-red-600">{impact.vendor_payable_will_be?.toFixed(2)} OMR</span>
                  </div>
                )}
                
                {impact.will_add_stock && (
                  <div className="col-span-2 text-green-700">
                    <span className="font-medium">✓ Will add stock at 916 purity (22K)</span>
                  </div>
                )}
                
                {impact.will_deduct_stock && (
                  <div className="col-span-2 text-amber-700">
                    <span className="font-medium">⚠ Will deduct stock from inventory</span>
                  </div>
                )}
                
                {impact.will_create_payable && (
                  <div className="col-span-2 text-amber-700">
                    <span className="font-medium">⚠ Will create vendor payable</span>
                  </div>
                )}
                
                {impact.will_affect_account && (
                  <div className="col-span-2 text-amber-700">
                    <span className="font-medium">⚠ Will adjust account balance</span>
                  </div>
                )}
                
                {impact.customer_name && (
                  <div className="col-span-2">
                    <span className="text-slate-600">Customer:</span>
                    <span className="font-medium ml-2">{impact.customer_name}</span>
                  </div>
                )}
                
                {impact.vendor_name && (
                  <div className="col-span-2">
                    <span className="text-slate-600">Vendor:</span>
                    <span className="font-medium ml-2">{impact.vendor_name}</span>
                  </div>
                )}
                
                {impact.party_name && (
                  <div className="col-span-2">
                    <span className="text-slate-600">Party:</span>
                    <span className="font-medium ml-2">{impact.party_name}</span>
                  </div>
                )}
                
                {impact.party_type && (
                  <div>
                    <span className="text-slate-600">Party Type:</span>
                    <span className="font-medium ml-2">{impact.party_type}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Blocking Reasons - Cannot Proceed */}
            {impact.can_proceed === false && impact.blocking_reasons && Array.isArray(impact.blocking_reasons) && impact.blocking_reasons.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="text-sm space-y-2 text-red-800">
                  <p className="font-semibold">
                    ⛔ Cannot proceed due to:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    {impact.blocking_reasons.map((reason, idx) => (
                      <li key={idx}>{reason}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            
            {/* Single Blocking Reason */}
            {impact.can_proceed === false && impact.blocking_reason && !Array.isArray(impact.blocking_reasons) && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="text-sm text-red-800">
                  <p className="font-semibold">⛔ {impact.blocking_reason}</p>
                </div>
              </div>
            )}
            
            {/* Party Deletion Linked Records */}
            {impact.total_linked_records !== undefined && impact.total_linked_records > 0 && impact.linked_records && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="text-sm space-y-2 text-red-800">
                  <p className="font-semibold">
                    ⛔ This party has {impact.total_linked_records} linked records:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    {impact.linked_records.jobcards > 0 && <li>{impact.linked_records.jobcards} Job Card(s)</li>}
                    {impact.linked_records.invoices > 0 && <li>{impact.linked_records.invoices} Invoice(s)</li>}
                    {impact.linked_records.purchases > 0 && <li>{impact.linked_records.purchases} Purchase(s)</li>}
                    {impact.linked_records.transactions > 0 && <li>{impact.linked_records.transactions} Transaction(s)</li>}
                    {impact.linked_records.gold_ledger > 0 && <li>{impact.linked_records.gold_ledger} Gold Ledger Entry/Entries</li>}
                  </ul>
                </div>
              </div>
            )}
            
            {/* Old Party Deletion Format (backward compatibility) */}
            {impact.linked_invoices > 0 || impact.linked_purchases > 0 || impact.linked_jobcards > 0 || impact.linked_gold_ledger > 0 || impact.linked_transactions > 0 ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="text-sm space-y-2 text-red-800">
                  <p className="font-semibold">
                    ⛔ This party has linked records:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    {impact.linked_invoices > 0 && <li>{impact.linked_invoices} Invoices</li>}
                    {impact.linked_purchases > 0 && <li>{impact.linked_purchases} Purchases</li>}
                    {impact.linked_jobcards > 0 && <li>{impact.linked_jobcards} Job Cards</li>}
                    {impact.linked_gold_ledger > 0 && <li>{impact.linked_gold_ledger} Gold Ledger Entries</li>}
                    {impact.linked_transactions > 0 && <li>{impact.linked_transactions} Transactions</li>}
                  </ul>
                  {impact.has_outstanding_balance && (
                    <p className="font-semibold mt-2 text-red-900">
                      Outstanding Balances: {impact.money_outstanding > 0 && `${impact.money_outstanding} OMR`}
                      {impact.money_outstanding > 0 && impact.gold_balance_grams !== 0 && ', '}
                      {impact.gold_balance_grams !== 0 && `${Math.abs(impact.gold_balance_grams)}g gold`}
                    </p>
                  )}
                </div>
              </div>
            ) : null}

            {/* Linked Records Warning */}
            {(impact.has_linked_invoice || impact.has_linked_jobcard || impact.will_lock_jobcard || impact.linked_invoice) && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Lock className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm space-y-1">
                    {impact.will_lock_jobcard && (
                      <p className="text-yellow-800">
                        <strong>Warning:</strong> This will lock the linked job card and prevent further edits.
                      </p>
                    )}
                    {impact.has_linked_invoice && impact.linked_invoice && (
                      <p className="text-yellow-800">
                        This job card is linked to invoice {impact.linked_invoice.invoice_number}
                      </p>
                    )}
                    {impact.linked_invoice && !impact.has_linked_invoice && (
                      <p className="text-yellow-800">
                        Linked to invoice: {impact.linked_invoice}
                      </p>
                    )}
                    {impact.has_linked_jobcard && impact.linked_jobcard && (
                      <p className="text-yellow-800">
                        This invoice is linked to job card {impact.linked_jobcard.job_card_number}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Irreversible Action Warning */}
            {impact.warning && (
              <div className={`border rounded-lg p-3 ${impact.can_proceed === false ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                <p className={`text-sm font-semibold ${impact.can_proceed === false ? 'text-red-800' : 'text-amber-800'}`}>
                  {impact.can_proceed === false ? '⛔' : '⚠️'} {impact.warning}
                </p>
              </div>
            )}
            
            {/* Fallback irreversible warning */}
            {!impact.warning && impact.can_proceed !== false && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800 font-semibold">
                  ⚠️ This action cannot be undone. All changes will be permanent.
                </p>
              </div>
            )}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          {(!impact || impact.can_proceed !== false) && (
            <AlertDialogAction
              onClick={onConfirm}
              disabled={loading}
              className={actionColors[actionType]}
            >
              {loading ? "Processing..." : actionLabel}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
