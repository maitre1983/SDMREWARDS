import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { 
  Activity, RefreshCw, Loader2, AlertTriangle, CheckCircle, 
  Server, Smartphone, Building2, Play, Copy, ExternalLink
} from 'lucide-react';

import { API_URL } from '@/config/api';

export default function HubtelDiagnostics({ token }) {
  const [isLoading, setIsLoading] = useState(false);
  const [configData, setConfigData] = useState(null);
  const [fullDiagnosis, setFullDiagnosis] = useState(null);
  const [momoTestResult, setMomoTestResult] = useState(null);
  const [bankTestResult, setBankTestResult] = useState(null);
  
  // Test form data
  const [momoForm, setMomoForm] = useState({ phone: '', amount: 1 });
  const [bankForm, setBankForm] = useState({ 
    account_number: '', 
    bank_code: '300335', 
    account_name: '',
    amount: 1 
  });

  const headers = { Authorization: `Bearer ${token}` };

  const fetchConfig = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/hubtel-diagnostic/config`, { headers });
      setConfigData(res.data);
    } catch (error) {
      console.error('Error fetching config:', error);
      toast.error('Failed to fetch Hubtel configuration');
    }
  };

  const runFullDiagnosis = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get(`${API_URL}/api/admin/hubtel-diagnostic/full-diagnosis`, { headers });
      setFullDiagnosis(res.data);
      toast.success('Diagnosis complete');
    } catch (error) {
      console.error('Error running diagnosis:', error);
      toast.error('Failed to run diagnosis');
    } finally {
      setIsLoading(false);
    }
  };

  const testMomo = async () => {
    if (!momoForm.phone) {
      toast.error('Please enter a phone number');
      return;
    }
    
    try {
      setIsLoading(true);
      const res = await axios.post(
        `${API_URL}/api/admin/hubtel-diagnostic/test-momo`,
        { phone: momoForm.phone, amount: parseFloat(momoForm.amount) || 1 },
        { headers }
      );
      setMomoTestResult(res.data);
      toast.success('MoMo test complete');
    } catch (error) {
      console.error('Error testing MoMo:', error);
      toast.error(error.response?.data?.detail || 'MoMo test failed');
    } finally {
      setIsLoading(false);
    }
  };

  const testBank = async () => {
    if (!bankForm.account_number || !bankForm.account_name) {
      toast.error('Please fill all bank details');
      return;
    }
    
    try {
      setIsLoading(true);
      const res = await axios.post(
        `${API_URL}/api/admin/hubtel-diagnostic/test-bank`,
        bankForm,
        { headers }
      );
      setBankTestResult(res.data);
      toast.success('Bank test complete');
    } catch (error) {
      console.error('Error testing Bank:', error);
      toast.error(error.response?.data?.detail || 'Bank test failed');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(JSON.stringify(text, null, 2));
    toast.success('Copied to clipboard');
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const StatusBadge = ({ success }) => (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
      success 
        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
        : 'bg-red-500/20 text-red-400 border border-red-500/30'
    }`}>
      {success ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
      {success ? 'OK' : 'Issue'}
    </span>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="text-yellow-400 mt-0.5 flex-shrink-0" size={20} />
        <div>
          <h4 className="text-yellow-300 font-medium">Hubtel API Diagnostics</h4>
          <p className="text-yellow-200/70 text-sm mt-1">
            Use these tools to diagnose issues with MoMo and Bank disbursements.
            <strong className="text-yellow-300"> Test transactions will use REAL money.</strong>
          </p>
        </div>
      </div>

      {/* Configuration Status */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Server size={20} className="text-blue-400" />
            Configuration Status
          </h3>
          <Button variant="outline" size="sm" onClick={fetchConfig} className="border-slate-600">
            <RefreshCw size={14} className="mr-1" /> Refresh
          </Button>
        </div>

        {configData?.configuration && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-slate-900 rounded-lg p-3">
              <p className="text-slate-400 text-xs mb-1">Client ID</p>
              <p className="text-white text-sm font-mono">{configData.configuration.client_id}</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-3">
              <p className="text-slate-400 text-xs mb-1">Prepaid Deposit ID</p>
              <p className="text-white text-sm font-mono">{configData.configuration.prepaid_deposit_id}</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-3">
              <p className="text-slate-400 text-xs mb-1">Static IP Proxy</p>
              <p className="text-white text-sm">
                {configData.configuration.proxy_configured ? (
                  <span className="text-green-400">{configData.configuration.proxy_ip}</span>
                ) : (
                  <span className="text-red-400">Not Configured</span>
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Full Diagnosis */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Activity size={20} className="text-purple-400" />
            Full Diagnosis (Safe - No Transactions)
          </h3>
          <Button 
            onClick={runFullDiagnosis} 
            disabled={isLoading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isLoading ? <Loader2 size={14} className="animate-spin mr-1" /> : <Play size={14} className="mr-1" />}
            Run Diagnosis
          </Button>
        </div>

        {fullDiagnosis && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <StatusBadge success={fullDiagnosis.success} />
              <span className="text-slate-300 text-sm">
                {fullDiagnosis.diagnosis?.overall_status}
              </span>
            </div>

            {fullDiagnosis.diagnosis?.issues_found?.length > 0 && (
              <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3">
                <p className="text-red-400 text-sm font-medium mb-2">Issues Found:</p>
                <ul className="list-disc list-inside text-red-300 text-sm space-y-1">
                  {fullDiagnosis.diagnosis.issues_found.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {fullDiagnosis.diagnosis?.recommendations?.length > 0 && (
              <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3">
                <p className="text-blue-400 text-sm font-medium mb-2">Recommendations:</p>
                <ul className="list-disc list-inside text-blue-300 text-sm space-y-1">
                  {fullDiagnosis.diagnosis.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => copyToClipboard(fullDiagnosis)}
              className="border-slate-600"
            >
              <Copy size={14} className="mr-1" /> Copy Full Report
            </Button>
          </div>
        )}
      </div>

      {/* MoMo Test */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Smartphone size={20} className="text-yellow-400" />
          Test MoMo Disbursement
        </h3>

        <div className="grid sm:grid-cols-3 gap-4 mb-4">
          <div>
            <Label className="text-slate-400 text-xs">Phone Number</Label>
            <Input
              type="text"
              placeholder="0551234567"
              value={momoForm.phone}
              onChange={(e) => setMomoForm(prev => ({ ...prev, phone: e.target.value }))}
              className="mt-1 bg-slate-900 border-slate-700 text-white"
            />
          </div>
          <div>
            <Label className="text-slate-400 text-xs">Amount (GHS)</Label>
            <Input
              type="number"
              min="1"
              max="5"
              value={momoForm.amount}
              onChange={(e) => setMomoForm(prev => ({ ...prev, amount: e.target.value }))}
              className="mt-1 bg-slate-900 border-slate-700 text-white"
            />
          </div>
          <div className="flex items-end">
            <Button 
              onClick={testMomo} 
              disabled={isLoading}
              className="bg-yellow-600 hover:bg-yellow-700 w-full"
            >
              {isLoading ? <Loader2 size={14} className="animate-spin mr-1" /> : <Play size={14} className="mr-1" />}
              Test MoMo
            </Button>
          </div>
        </div>

        {momoTestResult && (
          <div className="bg-slate-900 rounded-lg p-4 mt-4">
            <div className="flex items-center justify-between mb-2">
              <StatusBadge success={momoTestResult.success} />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => copyToClipboard(momoTestResult)}
                className="text-slate-400"
              >
                <Copy size={14} className="mr-1" /> Copy
              </Button>
            </div>
            
            {momoTestResult.diagnostics?.response?.body && (
              <div className="mt-2">
                <p className="text-slate-400 text-xs mb-1">Hubtel Response:</p>
                <pre className="text-xs text-slate-300 bg-slate-950 p-2 rounded overflow-x-auto">
                  {JSON.stringify(momoTestResult.diagnostics.response.body, null, 2)}
                </pre>
              </div>
            )}

            {momoTestResult.diagnostics?.analysis && (
              <div className="mt-2 text-sm">
                <span className="text-slate-400">Analysis: </span>
                <span className="text-white">{momoTestResult.diagnostics.analysis.issue || 'No issues detected'}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bank Test */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Building2 size={20} className="text-green-400" />
          Test Bank Disbursement
        </h3>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <Label className="text-slate-400 text-xs">Account Number</Label>
            <Input
              type="text"
              placeholder="1234567890"
              value={bankForm.account_number}
              onChange={(e) => setBankForm(prev => ({ ...prev, account_number: e.target.value }))}
              className="mt-1 bg-slate-900 border-slate-700 text-white"
            />
          </div>
          <div>
            <Label className="text-slate-400 text-xs">Account Name</Label>
            <Input
              type="text"
              placeholder="John Doe"
              value={bankForm.account_name}
              onChange={(e) => setBankForm(prev => ({ ...prev, account_name: e.target.value }))}
              className="mt-1 bg-slate-900 border-slate-700 text-white"
            />
          </div>
          <div>
            <Label className="text-slate-400 text-xs">Bank Code</Label>
            <select
              value={bankForm.bank_code}
              onChange={(e) => setBankForm(prev => ({ ...prev, bank_code: e.target.value }))}
              className="mt-1 w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white text-sm"
            >
              <option value="300335">GCB Bank</option>
              <option value="130100">Ecobank</option>
              <option value="190100">Stanbic Bank</option>
              <option value="240100">Fidelity Bank</option>
              <option value="280100">Access Bank</option>
              <option value="120100">Zenith Bank</option>
              <option value="030100">Absa Bank</option>
            </select>
          </div>
          <div>
            <Label className="text-slate-400 text-xs">Amount (GHS)</Label>
            <Input
              type="number"
              min="1"
              max="5"
              value={bankForm.amount}
              onChange={(e) => setBankForm(prev => ({ ...prev, amount: e.target.value }))}
              className="mt-1 bg-slate-900 border-slate-700 text-white"
            />
          </div>
        </div>

        <Button 
          onClick={testBank} 
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700"
        >
          {isLoading ? <Loader2 size={14} className="animate-spin mr-1" /> : <Play size={14} className="mr-1" />}
          Test Bank Transfer
        </Button>

        {bankTestResult && (
          <div className="bg-slate-900 rounded-lg p-4 mt-4">
            <div className="flex items-center justify-between mb-2">
              <StatusBadge success={bankTestResult.success} />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => copyToClipboard(bankTestResult)}
                className="text-slate-400"
              >
                <Copy size={14} className="mr-1" /> Copy
              </Button>
            </div>
            
            {bankTestResult.diagnostics?.response?.body && (
              <div className="mt-2">
                <p className="text-slate-400 text-xs mb-1">Hubtel Response:</p>
                <pre className="text-xs text-slate-300 bg-slate-950 p-2 rounded overflow-x-auto">
                  {JSON.stringify(bankTestResult.diagnostics.response.body, null, 2)}
                </pre>
              </div>
            )}

            {bankTestResult.diagnostics?.analysis && (
              <div className="mt-2 text-sm">
                <span className="text-slate-400">Analysis: </span>
                <span className="text-white">{bankTestResult.diagnostics.analysis.issue || 'No issues detected'}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <h4 className="text-slate-300 font-medium mb-2 text-sm">How to Use These Results</h4>
        <ol className="list-decimal list-inside text-slate-400 text-sm space-y-1">
          <li>Run "Full Diagnosis" first to check configuration</li>
          <li>If config is OK, test MoMo with GHS 1 (minimum amount)</li>
          <li>Copy the full response and share with Hubtel support</li>
          <li>Include your Prepaid Deposit ID: <code className="text-purple-400">{configData?.configuration?.prepaid_deposit_id}</code></li>
        </ol>
      </div>
    </div>
  );
}
