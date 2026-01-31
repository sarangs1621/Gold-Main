import React, { useState, useEffect } from 'react';
import { API, useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Wallet, TrendingUp, TrendingDown, DollarSign, AlertCircle, RefreshCw, Calendar } from 'lucide-react';
import { formatCurrency } from '../utils/numberFormat';
import { toast } from 'sonner';

export default function FinanceDashboardPage() {
  const { user } = useAuth();
  const [financeData, setFinanceData] = useState(null);
  const [reconciliationStatus, setReconciliationStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [accountFilter, setAccountFilter] = useState('');
  
  useEffect(() => {
    loadFinanceDashboard();
    checkReconciliation();
  }, [dateRange, accountFilter]);
  
  const loadFinanceDashboard = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateRange.start) params.append('start_date', dateRange.start);
      if (dateRange.end) params.append('end_date', dateRange.end);
      if (accountFilter) params.append('account_type', accountFilter);
      
      const response = await API.get(`/api/dashboard/finance?${params.toString()}`);
      setFinanceData(response.data);
    } catch (error) {
      console.error('Failed to load finance dashboard:', error);
      toast.error('Failed to load finance dashboard');
      setFinanceData(null);
    } finally {
      setLoading(false);
    }
  };
  
  const checkReconciliation = async () => {
    try {
      const response = await API.get('/api/system/reconcile/finance');
      setReconciliationStatus(response.data);
    } catch (error) {
      console.error('Failed to check reconciliation:', error);
      setReconciliationStatus(null);
    }
  };
  
  const setCurrentMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    });
  };
  
  useEffect(() => {
    // Set current month by default
    setCurrentMonth();
  }, []);
  
  if (loading && !financeData) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div data-testid="finance-dashboard-page">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-serif font-semibold text-gray-900 mb-2">Finance Dashboard</h1>
        <p className="text-muted-foreground">Ledger-based financial overview (Transactions source of truth)</p>
      </div>
      
      {/* Reconciliation Warning Banner */}
      {reconciliationStatus && !reconciliationStatus.is_reconciled && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-3" data-testid="reconciliation-warning">
          <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-destructive mb-1">Finance Data Mismatch Detected</h3>
            <p className="text-sm text-muted-foreground">
              {reconciliationStatus.message}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Please contact your system administrator to review the discrepancies.
            </p>
          </div>
        </div>
      )}
      
      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium mb-2">Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                data-testid="start-date-input"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium mb-2">End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                data-testid="end-date-input"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium mb-2">Account Type</label>
              <select
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                data-testid="account-type-filter"
              >
                <option value="">All Accounts</option>
                <option value="cash">Cash Only</option>
                <option value="bank">Bank Only</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={setCurrentMonth} variant="outline" data-testid="current-month-btn">
                <Calendar className="w-4 h-4 mr-2" />
                Current Month
              </Button>
              <Button onClick={loadFinanceDashboard} data-testid="refresh-btn">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Finance Metrics */}
      {financeData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {/* Cash Balance */}
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Cash Balance
              </CardTitle>
              <Wallet className="w-5 h-5 text-green-500" strokeWidth={1.5} />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-mono font-semibold ${financeData.cash_balance >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="cash-balance">
                {formatCurrency(financeData.cash_balance)}
              </div>
              <p className="text-xs text-muted-foreground mt-2">OMR</p>
            </CardContent>
          </Card>
          
          {/* Bank Balance */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Bank Balance
              </CardTitle>
              <DollarSign className="w-5 h-5 text-blue-500" strokeWidth={1.5} />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-mono font-semibold ${financeData.bank_balance >= 0 ? 'text-blue-600' : 'text-red-600'}`} data-testid="bank-balance">
                {formatCurrency(financeData.bank_balance)}
              </div>
              <p className="text-xs text-muted-foreground mt-2">OMR</p>
            </CardContent>
          </Card>
          
          {/* Total Credit */}
          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Total Credit
              </CardTitle>
              <TrendingUp className="w-5 h-5 text-emerald-500" strokeWidth={1.5} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-mono font-semibold text-emerald-600" data-testid="total-credit">
                {formatCurrency(financeData.total_credit)}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Inflows</p>
            </CardContent>
          </Card>
          
          {/* Total Debit */}
          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Total Debit
              </CardTitle>
              <TrendingDown className="w-5 h-5 text-red-500" strokeWidth={1.5} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-mono font-semibold text-red-600" data-testid="total-debit">
                {formatCurrency(financeData.total_debit)}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Outflows</p>
            </CardContent>
          </Card>
          
          {/* Net Flow */}
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Net Flow
              </CardTitle>
              <TrendingUp className="w-5 h-5 text-primary" strokeWidth={1.5} />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-mono font-semibold ${financeData.net_flow >= 0 ? 'text-primary' : 'text-red-600'}`} data-testid="net-flow">
                {formatCurrency(financeData.net_flow)}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Credit - Debit</p>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Period Info */}
      {financeData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-serif">Period Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Period</p>
                <p className="font-medium" data-testid="period-display">
                  {new Date(financeData.period.start_date).toLocaleDateString()} - {new Date(financeData.period.end_date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Account Filter</p>
                <p className="font-medium" data-testid="account-filter-display">
                  {financeData.filters.account_type ? financeData.filters.account_type.toUpperCase() : 'All Accounts'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Last Updated</p>
                <p className="font-medium" data-testid="timestamp-display">
                  {new Date(financeData.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Important Notes */}
      <Card className="mt-6 bg-muted/30">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Important Notes
          </h3>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
            <li>All figures are calculated from the <strong>Transactions ledger</strong> (single source of truth)</li>
            <li>Decimal precision: 3 decimal places for all calculations</li>
            <li>Cash Balance = SUM(CREDIT where account=CASH) - SUM(DEBIT where account=CASH)</li>
            <li>Bank Balance = SUM(CREDIT where account=BANK) - SUM(DEBIT where account=BANK)</li>
            <li>Net Flow = Total Credit - Total Debit</li>
            <li>Default period: Current month</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
