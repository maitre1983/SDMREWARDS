import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

// API URL imported from config
import { API_URL } from '@/config/api';

const AdminContext = createContext(null);

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}

export function AdminProvider({ children, token, admin }) {
  // Data states
  const [stats, setStats] = useState(null);
  const [clients, setClients] = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Selected items
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  
  // Transaction data
  const [clientTransactions, setClientTransactions] = useState([]);
  const [merchantTransactions, setMerchantTransactions] = useState([]);
  const [transactionSummary, setTransactionSummary] = useState(null);
  
  // Modal states
  const [modals, setModals] = useState({
    clientDetails: false,
    merchantDetails: false,
    sms: false,
    limits: false,
    location: false,
    createClient: false,
    createMerchant: false,
    bulkSms: false,
    template: false,
    push: false,
    debitSettings: false,
    pin: false,
    setPin: false,
    password: false,
    resetPassword: false,
    admin: false
  });
  
  // SMS state
  const [smsRecipientType, setSmsRecipientType] = useState('client');
  
  const headers = { Authorization: `Bearer ${token}` };

  // Open/close modal helpers
  const openModal = useCallback((modalName) => {
    setModals(prev => ({ ...prev, [modalName]: true }));
  }, []);
  
  const closeModal = useCallback((modalName) => {
    setModals(prev => ({ ...prev, [modalName]: false }));
  }, []);
  
  const closeAllModals = useCallback(() => {
    setModals({
      clientDetails: false,
      merchantDetails: false,
      sms: false,
      limits: false,
      location: false,
      createClient: false,
      createMerchant: false,
      bulkSms: false,
      template: false,
      push: false,
      debitSettings: false,
      pin: false,
      setPin: false,
      password: false,
      resetPassword: false,
      admin: false
    });
  }, []);

  // Fetch functions
  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/stats`, { headers });
      setStats(res.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [token]);

  const fetchClients = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/clients`, { headers });
      setClients(res.data.clients || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  }, [token]);

  const fetchMerchants = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/merchants`, { headers });
      setMerchants(res.data.merchants || []);
    } catch (error) {
      console.error('Error fetching merchants:', error);
    }
  }, [token]);

  const fetchClientTransactions = useCallback(async (clientId) => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/clients/${clientId}/transactions`, { headers });
      setClientTransactions(res.data.transactions || []);
      setTransactionSummary(res.data.summary || null);
    } catch (error) {
      console.error('Error fetching client transactions:', error);
    }
  }, [token]);

  const fetchMerchantTransactions = useCallback(async (merchantId) => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/merchants/${merchantId}/transactions`, { headers });
      setMerchantTransactions(res.data.transactions || []);
      setTransactionSummary(res.data.summary || null);
    } catch (error) {
      console.error('Error fetching merchant transactions:', error);
    }
  }, [token]);

  // Action functions
  const updateClientStatus = useCallback(async (clientId, action) => {
    try {
      await axios.post(`${API_URL}/api/admin/clients/${clientId}/${action}`, {}, { headers });
      toast.success(`Client ${action}ed successfully`);
      fetchClients();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to ${action} client`);
    }
  }, [token, fetchClients, fetchStats]);

  const updateMerchantStatus = useCallback(async (merchantId, action) => {
    try {
      await axios.post(`${API_URL}/api/admin/merchants/${merchantId}/${action}`, {}, { headers });
      toast.success(`Merchant ${action}ed successfully`);
      fetchMerchants();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to ${action} merchant`);
    }
  }, [token, fetchMerchants, fetchStats]);

  const deleteClient = useCallback(async (clientId) => {
    if (!window.confirm('Are you sure you want to delete this client?')) return;
    try {
      await axios.delete(`${API_URL}/api/admin/clients/${clientId}`, { headers });
      toast.success('Client deleted successfully');
      fetchClients();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete client');
    }
  }, [token, fetchClients, fetchStats]);

  const deleteMerchant = useCallback(async (merchantId) => {
    if (!window.confirm('Are you sure you want to delete this merchant?')) return;
    try {
      await axios.delete(`${API_URL}/api/admin/merchants/${merchantId}`, { headers });
      toast.success('Merchant deleted successfully');
      fetchMerchants();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete merchant');
    }
  }, [token, fetchMerchants, fetchStats]);

  // View client/merchant details
  const viewClientDetails = useCallback(async (client) => {
    setSelectedClient(client);
    await fetchClientTransactions(client.id);
    openModal('clientDetails');
  }, [fetchClientTransactions, openModal]);

  const viewMerchantDetails = useCallback(async (merchant) => {
    setSelectedMerchant(merchant);
    await fetchMerchantTransactions(merchant.id);
    openModal('merchantDetails');
  }, [fetchMerchantTransactions, openModal]);

  // Context value
  const value = {
    // Auth
    token,
    admin,
    headers,
    
    // Data
    stats,
    clients,
    merchants,
    isLoading,
    setIsLoading,
    
    // Selected
    selectedClient,
    setSelectedClient,
    selectedMerchant,
    setSelectedMerchant,
    
    // Transactions
    clientTransactions,
    merchantTransactions,
    transactionSummary,
    
    // Modals
    modals,
    openModal,
    closeModal,
    closeAllModals,
    
    // SMS
    smsRecipientType,
    setSmsRecipientType,
    
    // Fetch functions
    fetchStats,
    fetchClients,
    fetchMerchants,
    fetchClientTransactions,
    fetchMerchantTransactions,
    
    // Actions
    updateClientStatus,
    updateMerchantStatus,
    deleteClient,
    deleteMerchant,
    viewClientDetails,
    viewMerchantDetails
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
}

export default AdminContext;
