import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Wallet, QrCode, ArrowLeft, Phone, Loader2, 
  Send, History, DollarSign, ArrowDownToLine, CheckCircle2, CheckCircle,
  Copy, RefreshCw, Gift, Users, Share2, CreditCard, Award, Store,
  Smartphone, Wifi, Zap, Banknote, ChevronRight, AlertCircle, Crown, MapPin, Ticket,
  Eye, EyeOff, User, Lock, Calendar, Cake, Check, X, Clock, Camera, ScanLine,
  Shield, FileText, Upload, UserCheck, Contact, MessageSquare
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import OTPInput from '../components/OTPInput';
import { toast } from 'sonner';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import { QRCodeSVG } from 'qrcode.react';
import QRScanner from '../components/QRScanner';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const LOGO_URL = "/sdm-logo.png";

export default function SDMClientPage() {
  const { t, isRTL } = useLanguage();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState('welcome'); // welcome, register, login, otp, register_form, dashboard
  const [phone, setPhone] = useState('');
  const [referralCode, setReferralCode] = useState(searchParams.get('ref') || '');
  const [otp, setOtp] = useState('');
  const [otpId, setOtpId] = useState('');
  const [debugOtp, setDebugOtp] = useState('');
  const [ussdCode, setUssdCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('sdm_user_token'));
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [referralData, setReferralData] = useState(null);
  const [referralPeriod, setReferralPeriod] = useState('all');
  const [showReferralQR, setShowReferralQR] = useState(false);
  const [activeTab, setActiveTab] = useState('wallet');
  const [availableCards, setAvailableCards] = useState([]);
  const [userMemberships, setUserMemberships] = useState([]);
  const [isPurchasing, setIsPurchasing] = useState(false);
  
  // Auth form states
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  
  // Withdrawal form
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPhone, setWithdrawPhone] = useState('');
  const [withdrawProvider, setWithdrawProvider] = useState('MTN');

  // Super App Services state
  const [activeService, setActiveService] = useState(null); // null, 'airtime', 'data', 'bill', 'momo', 'vip'
  const [serviceBalance, setServiceBalance] = useState(null);
  const [dataBundles, setDataBundles] = useState([]);
  const [serviceHistory, setServiceHistory] = useState([]);
  const [isServiceLoading, setIsServiceLoading] = useState(false);
  const [activePromos, setActivePromos] = useState([]);
  const [vipCards, setVipCards] = useState([]);
  const [myVipMembership, setMyVipMembership] = useState(null);
  const [partners, setPartners] = useState([]);
  const [lotteries, setLotteries] = useState(null);
  const [serviceFees, setServiceFees] = useState(null); // NEW: Dynamic service fees
  
  // Pending payments state
  const [pendingPayments, setPendingPayments] = useState([]);
  const [showPendingPayments, setShowPendingPayments] = useState(false);
  
  // QR Scanner state for client-initiated payments
  const [showScanner, setShowScanner] = useState(false);
  const [scannedMerchant, setScannedMerchant] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentStep, setPaymentStep] = useState('scan'); // scan, amount, processing, success
  
  // Partner details modal state
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [showPartnerDetails, setShowPartnerDetails] = useState(false);
  
  // KYC state
  const [kycStatus, setKycStatus] = useState(null);
  const [showKycForm, setShowKycForm] = useState(false);
  const [kycForm, setKycForm] = useState({
    documentType: 'GHANA_CARD',
    documentNumber: '',
    fullName: '',
    dateOfBirth: '',
    gender: '',
    address: ''
  });
  const [kycUploads, setKycUploads] = useState({
    front: null,
    back: null,
    selfie: null
  });
  const [isSubmittingKyc, setIsSubmittingKyc] = useState(false);
  
  // Contacts state
  const [syncedContacts, setSyncedContacts] = useState([]);
  const [isSyncingContacts, setIsSyncingContacts] = useState(false);
  const [showContactPayment, setShowContactPayment] = useState(null);
  const [contactPaymentAmount, setContactPaymentAmount] = useState('');
  
  // Service form states
  const [airtimeForm, setAirtimeForm] = useState({ phone: '', amount: '', network: '' });
  const [dataForm, setDataForm] = useState({ phone: '', bundleId: '' });
  const [billForm, setBillForm] = useState({ provider: 'ECG', accountNumber: '', amount: '' });
  const [momoForm, setMomoForm] = useState({ phone: '', amount: '', network: '' });

  useEffect(() => {
    if (token) {
      setStep('dashboard');
      fetchUserData();
    }
  }, [token]);

  // Load service data when services or partners tab is active
  useEffect(() => {
    if ((activeTab === 'services' || activeTab === 'partners') && token) {
      fetchServiceData();
    }
  }, [activeTab, token]);

  const fetchUserData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [profileRes, walletRes, txnRes, referralRes, cardsRes, membershipsRes] = await Promise.all([
        axios.get(`${API_URL}/api/sdm/user/profile`, { headers }),
        axios.get(`${API_URL}/api/sdm/user/wallet`, { headers }),
        axios.get(`${API_URL}/api/sdm/user/transactions`, { headers }),
        axios.get(`${API_URL}/api/sdm/user/referrals?period=${referralPeriod}`, { headers }),
        axios.get(`${API_URL}/api/sdm/user/available-cards`, { headers }),
        axios.get(`${API_URL}/api/sdm/user/memberships`, { headers })
      ]);
      setUser(profileRes.data);
      setWallet(walletRes.data);
      setTransactions(txnRes.data);
      setReferralData(referralRes.data);
      setAvailableCards(cardsRes.data);
      setUserMemberships(membershipsRes.data);
    } catch (error) {
      console.error('Fetch error:', error);
      if (error.response?.status === 401) {
        handleLogout();
      }
    }
  };
  
  // Fetch pending cash payments
  const fetchPendingPayments = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/api/sdm/payments/pending`, { headers });
      setPendingPayments(response.data.pending_payments || []);
      if (response.data.pending_payments?.length > 0) {
        setShowPendingPayments(true);
      }
    } catch (error) {
      console.error('Pending payments fetch error:', error);
    }
  };
  
  // Confirm or reject cash payment
  const handleConfirmCashPayment = async (paymentId, confirm) => {
    try {
      setIsLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.post(
        `${API_URL}/api/sdm/payments/confirm-cash`,
        { payment_id: paymentId, confirm },
        { headers }
      );
      
      if (response.data.success) {
        if (confirm) {
          toast.success(`Payment confirmed! Cashback: GHS ${response.data.cashback_credited?.toFixed(2)}`);
        } else {
          toast.info('Payment cancelled');
        }
        fetchPendingPayments();
        fetchUserData();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to process payment');
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== QR SCANNER FUNCTIONS ====================
  
  // Handle QR code scan from merchant
  const handleMerchantQRScan = async (qrCode) => {
    setShowScanner(false);
    setIsProcessingPayment(true);
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      // Verify the merchant QR code
      const response = await axios.get(
        `${API_URL}/api/sdm/merchant/by-qr/${qrCode}`,
        { headers }
      );
      
      if (response.data) {
        setScannedMerchant(response.data);
        setPaymentStep('amount');
        toast.success(`Marchand trouvé: ${response.data.business_name}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid QR Code or merchant not found');
      setPaymentStep('scan');
      setScannedMerchant(null);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Handle payment initiation after entering amount
  const handleInitiatePayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('Veuillez entrer un montant valide');
      return;
    }
    
    setIsProcessingPayment(true);
    setPaymentStep('processing');
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.post(
        `${API_URL}/api/sdm/client/pay-merchant`,
        {
          merchant_qr_code: scannedMerchant.qr_code,
          amount: parseFloat(paymentAmount)
        },
        { headers }
      );
      
      if (response.data.success) {
        setPaymentStep('success');
        toast.success(response.data.message || 'Prompt de paiement envoyé! Approuvez sur votre téléphone.');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Échec de l\'initiation du paiement');
      setPaymentStep('amount');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Reset payment flow
  const resetPaymentFlow = () => {
    setScannedMerchant(null);
    setPaymentAmount('');
    setPaymentStep('scan');
    setShowScanner(false);
  };
  
  // Poll for pending payments every 30 seconds when logged in
  useEffect(() => {
    if (token) {
      fetchPendingPayments();
      const interval = setInterval(fetchPendingPayments, 30000);
      return () => clearInterval(interval);
    }
  }, [token]);

  // Reload referral data when period filter changes
  const fetchReferrals = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/api/sdm/user/referrals?period=${referralPeriod}`, { headers });
      setReferralData(response.data);
    } catch (error) {
      console.error('Failed to fetch referrals:', error);
    }
  };
  
  useEffect(() => {
    if (token && activeTab === 'referral') {
      fetchReferrals();
    }
  }, [referralPeriod, token, activeTab]);

  // Fetch service-related data
  const fetchServiceData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [balanceRes, bundlesRes, historyRes, promosRes, vipCardsRes, vipMembershipRes, partnersRes, lotteriesRes, feesRes] = await Promise.all([
        axios.get(`${API_URL}/api/sdm/user/services/balance`, { headers }),
        axios.get(`${API_URL}/api/sdm/user/services/data-bundles`, { headers }),
        axios.get(`${API_URL}/api/sdm/user/services/history`, { headers }),
        axios.get(`${API_URL}/api/sdm/user/services/promotions`, { headers }),
        axios.get(`${API_URL}/api/sdm/user/vip-cards`),
        axios.get(`${API_URL}/api/sdm/user/my-vip-membership`, { headers }),
        axios.get(`${API_URL}/api/sdm/partners`),
        axios.get(`${API_URL}/api/sdm/user/lotteries`, { headers }),
        axios.get(`${API_URL}/api/sdm/user/services/fees`) // NEW: Fetch service fees
      ]);
      setServiceBalance(balanceRes.data);
      setDataBundles(bundlesRes.data.bundles || []);
      setServiceHistory(historyRes.data.transactions || []);
      setActivePromos(promosRes.data.promotions || []);
      setVipCards(vipCardsRes.data.cards || []);
      setMyVipMembership(vipMembershipRes.data.membership);
      setPartners(partnersRes.data.partners || []);
      setLotteries(lotteriesRes.data);
      setServiceFees(feesRes.data); // NEW: Set service fees
    } catch (error) {
      console.error('Service data fetch error:', error);
    }
  };

  // ============== KYC FUNCTIONS ==============
  const fetchKycStatus = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/api/sdm/user/kyc/status`, { headers });
      setKycStatus(response.data);
    } catch (error) {
      console.error('KYC status fetch error:', error);
    }
  };

  const handleSubmitKyc = async (e) => {
    e.preventDefault();
    setIsSubmittingKyc(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // First submit KYC info
      const submitRes = await axios.post(`${API_URL}/api/sdm/user/kyc/submit`, {
        document_type: kycForm.documentType,
        document_number: kycForm.documentNumber,
        full_name: kycForm.fullName,
        date_of_birth: kycForm.dateOfBirth || null,
        gender: kycForm.gender || null,
        address: kycForm.address || null
      }, { headers });
      
      const kycId = submitRes.data.kyc_id;
      
      // Then upload documents
      if (kycUploads.front) {
        const frontData = new FormData();
        frontData.append('file', kycUploads.front);
        await axios.post(`${API_URL}/api/sdm/user/kyc/upload/${kycId}?document_type=front`, frontData, {
          headers: { ...headers, 'Content-Type': 'multipart/form-data' }
        });
      }
      
      if (kycUploads.back) {
        const backData = new FormData();
        backData.append('file', kycUploads.back);
        await axios.post(`${API_URL}/api/sdm/user/kyc/upload/${kycId}?document_type=back`, backData, {
          headers: { ...headers, 'Content-Type': 'multipart/form-data' }
        });
      }
      
      if (kycUploads.selfie) {
        const selfieData = new FormData();
        selfieData.append('file', kycUploads.selfie);
        await axios.post(`${API_URL}/api/sdm/user/kyc/upload/${kycId}?document_type=selfie`, selfieData, {
          headers: { ...headers, 'Content-Type': 'multipart/form-data' }
        });
      }
      
      toast.success('KYC submitted successfully! Awaiting review.');
      setShowKycForm(false);
      setKycForm({ documentType: 'GHANA_CARD', documentNumber: '', fullName: '', dateOfBirth: '', gender: '', address: '' });
      setKycUploads({ front: null, back: null, selfie: null });
      fetchKycStatus();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'KYC submission failed');
    } finally {
      setIsSubmittingKyc(false);
    }
  };

  // ============== CONTACTS FUNCTIONS ==============
  const fetchSyncedContacts = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/api/sdm/user/contacts`, { headers });
      setSyncedContacts(response.data.contacts || []);
    } catch (error) {
      console.error('Contacts fetch error:', error);
    }
  };

  const handleSyncContacts = async () => {
    setIsSyncingContacts(true);
    try {
      // Request contact access (simulated - in real app, use native API)
      // For web, we'll use a manual input method
      const input = prompt('Enter phone numbers to sync (comma separated):\nExample: 0241234567, 0551234567, 0201234567');
      
      if (!input) {
        setIsSyncingContacts(false);
        return;
      }
      
      const phoneNumbers = input.split(',').map(p => p.trim()).filter(p => p.length >= 9);
      
      if (phoneNumbers.length === 0) {
        toast.error('No valid phone numbers entered');
        setIsSyncingContacts(false);
        return;
      }
      
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.post(`${API_URL}/api/sdm/user/contacts/sync`, {
        phone_numbers: phoneNumbers
      }, { headers });
      
      setSyncedContacts(response.data.sdm_contacts || []);
      toast.success(`Synced ${response.data.total_synced} contacts. Found ${response.data.sdm_contacts_count} SDM members!`);
      
      if (response.data.non_sdm_count > 0) {
        toast.info(`${response.data.non_sdm_count} contacts are not on SDM yet. Invite them!`);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Contact sync failed');
    } finally {
      setIsSyncingContacts(false);
    }
  };

  const handleInviteContact = async (phone) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API_URL}/api/sdm/user/contacts/invite?phone=${encodeURIComponent(phone)}`, {}, { headers });
      toast.success('Invitation sent!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send invitation');
    }
  };

  const handlePayContact = async (contact) => {
    if (!contactPaymentAmount || parseFloat(contactPaymentAmount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      // Use the existing merchant payment endpoint if contact has qr_code
      if (contact.qr_code) {
        await axios.post(`${API_URL}/api/sdm/client/pay-merchant`, {
          merchant_qr: contact.qr_code,
          amount: parseFloat(contactPaymentAmount)
        }, { headers });
        toast.success(`Sent GHS ${contactPaymentAmount} to ${contact.name}!`);
      } else {
        toast.error('Contact does not have a QR code for receiving payments');
      }
      setShowContactPayment(null);
      setContactPaymentAmount('');
      fetchUserData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Payment failed');
    }
  };

  // Load KYC and contacts when membership tab is active
  useEffect(() => {
    if (activeTab === 'membership' && token) {
      fetchKycStatus();
      fetchSyncedContacts();
    }
  }, [activeTab, token]);

  // Helper to check if a service has active promo
  const getServicePromo = (serviceType) => {
    return activePromos.find(p => p.target_service === serviceType || p.target_service === 'ALL');
  };

  // Buy Airtime
  const handleBuyAirtime = async (e) => {
    e.preventDefault();
    setIsServiceLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.post(`${API_URL}/api/sdm/user/services/airtime`, {
        phone_number: airtimeForm.phone,
        amount: parseFloat(airtimeForm.amount),
        network: airtimeForm.network || null
      }, { headers });
      
      toast.success(`Airtime purchased! Reference: ${response.data.reference}`);
      setAirtimeForm({ phone: '', amount: '', network: '' });
      setActiveService(null);
      fetchUserData();
      fetchServiceData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Purchase failed');
    } finally {
      setIsServiceLoading(false);
    }
  };

  // Buy Data Bundle
  const handleBuyData = async (e) => {
    e.preventDefault();
    setIsServiceLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.post(`${API_URL}/api/sdm/user/services/data`, {
        phone_number: dataForm.phone,
        bundle_id: dataForm.bundleId
      }, { headers });
      
      toast.success(`Data bundle purchased! Reference: ${response.data.reference}`);
      setDataForm({ phone: '', bundleId: '' });
      setActiveService(null);
      fetchUserData();
      fetchServiceData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Purchase failed');
    } finally {
      setIsServiceLoading(false);
    }
  };

  // Pay Bill
  const handlePayBill = async (e) => {
    e.preventDefault();
    setIsServiceLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.post(`${API_URL}/api/sdm/user/services/bill`, {
        provider: billForm.provider,
        account_number: billForm.accountNumber,
        amount: parseFloat(billForm.amount)
      }, { headers });
      
      toast.success(`Bill paid! Token: ${response.data.bill_reference || response.data.reference}`);
      setBillForm({ provider: 'ECG', accountNumber: '', amount: '' });
      setActiveService(null);
      fetchUserData();
      fetchServiceData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Payment failed');
    } finally {
      setIsServiceLoading(false);
    }
  };

  // Withdraw to MoMo (via services)
  const handleServiceWithdraw = async (e) => {
    e.preventDefault();
    setIsServiceLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.post(`${API_URL}/api/sdm/user/services/withdraw`, {
        phone_number: momoForm.phone,
        amount: parseFloat(momoForm.amount),
        network: momoForm.network || null
      }, { headers });
      
      toast.success(`Withdrawal initiated! Net amount: GHS ${response.data.net_amount}`);
      setMomoForm({ phone: '', amount: '', network: '' });
      setActiveService(null);
      fetchUserData();
      fetchServiceData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Withdrawal failed');
    } finally {
      setIsServiceLoading(false);
    }
  };

  // Purchase VIP Card
  const handlePurchaseVIP = async (cardTier) => {
    setIsServiceLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      // Use new endpoint with MoMo payment
      const response = await axios.post(`${API_URL}/api/sdm/user/sdm-vip-cards/buy`, {
        card_tier: cardTier
      }, { headers });
      
      toast.success(response.data.message || 'Payment prompt sent!');
      toast.info('Approve the payment on your MoMo phone to activate your card.');
      
      // Store transaction ID for status polling
      setVipPurchaseTxnId(response.data.transaction_id);
      
      // Start polling for payment status
      pollVipPaymentStatus(response.data.transaction_id);
      
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Purchase failed');
    } finally {
      setIsServiceLoading(false);
    }
  };

  // Poll VIP payment status
  const [vipPurchaseTxnId, setVipPurchaseTxnId] = useState(null);
  
  const pollVipPaymentStatus = async (transactionId) => {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max
    
    const checkStatus = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const response = await axios.get(
          `${API_URL}/api/sdm/user/vip-cards/payment-status/${transactionId}`,
          { headers }
        );
        
        if (response.data.status === 'active') {
          toast.success('🎉 VIP Card activated successfully!');
          if (response.data.referral_bonus > 0) {
            toast.success(`Referral bonus: +GHS ${response.data.referral_bonus}`);
          }
          if (response.data.welcome_bonus > 0) {
            toast.success(`Welcome bonus: +GHS ${response.data.welcome_bonus}`);
          }
          setVipPurchaseTxnId(null);
          setActiveService(null);
          fetchUserData();
          fetchServiceData();
          return;
        } else if (response.data.status === 'payment_failed') {
          toast.error('Payment failed. Please try again.');
          setVipPurchaseTxnId(null);
          return;
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 5000); // Check every 5 seconds
        } else {
          toast.info('Status check expired. Reload the page to see your card.');
          setVipPurchaseTxnId(null);
        }
      } catch (error) {
        console.error('Status check error:', error);
      }
    };
    
    setTimeout(checkStatus, 5000); // Start checking after 5 seconds
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    
    // Validate form before sending OTP
    if (!fullName.trim()) {
      toast.error(t('sdm_name_required') || 'Please enter your full name');
      return;
    }
    if (password.length < 6) {
      toast.error(t('sdm_password_min_6') || 'Password must be at least 6 characters');
      return;
    }
    
    setIsLoading(true);
    try {
      const payload = { phone };
      if (referralCode) {
        payload.referral_code = referralCode;
      }
      const response = await axios.post(`${API_URL}/api/sdm/auth/send-otp`, payload);
      setOtpId(response.data.request_id);
      if (response.data.is_test_account) {
        setDebugOtp('0000');
      }
      if (response.data.ussd_code) {
        setUssdCode(response.data.ussd_code);
      }
      toast.success(t('sdm_otp_sent'));
      setStep('otp');
    } catch (error) {
      toast.error(error.response?.data?.detail || t('sdm_otp_failed') || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-submit OTP when received via Web OTP API
  const handleOTPAutoFill = useCallback(async (autoFilledOtp) => {
    if (autoFilledOtp && autoFilledOtp.length === 4) {
      setOtp(autoFilledOtp);
      toast.info('OTP auto-filled from SMS');
      
      // Small delay to allow state update, then auto-submit
      setTimeout(async () => {
        setIsLoading(true);
        try {
          const response = await axios.post(`${API_URL}/api/sdm/auth/register`, {
            phone,
            full_name: fullName,
            birth_date: birthDate || null,
            password,
            referral_code: referralCode || null,
            otp_code: autoFilledOtp,
            request_id: otpId
          });
          
          localStorage.setItem('sdm_user_token', response.data.access_token);
          setToken(response.data.access_token);
          setUser(response.data.user);
          
          if (response.data.welcome_bonus > 0) {
            toast.success(t('sdm_welcome_bonus_received').replace('{amount}', response.data.welcome_bonus), { duration: 5000 });
          } else {
            toast.success(t('sdm_register_success'));
          }
          setStep('dashboard');
        } catch (error) {
          if (error.response?.data?.detail?.includes('already registered')) {
            try {
              const loginResponse = await axios.post(`${API_URL}/api/sdm/auth/verify-otp`, { 
                phone, 
                otp_code: autoFilledOtp,
                request_id: otpId
              });
              localStorage.setItem('sdm_user_token', loginResponse.data.access_token);
              setToken(loginResponse.data.access_token);
              setUser(loginResponse.data.user);
              toast.success(t('sdm_login_success'));
              setStep('dashboard');
            } catch (verifyError) {
              toast.error(verifyError.response?.data?.detail || t('sdm_invalid_otp'));
            }
          } else {
            toast.error(error.response?.data?.detail || t('sdm_invalid_otp'));
          }
        } finally {
          setIsLoading(false);
        }
      }, 300);
    }
  }, [phone, fullName, birthDate, password, referralCode, otpId, t]);

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // For registration, call the register endpoint directly with OTP
      const response = await axios.post(`${API_URL}/api/sdm/auth/register`, {
        phone,
        full_name: fullName,
        birth_date: birthDate || null,
        password,
        referral_code: referralCode || null,
        otp_code: otp,
        request_id: otpId
      });
      
      localStorage.setItem('sdm_user_token', response.data.access_token);
      setToken(response.data.access_token);
      setUser(response.data.user);
      
      if (response.data.welcome_bonus > 0) {
        toast.success(t('sdm_welcome_bonus_received').replace('{amount}', response.data.welcome_bonus), { duration: 5000 });
      } else {
        toast.success(t('sdm_register_success'));
      }
      setStep('dashboard');
    } catch (error) {
      // If user already exists, try to verify OTP for login
      if (error.response?.data?.detail?.includes('already registered')) {
        try {
          const loginResponse = await axios.post(`${API_URL}/api/sdm/auth/verify-otp`, { 
            phone, 
            otp_code: otp,
            request_id: otpId
          });
          localStorage.setItem('sdm_user_token', loginResponse.data.access_token);
          setToken(loginResponse.data.access_token);
          setUser(loginResponse.data.user);
          toast.success(t('sdm_login_success'));
          setStep('dashboard');
        } catch (verifyError) {
          toast.error(verifyError.response?.data?.detail || t('sdm_invalid_otp'));
        }
      } else {
        toast.error(error.response?.data?.detail || t('sdm_invalid_otp'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    // This function is now deprecated - registration happens in handleVerifyOTP
    e.preventDefault();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/sdm/auth/login`, {
        phone,
        password: loginPassword
      });
      
      localStorage.setItem('sdm_user_token', response.data.access_token);
      setToken(response.data.access_token);
      setUser(response.data.user);
      toast.success(t('sdm_login_success'));
      setStep('dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || t('sdm_invalid_credentials'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/sdm/user/withdraw`,
        {
          amount: parseFloat(withdrawAmount),
          mobile_money_number: withdrawPhone,
          mobile_money_provider: withdrawProvider
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`${t('sdm_withdrawal_submitted')} ${response.data.net_amount}`);
      setWithdrawAmount('');
      setWithdrawPhone('');
      fetchUserData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('sdm_withdrawal_failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sdm_user_token');
    setToken(null);
    setUser(null);
    setStep('welcome');
  };

  const copyQRCode = () => {
    if (user?.qr_code) {
      navigator.clipboard.writeText(user.qr_code);
      toast.success('QR Code copied!');
    }
  };

  const copyReferralLink = () => {
    if (referralData?.referral_code) {
      const link = `${window.location.origin}/sdm/client?ref=${referralData.referral_code}`;
      navigator.clipboard.writeText(link);
      toast.success('Referral link copied!');
    }
  };

  const shareReferral = () => {
    if (referralData?.referral_code && navigator.share) {
      navigator.share({
        title: 'Join SDM',
        text: `Join SDM and get GHS ${referralData.welcome_bonus_amount} welcome bonus! Use my code: ${referralData.referral_code}`,
        url: `${window.location.origin}/sdm/client?ref=${referralData.referral_code}`
      });
    } else {
      copyReferralLink();
    }
  };

  const handlePurchaseMembership = async (cardTypeId) => {
    setIsPurchasing(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/sdm/user/purchase-membership`,
        { card_type_id: cardTypeId, payment_method: 'wallet' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Membership purchased! Welcome bonus: GHS ${response.data.welcome_bonus}`);
      fetchUserData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Purchase failed');
    } finally {
      setIsPurchasing(false);
    }
  };

  const getReferralLevelColor = (level) => {
    switch (level) {
      case 'gold': return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'silver': return 'bg-slate-200 text-slate-700 border-slate-300';
      default: return 'bg-orange-100 text-orange-700 border-orange-300';
    }
  };

  // Login/OTP Screen
  if (step !== 'dashboard') {
    return (
      <div className={`min-h-screen bg-slate-950 flex items-center justify-center px-4 ${isRTL ? 'rtl' : 'ltr'}`} data-testid="sdm-client-login">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px]" />
        </div>
        
        {/* Language Selector - Top Right */}
        <div className="absolute top-4 right-4 z-10">
          <LanguageSelector variant="buttons" />
        </div>

        <div className="relative w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors">
            <ArrowLeft size={18} />
            {t('sdm_back')}
          </Link>

          <div className="text-center mb-8">
            <img src={LOGO_URL} alt="SDM Rewards" className="w-20 h-20 mx-auto mb-4 rounded-2xl object-cover" />
            <h1 className="text-2xl font-bold text-white">SDM Rewards</h1>
            <p className="text-slate-400">Smart Development Membership</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-800">
            
            {/* Welcome Screen - Choose Register or Login */}
            {step === 'welcome' && (
              <div className="space-y-4">
                <p className="text-center text-slate-300 mb-6">{t('sdm_welcome')}</p>
                <Button
                  onClick={() => setStep('register')}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                  data-testid="sdm-register-btn"
                >
                  <User size={18} className="mr-2" />
                  {t('sdm_create_account')}
                </Button>
                <Button
                  onClick={() => setStep('login')}
                  variant="outline"
                  className="w-full h-12 border-slate-600 text-slate-300 hover:bg-slate-800 rounded-xl"
                  data-testid="sdm-login-btn"
                >
                  <Lock size={18} className="mr-2" />
                  {t('sdm_login')}
                </Button>
              </div>
            )}

            {/* Login with phone + password */}
            {step === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <h3 className="text-lg font-semibold text-white text-center mb-4">{t('sdm_connection')}</h3>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {t('sdm_phone_number')}
                  </label>
                  <div className="flex gap-2">
                    <div className="flex items-center px-4 bg-slate-800 rounded-xl text-slate-400">
                      +233
                    </div>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="XX XXX XXXX"
                      className="flex-1 h-12 bg-slate-800/50 border-slate-700 text-white rounded-xl"
                      required
                      data-testid="sdm-login-phone-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {t('sdm_password')}
                  </label>
                  <div className="relative">
                    <Input
                      type={showLoginPassword ? "text" : "password"}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder={t('sdm_your_password')}
                      className="h-12 bg-slate-800/50 border-slate-700 text-white rounded-xl pr-12"
                      required
                      data-testid="sdm-login-password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showLoginPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !phone || !loginPassword}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                  data-testid="sdm-login-submit-btn"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : t('sdm_login')}
                </Button>

                <button
                  type="button"
                  onClick={() => setStep('welcome')}
                  className="w-full mt-2 text-sm text-slate-400 hover:text-white"
                >
                  {t('sdm_back')}
                </button>
              </form>
            )}

            {/* Register - Step 1: Phone + Name + Password → Send OTP */}
            {step === 'register' && (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <h3 className="text-lg font-semibold text-white text-center mb-4">{t('sdm_registration')}</h3>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {t('sdm_full_name')} *
                  </label>
                  <div className="relative">
                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={t('sdm_your_full_name')}
                      className="h-12 bg-slate-800/50 border-slate-700 text-white rounded-xl pl-10"
                      required
                      data-testid="sdm-fullname-input"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <Cake size={14} className="inline mr-1" />
                    {t('sdm_birth_date')}
                  </label>
                  <Input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="h-12 bg-slate-800/50 border-slate-700 text-white rounded-xl"
                    data-testid="sdm-birthdate-input"
                  />
                  <p className="text-xs text-slate-500 mt-1">{t('sdm_birth_date_hint')}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {t('sdm_phone_number')} *
                  </label>
                  <div className="flex gap-2">
                    <div className="flex items-center px-4 bg-slate-800 rounded-xl text-slate-400">
                      +233
                    </div>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="XX XXX XXXX"
                      className="flex-1 h-12 bg-slate-800/50 border-slate-700 text-white rounded-xl"
                      required
                      data-testid="sdm-phone-input"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {t('sdm_password')} *
                  </label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('sdm_min_6_chars')}
                      className="h-12 bg-slate-800/50 border-slate-700 text-white rounded-xl pl-10 pr-12"
                      required
                      minLength={6}
                      data-testid="sdm-password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{t('sdm_min_6_chars')}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {t('sdm_referral_optional')}
                  </label>
                  <Input
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    placeholder="e.g. SDM1A2B3C"
                    className="h-12 bg-slate-800/50 border-slate-700 text-white rounded-xl uppercase"
                    data-testid="sdm-referral-input"
                  />
                  {referralCode && (
                    <p className="text-xs text-emerald-400 mt-1">
                      {t('sdm_get_welcome_bonus')}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !phone || !fullName || password.length < 6}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                  data-testid="sdm-send-otp-btn"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : (
                    <>
                      <Send size={18} className="mr-2" />
                      {t('sdm_send_otp_code')}
                    </>
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => setStep('welcome')}
                  className="w-full mt-2 text-sm text-slate-400 hover:text-white"
                >
                  {t('sdm_back')}
                </button>
              </form>
            )}

            {/* Register - Step 2: OTP Verification → Complete Registration */}
            {step === 'otp' && (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <h3 className="text-lg font-semibold text-white text-center mb-4">{t('sdm_otp_verification')}</h3>
                <p className="text-slate-400 text-sm text-center mb-4">
                  {t('sdm_code_sent_to')} {phone}
                </p>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {t('sdm_otp_code')}
                  </label>
                  <OTPInput
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    onAutoFill={handleOTPAutoFill}
                    length={4}
                    placeholder={t('sdm_enter_4_digit')}
                    disabled={isLoading}
                    testId="sdm-otp-input"
                  />
                </div>
                
                {debugOtp && (
                  <p className="text-xs text-amber-400 text-center mt-6">
                    {t('sdm_test_code')}: <strong>{debugOtp}</strong>
                  </p>
                )}
                
                {ussdCode && !debugOtp && (
                  <div className="bg-slate-800/50 rounded-xl p-4 text-center mt-6">
                    <p className="text-xs text-slate-400 mb-1">
                      {t('sdm_didnt_receive_sms') || "Didn't receive the SMS? Dial this code:"}
                    </p>
                    <p className="text-lg font-bold text-cyan-400">
                      {ussdCode}
                    </p>
                  </div>
                )}
                
                <Button
                  type="submit"
                  disabled={isLoading || otp.length !== 4}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                  data-testid="sdm-verify-otp-btn"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : t('sdm_verify_code')}
                </Button>
                
                <button
                  type="button"
                  onClick={() => setStep('register')}
                  className="w-full mt-2 text-sm text-slate-400 hover:text-white"
                >
                  {t('sdm_change_number')}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Dashboard
  return (
    <div className={`min-h-screen bg-slate-100 ${isRTL ? 'rtl' : 'ltr'}`} data-testid="sdm-client-dashboard">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-4 py-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <img src={LOGO_URL} alt="SDM Rewards" className="w-10 h-10 rounded-full object-cover" />
              <div>
                <p className="text-sm opacity-80">SDM Rewards</p>
                <p className="font-semibold">{user?.full_name || user?.first_name || t('sdm_member')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSelector variant="buttons" className="opacity-90" />
              <button onClick={handleLogout} className="text-sm opacity-80 hover:opacity-100 ml-2">
                {t('sdm_logout')}
              </button>
            </div>
          </div>

          {/* Balance Card */}
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm opacity-80">{t('sdm_my_cashback')}</p>
              {/* Show VIP tier if member, otherwise show referral level */}
              {myVipMembership?.tier ? (
                <span className={`px-2 py-1 text-xs font-medium rounded-full border ${
                  myVipMembership.tier === 'PLATINUM' ? 'bg-gradient-to-r from-slate-700 to-slate-500 text-white border-slate-400' :
                  myVipMembership.tier === 'GOLD' ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-900 border-amber-300' :
                  'bg-gradient-to-r from-slate-300 to-slate-200 text-slate-700 border-slate-400'
                }`}>
                  <Crown size={12} className="inline mr-1" />
                  VIP {myVipMembership.tier}
                </span>
              ) : user?.referral_level && (
                <span className={`px-2 py-1 text-xs font-medium rounded-full border capitalize ${getReferralLevelColor(user.referral_level)}`}>
                  <Award size={12} className="inline mr-1" />
                  {user.referral_level}
                </span>
              )}
            </div>
            <p className="text-4xl font-bold mb-4">
              GHS {wallet?.wallet_available?.toFixed(2) || '0.00'}
            </p>
            <p className="text-sm opacity-70">Available Cashback Balance</p>
            <div className="flex gap-6 text-sm mt-2">
              <div>
                <p className="opacity-60">Total Earned</p>
                <p className="font-semibold">GHS {wallet?.total_earned?.toFixed(2) || '0.00'}</p>
              </div>
            </div>
          </div>
          
          {/* Disclaimer */}
          <p className="text-xs text-center opacity-60 mt-2">
            {t('sdm_disclaimer')}
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex overflow-x-auto">
          {[
            { id: 'wallet', icon: QrCode, label: t('sdm_my_qr') },
            { id: 'services', icon: Smartphone, label: t('sdm_services') },
            { id: 'partners', icon: Store, label: t('sdm_partners') || 'Partners' },
            { id: 'membership', icon: CreditCard, label: t('sdm_cards') },
            { id: 'referral', icon: Gift, label: t('sdm_invite') },
            { id: 'history', icon: History, label: t('sdm_history') },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setActiveService(null); }}
              className={`flex-1 py-4 flex flex-col items-center gap-1 text-sm transition-colors min-w-[70px] ${
                activeTab === tab.id ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'
              }`}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon size={20} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto p-4">
        {activeTab === 'wallet' && user && (
          <div className="space-y-4">
            {/* Pending Cash Payments Alert */}
            {pendingPayments.length > 0 && (
              <div className="bg-amber-50 rounded-2xl p-4 border-2 border-amber-300">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-amber-200 rounded-full flex items-center justify-center">
                    <AlertCircle className="text-amber-700" size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-amber-800">Pending Payment{pendingPayments.length > 1 ? 's' : ''}</p>
                    <p className="text-xs text-amber-600">{pendingPayments.length} payment{pendingPayments.length > 1 ? 's' : ''} awaiting confirmation</p>
                  </div>
                </div>
                
                {pendingPayments.map((payment) => (
                  <div key={payment.id} className="bg-white rounded-xl p-4 mb-3 last:mb-0">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-medium text-slate-900">{payment.merchant_name}</p>
                        <p className="text-2xl font-bold text-slate-900">GHS {payment.amount?.toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-emerald-600 font-semibold">+GHS {payment.cashback_amount?.toFixed(2)}</p>
                        <p className="text-xs text-slate-500">cashback</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleConfirmCashPayment(payment.payment_id, false)}
                        disabled={isLoading}
                        variant="outline"
                        size="sm"
                        className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <X size={16} className="mr-1" />
                        Reject
                      </Button>
                      <Button
                        onClick={() => handleConfirmCashPayment(payment.payment_id, true)}
                        disabled={isLoading}
                        size="sm"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      >
                        {isLoading ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} className="mr-1" />}
                        Confirm
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* QR Code Section */}
            <div className="bg-white rounded-2xl p-6 text-center">
              <h3 className="font-semibold text-slate-900 mb-4">{t('sdm_your_qr')}</h3>
              {user.qr_code_image && (
                <img 
                  src={user.qr_code_image} 
                  alt="QR Code" 
                  className="w-48 h-48 mx-auto mb-4"
                />
              )}
              <p className="text-2xl font-mono font-bold text-blue-600 mb-2">{user.qr_code}</p>
              <p className="text-sm text-slate-500 mb-4">{t('sdm_show_merchant')}</p>
              <div className="flex gap-2 justify-center">
                <Button
                  onClick={copyQRCode}
                  variant="outline"
                  className="gap-2"
                >
                  <Copy size={16} />
                  Copy Code
                </Button>
              </div>
            </div>

            {/* SCAN TO PAY Section - NEW */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-lg">Scan to Pay</h3>
                  <p className="text-sm opacity-80">Scan the merchant's QR code</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <ScanLine size={24} />
                </div>
              </div>
              
              {paymentStep === 'scan' && (
                <Button
                  onClick={() => setShowScanner(true)}
                  className="w-full bg-white text-emerald-600 hover:bg-emerald-50 font-semibold"
                  data-testid="scan-merchant-qr-btn"
                >
                  <Camera size={20} className="mr-2" />
                  Scan Merchant QR
                </Button>
              )}

              {/* Amount Entry Step */}
              {paymentStep === 'amount' && scannedMerchant && (
                <div className="space-y-4">
                  <div className="bg-white/10 rounded-xl p-4">
                    <p className="text-sm opacity-80">Marchand</p>
                    <p className="font-bold text-lg">{scannedMerchant.business_name}</p>
                    <p className="text-sm opacity-80">Cashback: {scannedMerchant.cashback_rate}%</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Montant à payer (GHS)</label>
                    <Input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0.00"
                      className="bg-white text-slate-900 text-lg font-bold h-14"
                      min="1"
                      step="0.01"
                      data-testid="payment-amount-input"
                    />
                  </div>
                  
                  {paymentAmount && parseFloat(paymentAmount) > 0 && (
                    <div className="bg-white/10 rounded-lg p-3 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Montant:</span>
                        <span className="font-medium">GHS {parseFloat(paymentAmount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-200">
                        <span>Cashback ({scannedMerchant.cashback_rate}%):</span>
                        <span className="font-medium">+GHS {(parseFloat(paymentAmount) * scannedMerchant.cashback_rate / 100).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={resetPaymentFlow}
                      variant="outline"
                      className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      Annuler
                    </Button>
                    <Button
                      onClick={handleInitiatePayment}
                      disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || isProcessingPayment}
                      className="flex-1 bg-white text-emerald-600 hover:bg-emerald-50 font-semibold"
                      data-testid="confirm-payment-btn"
                    >
                      {isProcessingPayment ? <Loader2 className="animate-spin" size={18} /> : 'Payer'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Processing Step */}
              {paymentStep === 'processing' && (
                <div className="text-center py-6">
                  <Loader2 className="animate-spin mx-auto mb-4" size={40} />
                  <p className="font-medium">Envoi du prompt de paiement...</p>
                  <p className="text-sm opacity-80">Veuillez patienter</p>
                </div>
              )}

              {/* Success Step */}
              {paymentStep === 'success' && (
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={32} />
                  </div>
                  <p className="font-bold text-lg mb-2">Prompt envoyé!</p>
                  <p className="text-sm opacity-80 mb-4">
                    Approuvez le paiement de GHS {paymentAmount} sur votre téléphone MoMo.
                  </p>
                  <Button
                    onClick={resetPaymentFlow}
                    className="bg-white text-emerald-600 hover:bg-emerald-50"
                  >
                    Nouveau paiement
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PARTNERS TAB */}
        {activeTab === 'partners' && (
          <div className="space-y-4" data-testid="partners-tab">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl p-4 text-white">
              <h3 className="font-bold text-lg">{t('sdm_our_partners') || 'Our Partner Merchants'}</h3>
              <p className="text-sm opacity-80 mt-1">{t('sdm_earn_cashback_at') || 'Earn cashback at these locations'}</p>
            </div>

            {/* Partners List */}
            {partners.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center">
                <Store className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500">{t('sdm_no_partners') || 'No partners available yet'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {partners.map((partner) => (
                  <div 
                    key={partner.id} 
                    onClick={() => { setSelectedPartner(partner); setShowPartnerDetails(true); }}
                    className="bg-white rounded-xl p-4 flex items-center gap-4 border border-slate-100 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                    data-testid={`partner-${partner.id}`}
                  >
                    {/* Partner Logo/Icon */}
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      {partner.logo ? (
                        <img src={partner.logo} alt={partner.name} className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <Store className="w-6 h-6 text-blue-600" />
                      )}
                    </div>

                    {/* Partner Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-900 truncate">{partner.name}</h4>
                      <p className="text-sm text-slate-500">{partner.category}</p>
                      {partner.city && (
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                          <MapPin size={12} />
                          {partner.city}
                        </p>
                      )}
                    </div>

                    {/* Cashback Rate & Arrow */}
                    <div className="text-right flex-shrink-0 flex items-center gap-2">
                      <div>
                        <p className="text-lg font-bold text-emerald-600">
                          {partner.cashback_rate || 5}%
                        </p>
                        <p className="text-xs text-slate-400">Cashback</p>
                      </div>
                      <ChevronRight size={20} className="text-slate-300" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Partner Categories */}
            {partners.length > 0 && (
              <div className="bg-slate-50 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-slate-700 mb-2">{t('sdm_partner_categories') || 'Categories'}</h4>
                <div className="flex flex-wrap gap-2">
                  {[...new Set(partners.map(p => p.category).filter(Boolean))].map((cat) => (
                    <span key={cat} className="px-3 py-1 bg-white text-xs text-slate-600 rounded-full border">
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SUPER APP SERVICES TAB */}
        {activeTab === 'services' && (
          <div className="space-y-4" data-testid="services-tab">
            {/* Check if user has active VIP card */}
            {(() => {
              const hasActiveVip = myVipMembership?.status === 'active' || user?.membership_status === 'active' || user?.vip_tier;
              
              return (
                <>
                  {/* Alert Banner for Inactive Users */}
                  {!hasActiveVip && (
                    <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-4 text-white">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                          <Lock size={20} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg">Inactive Account</h3>
                          <p className="text-sm opacity-90 mt-1">
                            Purchase an SDM VIP Card to unlock all services: Airtime, Data, Bill Pay, and MoMo Withdrawals.
                          </p>
                          <Button
                            onClick={() => setActiveService('vip')}
                            className="mt-3 bg-white text-amber-600 hover:bg-amber-50 font-semibold"
                            size="sm"
                          >
                            <Crown size={16} className="mr-2" />
                            Get My VIP Card
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Service Balance Info - Only show for active VIP */}
                  {hasActiveVip && serviceBalance && (
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-4 text-white">
                      <p className="text-sm opacity-80">Available Cashback Balance</p>
                      <p className="text-2xl font-bold">GHS {serviceBalance.cashback_balance?.toFixed(2) || '0.00'}</p>
                      <div className="flex gap-4 mt-2 text-xs">
                        <span>Monthly Limit: GHS {serviceBalance.monthly_limit}</span>
                        <span>Used: GHS {serviceBalance.monthly_used?.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {/* Service Selection Menu */}
                  {!activeService && (
                    <div className="space-y-3">
                      {/* VIP Card - Always First and Highlighted for Non-VIP */}
                      <button
                        onClick={() => setActiveService('vip')}
                        className={`w-full rounded-xl p-4 flex items-center gap-4 relative ${
                          hasActiveVip 
                            ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white' 
                            : 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white animate-pulse'
                        }`}
                        data-testid="service-vip"
                      >
                        {myVipMembership && (
                          <div className="absolute -top-2 -right-2 bg-white text-amber-600 text-xs px-2 py-0.5 rounded-full font-bold border border-amber-200">
                            {myVipMembership.tier}
                          </div>
                        )}
                        {!hasActiveVip && (
                          <div className="absolute -top-2 -right-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                            REQUIRED
                          </div>
                        )}
                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                          <Crown className="text-white" size={24} />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-bold">{hasActiveVip ? 'SDM VIP Card' : 'Activate My Account'}</p>
                          <p className="text-sm opacity-80">
                            {hasActiveVip 
                              ? (myVipMembership ? `Upgrade vers ${myVipMembership.tier === 'SILVER' ? 'Gold' : 'Platinum'}` : 'Silver, Gold ou Platinum')
                              : 'Purchase a card to unlock services'
                            }
                          </p>
                        </div>
                        <ChevronRight className="text-white/80" size={20} />
                      </button>

                      <h3 className="font-semibold text-slate-900 mt-4">
                        {hasActiveVip ? 'Use My Cashback' : 'Services (VIP Required)'}
                      </h3>
                      
                      {/* Airtime - Locked for non-VIP */}
                      <button
                        onClick={() => hasActiveVip ? setActiveService('airtime') : toast.error('Purchase a VIP card to access this service')}
                        className={`w-full bg-white rounded-xl p-4 flex items-center gap-4 border transition-colors relative ${
                          hasActiveVip 
                            ? 'border-slate-200 hover:border-blue-300 cursor-pointer' 
                            : 'border-slate-100 opacity-60 cursor-not-allowed'
                        }`}
                        data-testid="service-airtime"
                      >
                        {!hasActiveVip && (
                          <div className="absolute -top-2 -right-2 bg-slate-400 text-white text-xs p-1 rounded-full">
                            <Lock size={12} />
                          </div>
                        )}
                        {hasActiveVip && getServicePromo('AIRTIME') && (
                          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                            -{getServicePromo('AIRTIME').discount_percent}%
                          </div>
                        )}
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${hasActiveVip ? 'bg-orange-100' : 'bg-slate-100'}`}>
                          <Phone className={hasActiveVip ? 'text-orange-600' : 'text-slate-400'} size={24} />
                        </div>
                        <div className="flex-1 text-left">
                          <p className={`font-semibold ${hasActiveVip ? 'text-slate-900' : 'text-slate-400'}`}>Buy Airtime</p>
                          <p className="text-sm text-slate-500">Airtime MTN, Vodafone, AirtelTigo</p>
                        </div>
                        {hasActiveVip ? <ChevronRight className="text-slate-400" size={20} /> : <Lock className="text-slate-300" size={20} />}
                      </button>

                      {/* Data Bundle - Locked for non-VIP */}
                      <button
                        onClick={() => hasActiveVip ? setActiveService('data') : toast.error('Purchase a VIP card to access this service')}
                        className={`w-full bg-white rounded-xl p-4 flex items-center gap-4 border transition-colors relative ${
                          hasActiveVip 
                            ? 'border-slate-200 hover:border-blue-300 cursor-pointer' 
                            : 'border-slate-100 opacity-60 cursor-not-allowed'
                        }`}
                        data-testid="service-data"
                      >
                        {!hasActiveVip && (
                          <div className="absolute -top-2 -right-2 bg-slate-400 text-white text-xs p-1 rounded-full">
                            <Lock size={12} />
                          </div>
                        )}
                        {hasActiveVip && getServicePromo('DATA') && (
                          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                            -{getServicePromo('DATA').discount_percent}%
                          </div>
                        )}
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${hasActiveVip ? 'bg-blue-100' : 'bg-slate-100'}`}>
                          <Wifi className={hasActiveVip ? 'text-blue-600' : 'text-slate-400'} size={24} />
                        </div>
                        <div className="flex-1 text-left">
                          <p className={`font-semibold ${hasActiveVip ? 'text-slate-900' : 'text-slate-400'}`}>Data Bundle</p>
                          <p className="text-sm text-slate-500">Data bundles for all networks</p>
                        </div>
                        {hasActiveVip ? <ChevronRight className="text-slate-400" size={20} /> : <Lock className="text-slate-300" size={20} />}
                      </button>

                      {/* Bill Payment - Locked for non-VIP */}
                      <button
                        onClick={() => hasActiveVip ? setActiveService('bill') : toast.error('Purchase a VIP card to access this service')}
                        className={`w-full bg-white rounded-xl p-4 flex items-center gap-4 border transition-colors relative ${
                          hasActiveVip 
                            ? 'border-slate-200 hover:border-blue-300 cursor-pointer' 
                            : 'border-slate-100 opacity-60 cursor-not-allowed'
                        }`}
                        data-testid="service-bill"
                      >
                        {!hasActiveVip && (
                          <div className="absolute -top-2 -right-2 bg-slate-400 text-white text-xs p-1 rounded-full">
                            <Lock size={12} />
                          </div>
                        )}
                        {hasActiveVip && getServicePromo('BILL_PAYMENT') && (
                          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                            -{getServicePromo('BILL_PAYMENT').discount_percent}%
                          </div>
                        )}
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${hasActiveVip ? 'bg-yellow-100' : 'bg-slate-100'}`}>
                          <Zap className={hasActiveVip ? 'text-yellow-600' : 'text-slate-400'} size={24} />
                        </div>
                        <div className="flex-1 text-left">
                          <p className={`font-semibold ${hasActiveVip ? 'text-slate-900' : 'text-slate-400'}`}>Pay a Bill</p>
                          <p className="text-sm text-slate-500">ECG, GWCL, DSTV, GOTV</p>
                        </div>
                        {hasActiveVip ? <ChevronRight className="text-slate-400" size={20} /> : <Lock className="text-slate-300" size={20} />}
                      </button>

                      {/* MoMo Withdrawal - Locked for non-VIP */}
                      <button
                        onClick={() => hasActiveVip ? setActiveService('momo') : toast.error('Purchase a VIP card to access this service')}
                        className={`w-full bg-white rounded-xl p-4 flex items-center gap-4 border transition-colors relative ${
                          hasActiveVip 
                            ? 'border-slate-200 hover:border-blue-300 cursor-pointer' 
                            : 'border-slate-100 opacity-60 cursor-not-allowed'
                        }`}
                        data-testid="service-momo"
                      >
                        {!hasActiveVip && (
                          <div className="absolute -top-2 -right-2 bg-slate-400 text-white text-xs p-1 rounded-full">
                            <Lock size={12} />
                          </div>
                        )}
                        {hasActiveVip && getServicePromo('MOMO_WITHDRAWAL') && (
                          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                            -{getServicePromo('MOMO_WITHDRAWAL').discount_percent}%
                          </div>
                        )}
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${hasActiveVip ? 'bg-green-100' : 'bg-slate-100'}`}>
                          <Banknote className={hasActiveVip ? 'text-green-600' : 'text-slate-400'} size={24} />
                        </div>
                        <div className="flex-1 text-left">
                          <p className={`font-semibold ${hasActiveVip ? 'text-slate-900' : 'text-slate-400'}`}>Mobile Money Withdrawal</p>
                          <p className="text-sm text-slate-500">Withdraw to MTN, Vodafone, AirtelTigo</p>
                        </div>
                        {hasActiveVip ? <ChevronRight className="text-slate-400" size={20} /> : <Lock className="text-slate-300" size={20} />}
                      </button>

                {/* Partenaires SDM */}
                <button
                  onClick={() => setActiveService('partners')}
                  className="w-full bg-white rounded-xl p-4 flex items-center gap-4 border border-slate-200 hover:border-blue-300 transition-colors"
                  data-testid="service-partners"
                >
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                    <MapPin className="text-purple-600" size={24} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-slate-900">Our Partners</p>
                    <p className="text-sm text-slate-500">{partners.length} merchants accept SDM</p>
                  </div>
                  <ChevronRight className="text-slate-400" size={20} />
                </button>

                {/* Lottery VIP */}
                {myVipMembership && (
                  <button
                    onClick={() => setActiveService('lottery')}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-4 flex items-center gap-4 text-white"
                    data-testid="service-lottery"
                  >
                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                      <Ticket className="text-white" size={24} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold">VIP Lottery</p>
                      <p className="text-sm opacity-80">
                        {lotteries?.active_lotteries?.length > 0 
                          ? `${lotteries.active_lotteries.length} active draw(s)`
                          : 'View results'}
                      </p>
                    </div>
                    <ChevronRight className="text-white/80" size={20} />
                  </button>
                )}

                {/* Service History Summary */}
                {serviceHistory.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-slate-700 mb-3">Recent Transactions</h4>
                    <div className="space-y-2">
                      {serviceHistory.slice(0, 3).map((tx) => (
                        <div key={tx.id} className="bg-white rounded-lg p-3 border border-slate-100">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-slate-900">
                                {tx.service_type === 'AIRTIME' && 'Phone Credit'}
                                {tx.service_type === 'DATA' && 'Data Bundle'}
                                {tx.service_type === 'BILL_PAYMENT' && 'Bill Payment'}
                                {tx.service_type === 'MOMO_WITHDRAWAL' && 'MoMo Withdrawal'}
                              </p>
                              <p className="text-xs text-slate-500">{tx.phone_number || tx.bill_account_number}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-slate-900">GHS {tx.amount?.toFixed(2)}</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                tx.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' :
                                tx.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                tx.status === 'REVERSED' ? 'bg-red-100 text-red-700' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {tx.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AIRTIME FORM */}
            {activeService === 'airtime' && (
              <div className="bg-white rounded-2xl p-6" data-testid="airtime-form">
                <button
                  onClick={() => setActiveService(null)}
                  className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-4"
                >
                  <ArrowLeft size={18} />
                  Back
                </button>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                    <Phone className="text-orange-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Buy Airtime</h3>
                    <p className="text-sm text-slate-500">Airtime for all networks</p>
                  </div>
                </div>
                
                <form onSubmit={handleBuyAirtime} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                    <Input
                      type="tel"
                      value={airtimeForm.phone}
                      onChange={(e) => setAirtimeForm({...airtimeForm, phone: e.target.value})}
                      placeholder="024 XXX XXXX"
                      className="h-12"
                      required
                      data-testid="airtime-phone"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Amount (GHS)</label>
                    <Input
                      type="number"
                      value={airtimeForm.amount}
                      onChange={(e) => setAirtimeForm({...airtimeForm, amount: e.target.value})}
                      placeholder="5.00"
                      min="1"
                      step="0.01"
                      className="h-12"
                      required
                      data-testid="airtime-amount"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Network (optional)</label>
                    <select
                      value={airtimeForm.network}
                      onChange={(e) => setAirtimeForm({...airtimeForm, network: e.target.value})}
                      className="w-full h-12 rounded-lg border border-slate-200 px-4"
                      data-testid="airtime-network"
                    >
                      <option value="">Auto-detect</option>
                      <option value="MTN">MTN</option>
                      <option value="VODAFONE">Vodafone</option>
                      <option value="AIRTELTIGO">AirtelTigo</option>
                    </select>
                  </div>

                  {/* Fee Display */}
                  {serviceFees && airtimeForm.amount && parseFloat(airtimeForm.amount) > 0 && (
                    <div className="bg-slate-50 rounded-lg p-3 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Montant:</span>
                        <span className="font-medium">GHS {parseFloat(airtimeForm.amount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Frais SDM ({serviceFees.airtime_fee_percent}%):</span>
                        <span className="font-medium text-orange-600">GHS {(parseFloat(airtimeForm.amount) * serviceFees.airtime_fee_percent / 100).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold border-t pt-1">
                        <span>Total à déduire:</span>
                        <span className="text-slate-900">GHS {(parseFloat(airtimeForm.amount) * (1 + serviceFees.airtime_fee_percent / 100)).toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {serviceBalance && airtimeForm.amount && 
                    (parseFloat(airtimeForm.amount) * (1 + (serviceFees?.airtime_fee_percent || 0) / 100)) > serviceBalance.cashback_balance && (
                    <div className="flex items-center gap-2 text-amber-600 text-sm bg-amber-50 p-3 rounded-lg">
                      <AlertCircle size={16} />
                      Solde insuffisant
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isServiceLoading || !airtimeForm.phone || !airtimeForm.amount}
                    className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white"
                    data-testid="airtime-submit"
                  >
                    {isServiceLoading ? <Loader2 className="animate-spin" /> : 'Buy Airtime'}
                  </Button>
                </form>
              </div>
            )}

            {/* DATA BUNDLE FORM */}
            {activeService === 'data' && (
              <div className="bg-white rounded-2xl p-6" data-testid="data-form">
                <button
                  onClick={() => setActiveService(null)}
                  className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-4"
                >
                  <ArrowLeft size={18} />
                  Back
                </button>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Wifi className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Data Bundle</h3>
                    <p className="text-sm text-slate-500">Choose your data bundle</p>
                  </div>
                </div>
                
                <form onSubmit={handleBuyData} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                    <Input
                      type="tel"
                      value={dataForm.phone}
                      onChange={(e) => setDataForm({...dataForm, phone: e.target.value})}
                      placeholder="024 XXX XXXX"
                      className="h-12"
                      required
                      data-testid="data-phone"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Select a bundle</label>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {dataBundles.map((bundle) => (
                        <label
                          key={bundle.id}
                          className={`block p-3 rounded-lg border cursor-pointer transition-colors ${
                            dataForm.bundleId === bundle.id 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="bundle"
                            value={bundle.id}
                            checked={dataForm.bundleId === bundle.id}
                            onChange={(e) => setDataForm({...dataForm, bundleId: e.target.value})}
                            className="sr-only"
                          />
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-slate-900">{bundle.name}</p>
                              <p className="text-xs text-slate-500">{bundle.data_amount} • {bundle.validity}</p>
                            </div>
                            <span className="font-bold text-blue-600">GHS {bundle.price}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isServiceLoading || !dataForm.phone || !dataForm.bundleId}
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white"
                    data-testid="data-submit"
                  >
                    {isServiceLoading ? <Loader2 className="animate-spin" /> : 'Buy Data Bundle'}
                  </Button>
                </form>
              </div>
            )}

            {/* BILL PAYMENT FORM */}
            {activeService === 'bill' && (
              <div className="bg-white rounded-2xl p-6" data-testid="bill-form">
                <button
                  onClick={() => setActiveService(null)}
                  className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-4"
                >
                  <ArrowLeft size={18} />
                  Back
                </button>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                    <Zap className="text-yellow-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Pay a Bill</h3>
                    <p className="text-sm text-slate-500">Electricity, water, TV</p>
                  </div>
                </div>
                
                <form onSubmit={handlePayBill} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Provider</label>
                    <select
                      value={billForm.provider}
                      onChange={(e) => setBillForm({...billForm, provider: e.target.value})}
                      className="w-full h-12 rounded-lg border border-slate-200 px-4"
                      data-testid="bill-provider"
                    >
                      <option value="ECG">ECG - Electricity</option>
                      <option value="GWCL">GWCL - Water</option>
                      <option value="DSTV">DSTV</option>
                      <option value="GOTV">GOTV</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Account Number / Meter</label>
                    <Input
                      type="text"
                      value={billForm.accountNumber}
                      onChange={(e) => setBillForm({...billForm, accountNumber: e.target.value})}
                      placeholder="123456789"
                      className="h-12"
                      required
                      data-testid="bill-account"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Amount (GHS)</label>
                    <Input
                      type="number"
                      value={billForm.amount}
                      onChange={(e) => setBillForm({...billForm, amount: e.target.value})}
                      placeholder="50.00"
                      min="1"
                      step="0.01"
                      className="h-12"
                      required
                      data-testid="bill-amount"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isServiceLoading || !billForm.accountNumber || !billForm.amount}
                    className="w-full h-12 bg-yellow-500 hover:bg-yellow-600 text-white"
                    data-testid="bill-submit"
                  >
                    {isServiceLoading ? <Loader2 className="animate-spin" /> : 'Pay Bill'}
                  </Button>
                </form>
              </div>
            )}

            {/* MOMO WITHDRAWAL FORM */}
            {activeService === 'momo' && (
              <div className="bg-white rounded-2xl p-6" data-testid="momo-form">
                <button
                  onClick={() => setActiveService(null)}
                  className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-4"
                >
                  <ArrowLeft size={18} />
                  Back
                </button>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                    <Banknote className="text-green-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Mobile Money Withdrawal</h3>
                    <p className="text-sm text-slate-500">Withdraw to your MoMo</p>
                  </div>
                </div>
                
                <form onSubmit={handleServiceWithdraw} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Money Number</label>
                    <Input
                      type="tel"
                      value={momoForm.phone}
                      onChange={(e) => setMomoForm({...momoForm, phone: e.target.value})}
                      placeholder="024 XXX XXXX"
                      className="h-12"
                      required
                      data-testid="momo-phone"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Amount (GHS)</label>
                    <Input
                      type="number"
                      value={momoForm.amount}
                      onChange={(e) => setMomoForm({...momoForm, amount: e.target.value})}
                      placeholder="10.00"
                      min="2"
                      step="0.01"
                      className="h-12"
                      required
                      data-testid="momo-amount"
                    />
                  </div>

                  {/* Dynamic Fee Display */}
                  {serviceFees && momoForm.amount && parseFloat(momoForm.amount) > 0 && (
                    <div className="bg-slate-50 rounded-lg p-3 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Montant:</span>
                        <span className="font-medium">GHS {parseFloat(momoForm.amount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Frais % ({serviceFees.momo_withdraw_fee_percent}%):</span>
                        <span className="font-medium text-red-500">- GHS {(parseFloat(momoForm.amount) * serviceFees.momo_withdraw_fee_percent / 100).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Frais fixe:</span>
                        <span className="font-medium text-red-500">- GHS {serviceFees.momo_withdraw_fee_flat?.toFixed(2) || '1.00'}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold border-t pt-1">
                        <span>Vous recevrez:</span>
                        <span className="text-green-600">GHS {Math.max(0, parseFloat(momoForm.amount) - (parseFloat(momoForm.amount) * serviceFees.momo_withdraw_fee_percent / 100) - (serviceFees.momo_withdraw_fee_flat || 1)).toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Network (optional)</label>
                    <select
                      value={momoForm.network}
                      onChange={(e) => setMomoForm({...momoForm, network: e.target.value})}
                      className="w-full h-12 rounded-lg border border-slate-200 px-4"
                      data-testid="momo-network"
                    >
                      <option value="">Auto-detect</option>
                      <option value="MTN">MTN MoMo</option>
                      <option value="VODAFONE">Vodafone Cash</option>
                      <option value="AIRTELTIGO">AirtelTigo Money</option>
                    </select>
                  </div>

                  <Button
                    type="submit"
                    disabled={isServiceLoading || !momoForm.phone || !momoForm.amount}
                    className="w-full h-12 bg-green-600 hover:bg-green-700 text-white"
                    data-testid="momo-submit"
                  >
                    {isServiceLoading ? <Loader2 className="animate-spin" /> : 'Withdraw'}
                  </Button>
                </form>
              </div>
            )}

            {/* VIP CARDS VIEW */}
            {activeService === 'vip' && (
              <div className="bg-white rounded-2xl p-6" data-testid="vip-form">
                <button
                  onClick={() => setActiveService(null)}
                  className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-4"
                >
                  <ArrowLeft size={18} />
                  Back
                </button>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                    <Crown className="text-amber-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">SDM VIP Cards</h3>
                    <p className="text-sm text-slate-500">
                      {myVipMembership ? `You are ${myVipMembership.tier}` : 'Join the VIP community'}
                    </p>
                  </div>
                </div>

                {/* Current Membership Status */}
                {myVipMembership && (
                  <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200">
                    <div className="flex items-center gap-3">
                      <Crown className="text-amber-600" size={32} />
                      <div>
                        <p className="font-bold text-amber-900">{myVipMembership.card_name}</p>
                        <p className="text-sm text-amber-700">N° {myVipMembership.card_number}</p>
                        <p className="text-xs text-amber-600">
                          Expires: {new Date(myVipMembership.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* VIP Cards List */}
                <div className="space-y-4">
                  {vipCards.filter(card => card.id !== 'bronze').map((card) => {
                    const tierOrder = { silver: 1, gold: 2, platinum: 3 };
                    const currentTierName = myVipMembership?.tier?.toLowerCase();
                    const currentTierLevel = tierOrder[currentTierName] || 0;
                    const cardTierLevel = tierOrder[card.id] || 0;
                    const canPurchase = cardTierLevel > currentTierLevel;
                    const isCurrentTier = currentTierName === card.id;
                    const priceToShow = canPurchase && myVipMembership 
                      ? card.price - (vipCards.find(c => c.id === currentTierName)?.price || 0)
                      : card.price;

                    return (
                      <div 
                        key={card.id}
                        className={`rounded-xl border-2 overflow-hidden ${
                          isCurrentTier 
                            ? 'border-amber-400 bg-amber-50' 
                            : canPurchase 
                              ? 'border-slate-200 hover:border-blue-300' 
                              : 'border-slate-100 bg-slate-50 opacity-60'
                        }`}
                      >
                        <div 
                          className="p-4"
                          style={{ 
                            background: isCurrentTier 
                              ? `linear-gradient(135deg, ${card.badge_color}33, ${card.badge_color}11)` 
                              : undefined 
                          }}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-10 h-10 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: card.badge_color }}
                              >
                                <Crown className="text-white" size={20} />
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{card.name}</p>
                                <p className="text-xs text-slate-500">{card.description}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              {canPurchase && myVipMembership ? (
                                <>
                                  <p className="text-lg font-bold text-emerald-600">+GHS {priceToShow}</p>
                                  <p className="text-xs text-slate-500">Upgrade</p>
                                </>
                              ) : (
                                <p className="text-lg font-bold text-slate-900">GHS {card.price}</p>
                              )}
                            </div>
                          </div>

                          {/* Benefits */}
                          <div className="space-y-1 mb-4">
                            {card.benefits_list?.slice(0, 4).map((benefit, i) => (
                              <p key={i} className="text-xs text-slate-600 flex items-start gap-2">
                                <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={12} />
                                {benefit}
                              </p>
                            ))}
                            {card.benefits_list?.length > 4 && (
                              <p className="text-xs text-blue-600">+{card.benefits_list.length - 4} more benefits</p>
                            )}
                          </div>

                          {/* Action Button */}
                          {isCurrentTier ? (
                            <div className="text-center py-2 bg-amber-200 rounded-lg text-amber-800 font-medium text-sm">
                              Your current card
                            </div>
                          ) : canPurchase ? (
                            <Button
                              onClick={() => handlePurchaseVIP(card.id)}
                              disabled={isServiceLoading}
                              className="w-full"
                              style={{ backgroundColor: card.badge_color === '#C0C0C0' ? '#6B7280' : card.badge_color }}
                            >
                              {isServiceLoading ? <Loader2 className="animate-spin" /> : (
                                myVipMembership ? `Upgrade for GHS ${priceToShow}` : `Buy for GHS ${card.price}`
                              )}
                            </Button>
                          ) : (
                            <div className="text-center py-2 bg-slate-200 rounded-lg text-slate-500 font-medium text-sm">
                              Not available
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs text-center text-slate-500 mt-4">
                  Payment via MoMo - You will receive a payment prompt on your phone
                </p>
              </div>
            )}

            {/* PARTNERS LIST VIEW */}
            {activeService === 'partners' && (
              <div className="bg-white rounded-2xl p-6" data-testid="partners-view">
                <button
                  onClick={() => setActiveService(null)}
                  className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-4"
                >
                  <ArrowLeft size={18} />
                  Back
                </button>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                    <MapPin className="text-purple-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Our Partners</h3>
                    <p className="text-sm text-slate-500">{partners.length} merchants accept SDM</p>
                  </div>
                </div>

                {partners.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Store size={48} className="mx-auto mb-3 opacity-40" />
                    <p>Partner list coming soon</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {partners.map((partner) => (
                      <div 
                        key={partner.id}
                        className={`p-4 rounded-xl border ${
                          partner.is_gold_exclusive 
                            ? 'border-amber-200 bg-amber-50' 
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                            <Store className="text-slate-600" size={20} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-slate-900">{partner.name}</p>
                              {partner.is_gold_exclusive && (
                                <span className="text-xs px-2 py-0.5 bg-amber-200 text-amber-800 rounded-full">
                                  Gold+
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500">{partner.category}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              <MapPin size={12} className="inline mr-1" />
                              {partner.address}, {partner.city}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-emerald-600 font-bold">{partner.cashback_rate}%</p>
                            <p className="text-xs text-slate-500">cashback</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* LOTTERY VIEW */}
            {activeService === 'lottery' && (
              <div className="bg-white rounded-2xl p-6" data-testid="lottery-view">
                <button
                  onClick={() => setActiveService(null)}
                  className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-4"
                >
                  <ArrowLeft size={18} />
                  Back
                </button>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                    <Ticket className="text-purple-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">VIP Lottery</h3>
                    <p className="text-sm text-slate-500">
                      Your chances: x{myVipMembership?.tier === 'PLATINUM' ? 3 : myVipMembership?.tier === 'GOLD' ? 2 : 1}
                    </p>
                  </div>
                </div>

                {/* Active Lotteries */}
                {lotteries?.active_lotteries?.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-slate-700 mb-3">Active Draws</h4>
                    <div className="space-y-3">
                      {lotteries.active_lotteries.map((lottery) => {
                        const myEntry = lotteries.my_participations?.[lottery.id];
                        return (
                          <div key={lottery.id} className="p-4 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-bold text-purple-900">{lottery.name}</h5>
                              <span className="text-lg font-bold text-purple-600">GHS {lottery.total_prize_pool?.toFixed(0)}</span>
                            </div>
                            <p className="text-xs text-purple-700 mb-2">{lottery.description}</p>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-purple-600">
                                Ends: {new Date(lottery.end_date).toLocaleDateString()}
                              </span>
                              {myEntry ? (
                                <span className="px-2 py-1 bg-purple-200 text-purple-800 rounded-full">
                                  Enrolled ({myEntry.entries} entries)
                                </span>
                              ) : (
                                <span className="px-2 py-1 bg-amber-200 text-amber-800 rounded-full">
                                  Not enrolled
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Past Results */}
                {lotteries?.completed_lotteries?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-3">Past Results</h4>
                    <div className="space-y-3">
                      {lotteries.completed_lotteries.map((lottery) => {
                        const myEntry = lotteries.my_participations?.[lottery.id];
                        return (
                          <div key={lottery.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-semibold text-slate-900">{lottery.name}</h5>
                              <span className="text-emerald-600 font-bold">GHS {lottery.total_prize_pool?.toFixed(0)}</span>
                            </div>
                            {lottery.winners?.length > 0 && (
                              <div className="space-y-1">
                                {lottery.winners.slice(0, 3).map((w, i) => (
                                  <div key={i} className="flex items-center justify-between text-sm">
                                    <span className="flex items-center gap-1">
                                      {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                                      <span className={myEntry?.user_id === w.user_id ? 'font-bold text-emerald-600' : 'text-slate-600'}>
                                        {myEntry?.user_id === w.user_id ? 'You!' : w.name}
                                      </span>
                                    </span>
                                    <span className="font-medium">GHS {w.prize_amount?.toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {(!lotteries?.active_lotteries?.length && !lotteries?.completed_lotteries?.length) && (
                  <div className="text-center py-8 text-slate-500">
                    <Ticket size={48} className="mx-auto mb-3 opacity-40" />
                    <p>Aucun tirage pour le moment</p>
                    <p className="text-xs mt-1">Revenez bientôt!</p>
                  </div>
                )}
              </div>
            )}
                </>
              );
            })()}
          </div>
        )}

        {activeTab === 'membership' && (
          <div className="space-y-4">
            {/* KYC Verification Section */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    kycStatus?.kyc_level >= 3 ? 'bg-emerald-100' :
                    kycStatus?.kyc_status === 'pending' ? 'bg-amber-100' :
                    kycStatus?.kyc_status === 'rejected' ? 'bg-red-100' :
                    'bg-slate-100'
                  }`}>
                    <Shield className={`${
                      kycStatus?.kyc_level >= 3 ? 'text-emerald-600' :
                      kycStatus?.kyc_status === 'pending' ? 'text-amber-600' :
                      kycStatus?.kyc_status === 'rejected' ? 'text-red-600' :
                      'text-slate-400'
                    }`} size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">KYC Verification</h3>
                    <p className="text-sm text-slate-500">
                      {kycStatus?.kyc_level >= 3 ? 'Fully Verified' :
                       kycStatus?.kyc_status === 'pending' ? 'Awaiting Review' :
                       kycStatus?.kyc_status === 'rejected' ? 'Rejected - Please Resubmit' :
                       'Verify your identity'}
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                  kycStatus?.kyc_level >= 3 ? 'bg-emerald-100 text-emerald-700' :
                  kycStatus?.kyc_status === 'pending' ? 'bg-amber-100 text-amber-700' :
                  kycStatus?.kyc_status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  Level {kycStatus?.kyc_level || 0}
                </span>
              </div>
              
              {/* KYC Limits Info */}
              {kycStatus?.limits && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-slate-50 rounded-lg p-2 text-center">
                    <p className="text-xs text-slate-500">Daily Limit</p>
                    <p className="font-semibold text-slate-900">GHS {kycStatus.limits.daily_transaction}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2 text-center">
                    <p className="text-xs text-slate-500">Monthly Limit</p>
                    <p className="font-semibold text-slate-900">GHS {kycStatus.limits.monthly_transaction}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2 text-center">
                    <p className="text-xs text-slate-500">Withdrawal</p>
                    <p className="font-semibold text-slate-900">GHS {kycStatus.limits.withdrawal}</p>
                  </div>
                </div>
              )}
              
              {/* Rejection reason */}
              {kycStatus?.kyc_status === 'rejected' && kycStatus?.kyc_rejection_reason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-red-700">
                    <strong>Reason:</strong> {kycStatus.kyc_rejection_reason}
                  </p>
                </div>
              )}
              
              {/* Action Button */}
              {kycStatus?.kyc_level < 3 && kycStatus?.kyc_status !== 'pending' && (
                <Button
                  onClick={() => setShowKycForm(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <UserCheck size={16} className="mr-2" />
                  {kycStatus?.kyc_status === 'rejected' ? 'Resubmit Documents' : 'Start Verification'}
                </Button>
              )}
              
              {kycStatus?.kyc_status === 'pending' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                  <Clock className="mx-auto mb-2 text-amber-600" size={24} />
                  <p className="text-sm text-amber-700">Your documents are being reviewed. This usually takes 24-48 hours.</p>
                </div>
              )}
              
              {kycStatus?.kyc_level >= 3 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                  <CheckCircle className="mx-auto mb-2 text-emerald-600" size={24} />
                  <p className="text-sm text-emerald-700">Your identity is verified! You have access to higher limits.</p>
                </div>
              )}
            </div>

            {/* KYC Form Modal */}
            {showKycForm && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="font-bold text-lg">KYC Verification</h3>
                    <button onClick={() => setShowKycForm(false)} className="p-2 hover:bg-slate-100 rounded-full">
                      <X size={20} />
                    </button>
                  </div>
                  
                  <form onSubmit={handleSubmitKyc} className="p-4 space-y-4">
                    {/* Document Type */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Document Type</label>
                      <select
                        value={kycForm.documentType}
                        onChange={(e) => setKycForm({...kycForm, documentType: e.target.value})}
                        className="w-full p-3 border border-slate-200 rounded-lg"
                        required
                      >
                        <option value="GHANA_CARD">Ghana Card</option>
                        <option value="VOTER_ID">Voter ID</option>
                        <option value="PASSPORT">Passport</option>
                        <option value="DRIVER_LICENSE">Driver's License</option>
                      </select>
                    </div>
                    
                    {/* Document Number */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Document Number</label>
                      <Input
                        value={kycForm.documentNumber}
                        onChange={(e) => setKycForm({...kycForm, documentNumber: e.target.value})}
                        placeholder="GHA-XXXXXXXXX-X"
                        required
                      />
                    </div>
                    
                    {/* Full Name */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Full Name (as on document)</label>
                      <Input
                        value={kycForm.fullName}
                        onChange={(e) => setKycForm({...kycForm, fullName: e.target.value})}
                        placeholder="John Doe"
                        required
                      />
                    </div>
                    
                    {/* Date of Birth */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Date of Birth</label>
                      <Input
                        type="date"
                        value={kycForm.dateOfBirth}
                        onChange={(e) => setKycForm({...kycForm, dateOfBirth: e.target.value})}
                      />
                    </div>
                    
                    {/* Upload Document Front */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Document Front</label>
                      <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setKycUploads({...kycUploads, front: e.target.files[0]})}
                          className="hidden"
                          id="doc-front"
                        />
                        <label htmlFor="doc-front" className="cursor-pointer">
                          {kycUploads.front ? (
                            <div className="flex items-center justify-center gap-2 text-emerald-600">
                              <CheckCircle size={20} />
                              <span>{kycUploads.front.name}</span>
                            </div>
                          ) : (
                            <div className="text-slate-500">
                              <Upload className="mx-auto mb-2" size={24} />
                              <p className="text-sm">Click to upload front of document</p>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>
                    
                    {/* Upload Document Back (if needed) */}
                    {kycForm.documentType !== 'PASSPORT' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Document Back</label>
                        <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setKycUploads({...kycUploads, back: e.target.files[0]})}
                            className="hidden"
                            id="doc-back"
                          />
                          <label htmlFor="doc-back" className="cursor-pointer">
                            {kycUploads.back ? (
                              <div className="flex items-center justify-center gap-2 text-emerald-600">
                                <CheckCircle size={20} />
                                <span>{kycUploads.back.name}</span>
                              </div>
                            ) : (
                              <div className="text-slate-500">
                                <Upload className="mx-auto mb-2" size={24} />
                                <p className="text-sm">Click to upload back of document</p>
                              </div>
                            )}
                          </label>
                        </div>
                      </div>
                    )}
                    
                    {/* Selfie Upload */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Selfie (Face Verification)</label>
                      <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center">
                        <input
                          type="file"
                          accept="image/*"
                          capture="user"
                          onChange={(e) => setKycUploads({...kycUploads, selfie: e.target.files[0]})}
                          className="hidden"
                          id="selfie"
                        />
                        <label htmlFor="selfie" className="cursor-pointer">
                          {kycUploads.selfie ? (
                            <div className="flex items-center justify-center gap-2 text-emerald-600">
                              <CheckCircle size={20} />
                              <span>{kycUploads.selfie.name}</span>
                            </div>
                          ) : (
                            <div className="text-slate-500">
                              <Camera className="mx-auto mb-2" size={24} />
                              <p className="text-sm">Take a selfie or upload photo</p>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>
                    
                    <Button
                      type="submit"
                      disabled={isSubmittingKyc || !kycUploads.front || !kycUploads.selfie}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isSubmittingKyc ? (
                        <Loader2 className="animate-spin mr-2" size={16} />
                      ) : (
                        <Shield className="mr-2" size={16} />
                      )}
                      Submit for Verification
                    </Button>
                  </form>
                </div>
              </div>
            )}

            {/* Contacts Section */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Contact className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">SDM Contacts</h3>
                    <p className="text-sm text-slate-500">
                      {syncedContacts.length > 0 
                        ? `${syncedContacts.length} contacts on SDM`
                        : 'Find friends on SDM'}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleSyncContacts}
                  disabled={isSyncingContacts}
                  variant="outline"
                  size="sm"
                >
                  {isSyncingContacts ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <>
                      <RefreshCw size={14} className="mr-1" />
                      Sync
                    </>
                  )}
                </Button>
              </div>
              
              {/* Synced Contacts List */}
              {syncedContacts.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {syncedContacts.map((contact) => (
                    <div key={contact.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="text-blue-600" size={18} />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{contact.name}</p>
                          <p className="text-xs text-slate-500">{contact.phone}</p>
                        </div>
                        {contact.vip_tier && (
                          <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                            {contact.vip_tier}
                          </span>
                        )}
                      </div>
                      <Button
                        onClick={() => setShowContactPayment(contact)}
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Send size={14} className="mr-1" />
                        Pay
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500">
                  <Users className="mx-auto mb-2 opacity-30" size={32} />
                  <p className="text-sm">No contacts synced yet</p>
                  <p className="text-xs mt-1">Click "Sync" to find friends on SDM</p>
                </div>
              )}
            </div>

            {/* Contact Payment Modal */}
            {showContactPayment && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl max-w-sm w-full p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg">Send to {showContactPayment.name}</h3>
                    <button onClick={() => setShowContactPayment(null)} className="p-2 hover:bg-slate-100 rounded-full">
                      <X size={20} />
                    </button>
                  </div>
                  
                  <div className="text-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
                      <User className="text-blue-600" size={28} />
                    </div>
                    <p className="text-slate-500">{showContactPayment.phone}</p>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Amount (GHS)</label>
                    <Input
                      type="number"
                      value={contactPaymentAmount}
                      onChange={(e) => setContactPaymentAmount(e.target.value)}
                      placeholder="0.00"
                      min="1"
                      step="0.01"
                    />
                    <p className="text-xs text-slate-500 mt-1">Available: GHS {wallet?.wallet_available?.toFixed(2) || '0.00'}</p>
                  </div>
                  
                  <Button
                    onClick={() => handlePayContact(showContactPayment)}
                    disabled={!contactPaymentAmount || parseFloat(contactPaymentAmount) > (wallet?.wallet_available || 0)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Send size={16} className="mr-2" />
                    Send GHS {contactPaymentAmount || '0.00'}
                  </Button>
                </div>
              </div>
            )}

            {/* My Memberships */}
            {userMemberships.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900">My Membership Cards</h3>
                {userMemberships.map((card) => (
                  <div 
                    key={card.id} 
                    className={`bg-gradient-to-br ${
                      card.status === 'active' 
                        ? 'from-blue-600 to-cyan-500' 
                        : 'from-slate-400 to-slate-500'
                    } rounded-2xl p-5 text-white`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Store size={18} />
                        <span className="font-semibold">{card.merchant_name}</span>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        card.status === 'active' ? 'bg-white/20' : 'bg-red-500/50'
                      }`}>
                        {card.status}
                      </span>
                    </div>
                    <p className="text-lg font-bold mb-1">{card.card_type_name}</p>
                    <p className="text-xs opacity-70 font-mono mb-3">{card.card_number}</p>
                    <div className="flex justify-between text-xs opacity-80">
                      <span>Purchased: {new Date(card.purchased_at).toLocaleDateString()}</span>
                      <span>Expires: {new Date(card.expires_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Available Cards */}
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900">
                {userMemberships.length > 0 ? 'More Cards Available' : 'Available Membership Cards'}
              </h3>
              
              {availableCards.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center text-slate-500">
                  <CreditCard size={40} className="mx-auto mb-3 opacity-30" />
                  <p>No membership cards available yet</p>
                  <p className="text-xs mt-2">Merchants will create cards soon!</p>
                </div>
              ) : (
                availableCards
                  .filter(card => !userMemberships.some(m => m.merchant_id === card.merchant_id && m.status === 'active'))
                  .map((card) => (
                    <div key={card.id} className="bg-white rounded-2xl p-5 border border-slate-200">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Store size={16} className="text-slate-400" />
                            <span className="text-sm text-slate-600">{card.merchant_name}</span>
                          </div>
                          <h4 className="font-bold text-slate-900 text-lg">{card.name}</h4>
                          {card.description && (
                            <p className="text-sm text-slate-500 mt-1">{card.description}</p>
                          )}
                        </div>
                        <span className="text-2xl font-bold text-blue-600">GHS {card.price}</span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="bg-slate-50 rounded-lg p-2 text-center">
                          <p className="text-xs text-slate-500">Validity</p>
                          <p className="font-semibold text-slate-900">{card.validity_days}d</p>
                        </div>
                        <div className="bg-emerald-50 rounded-lg p-2 text-center">
                          <p className="text-xs text-emerald-600">Welcome</p>
                          <p className="font-semibold text-emerald-700">+GHS {card.welcome_bonus}</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-2 text-center">
                          <p className="text-xs text-blue-600">Referral</p>
                          <p className="font-semibold text-blue-700">+GHS {card.referral_bonus}</p>
                        </div>
                      </div>
                      
                      <Button
                        onClick={() => handlePurchaseMembership(card.id)}
                        disabled={isPurchasing || wallet?.wallet_available < card.price}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {isPurchasing ? (
                          <Loader2 className="animate-spin" size={18} />
                        ) : wallet?.wallet_available < card.price ? (
                          'Insufficient Balance'
                        ) : (
                          <>
                            <CreditCard size={16} className="mr-2" />
                            Purchase Card
                          </>
                        )}
                      </Button>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'referral' && (
          <div className="space-y-4">
            {!referralData ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
            <>
            {/* Referral Card */}
            <div className="bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl p-6 text-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Gift size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Invite Friends</h3>
                  <p className="text-sm opacity-80">Earn GHS 3 per friend who buys a card</p>
                </div>
              </div>
              
              <div className="bg-white/10 rounded-xl p-4 mb-4">
                <p className="text-xs opacity-70 mb-1">Your Referral Code</p>
                <p className="text-2xl font-mono font-bold">{referralData.referral_code}</p>
              </div>
              
              {/* QR Code Section */}
              <div className="mb-4">
                <button
                  onClick={() => setShowReferralQR(!showReferralQR)}
                  className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-all flex items-center justify-center gap-2"
                >
                  <QrCode size={18} />
                  {showReferralQR ? 'Hide QR Code' : 'Show QR Code'}
                </button>
                
                {showReferralQR && (
                  <div className="mt-4 bg-white rounded-xl p-4 flex flex-col items-center">
                    <QRCodeSVG 
                      value={`${window.location.origin}/sdm/client?ref=${referralData.referral_code}`}
                      size={180}
                      level="H"
                      includeMargin={true}
                      imageSettings={{
                        src: LOGO_URL,
                        height: 30,
                        width: 30,
                        excavate: true,
                      }}
                    />
                    <p className="text-xs text-slate-500 mt-2 text-center">
                      Scan this QR code to join SDM with your referral code
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={copyReferralLink}
                  className="flex-1 bg-white/20 hover:bg-white/30 text-white"
                >
                  <Copy size={16} className="mr-2" />
                  Copy Link
                </Button>
                <Button
                  onClick={shareReferral}
                  className="flex-1 bg-white text-blue-600 hover:bg-white/90"
                >
                  <Share2 size={16} className="mr-2" />
                  Share
                </Button>
              </div>
            </div>

            {/* Period Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {['all', 'day', 'week', 'month', 'year'].map((p) => (
                <button
                  key={p}
                  onClick={() => setReferralPeriod(p)}
                  className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all ${
                    referralPeriod === p 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {p === 'all' ? 'All Time' : p === 'day' ? 'Today' : p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'This Year'}
                </button>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl p-4 text-center">
                <Users size={20} className="mx-auto mb-2 text-blue-600" />
                <p className="text-xl font-bold text-slate-900">{referralData.stats?.total_referrals || 0}</p>
                <p className="text-xs text-slate-500">Total</p>
              </div>
              <div className="bg-white rounded-xl p-4 text-center">
                <CheckCircle size={20} className="mx-auto mb-2 text-emerald-600" />
                <p className="text-xl font-bold text-emerald-600">{referralData.stats?.active_referrals || 0}</p>
                <p className="text-xs text-slate-500">Active</p>
              </div>
              <div className="bg-white rounded-xl p-4 text-center">
                <Clock size={20} className="mx-auto mb-2 text-amber-600" />
                <p className="text-xl font-bold text-amber-600">{referralData.stats?.pending_referrals || 0}</p>
                <p className="text-xs text-slate-500">Pending</p>
              </div>
            </div>
            
            {/* Total Bonus */}
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">Total Bonus Earned</p>
                  <p className="text-2xl font-bold">GHS {(referralData.stats?.total_bonus_earned || 0).toFixed(2)}</p>
                </div>
                <DollarSign size={32} className="opacity-50" />
              </div>
            </div>

            {/* How it works */}
            <div className="bg-white rounded-2xl p-6">
              <h3 className="font-semibold text-slate-900 mb-4">How it works</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">1</div>
                  <p className="text-sm text-slate-600">Share your referral code with friends</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">2</div>
                  <p className="text-sm text-slate-600">They sign up using your code</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-bold">3</div>
                  <p className="text-sm text-slate-600"><span className="font-semibold text-emerald-600">When they buy a membership card:</span> You get GHS 3, they get GHS 1!</p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-xs text-amber-700">
                  <span className="font-semibold">Note:</span> Referral bonuses are only paid when your friend purchases their membership card using Mobile Money or Card payment.
                </p>
              </div>
            </div>

            {/* Referral History */}
            {referralData.referrals?.length > 0 && (
              <div className="bg-white rounded-2xl p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Your Referrals</h3>
                <div className="space-y-2">
                  {referralData.referrals.map((ref, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          ref.status === 'active' ? 'bg-emerald-100' : 'bg-amber-100'
                        }`}>
                          <Users size={14} className={ref.status === 'active' ? 'text-emerald-600' : 'text-amber-600'} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {ref.name || 'SDM User'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {ref.phone} • {ref.status === 'active' ? 'Card Purchased' : 'Pending Card'}
                          </p>
                        </div>
                      </div>
                      {ref.status === 'active' ? (
                        <span className="text-sm font-semibold text-emerald-600">+GHS {ref.bonus_earned}</span>
                      ) : (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">Pending</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            </>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Transaction History</h3>
              <button onClick={fetchUserData} className="text-blue-600">
                <RefreshCw size={18} />
              </button>
            </div>
            {transactions.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center text-slate-500">
                <History size={40} className="mx-auto mb-3 opacity-30" />
                <p>No transactions yet</p>
              </div>
            ) : (
              transactions.map((txn) => (
                <div key={txn.id} className="bg-white rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-slate-900">{txn.merchant_name}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      txn.status === 'available' ? 'bg-emerald-100 text-emerald-700' :
                      txn.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {txn.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Spent: GHS {txn.amount.toFixed(2)}</span>
                    <span className="font-semibold text-emerald-600">+GHS {txn.net_cashback.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(txn.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Partner Details Modal */}
      {showPartnerDetails && selectedPartner && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={() => setShowPartnerDetails(false)}>
          <div 
            className="bg-white rounded-t-3xl w-full max-w-lg max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-cyan-500 p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <button 
                  onClick={() => setShowPartnerDetails(false)}
                  className="p-2 rounded-full bg-white/20 hover:bg-white/30"
                >
                  <X size={20} />
                </button>
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                  {selectedPartner.cashback_rate || 5}% Cashback
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center">
                  {selectedPartner.logo ? (
                    <img src={selectedPartner.logo} alt={selectedPartner.name} className="w-14 h-14 rounded-lg object-cover" />
                  ) : (
                    <Store className="w-8 h-8 text-blue-600" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{selectedPartner.name}</h2>
                  <p className="opacity-80">{selectedPartner.category}</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Contact Information */}
              <div className="bg-slate-50 rounded-xl p-4">
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Phone size={18} className="text-blue-600" />
                  Contact
                </h3>
                {selectedPartner.phone ? (
                  <a 
                    href={`tel:${selectedPartner.phone}`}
                    className="flex items-center justify-between p-3 bg-white rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <span className="text-slate-700">{selectedPartner.phone}</span>
                    <Button size="sm" variant="outline" className="gap-1">
                      <Phone size={14} />
                      Appeler
                    </Button>
                  </a>
                ) : (
                  <p className="text-slate-400 text-sm">Numéro non disponible</p>
                )}
              </div>

              {/* Location */}
              <div className="bg-slate-50 rounded-xl p-4">
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <MapPin size={18} className="text-emerald-600" />
                  Localisation
                </h3>
                {selectedPartner.address || selectedPartner.city ? (
                  <div className="space-y-2">
                    {selectedPartner.address && (
                      <p className="text-slate-700">{selectedPartner.address}</p>
                    )}
                    {selectedPartner.city && (
                      <p className="text-slate-500 text-sm">{selectedPartner.city}</p>
                    )}
                    {selectedPartner.gps_location && (
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${selectedPartner.gps_location}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 text-sm hover:underline mt-2"
                      >
                        <MapPin size={14} />
                        Voir sur Google Maps
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">Adresse non disponible</p>
                )}
              </div>

              {/* Business Hours */}
              {selectedPartner.business_hours && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Clock size={18} className="text-orange-600" />
                    Horaires d'ouverture
                  </h3>
                  <p className="text-slate-700">{selectedPartner.business_hours}</p>
                </div>
              )}

              {/* Description */}
              {selectedPartner.description && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <h3 className="font-semibold text-slate-900 mb-2">À propos</h3>
                  <p className="text-slate-600 text-sm">{selectedPartner.description}</p>
                </div>
              )}

              {/* Pay Button */}
              <Button
                onClick={() => {
                  setShowPartnerDetails(false);
                  setScannedMerchant({
                    id: selectedPartner.id,
                    business_name: selectedPartner.name,
                    qr_code: selectedPartner.qr_code,
                    cashback_rate: selectedPartner.cashback_rate || 5
                  });
                  setPaymentStep('amount');
                  setActiveTab('wallet');
                }}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white h-14 text-lg font-semibold"
              >
                <DollarSign size={20} className="mr-2" />
                Pay at this merchant
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      {showScanner && (
        <QRScanner 
          onScan={handleMerchantQRScan}
          onClose={() => setShowScanner(false)}
          scanTitle="Scan Merchant QR"
          scanHint="Position the merchant's QR code in the frame"
        />
      )}
    </div>
  );
}
