import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { formatCurrency } from '../utils/numberFormat';
import { 
  Plus, 
  Wallet as WalletIcon, 
  TrendingUp, 
  TrendingDown, 
  Trash2, 
  AlertTriangle,
  Filter,
  X,
  Banknote,
  Building2,
  ArrowUpDown,
  FileText,
  ShoppingCart,
  Briefcase,
  PenTool
} from 'lucide-react';
import Pagination from '../components/Pagination';
import { useURLPagination } from '../hooks/useURLPagination';

export default function FinancePageEnhanced() {
  const { currentPage, setPage, pagination, setPagination } = useURLPagination();
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  
  // Filter states
  const [filters, setFilters] = useState({
    account_id: '',
    account_type: '',
    transaction_type: '',
    reference_type: '',
    start_date: '',
    end_date: ''
  });
  
  const [accountForm, setAccountForm] = useState({
    name: '',
    account_type: 'cash',
    opening_balance: 0
  });
  
  const [transactionForm, setTransactionForm] = useState({
    transaction_type: 'credit',
    mode: 'cash',
    account_id: '',
    amount: 0,
    category: 'sales',
    notes: ''
  });

  const loadData = useCallback(async () => {
    try {
      // Build query params for filters
      const params = { page: currentPage, page_size: 10 };
      if (filters.account_id) params.account_id = filters.account_id;
      if (filters.account_type) params.account_type = filters.account_type;
      if (filters.transaction_type) params.transaction_type = filters.transaction_type;
      if (filters.reference_type) params.reference_type = filters.reference_type;
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      
      const [accountsRes, transactionsRes, summaryRes] = await Promise.all([
        axios.get(`${API}/accounts`),
        axios.get(`${API}/transactions`, { params }),
        axios.get(`${API}/transactions/summary`, { params })
      ]);
      
      setAccounts(Array.isArray(accountsRes.data) ? accountsRes.data : []);
      setTransactions(transactionsRes.data.items || []);
      setPagination(transactionsRes.data.pagination);
      setSummary(summaryRes.data || {
        total_credit: 0,
        total_debit: 0,
        net_flow: 0,
        transaction_count: 0,
        cash_summary: { credit: 0, debit: 0, net: 0 },
        bank_summary: { credit: 0, debit: 0, net: 0 },
        account_breakdown: []
      });
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load financial data');
      // Set safe defaults
      setAccounts([]);
      setTransactions([]);
      setSummary({
        total_credit: 0,
        total_debit: 0,
        net_flow: 0,
        transaction_count: 0,
        cash_summary: { credit: 0, debit: 0, net: 0 },
        bank_summary: { credit: 0, debit: 0, net: 0 },
        account_breakdown: []
      });
    }
  }, [filters, currentPage, setPagination]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateAccount = async () => {
    try {
      const data = {
        ...accountForm,
        opening_balance: parseFloat(accountForm.opening_balance),
        current_balance: parseFloat(accountForm.opening_balance)
      };
      await axios.post(`${API}/accounts`, data);
      toast.success('Account created successfully');
      setShowAccountDialog(false);
      setAccountForm({ name: '', account_type: 'cash', opening_balance: 0 });
      loadData();
    } catch (error) {
      toast.error('Failed to create account');
    }
  };

  const handleCreateTransaction = async () => {
    try {
      if (!transactionForm.account_id) {
        toast.error('Please select an account');
        return;
      }
      
      if (parseFloat(transactionForm.amount) <= 0) {
        toast.error('Amount must be greater than 0');
        return;
      }
      
      const data = {
        ...transactionForm,
        amount: parseFloat(transactionForm.amount)
      };
      await axios.post(`${API}/transactions`, data);
      toast.success('Transaction recorded successfully');
      setShowTransactionDialog(false);
      setTransactionForm({
        transaction_type: 'credit',
        mode: 'cash',
        account_id: '',
        amount: 0,
        category: 'sales',
        notes: ''
      });
      loadData();
    } catch (error) {
      toast.error('Failed to create transaction');
    }
  };

  const handleDeleteClick = (transaction) => {
    setTransactionToDelete(transaction);
    setShowDeleteConfirmation(true);
    setDeleteReason('');
  };

  const handleConfirmDelete = async () => {
    if (!deleteReason.trim()) {
      toast.error('Please provide a reason for deletion');
      return;
    }

    try {
      await axios.delete(`${API}/transactions/${transactionToDelete.id}`, {
        data: { reason: deleteReason }
      });
      toast.success('Transaction deleted successfully');
      setShowDeleteConfirmation(false);
      setTransactionToDelete(null);
      setDeleteReason('');
      loadData();
    } catch (error) {
      toast.error('Failed to delete transaction');
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirmation(false);
    setTransactionToDelete(null);
    setDeleteReason('');
  };

  const clearFilters = () => {
    setFilters({
      account_id: '',
      account_type: '',
      transaction_type: '',
      reference_type: '',
      start_date: '',
      end_date: ''
    });
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  const getTransactionSourceIcon = (source) => {
    switch(source) {
      case 'Invoice Payment': return <FileText className="w-4 h-4" />;
      case 'Purchase Payment': return <ShoppingCart className="w-4 h-4" />;
      case 'Job Card': return <Briefcase className="w-4 h-4" />;
      default: return <PenTool className="w-4 h-4" />;
    }
  };

  return (
    <div data-testid="finance-page">
      <div className="mb-8">
        <h1 className="text-4xl font-serif font-semibold text-gray-900 mb-2">Finance</h1>
        <p className="text-muted-foreground">Manage accounts, transactions, and money flow</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Total Summary */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-700">Net Flow</span>
                <ArrowUpDown className="w-5 h-5 text-blue-600" />
              </div>
              <div className={`text-3xl font-bold ${summary.net_flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summary.net_flow >= 0 ? '+' : ''}{formatCurrency(summary.net_flow)}
              </div>
              <div className="text-xs text-blue-600 mt-1">OMR</div>
              <div className="mt-3 pt-3 border-t border-blue-300">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-green-600 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> In
                  </span>
                  <span className="font-mono font-semibold">{summary.total_credit.toFixed(3)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-red-600 flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" /> Out
                  </span>
                  <span className="font-mono font-semibold">{summary.total_debit.toFixed(3)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cash Summary */}
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-700">Cash Flow</span>
                <Banknote className="w-5 h-5 text-green-600" />
              </div>
              <div className={`text-3xl font-bold ${summary.cash_summary.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summary.cash_summary.net >= 0 ? '+' : ''}{summary.cash_summary.net.toFixed(3)}
              </div>
              <div className="text-xs text-green-600 mt-1">OMR</div>
              <div className="mt-3 pt-3 border-t border-green-300">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-green-600">In</span>
                  <span className="font-mono font-semibold">{summary.cash_summary.credit.toFixed(3)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-red-600">Out</span>
                  <span className="font-mono font-semibold">{summary.cash_summary.debit.toFixed(3)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bank Summary */}
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-purple-700">Bank Flow</span>
                <Building2 className="w-5 h-5 text-purple-600" />
              </div>
              <div className={`text-3xl font-bold ${summary.bank_summary.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summary.bank_summary.net >= 0 ? '+' : ''}{summary.bank_summary.net.toFixed(3)}
              </div>
              <div className="text-xs text-purple-600 mt-1">OMR</div>
              <div className="mt-3 pt-3 border-t border-purple-300">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-green-600">In</span>
                  <span className="font-mono font-semibold">{summary.bank_summary.credit.toFixed(3)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-red-600">Out</span>
                  <span className="font-mono font-semibold">{summary.bank_summary.debit.toFixed(3)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-serif">Accounts</CardTitle>
            <Button data-testid="add-account-button" size="sm" onClick={() => setShowAccountDialog(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Account
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {accounts.map((acc) => (
                <div key={acc.id} className="p-4 border rounded-lg hover:border-accent transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{acc.name}</span>
                      {acc.account_type === 'cash' || acc.account_type === 'petty' ? (
                        <Banknote className="w-4 h-4 text-green-600" />
                      ) : (
                        <Building2 className="w-4 h-4 text-purple-600" />
                      )}
                    </div>
                  </div>
                  <div className="text-2xl font-mono font-semibold">
                    {acc.current_balance.toFixed(3)}
                    <span className="text-sm ml-1">OMR</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 capitalize flex items-center gap-1">
                    {acc.account_type === 'cash' || acc.account_type === 'petty' ? (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Cash</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">Bank</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle className="text-xl font-serif">Transactions</CardTitle>
              {hasActiveFilters && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                  Filtered
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? 'bg-accent' : ''}
              >
                <Filter className="w-4 h-4 mr-2" /> Filters
              </Button>
              <Button data-testid="add-transaction-button" size="sm" onClick={() => setShowTransactionDialog(true)}>
                <Plus className="w-4 h-4 mr-2" /> Add Transaction
              </Button>
            </div>
          </CardHeader>
          
          {/* Filter Panel */}
          {showFilters && (
            <div className="px-6 pb-4 border-b bg-muted/30">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs">Account</Label>
                  <Select value={filters.account_id} onValueChange={(val) => setFilters({...filters, account_id: val})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="All accounts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All accounts</SelectItem>
                      {accounts.map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-xs">Account Type</Label>
                  <Select value={filters.account_type} onValueChange={(val) => setFilters({...filters, account_type: val})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All types</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank">Bank</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-xs">Transaction Type</Label>
                  <Select value={filters.transaction_type} onValueChange={(val) => setFilters({...filters, transaction_type: val})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All types</SelectItem>
                      <SelectItem value="credit">Credit (Money IN)</SelectItem>
                      <SelectItem value="debit">Debit (Money OUT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-xs">Transaction Source</Label>
                  <Select value={filters.reference_type} onValueChange={(val) => setFilters({...filters, reference_type: val})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="All sources" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All sources</SelectItem>
                      <SelectItem value="invoice">Invoice Payment</SelectItem>
                      <SelectItem value="purchase">Purchase Payment</SelectItem>
                      <SelectItem value="manual">Manual Entry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-xs">Start Date</Label>
                  <Input
                    type="date"
                    className="mt-1"
                    value={filters.start_date}
                    onChange={(e) => setFilters({...filters, start_date: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label className="text-xs">End Date</Label>
                  <Input
                    type="date"
                    className="mt-1"
                    value={filters.end_date}
                    onChange={(e) => setFilters({...filters, end_date: e.target.value})}
                  />
                </div>
              </div>
              
              {hasActiveFilters && (
                <div className="mt-3 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="w-4 h-4 mr-2" /> Clear Filters
                  </Button>
                </div>
              )}
            </div>
          )}
          
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="transactions-table">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">TXN #</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Source</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Account</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Amount</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Balance Before</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Balance After</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn) => (
                    <tr key={txn.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-sm">{txn.transaction_number}</td>
                      <td className="px-4 py-3 text-sm">{new Date(txn.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {txn.transaction_type === 'credit' ? (
                            <>
                              <TrendingUp className="w-4 h-4 text-green-600" />
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                Credit
                              </span>
                            </>
                          ) : (
                            <>
                              <TrendingDown className="w-4 h-4 text-red-600" />
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                                Debit
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getTransactionSourceIcon(txn.transaction_source)}
                          <span className="text-xs">{txn.transaction_source}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{txn.account_name}</span>
                          {txn.account_type === 'cash' || txn.account_type === 'petty' ? (
                            <span className="text-xs text-green-600 flex items-center gap-1">
                              <Banknote className="w-3 h-3" /> Cash
                            </span>
                          ) : (
                            <span className="text-xs text-purple-600 flex items-center gap-1">
                              <Building2 className="w-3 h-3" /> Bank
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-right font-mono font-semibold ${
                        txn.transaction_type === 'credit' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {txn.transaction_type === 'credit' ? '+' : '-'}{txn.amount.toFixed(3)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-muted-foreground">
                        {txn.balance_before ? txn.balance_before.toFixed(3) : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm font-semibold">
                        {txn.balance_after ? txn.balance_after.toFixed(3) : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(txn)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {transactions.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No transactions found
                </div>
              )}
            </div>
          </CardContent>
          {pagination && <Pagination pagination={pagination} onPageChange={setPage} />}
        </Card>
      </div>

      {/* Add Account Dialog */}
      <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Account Name</Label>
              <Input
                data-testid="account-name-input"
                value={accountForm.name}
                onChange={(e) => setAccountForm({...accountForm, name: e.target.value})}
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={accountForm.account_type} onValueChange={(val) => setAccountForm({...accountForm, account_type: val})}>
                <SelectTrigger data-testid="account-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Opening Balance (OMR)</Label>
              <Input
                data-testid="opening-balance-input"
                type="number"
                step="0.001"
                value={accountForm.opening_balance}
                onChange={(e) => setAccountForm({...accountForm, opening_balance: e.target.value})}
              />
            </div>
            <Button data-testid="save-account-button" onClick={handleCreateAccount} className="w-full">Create Account</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Transaction Dialog */}
      <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={transactionForm.transaction_type} onValueChange={(val) => setTransactionForm({...transactionForm, transaction_type: val})}>
                  <SelectTrigger data-testid="transaction-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Credit (Money IN)</SelectItem>
                    <SelectItem value="debit">Debit (Money OUT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Mode</Label>
                <Select value={transactionForm.mode} onValueChange={(val) => setTransactionForm({...transactionForm, mode: val})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Account</Label>
              <Select value={transactionForm.account_id} onValueChange={(val) => setTransactionForm({...transactionForm, account_id: val})}>
                <SelectTrigger data-testid="transaction-account-select">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({acc.account_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount (OMR)</Label>
              <Input
                data-testid="transaction-amount-input"
                type="number"
                step="0.001"
                value={transactionForm.amount}
                onChange={(e) => setTransactionForm({...transactionForm, amount: e.target.value})}
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={transactionForm.category} onValueChange={(val) => setTransactionForm({...transactionForm, category: val})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="purchase">Purchase</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="rent">Rent</SelectItem>
                  <SelectItem value="salary">Salary</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={transactionForm.notes}
                onChange={(e) => setTransactionForm({...transactionForm, notes: e.target.value})}
                placeholder="Optional notes about this transaction..."
              />
            </div>
            <Button data-testid="save-transaction-button" onClick={handleCreateTransaction} className="w-full">Record Transaction</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Confirm Transaction Deletion
            </DialogTitle>
          </DialogHeader>
          
          {transactionToDelete && (
            <div className="space-y-4 mt-4">
              {/* Warning Banner */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-red-900 mb-1">
                      Warning: This action is irreversible
                    </h4>
                    <p className="text-sm text-red-700">
                      Deleting this transaction will affect account balances and financial reports. 
                      This action cannot be undone. Please review the transaction details carefully.
                    </p>
                  </div>
                </div>
              </div>

              {/* Transaction Details */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                  Transaction Details
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Transaction Number:</span>
                    <p className="font-mono font-semibold mt-1">{transactionToDelete.transaction_number}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date:</span>
                    <p className="font-semibold mt-1">
                      {new Date(transactionToDelete.date).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <div className="flex items-center gap-2 mt-1">
                      {transactionToDelete.transaction_type === 'credit' ? (
                        <>
                          <TrendingUp className="w-4 h-4 text-green-600" />
                          <span className="font-semibold text-green-600 capitalize">
                            {transactionToDelete.transaction_type}
                          </span>
                        </>
                      ) : (
                        <>
                          <TrendingDown className="w-4 h-4 text-red-600" />
                          <span className="font-semibold text-red-600 capitalize">
                            {transactionToDelete.transaction_type}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Amount:</span>
                    <p className={`font-mono font-bold text-lg mt-1 ${
                      transactionToDelete.transaction_type === 'credit' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transactionToDelete.transaction_type === 'credit' ? '+' : '-'}
                      {transactionToDelete.amount.toFixed(3)} OMR
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Account:</span>
                    <p className="font-semibold mt-1">{transactionToDelete.account_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Category:</span>
                    <p className="font-semibold mt-1 capitalize">{transactionToDelete.category}</p>
                  </div>
                </div>
              </div>

              {/* Reason Field */}
              <div>
                <Label className="text-red-900 font-semibold">
                  Reason for Deletion <span className="text-red-600">*</span>
                </Label>
                <Textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Please provide a detailed reason for deleting this transaction (required for audit trail)..."
                  className="mt-2 min-h-[80px] border-red-200 focus:border-red-400"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This reason will be logged in the audit trail for compliance purposes.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={handleCancelDelete}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmDelete}
                  disabled={!deleteReason.trim()}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Confirm Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
