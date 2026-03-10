import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  ArrowLeft,
  History,
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  Calendar,
  TrendingUp,
  Wallet,
  Receipt,
  RefreshCw,
  Loader2,
  ArrowUpDown,
  X,
  Banknote,
  Smartphone
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function MerchantHistoryPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total_count: 0, total_pages: 0 });
  const [summary, setSummary] = useState({ total_volume: 0, total_cashback: 0, transaction_count: 0 });
  
  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Export state
  const [isExporting, setIsExporting] = useState(false);
  
  const token = localStorage.getItem('sdm_merchant_token');

  const fetchTransactions = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sort_by: sortBy,
        sort_order: sortOrder
      });
      
      if (search) params.append('search', search);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      if (minAmount) params.append('min_amount', minAmount);
      if (maxAmount) params.append('max_amount', maxAmount);
      
      const res = await axios.get(
        `${API_URL}/api/merchants/transactions/history?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setTransactions(res.data.transactions);
      setPagination(res.data.pagination);
      setSummary(res.data.summary);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      if (error.response?.status === 401) {
        navigate('/merchant');
      } else {
        toast.error('Failed to load transactions');
      }
    } finally {
      setIsLoading(false);
    }
  }, [token, navigate, search, dateFrom, dateTo, minAmount, maxAmount, sortBy, sortOrder]);

  useEffect(() => {
    if (!token) {
      navigate('/merchant');
      return;
    }
    fetchTransactions(1);
  }, [token, navigate]);

  const handleSearch = () => {
    fetchTransactions(1);
  };

  const handleClearFilters = () => {
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setMinAmount('');
    setMaxAmount('');
    setSortBy('date');
    setSortOrder('desc');
    setTimeout(() => fetchTransactions(1), 100);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  useEffect(() => {
    if (!isLoading) {
      fetchTransactions(pagination.page);
    }
  }, [sortBy, sortOrder]);

  const handleExport = async (format) => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams({ format });
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      
      const res = await axios.get(
        `${API_URL}/api/merchants/transactions/export?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (format === 'csv') {
        // Download CSV
        const blob = new Blob([res.data.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = res.data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success('CSV downloaded successfully');
      } else {
        // Download JSON
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sdm_transactions_${dateFrom || 'all'}_${dateTo || 'now'}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success('JSON downloaded successfully');
      }
    } catch (error) {
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-lg border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/merchant/dashboard')}
              className="text-slate-400 hover:text-white"
              data-testid="back-btn"
            >
              <ArrowLeft size={20} />
            </Button>
            <div className="flex items-center gap-2">
              <History className="text-amber-400" size={24} />
              <span className="font-bold text-white text-lg">Transaction History</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="border-slate-700 text-slate-300 hover:text-white"
              data-testid="filter-btn"
            >
              <Filter size={16} className="mr-2" />
              Filters
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchTransactions(pagination.page)}
              className="border-slate-700 text-slate-300 hover:text-white"
              data-testid="refresh-btn"
            >
              <RefreshCw size={16} />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-emerald-400" size={20} />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Total Volume</p>
                <p className="text-white text-xl font-bold">GHS {summary.total_volume.toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <Wallet className="text-amber-400" size={20} />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Total Cashback</p>
                <p className="text-white text-xl font-bold">GHS {summary.total_cashback.toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Receipt className="text-blue-400" size={20} />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Transactions</p>
                <p className="text-white text-xl font-bold">{summary.transaction_count}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium flex items-center gap-2">
                <Filter size={18} />
                Filter Transactions
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-slate-400 hover:text-white"
                data-testid="clear-filters-btn"
              >
                <X size={16} className="mr-1" />
                Clear all
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="text-slate-400 text-sm block mb-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <Input
                    placeholder="Client, reference..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 bg-slate-900 border-slate-700 text-white"
                    data-testid="search-input"
                  />
                </div>
              </div>
              
              {/* Date From */}
              <div>
                <label className="text-slate-400 text-sm block mb-1">From Date</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                  data-testid="date-from-input"
                />
              </div>
              
              {/* Date To */}
              <div>
                <label className="text-slate-400 text-sm block mb-1">To Date</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                  data-testid="date-to-input"
                />
              </div>
              
              {/* Min Amount */}
              <div>
                <label className="text-slate-400 text-sm block mb-1">Min Amount (GHS)</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                  data-testid="min-amount-input"
                />
              </div>
              
              {/* Max Amount */}
              <div>
                <label className="text-slate-400 text-sm block mb-1">Max Amount (GHS)</label>
                <Input
                  type="number"
                  placeholder="10000"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                  data-testid="max-amount-input"
                />
              </div>
            </div>
            
            <div className="flex justify-end mt-4 gap-2">
              <Button
                onClick={handleSearch}
                className="bg-amber-500 hover:bg-amber-600"
                data-testid="apply-filters-btn"
              >
                <Search size={16} className="mr-2" />
                Apply Filters
              </Button>
            </div>
          </div>
        )}

        {/* Export Buttons */}
        <div className="flex justify-end gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('csv')}
            disabled={isExporting}
            className="border-slate-700 text-slate-300 hover:text-white"
            data-testid="export-csv-btn"
          >
            {isExporting ? <Loader2 className="animate-spin mr-2" size={16} /> : <Download size={16} className="mr-2" />}
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('json')}
            disabled={isExporting}
            className="border-slate-700 text-slate-300 hover:text-white"
            data-testid="export-json-btn"
          >
            <Download size={16} className="mr-2" />
            Export JSON
          </Button>
        </div>

        {/* Transactions Table */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-amber-400" size={32} />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-20">
              <Receipt className="text-slate-600 mx-auto mb-4" size={48} />
              <p className="text-slate-400">No transactions found</p>
              <p className="text-slate-500 text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="grid grid-cols-7 gap-4 px-4 py-3 bg-slate-900 border-b border-slate-700 text-sm font-medium text-slate-400">
                <button
                  onClick={() => handleSort('date')}
                  className="flex items-center gap-1 hover:text-white transition-colors text-left"
                  data-testid="sort-date-btn"
                >
                  Date
                  <ArrowUpDown size={14} className={sortBy === 'date' ? 'text-amber-400' : ''} />
                </button>
                <div>Client</div>
                <div className="text-center">Method</div>
                <button
                  onClick={() => handleSort('amount')}
                  className="flex items-center gap-1 hover:text-white transition-colors text-left"
                  data-testid="sort-amount-btn"
                >
                  Amount
                  <ArrowUpDown size={14} className={sortBy === 'amount' ? 'text-amber-400' : ''} />
                </button>
                <button
                  onClick={() => handleSort('cashback')}
                  className="flex items-center gap-1 hover:text-white transition-colors text-left"
                  data-testid="sort-cashback-btn"
                >
                  Cashback
                  <ArrowUpDown size={14} className={sortBy === 'cashback' ? 'text-amber-400' : ''} />
                </button>
                <div>Reference</div>
                <div>Status</div>
              </div>
              
              {/* Table Body */}
              <div className="divide-y divide-slate-700">
                {transactions.map((txn) => (
                  <div
                    key={txn.id}
                    className="grid grid-cols-7 gap-4 px-4 py-3 hover:bg-slate-700/30 transition-colors text-sm"
                    data-testid={`transaction-row-${txn.id}`}
                  >
                    <div className="text-slate-300">
                      {formatDate(txn.date)}
                    </div>
                    <div className="text-white font-medium truncate">
                      {txn.client_name}
                    </div>
                    <div className="text-center">
                      {txn.payment_method === 'cash' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          <Banknote size={12} /> Cash
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          <Smartphone size={12} /> MoMo
                        </span>
                      )}
                    </div>
                    <div className="text-white font-semibold">
                      GHS {txn.amount?.toFixed(2)}
                    </div>
                    <div className="text-emerald-400 font-medium">
                      +GHS {txn.cashback?.toFixed(2)}
                    </div>
                    <div className="text-slate-400 truncate font-mono text-xs">
                      {txn.reference || '-'}
                    </div>
                    <div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        txn.status === 'completed' 
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : txn.status === 'pending'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {txn.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-slate-400 text-sm">
              Page {pagination.page} of {pagination.total_pages} ({pagination.total_count} transactions)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchTransactions(pagination.page - 1)}
                disabled={pagination.page <= 1 || isLoading}
                className="border-slate-700 text-slate-300 hover:text-white"
                data-testid="prev-page-btn"
              >
                <ChevronLeft size={16} />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchTransactions(pagination.page + 1)}
                disabled={pagination.page >= pagination.total_pages || isLoading}
                className="border-slate-700 text-slate-300 hover:text-white"
                data-testid="next-page-btn"
              >
                Next
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
