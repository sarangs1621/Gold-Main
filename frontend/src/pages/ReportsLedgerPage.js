import React, { useState, useEffect, useCallback } from 'react';
import { formatWeight, formatCurrency, safeToFixed } from '../utils/numberFormat';
import { API } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import {
  Download,
  FileSpreadsheet,
  Package,
  Wallet,
  Coins,
  Filter,
  X,
  RotateCcw,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Info
} from 'lucide-react';
import Pagination from '../components/Pagination';
import { formatDate } from '../utils/dateTimeUtils';
import { usePermission } from '../hooks/usePermission';
import { Alert, AlertDescription } from '../components/ui/alert';

/**
 * MODULE 8: LEDGER-BASED REPORTS (TRUTH-ONLY)
 * 
 * CRITICAL RULES:
 * - ALL reports read ONLY from ledgers (StockMovements, Transactions, GoldLedger)
 * - NEVER derive totals from documents (Invoices, Purchases, Returns)
 * - Server-side filtering ONLY
 * - Every report row traceable to ledger entry
 * 
 * Report Categories:
 * 1. INVENTORY REPORTS → StockMovements ledger
 * 2. FINANCE REPORTS → Transactions ledger
 * 3. GOLD REPORTS → GoldLedger
 */

export default function ReportsLedgerPage() {
  const [activeTab, setActiveTab] = useState('inventory');
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  // Permissions
  const hasInventoryPermission = usePermission('reports.inventory.view');
  const hasFinancePermission = usePermission('reports.finance.view');
  const hasGoldPermission = usePermission('reports.gold.view');

  // Get default date range (current month)
  const getDefaultDateRange = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = new Date();
    
    return {
      date_from: firstDay.toISOString().split('T')[0],
      date_to: today.toISOString().split('T')[0]
    };
  };

  // ============================================================================
  // INVENTORY REPORTS STATE
  // ============================================================================
  const [inventoryReport, setInventoryReport] = useState(null);
  const [inventoryFilters, setInventoryFilters] = useState({
    ...getDefaultDateRange(),
    movement_type: '',
    source_type: '',
    header_id: '',
    purity: ''
  });
  const [inventoryPage, setInventoryPage] = useState(1);
  const [inventoryHeaders, setInventoryHeaders] = useState([]);

  // ============================================================================
  // FINANCE REPORTS STATE
  // ============================================================================
  const [financeReport, setFinanceReport] = useState(null);
  const [financeFilters, setFinanceFilters] = useState({
    ...getDefaultDateRange(),
    transaction_type: '',
    account_id: '',
    party_id: '',
    mode: '',
    category: ''
  });
  const [financePage, setFinancePage] = useState(1);
  const [accounts, setAccounts] = useState([]);
  const [parties, setParties] = useState([]);

  // ============================================================================
  // GOLD REPORTS STATE
  // ============================================================================
  const [goldReport, setGoldReport] = useState(null);
  const [goldFilters, setGoldFilters] = useState({
    ...getDefaultDateRange(),
    type: '',
    party_id: '',
    purpose: ''
  });
  const [goldPage, setGoldPage] = useState(1);

  // ============================================================================
  // INITIAL DATA LOAD
  // ============================================================================
  useEffect(() => {
    // Load master data
    loadInventoryHeaders();
    loadAccounts();
    loadParties();
  }, []);

  useEffect(() => {
    // Load active tab data
    if (activeTab === 'inventory' && hasInventoryPermission) {
      loadInventoryReport();
    } else if (activeTab === 'finance' && hasFinancePermission) {
      loadFinanceReport();
    } else if (activeTab === 'gold' && hasGoldPermission) {
      loadGoldReport();
    }
  }, [activeTab, inventoryFilters, inventoryPage, financeFilters, financePage, goldFilters, goldPage]);

  // ============================================================================
  // MASTER DATA LOADERS
  // ============================================================================
  const loadInventoryHeaders = async () => {
    try {
      const response = await API.get('/api/inventory-headers');
      setInventoryHeaders(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to load inventory headers:', error);
    }
  };

  const loadAccounts = async () => {
    try {
      const response = await API.get('/api/accounts');
      setAccounts(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const loadParties = async () => {
    try {
      const response = await API.get('/api/parties');
      setParties(Array.isArray(response.data) ? response.data : response.data.items || []);
    } catch (error) {
      console.error('Failed to load parties:', error);
    }
  };

  // ============================================================================
  // INVENTORY REPORT LOADERS
  // ============================================================================
  const loadInventoryReport = async () => {
    setLoading(true);
    try {
      const params = {
        page: inventoryPage,
        page_size: 50,
        date_from: inventoryFilters.date_from,
        date_to: inventoryFilters.date_to
      };

      if (inventoryFilters.movement_type) params.movement_type = inventoryFilters.movement_type;
      if (inventoryFilters.source_type) params.source_type = inventoryFilters.source_type;
      if (inventoryFilters.header_id) params.header_id = inventoryFilters.header_id;
      if (inventoryFilters.purity) params.purity = inventoryFilters.purity;

      const response = await API.get('/api/reports/ledger/stock-movements', { params });
      setInventoryReport(response.data);
    } catch (error) {
      console.error('Failed to load inventory report:', error);
      toast.error('Failed to load inventory report');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // FINANCE REPORT LOADERS
  // ============================================================================
  const loadFinanceReport = async () => {
    setLoading(true);
    try {
      const params = {
        page: financePage,
        page_size: 50,
        date_from: financeFilters.date_from,
        date_to: financeFilters.date_to
      };

      if (financeFilters.transaction_type) params.transaction_type = financeFilters.transaction_type;
      if (financeFilters.account_id) params.account_id = financeFilters.account_id;
      if (financeFilters.party_id) params.party_id = financeFilters.party_id;
      if (financeFilters.mode) params.mode = financeFilters.mode;
      if (financeFilters.category) params.category = financeFilters.category;

      const response = await API.get('/api/reports/ledger/transactions', { params });
      setFinanceReport(response.data);
    } catch (error) {
      console.error('Failed to load finance report:', error);
      toast.error('Failed to load finance report');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // GOLD REPORT LOADERS
  // ============================================================================
  const loadGoldReport = async () => {
    setLoading(true);
    try {
      const params = {
        page: goldPage,
        page_size: 50,
        date_from: goldFilters.date_from,
        date_to: goldFilters.date_to
      };

      if (goldFilters.type) params.type = goldFilters.type;
      if (goldFilters.party_id) params.party_id = goldFilters.party_id;
      if (goldFilters.purpose) params.purpose = goldFilters.purpose;

      const response = await API.get('/api/reports/ledger/gold-movements', { params });
      setGoldReport(response.data);
    } catch (error) {
      console.error('Failed to load gold report:', error);
      toast.error('Failed to load gold report');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // FILTER RESET HANDLERS
  // ============================================================================
  const resetInventoryFilters = () => {
    setInventoryFilters({
      ...getDefaultDateRange(),
      movement_type: '',
      source_type: '',
      header_id: '',
      purity: ''
    });
    setInventoryPage(1);
  };

  const resetFinanceFilters = () => {
    setFinanceFilters({
      ...getDefaultDateRange(),
      transaction_type: '',
      account_id: '',
      party_id: '',
      mode: '',
      category: ''
    });
    setFinancePage(1);
  };

  const resetGoldFilters = () => {
    setGoldFilters({
      ...getDefaultDateRange(),
      type: '',
      party_id: '',
      purpose: ''
    });
    setGoldPage(1);
  };

  // ============================================================================
  // RENDER: INVENTORY TAB
  // ============================================================================
  const renderInventoryTab = () => {
    if (!hasInventoryPermission) {
      return (
        <Alert className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to view inventory reports. Contact your administrator.
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="space-y-4">
        {/* Info Banner */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>MODULE 8: INVENTORY TRUTH</strong> - All data sourced from StockMovements ledger only. 
            Every entry is traceable to its source transaction.
          </AlertDescription>
        </Alert>

        {/* Filters */}
        {showFilters && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </span>
                <Button variant="ghost" size="sm" onClick={resetInventoryFilters}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="inv-date-from">Date From</Label>
                  <Input
                    id="inv-date-from"
                    type="date"
                    value={inventoryFilters.date_from}
                    onChange={(e) => setInventoryFilters({...inventoryFilters, date_from: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="inv-date-to">Date To</Label>
                  <Input
                    id="inv-date-to"
                    type="date"
                    value={inventoryFilters.date_to}
                    onChange={(e) => setInventoryFilters({...inventoryFilters, date_to: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="inv-movement-type">Movement Type</Label>
                  <Select 
                    value={inventoryFilters.movement_type} 
                    onValueChange={(value) => setInventoryFilters({...inventoryFilters, movement_type: value})}
                  >
                    <SelectTrigger id="inv-movement-type">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Types</SelectItem>
                      <SelectItem value="IN">IN</SelectItem>
                      <SelectItem value="OUT">OUT</SelectItem>
                      <SelectItem value="ADJUSTMENT">ADJUSTMENT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="inv-source-type">Source Type</Label>
                  <Select 
                    value={inventoryFilters.source_type} 
                    onValueChange={(value) => setInventoryFilters({...inventoryFilters, source_type: value})}
                  >
                    <SelectTrigger id="inv-source-type">
                      <SelectValue placeholder="All Sources" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Sources</SelectItem>
                      <SelectItem value="SALE">SALE</SelectItem>
                      <SelectItem value="PURCHASE">PURCHASE</SelectItem>
                      <SelectItem value="MANUAL">MANUAL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="inv-header">Item</Label>
                  <Select 
                    value={inventoryFilters.header_id} 
                    onValueChange={(value) => setInventoryFilters({...inventoryFilters, header_id: value})}
                  >
                    <SelectTrigger id="inv-header">
                      <SelectValue placeholder="All Items" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Items</SelectItem>
                      {inventoryHeaders.map((header) => (
                        <SelectItem key={header.id} value={header.id}>
                          {header.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="inv-purity">Purity</Label>
                  <Select 
                    value={inventoryFilters.purity} 
                    onValueChange={(value) => setInventoryFilters({...inventoryFilters, purity: value})}
                  >
                    <SelectTrigger id="inv-purity">
                      <SelectValue placeholder="All Purities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Purities</SelectItem>
                      <SelectItem value="916">916 (22K)</SelectItem>
                      <SelectItem value="995">995 (24K)</SelectItem>
                      <SelectItem value="999">999 (24K Fine)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Card */}
        {inventoryReport && inventoryReport.summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total IN</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatWeight(inventoryReport.summary.total_in)}g
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total OUT</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatWeight(inventoryReport.summary.total_out)}g
                    </p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Net Weight</p>
                    <p className="text-2xl font-bold">
                      {formatWeight(inventoryReport.summary.net_weight)}g
                    </p>
                  </div>
                  <Package className="h-8 w-8" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Stock Movements (Ledger)</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled title="Export coming soon">
                  <Download className="h-4 w-4 mr-2" />
                  Export (Soon)
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              Showing {inventoryReport?.movements?.length || 0} movements
              {inventoryReport?.pagination && ` (Page ${inventoryReport.pagination.page} of ${inventoryReport.pagination.total_pages})`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : inventoryReport && inventoryReport.movements && inventoryReport.movements.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="inventory-ledger-table">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left">Date</th>
                      <th className="p-2 text-left">Item</th>
                      <th className="p-2 text-left">Type</th>
                      <th className="p-2 text-left">Source</th>
                      <th className="p-2 text-right">Weight (g)</th>
                      <th className="p-2 text-center">Purity</th>
                      <th className="p-2 text-left">Entry ID</th>
                      <th className="p-2 text-left">Ref ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryReport.movements.map((movement, index) => (
                      <tr key={movement.id || index} className="border-b hover:bg-muted/50">
                        <td className="p-2">{formatDate(movement.date)}</td>
                        <td className="p-2">{movement.header_name || 'Unknown'}</td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            movement.movement_type === 'IN' ? 'bg-green-100 text-green-800' :
                            movement.movement_type === 'OUT' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {movement.movement_type}
                          </span>
                        </td>
                        <td className="p-2 text-xs">{movement.source_type || 'N/A'}</td>
                        <td className="p-2 text-right font-mono">
                          {formatWeight(movement.weight)}
                        </td>
                        <td className="p-2 text-center">{movement.purity || '-'}</td>
                        <td className="p-2 text-xs font-mono" title={movement.id}>
                          {movement.id?.substring(0, 8)}...
                        </td>
                        <td className="p-2 text-xs font-mono" title={movement.source_id}>
                          {movement.source_id ? `${movement.source_id.substring(0, 8)}...` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No stock movements found for the selected filters.
              </div>
            )}

            {/* Pagination */}
            {inventoryReport && inventoryReport.pagination && inventoryReport.pagination.total_pages > 1 && (
              <div className="mt-4 flex justify-center">
                <Pagination
                  currentPage={inventoryPage}
                  totalPages={inventoryReport.pagination.total_pages}
                  onPageChange={setInventoryPage}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // ============================================================================
  // RENDER: FINANCE TAB
  // ============================================================================
  const renderFinanceTab = () => {
    if (!hasFinancePermission) {
      return (
        <Alert className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to view finance reports. Contact your administrator.
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="space-y-4">
        {/* Info Banner */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>MODULE 8: FINANCE TRUTH</strong> - All data sourced from Transactions ledger only. 
            Net Flow = Total Credit - Total Debit.
          </AlertDescription>
        </Alert>

        {/* Filters */}
        {showFilters && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </span>
                <Button variant="ghost" size="sm" onClick={resetFinanceFilters}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="fin-date-from">Date From</Label>
                  <Input
                    id="fin-date-from"
                    type="date"
                    value={financeFilters.date_from}
                    onChange={(e) => setFinanceFilters({...financeFilters, date_from: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="fin-date-to">Date To</Label>
                  <Input
                    id="fin-date-to"
                    type="date"
                    value={financeFilters.date_to}
                    onChange={(e) => setFinanceFilters({...financeFilters, date_to: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="fin-txn-type">Transaction Type</Label>
                  <Select 
                    value={financeFilters.transaction_type} 
                    onValueChange={(value) => setFinanceFilters({...financeFilters, transaction_type: value})}
                  >
                    <SelectTrigger id="fin-txn-type">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Types</SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                      <SelectItem value="debit">Debit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="fin-account">Account</Label>
                  <Select 
                    value={financeFilters.account_id} 
                    onValueChange={(value) => setFinanceFilters({...financeFilters, account_id: value})}
                  >
                    <SelectTrigger id="fin-account">
                      <SelectValue placeholder="All Accounts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Accounts</SelectItem>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="fin-party">Party</Label>
                  <Select 
                    value={financeFilters.party_id} 
                    onValueChange={(value) => setFinanceFilters({...financeFilters, party_id: value})}
                  >
                    <SelectTrigger id="fin-party">
                      <SelectValue placeholder="All Parties" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Parties</SelectItem>
                      {parties.map((party) => (
                        <SelectItem key={party.id} value={party.id}>
                          {party.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="fin-mode">Payment Mode</Label>
                  <Select 
                    value={financeFilters.mode} 
                    onValueChange={(value) => setFinanceFilters({...financeFilters, mode: value})}
                  >
                    <SelectTrigger id="fin-mode">
                      <SelectValue placeholder="All Modes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Modes</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Card">Card</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Card */}
        {financeReport && financeReport.summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Credit</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(financeReport.summary.total_credit)}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Debit</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(financeReport.summary.total_debit)}
                    </p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Net Flow</p>
                    <p className={`text-2xl font-bold ${
                      financeReport.summary.net_flow >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(financeReport.summary.net_flow)}
                    </p>
                  </div>
                  <Wallet className="h-8 w-8" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Transaction Ledger</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled title="Export coming soon">
                  <Download className="h-4 w-4 mr-2" />
                  Export (Soon)
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              Showing {financeReport?.transactions?.length || 0} transactions
              {financeReport?.pagination && ` (Page ${financeReport.pagination.page} of ${financeReport.pagination.total_pages})`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : financeReport && financeReport.transactions && financeReport.transactions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="finance-ledger-table">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left">Date</th>
                      <th className="p-2 text-left">Txn #</th>
                      <th className="p-2 text-left">Account</th>
                      <th className="p-2 text-left">Party</th>
                      <th className="p-2 text-left">Type</th>
                      <th className="p-2 text-right">Amount</th>
                      <th className="p-2 text-left">Mode</th>
                      <th className="p-2 text-left">Entry ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financeReport.transactions.map((txn, index) => (
                      <tr key={txn.id || index} className="border-b hover:bg-muted/50">
                        <td className="p-2">{formatDate(txn.date)}</td>
                        <td className="p-2 text-xs font-mono">{txn.transaction_number}</td>
                        <td className="p-2">{txn.account_name || 'Unknown'}</td>
                        <td className="p-2">{txn.party_name || '-'}</td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            txn.transaction_type === 'credit' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {txn.transaction_type?.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-2 text-right font-mono">
                          {formatCurrency(txn.amount)}
                        </td>
                        <td className="p-2 text-xs">{txn.mode || '-'}</td>
                        <td className="p-2 text-xs font-mono" title={txn.id}>
                          {txn.id?.substring(0, 8)}...
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No transactions found for the selected filters.
              </div>
            )}

            {/* Pagination */}
            {financeReport && financeReport.pagination && financeReport.pagination.total_pages > 1 && (
              <div className="mt-4 flex justify-center">
                <Pagination
                  currentPage={financePage}
                  totalPages={financeReport.pagination.total_pages}
                  onPageChange={setFinancePage}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // ============================================================================
  // RENDER: GOLD TAB
  // ============================================================================
  const renderGoldTab = () => {
    if (!hasGoldPermission) {
      return (
        <Alert className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to view gold reports. Contact your administrator.
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="space-y-4">
        {/* Info Banner */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>MODULE 8: GOLD TRUTH</strong> - All data sourced from GoldLedger only. 
            IN = Shop receives gold, OUT = Shop gives gold.
          </AlertDescription>
        </Alert>

        {/* Filters */}
        {showFilters && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </span>
                <Button variant="ghost" size="sm" onClick={resetGoldFilters}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="gold-date-from">Date From</Label>
                  <Input
                    id="gold-date-from"
                    type="date"
                    value={goldFilters.date_from}
                    onChange={(e) => setGoldFilters({...goldFilters, date_from: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="gold-date-to">Date To</Label>
                  <Input
                    id="gold-date-to"
                    type="date"
                    value={goldFilters.date_to}
                    onChange={(e) => setGoldFilters({...goldFilters, date_to: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="gold-type">Type</Label>
                  <Select 
                    value={goldFilters.type} 
                    onValueChange={(value) => setGoldFilters({...goldFilters, type: value})}
                  >
                    <SelectTrigger id="gold-type">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Types</SelectItem>
                      <SelectItem value="IN">IN (Shop Receives)</SelectItem>
                      <SelectItem value="OUT">OUT (Shop Gives)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="gold-party">Party</Label>
                  <Select 
                    value={goldFilters.party_id} 
                    onValueChange={(value) => setGoldFilters({...goldFilters, party_id: value})}
                  >
                    <SelectTrigger id="gold-party">
                      <SelectValue placeholder="All Parties" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Parties</SelectItem>
                      {parties.map((party) => (
                        <SelectItem key={party.id} value={party.id}>
                          {party.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="gold-purpose">Purpose</Label>
                  <Select 
                    value={goldFilters.purpose} 
                    onValueChange={(value) => setGoldFilters({...goldFilters, purpose: value})}
                  >
                    <SelectTrigger id="gold-purpose">
                      <SelectValue placeholder="All Purposes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Purposes</SelectItem>
                      <SelectItem value="job_work">Job Work</SelectItem>
                      <SelectItem value="exchange">Exchange</SelectItem>
                      <SelectItem value="advance_gold">Advance Gold</SelectItem>
                      <SelectItem value="adjustment">Adjustment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Card */}
        {goldReport && goldReport.summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Gold IN</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatWeight(goldReport.summary.total_in)}g
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Gold OUT</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatWeight(goldReport.summary.total_out)}g
                    </p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Net Gold</p>
                    <p className={`text-2xl font-bold ${
                      goldReport.summary.net_gold >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatWeight(goldReport.summary.net_gold)}g
                    </p>
                  </div>
                  <Coins className="h-8 w-8" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Gold Movement Ledger</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled title="Export coming soon">
                  <Download className="h-4 w-4 mr-2" />
                  Export (Soon)
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              Showing {goldReport?.movements?.length || 0} movements
              {goldReport?.pagination && ` (Page ${goldReport.pagination.page} of ${goldReport.pagination.total_pages})`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : goldReport && goldReport.movements && goldReport.movements.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="gold-ledger-table">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left">Date</th>
                      <th className="p-2 text-left">Type</th>
                      <th className="p-2 text-left">Purpose</th>
                      <th className="p-2 text-right">Weight (g)</th>
                      <th className="p-2 text-center">Purity</th>
                      <th className="p-2 text-left">Ref Type</th>
                      <th className="p-2 text-left">Entry ID</th>
                      <th className="p-2 text-left">Ref ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {goldReport.movements.map((movement, index) => (
                      <tr key={movement.id || index} className="border-b hover:bg-muted/50">
                        <td className="p-2">{formatDate(movement.date)}</td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            movement.type === 'IN' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {movement.type}
                          </span>
                        </td>
                        <td className="p-2 text-xs">{movement.purpose || '-'}</td>
                        <td className="p-2 text-right font-mono">
                          {formatWeight(movement.weight_grams)}
                        </td>
                        <td className="p-2 text-center">{movement.purity_entered || '-'}</td>
                        <td className="p-2 text-xs">{movement.reference_type || '-'}</td>
                        <td className="p-2 text-xs font-mono" title={movement.id}>
                          {movement.id?.substring(0, 8)}...
                        </td>
                        <td className="p-2 text-xs font-mono" title={movement.reference_id}>
                          {movement.reference_id ? `${movement.reference_id.substring(0, 8)}...` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No gold movements found for the selected filters.
              </div>
            )}

            {/* Pagination */}
            {goldReport && goldReport.pagination && goldReport.pagination.total_pages > 1 && (
              <div className="mt-4 flex justify-center">
                <Pagination
                  currentPage={goldPage}
                  totalPages={goldReport.pagination.total_pages}
                  onPageChange={setGoldPage}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  return (
    <div className="container mx-auto p-4 space-y-6" data-testid="reports-ledger-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ledger Reports</h1>
          <p className="text-muted-foreground mt-1">
            MODULE 8: Truth-only reports from authoritative ledgers
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4 mr-2" />
          {showFilters ? 'Hide' : 'Show'} Filters
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="inventory" disabled={!hasInventoryPermission}>
            <Package className="h-4 w-4 mr-2" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="finance" disabled={!hasFinancePermission}>
            <Wallet className="h-4 w-4 mr-2" />
            Finance
          </TabsTrigger>
          <TabsTrigger value="gold" disabled={!hasGoldPermission}>
            <Coins className="h-4 w-4 mr-2" />
            Gold
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          {renderInventoryTab()}
        </TabsContent>

        <TabsContent value="finance">
          {renderFinanceTab()}
        </TabsContent>

        <TabsContent value="gold">
          {renderGoldTab()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
