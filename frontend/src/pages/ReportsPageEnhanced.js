import React, { useState, useEffect } from 'react';
import { formatWeight, formatCurrency, safeToFixed } from '../utils/numberFormat';
import { API } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import { 
  Download, FileSpreadsheet, TrendingUp, DollarSign, Package, 
  Filter, Eye, Search, Calendar, RefreshCw, AlertCircle, ArrowUpCircle, ArrowDownCircle, Wallet, Building2, RotateCcw, TrendingDown, Banknote
} from 'lucide-react';

export default function ReportsPageEnhanced() {
  const [loading, setLoading] = useState(false);
  const [financialSummary, setFinancialSummary] = useState(null);
  const [outstandingData, setOutstandingData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Global Filter states
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedPartyId, setSelectedPartyId] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');
  
  // Type filters
  const [invoiceType, setInvoiceType] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [partyType, setPartyType] = useState('all');
  const [movementType, setMovementType] = useState('all');
  const [category, setCategory] = useState('all');
  const [transactionType, setTransactionType] = useState('all');
  
  // Data states
  const [inventoryData, setInventoryData] = useState(null);
  const [partiesData, setPartiesData] = useState(null);
  const [invoicesData, setInvoicesData] = useState(null);
  const [transactionsData, setTransactionsData] = useState(null);
  const [salesHistoryData, setSalesHistoryData] = useState(null);
  const [purchaseHistoryData, setPurchaseHistoryData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [parties, setParties] = useState([]);
  
  // Sales History specific state
  const [searchQuery, setSearchQuery] = useState('');
  // Purchase History specific state
  const [purchaseSearchQuery, setPurchaseSearchQuery] = useState('');
  
  // Returns specific state
  const [returns, setReturns] = useState([]);
  const [returnsSummary, setReturnsSummary] = useState(null);
  const [returnsFilters, setReturnsFilters] = useState({
    date_from: '',
    date_to: '',
    return_type: 'all',
    status: 'all',
    refund_mode: 'all',
    party_id: 'all',
    search: ''
  });
  
  // Detail view states
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedParty, setSelectedParty] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  useEffect(() => {
    loadFinancialSummary();
    loadCategories();
    loadAccounts();
    loadParties();
  }, []);

  useEffect(() => {
    // Reload data when filters change
    if (activeTab === 'overview') {
      loadFinancialSummary();
    } else if (activeTab === 'outstanding') {
      loadOutstandingReport();
    } else if (activeTab === 'inventory') {
      loadInventoryReport();
    } else if (activeTab === 'parties') {
      loadPartiesReport();
    } else if (activeTab === 'invoices') {
      loadInvoicesReport();
    } else if (activeTab === 'transactions') {
      loadTransactionsReport();
    } else if (activeTab === 'sales-history') {
      loadSalesHistoryReport();
    } else if (activeTab === 'purchase-history') {
      loadPurchaseHistoryReport();
    } else if (activeTab === 'returns') {
      loadReturnsReport();
      loadReturnsSummary();
    }
  }, [datePreset, startDate, endDate, selectedPartyId, sortBy]);

  // Date preset handler
  const applyDatePreset = (preset) => {
    const today = new Date();
    let start, end;
    
    switch (preset) {
      case 'today':
        start = end = today.toISOString().split('T')[0];
        break;
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        start = end = yesterday.toISOString().split('T')[0];
        break;
      case 'this_week':
        // Week starts on Monday (ISO standard)
        const dayOfWeek = today.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(today);
        monday.setDate(today.getDate() + mondayOffset);
        start = monday.toISOString().split('T')[0];
        end = today.toISOString().split('T')[0];
        break;
      case 'this_month':
        start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        end = today.toISOString().split('T')[0];
        break;
      case 'custom':
        // User will set dates manually
        return;
      default:
        start = end = '';
    }
    
    setStartDate(start);
    setEndDate(end);
    setDatePreset(preset);
  };

  const loadParties = async () => {
    try {
      const response = await API.get(`/api/parties`);
      setParties(response.data.items || []);
    } catch (error) {
      console.error('Failed to load parties');
    }
  };

  const loadFinancialSummary = async () => {
    try {
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      
      const response = await API.get(`/api/reports/financial-summary`, { params });
      setFinancialSummary(response.data);
    } catch (error) {
      console.error('Failed to load financial summary');
    }
  };

  const loadOutstandingReport = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedPartyId && selectedPartyId !== 'all') params.party_id = selectedPartyId;
      if (partyType && partyType !== 'all') params.party_type = partyType;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      
      const response = await API.get(`/api/reports/outstanding`, { params });
      setOutstandingData(response.data);
    } catch (error) {
      toast.error('Failed to load outstanding report');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await API.get(`/api/inventory/headers`);
      setCategories(response.data?.items || []);
    } catch (error) {
      console.error('Failed to load categories');
      setCategories([]);
    }
  };

  const loadAccounts = async () => {
    try {
      const response = await API.get(`/api/accounts`);
      setAccounts(response.data);
    } catch (error) {
      console.error('Failed to load accounts');
    }
  };

  const loadInventoryReport = async () => {
    try {
      setLoading(true);
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (movementType && movementType !== 'all') params.movement_type = movementType;
      if (category && category !== 'all') params.category = category;
      if (sortBy) params.sort_by = sortBy;
      
      const response = await API.get(`/api/reports/inventory-view`, { params });
      setInventoryData(response.data);
    } catch (error) {
      toast.error('Failed to load inventory report');
    } finally {
      setLoading(false);
    }
  };

  const loadPartiesReport = async () => {
    try {
      setLoading(true);
      const params = {};
      if (partyType && partyType !== 'all') params.party_type = partyType;
      if (sortBy) params.sort_by = sortBy;
      
      const response = await API.get(`/api/reports/parties-view`, { params });
      setPartiesData(response.data);
    } catch (error) {
      toast.error('Failed to load parties report');
    } finally {
      setLoading(false);
    }
  };

  const loadInvoicesReport = async () => {
    try {
      setLoading(true);
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (invoiceType && invoiceType !== 'all') params.invoice_type = invoiceType;
      if (paymentStatus && paymentStatus !== 'all') params.payment_status = paymentStatus;
      if (selectedPartyId && selectedPartyId !== 'all') params.party_id = selectedPartyId;
      if (sortBy) params.sort_by = sortBy;
      
      const response = await API.get(`/api/reports/invoices-view`, { params });
      setInvoicesData(response.data);
    } catch (error) {
      toast.error('Failed to load invoices report');
    } finally {
      setLoading(false);
    }
  };

  const loadTransactionsReport = async () => {
    try {
      setLoading(true);
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (transactionType && transactionType !== 'all') params.transaction_type = transactionType;
      if (selectedPartyId && selectedPartyId !== 'all') params.party_id = selectedPartyId;
      if (sortBy) params.sort_by = sortBy;
      
      const response = await API.get(`/api/reports/transactions-view`, { params });
      setTransactionsData(response.data);
    } catch (error) {
      toast.error('Failed to load transactions report');
    } finally {
      setLoading(false);
    }
  };

  const loadSalesHistoryReport = async () => {
    try {
      setLoading(true);
      const params = {};
      if (startDate) params.date_from = startDate;
      if (endDate) params.date_to = endDate;
      if (selectedPartyId && selectedPartyId !== 'all') params.party_id = selectedPartyId;
      if (searchQuery) params.search = searchQuery;
      
      const response = await API.get(`/api/reports/sales-history`, { params });
      setSalesHistoryData(response.data);
    } catch (error) {
      toast.error('Failed to load sales history report');
    } finally {
      setLoading(false);
    }
  };

  const loadPurchaseHistoryReport = async () => {
    try {
      setLoading(true);
      const params = {};
      if (startDate) params.date_from = startDate;
      if (endDate) params.date_to = endDate;
      if (selectedPartyId && selectedPartyId !== 'all') params.vendor_id = selectedPartyId;
      if (purchaseSearchQuery) params.search = purchaseSearchQuery;
      
      const response = await API.get(`/api/reports/purchase-history`, { params });
      setPurchaseHistoryData(response.data);
    } catch (error) {
      toast.error('Failed to load purchase history report');
    } finally {
      setLoading(false);
    }
  };

  const loadReturnsReport = async () => {
    try {
      setLoading(true);
      const params = {};
      if (returnsFilters.date_from) params.date_from = returnsFilters.date_from;
      if (returnsFilters.date_to) params.date_to = returnsFilters.date_to;
      if (returnsFilters.return_type && returnsFilters.return_type !== 'all') params.return_type = returnsFilters.return_type;
      if (returnsFilters.status && returnsFilters.status !== 'all') params.status = returnsFilters.status;
      if (returnsFilters.refund_mode && returnsFilters.refund_mode !== 'all') params.refund_mode = returnsFilters.refund_mode;
      if (returnsFilters.party_id && returnsFilters.party_id !== 'all') params.party_id = returnsFilters.party_id;
      if (returnsFilters.search) params.search = returnsFilters.search;
      
      const response = await API.get(`/api/returns`, { params });
      setReturns(response.data.items || response.data || []);
    } catch (error) {
      toast.error('Failed to load returns report');
      setReturns([]);
    } finally {
      setLoading(false);
    }
  };

  const loadReturnsSummary = async () => {
    try {
      const params = {};
      if (returnsFilters.date_from) params.date_from = returnsFilters.date_from;
      if (returnsFilters.date_to) params.date_to = returnsFilters.date_to;
      if (returnsFilters.return_type && returnsFilters.return_type !== 'all') params.return_type = returnsFilters.return_type;
      if (returnsFilters.refund_mode && returnsFilters.refund_mode !== 'all') params.refund_mode = returnsFilters.refund_mode;
      if (returnsFilters.party_id && returnsFilters.party_id !== 'all') params.party_id = returnsFilters.party_id;
      if (returnsFilters.search) params.search = returnsFilters.search;
      
      const response = await API.get(`/api/reports/returns-summary`, { params });
      setReturnsSummary(response.data);
    } catch (error) {
      console.error('Failed to load returns summary:', error);
      setReturnsSummary(null);
    }
  };



  const exportPDF = async (reportType) => {
    try {
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (selectedPartyId && selectedPartyId !== 'all') params.party_id = selectedPartyId;
      if (invoiceType && invoiceType !== 'all') params.invoice_type = invoiceType;
      if (paymentStatus && paymentStatus !== 'all') params.payment_status = paymentStatus;
      if (partyType && partyType !== 'all') params.party_type = partyType;
      if (movementType && movementType !== 'all') params.movement_type = movementType;
      if (category && category !== 'all') params.category = category;
      if (transactionType && transactionType !== 'all') params.transaction_type = transactionType;
      
      // Special handling for sales history
      if (reportType === 'sales-history') {
        if (startDate) params.date_from = startDate;
        if (endDate) params.date_to = endDate;
        if (searchQuery) params.search = searchQuery;
      }
      
      // Special handling for purchase history
      if (reportType === 'purchase-history') {
        if (startDate) params.date_from = startDate;
        if (endDate) params.date_to = endDate;
        if (selectedPartyId && selectedPartyId !== 'all') params.vendor_party_id = selectedPartyId;
        if (purchaseSearchQuery) params.search = purchaseSearchQuery;
      }
      
      // Special handling for returns
      if (reportType === 'returns') {
        if (returnsFilters.date_from) params.date_from = returnsFilters.date_from;
        if (returnsFilters.date_to) params.date_to = returnsFilters.date_to;
        if (returnsFilters.return_type && returnsFilters.return_type !== 'all') params.return_type = returnsFilters.return_type;
        if (returnsFilters.status && returnsFilters.status !== 'all') params.status = returnsFilters.status;
        if (returnsFilters.refund_mode && returnsFilters.refund_mode !== 'all') params.refund_mode = returnsFilters.refund_mode;
        if (returnsFilters.party_id && returnsFilters.party_id !== 'all') params.party_id = returnsFilters.party_id;
        if (returnsFilters.search) params.search = returnsFilters.search;
      }
      
      const response = await API.get(`/api/reports/${reportType}-pdf`, {
        params,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}_report_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('PDF exported successfully');
    } catch (error) {
      toast.error('Failed to export PDF');
    }
  };

  const exportExcel = async (reportType) => {
    try {
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (selectedPartyId && selectedPartyId !== 'all') params.party_id = selectedPartyId;
      if (invoiceType && invoiceType !== 'all') params.invoice_type = invoiceType;
      if (paymentStatus && paymentStatus !== 'all') params.payment_status = paymentStatus;
      if (partyType && partyType !== 'all') params.party_type = partyType;
      if (movementType && movementType !== 'all') params.movement_type = movementType;
      if (category && category !== 'all') params.category = category;
      if (transactionType && transactionType !== 'all') params.transaction_type = transactionType;
      
      // Special handling for sales history
      if (reportType === 'sales-history') {
        if (startDate) params.date_from = startDate;
        if (endDate) params.date_to = endDate;
        if (searchQuery) params.search = searchQuery;
      }
      
      // Special handling for purchase history
      if (reportType === 'purchase-history') {
        if (startDate) params.date_from = startDate;
        if (endDate) params.date_to = endDate;
        if (selectedPartyId && selectedPartyId !== 'all') params.vendor_party_id = selectedPartyId;
        if (purchaseSearchQuery) params.search = purchaseSearchQuery;
      }
      
      // Special handling for returns
      if (reportType === 'returns') {
        if (returnsFilters.date_from) params.date_from = returnsFilters.date_from;
        if (returnsFilters.date_to) params.date_to = returnsFilters.date_to;
        if (returnsFilters.return_type && returnsFilters.return_type !== 'all') params.return_type = returnsFilters.return_type;
        if (returnsFilters.status && returnsFilters.status !== 'all') params.status = returnsFilters.status;
        if (returnsFilters.refund_mode && returnsFilters.refund_mode !== 'all') params.refund_mode = returnsFilters.refund_mode;
        if (returnsFilters.party_id && returnsFilters.party_id !== 'all') params.party_id = returnsFilters.party_id;
        if (returnsFilters.search) params.search = returnsFilters.search;
      }
      
      const response = await API.get(`/api/reports/${reportType}-export`, {
        params,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}_report_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Excel exported successfully');
    } catch (error) {
      toast.error('Failed to export Excel');
    }
  };

  const clearFilters = () => {
    setDatePreset('');
    setStartDate('');
    setEndDate('');
    setSelectedPartyId('');
    setSortBy('date_desc');
    setInvoiceType('');
    setPaymentStatus('');
    setPartyType('');
    setMovementType('');
    setCategory('');
    setTransactionType('');
  };

  // Global Filters Component
  const GlobalFilters = ({ showPartyFilter = true, showSorting = true, exportType = null }) => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filters
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date Presets */}
          <div>
            <Label>Date Range</Label>
            <Select value={datePreset} onValueChange={applyDatePreset}>
              <SelectTrigger>
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="this_week">This Week</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Date Range */}
          {(datePreset === 'custom' || startDate || endDate) && (
            <>
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Party Filter */}
          {showPartyFilter && (
            <div>
              <Label>Party</Label>
              <Select value={selectedPartyId} onValueChange={setSelectedPartyId}>
                <SelectTrigger>
                  <SelectValue placeholder="All Parties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Parties</SelectItem>
                  {parties.map(party => (
                    <SelectItem key={party.id} value={party.id}>
                      {party.name} ({party.party_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Sorting */}
          {showSorting && (
            <div>
              <Label>Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date_desc">Latest First</SelectItem>
                  <SelectItem value="date_asc">Oldest First</SelectItem>
                  <SelectItem value="amount_desc">Highest Amount</SelectItem>
                  <SelectItem value="outstanding_desc">Highest Outstanding</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          <Button onClick={clearFilters} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
          
          {exportType && (
            <>
              <Button onClick={() => exportPDF(exportType)} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button onClick={() => exportExcel(exportType)} variant="outline" size="sm">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Reports & Analytics</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-9">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="outstanding">Outstanding</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="sales-history">Sales History</TabsTrigger>
          <TabsTrigger value="purchase-history">Purchase History</TabsTrigger>
          <TabsTrigger value="returns" data-testid="returns-tab">
            <RotateCcw className="h-4 w-4 mr-1" />
            Returns
          </TabsTrigger>
          <TabsTrigger value="parties">Parties</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB - Enhanced Finance Summary */}
        <TabsContent value="overview" className="space-y-6">
          <GlobalFilters showPartyFilter={false} showSorting={false} />

          {financialSummary && (
            <>
              {/* Main Financial Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{financialSummary.total_sales?.toFixed(3)} OMR</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
                    <Package className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{financialSummary.total_purchases?.toFixed(3)} OMR</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                    <DollarSign className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{financialSummary.net_profit?.toFixed(3)} OMR</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{financialSummary.total_outstanding?.toFixed(3)} OMR</div>
                  </CardContent>
                </Card>
              </div>

              {/* Cash Flow & Balance Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Cash Balance</CardTitle>
                    <Wallet className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{financialSummary.cash_balance?.toFixed(3)} OMR</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Bank Balance</CardTitle>
                    <Building2 className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{financialSummary.bank_balance?.toFixed(3)} OMR</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Credit</CardTitle>
                    <ArrowUpCircle className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{financialSummary.total_credit?.toFixed(3)} OMR</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Debit</CardTitle>
                    <ArrowDownCircle className="h-4 w-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{financialSummary.total_debit?.toFixed(3)} OMR</div>
                  </CardContent>
                </Card>
              </div>

              {/* Net Flow & Daily Closing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Net Flow</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-3xl font-bold ${financialSummary.net_flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {financialSummary.net_flow >= 0 ? '+' : ''}{financialSummary.net_flow?.toFixed(3)} OMR
                    </div>
                    <p className="text-sm text-gray-500 mt-2">Total Credit - Total Debit</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Daily Closing Difference</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-3xl font-bold ${financialSummary.daily_closing_difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {financialSummary.daily_closing_difference >= 0 ? '+' : ''}{financialSummary.daily_closing_difference?.toFixed(3)} OMR
                    </div>
                    <p className="text-sm text-gray-500 mt-2">Actual - Expected Closing</p>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* OUTSTANDING TAB */}
        <TabsContent value="outstanding" className="space-y-6">
          <GlobalFilters showPartyFilter={true} showSorting={false} exportType="outstanding" />

          {/* Type Filter for Outstanding */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div>
                  <Label>Party Type</Label>
                  <Select value={partyType} onValueChange={setPartyType}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="customer">Customers Only</SelectItem>
                      <SelectItem value="vendor">Vendors Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={loadOutstandingReport}>
                    <Search className="h-4 w-4 mr-2" />
                    Load Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {loading && (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              <p className="mt-2 text-gray-500">Loading outstanding report...</p>
            </div>
          )}

          {outstandingData && !loading && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Customer Due (Receivable)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {outstandingData.summary.customer_due?.toFixed(3)} OMR
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Money to receive from customers</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Vendor Payable</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {outstandingData.summary.vendor_payable?.toFixed(3)} OMR
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Money to pay to vendors</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {outstandingData.summary.total_outstanding?.toFixed(3)} OMR
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Net outstanding balance</p>
                  </CardContent>
                </Card>
              </div>

              {/* Overdue Buckets */}
              <Card>
                <CardHeader>
                  <CardTitle>Overdue Buckets</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-yellow-800">0-7 Days</span>
                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div className="text-2xl font-bold text-yellow-700 mt-2">
                        {outstandingData.summary.total_overdue_0_7?.toFixed(3)} OMR
                      </div>
                    </div>

                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-orange-800">8-30 Days</span>
                        <AlertCircle className="h-5 w-5 text-orange-600" />
                      </div>
                      <div className="text-2xl font-bold text-orange-700 mt-2">
                        {outstandingData.summary.total_overdue_8_30?.toFixed(3)} OMR
                      </div>
                    </div>

                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-red-800">31+ Days</span>
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      </div>
                      <div className="text-2xl font-bold text-red-700 mt-2">
                        {outstandingData.summary.total_overdue_31_plus?.toFixed(3)} OMR
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Party-wise Outstanding Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Party-wise Outstanding Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Party Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Total Invoiced</TableHead>
                          <TableHead className="text-right">Total Paid</TableHead>
                          <TableHead className="text-right">Outstanding</TableHead>
                          <TableHead className="text-right">0-7d</TableHead>
                          <TableHead className="text-right">8-30d</TableHead>
                          <TableHead className="text-right">31+d</TableHead>
                          <TableHead>Last Invoice</TableHead>
                          <TableHead>Last Payment</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {outstandingData.parties.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                              No outstanding records found
                            </TableCell>
                          </TableRow>
                        ) : (
                          outstandingData.parties.map((party, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{party.party_name}</TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded text-xs ${
                                  party.party_type === 'customer' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {party.party_type}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">{party.total_invoiced?.toFixed(3)}</TableCell>
                              <TableCell className="text-right">{party.total_paid?.toFixed(3)}</TableCell>
                              <TableCell className="text-right font-bold">{party.total_outstanding?.toFixed(3)}</TableCell>
                              <TableCell className="text-right text-yellow-600">{party.overdue_0_7?.toFixed(3)}</TableCell>
                              <TableCell className="text-right text-orange-600">{party.overdue_8_30?.toFixed(3)}</TableCell>
                              <TableCell className="text-right text-red-600">{party.overdue_31_plus?.toFixed(3)}</TableCell>
                              <TableCell>
                                {party.last_invoice_date ? new Date(party.last_invoice_date).toLocaleDateString() : '-'}
                              </TableCell>
                              <TableCell>
                                {party.last_payment_date ? new Date(party.last_payment_date).toLocaleDateString() : '-'}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* INVOICES TAB */}
        <TabsContent value="invoices" className="space-y-6">
          <GlobalFilters showPartyFilter={true} showSorting={true} exportType="invoices" />

          {/* Invoice Type Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div>
                  <Label>Invoice Type</Label>
                  <Select value={invoiceType} onValueChange={setInvoiceType}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="sale">Sale</SelectItem>
                      <SelectItem value="purchase">Purchase</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Payment Status</Label>
                  <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={loadInvoicesReport}>
                    <Search className="h-4 w-4 mr-2" />
                    Load Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {loading && (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            </div>
          )}

          {invoicesData && !loading && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Total Amount</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{invoicesData.summary.total_amount?.toFixed(3)} OMR</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Total Paid</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{invoicesData.summary.total_paid?.toFixed(3)} OMR</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Balance Due</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">{invoicesData.summary.total_balance?.toFixed(3)} OMR</div>
                  </CardContent>
                </Card>
              </div>

              {/* Invoices Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Invoices ({invoicesData.count})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Paid</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoicesData.invoices.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                              No invoices found
                            </TableCell>
                          </TableRow>
                        ) : (
                          invoicesData.invoices.map((inv) => (
                            <TableRow key={inv.id}>
                              <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                              <TableCell>{new Date(inv.date).toLocaleDateString()}</TableCell>
                              <TableCell>{inv.customer_name || inv.walk_in_name || 'N/A'}</TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded text-xs ${
                                  inv.invoice_type === 'sale' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {inv.invoice_type}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded text-xs ${
                                  inv.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                                  inv.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {inv.payment_status}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">{inv.grand_total?.toFixed(3)}</TableCell>
                              <TableCell className="text-right">{inv.paid_amount?.toFixed(3)}</TableCell>
                              <TableCell className="text-right font-bold">{inv.balance_due?.toFixed(3)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>


        {/* SALES HISTORY TAB - Finalized Invoices Only */}
        <TabsContent value="sales-history" className="space-y-6">
          <GlobalFilters showPartyFilter={true} showSorting={false} exportType="sales-history" />

          {/* Search Bar */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label>Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search by customer name, phone, or invoice ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex items-end">
                  <Button onClick={loadSalesHistoryReport}>
                    <Search className="h-4 w-4 mr-2" />
                    Load Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {loading && (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            </div>
          )}

          {salesHistoryData && !loading && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Total Invoices</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{salesHistoryData.summary.total_invoices}</div>
                    <p className="text-xs text-gray-500 mt-1">Finalized only</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Total Weight</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{salesHistoryData.summary.total_weight?.toFixed(3)} g</div>
                    <p className="text-xs text-gray-500 mt-1">Combined gold weight</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Total Sales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{salesHistoryData.summary.total_sales?.toFixed(2)} OMR</div>
                    <p className="text-xs text-gray-500 mt-1">Grand total</p>
                  </CardContent>
                </Card>
              </div>

              {/* Sales History Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Sales History ({salesHistoryData.sales_records.length})</CardTitle>
                  <p className="text-sm text-gray-500">Showing finalized invoices only</p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Customer Name</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Weight (g)</TableHead>
                          <TableHead>Purity</TableHead>
                          <TableHead className="text-right">Grand Total (OMR)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salesHistoryData.sales_records.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                              No sales history found. Only finalized invoices are displayed.
                            </TableCell>
                          </TableRow>
                        ) : (
                          salesHistoryData.sales_records.map((record, index) => (
                            <TableRow key={record.invoice_id || index}>
                              <TableCell className="font-medium">{record.invoice_id}</TableCell>
                              <TableCell>{record.customer_name}</TableCell>
                              <TableCell>{record.customer_phone || '-'}</TableCell>
                              <TableCell>{record.date}</TableCell>
                              <TableCell className="text-right font-mono">{record.total_weight_grams?.toFixed(3)}</TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded text-xs ${
                                  record.purity_summary === 'Mixed' 
                                    ? 'bg-purple-100 text-purple-800' 
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {record.purity_summary}
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-bold">{record.grand_total?.toFixed(2)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>


        {/* PURCHASE HISTORY TAB - Module 6/10 */}
        <TabsContent value="purchase-history" className="space-y-6">
          <GlobalFilters showPartyFilter={true} showSorting={false} exportType="purchase-history" />

          {/* Search Bar */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label>Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search by vendor name, phone, or description..."
                      value={purchaseSearchQuery}
                      onChange={(e) => setPurchaseSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex items-end">
                  <Button onClick={loadPurchaseHistoryReport}>
                    <Search className="h-4 w-4 mr-2" />
                    Load Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {loading && (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            </div>
          )}

          {purchaseHistoryData && !loading && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Total Purchases</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{purchaseHistoryData.summary.total_purchases}</div>
                    <p className="text-xs text-gray-500 mt-1">All committed purchases</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Total Weight</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{purchaseHistoryData.summary.total_weight?.toFixed(3)} g</div>
                    <p className="text-xs text-gray-500 mt-1">Combined gold weight</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Total Amount</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{purchaseHistoryData.summary.total_amount?.toFixed(2)} OMR</div>
                    <p className="text-xs text-gray-500 mt-1">Grand total</p>
                  </CardContent>
                </Card>
              </div>

              {/* Purchase History Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Purchase History ({purchaseHistoryData.purchase_records.length})</CardTitle>
                  <p className="text-sm text-gray-500">Showing all committed purchases</p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Vendor Name</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Weight (g)</TableHead>
                          <TableHead className="text-center">Entered Purity</TableHead>
                          <TableHead className="text-center">Valuation Purity</TableHead>
                          <TableHead className="text-right">Amount Total (OMR)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {purchaseHistoryData.purchase_records.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                              No purchase history found for the selected filters.
                            </TableCell>
                          </TableRow>
                        ) : (
                          purchaseHistoryData.purchase_records.map((record, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{record.vendor_name}</TableCell>
                              <TableCell>{record.vendor_phone || '-'}</TableCell>
                              <TableCell>{record.date}</TableCell>
                              <TableCell className="text-right font-mono">{record.weight_grams?.toFixed(3)}</TableCell>
                              <TableCell className="text-center">
                                <span className="px-2 py-1 rounded text-xs bg-amber-100 text-amber-800">
                                  {record.entered_purity}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800 font-semibold">
                                  {record.valuation_purity}
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-bold">{record.amount_total?.toFixed(2)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>



        {/* PARTIES TAB */}
        <TabsContent value="parties" className="space-y-6">
          <GlobalFilters showPartyFilter={false} showSorting={true} exportType="parties" />

          {/* Party Type Filter */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div>
                  <Label>Party Type</Label>
                  <Select value={partyType} onValueChange={setPartyType}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="customer">Customers</SelectItem>
                      <SelectItem value="vendor">Vendors</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={loadPartiesReport}>
                    <Search className="h-4 w-4 mr-2" />
                    Load Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {loading && (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            </div>
          )}

          {partiesData && !loading && (
            <Card>
              <CardHeader>
                <CardTitle>Parties ({partiesData.count})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="text-right">Outstanding</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {partiesData.parties.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                            No parties found
                          </TableCell>
                        </TableRow>
                      ) : (
                        partiesData.parties.map((party) => (
                          <TableRow key={party.id}>
                            <TableCell className="font-medium">{party.name}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded text-xs ${
                                party.party_type === 'customer' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {party.party_type}
                              </span>
                            </TableCell>
                            <TableCell>{party.phone || '-'}</TableCell>
                            <TableCell>{party.email || '-'}</TableCell>
                            <TableCell className="text-right font-bold">{party.outstanding?.toFixed(3)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TRANSACTIONS TAB */}
        <TabsContent value="transactions" className="space-y-6">
          <GlobalFilters showPartyFilter={true} showSorting={true} exportType="transactions" />

          {/* Transaction Type Filter */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div>
                  <Label>Transaction Type</Label>
                  <Select value={transactionType} onValueChange={setTransactionType}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                      <SelectItem value="debit">Debit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={loadTransactionsReport}>
                    <Search className="h-4 w-4 mr-2" />
                    Load Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {loading && (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            </div>
          )}

          {transactionsData && !loading && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Total Credit</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{transactionsData.summary.total_credit?.toFixed(3)} OMR</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Total Debit</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{transactionsData.summary.total_debit?.toFixed(3)} OMR</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Net Balance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${transactionsData.summary.net_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {transactionsData.summary.net_balance?.toFixed(3)} OMR
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Transactions Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Transactions ({transactionsData.count})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Transaction #</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Mode</TableHead>
                          <TableHead>Account</TableHead>
                          <TableHead>Party</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactionsData.transactions.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                              No transactions found
                            </TableCell>
                          </TableRow>
                        ) : (
                          transactionsData.transactions.map((txn) => (
                            <TableRow key={txn.id}>
                              <TableCell className="font-medium">{txn.transaction_number}</TableCell>
                              <TableCell>{new Date(txn.date).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded text-xs ${
                                  txn.transaction_type === 'credit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {txn.transaction_type}
                                </span>
                              </TableCell>
                              <TableCell>{txn.mode}</TableCell>
                              <TableCell>{txn.account_name}</TableCell>
                              <TableCell>{txn.party_name || '-'}</TableCell>
                              <TableCell className="text-right font-bold">{txn.amount?.toFixed(3)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* RETURNS TAB */}
        <TabsContent value="returns" data-testid="returns-content" className="space-y-6">
          {/* Summary Cards */}
          {returnsSummary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card data-testid="total-returns-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Returns</CardTitle>
                  <RotateCcw className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{returnsSummary.total_returns_count}</div>
                  <p className="text-xs text-gray-500 mt-1">Finalized returns only</p>
                </CardContent>
              </Card>

              <Card data-testid="sales-returns-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Sales Returns</CardTitle>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{formatCurrency(returnsSummary.sales_returns_amount)}</div>
                  <p className="text-xs text-gray-500 mt-1">Revenue reduction</p>
                </CardContent>
              </Card>

              <Card data-testid="purchase-returns-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Purchase Returns</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(returnsSummary.purchase_returns_amount)}</div>
                  <p className="text-xs text-gray-500 mt-1">Expense reduction</p>
                </CardContent>
              </Card>

              <Card data-testid="total-refund-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Refund</CardTitle>
                  <Wallet className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">{formatCurrency(returnsSummary.total_refund_amount)}</div>
                  <p className="text-xs text-gray-500 mt-1">All returns combined</p>
                </CardContent>
              </Card>

              <Card data-testid="money-refunded-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Money Refunded</CardTitle>
                  <Banknote className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{formatCurrency(returnsSummary.money_refunded)}</div>
                  <p className="text-xs text-gray-500 mt-1">Cash/bank impact</p>
                </CardContent>
              </Card>

              <Card data-testid="gold-refunded-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Gold Refunded</CardTitle>
                  <Package className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{formatWeight(returnsSummary.gold_refunded)}g</div>
                  <p className="text-xs text-gray-500 mt-1">Inventory impact</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Returns Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Returns Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm">Date From</Label>
                  <Input
                    type="date"
                    value={returnsFilters.date_from}
                    onChange={(e) => setReturnsFilters({...returnsFilters, date_from: e.target.value})}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label className="text-sm">Date To</Label>
                  <Input
                    type="date"
                    value={returnsFilters.date_to}
                    onChange={(e) => setReturnsFilters({...returnsFilters, date_to: e.target.value})}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label className="text-sm">Return Type</Label>
                  <Select value={returnsFilters.return_type} onValueChange={(val) => setReturnsFilters({...returnsFilters, return_type: val})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="sale_return">Sales Return</SelectItem>
                      <SelectItem value="purchase_return">Purchase Return</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-sm">Status</Label>
                  <Select value={returnsFilters.status} onValueChange={(val) => setReturnsFilters({...returnsFilters, status: val})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="finalized">Finalized</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-sm">Refund Mode</Label>
                  <Select value={returnsFilters.refund_mode} onValueChange={(val) => setReturnsFilters({...returnsFilters, refund_mode: val})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="All Modes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Modes</SelectItem>
                      <SelectItem value="money">Money</SelectItem>
                      <SelectItem value="gold">Gold</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-sm">Party</Label>
                  <Select value={returnsFilters.party_id} onValueChange={(val) => setReturnsFilters({...returnsFilters, party_id: val})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="All Parties" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Parties</SelectItem>
                      {parties.map(party => (
                        <SelectItem key={party.id} value={party.id}>{party.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="md:col-span-3">
                  <Label className="text-sm">Search</Label>
                  <Input
                    type="text"
                    placeholder="Return #, Party Name, Reason..."
                    value={returnsFilters.search}
                    onChange={(e) => setReturnsFilters({...returnsFilters, search: e.target.value})}
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div className="flex gap-2 mt-4">
                <Button onClick={() => { loadReturnsReport(); loadReturnsSummary(); }}>
                  <Search className="h-4 w-4 mr-2" />
                  Load Report
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setReturnsFilters({
                      date_from: '',
                      date_to: '',
                      return_type: 'all',
                      status: 'all',
                      refund_mode: 'all',
                      party_id: 'all',
                      search: ''
                    });
                  }}
                >
                  Clear Filters
                </Button>
                <Button variant="outline" onClick={() => exportExcel('returns')}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export Excel
                </Button>
                <Button variant="outline" onClick={() => exportPDF('returns')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Returns Table */}
          {loading && (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              <p className="mt-2 text-gray-500">Loading returns report...</p>
            </div>
          )}

          {!loading && returns && (
            <Card>
              <CardHeader>
                <CardTitle>Returns Details ({returns.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table data-testid="returns-table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Return #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Party</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Refund Mode</TableHead>
                        <TableHead className="text-right">Amount (OMR)</TableHead>
                        <TableHead className="text-right">Gold (g)</TableHead>
                        <TableHead>Invoice/Purchase #</TableHead>
                        <TableHead>Payment Mode</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {returns.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center py-8 text-gray-500">
                            No returns found
                          </TableCell>
                        </TableRow>
                      ) : (
                        returns.map((ret) => (
                          <TableRow key={ret.id}>
                            <TableCell className="font-mono text-sm">{ret.return_number}</TableCell>
                            <TableCell className="text-sm">{ret.date ? new Date(ret.date).toLocaleDateString() : '-'}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded text-xs ${
                                ret.return_type === 'sale_return' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-purple-100 text-purple-800'
                              }`}>
                                {ret.return_type === 'sale_return' ? 'Sales' : 'Purchase'}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm">{ret.party_name || '-'}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded text-xs ${
                                ret.status === 'draft' 
                                  ? 'bg-yellow-100 text-yellow-800' 
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {ret.status}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded text-xs ${
                                ret.refund_mode === 'money' 
                                  ? 'bg-green-100 text-green-800' 
                                  : ret.refund_mode === 'gold'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-orange-100 text-orange-800'
                              }`}>
                                {ret.refund_mode}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {ret.refund_mode === 'money' || ret.refund_mode === 'mixed' 
                                ? formatCurrency(ret.refund_money_amount) 
                                : '-'}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {ret.refund_mode === 'gold' || ret.refund_mode === 'mixed' 
                                ? formatWeight(ret.refund_gold_grams) 
                                : '-'}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {ret.reference_number || ret.reference_id?.substring(0, 8) || '-'}
                            </TableCell>
                            <TableCell className="text-sm capitalize">
                              {ret.payment_mode ? ret.payment_mode.replace('_', ' ') : '-'}
                            </TableCell>
                            <TableCell className="text-sm max-w-xs truncate">
                              {ret.reason || ret.notes || '-'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* INVENTORY TAB */}
        <TabsContent value="inventory" className="space-y-6">
          <GlobalFilters showPartyFilter={false} showSorting={true} exportType="inventory" />

          {/* Inventory Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div>
                  <Label>Movement Type</Label>
                  <Select value={movementType} onValueChange={setMovementType}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="Stock IN">Stock IN</SelectItem>
                      <SelectItem value="Stock OUT">Stock OUT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {Array.isArray(categories) && categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={loadInventoryReport}>
                    <Search className="h-4 w-4 mr-2" />
                    Load Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {loading && (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            </div>
          )}

          {inventoryData && !loading && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Total IN (Qty)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{inventoryData.summary.total_in?.toFixed(2)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Total OUT (Qty)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{inventoryData.summary.total_out?.toFixed(2)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Weight IN (g)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{inventoryData.summary.total_weight_in?.toFixed(3)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Weight OUT (g)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{inventoryData.summary.total_weight_out?.toFixed(3)}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Inventory Movements Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Stock Movements ({inventoryData.count})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Movement Type</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">Weight (g)</TableHead>
                          <TableHead>Reference</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inventoryData.movements.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                              No movements found
                            </TableCell>
                          </TableRow>
                        ) : (
                          inventoryData.movements.map((mov, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{new Date(mov.date).toLocaleDateString()}</TableCell>
                              <TableCell className="font-medium">{mov.header_name}</TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded text-xs ${
                                  mov.movement_type === 'Stock IN' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {mov.movement_type}
                                </span>
                              </TableCell>
                              <TableCell className={`text-right font-bold ${mov.qty_delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {mov.qty_delta >= 0 ? '+' : ''}{mov.qty_delta?.toFixed(2)}
                              </TableCell>
                              <TableCell className={`text-right font-bold ${mov.weight_delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {mov.weight_delta >= 0 ? '+' : ''}{mov.weight_delta?.toFixed(3)}
                              </TableCell>
                              <TableCell>{mov.reference_type || '-'}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
