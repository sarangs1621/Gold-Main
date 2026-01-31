import React, { useState, useEffect } from 'react';
import { formatWeight, formatCurrency, safeToFixed } from '../utils/numberFormat';
import { API, useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { CalendarCheck, Plus, Lock, Unlock, Calculator, RefreshCw, Edit, AlertCircle } from 'lucide-react';

export default function DailyClosingPage() {
  const { user } = useAuth();
  const [closings, setClosings] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingClosing, setEditingClosing] = useState(null);
  const [calculationData, setCalculationData] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    opening_cash: 0,
    total_credit: 0,
    total_debit: 0,
    actual_closing: 0,
    notes: ''
  });
  const [editFormData, setEditFormData] = useState({
    actual_closing: 0,
    notes: ''
  });

  useEffect(() => {
    loadClosings();
  }, []);

  const loadClosings = async () => {
    try {
      const response = await API.get(`/api/daily-closings`);
      setClosings(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error('Failed to load daily closings');
      setClosings([]);
    }
  };

  const autoCalculateFromTransactions = async () => {
    setIsCalculating(true);
    try {
      const response = await API.get(`/api/daily-closings/calculate/${formData.date}`);
      const data = response.data;
      
      setCalculationData(data);
      setFormData({
        ...formData,
        opening_cash: data.opening_cash,
        total_credit: data.total_credit,
        total_debit: data.total_debit
      });
      
      toast.success(`Auto-calculated from ${data.transaction_count} transactions`);
    } catch (error) {
      toast.error('Failed to auto-calculate. You can enter values manually.');
    } finally {
      setIsCalculating(false);
    }
  };

  const calculateExpectedClosing = () => {
    const opening = parseFloat(formData.opening_cash) || 0;
    const credit = parseFloat(formData.total_credit) || 0;
    const debit = parseFloat(formData.total_debit) || 0;
    return opening + credit - debit;
  };

  const calculateDifference = () => {
    const expected = calculateExpectedClosing();
    const actual = parseFloat(formData.actual_closing) || 0;
    return actual - expected;
  };

  const handleCreateClosing = async () => {
    try {
      const expected = calculateExpectedClosing();
      const difference = calculateDifference();
      
      const data = {
        date: formData.date,
        opening_cash: parseFloat(formData.opening_cash),
        total_credit: parseFloat(formData.total_credit),
        total_debit: parseFloat(formData.total_debit),
        expected_closing: expected,
        actual_closing: parseFloat(formData.actual_closing),
        difference: difference,
        is_locked: false,
        notes: formData.notes
      };
      
      await API.post(`/api/daily-closings`, data);
      toast.success('Daily closing created successfully');
      setShowDialog(false);
      setCalculationData(null);
      loadClosings();
      
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        opening_cash: 0,
        total_credit: 0,
        total_debit: 0,
        actual_closing: 0,
        notes: ''
      });
    } catch (error) {
      toast.error('Failed to create daily closing');
    }
  };

  const handleEdit = (closing) => {
    setEditingClosing(closing);
    setEditFormData({
      actual_closing: closing.actual_closing,
      notes: closing.notes || ''
    });
    setShowEditDialog(true);
  };

  const handleUpdateClosing = async () => {
    try {
      const updateData = {
        actual_closing: parseFloat(editFormData.actual_closing),
        notes: editFormData.notes
      };
      
      await API.patch(`/api/daily-closings/${editingClosing.id}`, updateData);
      toast.success('Daily closing updated successfully');
      setShowEditDialog(false);
      setEditingClosing(null);
      loadClosings();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Failed to update daily closing';
      toast.error(errorMsg);
    }
  };

  const handleToggleLock = async (closing) => {
    // Check if user is admin
    if (user?.role !== 'admin') {
      toast.error('Only admins can lock/unlock daily closings');
      return;
    }

    const newLockStatus = !closing.is_locked;
    const action = newLockStatus ? 'lock' : 'unlock';
    
    try {
      await API.patch(`/api/daily-closings/${closing.id}`, { is_locked: newLockStatus });
      toast.success(`Daily closing ${action}ed successfully`);
      loadClosings();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || `Failed to ${action} daily closing`;
      toast.error(errorMsg);
    }
  };

  const isAdmin = () => {
    return user?.role === 'admin';
  };


  const getDifferenceColor = (difference) => {
    if (difference === 0) return 'text-green-600';
    if (Math.abs(difference) <= 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBadge = (isLocked) => {
    return isLocked ? (
      <Badge className="bg-red-100 text-red-800">
        <Lock className="w-3 h-3 mr-1" /> Locked
      </Badge>
    ) : (
      <Badge className="bg-green-100 text-green-800">
        <Unlock className="w-3 h-3 mr-1" /> Unlocked
      </Badge>
    );
  };

  const handleOpenDialog = async () => {
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      date: today,
      opening_cash: 0,
      total_credit: 0,
      total_debit: 0,
      actual_closing: 0,
      notes: ''
    });
    setCalculationData(null);
    setShowDialog(true);
    
    // Auto-calculate immediately when opening dialog for today
    setTimeout(() => {
      if (showDialog) return; // Prevent double call
      setIsCalculating(true);
      API.get(`/api/daily-closings/calculate/${today}`)
        .then(response => {
          const data = response.data;
          setCalculationData(data);
          setFormData(prev => ({
            ...prev,
            opening_cash: data.opening_cash,
            total_credit: data.total_credit,
            total_debit: data.total_debit
          }));
          if (data.transaction_count > 0) {
            toast.success(`Auto-calculated from ${data.transaction_count} transactions`);
          }
        })
        .catch(() => {
          // Silent fail - user can still enter manually
        })
        .finally(() => {
          setIsCalculating(false);
        });
    }, 300);
  };

  return (
    <div data-testid="daily-closing-page">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-serif font-semibold text-gray-900 mb-2">Daily Closing</h1>
          <p className="text-muted-foreground">Daily cash reconciliation and closing</p>
        </div>
        <Button data-testid="create-closing-button" onClick={handleOpenDialog}>
          <Plus className="w-4 h-4 mr-2" /> Create Daily Closing
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-serif flex items-center gap-2">
            <CalendarCheck className="w-5 h-5" />
            Daily Closing Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          {closings.length === 0 ? (
            <p className="text-muted-foreground">No daily closing records found. Create your first one!</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="closings-table">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Date</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Opening Cash</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Credit</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Debit</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Expected</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Actual</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Difference</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {closings.map((closing) => (
                    <tr key={closing.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono">
                        {new Date(closing.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {closing.opening_cash.toFixed(3)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-green-600">
                        +{closing.total_credit.toFixed(3)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-red-600">
                        -{closing.total_debit.toFixed(3)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">
                        {closing.expected_closing.toFixed(3)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">
                        {closing.actual_closing.toFixed(3)}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono font-bold ${getDifferenceColor(closing.difference)}`}>
                        {closing.difference >= 0 ? '+' : ''}{closing.difference.toFixed(3)}
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(closing.is_locked)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {!closing.is_locked && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(closing)}
                              data-testid={`edit-closing-${closing.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          {isAdmin() && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleLock(closing)}
                              data-testid={`toggle-lock-${closing.id}`}
                              className={closing.is_locked ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                            >
                              {closing.is_locked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Daily Closing</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date</Label>
                <Input
                  data-testid="closing-date-input"
                  type="date"
                  value={formData.date}
                  onChange={(e) => {
                    setFormData({...formData, date: e.target.value});
                    setCalculationData(null); // Reset calculation when date changes
                  }}
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={autoCalculateFromTransactions}
                  disabled={isCalculating}
                  variant="outline"
                  className="w-full"
                  data-testid="auto-calculate-button"
                >
                  {isCalculating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Calculating...
                    </>
                  ) : (
                    <>
                      <Calculator className="w-4 h-4 mr-2" /> Auto-Calculate from Transactions
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Show calculation summary if available */}
            {calculationData && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md space-y-2">
                <div className="flex items-center gap-2 text-blue-900 font-medium">
                  <Calculator className="w-4 h-4" />
                  Auto-Calculation Summary
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-blue-700">Total Transactions:</div>
                  <div className="font-mono">{calculationData.transaction_count} ({calculationData.credit_count} credits, {calculationData.debit_count} debits)</div>
                  <div className="text-blue-700">Previous Closing:</div>
                  <div className="font-mono">{calculationData.has_previous_closing ? '✓ Found' : '✗ Not found (first day)'}</div>
                </div>
                <div className="text-xs text-blue-600 mt-2">
                  💡 Values have been auto-filled. You can manually adjust them if needed.
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Opening Cash (OMR)</Label>
                <Input
                  data-testid="opening-cash-input"
                  type="number"
                  step="0.001"
                  value={formData.opening_cash}
                  onChange={(e) => setFormData({...formData, opening_cash: e.target.value})}
                />
              </div>
              <div>
                <Label>Total Credit (OMR)</Label>
                <Input
                  data-testid="total-credit-input"
                  type="number"
                  step="0.001"
                  value={formData.total_credit}
                  onChange={(e) => setFormData({...formData, total_credit: e.target.value})}
                />
              </div>
              <div>
                <Label>Total Debit (OMR)</Label>
                <Input
                  data-testid="total-debit-input"
                  type="number"
                  step="0.001"
                  value={formData.total_debit}
                  onChange={(e) => setFormData({...formData, total_debit: e.target.value})}
                />
              </div>
            </div>

            {/* Calculated Values */}
            <div className="p-4 bg-muted/30 rounded-md space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">Expected Closing:</span>
                <span className="text-lg font-bold">{calculateExpectedClosing().toFixed(3)} OMR</span>
              </div>
              <div className="text-xs text-muted-foreground">
                = Opening Cash ({parseFloat(formData.opening_cash || 0).toFixed(3)}) + 
                Credit ({parseFloat(formData.total_credit || 0).toFixed(3)}) - 
                Debit ({parseFloat(formData.total_debit || 0).toFixed(3)})
              </div>
            </div>

            <div>
              <Label>Actual Closing Cash (OMR)</Label>
              <Input
                data-testid="actual-closing-input"
                type="number"
                step="0.001"
                value={formData.actual_closing}
                onChange={(e) => setFormData({...formData, actual_closing: e.target.value})}
              />
            </div>

            {/* Difference Display */}
            {formData.actual_closing && (
              <div className={`p-4 rounded-md border-2 ${
                calculateDifference() === 0 ? 'bg-green-50 border-green-200' :
                Math.abs(calculateDifference()) <= 10 ? 'bg-yellow-50 border-yellow-200' :
                'bg-red-50 border-red-200'
              }`}>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Difference:</span>
                  <span className={`text-xl font-bold ${getDifferenceColor(calculateDifference())}`}>
                    {calculateDifference() >= 0 ? '+' : ''}{calculateDifference().toFixed(3)} OMR
                  </span>
                </div>
                <p className="text-xs mt-1 text-muted-foreground">
                  {calculateDifference() === 0 && 'Perfect match! ✓'}
                  {calculateDifference() > 0 && 'Cash surplus detected'}
                  {calculateDifference() < 0 && 'Cash shortage detected'}
                </p>
              </div>
            )}

            <div>
              <Label>Notes (Optional)</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Any remarks or explanations"
              />
            </div>

            <Button 
              data-testid="save-closing-button" 
              onClick={handleCreateClosing} 
              className="w-full"
            >
              Create Daily Closing
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Daily Closing</DialogTitle>
          </DialogHeader>
          {editingClosing && (
            <div className="space-y-4 mt-4">
              {/* Display date and calculated values (read-only) */}
              <div className="p-4 bg-muted/30 rounded-md space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-mono font-semibold">
                    {new Date(editingClosing.date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Expected Closing:</span>
                  <span className="font-mono font-semibold">
                    {editingClosing.expected_closing.toFixed(3)} OMR
                  </span>
                </div>
              </div>

              <div>
                <Label>Actual Closing Cash (OMR) *</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={editFormData.actual_closing}
                  onChange={(e) => setEditFormData({...editFormData, actual_closing: e.target.value})}
                  data-testid="edit-actual-closing-input"
                />
              </div>

              {/* Show new difference */}
              {editFormData.actual_closing && (
                <div className={`p-4 rounded-md border-2 ${
                  (parseFloat(editFormData.actual_closing) - editingClosing.expected_closing) === 0 ? 'bg-green-50 border-green-200' :
                  Math.abs(parseFloat(editFormData.actual_closing) - editingClosing.expected_closing) <= 10 ? 'bg-yellow-50 border-yellow-200' :
                  'bg-red-50 border-red-200'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">New Difference:</span>
                    <span className={`text-lg font-bold ${getDifferenceColor(parseFloat(editFormData.actual_closing) - editingClosing.expected_closing)}`}>
                      {(parseFloat(editFormData.actual_closing) - editingClosing.expected_closing) >= 0 ? '+' : ''}
                      {(parseFloat(editFormData.actual_closing) - editingClosing.expected_closing).toFixed(3)} OMR
                    </span>
                  </div>
                </div>
              )}

              <div>
                <Label>Notes (Optional)</Label>
                <Input
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({...editFormData, notes: e.target.value})}
                  placeholder="Any remarks or explanations"
                  data-testid="edit-notes-input"
                />
              </div>

              {/* Warning for locked closings (shouldn't happen, but safety check) */}
              {editingClosing.is_locked && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-semibold">Warning: This closing is locked</p>
                    <p>You should not be able to edit a locked closing.</p>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline"
                  onClick={() => setShowEditDialog(false)} 
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdateClosing} 
                  className="flex-1"
                  data-testid="update-closing-button"
                >
                  Update Closing
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
