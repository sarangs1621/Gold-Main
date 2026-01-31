import React, { useState, useEffect, useCallback } from 'react';
import { API } from '../contexts/AuthContext';
import { formatDateTime, formatDate } from '../utils/dateTimeUtils';
import { safeToFixed, formatCurrency, formatWeight } from '../utils/numberFormat';
import Pagination from '../components/Pagination';
import useURLPagination from '../hooks/useURLPagination';
import { usePermission } from '../hooks/usePermission';
import { Eye, Edit2, CheckCircle, Trash2, X, AlertTriangle } from 'lucide-react';

const ReturnsPage = () => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Permissions
  const canCreateReturn = usePermission('returns.create');
  const canFinalizeReturn = usePermission('returns.finalize');
  const canDeleteReturn = usePermission('returns.delete');
  
  // Pagination
  const { currentPage, setPage, pagination, setPagination } = useURLPagination();
  const pageSize = 10;
  
  // Delete confirmation dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [returnToDelete, setReturnToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    return_type: '',
    status: '',
    refund_mode: '',
    search: ''
  });
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [finalizeImpact, setFinalizeImpact] = useState(null);
  const [editingReturn, setEditingReturn] = useState(null);
  
  // Create/Edit form state
  const [formData, setFormData] = useState({
    return_type: 'sale_return',
    reference_type: 'invoice',
    reference_id: '',
    items: [{ description: '', qty: 1, weight_grams: 0, purity: 916, amount: 0 }],
    reason: '',
    refund_mode: 'money',
    refund_money_amount: 0,
    refund_gold_grams: 0,
    refund_gold_purity: 916,
    payment_mode: 'cash',
    account_id: '',
    notes: ''
  });
  
  // Reference data (invoices, purchases, accounts)
  const [invoices, setInvoices] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [accounts, setAccounts] = useState([]);
  
  // Invoice returnable items (auto-loaded when invoice is selected)
  const [returnableItems, setReturnableItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  
  // Load returns data
  const loadReturns = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page: currentPage,
        page_size: pageSize,
        ...filters
      };
      
      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key] === '') delete params[key];
      });
      
      const response = await API.get('/api/returns', { params });
      
      setReturns(response.data.items || []);
      setPagination(response.data.pagination);
      setError(''); // Clear any previous errors on successful load
    } catch (err) {
      console.error('Error loading returns:', err);
      setError(err.response?.data?.detail || 'Failed to load returns');
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters, setPagination]);
  
  useEffect(() => {
    loadReturns();
  }, [loadReturns]);
  
  // Auto-load invoice items when reference_id changes for sale_return
  useEffect(() => {
    if (formData.return_type === 'sale_return' && formData.reference_type === 'invoice' && formData.reference_id) {
      loadInvoiceReturnableItems(formData.reference_id);
    } else {
      setReturnableItems([]);
    }
  }, [formData.reference_id, formData.return_type, formData.reference_type]);
  
  // Load reference data
  const loadReferenceData = async (returnType = 'sale_return') => {
    try {
      // Load returnable invoices based on return type
      if (returnType === 'sale_return') {
        const invoicesRes = await API.get('/api/invoices/returnable', {
          params: { type: 'sales' }
        });
        setInvoices(invoicesRes.data || []);
      } else if (returnType === 'purchase_return') {
        const purchasesRes = await API.get('/api/purchases', {
          params: { page: 1, page_size: 100, status: 'finalized' }
        });
        setPurchases(purchasesRes.data.items || []);
      }
      
      // Load accounts
      const accountsRes = await API.get('/api/accounts');
      setAccounts(accountsRes.data.items || accountsRes.data || []);
    } catch (err) {
      console.error('Error loading reference data:', err);
      setError(err.response?.data?.detail || 'Failed to load reference data');
    }
  };
  
  // Load invoice returnable items when invoice is selected
  const loadInvoiceReturnableItems = async (invoiceId) => {
    if (!invoiceId) {
      setReturnableItems([]);
      return;
    }
    
    setLoadingItems(true);
    setError('');
    try {
      const response = await API.get(`/api/invoices/${invoiceId}/returnable-items`);
      const items = response.data || [];
      
      console.log('[Returns] Loaded returnable items:', items.length, items);
      setReturnableItems(items);
      
      // Auto-populate form items with returnable items
      if (items.length > 0) {
        const formItems = items.map(item => ({
          description: item.description,
          qty: item.remaining_qty,
          weight_grams: item.remaining_weight_grams,
          purity: item.purity,
          amount: item.remaining_amount,
          // Store limits for validation
          max_qty: item.remaining_qty,
          max_weight: item.remaining_weight_grams,
          item_id: item.item_id
        }));
        console.log('[Returns] Setting formData.items:', formItems.length, formItems);
        setFormData(prev => ({ ...prev, items: formItems }));
        setSuccess(`${items.length} returnable item(s) loaded from invoice`);
      } else {
        // No returnable items - show message
        setError('All items from this invoice have already been returned.');
        setFormData(prev => ({ ...prev, items: [{ description: '', qty: 1, weight_grams: 0, purity: 916, amount: 0 }] }));
      }
    } catch (err) {
      console.error('Error loading invoice returnable items:', err);
      setError(err.response?.data?.detail || 'Failed to load returnable items');
      setReturnableItems([]);
    } finally {
      setLoadingItems(false);
    }
  };
  
  // Handle filter change
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };
  
  // Handle form change
  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  // Handle item change
  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index][field] = value;
    setFormData(prev => ({ ...prev, items: updatedItems }));
  };
  
  // Add item
  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', qty: 1, weight_grams: 0, purity: 916, amount: 0 }]
    }));
  };
  
  // Remove item
  const removeItem = (index) => {
    if (formData.items.length > 1) {
      const updatedItems = formData.items.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, items: updatedItems }));
    }
  };
  
  // Open create dialog
  const openCreateDialog = () => {
    loadReferenceData('sale_return');
    setFormData({
      return_type: 'sale_return',
      reference_type: 'invoice',
      reference_id: '',
      items: [{ description: '', qty: 1, weight_grams: 0, purity: 916, amount: 0 }],
      reason: '',
      refund_mode: 'money',
      refund_money_amount: 0,
      refund_gold_grams: 0,
      refund_gold_purity: 916,
      payment_mode: 'cash',
      account_id: '',
      notes: ''
    });
    setShowCreateDialog(true);
    setError('');
    setSuccess('');
  };
  
  // Close create dialog
  const closeCreateDialog = () => {
    setShowCreateDialog(false);
    setFormData({
      return_type: 'sale_return',
      reference_type: 'invoice',
      reference_id: '',
      items: [{ description: '', qty: 1, weight_grams: 0, purity: 916, amount: 0 }],
      reason: '',
      refund_mode: 'money',
      refund_money_amount: 0,
      refund_gold_grams: 0,
      refund_gold_purity: 916,
      payment_mode: 'cash',
      account_id: '',
      notes: ''
    });
  };
  
  // Create return (Draft - refund details optional)
  const handleCreateReturn = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Validate basic requirements only (refund details are optional for draft)
      if (!formData.reference_id) {
        setError('Please select a reference invoice or purchase');
        setLoading(false);
        return;
      }
      
      // Validate items exist and have content
      const validItems = formData.items.filter(item => item.description && item.description.trim() !== '');
      if (validItems.length === 0) {
        setError('Please add at least one item with a description');
        setLoading(false);
        return;
      }
      
      // Create draft return payload (ONLY items and basic info - no refund validation)
      const draftPayload = {
        return_type: formData.return_type,
        reference_type: formData.reference_type,
        reference_id: formData.reference_id,
        items: validItems.map(item => ({
          description: item.description,
          qty: parseInt(item.qty) || 1,
          weight_grams: parseFloat(item.weight_grams) || 0,
          purity: parseInt(item.purity) || 916,
          amount: parseFloat(item.amount) || 0
        })),
        reason: formData.reason || '',
        notes: formData.notes || ''
      };
      
      // Create draft return (refund details are optional and NOT required)
      const response = await API.post('/api/returns', draftPayload);
      
      setSuccess(response.data.message || 'Return draft created successfully. You can finalize it later.');
      closeCreateDialog();
      loadReturns();
    } catch (err) {
      console.error('Error creating return:', err);
      setError(err.response?.data?.detail || 'Failed to create return');
    } finally {
      setLoading(false);
    }
  };
  
  // Open edit dialog for draft returns
  const openEditDialog = async (returnObj) => {
    try {
      // Load reference data
      await loadReferenceData(returnObj.return_type);
      
      // Set form data from return object
      setFormData({
        return_type: returnObj.return_type,
        reference_type: returnObj.reference_type,
        reference_id: returnObj.reference_id,
        items: returnObj.items || [{ description: '', qty: 1, weight_grams: 0, purity: 916, amount: 0 }],
        reason: returnObj.reason || '',
        refund_mode: returnObj.refund_mode || 'money',
        refund_money_amount: returnObj.refund_money_amount || 0,
        refund_gold_grams: returnObj.refund_gold_grams || 0,
        refund_gold_purity: returnObj.refund_gold_purity || 916,
        payment_mode: returnObj.payment_mode || 'cash',
        account_id: returnObj.account_id || '',
        notes: returnObj.notes || ''
      });
      
      setEditingReturn(returnObj);
      setShowEditDialog(true);
      setError('');
      setSuccess('');
    } catch (err) {
      console.error('Error opening edit dialog:', err);
      setError('Failed to open edit dialog');
    }
  };
  
  // Close edit dialog
  const closeEditDialog = () => {
    setShowEditDialog(false);
    setEditingReturn(null);
    setFormData({
      return_type: 'sale_return',
      reference_type: 'invoice',
      reference_id: '',
      items: [{ description: '', qty: 1, weight_grams: 0, purity: 916, amount: 0 }],
      reason: '',
      refund_mode: 'money',
      refund_money_amount: 0,
      refund_gold_grams: 0,
      refund_gold_purity: 916,
      payment_mode: 'cash',
      account_id: '',
      notes: ''
    });
  };
  
  // Update return
  const handleUpdateReturn = async () => {
    if (!editingReturn) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Validate items
      if (formData.items.length === 0 || !formData.items[0].description) {
        setError('Please add at least one item');
        setLoading(false);
        return;
      }
      
      // Update return
      await API.patch(`/api/returns/${editingReturn.id}`, formData);
      
      setSuccess('Return updated successfully');
      closeEditDialog();
      loadReturns();
    } catch (err) {
      console.error('Error updating return:', err);
      setError(err.response?.data?.detail || 'Failed to update return');
    } finally {
      setLoading(false);
    }
  };
  
  // View return
  const viewReturn = async (returnId) => {
    try {
      const response = await API.get(`/api/returns/${returnId}`);
      setSelectedReturn(response.data);
      setShowViewDialog(true);
    } catch (err) {
      console.error('Error fetching return:', err);
      setError(err.response?.data?.detail || 'Failed to load return details');
    }
  };
  
  // Open finalize dialog
  const openFinalizeDialog = async (returnObj) => {
    try {
      // Fetch finalize impact
      const response = await API.get(`/api/returns/${returnObj.id}/finalize-impact`);
      setFinalizeImpact(response.data);
      setSelectedReturn(returnObj);
      setShowFinalizeDialog(true);
    } catch (err) {
      console.error('Error fetching finalize impact:', err);
      setError(err.response?.data?.detail || 'Failed to load finalize impact');
    }
  };
  
  // Finalize return (with validation for refund details)
  const handleFinalizeReturn = async () => {
    if (!selectedReturn) return;
    
    // Validate refund details before finalization
    if (!selectedReturn.refund_mode || !['money', 'gold', 'mixed'].includes(selectedReturn.refund_mode)) {
      setError('Please update the return with a valid refund mode (money, gold, or mixed) before finalizing.');
      return;
    }
    
    if (selectedReturn.refund_mode === 'money' && (!selectedReturn.refund_money_amount || selectedReturn.refund_money_amount <= 0)) {
      setError('Please update the return with refund money amount before finalizing.');
      return;
    }
    
    if (selectedReturn.refund_mode === 'gold' && (!selectedReturn.refund_gold_grams || selectedReturn.refund_gold_grams <= 0)) {
      setError('Please update the return with refund gold amount before finalizing.');
      return;
    }
    
    if (selectedReturn.refund_mode === 'mixed') {
      if (!selectedReturn.refund_money_amount || selectedReturn.refund_money_amount <= 0 || !selectedReturn.refund_gold_grams || selectedReturn.refund_gold_grams <= 0) {
        setError('Please update the return with both refund money and gold amounts before finalizing.');
        return;
      }
    }
    
    if ((selectedReturn.refund_mode === 'money' || selectedReturn.refund_mode === 'mixed') && !selectedReturn.account_id) {
      setError('Please update the return with an account for money refund before finalizing.');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await API.post(`/api/returns/${selectedReturn.id}/finalize`);
      setSuccess('Return finalized successfully');
      setShowFinalizeDialog(false);
      setSelectedReturn(null);
      setFinalizeImpact(null);
      loadReturns();
    } catch (err) {
      console.error('Error finalizing return:', err);
      setError(err.response?.data?.detail || 'Failed to finalize return');
    } finally {
      setLoading(false);
    }
  };
  
  // Open delete confirmation dialog
  const openDeleteDialog = (returnObj) => {
    setReturnToDelete(returnObj);
    setShowDeleteDialog(true);
  };
  
  // Close delete dialog
  const closeDeleteDialog = () => {
    setShowDeleteDialog(false);
    setReturnToDelete(null);
  };
  
  // Delete return (confirmed)
  const handleDeleteReturn = async () => {
    if (!returnToDelete) return;
    
    setDeleting(true);
    setError('');
    setSuccess('');
    
    try {
      await API.delete(`/api/returns/${returnToDelete.id}`);
      setSuccess(`Return ${returnToDelete.return_number} deleted successfully`);
      closeDeleteDialog();
      loadReturns();
    } catch (err) {
      console.error('Error deleting return:', err);
      setError(err.response?.data?.detail || 'Failed to delete return');
      closeDeleteDialog();
    } finally {
      setDeleting(false);
    }
  };
  
  // Get status badge
  const getStatusBadge = (status) => {
    const badges = {
      draft: 'bg-yellow-100 text-yellow-800',
      finalized: 'bg-green-100 text-green-800',
      completed: 'bg-green-100 text-green-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };
  
  // Format status display text
  const formatStatusText = (status) => {
    if (status === 'finalized') return 'Completed';
    if (status === 'draft') return 'Draft';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };
  
  // Get return type badge
  const getReturnTypeBadge = (type) => {
    const badges = {
      sale_return: 'bg-blue-100 text-blue-800',
      purchase_return: 'bg-purple-100 text-purple-800'
    };
    return badges[type] || 'bg-gray-100 text-gray-800';
  };
  
  // Get refund mode badge
  const getRefundModeBadge = (mode) => {
    const badges = {
      money: 'bg-green-100 text-green-800',
      gold: 'bg-yellow-100 text-yellow-800',
      mixed: 'bg-orange-100 text-orange-800'
    };
    return badges[mode] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Returns Management</h1>
          <p className="text-gray-600 text-sm mt-1">Manage sales and purchase returns</p>
        </div>
        {canCreateReturn && (
          <button
            onClick={openCreateDialog}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <span className="text-xl">+</span>
            <span>Create Return</span>
          </button>
        )}
      </div>

      {/* Info Note */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              <strong>Note:</strong> Completed returns cannot be deleted for audit reasons. Only draft returns can be modified or deleted.
            </p>
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Return Type</label>
            <select
              value={filters.return_type}
              onChange={(e) => handleFilterChange('return_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="sale_return">Sales Return</option>
              <option value="purchase_return">Purchase Return</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="finalized">Finalized</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Refund Mode</label>
            <select
              value={filters.refund_mode}
              onChange={(e) => handleFilterChange('refund_mode', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Modes</option>
              <option value="money">Money</option>
              <option value="gold">Gold</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Return #, Party, Reason..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Returns Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading && !returns.length ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 mt-2">Loading returns...</p>
          </div>
        ) : returns.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No returns found</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new return.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Return #</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Party</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Refund Mode</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount/Weight</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {returns.map((returnObj) => (
                  <tr key={returnObj.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {returnObj.return_number}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getReturnTypeBadge(returnObj.return_type)}`}>
                        {returnObj.return_type === 'sale_return' ? 'Sales' : 'Purchase'}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                      {returnObj.party_name}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                      {returnObj.reference_number || returnObj.reference_id.substring(0, 8)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRefundModeBadge(returnObj.refund_mode)}`}>
                        {returnObj.refund_mode}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                      {returnObj.refund_mode === 'money' && `${formatCurrency(returnObj.refund_money_amount)} OMR`}
                      {returnObj.refund_mode === 'gold' && `${formatWeight(returnObj.refund_gold_grams)}g`}
                      {returnObj.refund_mode === 'mixed' && (
                        <div>
                          <div>{formatCurrency(returnObj.refund_money_amount)} OMR</div>
                          <div className="text-xs text-gray-500">{formatWeight(returnObj.refund_gold_grams)}g</div>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(returnObj.status)}`}>
                        {formatStatusText(returnObj.status)}
                        {returnObj.status === 'finalized' && (
                          <svg className="ml-1 w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(returnObj.date)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => viewReturn(returnObj.id)}
                          className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                          title="View return details"
                        >
                          <Eye size={16} />
                          <span>View</span>
                        </button>
                        {returnObj.status === 'draft' && (
                          <>
                            {canCreateReturn && (
                              <button
                                onClick={() => openEditDialog(returnObj)}
                                className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1"
                                title="Edit draft return"
                              >
                                <Edit2 size={16} />
                                <span>Edit</span>
                              </button>
                            )}
                            {canFinalizeReturn && (
                              <button
                                onClick={() => openFinalizeDialog(returnObj)}
                                className="text-green-600 hover:text-green-900 flex items-center gap-1"
                                title="Finalize and process return"
                              >
                                <CheckCircle size={16} />
                                <span>Finalize</span>
                              </button>
                            )}
                            {canDeleteReturn && (
                              <button
                                onClick={() => openDeleteDialog(returnObj)}
                                className="text-red-600 hover:text-red-900 flex items-center gap-1"
                                title="Delete draft return"
                              >
                                <Trash2 size={16} />
                                <span>Delete</span>
                              </button>
                            )}
                          </>
                        )}
                        {returnObj.status === 'finalized' && (
                          <span className="text-gray-400 text-xs italic flex items-center gap-1" title="Completed returns cannot be deleted for audit reasons">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                            View Only
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            
            {/* Pagination */}
            {pagination && (
              <div className="px-6 py-4 border-t border-gray-200">
                <Pagination
                  pagination={pagination}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Return Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-semibold text-gray-800">Create New Return</h2>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              {/* Return Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Return Type *</label>
                  <select
                    value={formData.return_type}
                    onChange={(e) => {
                      const newReturnType = e.target.value;
                      handleFormChange('return_type', newReturnType);
                      handleFormChange('reference_type', newReturnType === 'sale_return' ? 'invoice' : 'purchase');
                      handleFormChange('reference_id', '');
                      // Reload reference data based on new return type
                      loadReferenceData(newReturnType);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="sale_return">Sales Return</option>
                    <option value="purchase_return">Purchase Return</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.return_type === 'sale_return' ? 'Select Invoice *' : 'Select Purchase *'}
                  </label>
                  <select
                    value={formData.reference_id}
                    onChange={(e) => handleFormChange('reference_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={formData.return_type === 'sale_return' ? invoices.length === 0 : purchases.length === 0}
                  >
                    <option value="">-- Select --</option>
                    {formData.return_type === 'sale_return' ? (
                      invoices.length > 0 ? (
                        invoices.map(inv => (
                          <option key={inv.id} value={inv.id}>
                            {inv.invoice_no} - {inv.party_name} - {formatCurrency(inv.total_amount)} OMR
                          </option>
                        ))
                      ) : null
                    ) : (
                      purchases.map(pur => (
                        <option key={pur.id} value={pur.id}>
                          {pur.id.substring(0, 8)} - {pur.description} - {formatCurrency(pur.amount_total)} OMR
                        </option>
                      ))
                    )}
                  </select>
                  {formData.return_type === 'sale_return' && invoices.length === 0 ? (
                    <p className="text-xs text-red-600 mt-1">
                      ⚠️ No finalized or paid invoices available for return
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">
                      ℹ️ Only finalized or paid {formData.return_type === 'sale_return' ? 'invoices' : 'purchases'} are shown. Draft items cannot be returned.
                    </p>
                  )}
                </div>
              </div>
              
              {/* Items */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Return Items *</label>
                
                {/* Show loading state when loading invoice items */}
                {loadingItems && (
                  <div className="text-sm text-gray-600 py-2">Loading invoice items...</div>
                )}
                
                {/* Invoice-linked items: Show selection interface */}
                {formData.return_type === 'sale_return' && formData.reference_id && returnableItems.length > 0 && !loadingItems && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-3">
                    <p className="text-sm text-blue-800 mb-2">
                      <span className="font-semibold">Invoice Items Auto-Loaded:</span> Adjust quantities/weights to return (within remaining limits)
                    </p>
                  </div>
                )}
                
                {formData.items.map((item, index) => {
                  const isInvoiceLinked = formData.return_type === 'sale_return' && formData.reference_id && returnableItems.length > 0;
                  const maxQty = item.max_qty || 999;
                  const maxWeight = item.max_weight || 99999;
                  
                  return (
                    <div key={index} className="border border-gray-300 rounded-md p-4 mb-3">
                      <div className="grid grid-cols-5 gap-3 mb-2">
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-600 mb-1">Description</label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Item description"
                            disabled={isInvoiceLinked}
                          />
                          {isInvoiceLinked && (
                            <p className="text-xs text-gray-500 mt-1">From invoice (read-only)</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Qty</label>
                          <input
                            type="number"
                            value={item.qty}
                            onChange={(e) => {
                              const newQty = parseInt(e.target.value) || 0;
                              if (isInvoiceLinked && newQty > maxQty) {
                                setError(`Quantity cannot exceed remaining: ${maxQty}`);
                                return;
                              }
                              handleItemChange(index, 'qty', newQty);
                            }}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            min="1"
                            max={isInvoiceLinked ? maxQty : undefined}
                          />
                          {isInvoiceLinked && (
                            <p className="text-xs text-gray-500 mt-1">Max: {maxQty}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Weight (g)</label>
                          <input
                            type="number"
                            step="0.001"
                            value={item.weight_grams}
                            onChange={(e) => {
                              const newWeight = parseFloat(e.target.value) || 0;
                              if (isInvoiceLinked && newWeight > maxWeight) {
                                setError(`Weight cannot exceed remaining: ${maxWeight.toFixed(3)}g`);
                                return;
                              }
                              handleItemChange(index, 'weight_grams', newWeight);
                            }}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            min="0"
                            max={isInvoiceLinked ? maxWeight : undefined}
                          />
                          {isInvoiceLinked && (
                            <p className="text-xs text-gray-500 mt-1">Max: {maxWeight.toFixed(3)}g</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Purity</label>
                          <input
                            type="number"
                            value={item.purity}
                            onChange={(e) => handleItemChange(index, 'purity', parseInt(e.target.value) || 916)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            min="1"
                            disabled={isInvoiceLinked}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-5 gap-3">
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-600 mb-1">Amount (OMR)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.amount}
                            onChange={(e) => handleItemChange(index, 'amount', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            min="0"
                            disabled={isInvoiceLinked}
                          />
                        </div>
                        <div className="col-span-3 flex items-end">
                          {formData.items.length > 1 && !isInvoiceLinked && (
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                            >
                              Remove Item
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Only allow adding items when NOT linked to invoice */}
                {(!formData.reference_id || formData.return_type !== 'sale_return') && (
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Add Another Item
                  </button>
                )}
              </div>
              
              {/* Refund Details - HIDDEN IN CREATE (Added During Edit or Finalize) */}
              <div className="bg-gradient-to-r from-blue-50 to-green-50 border-l-4 border-blue-500 rounded-md p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-semibold text-blue-900">📝 Simple Draft Creation</h3>
                    <div className="mt-2 text-sm text-blue-800">
                      <p className="mb-1">✅ <strong>What you're doing now:</strong> Creating a draft return with just the items</p>
                      <p className="mb-1">⏭️ <strong>What happens next:</strong> You can add refund details later by:</p>
                      <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                        <li>Editing the draft to add refund mode, amounts, and account</li>
                        <li>OR finalizing directly (which will prompt for refund details)</li>
                      </ul>
                      <p className="mt-2 text-xs italic">💡 This keeps draft creation quick and simple - just focus on the returned items!</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Reason and Notes */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Return Reason</label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => handleFormChange('reason', e.target.value)}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Why is this item being returned?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleFormChange('notes', e.target.value)}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Additional notes"
                  />
                </div>
              </div>
            </div>
            
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={closeCreateDialog}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateReturn}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Draft Return'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Return Dialog */}
      {showEditDialog && editingReturn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-semibold text-gray-800">Edit Return Draft - {editingReturn.return_number}</h2>
              <p className="text-sm text-gray-600 mt-1">Update refund details before finalization</p>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              {/* Reference Info (Read-only) */}
              <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Return Reference (Cannot be changed)</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Type:</span>
                    <span className="ml-2 font-medium">{formData.return_type === 'sale_return' ? 'Sales Return' : 'Purchase Return'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Reference:</span>
                    <span className="ml-2 font-medium">{editingReturn.reference_number || editingReturn.reference_id.substring(0, 8)}</span>
                  </div>
                </div>
              </div>
              
              {/* Refund Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Refund Mode *</label>
                <select
                  value={formData.refund_mode}
                  onChange={(e) => handleFormChange('refund_mode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="money">Money Refund</option>
                  <option value="gold">Gold Refund</option>
                  <option value="mixed">Mixed (Money + Gold)</option>
                </select>
              </div>
              
              {/* Refund Details */}
              <div className="grid grid-cols-2 gap-4">
                {(formData.refund_mode === 'money' || formData.refund_mode === 'mixed') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Refund Money Amount (OMR) *</label>
                    <input
                      type="number"
                      value={formData.refund_money_amount}
                      onChange={(e) => handleFormChange('refund_money_amount', parseFloat(e.target.value) || 0)}
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                )}
                
                {(formData.refund_mode === 'gold' || formData.refund_mode === 'mixed') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Refund Gold Weight (grams) *</label>
                      <input
                        type="number"
                        value={formData.refund_gold_grams}
                        onChange={(e) => handleFormChange('refund_gold_grams', parseFloat(e.target.value) || 0)}
                        step="0.001"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Gold Purity *</label>
                      <input
                        type="number"
                        value={formData.refund_gold_purity}
                        onChange={(e) => handleFormChange('refund_gold_purity', parseFloat(e.target.value) || 916)}
                        step="1"
                        min="1"
                        max="999"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="916"
                      />
                    </div>
                  </>
                )}
              </div>
              
              {/* Account Selection (for money refund) */}
              {(formData.refund_mode === 'money' || formData.refund_mode === 'mixed') && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode *</label>
                    <select
                      value={formData.payment_mode}
                      onChange={(e) => handleFormChange('payment_mode', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="cash">Cash</option>
                      <option value="bank">Bank</option>
                      <option value="card">Card</option>
                      <option value="online">Online</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account *</label>
                    <select
                      value={formData.account_id}
                      onChange={(e) => handleFormChange('account_id', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Select Account --</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.account_type}) - {formatCurrency(acc.current_balance)} OMR
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              
              {/* Reason and Notes */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Return Reason</label>
                  <input
                    type="text"
                    value={formData.reason}
                    onChange={(e) => handleFormChange('reason', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Damaged goods, Customer dissatisfaction"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => handleFormChange('notes', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Any additional information"
                  />
                </div>
              </div>
              
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>
            
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end space-x-3 border-t border-gray-200">
              <button
                onClick={closeEditDialog}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateReturn}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Return'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Return Dialog */}
      {showViewDialog && selectedReturn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-semibold text-gray-800">Return Details</h2>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              {/* Return Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Return Number</label>
                  <p className="text-gray-900">{selectedReturn.return_number}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <p>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(selectedReturn.status)}`}>
                      {formatStatusText(selectedReturn.status)}
                      {selectedReturn.status === 'finalized' && (
                        <svg className="ml-1 w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Return Type</label>
                  <p>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getReturnTypeBadge(selectedReturn.return_type)}`}>
                      {selectedReturn.return_type === 'sale_return' ? 'Sales Return' : 'Purchase Return'}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Party</label>
                  <p className="text-gray-900">{selectedReturn.party_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Date</label>
                  <p className="text-gray-900">{formatDateTime(selectedReturn.date)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Reference</label>
                  <p className="text-gray-900">{selectedReturn.reference_number || selectedReturn.reference_id.substring(0, 8)}</p>
                </div>
              </div>
              
              {/* Items */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Return Items</label>
                <div className="border border-gray-200 rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Qty</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Weight</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Purity</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedReturn.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.description}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.qty}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{formatWeight(item.weight_grams)}g</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.purity}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Refund Details */}
              <div className="border-t pt-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Refund Details</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Refund Mode</label>
                    <p>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRefundModeBadge(selectedReturn.refund_mode)}`}>
                        {selectedReturn.refund_mode}
                      </span>
                    </p>
                  </div>
                  {(selectedReturn.refund_mode === 'money' || selectedReturn.refund_mode === 'mixed') && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Money Amount</label>
                        <p className="text-gray-900">{formatCurrency(selectedReturn.refund_money_amount)} OMR</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Account</label>
                        <p className="text-gray-900">{selectedReturn.account_name || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Payment Mode</label>
                        <p className="text-gray-900">{selectedReturn.payment_mode || 'N/A'}</p>
                      </div>
                    </>
                  )}
                  {(selectedReturn.refund_mode === 'gold' || selectedReturn.refund_mode === 'mixed') && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Gold Weight</label>
                        <p className="text-gray-900">{formatWeight(selectedReturn.refund_gold_grams)}g</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Gold Purity</label>
                        <p className="text-gray-900">{selectedReturn.refund_gold_purity || 'N/A'}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {/* Reason and Notes */}
              {(selectedReturn.reason || selectedReturn.notes) && (
                <div className="border-t pt-4">
                  {selectedReturn.reason && (
                    <div className="mb-3">
                      <label className="text-sm font-medium text-gray-500">Return Reason</label>
                      <p className="text-gray-900">{selectedReturn.reason}</p>
                    </div>
                  )}
                  {selectedReturn.notes && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Notes</label>
                      <p className="text-gray-900">{selectedReturn.notes}</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Finalized Details */}
              {selectedReturn.status === 'finalized' && (
                <div className="border-t pt-4">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Finalization Details</label>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Finalized At</label>
                      <p className="text-gray-900">{formatDateTime(selectedReturn.finalized_at)}</p>
                    </div>
                    {selectedReturn.transaction_id && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Transaction ID</label>
                        <p className="text-gray-900 font-mono text-xs">{selectedReturn.transaction_id.substring(0, 16)}...</p>
                      </div>
                    )}
                    {selectedReturn.gold_ledger_id && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Gold Ledger ID</label>
                        <p className="text-gray-900 font-mono text-xs">{selectedReturn.gold_ledger_id.substring(0, 16)}...</p>
                      </div>
                    )}
                    {selectedReturn.stock_movement_ids && selectedReturn.stock_movement_ids.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Stock Movements</label>
                        <p className="text-gray-900">{selectedReturn.stock_movement_ids.length} movement(s) created</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowViewDialog(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Finalize Confirmation Dialog */}
      {showFinalizeDialog && finalizeImpact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Confirm Finalization</h2>
            </div>
            
            <div className="px-6 py-4">
              <div className="mb-4">
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Return:</strong> {finalizeImpact.return_number}
                </p>
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Type:</strong> {finalizeImpact.return_type === 'sale_return' ? 'Sales Return' : 'Purchase Return'}
                </p>
                <p className="text-sm text-gray-700 mb-4">
                  <strong>Party:</strong> {finalizeImpact.party_name}
                </p>
              </div>
              
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                <p className="text-sm font-medium text-blue-800 mb-2">Impact Summary:</p>
                <ul className="text-sm text-blue-700 space-y-1">
                  {finalizeImpact.impacts && finalizeImpact.impacts.map((impact, idx) => (
                    <li key={idx}>{impact}</li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ Warning:</strong> {finalizeImpact.warning}
                </p>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowFinalizeDialog(false);
                  setFinalizeImpact(null);
                  setSelectedReturn(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleFinalizeReturn}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
                disabled={loading || !finalizeImpact.can_proceed}
              >
                {loading ? 'Finalizing...' : 'Confirm Finalize'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && returnToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Return</h3>
              </div>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <p className="text-sm text-gray-700">
                Are you sure you want to delete this return? This action cannot be undone.
              </p>
              
              <div className="bg-gray-50 rounded-md p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700">Return Number:</span>
                  <span className="text-gray-900">{returnToDelete.return_number}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700">Type:</span>
                  <span className="text-gray-900">
                    {returnToDelete.return_type === 'sale_return' ? 'Sales Return' : 'Purchase Return'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700">Party:</span>
                  <span className="text-gray-900">{returnToDelete.party_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700">Amount:</span>
                  <span className="text-gray-900">
                    {returnToDelete.refund_mode === 'money' && `${formatCurrency(returnToDelete.refund_money_amount)} OMR`}
                    {returnToDelete.refund_mode === 'gold' && `${formatWeight(returnToDelete.refund_gold_grams)}g`}
                    {returnToDelete.refund_mode === 'mixed' && (
                      <span>
                        {formatCurrency(returnToDelete.refund_money_amount)} OMR + {formatWeight(returnToDelete.refund_gold_grams)}g
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700">Status:</span>
                  <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                    Draft
                  </span>
                </div>
              </div>
              
              <div className="bg-red-50 border-l-4 border-red-400 p-3">
                <p className="text-sm text-red-700">
                  <strong>Warning:</strong> This return draft will be permanently deleted from the system.
                </p>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={closeDeleteDialog}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                disabled={deleting}
              >
                <X size={16} />
                <span>Cancel</span>
              </button>
              <button
                onClick={handleDeleteReturn}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 flex items-center gap-2"
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    <span>Delete Return</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReturnsPage;
