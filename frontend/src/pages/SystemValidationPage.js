import React, { useState, useEffect } from 'react';
import { API } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function SystemValidationPage() {
  const [validationData, setValidationData] = useState(null);
  const [financeRecon, setFinanceRecon] = useState(null);
  const [inventoryRecon, setInventoryRecon] = useState(null);
  const [goldRecon, setGoldRecon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    loadValidationData();
  }, []);
  
  const loadValidationData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [checklist, finance, inventory, gold] = await Promise.all([
        API.get('/api/system/validation-checklist'),
        API.get('/api/system/reconcile/finance'),
        API.get('/api/system/reconcile/inventory'),
        API.get('/api/system/reconcile/gold')
      ]);
      
      setValidationData(checklist.data);
      setFinanceRecon(finance.data);
      setInventoryRecon(inventory.data);
      setGoldRecon(gold.data);
      toast.success('Validation data loaded successfully');
    } catch (error) {
      console.error('Failed to load validation data:', error);
      setError(error.response?.data?.detail || error.message || 'Failed to load validation data');
      toast.error('Failed to load system validation data');
    } finally {
      setLoading(false);
    }
  };
  
  const getStatusIcon = (passed) => {
    if (passed) {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    } else {
      return <XCircle className="w-5 h-5 text-red-600" />;
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-red-600 font-medium">Error loading validation data</p>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button onClick={loadValidationData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }
  
  if (!validationData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No validation data available</p>
      </div>
    );
  }
  
  return (
    <div data-testid="system-validation-page">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-serif font-semibold text-gray-900 mb-2 flex items-center gap-3">
          <Shield className="w-10 h-10 text-primary" />
          System Validation
        </h1>
        <p className="text-muted-foreground">Final system-wide validation before GO-LIVE certification</p>
      </div>
      
      {/* Overall Status */}
      {validationData && (
        <Card className={`mb-6 ${validationData.all_passed ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {validationData.all_passed ? (
                  <CheckCircle className="w-12 h-12 text-green-600" />
                ) : (
                  <AlertCircle className="w-12 h-12 text-red-600" />
                )}
                <div>
                  <h2 className={`text-2xl font-bold ${validationData.all_passed ? 'text-green-700' : 'text-red-700'}`} data-testid="validation-status">
                    {validationData.message}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {validationData.summary.passed_checks} / {validationData.summary.total_checks} checks passed
                  </p>
                </div>
              </div>
              <Button onClick={loadValidationData} data-testid="refresh-validation-btn">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Validation Checklist */}
      {validationData && validationData.checks.map((category, idx) => (
        <Card key={idx} className="mb-4">
          <CardHeader>
            <CardTitle className="text-xl font-serif">{category.category}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {category.checks.map((check, checkIdx) => (
                <div key={checkIdx} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg" data-testid={`check-${category.category.toLowerCase().replace(/\s+/g, '-')}-${checkIdx}`}>
                  <div className="flex items-center gap-3">
                    {getStatusIcon(check.passed)}
                    <span className="font-medium">{check.name}</span>
                  </div>
                  <span className={`text-sm font-mono ${check.passed ? 'text-green-600' : 'text-red-600'}`}>
                    {check.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
      
      {/* Detailed Reconciliation Results */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        {/* Finance Reconciliation */}
        {financeRecon && (
          <Card className={financeRecon.is_reconciled ? 'border-green-500' : 'border-red-500'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {financeRecon.is_reconciled ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                Finance Reconciliation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Credit</span>
                  <span className="font-mono" data-testid="finance-actual-credit">
                    {financeRecon.actual.total_credit.toFixed(3)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Debit</span>
                  <span className="font-mono" data-testid="finance-actual-debit">
                    {financeRecon.actual.total_debit.toFixed(3)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Net Flow</span>
                  <span className="font-mono" data-testid="finance-actual-netflow">
                    {financeRecon.actual.net_flow.toFixed(3)}
                  </span>
                </div>
                {!financeRecon.is_reconciled && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                    <p className="text-xs text-red-700 font-medium">Discrepancies Detected</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Credit Diff: {financeRecon.difference.credit_diff.toFixed(3)}<br/>
                      Debit Diff: {financeRecon.difference.debit_diff.toFixed(3)}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Inventory Reconciliation */}
        {inventoryRecon && (
          <Card className={inventoryRecon.is_reconciled ? 'border-green-500' : 'border-red-500'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {inventoryRecon.is_reconciled ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                Inventory Reconciliation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Headers</span>
                  <span className="font-mono" data-testid="inventory-total-headers">
                    {inventoryRecon.summary.total_headers}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reconciled</span>
                  <span className="font-mono text-green-600" data-testid="inventory-reconciled-headers">
                    {inventoryRecon.summary.reconciled_headers}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mismatched</span>
                  <span className="font-mono text-red-600" data-testid="inventory-mismatched-headers">
                    {inventoryRecon.summary.mismatched_headers}
                  </span>
                </div>
                {!inventoryRecon.is_reconciled && inventoryRecon.mismatches.length > 0 && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                    <p className="text-xs text-red-700 font-medium mb-2">Mismatched Items:</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {inventoryRecon.mismatches.slice(0, 5).map((mismatch, idx) => (
                        <p key={idx} className="text-xs text-muted-foreground">
                          {mismatch.header_name}: {mismatch.weight_diff.toFixed(3)}g
                        </p>
                      ))}
                      {inventoryRecon.mismatches.length > 5 && (
                        <p className="text-xs text-muted-foreground">
                          +{inventoryRecon.mismatches.length - 5} more...
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Gold Reconciliation */}
        {goldRecon && (
          <Card className={goldRecon.is_reconciled ? 'border-green-500' : 'border-red-500'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {goldRecon.is_reconciled ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                Gold Reconciliation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Parties</span>
                  <span className="font-mono" data-testid="gold-total-parties">
                    {goldRecon.summary.total_parties}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reconciled</span>
                  <span className="font-mono text-green-600" data-testid="gold-reconciled-parties">
                    {goldRecon.summary.reconciled_parties}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mismatched</span>
                  <span className="font-mono text-red-600" data-testid="gold-mismatched-parties">
                    {goldRecon.summary.mismatched_parties}
                  </span>
                </div>
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-xs text-blue-700">
                    {goldRecon.note}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Implementation Notes */}
      <Card className="mt-8 bg-muted/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            System Validation Rules
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h3 className="font-semibold mb-2">Core Rules (NON-NEGOTIABLE)</h3>
              <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                <li>No float usage in calculations</li>
                <li>All finalized records are immutable</li>
                <li>Draft → Finalize → Lock workflow respected</li>
                <li>Soft deletes only</li>
                <li>Audit logs for all actions</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Ledger Discipline</h3>
              <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                <li>Inventory from StockMovements only</li>
                <li>Finance from Transactions only</li>
                <li>Gold from GoldLedger only</li>
                <li>No document-level totals used</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
