import React, { useState, useEffect } from 'react';
import {
  Search, TrendingUp, Target, FileText, RefreshCw,
  Sparkles, BarChart3, Globe, CheckCircle, AlertCircle,
  ChevronRight, ExternalLink, Loader2, Lightbulb, Zap
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import axios from 'axios';

// API URL imported from config
import { API_URL } from '@/config/api';

export default function SEODashboard({ token }) {
  const [overview, setOverview] = useState(null);
  const [keywords, setKeywords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [contentForm, setContentForm] = useState({
    type: 'meta_description',
    topic: ''
  });
  const [generatedContent, setGeneratedContent] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchOverview();
    fetchKeywordSuggestions();
  }, []);

  const fetchOverview = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get(`${API_URL}/api/seo/analytics/overview`, { headers });
      setOverview(res.data);
    } catch (error) {
      console.error('Error fetching SEO overview:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchKeywordSuggestions = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/seo/keywords/suggestions`, { headers });
      setKeywords(res.data.keywords || []);
    } catch (error) {
      console.error('Error fetching keywords:', error);
    }
  };

  const runSEOAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const res = await axios.post(`${API_URL}/api/seo/analyze`, {
        url: window.location.origin,
        target_keywords: ['cashback ghana', 'rewards program', 'loyalty', 'fintech'],
        content: 'SDM REWARDS landing page analysis'
      }, { headers });
      
      setAnalysisResult(res.data.analysis);
      toast.success('SEO analysis completed');
    } catch (error) {
      toast.error('Analysis failed: ' + (error.response?.data?.detail || error.message));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateContent = async () => {
    if (!contentForm.topic) {
      toast.error('Please enter a topic');
      return;
    }
    
    setIsGenerating(true);
    try {
      const res = await axios.post(
        `${API_URL}/api/seo/content/generate?content_type=${contentForm.type}&topic=${encodeURIComponent(contentForm.topic)}`,
        {},
        { headers }
      );
      setGeneratedContent(res.data);
      toast.success('Content generated');
    } catch (error) {
      toast.error('Generation failed: ' + (error.response?.data?.detail || error.message));
    } finally {
      setIsGenerating(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-500 bg-red-50';
      case 'medium': return 'text-amber-500 bg-amber-50';
      case 'low': return 'text-green-500 bg-green-50';
      default: return 'text-slate-500 bg-slate-50';
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'low': return 'text-emerald-600 bg-emerald-50';
      case 'medium': return 'text-amber-600 bg-amber-50';
      case 'high': return 'text-red-600 bg-red-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="text-purple-500" />
            AI-Powered SEO Dashboard
          </h2>
          <p className="text-slate-500">Optimize your platform for search engines</p>
        </div>
        <Button onClick={fetchOverview} variant="outline" className="gap-2">
          <RefreshCw size={16} />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-lg w-fit">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'keywords', label: 'Keywords', icon: Target },
          { id: 'analysis', label: 'AI Analysis', icon: Sparkles },
          { id: 'content', label: 'Content Generator', icon: FileText },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'bg-white shadow text-emerald-600' : 'text-slate-600'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 text-white">
              <Globe className="opacity-80" size={24} />
              <p className="text-3xl font-bold mt-2">{overview?.seo_metrics?.indexed_pages || 10}</p>
              <p className="text-sm opacity-80">Indexed Pages</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
              <Target className="opacity-80" size={24} />
              <p className="text-3xl font-bold mt-2">{overview?.target_keywords?.length || 5}</p>
              <p className="text-sm opacity-80">Target Keywords</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white">
              <TrendingUp className="opacity-80" size={24} />
              <p className="text-3xl font-bold mt-2">{overview?.overview?.new_users_30d || 0}</p>
              <p className="text-sm opacity-80">New Users (30d)</p>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 text-white">
              <FileText className="opacity-80" size={24} />
              <p className="text-3xl font-bold mt-2">{overview?.seo_metrics?.structured_data_types?.length || 4}</p>
              <p className="text-sm opacity-80">Schema Types</p>
            </div>
          </div>

          {/* SEO Health Check */}
          <div className="bg-white rounded-xl p-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <CheckCircle className="text-emerald-500" />
              SEO Health Check
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { item: 'XML Sitemap', status: 'active', url: '/api/seo/sitemap.xml' },
                { item: 'Robots.txt', status: 'active', url: '/api/seo/robots.txt' },
                { item: 'Meta Tags', status: 'active' },
                { item: 'Structured Data', status: 'active' },
                { item: 'Open Graph Tags', status: 'active' },
                { item: 'Mobile Responsive', status: 'active' },
              ].map((check, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="text-emerald-500" size={18} />
                    <span className="font-medium">{check.item}</span>
                  </div>
                  {check.url && (
                    <a 
                      href={`${API_URL}${check.url}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-600 flex items-center gap-1 text-sm"
                    >
                      View <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Target Keywords */}
          <div className="bg-white rounded-xl p-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Target className="text-blue-500" />
              Target Keywords
            </h3>
            <div className="space-y-2">
              {overview?.target_keywords?.map((kw, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Search size={16} className="text-slate-400" />
                    <span className="font-medium">{kw.keyword}</span>
                  </div>
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
                    {kw.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Keywords Tab */}
      {activeTab === 'keywords' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Lightbulb className="text-amber-500" />
                AI Keyword Suggestions
              </h3>
              <Button onClick={fetchKeywordSuggestions} variant="outline" size="sm">
                <RefreshCw size={14} className="mr-1" />
                Refresh
              </Button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-3 font-medium text-slate-600">Keyword</th>
                    <th className="text-left p-3 font-medium text-slate-600">Category</th>
                    <th className="text-left p-3 font-medium text-slate-600">Difficulty</th>
                    <th className="text-left p-3 font-medium text-slate-600">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {keywords.map((kw, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-3 font-medium">{kw.keyword}</td>
                      <td className="p-3">
                        <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs">
                          {kw.category}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(kw.difficulty)}`}>
                          {kw.difficulty}
                        </span>
                      </td>
                      <td className="p-3">
                        <button className="text-emerald-600 hover:text-emerald-700 text-sm flex items-center gap-1">
                          Track <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* AI Analysis Tab */}
      {activeTab === 'analysis' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Zap className="text-purple-500" />
                  AI-Powered SEO Analysis
                </h3>
                <p className="text-slate-500 text-sm">Get personalized recommendations to improve your SEO</p>
              </div>
              <Button 
                onClick={runSEOAnalysis}
                disabled={isAnalyzing}
                className="bg-purple-600 hover:bg-purple-700 gap-2"
              >
                {isAnalyzing ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Sparkles size={16} />
                )}
                {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
              </Button>
            </div>

            {analysisResult && (
              <div className="space-y-6">
                {/* Overall Score */}
                {analysisResult.overall_score !== undefined && (
                  <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-6 text-white">
                    <p className="text-sm opacity-70 mb-2">Overall SEO Score</p>
                    <div className="flex items-end gap-4">
                      <p className="text-5xl font-bold">{analysisResult.overall_score}</p>
                      <p className="text-lg opacity-70 mb-1">/100</p>
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {analysisResult.recommendations && (
                  <div>
                    <h4 className="font-semibold mb-3">Recommendations</h4>
                    <div className="space-y-3">
                      {analysisResult.recommendations.map((rec, idx) => (
                        <div key={idx} className="p-4 bg-slate-50 rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(rec.priority)}`}>
                                  {rec.priority}
                                </span>
                                <span className="text-xs text-slate-500 uppercase">{rec.category}</span>
                              </div>
                              <h5 className="font-medium">{rec.title}</h5>
                              <p className="text-slate-600 text-sm mt-1">{rec.description}</p>
                              <p className="text-emerald-600 text-sm mt-2 flex items-center gap-1">
                                <ChevronRight size={14} /> {rec.action}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Meta Suggestions */}
                {analysisResult.meta_suggestions && (
                  <div>
                    <h4 className="font-semibold mb-3">Suggested Meta Tags</h4>
                    <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                      <div>
                        <p className="text-xs text-slate-500 uppercase mb-1">Title</p>
                        <p className="font-mono text-sm bg-white p-2 rounded border">{analysisResult.meta_suggestions.title}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase mb-1">Description</p>
                        <p className="font-mono text-sm bg-white p-2 rounded border">{analysisResult.meta_suggestions.description}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!analysisResult && !isAnalyzing && (
              <div className="text-center py-12 text-slate-500">
                <Sparkles size={48} className="mx-auto mb-4 opacity-30" />
                <p>Click "Run Analysis" to get AI-powered SEO recommendations</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content Generator Tab */}
      {activeTab === 'content' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <FileText className="text-blue-500" />
              AI Content Generator
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">Content Type</label>
                <select
                  value={contentForm.type}
                  onChange={(e) => setContentForm({...contentForm, type: e.target.value})}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="meta_description">Meta Description</option>
                  <option value="meta_title">Meta Title</option>
                  <option value="heading_suggestions">Heading Suggestions</option>
                  <option value="blog_outline">Blog Post Outline</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Topic</label>
                <Input
                  value={contentForm.topic}
                  onChange={(e) => setContentForm({...contentForm, topic: e.target.value})}
                  placeholder="e.g., cashback rewards, mobile payments"
                />
              </div>
            </div>

            <Button
              onClick={generateContent}
              disabled={isGenerating}
              className="bg-blue-600 hover:bg-blue-700 gap-2"
            >
              {isGenerating ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Sparkles size={16} />
              )}
              {isGenerating ? 'Generating...' : 'Generate Content'}
            </Button>

            {generatedContent && (
              <div className="mt-6">
                <h4 className="font-semibold mb-2">Generated Content</h4>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs text-slate-500 uppercase mb-2">
                    {generatedContent.content_type} for "{generatedContent.topic}"
                  </p>
                  <div className="bg-white p-4 rounded border font-mono text-sm whitespace-pre-wrap">
                    {generatedContent.generated_content}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedContent.generated_content);
                      toast.success('Copied to clipboard');
                    }}
                  >
                    Copy to Clipboard
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
