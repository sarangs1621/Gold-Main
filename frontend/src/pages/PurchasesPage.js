import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { API } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Package, CheckCircle, Lock, Edit, ShoppingCart, Calendar, Trash2, Eye, AlertTriangle, DollarSign, Plus, X } from 'lucide-react';
import { extractErrorMessage } from '../utils/errorHandler';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { 
  validateWeight, 
  validateAmount, 
  validatePurity,
  validateSelection 
} from '../utils/validation';
import { FormErrorMessage } from '../components/FormErrorMessage';
import { PageLoadingSpinner, TableLoadingSpinner, ButtonLoadingSpinner } from '../components/LoadingSpinner';
import { TableEmptyState } from '../components/EmptyState';
import Pagination from '../components/Pagination';
import { formatWeight, formatCurrency, safeToFixed } from '../utils/numberFormat';
import { formatDateTime, formatDate } from '../utils/dateTimeUtils';

export default function PurchasesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [purchases, setPurchases] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [shopSettings, setShopSettings] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState(null);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // View dialog state
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [viewPurchase, setViewPurchase] = useState(null);
  
  // Finalize dialog state
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [finalizingPurchase, setFinalizingPurchase] = useState(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  
  // Confirmation Dialogs
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmPurchase, setConfirmPurchase] = useState(null);
  const [impactData, setImpactData] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  
  // MODULE 5: Payment dialog state
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentPurchase, setPaymentPurchase] = useState(null);
  const [paymentData, setPaymentData] = useState({
    payment_amount: '',
    payment_mode: 'Cash',
    account_id: '',
    reference: '',
    notes: ''
  });
  const [accounts, setAccounts] = useState([]);
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [paymentErrors, setPaymentErrors] = useState({});
  
  // Filters
  const [filterVendor, setFilterVendor] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Form validation errors
  const [errors, setErrors] = useState({});

  // MODULE 4: Form data with vendor type, items array, and conversion factor
  const [formData, setFormData] = useState({
    vendor_type: 'saved',
    vendor_party_id: '',
    walk_in_name: '',
    walk_in_customer_id: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    conversion_factor: 0.920,
    items: [
      {
        id: generateId(),
        description: '',
        weight_grams: '',
        entered_purity: '999'
      }
    ]
  });

  // Get current page from URL, default to 1
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  function generateId() {
    return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Calculate 22K valuation for an item
  const calculate22KAmount = (weight, conversionFactor) => {
    if (!weight || weight <= 0 || !conversionFactor) return 0;
    // Formula: amount = (weight × 916) ÷ conversion_factor
    return (parseFloat(weight) * 916) / parseFloat(conversionFactor);
  };

  // Calculate total amount from all items
  const calculateTotalAmount = (items, conversionFactor) => {
    return items.reduce((sum, item) => {
      return sum + calculate22KAmount(item.weight_grams, conversionFactor);
    }, 0);
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadPurchases(),
        loadVendors(),
        loadShopSettings()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPurchases = async () => {
    try {
      const params = new URLSearchParams();
      params.append('page', currentPage);
      params.append('page_size', 10);
      if (filterVendor && filterVendor !== 'all') params.append('vendor_party_id', filterVendor);
      if (filterStatus && filterStatus !== 'all') params.append('status', filterStatus);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      
      const response = await API.get(`/api/purchases?${params.toString()}`);
      setPurchases(response.data.items || []);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error('Failed to load purchases');
    }
  };

  const loadVendors = async () => {
    try {
      const response = await API.get(`/api/parties?party_type=vendor&page_size=1000`);
      setVendors(response.data.items || []);
    } catch (error) {
      console.error('Failed to load vendors:', error);
    }
  };

  const loadShopSettings = async () => {
    try {
      const response = await API.get(`/api/settings/shop`);
      setShopSettings(response.data);
    } catch (error) {
      console.error('Failed to load shop settings:', error);
      // Use defaults if settings not found
      setShopSettings({
        conversion_factors: [0.920, 0.917],
        default_conversion_factor: 0.920
      });
    }
  };

  useEffect(() => {
    loadPurchases();
  }, [filterVendor, filterStatus, startDate, endDate, currentPage]);

  const handlePageChange = (newPage) => {
    setSearchParams({ page: newPage.toString() });
  };

  const handleOpenDialog = (purchase = null) => {
    if (purchase) {
      // Editing existing purchase
      setEditingPurchase(purchase);
      
      // Check if it's a MODULE 4 purchase (has items[]) or legacy
      if (purchase.items && purchase.items.length > 0) {
        // MODULE 4 purchase
        setFormData({
          vendor_type: purchase.vendor_type || 'saved',
          vendor_party_id: purchase.vendor_party_id || '',
          walk_in_name: purchase.walk_in_name || '',
          walk_in_customer_id: purchase.walk_in_customer_id || '',
          date: purchase.date ? new Date(purchase.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          description: purchase.description || '',
          conversion_factor: purchase.conversion_factor || 0.920,
          items: purchase.items.map(item => ({
            id: item.id,
            description: item.description,
            weight_grams: item.weight_grams,
            entered_purity: item.entered_purity
          }))
        });
      } else {
        // Legacy purchase - cannot edit
        toast.error('Legacy purchases cannot be edited. Please create a new purchase.');
        return;
      }
    } else {
      // New purchase
      setEditingPurchase(null);
      const defaultConversionFactor = shopSettings?.default_conversion_factor || 0.920;
      setFormData({
        vendor_type: 'saved',
        vendor_party_id: vendors.length > 0 ? vendors[0].id : '',
        walk_in_name: '',
        walk_in_customer_id: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        conversion_factor: defaultConversionFactor,
        items: [
          {
            id: generateId(),
            description: '',
            weight_grams: '',
            entered_purity: '999'
          }
        ]
      });
    }
    setErrors({});
    setShowDialog(true);
  };

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: generateId(),
          description: '',
          weight_grams: '',
          entered_purity: '999'
        }
      ]
    }));
  };

  const handleRemoveItem = (itemId) => {
    if (formData.items.length === 1) {
      toast.error('At least one item is required');
      return;
    }
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
  };

  const handleItemChange = (itemId, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    // Vendor validation
    if (formData.vendor_type === 'saved') {
      if (!formData.vendor_party_id) {
        newErrors.vendor_party_id = 'Vendor is required';
        isValid = false;
      }
    } else if (formData.vendor_type === 'walk_in') {
      if (!formData.walk_in_name || formData.walk_in_name.trim() === '') {
        newErrors.walk_in_name = 'Walk-in vendor name is required';
        isValid = false;
      }
    }

    // Items validation
    formData.items.forEach((item, idx) => {
      if (!item.description || item.description.trim() === '') {
        newErrors[`item_${idx}_description`] = `Item ${idx + 1} description is required`;
        isValid = false;
      }

      const weightValidation = validateWeight(item.weight_grams);
      if (!weightValidation.isValid) {
        newErrors[`item_${idx}_weight`] = weightValidation.error;
        isValid = false;
      }

      const purityValidation = validatePurity(item.entered_purity);
      if (!purityValidation.isValid) {
        newErrors[`item_${idx}_purity`] = purityValidation.error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSavePurchase = async () => {
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        vendor_type: formData.vendor_type,
        vendor_party_id: formData.vendor_type === 'saved' ? formData.vendor_party_id : null,
        walk_in_name: formData.vendor_type === 'walk_in' ? formData.walk_in_name : null,
        walk_in_customer_id: formData.vendor_type === 'walk_in' && formData.walk_in_customer_id ? formData.walk_in_customer_id : null,
        date: formData.date,
        description: formData.description,
        conversion_factor: parseFloat(formData.conversion_factor),
        items: formData.items.map(item => ({
          description: item.description,
          weight_grams: parseFloat(item.weight_grams),
          entered_purity: parseInt(item.entered_purity)
        }))
      };

      if (editingPurchase) {
        await API.patch(`/api/purchases/${editingPurchase.id}`, payload);
        toast.success('Purchase updated successfully');
      } else {
        await API.post(`/api/purchases`, payload);
        toast.success('Purchase created as draft. Finalize to commit to inventory.');
      }

      setShowDialog(false);
      setErrors({});
      loadPurchases();
    } catch (error) {
      console.error('Error saving purchase:', error);
      const errorMsg = extractErrorMessage(error, 'Failed to save purchase');
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalizePurchase = async (purchase) => {
    setFinalizingPurchase(purchase);
    setShowFinalizeDialog(true);
  };

  const confirmFinalize = async () => {
    if (!finalizingPurchase) return;

    setIsFinalizing(true);
    try {
      await API.post(`/api/purchases/${finalizingPurchase.id}/finalize`);
      toast.success('Purchase finalized successfully! Stock and accounting entries created.');
      setShowFinalizeDialog(false);
      setFinalizingPurchase(null);
      loadPurchases();
    } catch (error) {
      console.error('Error finalizing purchase:', error);
      const errorMsg = extractErrorMessage(error, 'Failed to finalize purchase');
      toast.error(errorMsg);
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleDeletePurchase = async (purchase) => {
    setConfirmPurchase(purchase);
    setConfirmLoading(true);
    try {
      const response = await API.get(`/api/purchases/${purchase.id}/delete-impact`);
      setImpactData(response.data);
      setShowDeleteConfirm(true);
    } catch (error) {
      console.error('Error fetching delete impact:', error);
      toast.error('Failed to load delete impact');
    } finally {
      setConfirmLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!confirmPurchase) return;

    try {
      await API.delete(`/api/purchases/${confirmPurchase.id}`);
      toast.success('Purchase deleted successfully');
      setShowDeleteConfirm(false);
      setConfirmPurchase(null);
      setImpactData(null);
      loadPurchases();
    } catch (error) {
      console.error('Error deleting purchase:', error);
      const errorMsg = extractErrorMessage(error, 'Failed to delete purchase');
      toast.error(errorMsg);
    }
  };

  const handleViewPurchase = (purchase) => {
    setViewPurchase(purchase);
    setShowViewDialog(true);
  };

  const getVendorName = (vendorId) => {
    const vendor = vendors.find(v => v.id === vendorId);
    return vendor ? vendor.name : 'Unknown';
  };

  const getVendorDisplay = (purchase) => {
    if (purchase.vendor_type === 'walk_in') {
      return (
        <div>
          <div className="font-medium">Walk-in: {purchase.walk_in_name}</div>
          {purchase.walk_in_customer_id && (
            <div className="text-xs text-gray-500">ID: {purchase.walk_in_customer_id}</div>
          )}
        </div>
      );
    }
    return getVendorName(purchase.vendor_party_id);
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      'draft': 'bg-blue-100 text-blue-800',
      'Draft': 'bg-blue-100 text-blue-800',
      'Finalized (Unpaid)': 'bg-yellow-100 text-yellow-800',
      'Partially Paid': 'bg-orange-100 text-orange-800',
      'Paid': 'bg-green-100 text-green-800'
    };

    const colorClass = statusColors[status] || 'bg-gray-100 text-gray-800';
    
    if (status === 'Draft' || status === 'draft') {
      return <Badge className={colorClass}><Edit className="w-3 h-3 mr-1 inline" />Draft</Badge>;
    }
    if (status === 'Paid') {
      return <Badge className={colorClass}><CheckCircle className="w-3 h-3 mr-1 inline" />Paid</Badge>;
    }
    return <Badge className={colorClass}>{status}</Badge>;
  };

  // Calculate summary stats
  const totalPurchases = purchases.length;
  const draftPurchases = purchases.filter(p => p.status === 'Draft' || p.status === 'draft').length;
  const finalizedPurchases = purchases.filter(p => p.status !== 'Draft' && p.status !== 'draft').length;
  
  // Calculate total weight from items[] or legacy weight_grams
  const totalWeight = purchases.reduce((sum, p) => {
    if (p.items && p.items.length > 0) {
      return sum + p.items.reduce((itemSum, item) => itemSum + (item.weight_grams || 0), 0);
    }
    return sum + (p.weight_grams || 0);
  }, 0);
  
  const totalValue = purchases.reduce((sum, p) => sum + (p.amount_total || 0), 0);

  // Show loading spinner while data is being fetched
  if (isLoading) {
    return <PageLoadingSpinner text="Loading purchases..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Purchases</h1>
        <Button onClick={() => handleOpenDialog()} data-testid="new-purchase-btn">
          <ShoppingCart className="w-4 h-4 mr-2" /> New Purchase
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPurchases}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Draft</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{draftPurchases}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Finalized</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{finalizedPurchases}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Weight</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeToFixed(totalWeight, 3)}g</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeToFixed(totalValue, 2)} OMR</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Vendor</Label>
              <Select value={filterVendor} onValueChange={setFilterVendor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  {vendors.map(vendor => (
                    <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Finalized (Unpaid)">Finalized (Unpaid)</SelectItem>
                  <SelectItem value="Partially Paid">Partially Paid</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Purchases Table */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Vendor</th>
                  <th className="text-left p-3">Description</th>
                  <th className="text-right p-3">Items</th>
                  <th className="text-right p-3">Weight (g)</th>
                  <th className="text-right p-3">Amount</th>
                  <th className="text-center p-3">Status</th>
                  <th className="text-center p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchases.length === 0 ? (
                  <TableEmptyState
                    colSpan={8}
                    icon="cart"
                    title="No purchases recorded"
                    message="Start by creating your first purchase to track gold inventory and vendor transactions."
                    action={{
                      label: "Create Purchase",
                      onClick: () => handleOpenDialog(),
                      icon: ShoppingCart
                    }}
                  />
                ) : (
                  purchases.map((purchase) => {
                    const totalItemWeight = purchase.items && purchase.items.length > 0 
                      ? purchase.items.reduce((sum, item) => sum + (item.weight_grams || 0), 0)
                      : purchase.weight_grams || 0;
                    
                    const itemCount = purchase.items && purchase.items.length > 0 
                      ? purchase.items.length 
                      : 1;

                    return (
                      <tr key={purchase.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{formatDate(purchase.date)}</td>
                        <td className="p-3">{getVendorDisplay(purchase)}</td>
                        <td className="p-3">{purchase.description}</td>
                        <td className="p-3 text-right">
                          {purchase.items && purchase.items.length > 0 ? (
                            <Badge variant="outline">{purchase.items.length} items</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-100">Legacy</Badge>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono">{safeToFixed(totalItemWeight, 3)}</td>
                        <td className="p-3 text-right font-mono">{safeToFixed(purchase.amount_total, 2)}</td>
                        <td className="p-3 text-center">{getStatusBadge(purchase.status)}</td>
                        <td className="p-3">
                          <div className="flex gap-2 justify-center">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-indigo-600 hover:text-indigo-700"
                              onClick={() => handleViewPurchase(purchase)}
                              title="View Purchase Details"
                              data-testid={`view-purchase-${purchase.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            
                            {/* Edit button - only for draft purchases */}
                            {(purchase.status === 'Draft' || purchase.status === 'draft') && !purchase.finalized_at && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-blue-600 hover:text-blue-700"
                                onClick={() => handleOpenDialog(purchase)}
                                title="Edit Draft Purchase"
                                data-testid={`edit-purchase-${purchase.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}

                            {/* Finalize button - only for draft purchases */}
                            {(purchase.status === 'Draft' || purchase.status === 'draft') && !purchase.finalized_at && (
                              <Button
                                size="sm"
                                variant="default"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => handleFinalizePurchase(purchase)}
                                title="Finalize Purchase"
                                data-testid={`finalize-purchase-${purchase.id}`}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                            )}
                            
                            {/* Delete button - only for draft purchases */}
                            {(purchase.status === 'Draft' || purchase.status === 'draft') && !purchase.finalized_at && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleDeletePurchase(purchase)}
                                title="Delete Draft Purchase"
                                data-testid={`delete-purchase-${purchase.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.total_pages > 1 && (
            <div className="mt-4">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.total_pages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Purchase Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPurchase ? 'Edit' : 'Create'} Purchase (Draft)</DialogTitle>
            <DialogDescription>
              {editingPurchase ? 'Update purchase details. Changes saved as draft.' : 'Create a new purchase. Will be saved as draft until finalized.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Vendor Type Selection */}
            <div className="space-y-2">
              <Label>Vendor Type</Label>
              <div className="flex gap-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="vendor_type"
                    value="saved"
                    checked={formData.vendor_type === 'saved'}
                    onChange={(e) => setFormData({ ...formData, vendor_type: e.target.value })}
                    className="w-4 h-4"
                  />
                  <span>Saved Vendor</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="vendor_type"
                    value="walk_in"
                    checked={formData.vendor_type === 'walk_in'}
                    onChange={(e) => setFormData({ ...formData, vendor_type: e.target.value })}
                    className="w-4 h-4"
                  />
                  <span>Walk-in Vendor</span>
                </label>
              </div>
            </div>

            {/* Vendor Selection */}
            {formData.vendor_type === 'saved' ? (
              <div className="space-y-2">
                <Label>Vendor *</Label>
                <Select
                  value={formData.vendor_party_id}
                  onValueChange={(value) => setFormData({ ...formData, vendor_party_id: value })}
                >
                  <SelectTrigger className={errors.vendor_party_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map(vendor => (
                      <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.vendor_party_id && <FormErrorMessage message={errors.vendor_party_id} />}
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Walk-in Vendor Name *</Label>
                  <Input
                    value={formData.walk_in_name}
                    onChange={(e) => setFormData({ ...formData, walk_in_name: e.target.value })}
                    placeholder="Enter vendor name"
                    className={errors.walk_in_name ? 'border-red-500' : ''}
                  />
                  {errors.walk_in_name && <FormErrorMessage message={errors.walk_in_name} />}
                </div>
                <div className="space-y-2">
                  <Label>Customer ID (Optional)</Label>
                  <Input
                    value={formData.walk_in_customer_id}
                    onChange={(e) => setFormData({ ...formData, walk_in_customer_id: e.target.value })}
                    placeholder="Oman Customer ID (optional)"
                  />
                  <p className="text-xs text-gray-500">Optional Oman Customer ID for walk-in vendors</p>
                </div>
              </>
            )}

            {/* Date and Description */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Conversion Factor *</Label>
                <Select
                  value={formData.conversion_factor.toString()}
                  onValueChange={(value) => setFormData({ ...formData, conversion_factor: parseFloat(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(shopSettings?.conversion_factors || [0.920, 0.917]).map(factor => (
                      <SelectItem key={factor} value={factor.toString()}>{factor}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">Used in 22K valuation formula</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Purchase description"
              />
            </div>

            {/* Items Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-lg font-semibold">Items</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddItem}
                  data-testid="add-item-btn"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Item
                </Button>
              </div>

              {formData.items.map((item, idx) => {
                const itemAmount = calculate22KAmount(item.weight_grams, formData.conversion_factor);
                
                return (
                  <Card key={item.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="font-semibold text-sm">Item {idx + 1}</h4>
                        {formData.items.length > 1 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Description *</Label>
                          <Input
                            value={item.description}
                            onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                            placeholder="Gold Bar 24K"
                            className={errors[`item_${idx}_description`] ? 'border-red-500' : ''}
                          />
                          {errors[`item_${idx}_description`] && (
                            <FormErrorMessage message={errors[`item_${idx}_description`]} />
                          )}
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Weight (grams) *</Label>
                          <Input
                            type="number"
                            step="0.001"
                            value={item.weight_grams}
                            onChange={(e) => handleItemChange(item.id, 'weight_grams', e.target.value)}
                            placeholder="10.500"
                            className={errors[`item_${idx}_weight`] ? 'border-red-500' : ''}
                          />
                          {errors[`item_${idx}_weight`] && (
                            <FormErrorMessage message={errors[`item_${idx}_weight`]} />
                          )}
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Entered Purity *</Label>
                          <Input
                            type="number"
                            value={item.entered_purity}
                            onChange={(e) => handleItemChange(item.id, 'entered_purity', e.target.value)}
                            placeholder="999"
                            className={errors[`item_${idx}_purity`] ? 'border-red-500' : ''}
                          />
                          {errors[`item_${idx}_purity`] && (
                            <FormErrorMessage message={errors[`item_${idx}_purity`]} />
                          )}
                        </div>
                      </div>

                      {/* Calculated Amount Display */}
                      <div className="bg-gray-50 p-3 rounded">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Calculated Amount (22K valuation):</span>
                          <span className="font-mono font-semibold">{safeToFixed(itemAmount, 2)} OMR</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Formula: ({item.weight_grams || 0} × 916) ÷ {formData.conversion_factor} = {safeToFixed(itemAmount, 2)}
                        </p>
                        <p className="text-xs text-amber-600 mt-1">
                          ⚠️ Valued at 916 purity (22K), not entered purity
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}

              {/* Total Amount */}
              <Card className="bg-blue-50 p-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total Purchase Amount:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {safeToFixed(calculateTotalAmount(formData.items, formData.conversion_factor), 2)} OMR
                  </span>
                </div>
              </Card>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSavePurchase}
              disabled={isSubmitting}
              data-testid="save-purchase-btn"
            >
              {isSubmitting ? <ButtonLoadingSpinner text="Saving..." /> : 'Save as Draft'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Purchase Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Purchase Details</DialogTitle>
          </DialogHeader>

          {viewPurchase && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Date</Label>
                  <p className="font-medium">{formatDate(viewPurchase.date)}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Status</Label>
                  <div>{getStatusBadge(viewPurchase.status)}</div>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Vendor</Label>
                  <p className="font-medium">{getVendorDisplay(viewPurchase)}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Conversion Factor</Label>
                  <p className="font-medium">{viewPurchase.conversion_factor || 'N/A'}</p>
                </div>
              </div>

              <div>
                <Label className="text-xs text-gray-500">Description</Label>
                <p className="font-medium">{viewPurchase.description}</p>
              </div>

              {/* Items Display */}
              {viewPurchase.items && viewPurchase.items.length > 0 ? (
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Items ({viewPurchase.items.length})</Label>
                  <div className="space-y-2">
                    {viewPurchase.items.map((item, idx) => (
                      <Card key={item.id || idx} className="p-3">
                        <div className="grid grid-cols-4 gap-2 text-sm">
                          <div>
                            <Label className="text-xs text-gray-500">Description</Label>
                            <p className="font-medium">{item.description}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">Weight</Label>
                            <p className="font-mono">{safeToFixed(item.weight_grams, 3)}g</p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">Entered Purity</Label>
                            <p>{item.entered_purity}K</p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">Amount (22K)</Label>
                            <p className="font-mono font-semibold">{safeToFixed(item.calculated_amount, 2)} OMR</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Legacy Purchase (Single Item)</Label>
                  <Card className="p-3 bg-gray-50">
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <Label className="text-xs text-gray-500">Weight</Label>
                        <p className="font-mono">{safeToFixed(viewPurchase.weight_grams, 3)}g</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Purity</Label>
                        <p>{viewPurchase.entered_purity}K</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Rate/g</Label>
                        <p className="font-mono">{safeToFixed(viewPurchase.rate_per_gram, 2)} OMR</p>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label className="text-xs text-gray-500">Total Amount</Label>
                  <p className="text-2xl font-bold">{safeToFixed(viewPurchase.amount_total, 2)} OMR</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Valuation Purity</Label>
                  <p className="text-lg font-semibold text-amber-600">916 (22K)</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowViewDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Finalize Confirmation Dialog */}
      <Dialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalize Purchase</DialogTitle>
            <DialogDescription>
              Are you sure you want to finalize this purchase? This action will:
            </DialogDescription>
          </DialogHeader>

          {finalizingPurchase && (
            <div className="space-y-3">
              <div className="bg-blue-50 p-3 rounded space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Create Stock Movements</p>
                    <p className="text-xs text-gray-600">
                      {finalizingPurchase.items?.length || 1} items will be added to inventory at 916 purity (22K)
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Create Vendor Payable</p>
                    <p className="text-xs text-gray-600">
                      Transaction for {safeToFixed(finalizingPurchase.amount_total, 2)} OMR will be recorded
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Lock className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Lock Purchase Details</p>
                    <p className="text-xs text-gray-600">
                      Items, conversion factor, and valuation will become immutable
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3 rounded">
                <div className="flex gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm text-amber-900">Warning</p>
                    <p className="text-xs text-amber-800">
                      Once finalized, this purchase cannot be edited. Ensure all details are correct.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFinalizeDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmFinalize}
              disabled={isFinalizing}
              className="bg-green-600 hover:bg-green-700"
              data-testid="confirm-finalize-btn"
            >
              {isFinalizing ? <ButtonLoadingSpinner text="Finalizing..." /> : 'Finalize Purchase'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setConfirmPurchase(null);
          setImpactData(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Purchase"
        message="Are you sure you want to delete this draft purchase? This action cannot be undone."
        confirmText="Delete"
        confirmVariant="destructive"
        data-testid="delete-confirm-dialog"
      />
    </div>
  );
}
