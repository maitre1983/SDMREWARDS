import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Brain,
  TrendingUp,
  Store,
  ShieldCheck,
  Lightbulb,
  MessageCircle,
  Send,
  Loader2,
  ChevronRight,
  Users,
  CreditCard,
  Smartphone,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Sparkles,
  Target,
  PiggyBank,
  BarChart3,
  ArrowRight
} from 'lucide-react';

// API URL imported from config
import { API_URL } from '@/config/api';

export default function AIAssistant({ clientToken, language = 'en' }) {
  const [isLoading, setIsLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatContainerRef = useRef(null);

  // Translations
  const t = {
    en: {
      title: 'AI Assistant',
      subtitle: 'Your personal financial advisor',
      overview: 'Overview',
      spending: 'Spending Analysis',
      recommendations: 'Recommendations',
      security: 'Security',
      tips: 'Cashback Tips',
      chat: 'Ask AI',
      loading: 'Analyzing your data...',
      noData: 'No data available yet',
      score: 'Savings Score',
      totalSpent: 'Total Spent',
      totalCashback: 'Cashback Earned',
      transactions: 'Transactions',
      riskLevel: 'Security Status',
      low: 'Secure',
      medium: 'Review Needed',
      high: 'Action Required',
      tryMerchant: 'Try this merchant',
      potentialSavings: 'Potential savings',
      chatPlaceholder: 'Ask about your spending, cashback tips...',
      send: 'Send',
      refresh: 'Refresh'
    },
    fr: {
      title: 'Assistant IA',
      subtitle: 'Votre conseiller financier personnel',
      overview: 'Aperçu',
      spending: 'Analyse des Dépenses',
      recommendations: 'Recommandations',
      security: 'Sécurité',
      tips: 'Conseils Cashback',
      chat: 'Demander à l\'IA',
      loading: 'Analyse de vos données...',
      noData: 'Pas encore de données disponibles',
      score: 'Score d\'Épargne',
      totalSpent: 'Total Dépensé',
      totalCashback: 'Cashback Gagné',
      transactions: 'Transactions',
      riskLevel: 'Statut de Sécurité',
      low: 'Sécurisé',
      medium: 'Vérification Requise',
      high: 'Action Requise',
      tryMerchant: 'Essayez ce marchand',
      potentialSavings: 'Économies potentielles',
      chatPlaceholder: 'Posez des questions sur vos dépenses, conseils cashback...',
      send: 'Envoyer',
      refresh: 'Actualiser'
    }
  };

  const text = t[language] || t.en;

  useEffect(() => {
    if (clientToken) {
      loadDashboardData();
    }
  }, [clientToken, language]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const loadDashboardData = async () => {
    if (!clientToken) {
      console.error('No client token provided');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      console.log('Loading AI dashboard with token:', clientToken?.substring(0, 20) + '...');
      const response = await axios.get(`${API_URL}/api/ai/dashboard?language=${language}`, {
        headers: { Authorization: `Bearer ${clientToken}` }
      });
      console.log('AI dashboard response:', response.data?.success);
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error loading AI dashboard:', error);
      toast.error(language === 'fr' ? 'Erreur de chargement' : 'Failed to load data');
    } finally {
      console.log('Setting isLoading to false');
      setIsLoading(false);
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/api/ai/chat`,
        { message: userMessage, language },
        { headers: { Authorization: `Bearer ${clientToken}` } }
      );
      
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.data.response 
      }]);
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: language === 'fr' 
          ? 'Sorry, I could not process your request.' 
          : 'Sorry, I couldn\'t process your request.'
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="relative">
          <Brain className="w-16 h-16 text-amber-400 animate-pulse" />
          <Sparkles className="w-6 h-6 text-amber-300 absolute -top-1 -right-1 animate-bounce" />
        </div>
        <p className="text-slate-400">{text.loading}</p>
      </div>
    );
  }

  const spendingData = dashboardData?.spending_analysis;
  const recommendations = dashboardData?.recommendations;
  const tips = dashboardData?.cashback_tips;
  const security = dashboardData?.security_status;

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500/20 to-purple-500/20 rounded-xl p-4 border border-amber-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-purple-500 flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{text.title}</h2>
              <p className="text-sm text-slate-400">{text.subtitle}</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={loadDashboardData}
            className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {[
          { id: 'overview', icon: BarChart3, label: text.overview },
          { id: 'spending', icon: TrendingUp, label: text.spending },
          { id: 'recommendations', icon: Store, label: text.recommendations },
          { id: 'tips', icon: Lightbulb, label: text.tips },
          { id: 'security', icon: ShieldCheck, label: text.security },
          { id: 'chat', icon: MessageCircle, label: text.chat }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
              activeSection === tab.id
                ? 'bg-amber-500 text-slate-900 font-medium'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="text-sm">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content Sections */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        {/* Overview Section */}
        {activeSection === 'overview' && (
          <div className="p-4 space-y-4">
            {/* Score Card */}
            {spendingData?.insights?.score && (
              <div className="bg-gradient-to-br from-amber-500/20 to-green-500/20 rounded-lg p-4 border border-amber-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">{text.score}</p>
                    <p className="text-3xl font-bold text-amber-400">
                      {spendingData.insights.score}/100
                    </p>
                  </div>
                  <div className="w-16 h-16 rounded-full bg-slate-900/50 flex items-center justify-center">
                    <Target className="w-8 h-8 text-amber-400" />
                  </div>
                </div>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-xs text-slate-500">{text.totalSpent}</p>
                <p className="text-lg font-bold text-white">
                  GHS {spendingData?.data?.total_spent?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-xs text-slate-500">{text.totalCashback}</p>
                <p className="text-lg font-bold text-green-400">
                  GHS {spendingData?.data?.total_cashback?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-xs text-slate-500">{text.transactions}</p>
                <p className="text-lg font-bold text-white">
                  {spendingData?.data?.transactions_count || 0}
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-xs text-slate-500">{text.riskLevel}</p>
                <div className="flex items-center gap-2">
                  {security?.risk_level === 'low' && (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <span className="text-green-400 font-medium">{text.low}</span>
                    </>
                  )}
                  {security?.risk_level === 'medium' && (
                    <>
                      <AlertTriangle className="w-5 h-5 text-yellow-400" />
                      <span className="text-yellow-400 font-medium">{text.medium}</span>
                    </>
                  )}
                  {security?.risk_level === 'high' && (
                    <>
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                      <span className="text-red-400 font-medium">{text.high}</span>
                    </>
                  )}
                  {!security?.risk_level && (
                    <span className="text-slate-400">-</span>
                  )}
                </div>
              </div>
            </div>

            {/* AI Summary */}
            {spendingData?.insights?.summary && (
              <div className="bg-slate-900/50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-slate-300">{spendingData.insights.summary}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Spending Analysis Section */}
        {activeSection === 'spending' && (
          <div className="p-4 space-y-4">
            {spendingData?.has_data ? (
              <>
                {/* Patterns */}
                {spendingData.insights?.patterns?.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-slate-400 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      {language === 'fr' ? 'Tendances Identifiées' : 'Identified Patterns'}
                    </h3>
                    {spendingData.insights.patterns.map((pattern, i) => (
                      <div key={i} className="bg-slate-900/50 rounded-lg p-3 flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs text-amber-400">{i + 1}</span>
                        </div>
                        <p className="text-sm text-slate-300">{pattern}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Top Merchants */}
                {spendingData.data?.top_merchants?.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-slate-400 flex items-center gap-2">
                      <Store className="w-4 h-4" />
                      {language === 'fr' ? 'Vos Marchands Préférés' : 'Your Favorite Merchants'}
                    </h3>
                    {spendingData.data.top_merchants.slice(0, 5).map((merchant, i) => (
                      <div key={i} className="bg-slate-900/50 rounded-lg p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                            <Store className="w-4 h-4 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{merchant.name}</p>
                            <p className="text-xs text-slate-500">{merchant.count} visits</p>
                          </div>
                        </div>
                        <p className="text-sm text-amber-400">GHS {merchant.total?.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">{spendingData?.message || text.noData}</p>
              </div>
            )}
          </div>
        )}

        {/* Recommendations Section */}
        {activeSection === 'recommendations' && (
          <div className="p-4 space-y-3">
            {recommendations?.recommendations?.length > 0 ? (
              recommendations.recommendations.map((rec, i) => (
                <div key={i} className="bg-slate-900/50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-green-500/20 flex items-center justify-center flex-shrink-0">
                      <Store className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white">{rec.merchant_name || rec.merchant?.business_name}</p>
                      <p className="text-sm text-slate-400 mt-1">{rec.reason}</p>
                      {rec.potential_savings_tip && (
                        <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
                          <PiggyBank className="w-3 h-3" />
                          {rec.potential_savings_tip}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-500" />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Store className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">{text.noData}</p>
              </div>
            )}
          </div>
        )}

        {/* Tips Section */}
        {activeSection === 'tips' && (
          <div className="p-4 space-y-3">
            {/* Savings Tips */}
            {spendingData?.insights?.tips?.length > 0 && (
              <div className="space-y-3 mb-4">
                <h3 className="text-sm font-medium text-slate-400 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  {language === 'fr' ? 'Conseils d\'Économie' : 'Savings Tips'}
                </h3>
                {spendingData.insights.tips.map((tip, i) => (
                  <div key={i} className="bg-gradient-to-r from-amber-500/10 to-transparent rounded-lg p-3 border-l-2 border-amber-500">
                    <p className="text-sm text-slate-300">{tip}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Actionable Tips */}
            {tips?.tips?.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-slate-400 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  {language === 'fr' ? 'Actions Recommandées' : 'Recommended Actions'}
                </h3>
                {tips.tips.map((tip, i) => (
                  <div key={i} className="bg-slate-900/50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                        {tip.icon === 'users' && <Users className="w-5 h-5 text-amber-400" />}
                        {tip.icon === 'store' && <Store className="w-5 h-5 text-amber-400" />}
                        {tip.icon === 'credit-card' && <CreditCard className="w-5 h-5 text-amber-400" />}
                        {tip.icon === 'smartphone' && <Smartphone className="w-5 h-5 text-amber-400" />}
                        {!['users', 'store', 'credit-card', 'smartphone'].includes(tip.icon) && (
                          <Lightbulb className="w-5 h-5 text-amber-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-white">{tip.title}</p>
                        <p className="text-sm text-slate-400 mt-1">{tip.description}</p>
                        {tip.potential_earnings && (
                          <p className="text-xs text-green-400 mt-2">
                            +GHS {tip.potential_earnings} {language === 'fr' ? 'potentiel' : 'potential'}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-500" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(!spendingData?.insights?.tips?.length && !tips?.tips?.length) && (
              <div className="text-center py-8">
                <Lightbulb className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">{text.noData}</p>
              </div>
            )}
          </div>
        )}

        {/* Security Section */}
        {activeSection === 'security' && (
          <div className="p-4 space-y-4">
            {/* Risk Score */}
            <div className={`rounded-lg p-4 border ${
              security?.risk_level === 'high' ? 'bg-red-500/10 border-red-500/30' :
              security?.risk_level === 'medium' ? 'bg-yellow-500/10 border-yellow-500/30' :
              'bg-green-500/10 border-green-500/30'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShieldCheck className={`w-8 h-8 ${
                    security?.risk_level === 'high' ? 'text-red-400' :
                    security?.risk_level === 'medium' ? 'text-yellow-400' :
                    'text-green-400'
                  }`} />
                  <div>
                    <p className="text-sm text-slate-400">{text.riskLevel}</p>
                    <p className={`text-lg font-bold ${
                      security?.risk_level === 'high' ? 'text-red-400' :
                      security?.risk_level === 'medium' ? 'text-yellow-400' :
                      'text-green-400'
                    }`}>
                      {security?.risk_level === 'high' ? text.high :
                       security?.risk_level === 'medium' ? text.medium :
                       text.low}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-400">Score</p>
                  <p className="text-2xl font-bold text-white">{security?.risk_score || 0}</p>
                </div>
              </div>
            </div>

            {/* Alerts */}
            {security?.alerts?.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-slate-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {language === 'fr' ? 'Alertes Détectées' : 'Detected Alerts'}
                </h3>
                {security.alerts.map((alert, i) => (
                  <div key={i} className={`rounded-lg p-3 border ${
                    alert.severity === 'high' ? 'bg-red-500/10 border-red-500/30' :
                    alert.severity === 'medium' ? 'bg-yellow-500/10 border-yellow-500/30' :
                    'bg-slate-900/50 border-slate-700'
                  }`}>
                    <div className="flex items-start gap-3">
                      <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${
                        alert.severity === 'high' ? 'text-red-400' :
                        alert.severity === 'medium' ? 'text-yellow-400' :
                        'text-slate-400'
                      }`} />
                      <div>
                        <p className="text-sm font-medium text-white capitalize">
                          {alert.type.replace(/_/g, ' ')}
                        </p>
                        <p className="text-sm text-slate-400">{alert.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendation */}
            {security?.recommendation && (
              <div className="bg-slate-900/50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <p className="text-sm text-slate-300">{security.recommendation}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Chat Section */}
        {activeSection === 'chat' && (
          <div className="flex flex-col h-[400px]">
            {/* Chat Messages */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 && (
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 mb-2">
                    {language === 'fr' 
                      ? 'Posez-moi des questions sur vos finances!'
                      : 'Ask me about your finances!'}
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {[
                      language === 'fr' ? 'Comment économiser plus?' : 'How can I save more?',
                      language === 'fr' ? 'Meilleurs marchands?' : 'Best merchants?',
                      language === 'fr' ? 'Analyser mes dépenses' : 'Analyze my spending'
                    ].map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => setChatInput(suggestion)}
                        className="px-3 py-1.5 bg-slate-700 text-slate-300 text-sm rounded-full hover:bg-slate-600 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-lg p-3 ${
                    msg.role === 'user' 
                      ? 'bg-amber-500 text-slate-900' 
                      : 'bg-slate-700 text-slate-200'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-700 rounded-lg p-3">
                    <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-slate-700">
              <div className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                  placeholder={text.chatPlaceholder}
                  className="flex-1 bg-slate-900 border-slate-700 text-white"
                />
                <Button
                  onClick={sendChatMessage}
                  disabled={!chatInput.trim() || isChatLoading}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-900"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
