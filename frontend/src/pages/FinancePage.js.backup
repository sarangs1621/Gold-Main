import React, { useState, useEffect } from 'react';
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
import { Plus, Wallet as WalletIcon, TrendingUp, TrendingDown, Trash2, AlertTriangle } from 'lucide-react';

export default function FinancePage() {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [accountsRes, transactionsRes] = await Promise.all([
        axios.get(`${API}/accounts`),
        axios.get(`${API}/transactions`)
      ]);
      setAccounts(accountsRes.data);
      setTransactions(transactionsRes.data.items || []);
    } catch (error) {
      toast.error('Failed to load data');
    }
  };

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

  return (
    <div data-testid="finance-page">
      <div className="mb-8">
        <h1 className="text-4xl font-serif font-semibold text-gray-900 mb-2">Finance</h1>
        <p className="text-muted-foreground">Manage accounts and transactions</p>
      </div>

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
                    <span className="font-medium">{acc.name}</span>
                    <WalletIcon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-mono font-semibold">{acc.current_balance.toFixed(3)}<span className="text-sm ml-1">OMR</span></div>
                  <div className="text-xs text-muted-foreground mt-1 capitalize">{acc.account_type}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-serif">Transactions</CardTitle>
            <Button data-testid="add-transaction-button" size="sm" onClick={() => setShowTransactionDialog(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Transaction
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="transactions-table">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">TXN #</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Account</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Category</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 20).map((txn) => (
                    <tr key={txn.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-sm">{txn.transaction_number}</td>
                      <td className="px-4 py-3 text-sm">{new Date(txn.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {txn.transaction_type === 'credit' ? (
                            <TrendingUp className="w-4 h-4 text-green-600" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-600" />
                          )}
                          <span className="capitalize text-sm">{txn.transaction_type}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{txn.account_name}</td>
                      <td className={`px-4 py-3 text-right font-mono ${
                        txn.transaction_type === 'credit' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {txn.transaction_type === 'credit' ? '+' : '-'}{txn.amount.toFixed(3)}
                      </td>
                      <td className="px-4 py-3 text-sm capitalize">{txn.category}</td>
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
            </div>
          </CardContent>
        </Card>
      </div>

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
                    <SelectItem value="credit">Credit</SelectItem>
                    <SelectItem value="debit">Debit</SelectItem>
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
                    <SelectItem value="bank">Bank</SelectItem>
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
                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
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
                  <SelectItem value="rent">Rent</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Input
                value={transactionForm.notes}
                onChange={(e) => setTransactionForm({...transactionForm, notes: e.target.value})}
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
                      {transactionToDelete.amount.toFixed(2)} OMR
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
                  {transactionToDelete.party_name && (
                    <div>
                      <span className="text-muted-foreground">Party:</span>
                      <p className="font-semibold mt-1">{transactionToDelete.party_name}</p>
                    </div>
                  )}
                  {transactionToDelete.reference_type && (
                    <div>
                      <span className="text-muted-foreground">Reference:</span>
                      <p className="font-semibold mt-1 capitalize">
                        {transactionToDelete.reference_type}
                        {transactionToDelete.reference_id && ` #${transactionToDelete.reference_id}`}
                      </p>
                    </div>
                  )}
                  {transactionToDelete.mode && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Payment Mode:</span>
                      <p className="font-semibold mt-1 capitalize">{transactionToDelete.mode}</p>
                    </div>
                  )}
                  {transactionToDelete.notes && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Notes:</span>
                      <p className="mt-1 text-gray-700">{transactionToDelete.notes}</p>
                    </div>
                  )}
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
