import React, { useState, useEffect } from 'react';
import { formatWeight, formatCurrency, safeToFixed } from '../utils/numberFormat';
import { formatDateTime, formatDate } from '../utils/dateTimeUtils';
import { useSearchParams } from 'react-router-dom';
import { API } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { FileText, Printer, CheckCircle, Lock, DollarSign, AlertTriangle, Eye, Trash2 } from 'lucide-react';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { downloadProfessionalInvoicePDF } from '../utils/professionalInvoicePDF';
import Pagination from '../components/Pagination';

export default function InvoicesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [finalizing, setFinalizing] = useState(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_mode: 'Cash',
    account_id: '',
    notes: '',
    // Gold exchange specific fields
    gold_weight_grams: '',
    rate_per_gram: '',
    purity_entered: '916'
  });

  // Confirmation dialog states
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmInvoice, setConfirmInvoice] = useState(null);
  const [impactData, setImpactData] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Get current page from URL, default to 1
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  useEffect(() => {
    loadInvoices();
    loadAccounts();
  }, [currentPage]);

  const loadInvoices = async () => {
    try {
      const response = await API.get(`/api/invoices`, {
        params: { page: currentPage, page_size: 10 }
      });
      setInvoices(response.data.items || []);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error('Failed to load invoices');
    }
  };

  const handlePageChange = (newPage) => {
    setSearchParams({ page: newPage.toString() });
  };

  const loadAccounts = async () => {
    try {
      const response = await API.get(`/api/accounts`);
      setAccounts(response.data);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const handlePrintInvoice = async (invoice) => {
    try {
      toast.info('Generating professional invoice PDF...');
      // Construct API URL (BACKEND_URL + /api)
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://127.0.0.1:5000';
      const API_URL = `${BACKEND_URL}/api`;
      const result = await downloadProfessionalInvoicePDF(invoice.id, API_URL, API);
      if (result.success) {
        toast.success('Professional invoice PDF generated successfully!');
      } else {
        toast.error(result.error || 'Failed to generate invoice PDF');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate invoice PDF');
    }
  };

  const handleFinalizeInvoice = async (invoice) => {
    setConfirmInvoice(invoice);
    setConfirmLoading(true);
    try {
      const response = await API.get(`/api/invoices/${invoice.id}/finalize-impact`);
      setImpactData(response.data);
      setShowFinalizeConfirm(true);
    } catch (error) {
      console.error('Error fetching finalize impact:', error);
      toast.error('Failed to load confirmation data');
    } finally {
      setConfirmLoading(false);
    }
  };

  const confirmFinalizeInvoice = async () => {
    if (!confirmInvoice) return;
    
    setConfirmLoading(true);
    setFinalizing(confirmInvoice.id);
    try {
      await API.post(`/api/invoices/${confirmInvoice.id}/finalize`);
      toast.success('Invoice finalized successfully! Stock has been deducted.');
      setShowFinalizeConfirm(false);
      setConfirmInvoice(null);
      setImpactData(null);
      loadInvoices();
    } catch (error) {
      console.error('Error finalizing invoice:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to finalize invoice';
      toast.error(errorMsg);
    } finally {
      setFinalizing(null);
      setConfirmLoading(false);
    }
  };

  const handleDeleteInvoice = async (invoice) => {
    setConfirmInvoice(invoice);
    setConfirmLoading(true);
    try {
      const response = await API.get(`/api/invoices/${invoice.id}/delete-impact`);
      setImpactData(response.data);
      setShowDeleteConfirm(true);
    } catch (error) {
      console.error('Error fetching delete impact:', error);
      toast.error('Failed to load confirmation data');
    } finally {
      setConfirmLoading(false);
    }
  };

  const confirmDeleteInvoice = async () => {
    if (!confirmInvoice) return;
    
    setConfirmLoading(true);
    try {
      await API.delete(`/api/invoices/${confirmInvoice.id}`);
      toast.success('Invoice deleted successfully!');
      setShowDeleteConfirm(false);
      setConfirmInvoice(null);
      setImpactData(null);
      loadInvoices();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to delete invoice';
      toast.error(errorMsg);
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleViewInvoice = (invoice) => {
    setViewInvoice(invoice);
    setShowViewDialog(true);
  };

  const handleOpenPaymentDialog = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentData({
      amount: safeToFixed(invoice.balance_due, 3),  // Default to full balance
      payment_mode: 'Cash',
      account_id: accounts.length > 0 ? accounts[0].id : '',
      notes: '',
      // Gold exchange specific fields
      gold_weight_grams: '',
      rate_per_gram: '',
      purity_entered: '916'
    });
    setShowPaymentDialog(true);
  };

  const handleAddPayment = async () => {
    // GOLD_EXCHANGE mode validation
    if (paymentData.payment_mode === 'GOLD_EXCHANGE') {
      // Check if customer is saved (not walk-in)
      if (selectedInvoice.customer_type === 'walk_in') {
        toast.error('Gold Exchange payment is only available for saved customers, not walk-in customers');
        return;
      }

      if (!paymentData.gold_weight_grams || parseFloat(paymentData.gold_weight_grams) <= 0) {
        toast.error('Please enter a valid gold weight');
        return;
      }

      if (!paymentData.rate_per_gram || parseFloat(paymentData.rate_per_gram) <= 0) {
        toast.error('Please enter a valid rate per gram');
        return;
      }

      try {
        const response = await API.post(
          `/api/invoices/${selectedInvoice.id}/add-payment`,
          {
            payment_mode: 'GOLD_EXCHANGE',
            gold_weight_grams: parseFloat(paymentData.gold_weight_grams),
            rate_per_gram: parseFloat(paymentData.rate_per_gram),
            purity_entered: parseInt(paymentData.purity_entered) || 916,
            notes: paymentData.notes
          }
        );

        toast.success(`Gold exchange payment added! Transaction #${response.data.transaction_number}`);
        toast.info(`Gold used: ${response.data.gold_weight_grams}g | Value: ${response.data.gold_money_value} OMR`);
        
        setShowPaymentDialog(false);
        loadInvoices();
      } catch (error) {
        console.error('Error adding gold exchange payment:', error);
        const errorMsg = error.response?.data?.detail || 'Failed to add gold exchange payment';
        toast.error(errorMsg);
      }
      return;
    }

    // Standard payment mode validation
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    if (!paymentData.account_id) {
      toast.error('Please select an account');
      return;
    }

    try {
      const response = await API.post(
        `/api/invoices/${selectedInvoice.id}/add-payment`,
        {
          amount: parseFloat(paymentData.amount),
          payment_mode: paymentData.payment_mode,
          account_id: paymentData.account_id,
          notes: paymentData.notes
        }
      );

      // Show warning for walk-in partial payments
      if (response.data.is_walk_in_partial_payment) {
        toast.warning('⚠️ Walk-in customer with outstanding balance. Full payment is recommended.');
      } else {
        toast.success(`Payment added successfully! Transaction #${response.data.transaction_number}`);
      }

      setShowPaymentDialog(false);
      loadInvoices(); // Reload to show updated payment status
    } catch (error) {
      console.error('Error adding payment:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to add payment';
      toast.error(errorMsg);
    }
  };


  const getPaymentStatusBadge = (status) => {
    const variants = {
      unpaid: 'bg-red-100 text-red-800',
      partial: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800'
    };
    return <Badge className={variants[status] || 'bg-gray-100 text-gray-800'}>{status}</Badge>;
  };

  const getInvoiceStatusBadge = (status) => {
    if (status === 'finalized') {
      return <Badge className="bg-emerald-100 text-emerald-800"><Lock className="w-3 h-3 mr-1 inline" />Finalized</Badge>;
    }
    return <Badge className="bg-blue-100 text-blue-800">Draft</Badge>;
  };

  return (
    <div data-testid="invoices-page">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-serif font-semibold text-gray-900 mb-2">Invoices</h1>
          <p className="text-muted-foreground">Manage sales and service invoices</p>
        </div>
      </div>

      {/* Info Card about Draft/Finalized workflow */}
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-1">Invoice Workflow</h3>
              <p className="text-sm text-blue-800">
                <strong>Draft Invoices:</strong> Can be edited or deleted. Stock is NOT deducted yet.
                <br />
                <strong>Finalized Invoices:</strong> Stock is deducted, invoice is locked, job card is locked, and customer ledger entry is created. This action cannot be undone.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-serif">All Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="invoices-table">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Invoice #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Grand Total</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Balance Due</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Invoice Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Payment Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-4 py-12 text-center text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-lg font-medium">No invoices found</p>
                      <p className="text-sm mt-1">Start by creating your first invoice</p>
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                  <tr key={inv.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono font-semibold">{inv.invoice_number}</td>
                    <td className="px-4 py-3 text-sm">{formatDate(inv.date)}</td>
                    <td className="px-4 py-3">
                      {inv.customer_type === 'walk_in' ? (
                        <div>
                          <div>{inv.walk_in_name || 'Walk-in Customer'}</div>
                          <Badge variant="outline" className="mt-1 text-xs bg-amber-50 text-amber-700">
                            Walk-in
                          </Badge>
                        </div>
                      ) : (
                        inv.customer_name || '-'
                      )}
                    </td>
                    <td className="px-4 py-3 capitalize text-sm">{inv.invoice_type}</td>
                    <td className="px-4 py-3 text-right font-mono">{safeToFixed(inv.grand_total, 3)}</td>
                    <td className="px-4 py-3 text-right font-mono">{safeToFixed(inv.balance_due, 3)}</td>
                    <td className="px-4 py-3">{getInvoiceStatusBadge(inv.status || 'draft')}</td>
                    <td className="px-4 py-3">{getPaymentStatusBadge(inv.payment_status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button
                          data-testid={`view-${inv.invoice_number}`}
                          size="sm"
                          variant="outline"
                          className="text-indigo-600 hover:text-indigo-700"
                          onClick={() => handleViewInvoice(inv)}
                        >
                          <Eye className="w-4 h-4 mr-1" /> View
                        </Button>
                        {(inv.status === 'draft' || !inv.status) && (
                          <>
                            <Button
                              data-testid={`finalize-${inv.invoice_number}`}
                              size="sm"
                              variant="default"
                              className="bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => handleFinalizeInvoice(inv)}
                              disabled={finalizing === inv.id}
                            >
                              {finalizing === inv.id ? (
                                <>Processing...</>
                              ) : (
                                <><CheckCircle className="w-4 h-4 mr-1" /> Finalize</>
                              )}
                            </Button>
                            <Button
                              data-testid={`delete-${inv.invoice_number}`}
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteInvoice(inv)}
                            >
                              <Trash2 className="w-4 h-4 mr-1" /> Delete
                            </Button>
                          </>
                        )}
                        {inv.status === 'finalized' && (
                          <Badge className="bg-gray-100 text-gray-700">
                            <Lock className="w-3 h-3 mr-1" /> Locked
                          </Badge>
                        )}
                        {inv.balance_due > 0 && inv.status === 'finalized' && (
                          <Button
                            data-testid={`payment-${inv.invoice_number}`}
                            size="sm"
                            variant="outline"
                            className="text-blue-600 hover:text-blue-700"
                            onClick={() => handleOpenPaymentDialog(inv)}
                          >
                            <DollarSign className="w-4 h-4 mr-1" /> Add Payment
                          </Button>
                        )}
                        {inv.balance_due > 0 && inv.status === 'draft' && (
                          <Button
                            data-testid={`payment-disabled-${inv.invoice_number}`}
                            size="sm"
                            variant="outline"
                            className="text-gray-400 cursor-not-allowed"
                            disabled
                            title="Finalize invoice before accepting payment"
                          >
                            <DollarSign className="w-4 h-4 mr-1" /> Add Payment
                          </Button>
                        )}
                        <Button
                          data-testid={`print-${inv.invoice_number}`}
                          size="sm"
                          variant="outline"
                          onClick={() => handlePrintInvoice(inv)}
                        >
                          <Printer className="w-4 h-4 mr-1" /> Print
                        </Button>
                      </div>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {pagination && (
            <Pagination
              pagination={pagination}
              onPageChange={handlePageChange}
            />
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Payment - {selectedInvoice?.invoice_number}</DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-6">
              {/* Invoice Summary */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Grand Total:</span>
                  <span className="font-mono font-semibold">{safeToFixed(selectedInvoice.grand_total, 3)} OMR</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Paid Amount:</span>
                  <span className="font-mono">{safeToFixed(selectedInvoice.paid_amount, 3)} OMR</span>
                </div>
                <div className="flex justify-between text-base font-semibold border-t pt-2">
                  <span>Balance Due:</span>
                  <span className="font-mono text-red-600">{safeToFixed(selectedInvoice.balance_due, 3)} OMR</span>
                </div>
              </div>

              {/* Walk-in Warning */}
              {selectedInvoice.customer_type === 'walk_in' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800">
                    <p className="font-semibold">Walk-in Customer</p>
                    <p>Full payment is recommended. Outstanding balance tracking is limited for walk-in customers.</p>
                  </div>
                </div>
              )}

              {/* Payment Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Payment Mode *</Label>
                  <Select 
                    value={paymentData.payment_mode} 
                    onValueChange={(value) => setPaymentData({...paymentData, payment_mode: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Card">Card</SelectItem>
                      <SelectItem value="UPI/Online">UPI/Online</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                      <SelectItem value="GOLD_EXCHANGE">Gold Exchange</SelectItem>
                    </SelectContent>
                  </Select>
                  {paymentData.payment_mode === 'GOLD_EXCHANGE' && (
                    <p className="text-xs text-amber-600 mt-1">
                      💰 Use customer's gold balance to pay invoice (saved customers only)
                    </p>
                  )}
                </div>

                {/* Conditional Fields for GOLD_EXCHANGE */}
                {paymentData.payment_mode === 'GOLD_EXCHANGE' ? (
                  <>
                    {/* Gold Exchange Fields */}
                    <div className="space-y-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <h4 className="font-semibold text-sm text-amber-900">Gold Exchange Details</h4>
                      
                      <div className="space-y-2">
                        <Label>Gold Weight (grams) *</Label>
                        <Input
                          type="number"
                          step="0.001"
                          min="0"
                          value={paymentData.gold_weight_grams}
                          onChange={(e) => {
                            const weight = e.target.value;
                            const rate = paymentData.rate_per_gram;
                            setPaymentData({
                              ...paymentData, 
                              gold_weight_grams: weight,
                              // Auto-calculate amount if rate is available
                              amount: (weight && rate) ? (parseFloat(weight) * parseFloat(rate)).toFixed(3) : ''
                            });
                          }}
                          placeholder="e.g., 25.500"
                        />
                        <p className="text-xs text-gray-600">Amount of gold customer will use for payment</p>
                      </div>

                      <div className="space-y-2">
                        <Label>Rate per Gram (OMR) *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={paymentData.rate_per_gram}
                          onChange={(e) => {
                            const rate = e.target.value;
                            const weight = paymentData.gold_weight_grams;
                            setPaymentData({
                              ...paymentData, 
                              rate_per_gram: rate,
                              // Auto-calculate amount if weight is available
                              amount: (weight && rate) ? (parseFloat(weight) * parseFloat(rate)).toFixed(3) : ''
                            });
                          }}
                          placeholder="e.g., 20.00"
                        />
                        <p className="text-xs text-gray-600">Gold conversion rate to money</p>
                      </div>

                      <div className="space-y-2">
                        <Label>Purity</Label>
                        <Input
                          type="number"
                          value={paymentData.purity_entered}
                          onChange={(e) => setPaymentData({...paymentData, purity_entered: e.target.value})}
                          placeholder="916"
                        />
                        <p className="text-xs text-gray-600">Default: 916 (22K gold standard)</p>
                      </div>

                      {paymentData.gold_weight_grams && paymentData.rate_per_gram && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded">
                          <p className="text-sm font-semibold text-green-900">
                            Calculated Payment Value: {(parseFloat(paymentData.gold_weight_grams) * parseFloat(paymentData.rate_per_gram)).toFixed(3)} OMR
                          </p>
                          <p className="text-xs text-green-700 mt-1">
                            {paymentData.gold_weight_grams}g × {paymentData.rate_per_gram} OMR/g
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Notes (Optional)</Label>
                      <Input
                        value={paymentData.notes}
                        onChange={(e) => setPaymentData({...paymentData, notes: e.target.value})}
                        placeholder="Payment notes or reference"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {/* Standard Payment Fields */}
                    <div className="space-y-2">
                      <Label>Payment Amount (OMR) *</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={paymentData.amount}
                        onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
                        placeholder="Enter payment amount"
                      />
                      <button
                        type="button"
                        onClick={() => setPaymentData({...paymentData, amount: safeToFixed(selectedInvoice.balance_due, 3)})}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        Set to full balance ({safeToFixed(selectedInvoice.balance_due, 3)} OMR)
                      </button>
                    </div>

                    <div className="space-y-2">
                      <Label>Account (Where money goes) *</Label>
                      <Select 
                        value={paymentData.account_id} 
                        onValueChange={(value) => setPaymentData({...paymentData, account_id: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map(account => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.name} ({account.account_type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Notes (Optional)</Label>
                      <Input
                        value={paymentData.notes}
                        onChange={(e) => setPaymentData({...paymentData, notes: e.target.value})}
                        placeholder="Payment notes or reference"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowPaymentDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddPayment}
                  className="flex-1"
                >
                  Add Payment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif">Invoice Details</DialogTitle>
          </DialogHeader>

          {viewInvoice && (
            <div className="space-y-6">
              {/* Invoice Header */}
              <div className="grid grid-cols-2 gap-6 p-4 bg-muted/50 rounded-lg">
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Invoice Number</p>
                    <p className="font-mono font-semibold text-lg">{viewInvoice.invoice_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Invoice Type</p>
                    <p className="capitalize font-medium">{viewInvoice.invoice_type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="font-medium">{formatDate(viewInvoice.date)}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Customer</p>
                    {viewInvoice.customer_type === 'walk_in' ? (
                      <div>
                        <p className="font-medium">{viewInvoice.walk_in_name || 'Walk-in Customer'}</p>
                        <Badge variant="outline" className="mt-1 text-xs bg-amber-50 text-amber-700">
                          Walk-in
                        </Badge>
                      </div>
                    ) : (
                      <p className="font-medium">{viewInvoice.customer_name || '-'}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Invoice Status</p>
                    <div className="mt-1">{getInvoiceStatusBadge(viewInvoice.status || 'draft')}</div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Payment Status</p>
                    <div className="mt-1">{getPaymentStatusBadge(viewInvoice.payment_status)}</div>
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">Timestamps</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-blue-700">Created At:</p>
                    <p className="font-mono text-blue-900">
                      {formatDateTime(viewInvoice.created_at)}
                    </p>
                  </div>
                  {viewInvoice.finalized_at && (
                    <div>
                      <p className="text-blue-700">Finalized At:</p>
                      <p className="font-mono text-blue-900">
                        {formatDateTime(viewInvoice.finalized_at)}
                      </p>
                    </div>
                  )}
                  {viewInvoice.finalized_by && (
                    <div>
                      <p className="text-blue-700">Finalized By:</p>
                      <p className="font-mono text-blue-900">{viewInvoice.finalized_by}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Items</h3>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">Description</th>
                        <th className="px-3 py-2 text-right font-semibold">Qty</th>
                        <th className="px-3 py-2 text-right font-semibold">Purity</th>
                        <th className="px-3 py-2 text-right font-semibold">Weight (g)</th>
                        <th className="px-3 py-2 text-right font-semibold">Rate</th>
                        <th className="px-3 py-2 text-right font-semibold">Gold Value</th>
                        <th className="px-3 py-2 text-right font-semibold">Making</th>
                        <th className="px-3 py-2 text-right font-semibold">VAT</th>
                        <th className="px-3 py-2 text-right font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(viewInvoice.items || []).map((item, idx) => (
                        <tr key={idx} className="border-t hover:bg-muted/20">
                          <td className="px-3 py-2">{item.description || '-'}</td>
                          <td className="px-3 py-2 text-right font-mono">{item.qty || 0}</td>
                          <td className="px-3 py-2 text-right font-mono">{item.purity || 916}K</td>
                          <td className="px-3 py-2 text-right font-mono">{(item.weight || 0).toFixed(3)}</td>
                          <td className="px-3 py-2 text-right font-mono">{(item.metal_rate || 0).toFixed(3)}</td>
                          <td className="px-3 py-2 text-right font-mono">{(item.gold_value || 0).toFixed(3)}</td>
                          <td className="px-3 py-2 text-right font-mono">{(item.making_value || 0).toFixed(3)}</td>
                          <td className="px-3 py-2 text-right font-mono">{(item.vat_amount || 0).toFixed(3)}</td>
                          <td className="px-3 py-2 text-right font-mono font-semibold">{(item.line_total || 0).toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ENHANCED Cost Components Breakdown - Option A Improvements */}
              <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-300 shadow-lg mb-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Cost Components Breakdown
                  </h3>
                  <Badge className="bg-blue-100 text-blue-800 px-3 py-1">Audit View</Badge>
                </div>

                {/* Primary Components - More Prominent Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                  {/* Metal Value */}
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 border-2 border-amber-300 shadow-md">
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Metal Value</div>
                      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="font-mono font-bold text-2xl text-amber-900 mb-1">
                      {(viewInvoice.items || []).reduce((sum, item) => sum + (item.gold_value || 0), 0).toFixed(2)} OMR
                    </div>
                    <div className="text-xs text-amber-700 font-medium">Weight × Gold Rate</div>
                    <div className="mt-2 pt-2 border-t border-amber-200">
                      <div className="text-xs text-amber-600">
                        Total: {(viewInvoice.items || []).reduce((sum, item) => sum + (item.weight || 0), 0).toFixed(3)}g
                      </div>
                    </div>
                  </div>
                  
                  {/* Making Charges */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg p-4 border-2 border-green-300 shadow-md">
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-xs font-semibold text-green-700 uppercase tracking-wide">Making Charges</div>
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                    </div>
                    <div className="font-mono font-bold text-2xl text-green-900 mb-1">
                      {(viewInvoice.items || []).reduce((sum, item) => sum + (item.making_value || 0), 0).toFixed(2)} OMR
                    </div>
                    <div className="text-xs text-green-700 font-medium">Labor & Craftsmanship</div>
                    <div className="mt-2 pt-2 border-t border-green-200">
                      <div className="text-xs text-green-600">
                        {viewInvoice.items?.length || 0} item(s)
                      </div>
                    </div>
                  </div>
                  
                  {/* VAT */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg p-4 border-2 border-blue-300 shadow-md">
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide">VAT (Tax)</div>
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="font-mono font-bold text-2xl text-blue-900 mb-1">
                      {(viewInvoice.vat_total || 0).toFixed(2)} OMR
                    </div>
                    <div className="text-xs text-blue-700 font-medium">Government Tax</div>
                    <div className="mt-2 pt-2 border-t border-blue-200">
                      <div className="text-xs text-blue-600">
                        @ {viewInvoice.items && viewInvoice.items.length > 0 ? `${viewInvoice.items[0].vat_percent || 5}%` : '5%'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* VAT Compliance Note */}
                    <div className="mt-2 pt-2 border-t border-blue-200">
                      <div className="text-xs text-blue-600/80 italic">
                        VAT is calculated on Metal Value + Making Charges (as per applicable tax regulations)
                      </div>
                    </div>

                {/* Discount Section (if applicable) */}
                {viewInvoice.discount_amount > 0 && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-red-800">Discount Applied:</span>
                      <span className="font-mono font-bold text-lg text-red-700">
                        - {(viewInvoice.discount_amount || 0).toFixed(2)} OMR
                      </span>
                    </div>
                  </div>
                )}

                {/* Grand Total - Most Prominent */}
                <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 rounded-xl p-5 shadow-xl border-2 border-indigo-400">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-indigo-100 text-sm font-medium uppercase tracking-wide mb-1">Invoice Total</div>
                      <div className="font-mono font-black text-4xl text-white">
                        {(viewInvoice.grand_total || 0).toFixed(2)} <span className="text-xl text-indigo-200">OMR</span>
                      </div>
                      <div className="text-xs text-indigo-200 mt-1">Includes all charges and taxes</div>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                      <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Calculation Summary for Audit */}
                <div className="mt-4 p-4 bg-white/60 rounded-lg border border-slate-200">
                  <div className="text-xs font-semibold text-slate-700 mb-2 uppercase">Calculation Verification:</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-600">Metal:</span>
                      <span className="ml-1 font-mono text-slate-800">
                        {(viewInvoice.items || []).reduce((sum, item) => sum + (item.gold_value || 0), 0).toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-600">Making:</span>
                      <span className="ml-1 font-mono text-slate-800">
                        {(viewInvoice.items || []).reduce((sum, item) => sum + (item.making_value || 0), 0).toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-600">VAT:</span>
                      <span className="ml-1 font-mono text-slate-800">
                        {(viewInvoice.vat_total || 0).toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-600">Total:</span>
                      <span className="ml-1 font-mono font-semibold text-slate-900">
                        {(viewInvoice.grand_total || 0).toFixed(2)} OMR
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* VAT Compliance Note */}
                  <div className="mt-3 pt-3 border-t border-slate-300">
                    <p className="text-xs text-slate-500 italic">
                      <svg className="w-3 h-3 inline mr-1 mb-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      VAT is calculated on Metal Value + Making Charges (as per applicable tax regulations)
                    </p>
                  </div>

              {/* Totals Section */}
              <div className="grid grid-cols-2 gap-6">
                {/* Left side - Payment Details */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Payment Details</h3>
                  <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Paid Amount:</span>
                      <span className="font-mono font-medium text-green-700">{(viewInvoice.paid_amount || 0).toFixed(3)} OMR</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Balance Due:</span>
                      <span className="font-mono font-semibold text-red-700">{(viewInvoice.balance_due || 0).toFixed(3)} OMR</span>
                    </div>
                    {viewInvoice.payment_mode && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Payment Mode:</span>
                        <span className="font-medium">{viewInvoice.payment_mode}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right side - Amount Totals */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Amount Breakdown</h3>
                  <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="font-mono">{(viewInvoice.subtotal || 0).toFixed(3)} OMR</span>
                    </div>
                    {viewInvoice.discount_amount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Discount:</span>
                        <span className="font-mono text-red-600">-{(viewInvoice.discount_amount || 0).toFixed(3)} OMR</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">VAT Total:</span>
                      <span className="font-mono">{(viewInvoice.vat_total || 0).toFixed(3)} OMR</span>
                    </div>
                    {viewInvoice.round_off_amount !== 0 && viewInvoice.round_off_amount !== null && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Round Off:</span>
                        <span className="font-mono">{(viewInvoice.round_off_amount || 0).toFixed(3)} OMR</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-bold border-t pt-2 mt-2">
                      <span>Grand Total:</span>
                      <span className="font-mono text-lg">{(viewInvoice.grand_total || 0).toFixed(3)} OMR</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowViewDialog(false)}
                  className="flex-1"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    handlePrintInvoice(viewInvoice);
                    setShowViewDialog(false);
                  }}
                  className="flex-1"
                >
                  <Printer className="w-4 h-4 mr-2" /> Print Invoice
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Finalize Confirmation Dialog */}
      <ConfirmationDialog
        open={showFinalizeConfirm}
        onOpenChange={setShowFinalizeConfirm}
        onConfirm={confirmFinalizeInvoice}
        title="Finalize Invoice"
        description={`Are you sure you want to finalize invoice ${confirmInvoice?.invoice_number}? This will lock the invoice and deduct stock from inventory. This action cannot be undone.`}
        impact={impactData}
        actionLabel="Finalize Invoice"
        actionType="warning"
        loading={confirmLoading}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={confirmDeleteInvoice}
        title="Delete Invoice"
        description={`Are you sure you want to delete invoice ${confirmInvoice?.invoice_number}? This action cannot be undone.`}
        impact={impactData}
        actionLabel="Delete Invoice"
        actionType="danger"
        loading={confirmLoading}
      />
    </div>
  );
}
