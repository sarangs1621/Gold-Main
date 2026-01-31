import React, { useState, useEffect, useCallback } from 'react';
import { formatWeight, formatCurrency, safeToFixed } from '../utils/numberFormat';
import { API } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { 
  Download, 
  FileSpreadsheet, 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  Package,
  Wallet,
  Banknote,
  Building2,
  ArrowUpDown,
  FileText,
  ShoppingCart,
  Briefcase,
  PenTool,
  Filter,
  X,
  Users,
  BarChart3,
  RotateCcw
} from 'lucide-react';
import Pagination from '../components/Pagination';
import { useURLPagination } from '../hooks/useURLPagination';
import { formatDate } from '../utils/dateTimeUtils';

export default function ReportsPage() {
  const { currentPage, setPage, pagination, setPagination } = useURLPagination();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [financialSummary, setFinancialSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states for transactions tab
  const [filters, setFilters] = useState({
    account_id: '',
    account_type: '',
    transaction_type: '',
    reference_type: '',
    start_date: '',
    end_date: ''
  });

  // Returns tab state
  const [returns, setReturns] = useState([]);
  const [returnsSummary, setReturnsSummary] = useState(null);
  const [parties, setParties] = useState([]);
  const [showReturnsFilters, setShowReturnsFilters] = useState(false);
  const [returnsFilters, setReturnsFilters] = useState({
    date_from: '',
    date_to: '',
    return_type: '',
    status: '',
    refund_mode: '',
    party_id: '',
    search: ''
  });

  useEffect(() => {
    loadFinancialSummary();
    loadAccounts();
    loadParties();
  }, []);

  useEffect(() => {
    if (activeTab === 'transactions') {
      loadTransactions();
    } else if (activeTab === 'returns') {
      loadReturns();
      loadReturnsSummary();
    }
  }, [activeTab, filters, returnsFilters, currentPage]);

  const loadFinancialSummary = async () => {
    try {
      const response = await API.get('/api/reports/financial-summary');
      setFinancialSummary(response.data);
    } catch (error) {
      console.error('Failed to load financial summary');
    }
  };

  const loadAccounts = async () => {
    try {
      const response = await API.get('/api/accounts');
      setAccounts(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to load accounts');
      setAccounts([]);
    }
  };

  const loadTransactions = useCallback(async () => {
    try {
      const params = { page: currentPage, page_size: 10 };
      if (filters.account_id) params.account_id = filters.account_id;
      if (filters.account_type) params.account_type = filters.account_type;
      if (filters.transaction_type) params.transaction_type = filters.transaction_type;
      if (filters.reference_type) params.reference_type = filters.reference_type;
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;

      const response = await API.get('/api/transactions', { params });
      setTransactions(response.data.items || []);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      setTransactions([]);
    }
  }, [filters, currentPage, setPagination]);

  const loadParties = async () => {
    try {
      const response = await API.get('/api/parties');
      setParties(Array.isArray(response.data) ? response.data : response.data.items || []);
    } catch (error) {
      console.error('Failed to load parties');
      setParties([]);
    }
  };

  const loadReturns = useCallback(async () => {
    try {
      const params = { page: currentPage, page_size: 10 };
      if (returnsFilters.date_from) params.date_from = returnsFilters.date_from;
      if (returnsFilters.date_to) params.date_to = returnsFilters.date_to;
      if (returnsFilters.return_type) params.return_type = returnsFilters.return_type;
      if (returnsFilters.status) params.status = returnsFilters.status;
      if (returnsFilters.refund_mode) params.refund_mode = returnsFilters.refund_mode;
      if (returnsFilters.party_id) params.party_id = returnsFilters.party_id;
      if (returnsFilters.search) params.search = returnsFilters.search;

      const response = await API.get('/api/returns', { params });
      setReturns(response.data.items || []);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Failed to load returns:', error);
      setReturns([]);
    }
  }, [returnsFilters, currentPage, setPagination]);

  const loadReturnsSummary = useCallback(async () => {
    try {
      const params = {};
      if (returnsFilters.date_from) params.date_from = returnsFilters.date_from;
      if (returnsFilters.date_to) params.date_to = returnsFilters.date_to;
      if (returnsFilters.return_type) params.return_type = returnsFilters.return_type;
      if (returnsFilters.refund_mode) params.refund_mode = returnsFilters.refund_mode;
      if (returnsFilters.party_id) params.party_id = returnsFilters.party_id;
      if (returnsFilters.search) params.search = returnsFilters.search;

      const response = await API.get('/api/reports/returns-summary', { params });
      setReturnsSummary(response.data);
    } catch (error) {
      console.error('Failed to load returns summary:', error);
      setReturnsSummary(null);
    }
  }, [returnsFilters]);

  const handleExport = async (type) => {
    try {
      setLoading(true);
      const endpoints = {
        inventory: '/api/reports/inventory-export',
        parties: '/api/reports/parties-export',
        invoices: '/api/reports/invoices-export'
      };

      const response = await API.get(endpoints[type], {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_export.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} exported successfully`);
    } catch (error) {
      toast.error('Failed to export data');
    } finally {
      setLoading(false);
    }
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

  const clearReturnsFilters = () => {
    setReturnsFilters({
      date_from: '',
      date_to: '',
      return_type: '',
      status: '',
      refund_mode: '',
      party_id: '',
      search: ''
    });
  };

  const handleReturnsExport = async (format) => {
    try {
      setLoading(true);
      const params = {};
      if (returnsFilters.date_from) params.date_from = returnsFilters.date_from;
      if (returnsFilters.date_to) params.date_to = returnsFilters.date_to;
      if (returnsFilters.return_type) params.return_type = returnsFilters.return_type;
      if (returnsFilters.status) params.status = returnsFilters.status;
      if (returnsFilters.refund_mode) params.refund_mode = returnsFilters.refund_mode;
      if (returnsFilters.party_id) params.party_id = returnsFilters.party_id;
      if (returnsFilters.search) params.search = returnsFilters.search;

      const endpoint = format === 'pdf' ? '/api/reports/returns-pdf' : '/api/reports/returns-export';
      
      const response = await API.get(endpoint, {
        params,
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const ext = format === 'pdf' ? 'pdf' : 'xlsx';
      link.setAttribute('download', `returns_report_${new Date().toISOString().split('T')[0]}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success(`Returns report exported successfully as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to export returns report');
    } finally {
      setLoading(false);
    }
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');
  const hasActiveReturnsFilters = Object.values(returnsFilters).some(v => v !== '');

  const getTransactionSourceIcon = (source) => {
    switch(source) {
      case 'Invoice Payment': return <FileText className="w-4 h-4" />;
      case 'Purchase Payment': return <ShoppingCart className="w-4 h-4" />;
      case 'Job Card': return <Briefcase className="w-4 h-4" />;
      default: return <PenTool className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: 'bg-yellow-100 text-yellow-800',
      finalized: 'bg-green-100 text-green-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getReturnTypeBadge = (type) => {
    const badges = {
      sale_return: 'bg-blue-100 text-blue-800',
      purchase_return: 'bg-purple-100 text-purple-800'
    };
    return badges[type] || 'bg-gray-100 text-gray-800';
  };

  const getRefundModeBadge = (mode) => {
    const badges = {
      money: 'bg-green-100 text-green-800',
      gold: 'bg-yellow-100 text-yellow-800',
      mixed: 'bg-orange-100 text-orange-800'
    };
    return badges[mode] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div data-testid="reports-page">
      <div className="mb-8">
        <h1 className="text-4xl font-serif font-semibold text-gray-900 mb-2">Reports & Analytics</h1>
        <p className="text-muted-foreground">Ledger-accurate financial reports and comprehensive data analysis</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-8 mb-6">
          <TabsTrigger value="overview" data-testid="overview-tab">
            <BarChart3 className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="transactions" data-testid="transactions-tab">
            <ArrowUpDown className="w-4 h-4 mr-2" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="invoices">
            <FileText className="w-4 h-4 mr-2" />
            Invoices
          </TabsTrigger>
          <TabsTrigger value="sales">
            <TrendingUp className="w-4 h-4 mr-2" />
            Sales History
          </TabsTrigger>
          <TabsTrigger value="returns" data-testid="returns-tab">
            <RotateCcw className="w-4 h-4 mr-2" />
            Returns
          </TabsTrigger>
          <TabsTrigger value="outstanding">
            <DollarSign className="w-4 h-4 mr-2" />
            Outstanding
          </TabsTrigger>
          <TabsTrigger value="parties">
            <Users className="w-4 h-4 mr-2" />
            Parties
          </TabsTrigger>
          <TabsTrigger value="inventory">
            <Package className="w-4 h-4 mr-2" />
            Inventory
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" data-testid="overview-content">
          {/* Financial Summary Cards */}
          {financialSummary && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card data-testid="total-sales-card">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Sales</CardTitle>
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{formatCurrency(financialSummary.total_sales)}</div>
                    <p className="text-xs text-muted-foreground mt-1">Income account credits</p>
                  </CardContent>
                </Card>

                <Card data-testid="cash-balance-card">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Cash Balance</CardTitle>
                    <Banknote className="w-4 h-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{formatCurrency(financialSummary.cash_balance)}</div>
                    <p className="text-xs text-muted-foreground mt-1">Cash asset accounts</p>
                  </CardContent>
                </Card>

                <Card data-testid="bank-balance-card">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Bank Balance</CardTitle>
                    <Building2 className="w-4 h-4 text-purple-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">{formatCurrency(financialSummary.bank_balance)}</div>
                    <p className="text-xs text-muted-foreground mt-1">Bank asset accounts</p>
                  </CardContent>
                </Card>

                <Card data-testid="net-profit-card">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit</CardTitle>
                    <DollarSign className="w-4 h-4 text-orange-600" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${financialSummary.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(financialSummary.net_profit)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Income - Expenses</p>
                  </CardContent>
                </Card>
              </div>

              {/* Transaction Flow Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card data-testid="total-credit-card">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Credit</CardTitle>
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{formatCurrency(financialSummary.total_credit)}</div>
                    <p className="text-xs text-muted-foreground mt-1">All credit transactions</p>
                  </CardContent>
                </Card>

                <Card data-testid="total-debit-card">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Debit</CardTitle>
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{formatCurrency(financialSummary.total_debit)}</div>
                    <p className="text-xs text-muted-foreground mt-1">All debit transactions</p>
                  </CardContent>
                </Card>

                <Card data-testid="net-flow-card">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Net Flow</CardTitle>
                    <ArrowUpDown className="w-4 h-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${financialSummary.net_flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {financialSummary.net_flow >= 0 ? '+' : ''}{formatCurrency(financialSummary.net_flow)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Credit - Debit</p>
                  </CardContent>
                </Card>
              </div>

              {/* Additional Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl font-serif">Ledger Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Total Account Balance</p>
                      <p className="text-lg font-bold">{formatCurrency(financialSummary.total_account_balance)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Outstanding (Informational)</p>
                      <p className="text-lg font-bold text-orange-600">{formatCurrency(financialSummary.total_outstanding)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Daily Closing Difference</p>
                      <p className={`text-lg font-bold ${financialSummary.daily_closing_difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(financialSummary.daily_closing_difference)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* TRANSACTIONS TAB */}
        <TabsContent value="transactions" data-testid="transactions-content">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-4">
                <CardTitle className="text-xl font-serif">Transaction Ledger</CardTitle>
                {hasActiveFilters && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                    Filtered
                  </span>
                )}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? 'bg-accent' : ''}
              >
                <Filter className="w-4 h-4 mr-2" /> Filters
              </Button>
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
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((txn) => (
                      <tr key={txn.id} className="border-t hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono text-sm">{txn.transaction_number}</td>
                        <td className="px-4 py-3 text-sm">{formatDate(txn.date)}</td>
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
                            <span className="text-xs text-muted-foreground capitalize">{txn.account_type}</span>
                          </div>
                        </td>
                        <td className={`px-4 py-3 text-right font-mono font-semibold ${
                          txn.transaction_type === 'credit' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {txn.transaction_type === 'credit' ? '+' : '-'}{formatCurrency(txn.amount)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-muted-foreground">
                          {txn.balance_before ? formatCurrency(txn.balance_before) : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm font-semibold">
                          {txn.balance_after ? formatCurrency(txn.balance_after) : 'N/A'}
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
        </TabsContent>

        {/* INVOICES TAB */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-serif flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Invoices Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Export all invoices with payment status and amounts
              </p>
              <Button 
                onClick={() => handleExport('invoices')} 
                disabled={loading}
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export Invoices
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SALES HISTORY TAB */}
        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-serif flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Sales History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                View and export historical sales data
              </p>
              <p className="text-xs text-muted-foreground italic">
                Feature available via existing endpoints
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RETURNS TAB */}
        <TabsContent value="returns" data-testid="returns-content">
          {/* Summary Cards */}
          {returnsSummary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              <Card data-testid="total-returns-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Returns</CardTitle>
                  <RotateCcw className="w-4 h-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{returnsSummary.total_returns_count}</div>
                  <p className="text-xs text-muted-foreground mt-1">Finalized returns only</p>
                </CardContent>
              </Card>

              <Card data-testid="sales-returns-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Sales Returns</CardTitle>
                  <TrendingDown className="w-4 h-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{formatCurrency(returnsSummary.sales_returns_amount)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Revenue reduction</p>
                </CardContent>
              </Card>

              <Card data-testid="purchase-returns-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Purchase Returns</CardTitle>
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(returnsSummary.purchase_returns_amount)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Expense reduction</p>
                </CardContent>
              </Card>

              <Card data-testid="total-refund-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Refund</CardTitle>
                  <Wallet className="w-4 h-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">{formatCurrency(returnsSummary.total_refund_amount)}</div>
                  <p className="text-xs text-muted-foreground mt-1">All returns combined</p>
                </CardContent>
              </Card>

              <Card data-testid="money-refunded-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Money Refunded</CardTitle>
                  <Banknote className="w-4 h-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{formatCurrency(returnsSummary.money_refunded)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Cash/bank impact</p>
                </CardContent>
              </Card>

              <Card data-testid="gold-refunded-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Gold Refunded</CardTitle>
                  <Package className="w-4 h-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{formatWeight(returnsSummary.gold_refunded)}g</div>
                  <p className="text-xs text-muted-foreground mt-1">Inventory impact</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Returns Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-4">
                <CardTitle className="text-xl font-serif">Returns Details</CardTitle>
                {hasActiveReturnsFilters && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                    Filtered
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowReturnsFilters(!showReturnsFilters)}
                  className={showReturnsFilters ? 'bg-accent' : ''}
                >
                  <Filter className="w-4 h-4 mr-2" /> Filters
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleReturnsExport('excel')}
                  disabled={loading}
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleReturnsExport('pdf')}
                  disabled={loading}
                >
                  <Download className="w-4 h-4 mr-2" /> PDF
                </Button>
              </div>
            </CardHeader>

            {/* Filter Panel */}
            {showReturnsFilters && (
              <div className="px-6 pb-4 border-b bg-muted/30">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs">Date From</Label>
                    <Input
                      type="date"
                      className="mt-1"
                      value={returnsFilters.date_from}
                      onChange={(e) => setReturnsFilters({...returnsFilters, date_from: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs">Date To</Label>
                    <Input
                      type="date"
                      className="mt-1"
                      value={returnsFilters.date_to}
                      onChange={(e) => setReturnsFilters({...returnsFilters, date_to: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs">Return Type</Label>
                    <Select value={returnsFilters.return_type} onValueChange={(val) => setReturnsFilters({...returnsFilters, return_type: val})}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Types</SelectItem>
                        <SelectItem value="sale_return">Sales Return</SelectItem>
                        <SelectItem value="purchase_return">Purchase Return</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-xs">Status</Label>
                    <Select value={returnsFilters.status} onValueChange={(val) => setReturnsFilters({...returnsFilters, status: val})}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Status</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="finalized">Finalized</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-xs">Refund Mode</Label>
                    <Select value={returnsFilters.refund_mode} onValueChange={(val) => setReturnsFilters({...returnsFilters, refund_mode: val})}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="All Modes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Modes</SelectItem>
                        <SelectItem value="money">Money</SelectItem>
                        <SelectItem value="gold">Gold</SelectItem>
                        <SelectItem value="mixed">Mixed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-xs">Party</Label>
                    <Select value={returnsFilters.party_id} onValueChange={(val) => setReturnsFilters({...returnsFilters, party_id: val})}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="All Parties" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Parties</SelectItem>
                        {parties.map(party => (
                          <SelectItem key={party.id} value={party.id}>{party.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="md:col-span-3">
                    <Label className="text-xs">Search</Label>
                    <Input
                      type="text"
                      className="mt-1"
                      value={returnsFilters.search}
                      onChange={(e) => setReturnsFilters({...returnsFilters, search: e.target.value})}
                      placeholder="Return #, Party Name, Reason..."
                    />
                  </div>
                </div>
                
                {hasActiveReturnsFilters && (
                  <div className="mt-3 flex justify-end">
                    <Button variant="ghost" size="sm" onClick={clearReturnsFilters}>
                      <X className="w-4 h-4 mr-2" /> Clear Filters
                    </Button>
                  </div>
                )}
              </div>
            )}

            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="returns-table">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Return #</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Party</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Refund Mode</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Amount (OMR)</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Gold (g)</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Invoice/Purchase #</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Payment Mode</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returns.map((ret) => (
                      <tr key={ret.id} className="border-t hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono text-sm">{ret.return_number}</td>
                        <td className="px-4 py-3 text-sm">{formatDate(ret.date)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs rounded-full ${getReturnTypeBadge(ret.return_type)}`}>
                            {ret.return_type === 'sale_return' ? 'Sales' : 'Purchase'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">{ret.party_name}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(ret.status)}`}>
                            {ret.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs rounded-full ${getRefundModeBadge(ret.refund_mode)}`}>
                            {ret.refund_mode}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm">
                          {ret.refund_mode === 'money' || ret.refund_mode === 'mixed' 
                            ? formatCurrency(ret.refund_money_amount) 
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm">
                          {ret.refund_mode === 'gold' || ret.refund_mode === 'mixed' 
                            ? formatWeight(ret.refund_gold_grams) 
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono">
                          {ret.reference_number || ret.reference_id?.substring(0, 8)}
                        </td>
                        <td className="px-4 py-3 text-sm capitalize">
                          {ret.payment_mode ? ret.payment_mode.replace('_', ' ') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {returns.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    No returns found
                  </div>
                )}
              </div>
            </CardContent>
            {pagination && <Pagination pagination={pagination} onPageChange={setPage} />}
          </Card>
        </TabsContent>


        {/* OUTSTANDING TAB */}
        <TabsContent value="outstanding">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-serif flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Outstanding Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                View customer and vendor outstanding balances
              </p>
              <p className="text-xs text-muted-foreground italic">
                Feature available via existing endpoints
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PARTIES TAB */}
        <TabsContent value="parties">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-serif flex items-center gap-2">
                <Users className="w-5 h-5" />
                Parties Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Export all customers and vendors with their details
              </p>
              <Button 
                onClick={() => handleExport('parties')} 
                disabled={loading}
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export Parties
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* INVENTORY TAB */}
        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-serif flex items-center gap-2">
                <Package className="w-5 h-5" />
                Inventory Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Export all inventory movements and stock levels to Excel
              </p>
              <Button 
                onClick={() => handleExport('inventory')} 
                disabled={loading}
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export Inventory
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
