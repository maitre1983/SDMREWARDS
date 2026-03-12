import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Brain,
  Sparkles,
  TrendingUp,
  Lightbulb,
  ShieldCheck,
  ChevronRight,
  Loader2,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

// API URL imported from config
import { API_URL } from '@/config/api';

export default function AIWidget({ clientToken, language = 'en', onViewMore }) {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(null);

  const t = {
    en: {
      title: 'AI Insights',
      viewMore: 'View AI Assistant',
      tip: 'Quick Tip',
      security: 'Security',
      spending: 'Spending',
      secure: 'Secure',
      review: 'Review'
    },
    fr: {
      title: 'Insights IA',
      viewMore: 'Voir Assistant IA',
      tip: 'Conseil Rapide',
      security: 'Sécurité',
      spending: 'Dépenses',
      secure: 'Sécurisé',
      review: 'À Vérifier'
    }
  };

  const text = t[language] || t.en;

  useEffect(() => {
    if (clientToken) {
      loadData();
    }
  }, [clientToken]);

  const loadData = async () => {
    if (!clientToken) return;
    try {
      const response = await axios.get(`${API_URL}/api/ai/dashboard?language=${language}`, {
        headers: { Authorization: `Bearer ${clientToken}` }
      });
      setData(response.data);
    } catch (error) {
      console.error('Error loading AI widget data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-amber-500/10 to-purple-500/10 rounded-xl p-4 border border-amber-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
          </div>
          <div className="flex-1">
            <div className="h-4 bg-slate-700 rounded w-24 animate-pulse"></div>
            <div className="h-3 bg-slate-700 rounded w-32 mt-2 animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  const spending = data?.spending_analysis;
  const tips = data?.cashback_tips;
  const security = data?.security_status;

  // Get first tip if available
  const quickTip = spending?.insights?.tips?.[0] || tips?.tips?.[0]?.description;
  const score = spending?.insights?.score;
  const isSecure = security?.risk_level === 'low';

  return (
    <div 
      onClick={onViewMore}
      className="bg-gradient-to-r from-amber-500/10 to-purple-500/10 rounded-xl p-4 border border-amber-500/20 cursor-pointer hover:border-amber-500/40 transition-all group"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-purple-500 flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <span className="font-medium text-white">{text.title}</span>
          <Sparkles className="w-4 h-4 text-amber-400" />
        </div>
        <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-amber-400 transition-colors" />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Score/Spending */}
        {score && (
          <div className="bg-slate-900/50 rounded-lg p-2">
            <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
              <TrendingUp className="w-3 h-3" />
              {text.spending}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-amber-400">{score}</span>
              <span className="text-xs text-slate-500">/100</span>
            </div>
          </div>
        )}

        {/* Security Status */}
        <div className="bg-slate-900/50 rounded-lg p-2">
          <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
            <ShieldCheck className="w-3 h-3" />
            {text.security}
          </div>
          <div className="flex items-center gap-1">
            {isSecure ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium text-green-400">{text.secure}</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-medium text-yellow-400">{text.review}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick Tip */}
      {quickTip && (
        <div className="mt-3 flex items-start gap-2 bg-slate-900/30 rounded-lg p-2">
          <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-400 line-clamp-2">{quickTip}</p>
        </div>
      )}

      {/* CTA */}
      <div className="mt-3 text-center">
        <span className="text-xs text-amber-400 group-hover:underline">{text.viewMore} →</span>
      </div>
    </div>
  );
}
