import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { 
  MessageSquare, Bell, Send, Loader2, Users, Store,
  RefreshCw, History, Clock, Mail, User, AtSign, 
  Sparkles, Eye, ChevronDown, ChevronUp, Trash2, Plus, Search,
  Calendar, Timer, X
} from 'lucide-react';

// API URL imported from config
import { API_URL } from '@/config/api';

export default function SettingsSMS({ token }) {
  const [showBulkSMSModal, setShowBulkSMSModal] = useState(false);
  const [bulkSMSType, setBulkSMSType] = useState('clients');
  const [bulkSMSFilter, setBulkSMSFilter] = useState('all');
  const [bulkSMSMessage, setBulkSMSMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [smsHistory, setSmsHistory] = useState([]);
  
  // Push notification states
  const [showPushModal, setShowPushModal] = useState(false);
  const [pushForm, setPushForm] = useState({ title: '', message: '', segment: 'All', url: '' });
  const [pushStats, setPushStats] = useState({ subscribers: 0 });

  // Email states
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailType, setEmailType] = useState('bulk'); // 'bulk' or 'individual'
  const [emailRecipientType, setEmailRecipientType] = useState('clients');
  const [emailFilter, setEmailFilter] = useState('all');
  const [emailForm, setEmailForm] = useState({ subject: '', message: '', individualEmail: '', individualPhone: '' });
  const [emailHistory, setEmailHistory] = useState([]);
  const [recipientCount, setRecipientCount] = useState({ total: 0, with_email: 0 });

  // Personalized SMS states
  const [showPersonalizedModal, setShowPersonalizedModal] = useState(false);
  const [personalizedRecipientType, setPersonalizedRecipientType] = useState('clients');
  const [personalizedFilter, setPersonalizedFilter] = useState('all');
  const [personalizedTemplate, setPersonalizedTemplate] = useState('');
  const [availableRecipients, setAvailableRecipients] = useState([]);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  
  // Scheduling states
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [scheduledSMSList, setScheduledSMSList] = useState([]);
  const [showScheduledList, setShowScheduledList] = useState(false);

  // Predefined SMS Templates
  const SMS_TEMPLATES = [
    {
      id: 'cashback_reminder',
      name: '💰 Rappel Cashback',
      category: 'engagement',
      message: 'Bonjour {nom}! Vous avez {cashback} GHS de cashback disponible. Utilisez-le chez nos marchands partenaires avant qu\'il n\'expire! SDM Rewards'
    },
    {
      id: 'birthday',
      name: '🎂 Anniversaire',
      category: 'celebration',
      message: 'Joyeux anniversaire {nom}! SDM Rewards vous souhaite une excellente journée. Profitez de 10% de cashback bonus sur vos achats aujourd\'hui!'
    },
    {
      id: 'inactive_reactivation',
      name: '👋 Relance Client Inactif',
      category: 'retention',
      message: 'Bonjour {nom}, vous nous manquez! Revenez profiter de vos avantages SDM Rewards. Votre cashback de {cashback} GHS vous attend!'
    },
    {
      id: 'new_promotion',
      name: '🎉 Nouvelle Promotion',
      category: 'marketing',
      message: 'Bonne nouvelle {nom}! Promotion exceptionnelle chez nos marchands: jusqu\'à 15% de cashback ce weekend! Ne ratez pas cette offre. SDM Rewards'
    },
    {
      id: 'card_expiry',
      name: '⚠️ Expiration Carte',
      category: 'alert',
      message: 'Attention {nom}! Votre carte {carte} expire bientôt. Renouvelez-la pour continuer à profiter de vos avantages cashback. SDM Rewards'
    },
    {
      id: 'welcome_bonus',
      name: '🌟 Bonus Bienvenue',
      category: 'onboarding',
      message: 'Bienvenue {nom}! Merci de rejoindre SDM Rewards. Votre bonus de bienvenue a été crédité. Découvrez nos marchands partenaires!'
    },
    {
      id: 'referral_success',
      name: '🤝 Parrainage Réussi',
      category: 'referral',
      message: 'Félicitations {nom}! Votre filleul a rejoint SDM Rewards. Votre bonus de parrainage de 3 GHS a été crédité. Continuez à parrainer!'
    },
    {
      id: 'upgrade_invitation',
      name: '⬆️ Invitation Upgrade',
      category: 'upsell',
      message: '{nom}, passez à la carte Gold ou Platinum et gagnez jusqu\'à 10% de cashback! Votre solde actuel: {cashback} GHS. Upgrader maintenant!'
    },
    {
      id: 'merchant_promo',
      name: '🏪 Promo Marchand',
      category: 'marketing',
      message: 'Bonjour {nom}! Offre spéciale chez [NOM MARCHAND]: double cashback aujourd\'hui seulement! Présentez votre carte SDM Rewards.'
    },
    {
      id: 'thank_you',
      name: '❤️ Remerciement',
      category: 'engagement',
      message: 'Merci {nom} pour votre fidélité! Grâce à vous, SDM Rewards grandit. Vous avez cumulé {cashback} GHS de cashback. Continuez!'
    },
    {
      id: 'festive',
      name: '🎄 Fêtes / Nouvel An',
      category: 'celebration',
      message: 'Bonne année {nom}! SDM Rewards vous souhaite santé et prospérité. Profitez de nos offres spéciales pour bien commencer l\'année!'
    },
    {
      id: 'custom',
      name: '✏️ Message Personnalisé',
      category: 'custom',
      message: ''
    }
  ];

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchSMSHistory();
    fetchPushStats();
    fetchEmailHistory();
    fetchScheduledSMS();
  }, []);

  useEffect(() => {
    if (emailType === 'bulk') {
      fetchRecipientCount();
    }
  }, [emailRecipientType, emailFilter, emailType]);

  const fetchSMSHistory = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/sms/history?limit=10`, { headers });
      setSmsHistory(res.data.messages || []);
    } catch (error) {
      console.error('Error fetching SMS history:', error);
    }
  };

  const fetchPushStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/push/stats`, { headers });
      setPushStats(res.data);
    } catch (error) {
      console.error('Error fetching push stats:', error);
    }
  };

  const fetchEmailHistory = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/email/history?limit=10`, { headers });
      setEmailHistory(res.data.emails || []);
    } catch (error) {
      console.error('Error fetching email history:', error);
    }
  };

  // Fetch scheduled personalized SMS
  const fetchScheduledSMS = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/sms/scheduled/personalized`, { headers });
      setScheduledSMSList(res.data.scheduled || []);
    } catch (error) {
      console.error('Error fetching scheduled SMS:', error);
    }
  };

  // Cancel a scheduled SMS
  const cancelScheduledSMS = async (scheduleId) => {
    try {
      await axios.delete(`${API_URL}/api/admin/sms/scheduled/personalized/${scheduleId}`, { headers });
      toast.success('SMS programmé annulé');
      fetchScheduledSMS();
    } catch (error) {
      toast.error('Erreur lors de l\'annulation');
    }
  };

  // Get minimum datetime for scheduling (now + 5 minutes)
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    return now.toISOString().slice(0, 16);
  };

  // Format scheduled datetime for display
  const formatScheduledDateTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const fetchRecipientCount = async () => {
    try {
      const res = await axios.get(
        `${API_URL}/api/admin/email/recipients?recipient_type=${emailRecipientType}&filter=${emailFilter}`, 
        { headers }
      );
      setRecipientCount(res.data);
    } catch (error) {
      console.error('Error fetching recipient count:', error);
    }
  };

  // Fetch recipients for personalized SMS
  const fetchPersonalizedRecipients = async () => {
    try {
      setLoadingRecipients(true);
      const endpoint = personalizedRecipientType === 'clients' 
        ? `${API_URL}/api/admin/clients?limit=100&status=${personalizedFilter === 'all' ? '' : personalizedFilter}`
        : `${API_URL}/api/admin/merchants?limit=100&status=${personalizedFilter === 'all' ? '' : personalizedFilter}`;
      
      const res = await axios.get(endpoint, { headers });
      const recipients = personalizedRecipientType === 'clients' 
        ? (res.data.clients || []).map(c => ({
            id: c.id,
            name: c.full_name || c.username || 'Unknown',
            phone: c.phone,
            cashback: c.cashback_balance || 0,
            card_type: c.card_type || 'none',
            email: c.email
          }))
        : (res.data.merchants || []).map(m => ({
            id: m.id,
            name: m.business_name || m.owner_name || 'Unknown',
            phone: m.phone,
            cashback: m.balance || 0,
            card_type: null,
            email: m.email
          }));
      
      setAvailableRecipients(recipients);
    } catch (error) {
      console.error('Error fetching recipients:', error);
      toast.error('Failed to load recipients');
    } finally {
      setLoadingRecipients(false);
    }
  };

  // Apply template variables
  const applyTemplate = (template, recipient) => {
    return template
      .replace(/{nom}/gi, recipient.name || 'Client')
      .replace(/{name}/gi, recipient.name || 'Client')
      .replace(/{cashback}/gi, (recipient.cashback || 0).toFixed(2))
      .replace(/{phone}/gi, recipient.phone || '')
      .replace(/{carte}/gi, recipient.card_type || 'N/A')
      .replace(/{card}/gi, recipient.card_type || 'N/A');
  };

  // Handle template selection
  const handleTemplateSelect = (templateId) => {
    setSelectedTemplateId(templateId);
    const template = SMS_TEMPLATES.find(t => t.id === templateId);
    if (template && template.message) {
      setPersonalizedTemplate(template.message);
    }
  };

  // Get template categories for grouping
  const getTemplatesByCategory = () => {
    const categories = {
      engagement: { name: 'Engagement', templates: [] },
      marketing: { name: 'Marketing', templates: [] },
      retention: { name: 'Rétention', templates: [] },
      celebration: { name: 'Célébration', templates: [] },
      alert: { name: 'Alertes', templates: [] },
      onboarding: { name: 'Onboarding', templates: [] },
      referral: { name: 'Parrainage', templates: [] },
      upsell: { name: 'Upsell', templates: [] },
      custom: { name: 'Personnalisé', templates: [] }
    };
    
    SMS_TEMPLATES.forEach(template => {
      if (categories[template.category]) {
        categories[template.category].templates.push(template);
      }
    });
    
    return categories;
  };

  // Get preview messages
  const getPreviewMessages = () => {
    return selectedRecipients.slice(0, 5).map(recipient => ({
      ...recipient,
      personalizedMessage: applyTemplate(personalizedTemplate, recipient)
    }));
  };

  // Handle sending personalized SMS
  const handleSendPersonalizedSMS = async () => {
    if (!personalizedTemplate.trim()) {
      toast.error('Veuillez entrer un message template');
      return;
    }

    if (selectedRecipients.length === 0) {
      toast.error('Veuillez sélectionner au moins un destinataire');
      return;
    }

    // Validate scheduling if enabled
    if (isScheduled) {
      if (!scheduledDate || !scheduledTime) {
        toast.error('Veuillez sélectionner une date et heure pour la programmation');
        return;
      }
      
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      const now = new Date();
      if (scheduledDateTime <= now) {
        toast.error('La date programmée doit être dans le futur');
        return;
      }
    }

    // Build recipients array with personalized messages
    const recipients = selectedRecipients.map(r => ({
      phone: r.phone,
      message: applyTemplate(personalizedTemplate, r),
      recipient_name: r.name,
      recipient_id: r.id
    }));

    try {
      setIsLoading(true);
      
      if (isScheduled) {
        // Schedule the SMS for later
        const scheduledAt = `${scheduledDate}T${scheduledTime}:00`;
        const res = await axios.post(`${API_URL}/api/admin/sms/schedule/personalized`, {
          recipients,
          scheduled_at: scheduledAt,
          template_name: SMS_TEMPLATES.find(t => t.id === selectedTemplateId)?.name || 'Custom'
        }, { headers });
        
        if (res.data.success) {
          toast.success(`SMS programmé pour ${formatScheduledDateTime(scheduledAt)}`);
          setShowPersonalizedModal(false);
          resetPersonalizedForm();
          fetchScheduledSMS();
        } else {
          toast.error(res.data.error || 'Échec de la programmation');
        }
      } else {
        // Send immediately
        const res = await axios.post(`${API_URL}/api/admin/sms/bulk/personalized`, {
          recipients
        }, { headers });
        
        if (res.data.success) {
          toast.success(`${res.data.sent} SMS personnalisés envoyés avec succès!`);
          setShowPersonalizedModal(false);
          resetPersonalizedForm();
          fetchSMSHistory();
        } else {
          toast.error(res.data.error || 'Échec de l\'envoi');
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'opération');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset personalized SMS form
  const resetPersonalizedForm = () => {
    setPersonalizedTemplate('');
    setSelectedRecipients([]);
    setSelectedTemplateId('');
    setIsScheduled(false);
    setScheduledDate('');
    setScheduledTime('');
  };

  // Toggle recipient selection
  const toggleRecipient = (recipient) => {
    setSelectedRecipients(prev => {
      const exists = prev.find(r => r.id === recipient.id);
      if (exists) {
        return prev.filter(r => r.id !== recipient.id);
      } else {
        return [...prev, recipient];
      }
    });
  };

  // Select all recipients
  const selectAllRecipients = () => {
    const filtered = getFilteredRecipients();
    setSelectedRecipients(filtered);
  };

  // Clear all selections
  const clearAllSelections = () => {
    setSelectedRecipients([]);
  };

  // Filter recipients by search
  const getFilteredRecipients = () => {
    if (!searchQuery.trim()) return availableRecipients;
    const query = searchQuery.toLowerCase();
    return availableRecipients.filter(r => 
      r.name?.toLowerCase().includes(query) || 
      r.phone?.includes(query)
    );
  };

  const handleSendBulkSMS = async () => {
    if (!bulkSMSMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }

    try {
      setIsLoading(true);
      await axios.post(`${API_URL}/api/admin/sms/bulk`, {
        recipient_type: bulkSMSType,
        filter: bulkSMSFilter,
        message: bulkSMSMessage
      }, { headers });
      
      toast.success('Bulk SMS sent successfully');
      setShowBulkSMSModal(false);
      setBulkSMSMessage('');
      fetchSMSHistory();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send SMS');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendPush = async () => {
    if (!pushForm.title || !pushForm.message) {
      toast.error('Title and message are required');
      return;
    }

    try {
      setIsLoading(true);
      await axios.post(`${API_URL}/api/admin/push/send`, pushForm, { headers });
      toast.success('Push notification sent');
      setShowPushModal(false);
      setPushForm({ title: '', message: '', segment: 'All', url: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send notification');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailForm.subject.trim() || !emailForm.message.trim()) {
      toast.error('Subject and message are required');
      return;
    }

    if (emailType === 'individual' && !emailForm.individualEmail && !emailForm.individualPhone) {
      toast.error('Please enter email or phone number');
      return;
    }

    try {
      setIsLoading(true);
      await axios.post(`${API_URL}/api/admin/email/send`, {
        recipient_type: emailType === 'individual' ? 'individual' : emailRecipientType,
        filter: emailFilter,
        individual_email: emailForm.individualEmail || null,
        individual_phone: emailForm.individualPhone || null,
        subject: emailForm.subject,
        message: emailForm.message
      }, { headers });
      
      toast.success('Email sent successfully!');
      setShowEmailModal(false);
      setEmailForm({ subject: '', message: '', individualEmail: '', individualPhone: '' });
      fetchEmailHistory();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Send Actions - Row 1: SMS & Push */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <MessageSquare size={20} className="text-purple-400" /> Bulk SMS to Clients
          </h3>
          <Button 
            onClick={() => { setBulkSMSType('clients'); setShowBulkSMSModal(true); }} 
            className="w-full bg-purple-600 hover:bg-purple-700"
            data-testid="bulk-sms-clients-btn"
          >
            <MessageSquare size={16} className="mr-2" /> Send to Clients
          </Button>
        </div>
        
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <MessageSquare size={20} className="text-amber-400" /> Bulk SMS to Merchants
          </h3>
          <Button 
            onClick={() => { setBulkSMSType('merchants'); setShowBulkSMSModal(true); }} 
            className="w-full bg-amber-600 hover:bg-amber-700"
            data-testid="bulk-sms-merchants-btn"
          >
            <MessageSquare size={16} className="mr-2" /> Send to Merchants
          </Button>
        </div>

        {/* NEW: Personalized SMS Card */}
        <div className="bg-gradient-to-br from-slate-800 to-indigo-900/30 border border-indigo-500/30 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
            <Sparkles size={20} className="text-indigo-400" /> SMS Personnalisés
          </h3>
          <p className="text-slate-400 text-xs mb-4">
            Variables: {'{nom}'}, {'{cashback}'}, {'{carte}'}
          </p>
          <Button 
            onClick={() => { 
              setShowPersonalizedModal(true);
              fetchPersonalizedRecipients();
            }} 
            className="w-full bg-indigo-600 hover:bg-indigo-700"
            data-testid="personalized-sms-btn"
          >
            <Sparkles size={16} className="mr-2" /> Composer
          </Button>
        </div>
        
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Bell size={20} className="text-emerald-400" /> Push Notifications
          </h3>
          <p className="text-slate-400 text-sm mb-3">
            {pushStats.subscribers || 0} subscribers
          </p>
          <Button 
            onClick={() => setShowPushModal(true)} 
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            data-testid="push-notification-btn"
          >
            <Bell size={16} className="mr-2" /> Send Push
          </Button>
        </div>
      </div>

      {/* Quick Send Actions - Row 2: Email */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Mail size={20} className="text-blue-400" /> Bulk Email to Clients
          </h3>
          <Button 
            onClick={() => { 
              setEmailType('bulk');
              setEmailRecipientType('clients'); 
              setShowEmailModal(true); 
            }} 
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Mail size={16} className="mr-2" /> Email Clients
          </Button>
        </div>
        
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Mail size={20} className="text-pink-400" /> Bulk Email to Merchants
          </h3>
          <Button 
            onClick={() => { 
              setEmailType('bulk');
              setEmailRecipientType('merchants'); 
              setShowEmailModal(true); 
            }} 
            className="w-full bg-pink-600 hover:bg-pink-700"
          >
            <Mail size={16} className="mr-2" /> Email Merchants
          </Button>
        </div>
        
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <User size={20} className="text-cyan-400" /> Individual Email
          </h3>
          <p className="text-slate-400 text-sm mb-3">
            Send to a specific user
          </p>
          <Button 
            onClick={() => { 
              setEmailType('individual');
              setShowEmailModal(true); 
            }} 
            className="w-full bg-cyan-600 hover:bg-cyan-700"
          >
            <AtSign size={16} className="mr-2" /> Send Individual
          </Button>
        </div>
      </div>

      {/* Scheduled SMS Section */}
      <div className="bg-gradient-to-r from-slate-800 to-amber-900/20 border border-amber-500/30 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Timer size={20} className="text-amber-400" /> SMS Programmés
            {scheduledSMSList.length > 0 && (
              <span className="bg-amber-500 text-black text-xs px-2 py-0.5 rounded-full font-bold">
                {scheduledSMSList.length}
              </span>
            )}
          </h3>
          <Button onClick={fetchScheduledSMS} variant="outline" size="sm" className="border-amber-600/50 text-amber-400 hover:bg-amber-900/30">
            <RefreshCw size={14} className="mr-1" /> Actualiser
          </Button>
        </div>
        
        <div className="space-y-3">
          {scheduledSMSList.length > 0 ? (
            scheduledSMSList.map((scheduled) => (
              <div key={scheduled.id} className="bg-slate-900/80 rounded-lg p-4 border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-amber-400 font-medium">{scheduled.template_name || 'Custom'}</span>
                    <span className="text-slate-500 text-xs">
                      {scheduled.recipient_count} destinataire{scheduled.recipient_count > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-1 rounded flex items-center gap-1">
                      <Calendar size={12} />
                      {formatScheduledDateTime(scheduled.scheduled_at)}
                    </span>
                    <Button 
                      onClick={() => cancelScheduledSMS(scheduled.id)}
                      variant="ghost" 
                      size="sm" 
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/30 p-1"
                      title="Annuler"
                    >
                      <X size={16} />
                    </Button>
                  </div>
                </div>
                <p className="text-slate-400 text-sm truncate">
                  {scheduled.preview_message || 'Message personnalisé...'}
                </p>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Timer size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucun SMS programmé</p>
              <p className="text-xs mt-1">Utilisez "SMS Personnalisés" avec l'option "Programmer l'envoi"</p>
            </div>
          )}
        </div>
      </div>

      {/* Email History */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Mail size={20} className="text-blue-400" /> Recent Email History
          </h3>
          <Button onClick={fetchEmailHistory} variant="outline" size="sm" className="border-slate-600">
            <RefreshCw size={14} className="mr-1" /> Refresh
          </Button>
        </div>
        
        <div className="space-y-3">
          {emailHistory.length > 0 ? (
            emailHistory.map((email, idx) => (
              <div key={idx} className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium text-sm">{email.subject}</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    email.status === 'sent' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {email.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">
                    To: {email.sent_count || 0} {email.type}
                  </span>
                  <span className="text-slate-400 text-xs flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(email.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-slate-500 text-center py-4">No email history</p>
          )}
        </div>
      </div>

      {/* SMS History */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <History size={20} className="text-purple-400" /> Recent SMS History
          </h3>
          <Button onClick={fetchSMSHistory} variant="outline" size="sm" className="border-slate-600">
            <RefreshCw size={14} className="mr-1" /> Refresh
          </Button>
        </div>
        
        <div className="space-y-3">
          {smsHistory.length > 0 ? (
            smsHistory.map((sms, idx) => (
              <div key={idx} className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-xs flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(sms.created_at).toLocaleString()}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    sms.status === 'sent' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {sms.status}
                  </span>
                </div>
                <p className="text-white text-sm">{sms.message?.slice(0, 100)}...</p>
                <p className="text-slate-500 text-xs mt-1">
                  To: {sms.recipient_count || 0} {sms.recipient_type}
                </p>
              </div>
            ))
          ) : (
            <p className="text-slate-500 text-center py-4">No SMS history</p>
          )}
        </div>
      </div>

      {/* Bulk SMS Modal */}
      {showBulkSMSModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-white font-semibold text-lg mb-4">
              Send Bulk SMS to {bulkSMSType === 'clients' ? 'Clients' : 'Merchants'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label className="text-slate-400">Filter Recipients</Label>
                <select
                  value={bulkSMSFilter}
                  onChange={(e) => setBulkSMSFilter(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white"
                >
                  <option value="all">All {bulkSMSType}</option>
                  <option value="active">Active only</option>
                  {bulkSMSType === 'clients' && (
                    <>
                      <option value="silver">Silver card holders</option>
                      <option value="gold">Gold card holders</option>
                      <option value="platinum">Platinum card holders</option>
                    </>
                  )}
                </select>
              </div>
              
              <div>
                <Label className="text-slate-400">Message</Label>
                <textarea
                  value={bulkSMSMessage}
                  onChange={(e) => setBulkSMSMessage(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white min-h-[120px]"
                  placeholder="Enter your message..."
                  maxLength={160}
                />
                <p className="text-slate-500 text-xs mt-1">{bulkSMSMessage.length}/160 characters</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => setShowBulkSMSModal(false)}
                variant="outline"
                className="flex-1 border-slate-700 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendBulkSMS}
                disabled={isLoading}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                {isLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : <Send className="mr-2" size={16} />}
                Send SMS
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Push Modal */}
      {showPushModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-white font-semibold text-lg mb-4">Send Push Notification</h3>
            
            <div className="space-y-4">
              <div>
                <Label className="text-slate-400">Title</Label>
                <Input
                  value={pushForm.title}
                  onChange={(e) => setPushForm({...pushForm, title: e.target.value})}
                  className="mt-1 bg-slate-900 border-slate-700 text-white"
                  placeholder="Notification title"
                />
              </div>
              <div>
                <Label className="text-slate-400">Message</Label>
                <textarea
                  value={pushForm.message}
                  onChange={(e) => setPushForm({...pushForm, message: e.target.value})}
                  className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white min-h-[80px]"
                  placeholder="Notification message"
                />
              </div>
              <div>
                <Label className="text-slate-400">Segment</Label>
                <select
                  value={pushForm.segment}
                  onChange={(e) => setPushForm({...pushForm, segment: e.target.value})}
                  className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white"
                >
                  <option value="All">All subscribers</option>
                  <option value="Active Users">Active users</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => setShowPushModal(false)}
                variant="outline"
                className="flex-1 border-slate-700 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendPush}
                disabled={isLoading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {isLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : <Bell className="mr-2" size={16} />}
                Send
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-lg">
            <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
              <Mail className="text-blue-400" />
              {emailType === 'individual' ? 'Send Individual Email' : `Send Bulk Email to ${emailRecipientType === 'clients' ? 'Clients' : 'Merchants'}`}
            </h3>
            
            <div className="space-y-4">
              {/* Individual recipient fields */}
              {emailType === 'individual' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-400">User Email</Label>
                    <Input
                      value={emailForm.individualEmail}
                      onChange={(e) => setEmailForm({...emailForm, individualEmail: e.target.value})}
                      className="mt-1 bg-slate-900 border-slate-700 text-white"
                      placeholder="user@example.com"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400">Or Phone Number</Label>
                    <Input
                      value={emailForm.individualPhone}
                      onChange={(e) => setEmailForm({...emailForm, individualPhone: e.target.value})}
                      className="mt-1 bg-slate-900 border-slate-700 text-white"
                      placeholder="+233..."
                    />
                  </div>
                </div>
              )}

              {/* Bulk filter */}
              {emailType === 'bulk' && (
                <div>
                  <Label className="text-slate-400">Filter Recipients</Label>
                  <select
                    value={emailFilter}
                    onChange={(e) => setEmailFilter(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white"
                  >
                    <option value="all">All {emailRecipientType}</option>
                    <option value="active">Active only</option>
                    {emailRecipientType === 'clients' && (
                      <>
                        <option value="silver">Silver card holders</option>
                        <option value="gold">Gold card holders</option>
                        <option value="platinum">Platinum card holders</option>
                      </>
                    )}
                  </select>
                  <p className="text-slate-500 text-xs mt-2">
                    {recipientCount.with_email} recipients with email (out of {recipientCount.total} total)
                  </p>
                </div>
              )}

              <div>
                <Label className="text-slate-400">Subject</Label>
                <Input
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm({...emailForm, subject: e.target.value})}
                  className="mt-1 bg-slate-900 border-slate-700 text-white"
                  placeholder="Email subject"
                />
              </div>
              
              <div>
                <Label className="text-slate-400">Message</Label>
                <textarea
                  value={emailForm.message}
                  onChange={(e) => setEmailForm({...emailForm, message: e.target.value})}
                  className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white min-h-[150px]"
                  placeholder="Enter your email message..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => setShowEmailModal(false)}
                variant="outline"
                className="flex-1 border-slate-700 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendEmail}
                disabled={isLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : <Mail className="mr-2" size={16} />}
                Send Email
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Personalized SMS Modal */}
      {showPersonalizedModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                <Sparkles className="text-indigo-400" />
                SMS Personnalisés en Masse
              </h3>
              <button 
                onClick={() => setShowPersonalizedModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="grid lg:grid-cols-5 gap-6 flex-1 overflow-hidden">
              {/* Left Column: Templates */}
              <div className="lg:col-span-1 overflow-auto border-r border-slate-700 pr-4">
                <Label className="text-slate-400 text-sm mb-3 block">Templates Prédéfinis</Label>
                <div className="space-y-1">
                  {SMS_TEMPLATES.map(template => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedTemplateId === template.id 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-slate-900/50 text-slate-300 hover:bg-slate-700'
                      }`}
                      data-testid={`template-${template.id}`}
                    >
                      {template.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Middle Column: Template & Recipients */}
              <div className="lg:col-span-2 space-y-4 overflow-auto">
                {/* Template Input */}
                <div>
                  <Label className="text-slate-400 flex items-center gap-2">
                    Message Template
                    <span className="text-indigo-400 text-xs font-normal">
                      Variables: {'{nom}'} {'{cashback}'} {'{carte}'}
                    </span>
                  </Label>
                  <textarea
                    value={personalizedTemplate}
                    onChange={(e) => {
                      setPersonalizedTemplate(e.target.value);
                      setSelectedTemplateId('custom');
                    }}
                    className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white min-h-[100px]"
                    placeholder="Bonjour {nom}, votre cashback est de {cashback} GHS! Profitez-en..."
                    maxLength={320}
                    data-testid="personalized-template-input"
                  />
                  <p className="text-slate-500 text-xs mt-1">{personalizedTemplate.length}/320 caractères</p>
                </div>

                {/* Recipient Type & Filter */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-400">Type de destinataire</Label>
                    <select
                      value={personalizedRecipientType}
                      onChange={(e) => {
                        setPersonalizedRecipientType(e.target.value);
                        setSelectedRecipients([]);
                        setTimeout(fetchPersonalizedRecipients, 100);
                      }}
                      className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white"
                      data-testid="personalized-recipient-type"
                    >
                      <option value="clients">Clients</option>
                      <option value="merchants">Marchands</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-slate-400">Filtre</Label>
                    <select
                      value={personalizedFilter}
                      onChange={(e) => {
                        setPersonalizedFilter(e.target.value);
                        setTimeout(fetchPersonalizedRecipients, 100);
                      }}
                      className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white"
                    >
                      <option value="all">Tous</option>
                      <option value="active">Actifs uniquement</option>
                      {personalizedRecipientType === 'clients' && (
                        <>
                          <option value="silver">Carte Silver</option>
                          <option value="gold">Carte Gold</option>
                          <option value="platinum">Carte Platinum</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {/* Search & Select Recipients */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-slate-400">
                      Sélectionner destinataires ({selectedRecipients.length} sélectionné{selectedRecipients.length > 1 ? 's' : ''})
                    </Label>
                    <div className="flex gap-2">
                      <button 
                        onClick={selectAllRecipients}
                        className="text-xs text-indigo-400 hover:text-indigo-300"
                      >
                        Tout sélectionner
                      </button>
                      <span className="text-slate-600">|</span>
                      <button 
                        onClick={clearAllSelections}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        Désélectionner tout
                      </button>
                    </div>
                  </div>
                  
                  {/* Search Input */}
                  <div className="relative mb-2">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 bg-slate-900 border-slate-700 text-white"
                      placeholder="Rechercher par nom ou téléphone..."
                    />
                  </div>

                  {/* Recipients List */}
                  <div className="bg-slate-900 border border-slate-700 rounded-lg max-h-[200px] overflow-y-auto">
                    {loadingRecipients ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="animate-spin text-indigo-400" size={24} />
                      </div>
                    ) : getFilteredRecipients().length > 0 ? (
                      getFilteredRecipients().map(recipient => (
                        <div 
                          key={recipient.id}
                          onClick={() => toggleRecipient(recipient)}
                          className={`flex items-center justify-between px-3 py-2 cursor-pointer border-b border-slate-700/50 last:border-0 hover:bg-slate-800 transition-colors ${
                            selectedRecipients.find(r => r.id === recipient.id) ? 'bg-indigo-900/30' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={!!selectedRecipients.find(r => r.id === recipient.id)}
                              readOnly
                              className="w-4 h-4 rounded border-slate-600 text-indigo-600 focus:ring-indigo-500"
                            />
                            <div>
                              <p className="text-white text-sm font-medium">{recipient.name}</p>
                              <p className="text-slate-500 text-xs">{recipient.phone}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-emerald-400 text-sm font-medium">GHS {recipient.cashback?.toFixed(2) || '0.00'}</p>
                            {recipient.card_type && (
                              <p className="text-slate-500 text-xs capitalize">{recipient.card_type}</p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-500 text-center py-4">Aucun destinataire trouvé</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Preview */}
              <div className="lg:col-span-2 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-slate-400 flex items-center gap-2">
                    <Eye size={16} /> Aperçu des messages
                  </Label>
                  <Button
                    onClick={() => setShowPreview(!showPreview)}
                    variant="ghost"
                    size="sm"
                    className="text-slate-400"
                  >
                    {showPreview ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </Button>
                </div>
                
                <div className="bg-slate-900 border border-slate-700 rounded-lg flex-1 overflow-y-auto p-3">
                  {selectedRecipients.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500">
                      <Users size={40} className="mb-2 opacity-50" />
                      <p className="text-sm">Sélectionnez des destinataires</p>
                      <p className="text-xs">pour voir l'aperçu</p>
                    </div>
                  ) : !personalizedTemplate.trim() ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500">
                      <MessageSquare size={40} className="mb-2 opacity-50" />
                      <p className="text-sm">Écrivez un message template</p>
                      <p className="text-xs">pour voir l'aperçu</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {getPreviewMessages().map((recipient, idx) => (
                        <div 
                          key={recipient.id}
                          className="bg-slate-800 rounded-lg p-3 border border-slate-700"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-indigo-400 text-xs font-medium">
                              {recipient.name}
                            </span>
                            <span className="text-slate-500 text-xs">
                              {recipient.phone}
                            </span>
                          </div>
                          <p className="text-white text-sm bg-slate-900/50 rounded p-2">
                            {recipient.personalizedMessage}
                          </p>
                        </div>
                      ))}
                      {selectedRecipients.length > 5 && (
                        <p className="text-slate-500 text-center text-xs py-2">
                          ... et {selectedRecipients.length - 5} autre(s) destinataire(s)
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Scheduling Section */}
            <div className="mt-4 pt-4 border-t border-slate-700">
              <div className="flex items-center gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isScheduled}
                    onChange={(e) => setIsScheduled(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-slate-300 flex items-center gap-2">
                    <Timer size={16} className="text-amber-400" />
                    Programmer l'envoi
                  </span>
                </label>
                
                {isScheduled && (
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-slate-500" />
                      <input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-md text-white text-sm"
                        data-testid="schedule-date-input"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-slate-500" />
                      <input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-md text-white text-sm"
                        data-testid="schedule-time-input"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-4 pt-4 border-t border-slate-700">
              <Button
                onClick={() => {
                  setShowPersonalizedModal(false);
                  resetPersonalizedForm();
                }}
                variant="outline"
                className="flex-1 border-slate-700 text-slate-300"
              >
                Annuler
              </Button>
              <Button
                onClick={handleSendPersonalizedSMS}
                disabled={isLoading || selectedRecipients.length === 0 || !personalizedTemplate.trim() || (isScheduled && (!scheduledDate || !scheduledTime))}
                className={`flex-1 ${isScheduled ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'} disabled:opacity-50`}
                data-testid="send-personalized-sms-btn"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin mr-2" size={16} />
                ) : isScheduled ? (
                  <Timer className="mr-2" size={16} />
                ) : (
                  <Send className="mr-2" size={16} />
                )}
                {isScheduled ? `Programmer ${selectedRecipients.length} SMS` : `Envoyer ${selectedRecipients.length} SMS`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
