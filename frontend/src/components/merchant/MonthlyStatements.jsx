import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { 
  FileText, 
  Download, 
  Calendar, 
  DollarSign, 
  TrendingUp,
  BarChart3,
  Loader2,
  ChevronRight,
  ArrowLeft,
  CreditCard,
  Banknote
} from 'lucide-react';

// API URL imported from config
import { API_URL } from '@/config/api';

export default function MonthlyStatements({ token }) {
  const [statements, setStatements] = useState([]);
  const [selectedStatement, setSelectedStatement] = useState(null);
  const [statementData, setStatementData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchStatements();
  }, []);

  const fetchStatements = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get(`${API_URL}/api/merchants/statements`, { headers });
      setStatements(res.data.statements || []);
    } catch (error) {
      toast.error('Failed to load statements');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStatementDetails = async (year, month) => {
    try {
      setIsLoading(true);
      const res = await axios.get(`${API_URL}/api/merchants/statements/${year}/${month}`, { headers });
      setStatementData(res.data.statement);
      setSelectedStatement({ year, month });
    } catch (error) {
      toast.error('Failed to load statement details');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadStatement = async (year, month) => {
    try {
      setIsDownloading(true);
      const response = await axios.get(
        `${API_URL}/api/merchants/statements/${year}/${month}/download?format=csv`,
        { 
          headers,
          responseType: 'blob'
        }
      );
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `SDM_Statement_${year}_${month}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Statement downloaded');
    } catch (error) {
      toast.error('Failed to download statement');
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading && !statementData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-emerald-400" size={32} />
      </div>
    );
  }

  // Statement detail view
  if (selectedStatement && statementData) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => { setSelectedStatement(null); setStatementData(null); }}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            Back to Statements
          </button>
          <Button
            onClick={() => downloadStatement(selectedStatement.year, selectedStatement.month)}
            disabled={isDownloading}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isDownloading ? <Loader2 className="animate-spin mr-2" size={16} /> : <Download className="mr-2" size={16} />}
            Download CSV
          </Button>
        </div>

        {/* Statement Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <FileText size={24} />
            <h2 className="text-xl font-bold">Monthly Statement</h2>
          </div>
          <p className="text-emerald-100 text-lg">{statementData.period.label}</p>
          <p className="text-emerald-200 text-sm mt-1">{statementData.merchant.business_name}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <BarChart3 size={16} />
              <span className="text-xs">Transactions</span>
            </div>
            <p className="text-white text-xl font-bold">{statementData.summary.total_transactions}</p>
          </div>
          
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <DollarSign size={16} />
              <span className="text-xs">Total Sales</span>
            </div>
            <p className="text-emerald-400 text-xl font-bold">GHS {statementData.summary.total_sales.toFixed(2)}</p>
          </div>
          
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <CreditCard size={16} />
              <span className="text-xs">Cashback Given</span>
            </div>
            <p className="text-amber-400 text-xl font-bold">GHS {statementData.summary.total_cashback_given.toFixed(2)}</p>
          </div>
          
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <TrendingUp size={16} />
              <span className="text-xs">Avg Transaction</span>
            </div>
            <p className="text-white text-xl font-bold">GHS {statementData.summary.average_transaction.toFixed(2)}</p>
          </div>
        </div>

        {/* Payment Methods Breakdown */}
        {Object.keys(statementData.payment_methods).length > 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Banknote size={18} className="text-emerald-400" />
              Payment Methods
            </h3>
            <div className="space-y-2">
              {Object.entries(statementData.payment_methods).map(([method, data]) => (
                <div key={method} className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
                  <span className="text-slate-300 capitalize">{method.replace('_', ' ')}</span>
                  <div className="text-right">
                    <p className="text-white font-medium">GHS {data.amount.toFixed(2)}</p>
                    <p className="text-slate-500 text-xs">{data.count} transactions</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Daily Breakdown */}
        {statementData.daily_breakdown.length > 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Calendar size={18} className="text-emerald-400" />
              Daily Summary
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {statementData.daily_breakdown.map((day) => (
                <div key={day.date} className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
                  <span className="text-slate-300">{new Date(day.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                  <div className="text-right">
                    <p className="text-white font-medium">GHS {day.amount.toFixed(2)}</p>
                    <p className="text-slate-500 text-xs">{day.count} txns | GHS {day.cashback.toFixed(2)} cashback</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Transactions Preview */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-3">Recent Transactions ({statementData.transactions.length})</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {statementData.transactions.slice(0, 10).map((tx, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
                <div>
                  <p className="text-white text-sm">{tx.client_name || tx.client_phone || 'Customer'}</p>
                  <p className="text-slate-500 text-xs">{new Date(tx.created_at).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-emerald-400 font-medium">GHS {tx.amount?.toFixed(2)}</p>
                  <p className="text-amber-400 text-xs">-{tx.cashback_amount?.toFixed(2)} cashback</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Generated timestamp */}
        <p className="text-slate-500 text-xs text-center">
          Statement generated: {new Date(statementData.generated_at).toLocaleString()}
        </p>
      </div>
    );
  }

  // Statements list view
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <FileText className="text-emerald-400" size={24} />
        <h2 className="text-white text-xl font-bold">Monthly Statements</h2>
      </div>

      {statements.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
          <FileText className="mx-auto text-slate-600 mb-3" size={48} />
          <p className="text-slate-400">No statements available yet</p>
          <p className="text-slate-500 text-sm mt-1">Statements will appear after your first transaction</p>
        </div>
      ) : (
        <div className="space-y-2">
          {statements.map((statement) => (
            <button
              key={statement.period}
              onClick={() => fetchStatementDetails(statement.year, statement.month)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center justify-between hover:bg-slate-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                  <Calendar className="text-emerald-400" size={24} />
                </div>
                <div className="text-left">
                  <p className="text-white font-semibold">{statement.label}</p>
                  <p className="text-slate-500 text-sm">Click to view details</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={(e) => { e.stopPropagation(); downloadStatement(statement.year, statement.month); }}
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <Download size={14} />
                </Button>
                <ChevronRight className="text-slate-500" size={20} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
