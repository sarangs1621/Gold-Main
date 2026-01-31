import React, { useState, useEffect } from 'react';
import { formatWeight, formatCurrency, safeToFixed } from '../utils/numberFormat';
import { formatDateTime, formatDate, formatDateOnly, displayDateOnly } from '../utils/dateTimeUtils';
import { API, useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Plus, FileText, Trash2, Edit, AlertTriangle, Save, FolderOpen, Settings, CheckCircle, Truck, Eye, Lock } from 'lucide-react';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import Pagination from '../components/Pagination';
import { useURLPagination } from '../hooks/useURLPagination';

export default function JobCardsPage() {
  const { user } = useAuth();
  const { currentPage, setPage, pagination, setPagination } = useURLPagination();
  const [jobcards, setJobcards] = useState([]);
  const [parties, setParties] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [inventoryHeaders, setInventoryHeaders] = useState([]);
  const [invoicesMap, setInvoicesMap] = useState({}); // Map of jobcard_id -> invoice data
  const [showDialog, setShowDialog] = useState(false);
  const [editingJobCard, setEditingJobCard] = useState(null);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [convertingJobCard, setConvertingJobCard] = useState(null);
  const [convertData, setConvertData] = useState({
    customer_type: 'saved',
    customer_id: '',
    customer_name: '',
    walk_in_name: '',
    walk_in_phone: '',
    discount_amount: 0  // MODULE 7: Discount amount
  });
  
  // View dialog state
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [viewJobCard, setViewJobCard] = useState(null);
  
  // Template state
  const [templates, setTemplates] = useState([]);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showManageTemplatesDialog, setShowManageTemplatesDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  
  // Confirmation dialog states
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    type: 'delete', // 'delete', 'status_change'
    title: '',
    description: '',
    impact: null,
    action: null,
    loading: false
  });
  
  const [formData, setFormData] = useState({
    card_type: 'individual',
    customer_type: 'saved',  // 'saved' or 'walk_in'
    customer_id: '',
    customer_name: '',
    walk_in_name: '',
    walk_in_phone: '',
    worker_id: '',
    delivery_date: '',
    notes: '',
    gold_rate_at_jobcard: '',  // MODULE 8: Gold rate at time of job card creation
    status: 'created',
    template_name: '',  // For templates
    delivery_days_offset: '',  // For templates: days from creation
    items: [{
      category: 'Chain',
      description: '',
      qty: 1,
      weight_in: 0,
      weight_out: 0,
      purity: 916,
      work_type: 'polish',
      remarks: '',
      making_charge_type: 'flat',
      making_charge_value: 0,
      vat_percent: 5
    }]
  });

  useEffect(() => {
    loadData();
    loadTemplates();
  }, [currentPage]);

  const loadData = async () => {
    try {
      const [jobcardsRes, partiesRes, headersRes, workersRes] = await Promise.all([
        API.get(`/api/jobcards`, {
          params: { page: currentPage, page_size: 10 }
        }),
        API.get(`/api/parties?party_type=customer`),
        API.get(`/api/inventory/headers`),
        API.get(`/api/workers?active=true`)
      ]);
      
      const loadedJobcards = jobcardsRes.data.items || [];
      setJobcards(loadedJobcards);
      setPagination(jobcardsRes.data.pagination);
      setParties(partiesRes.data.items || []);
      setInventoryHeaders(headersRes.data?.items || []);
      setWorkers(workersRes.data.items || []);
      
      // Fetch invoices for all invoiced job cards to check payment status
      const invoicedJobcards = loadedJobcards.filter(jc => jc.is_invoiced);
      if (invoicedJobcards.length > 0) {
        try {
          // Fetch all invoices (we'll filter by jobcard_id on frontend)
          const invoicesRes = await API.get(`/api/invoices`, {
            params: { page: 1, page_size: 1000 } // Get all invoices
          });
          
          // Create a map of jobcard_id -> invoice for quick lookup
          const invoices = invoicesRes.data.items || [];
          const map = {};
          invoices.forEach(invoice => {
            if (invoice.jobcard_id) {
              map[invoice.jobcard_id] = invoice;
            }
          });
          setInvoicesMap(map);
        } catch (error) {
          console.error('Failed to load invoices:', error);
          setInvoicesMap({});
        }
      } else {
        setInvoicesMap({});
      }
    } catch (error) {
      toast.error('Failed to load data');
      // Ensure arrays are set even on error
      setJobcards([]);
      setParties([]);
      setInventoryHeaders([]);
      setWorkers([]);
      setInvoicesMap({});
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await API.get(`/api/jobcard-templates`);
      setTemplates(response.data.items || []);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const handleCreateJobCard = async () => {
    try {
      // Check if saving as template
      if (saveAsTemplate) {
        return await handleSaveTemplate();
      }

      // Validate based on customer type
      if (formData.customer_type === 'saved') {
        if (!formData.customer_id) {
          toast.error('Please select a customer');
          return;
        }
      } else if (formData.customer_type === 'walk_in') {
        if (!formData.walk_in_name || !formData.walk_in_name.trim()) {
          toast.error('Please enter customer name for walk-in');
          return;
        }
      }

      // Prepare data for create/update
      const data = {
        ...formData,
        gold_rate_at_jobcard: formData.gold_rate_at_jobcard ? parseFloat(formData.gold_rate_at_jobcard) : null,
        delivery_days_offset: formData.delivery_days_offset ? parseInt(formData.delivery_days_offset) : null,
        items: formData.items.map(item => ({
          ...item,
          qty: parseInt(item.qty),
          weight_in: parseFloat(item.weight_in),
          weight_out: item.weight_out ? parseFloat(item.weight_out) : null,
          purity: parseInt(item.purity),
          making_charge_value: item.making_charge_value ? parseFloat(item.making_charge_value) : null,
          vat_percent: item.vat_percent ? parseFloat(item.vat_percent) : null
        }))
      };

      // Add customer name for saved customers
      if (formData.customer_type === 'saved') {
        const customer = parties.find(p => p.id === formData.customer_id);
        data.customer_name = customer?.name || '';
      }

      // Confirmation for status change to completed or delivered (only when editing)
      if (editingJobCard) {
        const oldStatus = editingJobCard.status || 'created';
        const newStatus = formData.status;
        
        // Normalize statuses for comparison
        const normalizeStatus = (status) => status?.toLowerCase().replace(/\s+/g, '_');
        const oldNormalized = normalizeStatus(oldStatus);
        const newNormalized = normalizeStatus(newStatus);
        
        // Check if transitioning to completed or delivered - show enhanced confirmation
        if ((newNormalized === 'completed' && oldNormalized !== 'completed') ||
            (newNormalized === 'delivered' && oldNormalized !== 'delivered')) {
          
          // Load impact data
          const impactRes = await API.get(`/api/jobcards/${editingJobCard.id}/impact`);
          const impact = impactRes.data;
          
          return new Promise((resolve) => {
            const statusLabel = newNormalized === 'completed' ? 'COMPLETED' : 'DELIVERED';
            const statusDescription = newNormalized === 'completed' 
              ? 'This indicates the work is finished and ready for customer pickup.'
              : 'This indicates the customer has received the item and allows converting to invoice.';
            
            setConfirmDialog({
              open: true,
              type: 'status_change',
              title: `Mark Job Card as ${statusLabel}`,
              description: `${statusDescription}\n\nThis action will update the job card status and cannot be easily reversed.`,
              impact: impact,
              action: async () => {
                try {
                  setConfirmDialog(prev => ({ ...prev, loading: true }));
                  await performJobCardUpdate(data, editingJobCard.id);
                  setConfirmDialog(prev => ({ ...prev, open: false, loading: false }));
                  resolve(true);
                } catch (error) {
                  setConfirmDialog(prev => ({ ...prev, loading: false }));
                  resolve(false);
                }
              },
              loading: false
            });
          });
        }
      }

      // If no confirmation needed, proceed with update/create
      await performJobCardUpdate(data, editingJobCard?.id);
      
    } catch (error) {
      const errorMsg = error.response?.data?.detail || `Failed to ${editingJobCard ? 'update' : 'create'} job card`;
      toast.error(errorMsg);
      console.error('Job card error:', error);
    }
  };

  // Helper function to perform the actual update/create
  const performJobCardUpdate = async (data, jobcardId) => {
    try {
      if (jobcardId) {
        // Update existing job card
        await API.patch(`/api/jobcards/${jobcardId}`, data);
        toast.success('Job card updated successfully');
      } else {
        // Create new job card
        await API.post(`/api/jobcards`, data);
        toast.success('Job card created successfully');
      }
      
      handleCloseDialog();
      loadData();
    } catch (error) {
      throw error;
    }
  };

  // Template functions
  const handleSaveTemplate = async () => {
    try {
      if (!formData.template_name || !formData.template_name.trim()) {
        toast.error('Please enter a template name');
        return;
      }

      const templateData = {
        card_type: 'template',
        template_name: formData.template_name.trim(),
        worker_id: formData.worker_id || null,
        notes: formData.notes || null,
        gold_rate_at_jobcard: formData.gold_rate_at_jobcard ? parseFloat(formData.gold_rate_at_jobcard) : null,
        delivery_days_offset: formData.delivery_days_offset ? parseInt(formData.delivery_days_offset) : null,
        items: formData.items.map(item => ({
          ...item,
          qty: parseInt(item.qty),
          weight_in: parseFloat(item.weight_in),
          weight_out: item.weight_out ? parseFloat(item.weight_out) : null,
          purity: parseInt(item.purity),
          making_charge_value: item.making_charge_value ? parseFloat(item.making_charge_value) : null,
          vat_percent: item.vat_percent ? parseFloat(item.vat_percent) : null
        }))
      };

      if (editingTemplate) {
        await API.patch(`/api/jobcard-templates/${editingTemplate.id}`, templateData);
        toast.success('Template updated successfully');
      } else {
        await API.post(`/api/jobcard-templates`, templateData);
        toast.success('Template saved successfully');
      }
      
      handleCloseDialog();
      loadTemplates();
      setShowManageTemplatesDialog(false);
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Failed to save template';
      toast.error(errorMsg);
    }
  };

  const handleLoadTemplate = (template) => {
    // Calculate delivery date based on delivery_days_offset
    let deliveryDate = '';
    if (template.delivery_days_offset) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + template.delivery_days_offset);
      deliveryDate = futureDate.toISOString().split('T')[0];
    }

    setFormData({
      ...formData,
      card_type: 'individual', // Always create as individual job card
      worker_id: template.worker_id || '',
      notes: template.notes || '',
      gold_rate_at_jobcard: template.gold_rate_at_jobcard || '',
      delivery_date: deliveryDate,
      items: template.items.map(item => ({...item})) // Deep copy items
    });
    
    setShowTemplateDialog(false);
    toast.success(`Template "${template.template_name}" loaded`);
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setSaveAsTemplate(true);
    
    setFormData({
      card_type: 'template',
      customer_type: 'saved',
      customer_id: '',
      customer_name: '',
      walk_in_name: '',
      walk_in_phone: '',
      worker_id: template.worker_id || '',
      delivery_date: '',
      notes: template.notes || '',
      gold_rate_at_jobcard: template.gold_rate_at_jobcard || '',
      status: 'created',
      template_name: template.template_name || '',
      delivery_days_offset: template.delivery_days_offset || '',
      items: template.items.map(item => ({...item}))
    });
    
    setShowManageTemplatesDialog(false);
    setShowDialog(true);
  };

  const handleDeleteTemplate = async (templateId, templateName) => {
    if (!window.confirm(`Are you sure you want to delete template "${templateName}"?`)) {
      return;
    }

    try {
      await API.delete(`/api/jobcard-templates/${templateId}`);
      toast.success('Template deleted successfully');
      loadTemplates();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Failed to delete template';
      toast.error(errorMsg);
    }
  };

   const handleConvertToInvoice = async (jobcard) => {
    // CRITICAL: Client-side validation to prevent duplicate conversions
    if (jobcard.is_invoiced) {
      alert(`This job card has already been converted to an invoice (Invoice ID: ${jobcard.invoice_id || 'N/A'}). Please use the "View Invoice" button instead.`);
      return;
    }
    
    // Open dialog to select customer type - pre-populate based on job card
    setConvertingJobCard(jobcard);
    
    if (jobcard.customer_type === 'walk_in') {
      // Job card is for walk-in customer
      setConvertData({
        customer_type: 'walk_in',
        customer_id: '',
        customer_name: '',
        walk_in_name: jobcard.walk_in_name || '',
        walk_in_phone: jobcard.walk_in_phone || '',
        discount_amount: 0  // MODULE 7: Initialize discount
      });
    } else {
      // Job card is for saved customer
      setConvertData({
        customer_type: 'saved',
        customer_id: jobcard.customer_id || '',
        customer_name: jobcard.customer_name || '',
        walk_in_name: '',
        walk_in_phone: '',
        discount_amount: 0  // MODULE 7: Initialize discount
      });
    }
    
    setShowConvertDialog(true);
  };

  const handleConfirmConvert = async () => {
    try {
      const payload = {
        customer_type: convertData.customer_type,
        discount_amount: parseFloat(convertData.discount_amount) || 0  // MODULE 7: Include discount
      };

      if (convertData.customer_type === 'saved') {
        if (!convertData.customer_id) {
          toast.error('Please select a customer');
          return;
        }
        payload.customer_id = convertData.customer_id;
        payload.customer_name = convertData.customer_name;
      } else {
        if (!convertData.walk_in_name.trim()) {
          toast.error('Please enter customer name for walk-in');
          return;
        }
        payload.walk_in_name = convertData.walk_in_name;
        payload.walk_in_phone = convertData.walk_in_phone;
      }

      const response = await API.post(
        `/api/jobcards/${convertingJobCard.id}/convert-to-invoice`, 
        payload
      );
      
      toast.success(`Invoice ${response.data.invoice_number} created successfully`);
      setShowConvertDialog(false);
      setConvertingJobCard(null);
      loadData();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Failed to convert to invoice';
      toast.error(errorMsg);
    }
  };

  const handleEditJobCard = (jobcard) => {
    setEditingJobCard(jobcard);
    // delivery_date is already in YYYY-MM-DD format (date-only field)
    const deliveryDate = jobcard.delivery_date || '';
    setFormData({
      card_type: jobcard.card_type,
      customer_type: jobcard.customer_type || 'saved',
      customer_id: jobcard.customer_id || '',
      customer_name: jobcard.customer_name || '',
      walk_in_name: jobcard.walk_in_name || '',
      walk_in_phone: jobcard.walk_in_phone || '',
      worker_id: jobcard.worker_id || '',
      delivery_date: deliveryDate,
      notes: jobcard.notes || '',
      gold_rate_at_jobcard: jobcard.gold_rate_at_jobcard || '',  // MODULE 8: Load gold rate
      status: jobcard.status || 'created',
      items: jobcard.items.map(item => ({
        ...item,
        making_charge_type: item.making_charge_type || 'flat',
        making_charge_value: item.making_charge_value || 0,
        vat_percent: item.vat_percent || 5
      }))
    });
    setShowDialog(true);
  };

  const handleViewJobCard = (jobcard) => {
    setViewJobCard(jobcard);
    setShowViewDialog(true);
  };

  const handleDeleteJobCard = async (jobcardId, jobcardNumber) => {
    // Load impact data first
    try {
      const impactRes = await API.get(`/api/jobcards/${jobcardId}/delete-impact`);
      const impact = impactRes.data;
      
      setConfirmDialog({
        open: true,
        type: 'delete',
        title: 'Delete Job Card',
        description: `Are you sure you want to delete job card ${jobcardNumber}? This action cannot be undone and will permanently remove this record from the system.`,
        impact: impact,
        action: async () => {
          try {
            setConfirmDialog(prev => ({ ...prev, loading: true }));
            await API.delete(`/api/jobcards/${jobcardId}`);
            toast.success('Job card deleted successfully');
            setConfirmDialog(prev => ({ ...prev, open: false, loading: false }));
            loadData();
          } catch (error) {
            const errorMsg = error.response?.data?.detail || 'Failed to delete job card';
            toast.error(errorMsg);
            setConfirmDialog(prev => ({ ...prev, loading: false }));
          }
        },
        loading: false
      });
    } catch (error) {
      toast.error('Failed to load job card details');
    }
  };

  const handleCompleteJobCard = async (jobcardId, jobcardNumber) => {
    // Load impact data first
    try {
      const impactRes = await API.get(`/api/jobcards/${jobcardId}/complete-impact`);
      const impact = impactRes.data;
      
      setConfirmDialog({
        open: true,
        type: 'status_change',
        title: 'Complete Job Card',
        description: `Mark job card ${jobcardNumber} as completed? This will update the status from "In Progress" to "Completed".`,
        impact: impact,
        action: async () => {
          try {
            setConfirmDialog(prev => ({ ...prev, loading: true }));
            await API.patch(`/api/jobcards/${jobcardId}`, { status: 'completed' });
            toast.success('Job card marked as completed');
            setConfirmDialog(prev => ({ ...prev, open: false, loading: false }));
            loadData();
          } catch (error) {
            const errorMsg = error.response?.data?.detail || 'Failed to complete job card';
            toast.error(errorMsg);
            setConfirmDialog(prev => ({ ...prev, loading: false }));
          }
        },
        loading: false
      });
    } catch (error) {
      toast.error('Failed to load job card details');
    }
  };

  const handleDeliverJobCard = async (jobcardId, jobcardNumber) => {
    // Load impact data first
    try {
      const impactRes = await API.get(`/api/jobcards/${jobcardId}/deliver-impact`);
      const impact = impactRes.data;
      
      // Check if invoice exists before allowing delivery
      if (impact.invoice_required || !impact.has_invoice) {
        toast.error('Please convert this job card to an invoice before delivery.');
        return;
      }
      
      setConfirmDialog({
        open: true,
        type: 'status_change',
        title: 'Deliver Job Card',
        description: `Mark job card ${jobcardNumber} as delivered? This will finalize the job card and the customer has received their items.`,
        impact: impact,
        action: async () => {
          try {
            setConfirmDialog(prev => ({ ...prev, loading: true }));
            await API.patch(`/api/jobcards/${jobcardId}`, { status: 'delivered' });
            toast.success('Job card marked as delivered');
            setConfirmDialog(prev => ({ ...prev, open: false, loading: false }));
            loadData();
          } catch (error) {
            const errorMsg = error.response?.data?.detail || 'Failed to deliver job card';
            toast.error(errorMsg);
            setConfirmDialog(prev => ({ ...prev, loading: false }));
          }
        },
        loading: false
      });
    } catch (error) {
      toast.error('Failed to load job card details');
    }
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingJobCard(null);
    setEditingTemplate(null);
    setSaveAsTemplate(false);
    // Reset form to default - use first inventory header if available
    const defaultCategory = (inventoryHeaders && inventoryHeaders.length > 0) ? inventoryHeaders[0].name : 'Chain';
    
    setFormData({
      card_type: 'individual',
      customer_type: 'saved',
      customer_id: '',
      customer_name: '',
      walk_in_name: '',
      walk_in_phone: '',
      worker_id: '',
      delivery_date: '',
      notes: '',
      gold_rate_at_jobcard: '',  // MODULE 8: Reset gold rate
      status: 'created',
      template_name: '',
      delivery_days_offset: '',
      items: [{
        category: defaultCategory,
        description: '',
        qty: 1,
        weight_in: 0,
        weight_out: 0,
        purity: 916,
        work_type: 'polish',
        remarks: '',
        making_charge_type: 'flat',
        making_charge_value: '',
        vat_percent: 5
      }]
    });
  };

  const addItem = () => {
    // Use first inventory header as default category if available
    const defaultCategory = (inventoryHeaders && inventoryHeaders.length > 0) ? inventoryHeaders[0].name : 'Chain';
    
    setFormData({
      ...formData,
      items: [...formData.items, {
        category: defaultCategory,
        description: '',
        qty: 1,
        weight_in: 0,
        weight_out: 0,
        purity: 916,
        work_type: 'polish',
        remarks: '',
        making_charge_type: 'flat',
        making_charge_value: '',
        vat_percent: 5
      }]
    });
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, idx) => idx !== index);
      setFormData({ ...formData, items: newItems });
    } else {
      toast.error('At least one item is required');
    }
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const getStatusBadge = (status) => {
    const variants = {
      created: 'bg-blue-100 text-blue-800',
      'in progress': 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      delivered: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return <Badge className={variants[status] || 'bg-gray-100 text-gray-800'}>{status}</Badge>;
  };

  return (
    <div data-testid="jobcards-page">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-serif font-semibold text-gray-900 mb-2">Job Cards</h1>
          <p className="text-muted-foreground">Manage repair and custom work orders</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowManageTemplatesDialog(true)}
          >
            <Settings className="w-4 h-4 mr-2" /> Manage Templates
          </Button>
          <Button data-testid="create-jobcard-button" onClick={() => setShowDialog(true)}>
            <Plus className="w-4 h-4 mr-2" /> Create Job Card
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-serif">All Job Cards</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="jobcards-table">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Job Card #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Worker</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Items</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobcards.map((jc) => (
                  <tr key={jc.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono font-semibold">{jc.job_card_number}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span>{jc.customer_type === 'walk_in' ? jc.walk_in_name : jc.customer_name || '-'}</span>
                        {jc.customer_type === 'walk_in' && (
                          <Badge className="bg-amber-100 text-amber-800 text-xs">Walk-in</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {jc.worker_name || <span className="text-muted-foreground">-</span>}
                    </td>
                    <td className="px-4 py-3 text-sm">{formatDate(jc.created_at || jc.date_created)}</td>
                    <td className="px-4 py-3">{getStatusBadge(jc.status)}</td>
                    <td className="px-4 py-3 text-sm">{(jc.items && jc.items.length) || 0} items</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {/* View button - always available */}
                        <Button
                          data-testid={`view-${jc.job_card_number}`}
                          size="sm"
                          variant="outline"
                          className="text-indigo-600 hover:text-indigo-700"
                          onClick={() => handleViewJobCard(jc)}
                        >
                          <Eye className="w-4 h-4 mr-1" /> View
                        </Button>
                        
                        {/* Edit button - hide for locked, completed, and delivered job cards */}
                        {!jc.locked && jc.status !== 'completed' && jc.status !== 'delivered' && (
                          <Button
                            data-testid={`edit-${jc.job_card_number}`}
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditJobCard(jc)}
                          >
                            <Edit className="w-4 h-4 mr-1" /> Edit
                          </Button>
                        )}
                        
                        {/* Delete button - hide for locked, completed, and delivered job cards */}
                        {!jc.locked && jc.status !== 'completed' && jc.status !== 'delivered' && (
                          <Button
                            data-testid={`delete-${jc.job_card_number}`}
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteJobCard(jc.id, jc.job_card_number)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" /> Delete
                          </Button>
                        )}
                        
                        {/* Complete button - only for in_progress job cards */}
                        {jc.status === 'in_progress' && (
                          <Button
                            data-testid={`complete-${jc.job_card_number}`}
                            size="sm"
                            variant="default"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleCompleteJobCard(jc.id, jc.job_card_number)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" /> Complete
                          </Button>
                        )}
                        
                        {/* Deliver button - only for completed job cards that have been invoiced */}
                        {jc.status === 'completed' && !jc.locked && jc.is_invoiced && (() => {
                          const invoice = invoicesMap[jc.id];
                          const isFullyPaid = invoice && invoice.payment_status === 'paid' && invoice.balance_due === 0;
                          const isBlocked = !isFullyPaid;
                          
                          if (isBlocked) {
                            // Show disabled button with lock icon when payment is not complete
                            const balanceDue = invoice?.balance_due || 0;
                            const paymentStatus = invoice?.payment_status || 'unknown';
                            return (
                              <div className="relative group">
                                <Button
                                  data-testid={`deliver-blocked-${jc.job_card_number}`}
                                  size="sm"
                                  variant="outline"
                                  disabled={true}
                                  className="bg-gray-100 text-gray-400 cursor-not-allowed"
                                >
                                  <Lock className="w-4 h-4 mr-1" /> Delivery Blocked
                                </Button>
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                                  {paymentStatus === 'unpaid' && 'Delivery blocked: Invoice is unpaid'}
                                  {paymentStatus === 'partial' && `Delivery blocked: Outstanding balance ${formatCurrency(balanceDue)}`}
                                  {!invoice && 'Delivery blocked: Invoice not found'}
                                  <br />Full payment required before delivery
                                </div>
                              </div>
                            );
                          } else {
                            // Show enabled deliver button when fully paid
                            return (
                              <Button
                                data-testid={`deliver-${jc.job_card_number}`}
                                size="sm"
                                variant="default"
                                className="bg-purple-600 hover:bg-purple-700"
                                onClick={() => handleDeliverJobCard(jc.id, jc.job_card_number)}
                              >
                                <Truck className="w-4 h-4 mr-1" /> Deliver
                              </Button>
                            );
                          }
                        })()}
                        
                     {/* Convert to Invoice button - only for completed job cards that haven't been invoiced */}
                        {jc.status === 'completed' && !jc.is_invoiced && (
                          <Button
                            data-testid={`convert-${jc.job_card_number}`}
                            size="sm"
                            variant="outline"
                            onClick={() => handleConvertToInvoice(jc)}
                          >
                            <FileText className="w-4 h-4 mr-1" /> Convert to Invoice
                          </Button>
                        )}
                        
                        {/* View Invoice button - for job cards that have been converted to invoice */}
                        {jc.is_invoiced && jc.invoice_id && (
                          <Button
                            data-testid={`view-invoice-${jc.job_card_number}`}
                            size="sm"
                            variant="outline"
                            onClick={() => window.location.href = `/invoices?highlight=${jc.invoice_id}`}
                          >
                            <Eye className="w-4 h-4 mr-1" /> View Invoice
                          </Button>
                        )}
                        
                        {/* Locked indicator */}
                        {jc.locked && (
                          <Badge className="bg-gray-100 text-gray-700">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Locked
                          </Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {jobcards.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No job cards found</p>
              </div>
            )}
          </div>
        </CardContent>
        {pagination && <Pagination pagination={pagination} onPageChange={setPage} />}
      </Card>

            <Dialog open={showDialog} onOpenChange={(open) => { if (!open) handleCloseDialog(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : editingJobCard ? 'Edit Job Card' : saveAsTemplate ? 'Save as Template' : 'Create New Job Card'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            {/* Load Template Button - Only show when creating new job card */}
            {!editingJobCard && !saveAsTemplate && !editingTemplate && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowTemplateDialog(true)}
                  className="flex-1"
                >
                  <FolderOpen className="w-4 h-4 mr-2" /> Load from Template
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSaveAsTemplate(true)}
                  className="flex-1"
                  disabled={user?.role !== 'admin'}
                >
                  <Save className="w-4 h-4 mr-2" /> Save as Template {user?.role !== 'admin' && '(Admin Only)'}
                </Button>
              </div>
            )}

            {/* Template Name Field - Show when saving as template */}
            {(saveAsTemplate || editingTemplate) && (
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <Label className="text-base font-semibold">Template Name *</Label>
                <Input
                  value={formData.template_name}
                  onChange={(e) => setFormData({...formData, template_name: e.target.value})}
                  placeholder="Enter template name (e.g., 'Standard Ring Polish')"
                  className="mt-2"
                />
                <p className="text-xs text-amber-700 mt-1">This template will be available to all users</p>
              </div>
            )}

            {/* Customer Type Selection - Hide for templates */}
            {!saveAsTemplate && !editingTemplate && (
              <div className="mb-6 space-y-3 p-4 bg-gray-50 rounded-lg border">
                <Label className="text-base font-semibold">Customer Type *</Label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="job_customer_type"
                      value="saved"
                      checked={formData.customer_type === 'saved'}
                      onChange={(e) => setFormData({
                        ...formData, 
                        customer_type: e.target.value,
                        walk_in_name: '',
                        walk_in_phone: ''
                      })}
                      className="w-4 h-4"
                    />
                    <span className="font-medium">Saved Customer</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="job_customer_type"
                      value="walk_in"
                      checked={formData.customer_type === 'walk_in'}
                      onChange={(e) => setFormData({
                        ...formData, 
                        customer_type: e.target.value,
                        customer_id: '',
                        customer_name: ''
                      })}
                      className="w-4 h-4"
                    />
                    <span className="font-medium">Walk-in Customer</span>
                  </label>
                </div>
              </div>
            )}

            {/* Grid for Card Type and Customer Selection - Hide for templates */}
            {!saveAsTemplate && !editingTemplate && (
              <div className="grid grid-cols-2 gap-4">
                {/* Saved Customer Section */}
                {formData.customer_type === 'saved' && (
                  <div className="col-span-2">
                    <Label>Customer *</Label>
                    <Select value={formData.customer_id} onValueChange={(val) => {
                      const selected = parties.find(p => p.id === val);
                      setFormData({
                        ...formData, 
                        customer_id: val,
                        customer_name: selected?.name || ''
                      });
                    }}>
                      <SelectTrigger data-testid="customer-select">
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {parties.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      ✓ Ledger tracking and outstanding balance enabled
                    </p>
                  </div>
                )}
                
                {/* Walk-in Customer Section */}
                {formData.customer_type === 'walk_in' && (
                  <>
                    <div>
                      <Label>Customer Name *</Label>
                      <Input
                        data-testid="walk-in-name-input"
                        value={formData.walk_in_name}
                        onChange={(e) => setFormData({...formData, walk_in_name: e.target.value})}
                        placeholder="Enter customer name"
                      />
                    </div>
                    <div>
                      <Label>Phone Number</Label>
                      <Input
                        data-testid="walk-in-phone-input"
                        value={formData.walk_in_phone}
                        onChange={(e) => setFormData({...formData, walk_in_phone: e.target.value})}
                        placeholder="Enter phone (optional)"
                      />
                      <p className="text-xs text-amber-600 mt-1">
                        ⚠ Walk-in customers are NOT saved in Parties
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              {/* For templates: show days offset; For job cards: show actual date */}
              {(saveAsTemplate || editingTemplate) ? (
                <div>
                  <Label>Delivery Days from Creation</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.delivery_days_offset}
                    onChange={(e) => setFormData({...formData, delivery_days_offset: e.target.value})}
                    placeholder="e.g., 7"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Number of days from job card creation to delivery
                  </p>
                </div>
              ) : (
                <div>
                  <Label>Delivery Date</Label>
                  <Input
                    data-testid="delivery-date-input"
                    type="date"
                    value={formData.delivery_date}
                    onChange={(e) => setFormData({...formData, delivery_date: e.target.value})}
                  />
                </div>
              )}
              
              {/* Hide status field for templates */}
              {!saveAsTemplate && !editingTemplate && (
                <div>
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(val) => setFormData({...formData, status: val})}>
                    <SelectTrigger data-testid="status-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created">Created</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Workflow: Created → In Progress → Completed → Delivered
                  </p>
                </div>
              )}
            </div>
            
            {/* MODULE 8: Gold Rate Field */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Gold Rate (per gram) - OMR</Label>
                <Input
                  data-testid="gold-rate-input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.gold_rate_at_jobcard}
                  onChange={(e) => setFormData({...formData, gold_rate_at_jobcard: e.target.value})}
                  placeholder="e.g., 20.00"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Optional: This rate will auto-fill when converting to invoice
                </p>
              </div>
              
              {/* Worker Assignment */}
              {!saveAsTemplate && !editingTemplate && (
                <div>
                  <Label>
                    Assign Worker 
                    {formData.status === 'completed' && <span className="text-red-500"> *</span>}
                  </Label>
                  <Select 
                    value={formData.worker_id} 
                    onValueChange={(val) => {
                      const selectedWorker = workers.find(w => w.id === val);
                      setFormData({
                        ...formData, 
                        worker_id: val,
                        worker_name: selectedWorker?.name || ''
                      });
                    }}
                    disabled={formData.status === 'completed'}
                  >
                    <SelectTrigger data-testid="worker-select">
                      <SelectValue placeholder="Select worker (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* The empty "None" item is removed */}
                      {workers.map(w => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}{w.role ? ` - ${w.role}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.status === 'completed' 
                      ? '✓ Worker assignment locked (job completed)' 
                      : formData.status === 'created' 
                        ? 'Optional at creation, required before completion' 
                        : 'Editable until job is completed'
                    }
                  </p>
                </div>
              )}
            </div>
            
            <div>
              <Label>Notes {(saveAsTemplate || editingTemplate) && '/ Instructions'}</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder={(saveAsTemplate || editingTemplate) ? "Optional instructions for using this template" : "Optional notes"}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <Label className="text-lg">Items</Label>
                <Button data-testid="add-item-button" size="sm" variant="outline" onClick={addItem}>
                  <Plus className="w-4 h-4 mr-1" /> Add Item
                </Button>
              </div>
              {formData.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-4 gap-3 mb-4 p-4 border rounded-md relative">
                  {/* Remove button */}
                  {formData.items.length > 1 && (
                    <Button
                      data-testid={`remove-item-${idx}`}
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2 h-8 w-8 p-0"
                      onClick={() => removeItem(idx)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                  
                  <div>
                    <Label className="text-xs">Category</Label>
                    <Select 
                      value={item.category} 
                      onValueChange={(val) => updateItem(idx, 'category', val)}
                    >
                      <SelectTrigger data-testid={`item-category-${idx}`}>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(inventoryHeaders) && inventoryHeaders.map(header => (
                          <SelectItem key={header.id} value={header.name}>
                            {header.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Description</Label>
                    <Input
                      data-testid={`item-description-${idx}`}
                      value={item.description}
                      onChange={(e) => updateItem(idx, 'description', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Qty</Label>
                    <Input
                      data-testid={`item-qty-${idx}`}
                      type="number"
                      value={item.qty}
                      onChange={(e) => updateItem(idx, 'qty', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Weight IN (g)</Label>
                    <Input
                      data-testid={`item-weight-in-${idx}`}
                      type="number"
                      step="0.001"
                      value={item.weight_in}
                      onChange={(e) => updateItem(idx, 'weight_in', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Purity</Label>
                    <Input
                      type="number"
                      value={item.purity}
                      onChange={(e) => updateItem(idx, 'purity', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Work Type</Label>
                    <Select value={item.work_type} onValueChange={(val) => updateItem(idx, 'work_type', val)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="polish">Polish</SelectItem>
                        <SelectItem value="resize">Resize</SelectItem>
                        <SelectItem value="repair">Repair</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Making Charge Type */}
                  <div>
                    <Label className="text-xs">Making Charge Type</Label>
                    <Select 
                      value={item.making_charge_type || 'flat'} 
                      onValueChange={(val) => updateItem(idx, 'making_charge_type', val)}
                    >
                      <SelectTrigger data-testid={`making-charge-type-${idx}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flat">Flat Rate</SelectItem>
                        <SelectItem value="per_gram">Per Gram</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Making Charge Value */}
                  <div>
                    <Label className="text-xs">
                      Making Charge ({item.making_charge_type === 'per_gram' ? 'OMR/g' : 'OMR'})
                    </Label>
                    <Input
                      data-testid={`making-charge-value-${idx}`}
                      type="number"
                      step="0.001"
                      value={item.making_charge_value || 0}
                      onChange={(e) => updateItem(idx, 'making_charge_value', e.target.value)}
                    />
                  </div>
                  
                  {/* VAT Percent */}
                  <div>
                    <Label className="text-xs">VAT %</Label>
                    <Input
                      data-testid={`vat-percent-${idx}`}
                      type="number"
                      step="0.1"
                      value={item.vat_percent || 5}
                      onChange={(e) => updateItem(idx, 'vat_percent', e.target.value)}
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <Label className="text-xs">Remarks</Label>
                    <Input
                      value={item.remarks}
                      onChange={(e) => updateItem(idx, 'remarks', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* ENHANCED Cost Estimation Section - Option B Improvements */}
            {!saveAsTemplate && !editingTemplate && formData.gold_rate_at_jobcard && (
              <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 border-2 border-indigo-300 rounded-xl p-5 mt-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg text-indigo-900 flex items-center gap-2">
                    <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Cost Estimation Preview
                  </h3>
                  <Badge className="bg-purple-100 text-purple-800 px-3 py-1">ESTIMATE ONLY</Badge>
                </div>

                {/* Item-wise Breakdown */}
                <div className="space-y-3 mb-4">
                  {formData.items.map((item, idx) => {
                    const goldRate = parseFloat(formData.gold_rate_at_jobcard) || 0;
                    const weightIn = parseFloat(item.weight_in) || 0;
                    const makingValue = parseFloat(item.making_charge_value) || 0;
                    const vatPercent = parseFloat(item.vat_percent) || 0;
                    
                    // Calculate metal value (weight × gold rate)
                    const metalValue = weightIn * goldRate;
                    
                    // Calculate making charges
                    const makingCharges = item.making_charge_type === 'per_gram' 
                      ? makingValue * weightIn 
                      : makingValue;
                    
                    // Calculate subtotal before VAT
                    const subtotal = metalValue + makingCharges;
                    
                    // Calculate VAT
                    const vat = (subtotal * vatPercent) / 100;
                    
                    // Calculate total
                    const total = subtotal + vat;
                    
                    return (
                      <div key={idx} className="bg-white rounded-lg p-4 border-2 border-indigo-200 shadow-sm">
                        <div className="font-semibold text-sm text-indigo-900 mb-3 flex items-center justify-between">
                          <span>{item.description || `Item ${idx + 1}`}</span>
                          <Badge variant="outline" className="text-xs">{item.category}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex justify-between p-2 bg-amber-50 rounded border border-amber-200">
                            <span className="text-gray-700">Est. Metal Value:</span>
                            <span className="font-mono font-semibold text-amber-800">{metalValue.toFixed(2)} OMR</span>
                          </div>
                          <div className="flex justify-between p-2 bg-green-50 rounded border border-green-200">
                            <span className="text-gray-700">Est. Making:</span>
                            <span className="font-mono font-semibold text-green-800">{makingCharges.toFixed(2)} OMR</span>
                          </div>
                          <div className="flex justify-between p-2 bg-blue-50 rounded border border-blue-200">
                            <span className="text-gray-700">Est. VAT ({vatPercent}%):</span>
                            <span className="font-mono font-semibold text-blue-800">{vat.toFixed(2)} OMR</span>
                          </div>
                          <div className="flex justify-between p-2 bg-indigo-100 rounded border border-indigo-300">
                            <span className="font-semibold text-indigo-900">Est. Item Total:</span>
                            <span className="font-mono font-bold text-indigo-900">{total.toFixed(2)} OMR</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-gradient-to-br from-amber-100 to-amber-200 rounded-lg p-3 border border-amber-300">
                    <div className="text-xs text-amber-800 font-medium uppercase mb-1">Est. Metal Total</div>
                    <div className="font-mono font-bold text-xl text-amber-900">
                      {formData.items.reduce((total, item) => {
                        const goldRate = parseFloat(formData.gold_rate_at_jobcard) || 0;
                        const weightIn = parseFloat(item.weight_in) || 0;
                        return total + (weightIn * goldRate);
                      }, 0).toFixed(2)} OMR
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-100 to-green-200 rounded-lg p-3 border border-green-300">
                    <div className="text-xs text-green-800 font-medium uppercase mb-1">Est. Making Total</div>
                    <div className="font-mono font-bold text-xl text-green-900">
                      {formData.items.reduce((total, item) => {
                        const weightIn = parseFloat(item.weight_in) || 0;
                        const makingValue = parseFloat(item.making_charge_value) || 0;
                        const makingCharges = item.making_charge_type === 'per_gram' ? makingValue * weightIn : makingValue;
                        return total + makingCharges;
                      }, 0).toFixed(2)} OMR
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg p-3 border border-blue-300">
                    <div className="text-xs text-blue-800 font-medium uppercase mb-1">Est. VAT Total</div>
                    <div className="font-mono font-bold text-xl text-blue-900">
                      {formData.items.reduce((total, item) => {
                        const goldRate = parseFloat(formData.gold_rate_at_jobcard) || 0;
                        const weightIn = parseFloat(item.weight_in) || 0;
                        const makingValue = parseFloat(item.making_charge_value) || 0;
                        const vatPercent = parseFloat(item.vat_percent) || 0;
                        const metalValue = weightIn * goldRate;
                        const makingCharges = item.making_charge_type === 'per_gram' ? makingValue * weightIn : makingValue;
                        const subtotal = metalValue + makingCharges;
                        const vat = (subtotal * vatPercent) / 100;
                        return total + vat;
                      }, 0).toFixed(2)} OMR
                    </div>
                  </div>
                </div>
                  
                {/* Grand Total - Most Prominent */}
                <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 rounded-xl p-5 shadow-xl border-2 border-indigo-400">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-indigo-100 text-xs font-medium uppercase mb-1">Estimated Job Card Total</div>
                      <div className="font-mono font-black text-4xl text-white">
                        {formData.items.reduce((total, item) => {
                          const goldRate = parseFloat(formData.gold_rate_at_jobcard) || 0;
                          const weightIn = parseFloat(item.weight_in) || 0;
                          const makingValue = parseFloat(item.making_charge_value) || 0;
                          const vatPercent = parseFloat(item.vat_percent) || 0;
                          
                          const metalValue = weightIn * goldRate;
                          const makingCharges = item.making_charge_type === 'per_gram' ? makingValue * weightIn : makingValue;
                          const subtotal = metalValue + makingCharges;
                          const vat = (subtotal * vatPercent) / 100;
                          const itemTotal = subtotal + vat;
                          
                          return total + itemTotal;
                        }, 0).toFixed(2)} <span className="text-xl text-indigo-200">OMR</span>
                      </div>
                    </div>
                    <svg className="w-16 h-16 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
                  
                {/* Important Disclaimers */}
                <div className="mt-4 p-3 bg-amber-50 border-l-4 border-amber-400 rounded">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-900">
                      <p className="font-semibold mb-1">Important: This is an ESTIMATE only</p>
                      <ul className="list-disc list-inside space-y-0.5 text-amber-800">
                        <li>Based on gold rate: {parseFloat(formData.gold_rate_at_jobcard).toFixed(2)} OMR/g</li>
                        <li>Actual invoice amount may vary based on final weight and current market rates</li>
                        <li>Final costs determined at invoice conversion</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

                       <div className="flex gap-3">
              <Button 
                type="button"
                variant="outline" 
                onClick={handleCloseDialog} 
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                data-testid="save-jobcard-button" 
                onClick={handleCreateJobCard} 
                className="flex-1"
              >
                {editingTemplate ? 'Update Template' : saveAsTemplate ? 'Save Template' : editingJobCard ? 'Update Job Card' : 'Create Job Card'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Load Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Load from Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No templates available</p>
                <p className="text-sm mt-2">Admins can create templates by using "Save as Template" button</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {templates.map((template) => (
                  <Card key={template.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{template.template_name}</h3>
                          {template.notes && (
                            <p className="text-sm text-muted-foreground mt-1">{template.notes}</p>
                          )}
                          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Items: {template.items?.length || 0}</span>
                            {template.delivery_days_offset && (
                              <span>Delivery: {template.delivery_days_offset} days</span>
                            )}
                            {template.gold_rate_at_jobcard && (
                              <span>Gold Rate: {template.gold_rate_at_jobcard} OMR/g</span>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleLoadTemplate(template)}
                        >
                          Load
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Templates Dialog */}
      <Dialog open={showManageTemplatesDialog} onOpenChange={setShowManageTemplatesDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Templates</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No templates available</p>
                {user?.role === 'admin' && (
                  <p className="text-sm mt-2">Create your first template using "Save as Template" button when creating a job card</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map((template) => (
                  <Card key={template.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{template.template_name}</h3>
                          {template.notes && (
                            <p className="text-sm text-muted-foreground mt-1">{template.notes}</p>
                          )}
                          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Items: {template.items?.length || 0}</span>
                            {template.delivery_days_offset && (
                              <span>Delivery: {template.delivery_days_offset} days</span>
                            )}
                            {template.gold_rate_at_jobcard && (
                              <span>Gold Rate: {template.gold_rate_at_jobcard} OMR/g</span>
                            )}
                          </div>
                          
                          {/* Display template items */}
                          <div className="mt-3 space-y-1">
                            {template.items?.map((item, idx) => (
                              <div key={idx} className="text-xs bg-gray-50 p-2 rounded">
                                <span className="font-medium">{item.category}</span>
                                {item.description && ` - ${item.description}`}
                                <span className="text-muted-foreground ml-2">
                                  ({item.purity}K, {item.work_type})
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleLoadTemplate(template)}
                          >
                            <FolderOpen className="w-4 h-4" />
                          </Button>
                          {user?.role === 'admin' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditTemplate(template)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleDeleteTemplate(template.id, template.template_name)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Convert to Invoice Dialog */}
      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Convert to Invoice - Customer Details</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Info about job card customer type */}
            {convertingJobCard && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <span className="font-semibold">Job Card Customer: </span>
                {convertingJobCard.customer_type === 'walk_in' 
                  ? `Walk-in (${convertingJobCard.walk_in_name})`
                  : `Saved Customer (${convertingJobCard.customer_name})`
                }
              </div>
            )}
            
            {/* MODULE 8: Display Gold Rate from Job Card */}
            {convertingJobCard && convertingJobCard.gold_rate_at_jobcard && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                <span className="font-semibold text-amber-900">💰 Gold Rate from Job Card: </span>
                <span className="text-amber-800 font-mono">{convertingJobCard.gold_rate_at_jobcard} OMR/gram</span>
                <p className="text-xs text-amber-700 mt-1">This rate will be auto-filled in the invoice</p>
              </div>
            )}
            
            {/* Customer Type Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Invoice Customer Type *</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="customer_type"
                    value="saved"
                    checked={convertData.customer_type === 'saved'}
                    onChange={(e) => setConvertData({...convertData, customer_type: e.target.value})}
                    className="w-4 h-4"
                  />
                  <span className="font-medium">Saved Customer</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="customer_type"
                    value="walk_in"
                    checked={convertData.customer_type === 'walk_in'}
                    onChange={(e) => setConvertData({...convertData, customer_type: e.target.value})}
                    className="w-4 h-4"
                  />
                  <span className="font-medium">Walk-in Customer</span>
                </label>
              </div>
            </div>

            {/* Saved Customer Section */}
            {convertData.customer_type === 'saved' && (
              <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-blue-700 text-sm font-medium">
                  <span>📋</span>
                  <span>Saved customers allow ledger tracking and outstanding balance</span>
                </div>
                <div className="space-y-2">
                  <Label>Select Customer *</Label>
                  <Select 
                    value={convertData.customer_id} 
                    onValueChange={(value) => {
                      const selected = parties.find(p => p.id === value);
                      setConvertData({
                        ...convertData, 
                        customer_id: value,
                        customer_name: selected?.name || ''
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {parties.map(party => (
                        <SelectItem key={party.id} value={party.id}>
                          {party.name} {party.phone && `- ${party.phone}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Walk-in Customer Section */}
            {convertData.customer_type === 'walk_in' && (
              <div className="space-y-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center gap-2 text-amber-700 text-sm font-medium">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Walk-in customers are NOT saved in Parties. Full payment recommended.</span>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Customer Name *</Label>
                    <Input
                      value={convertData.walk_in_name}
                      onChange={(e) => setConvertData({...convertData, walk_in_name: e.target.value})}
                      placeholder="Enter customer name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input
                      value={convertData.walk_in_phone}
                      onChange={(e) => setConvertData({...convertData, walk_in_phone: e.target.value})}
                      placeholder="Enter phone number (optional)"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* MODULE 7: Discount Amount Field */}
            <div className="space-y-2">
              <Label>Discount Amount (OMR)</Label>
              <Input
                type="number"
                step="0.001"
                min="0"
                value={convertData.discount_amount || ''}
                onChange={(e) => setConvertData({...convertData, discount_amount: e.target.value})}
                placeholder="0.000"
              />
              <p className="text-xs text-gray-500">Optional: Enter discount amount to be applied before VAT calculation</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowConvertDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmConvert}
                className="flex-1"
              >
                Convert to Invoice
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Job Card Dialog - Option B Enhancement */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif">Job Card Details</DialogTitle>
          </DialogHeader>

          {viewJobCard && (
            <div className="space-y-6">
              {/* Job Card Header */}
              <div className="grid grid-cols-2 gap-6 p-4 bg-muted/50 rounded-lg">
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Job Card Number</p>
                    <p className="font-mono font-semibold text-lg">{viewJobCard.job_card_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Customer</p>
                    {viewJobCard.customer_type === 'walk_in' ? (
                      <div>
                        <p className="font-medium">{viewJobCard.walk_in_name || 'Walk-in Customer'}</p>
                        <Badge variant="outline" className="mt-1 text-xs bg-amber-50 text-amber-700">
                          Walk-in
                        </Badge>
                      </div>
                    ) : (
                      <p className="font-medium">{viewJobCard.customer_name || '-'}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Worker</p>
                    <p className="font-medium">{viewJobCard.worker_name || '-'}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <div className="mt-1">{getStatusBadge(viewJobCard.status)}</div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Date Created</p>
                    <p className="font-medium">{formatDateTime(viewJobCard.created_at || viewJobCard.date_created)}</p>
                  </div>
                  {viewJobCard.completed_at && (
                    <div>
                      <p className="text-xs text-muted-foreground">Completed At</p>
                      <p className="font-medium">{formatDateTime(viewJobCard.completed_at)}</p>
                    </div>
                  )}
                  {viewJobCard.delivered_at && (
                    <div>
                      <p className="text-xs text-muted-foreground">Delivered At</p>
                      <p className="font-medium">{formatDateTime(viewJobCard.delivered_at)}</p>
                    </div>
                  )}
                  {viewJobCard.delivery_date && (
                    <div>
                      <p className="text-xs text-muted-foreground">Expected Delivery Date</p>
                      <p className="font-medium">{displayDateOnly(viewJobCard.delivery_date)}</p>
                    </div>
                  )}
                  {viewJobCard.notes && (
                    <div>
                      <p className="text-xs text-muted-foreground">Notes</p>
                      <p className="font-medium text-sm">{viewJobCard.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Items</h3>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">Category</th>
                        <th className="px-3 py-2 text-left font-semibold">Description</th>
                        <th className="px-3 py-2 text-right font-semibold">Qty</th>
                        <th className="px-3 py-2 text-right font-semibold">Weight In (g)</th>
                        <th className="px-3 py-2 text-right font-semibold">Weight Out (g)</th>
                        <th className="px-3 py-2 text-right font-semibold">Purity</th>
                        <th className="px-3 py-2 text-left font-semibold">Work Type</th>
                        <th className="px-3 py-2 text-left font-semibold">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(viewJobCard.items || []).map((item, idx) => (
                        <tr key={idx} className="border-t hover:bg-muted/20">
                          <td className="px-3 py-2">{item.category || '-'}</td>
                          <td className="px-3 py-2">{item.description || '-'}</td>
                          <td className="px-3 py-2 text-right font-mono">{item.qty || 0}</td>
                          <td className="px-3 py-2 text-right font-mono">{(item.weight_in || 0).toFixed(3)}</td>
                          <td className="px-3 py-2 text-right font-mono">{(item.weight_out || 0).toFixed(3)}</td>
                          <td className="px-3 py-2 text-right font-mono">{item.purity || 916}K</td>
                          <td className="px-3 py-2 capitalize">{item.work_type || '-'}</td>
                          <td className="px-3 py-2 text-xs">{item.remarks || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ENHANCED Cost Estimation Section - Option B Improvements */}
              {viewJobCard.gold_rate_at_jobcard && (
                <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 border-2 border-indigo-300 rounded-xl p-5 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg text-indigo-900 flex items-center gap-2">
                      <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Cost Estimation Breakdown
                    </h3>
                    <Badge className="bg-purple-100 text-purple-800 px-3 py-1">ESTIMATE ONLY</Badge>
                  </div>

                  {/* Item-wise Breakdown */}
                  <div className="space-y-3 mb-4">
                    {(viewJobCard.items || []).map((item, idx) => {
                      const goldRate = parseFloat(viewJobCard.gold_rate_at_jobcard) || 0;
                      const weightIn = parseFloat(item.weight_in) || 0;
                      const makingValue = parseFloat(item.making_charge_value) || 0;
                      const vatPercent = parseFloat(item.vat_percent) || 0;
                      
                      // Calculate metal value (weight × gold rate)
                      const metalValue = weightIn * goldRate;
                      
                      // Calculate making charges
                      const makingCharges = item.making_charge_type === 'per_gram' 
                        ? makingValue * weightIn 
                        : makingValue;
                      
                      // Calculate subtotal before VAT
                      const subtotal = metalValue + makingCharges;
                      
                      // Calculate VAT
                      const vat = (subtotal * vatPercent) / 100;
                      
                      // Calculate total
                      const total = subtotal + vat;
                      
                      return (
                        <div key={idx} className="bg-white rounded-lg p-4 border-2 border-indigo-200 shadow-sm">
                          <div className="font-semibold text-sm text-indigo-900 mb-3 flex items-center justify-between">
                            <span>{item.description || `Item ${idx + 1}`}</span>
                            <Badge variant="outline" className="text-xs">{item.category}</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="flex justify-between p-2 bg-amber-50 rounded border border-amber-200">
                              <span className="text-gray-700">Est. Metal Value:</span>
                              <span className="font-mono font-semibold text-amber-800">{metalValue.toFixed(2)} OMR</span>
                            </div>
                            <div className="flex justify-between p-2 bg-green-50 rounded border border-green-200">
                              <span className="text-gray-700">Est. Making:</span>
                              <span className="font-mono font-semibold text-green-800">{makingCharges.toFixed(2)} OMR</span>
                            </div>
                            <div className="flex justify-between p-2 bg-blue-50 rounded border border-blue-200">
                              <span className="text-gray-700">Est. VAT ({vatPercent}%):</span>
                              <span className="font-mono font-semibold text-blue-800">{vat.toFixed(2)} OMR</span>
                            </div>
                            <div className="flex justify-between p-2 bg-indigo-100 rounded border border-indigo-300">
                              <span className="font-semibold text-indigo-900">Est. Item Total:</span>
                              <span className="font-mono font-bold text-indigo-900">{total.toFixed(2)} OMR</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-gradient-to-br from-amber-100 to-amber-200 rounded-lg p-3 border border-amber-300">
                      <div className="text-xs text-amber-800 font-medium uppercase mb-1">Est. Metal Total</div>
                      <div className="font-mono font-bold text-xl text-amber-900">
                        {(viewJobCard.items || []).reduce((total, item) => {
                          const goldRate = parseFloat(viewJobCard.gold_rate_at_jobcard) || 0;
                          const weightIn = parseFloat(item.weight_in) || 0;
                          return total + (weightIn * goldRate);
                        }, 0).toFixed(2)} OMR
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-green-100 to-green-200 rounded-lg p-3 border border-green-300">
                      <div className="text-xs text-green-800 font-medium uppercase mb-1">Est. Making Total</div>
                      <div className="font-mono font-bold text-xl text-green-900">
                        {(viewJobCard.items || []).reduce((total, item) => {
                          const weightIn = parseFloat(item.weight_in) || 0;
                          const makingValue = parseFloat(item.making_charge_value) || 0;
                          const makingCharges = item.making_charge_type === 'per_gram' ? makingValue * weightIn : makingValue;
                          return total + makingCharges;
                        }, 0).toFixed(2)} OMR
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg p-3 border border-blue-300">
                      <div className="text-xs text-blue-800 font-medium uppercase mb-1">Est. VAT Total</div>
                      <div className="font-mono font-bold text-xl text-blue-900">
                        {(viewJobCard.items || []).reduce((total, item) => {
                          const goldRate = parseFloat(viewJobCard.gold_rate_at_jobcard) || 0;
                          const weightIn = parseFloat(item.weight_in) || 0;
                          const makingValue = parseFloat(item.making_charge_value) || 0;
                          const vatPercent = parseFloat(item.vat_percent) || 0;
                          const metalValue = weightIn * goldRate;
                          const makingCharges = item.making_charge_type === 'per_gram' ? makingValue * weightIn : makingValue;
                          const subtotal = metalValue + makingCharges;
                          const vat = (subtotal * vatPercent) / 100;
                          return total + vat;
                        }, 0).toFixed(2)} OMR
                      </div>
                    </div>
                  </div>
                    
                  {/* Grand Total - Most Prominent */}
                  <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 rounded-xl p-5 shadow-xl border-2 border-indigo-400">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-indigo-100 text-xs font-medium uppercase mb-1">Estimated Job Card Total</div>
                        <div className="font-mono font-black text-4xl text-white">
                          {(viewJobCard.items || []).reduce((total, item) => {
                            const goldRate = parseFloat(viewJobCard.gold_rate_at_jobcard) || 0;
                            const weightIn = parseFloat(item.weight_in) || 0;
                            const makingValue = parseFloat(item.making_charge_value) || 0;
                            const vatPercent = parseFloat(item.vat_percent) || 0;
                            
                            const metalValue = weightIn * goldRate;
                            const makingCharges = item.making_charge_type === 'per_gram' ? makingValue * weightIn : makingValue;
                            const subtotal = metalValue + makingCharges;
                            const vat = (subtotal * vatPercent) / 100;
                            const itemTotal = subtotal + vat;
                            
                            return total + itemTotal;
                          }, 0).toFixed(2)} <span className="text-xl text-indigo-200">OMR</span>
                        </div>
                      </div>
                      <svg className="w-16 h-16 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  </div>
                    
                  {/* Important Disclaimers */}
                  <div className="mt-4 p-3 bg-amber-50 border-l-4 border-amber-400 rounded">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-900">
                        <p className="font-semibold mb-1">Important: This is an ESTIMATE only</p>
                        <ul className="list-disc list-inside space-y-0.5 text-amber-800">
                          <li>Based on gold rate: {parseFloat(viewJobCard.gold_rate_at_jobcard).toFixed(2)} OMR/g (at time of job card creation)</li>
                          <li>Actual invoice amount may vary based on final weight and current market rates</li>
                          <li>Final costs determined at invoice conversion</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* No Cost Estimation Message */}
              {!viewJobCard.gold_rate_at_jobcard && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                  <p className="text-sm text-gray-600">
                    💡 Cost estimation not available - Gold rate was not set at the time of job card creation
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowViewDialog(false)}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Enhanced Confirmation Dialog */}
      <ConfirmationDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        onConfirm={confirmDialog.action}
        title={confirmDialog.title}
        description={confirmDialog.description}
        impact={confirmDialog.impact}
        actionLabel={confirmDialog.type === 'delete' ? 'Delete' : 'Confirm'}
        actionType={confirmDialog.type === 'delete' ? 'danger' : 'warning'}
        loading={confirmDialog.loading}
      />
    </div>
  );
}