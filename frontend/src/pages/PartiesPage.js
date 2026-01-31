import React, { useState, useEffect, useMemo } from 'react';
import { formatWeight, formatCurrency, safeToFixed } from '../utils/numberFormat';
import { useSearchParams } from 'react-router-dom';
import { API } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Users as UsersIcon, Edit, Trash2, Eye, TrendingUp, TrendingDown, Search, Calendar, AlertCircle } from 'lucide-react';
import Pagination from '../components/Pagination';

export default function PartiesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [parties, setParties] = useState([]);
  const [pagination, setPagination] = useState(null);
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const [perPage, setPerPage] = useState(10);
  const [showDialog, setShowDialog] = useState(false);
  const [showLedgerDialog, setShowLedgerDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showGoldDepositDialog, setShowGoldDepositDialog] = useState(false);
  const [editingParty, setEditingParty] = useState(null);
  const [deletingParty, setDeleteingParty] = useState(null);
  const [deleteImpact, setDeleteImpact] = useState(null);
  const [ledgerData, setLedgerData] = useState(null);
  const [goldEntries, setGoldEntries] = useState([]);
  const [moneyLedger, setMoneyLedger] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  
  // Filters for party detail view
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [ledgerSearchTerm, setLedgerSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    party_type: 'customer',
    notes: ''
  });
  
  // Validation errors state
  const [validationErrors, setValidationErrors] = useState({
    name: '',
    phone: ''
  });
  
  // MODULE 9: Gold deposit form data
  const [depositFormData, setDepositFormData] = useState({
    weight_grams: '',
    purity_entered: '',
    purpose: 'job_work',
    notes: ''
  });

  useEffect(() => {
    loadParties();
  }, [currentPage, perPage, searchTerm, filterType]);

  // Validation function for name
  const validateName = (name) => {
    if (!name || !name.trim()) {
      return 'Name is required';
    }
    
    const trimmedName = name.trim();
    
    // Must start with letter, followed by 2-59 chars of letters, spaces, dots, apostrophes, hyphens
    const namePattern = /^[A-Za-z][A-Za-z .'-]{2,59}$/;
    if (!namePattern.test(trimmedName)) {
      return 'Name must start with a letter and contain only letters, spaces, dots, apostrophes, and hyphens (3-60 characters)';
    }
    
    return '';
  };
  
  // Validation function for phone
  const validatePhone = (phone) => {
    if (!phone || !phone.trim()) {
      return ''; // Phone is optional
    }
    
    const trimmedPhone = phone.trim();
    
    // Must be exactly 10-15 digits only
    const phonePattern = /^[0-9]{10,15}$/;
    if (!phonePattern.test(trimmedPhone)) {
      return 'Phone number must contain only digits and be 10-15 characters long';
    }
    
    return '';
  };
  
  // Handle name change with validation
  const handleNameChange = (e) => {
    const value = e.target.value;
    setFormData({...formData, name: value});
    
    const error = validateName(value);
    setValidationErrors({...validationErrors, name: error});
  };
  
  // Handle phone change with validation
  const handlePhoneChange = (e) => {
    const value = e.target.value;
    setFormData({...formData, phone: value});
    
    const error = validatePhone(value);
    setValidationErrors({...validationErrors, phone: error});
  };
  
  // Check if form is valid
  const isFormValid = () => {
    const nameError = validateName(formData.name);
    const phoneError = validatePhone(formData.phone);
    return !nameError && !phoneError;
  };

  const loadParties = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        page_size: perPage
      };
      
      // Add server-side filters
      if (filterType && filterType !== 'all') {
        params.party_type = filterType;
      }
      if (searchTerm && searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      
      const response = await API.get(`/api/parties`, { params });
      setParties(response.data.items || response.data);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error('Failed to load parties');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    setSearchParams({ page: newPage.toString() });
  };

  const handlePerPageChange = (newPerPage) => {
    setPerPage(newPerPage);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const handleCreate = async () => {
    // Validate all fields before submission
    const nameError = validateName(formData.name);
    const phoneError = validatePhone(formData.phone);
    
    if (nameError || phoneError) {
      setValidationErrors({
        name: nameError,
        phone: phoneError
      });
      toast.error('Please fix validation errors before submitting');
      return;
    }

    try {
      if (editingParty) {
        await API.patch(`/api/parties/${editingParty.id}`, formData);
        toast.success('Party updated successfully');
      } else {
        await API.post(`/api/parties`, formData);
        toast.success('Party created successfully');
      }
      
      setShowDialog(false);
      setEditingParty(null);
      setFormData({
        name: '',
        phone: '',
        address: '',
        party_type: 'customer',
        notes: ''
      });
      setValidationErrors({
        name: '',
        phone: ''
      });
      loadParties();
    } catch (error) {
      // Display backend validation error message if available
      const errorMessage = error.response?.data?.detail || (editingParty ? 'Failed to update party' : 'Failed to create party');
      toast.error(errorMessage);
    }
  };

  const handleEdit = (party) => {
    setEditingParty(party);
    setFormData({
      name: party.name,
      phone: party.phone || '',
      address: party.address || '',
      party_type: party.party_type,
      notes: party.notes || ''
    });
    setValidationErrors({
      name: '',
      phone: ''
    });
    setShowDialog(true);
  };

  const handleDeleteClick = async (party) => {
    try {
      setDeleteingParty(party);
      // Fetch delete impact before showing dialog
      const response = await API.get(`/api/parties/${party.id}/delete-impact`);
      setDeleteImpact(response.data);
      setShowDeleteDialog(true);
    } catch (error) {
      toast.error('Failed to fetch party dependencies');
      console.error(error);
    }
  };

  const handleDelete = async () => {
    try {
      await API.delete(`/api/parties/${deletingParty.id}`);
      toast.success('Party deleted successfully');
      setShowDeleteDialog(false);
      setDeleteingParty(null);
      setDeleteImpact(null);
      loadParties();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete party');
    }
  };

  const handleViewLedger = async (party) => {
    try {
      // Fetch comprehensive summary
      const summaryResponse = await API.get(`/api/parties/${party.id}/summary`);
      setLedgerData(summaryResponse.data);
      
      // Fetch gold ledger entries
      const goldResponse = await API.get(`/api/gold-ledger?party_id=${party.id}`);
      setGoldEntries(goldResponse.data.items || []);
      
      // Fetch invoices and transactions for money ledger
      const ledgerResponse = await API.get(`/api/parties/${party.id}/ledger`);
      
      // Combine invoices and transactions into a unified money ledger
      const combinedLedger = [];
      
      // Add invoices
      ledgerResponse.data.invoices.forEach(inv => {
        combinedLedger.push({
          id: inv.id,
          date: inv.date,
          type: 'Invoice',
          reference: inv.invoice_number,
          amount: inv.grand_total,
          balance: inv.balance_due,
          status: inv.payment_status
        });
      });
      
      // Add transactions
      ledgerResponse.data.transactions.forEach(txn => {
        combinedLedger.push({
          id: txn.id,
          date: txn.date,
          type: txn.transaction_type === 'credit' ? 'Receipt' : 'Payment',
          reference: txn.transaction_number,
          amount: txn.amount,
          balance: null,
          notes: txn.notes
        });
      });
      
      // Sort by date descending
      combinedLedger.sort((a, b) => new Date(b.date) - new Date(a.date));
      setMoneyLedger(combinedLedger);
      
      // Reset filters
      setDateFrom('');
      setDateTo('');
      setLedgerSearchTerm('');
      
      setShowLedgerDialog(true);
    } catch (error) {
      toast.error('Failed to load party details');
      console.error(error);
    }
  };

  // MODULE 9: Handle opening gold deposit dialog
  const handleOpenGoldDeposit = () => {
    setDepositFormData({
      weight_grams: '',
      purity_entered: '',
      purpose: 'job_work',
      notes: ''
    });
    setShowGoldDepositDialog(true);
  };

  // MODULE 9: Handle creating gold deposit
  const handleCreateGoldDeposit = async () => {
    // Validation
    if (!depositFormData.weight_grams || parseFloat(depositFormData.weight_grams) <= 0) {
      toast.error('Please enter a valid weight');
      return;
    }
    if (!depositFormData.purity_entered || parseFloat(depositFormData.purity_entered) <= 0) {
      toast.error('Please enter a valid purity');
      return;
    }

    try {
      setLoading(true);
      const depositPayload = {
        party_id: ledgerData.party.id,
        weight_grams: parseFloat(depositFormData.weight_grams),
        purity_entered: parseInt(depositFormData.purity_entered),
        purpose: depositFormData.purpose,
        notes: depositFormData.notes || undefined
      };

      await API.post(`/api/gold-deposits`, depositPayload);
      toast.success('Gold deposit recorded successfully');
      
      // Reload gold entries and summary
      const goldResponse = await API.get(`/api/gold-ledger?party_id=${ledgerData.party.id}`);
      setGoldEntries(goldResponse.data.items || []);
      
      const summaryResponse = await API.get(`/api/parties/${ledgerData.party.id}/summary`);
      setLedgerData(summaryResponse.data);
      
      // Close dialog and reset form
      setShowGoldDepositDialog(false);
      setDepositFormData({
        weight_grams: '',
        purity_entered: '',
        purpose: 'job_work',
        notes: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to record gold deposit');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Filtered gold entries based on date and search
  const filteredGoldEntries = useMemo(() => {
    return goldEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      const fromDate = dateFrom ? new Date(dateFrom) : null;
      const toDate = dateTo ? new Date(dateTo) : null;
      
      // Date filter
      if (fromDate && entryDate < fromDate) return false;
      if (toDate && entryDate > toDate) return false;
      
      // Search filter
      if (ledgerSearchTerm) {
        const searchLower = ledgerSearchTerm.toLowerCase();
        return (
          entry.purpose?.toLowerCase().includes(searchLower) ||
          entry.notes?.toLowerCase().includes(searchLower) ||
          entry.type?.toLowerCase().includes(searchLower)
        );
      }
      
      return true;
    });
  }, [goldEntries, dateFrom, dateTo, ledgerSearchTerm]);

  // Filtered money ledger based on date and search
  const filteredMoneyLedger = useMemo(() => {
    return moneyLedger.filter(entry => {
      const entryDate = new Date(entry.date);
      const fromDate = dateFrom ? new Date(dateFrom) : null;
      const toDate = dateTo ? new Date(dateTo) : null;
      
      // Date filter
      if (fromDate && entryDate < fromDate) return false;
      if (toDate && entryDate > toDate) return false;
      
      // Search filter
      if (ledgerSearchTerm) {
        const searchLower = ledgerSearchTerm.toLowerCase();
        return (
          entry.reference?.toLowerCase().includes(searchLower) ||
          entry.type?.toLowerCase().includes(searchLower) ||
          entry.notes?.toLowerCase().includes(searchLower)
        );
      }
      
      return true;
    });
  }, [moneyLedger, dateFrom, dateTo, ledgerSearchTerm]);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setSearchParams({ page: '1' });
    }
  }, [searchTerm, filterType]);

  return (
    <div data-testid="parties-page">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-serif font-semibold text-gray-900 mb-2">Parties</h1>
          <p className="text-muted-foreground">Manage customers and vendors</p>
        </div>
        <Button data-testid="add-party-button" onClick={() => {
          setEditingParty(null);
          setFormData({
            name: '',
            phone: '',
            address: '',
            party_type: 'customer',
            notes: ''
          });
          setValidationErrors({
            name: '',
            phone: ''
          });
          setShowDialog(true);
        }}>
          <Plus className="w-4 h-4 mr-2" /> Add Party
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="customer">Customers</SelectItem>
                <SelectItem value="vendor">Vendors</SelectItem>
                {/* <SelectItem value="worker">Workers</SelectItem> */}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-serif">All Parties ({pagination?.total_count || parties.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : parties.length === 0 ? (
            <div className="text-center py-12">
              <UsersIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No parties found</p>
              <Button className="mt-4" onClick={() => setShowDialog(true)}>
                <Plus className="w-4 h-4 mr-2" /> Add First Party
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="parties-table">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Address</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {parties.map((party) => (
                    <tr key={party.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{party.name}</td>
                      <td className="px-4 py-3 text-sm font-mono">{party.phone || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${
                          party.party_type === 'customer' ? 'bg-blue-100 text-blue-800' : 
                          party.party_type === 'vendor' ? 'bg-purple-100 text-purple-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {party.party_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{party.address || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewLedger(party)}
                            title="View Ledger"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(party)}
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteClick(party)}
                            className="text-destructive hover:text-destructive"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination */}
          {pagination && (
            <Pagination
              pagination={pagination}
              onPageChange={handlePageChange}
              onPerPageChange={handlePerPageChange}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingParty ? 'Edit Party' : 'Add New Party'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Name *</Label>
              <Input
                data-testid="party-name-input"
                value={formData.name}
                onChange={handleNameChange}
                required
                className={validationErrors.name ? 'border-red-500' : ''}
              />
              {validationErrors.name && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.name}</p>
              )}
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                data-testid="party-phone-input"
                value={formData.phone}
                onChange={handlePhoneChange}
                className={validationErrors.phone ? 'border-red-500' : ''}
                placeholder="10-15 digits only"
              />
              {validationErrors.phone && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.phone}</p>
              )}
            </div>
            <div>
              <Label>Type *</Label>
              <Select value={formData.party_type} onValueChange={(val) => setFormData({...formData, party_type: val})}>
                <SelectTrigger data-testid="party-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                  {/* <SelectItem value="worker">Worker</SelectItem> */}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Address</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              />
            </div>
            <Button 
              data-testid="save-party-button" 
              onClick={handleCreate} 
              className="w-full"
              disabled={!isFormValid()}
            >
              {editingParty ? 'Update Party' : 'Save Party'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showLedgerDialog} onOpenChange={setShowLedgerDialog}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Party Report - {ledgerData?.party?.name}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {ledgerData?.party?.party_type && (
                <span className="capitalize">{ledgerData.party.party_type}</span>
              )}
              {ledgerData?.party?.phone && ` • ${ledgerData.party.phone}`}
            </p>
          </DialogHeader>
          {ledgerData && (
            <div className="space-y-6 mt-4">
              {/* Summary Cards - 4 cards in a grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Gold They Owe Us */}
                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase">Gold They Owe Us</p>
                        <p className="text-2xl font-bold text-amber-700 mt-1">
                          {ledgerData.gold.gold_due_from_party.toFixed(3)}g
                        </p>
                      </div>
                      <TrendingDown className="w-5 h-5 text-amber-600" />
                    </div>
                  </CardContent>
                </Card>

                {/* Gold We Owe Them */}
                <Card className="border-orange-200 bg-orange-50">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase">Gold We Owe Them</p>
                        <p className="text-2xl font-bold text-orange-700 mt-1">
                          {ledgerData.gold.gold_due_to_party.toFixed(3)}g
                        </p>
                      </div>
                      <TrendingUp className="w-5 h-5 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>

                {/* Money They Owe Us */}
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase">Money They Owe Us</p>
                        <p className="text-2xl font-bold text-green-700 mt-1">
                          {ledgerData.money.money_due_from_party.toFixed(2)} OMR
                        </p>
                      </div>
                      <TrendingDown className="w-5 h-5 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                {/* Money We Owe Them */}
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase">Money We Owe Them</p>
                        <p className="text-2xl font-bold text-red-700 mt-1">
                          {ledgerData.money.money_due_to_party.toFixed(2)} OMR
                        </p>
                      </div>
                      <TrendingUp className="w-5 h-5 text-red-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Filters Section */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[200px]">
                      <Label className="text-xs">Search</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Search entries..."
                          value={ledgerSearchTerm}
                          onChange={(e) => setLedgerSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="min-w-[160px]">
                      <Label className="text-xs">From Date</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="min-w-[160px]">
                      <Label className="text-xs">To Date</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    {(dateFrom || dateTo || ledgerSearchTerm) && (
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setDateFrom('');
                          setDateTo('');
                          setLedgerSearchTerm('');
                        }}
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Gold Ledger Table */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                    Gold Ledger ({filteredGoldEntries.length} entries)
                  </h3>
                  <Button 
                    onClick={handleOpenGoldDeposit}
                    className="bg-amber-600 hover:bg-amber-700"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Gold Deposit
                  </Button>
                </div>
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Type</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Weight (g)</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Purity</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Purpose</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredGoldEntries.length === 0 ? (
                            <tr>
                              <td colSpan="6" className="px-4 py-8 text-center text-muted-foreground">
                                No gold ledger entries found
                              </td>
                            </tr>
                          ) : (
                            filteredGoldEntries.map(entry => (
                              <tr key={entry.id} className="border-t hover:bg-muted/30">
                                <td className="px-4 py-3">{new Date(entry.date).toLocaleDateString()}</td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    entry.type === 'IN' 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {entry.type}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right font-mono">{entry.weight_grams.toFixed(3)}</td>
                                <td className="px-4 py-3 text-right font-mono">{entry.purity_entered}K</td>
                                <td className="px-4 py-3 capitalize">{entry.purpose.replace('_', ' ')}</td>
                                <td className="px-4 py-3 text-muted-foreground">{entry.notes || '-'}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Money Ledger Table */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  Money Ledger ({filteredMoneyLedger.length} entries)
                </h3>
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Type</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Reference</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Amount (OMR)</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Balance</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredMoneyLedger.length === 0 ? (
                            <tr>
                              <td colSpan="6" className="px-4 py-8 text-center text-muted-foreground">
                                No money ledger entries found
                              </td>
                            </tr>
                          ) : (
                            filteredMoneyLedger.map(entry => (
                              <tr key={entry.id} className="border-t hover:bg-muted/30">
                                <td className="px-4 py-3">{new Date(entry.date).toLocaleDateString()}</td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    entry.type === 'Invoice' 
                                      ? 'bg-blue-100 text-blue-800' 
                                      : entry.type === 'Receipt'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-purple-100 text-purple-800'
                                  }`}>
                                    {entry.type}
                                  </span>
                                </td>
                                <td className="px-4 py-3 font-mono">{entry.reference}</td>
                                <td className="px-4 py-3 text-right font-mono">{entry.amount.toFixed(2)}</td>
                                <td className="px-4 py-3 text-right font-mono">
                                  {entry.balance !== null ? entry.balance.toFixed(2) : '-'}
                                </td>
                                <td className="px-4 py-3">
                                  {entry.status ? (
                                    <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${
                                      entry.status === 'paid' 
                                        ? 'bg-green-100 text-green-800' 
                                        : entry.status === 'unpaid'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {entry.status}
                                    </span>
                                  ) : '-'}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODULE 9: Gold Deposit Dialog */}
      <Dialog open={showGoldDepositDialog} onOpenChange={setShowGoldDepositDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Gold Deposit</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Record gold received from <strong>{ledgerData?.party?.name}</strong>
            </p>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="weight_grams">Weight (grams) *</Label>
              <Input
                id="weight_grams"
                type="number"
                step="0.001"
                min="0"
                placeholder="e.g., 25.500"
                value={depositFormData.weight_grams}
                onChange={(e) => setDepositFormData({...depositFormData, weight_grams: e.target.value})}
                data-testid="deposit-weight-input"
              />
              <p className="text-xs text-muted-foreground mt-1">Precision: 3 decimal places</p>
            </div>

            <div>
              <Label htmlFor="purity_entered">Purity (Karats) *</Label>
              <Input
                id="purity_entered"
                type="number"
                min="0"
                placeholder="e.g., 22, 24, 18"
                value={depositFormData.purity_entered}
                onChange={(e) => setDepositFormData({...depositFormData, purity_entered: e.target.value})}
                data-testid="deposit-purity-input"
              />
              <p className="text-xs text-muted-foreground mt-1">Common values: 22K, 24K, 18K</p>
            </div>

            <div>
              <Label htmlFor="purpose">Purpose *</Label>
              <Select 
                value={depositFormData.purpose} 
                onValueChange={(value) => setDepositFormData({...depositFormData, purpose: value})}
              >
                <SelectTrigger data-testid="deposit-purpose-select">
                  <SelectValue placeholder="Select purpose" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="job_work">Job Work</SelectItem>
                  <SelectItem value="exchange">Exchange</SelectItem>
                  <SelectItem value="advance_gold">Advance Gold</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                placeholder="Additional notes..."
                value={depositFormData.notes}
                onChange={(e) => setDepositFormData({...depositFormData, notes: e.target.value})}
                data-testid="deposit-notes-input"
              />
            </div>

            <div className="flex gap-2 mt-6">
              <Button 
                variant="outline" 
                onClick={() => setShowGoldDepositDialog(false)}
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateGoldDeposit}
                className="flex-1 bg-amber-600 hover:bg-amber-700"
                disabled={loading}
                data-testid="save-deposit-button"
              >
                {loading ? 'Saving...' : 'Save Deposit'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Delete Party - Impact Assessment
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              {deleteImpact ? (
                <>
                  {/* Party Info */}
                  <div className="bg-muted/50 p-3 rounded-md">
                    <p className="font-medium text-foreground">
                      {deleteImpact.party_name}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {deleteImpact.party_type}
                    </p>
                  </div>

                  {/* Linked Records Summary */}
                  {deleteImpact.total_linked_records > 0 ? (
                    <div className="space-y-3">
                      <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-md">
                        <p className="font-semibold text-destructive flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          Cannot Delete - Linked Records Found
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          This party has {deleteImpact.total_linked_records} linked record(s). 
                          You must remove or reassign these records before deletion.
                        </p>
                      </div>

                      {/* Breakdown of linked records */}
                      <div className="space-y-2 border-l-2 border-muted pl-3">
                        {deleteImpact.linked_records.invoices > 0 && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Invoices:</span>
                            <span className="font-medium text-foreground">
                              {deleteImpact.linked_records.invoices}
                            </span>
                          </div>
                        )}
                        {deleteImpact.linked_records.jobcards > 0 && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Job Cards:</span>
                            <span className="font-medium text-foreground">
                              {deleteImpact.linked_records.jobcards}
                            </span>
                          </div>
                        )}
                        {deleteImpact.linked_records.purchases > 0 && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Purchases:</span>
                            <span className="font-medium text-foreground">
                              {deleteImpact.linked_records.purchases}
                            </span>
                          </div>
                        )}
                        {deleteImpact.linked_records.transactions > 0 && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Transactions:</span>
                            <span className="font-medium text-foreground">
                              {deleteImpact.linked_records.transactions}
                            </span>
                          </div>
                        )}
                        {deleteImpact.linked_records.gold_ledger > 0 && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Gold Ledger Entries:</span>
                            <span className="font-medium text-foreground">
                              {deleteImpact.linked_records.gold_ledger}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Warning message */}
                      <div className="bg-amber-50 border border-amber-200 p-3 rounded-md">
                        <p className="text-xs text-amber-800">
                          {deleteImpact.warning}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-green-50 border border-green-200 p-3 rounded-md">
                        <p className="font-medium text-green-800">
                          ✓ No Linked Records
                        </p>
                        <p className="text-xs text-green-700 mt-1">
                          This party has no linked records and can be safely deleted.
                        </p>
                      </div>
                      
                      <div className="bg-amber-50 border border-amber-200 p-3 rounded-md">
                        <p className="text-xs text-amber-800 font-medium">
                          ⚠ Warning: {deleteImpact.warning}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    Loading impact assessment...
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteDialog(false);
              setDeleteingParty(null);
              setDeleteImpact(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={!deleteImpact || !deleteImpact.can_proceed}
              className={
                deleteImpact && !deleteImpact.can_proceed
                  ? "bg-muted text-muted-foreground cursor-not-allowed hover:bg-muted"
                  : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              }
            >
              {deleteImpact && !deleteImpact.can_proceed ? "Cannot Delete" : "Delete Party"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}