import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';

export default function AIAssistantScreen({ navigation }) {
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('insights');
  const [data, setData] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollViewRef = useRef(null);
  const chatScrollRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/api/ai/dashboard?language=en');
      setData(response.data);
    } catch (error) {
      console.error('Error loading AI data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isSending) return;
    
    const userMessage = inputMessage.trim();
    setInputMessage('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsSending(true);

    try {
      const response = await api.post('/api/ai/chat', {
        message: userMessage,
        language: 'en'
      });
      
      if (response.data?.response) {
        setChatMessages(prev => [...prev, { 
          role: 'assistant', 
          content: response.data.response 
        }]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="sparkles" size={48} color="#a855f7" />
          <Text style={styles.loadingText}>Loading AI Assistant...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const analysis = data?.analysis || {};
  const insights = data?.insights || {};
  const recommendations = data?.recommendations || [];
  const fraudAlerts = data?.fraud_alerts || [];
  const savingsScore = insights.savings_score || 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="sparkles" size={20} color="#a855f7" />
          <Text style={styles.headerTitle}>AI Assistant</Text>
        </View>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {[
          { id: 'insights', label: 'Insights', icon: 'analytics' },
          { id: 'tips', label: 'Tips', icon: 'bulb' },
          { id: 'chat', label: 'Chat', icon: 'chatbubbles' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.activeTab]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons
              name={tab.icon}
              size={18}
              color={activeTab === tab.id ? '#0f172a' : '#94a3b8'}
            />
            <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Insights Tab */}
      {activeTab === 'insights' && (
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#a855f7" />
          }
        >
          {/* Savings Score */}
          <LinearGradient
            colors={['rgba(168, 85, 247, 0.2)', 'rgba(168, 85, 247, 0.05)']}
            style={styles.scoreCard}
          >
            <View style={styles.scoreHeader}>
              <Text style={styles.scoreLabel}>Your Savings Score</Text>
              <Ionicons name="trophy" size={24} color="#f59e0b" />
            </View>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreValue}>{savingsScore}</Text>
              <Text style={styles.scoreMax}>/100</Text>
            </View>
            <Text style={styles.scoreDescription}>
              {savingsScore >= 80 ? 'Excellent! You\'re a savings champion!' :
               savingsScore >= 60 ? 'Good job! Keep optimizing.' :
               savingsScore >= 40 ? 'Room for improvement. Check our tips!' :
               'Let\'s work on boosting your score!'}
            </Text>
          </LinearGradient>

          {/* AI Summary */}
          {insights.summary && (
            <View style={styles.summaryCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="sparkles" size={20} color="#a855f7" />
                <Text style={styles.cardTitle}>AI Analysis</Text>
              </View>
              <Text style={styles.summaryText}>{insights.summary}</Text>
            </View>
          )}

          {/* Key Patterns */}
          {insights.patterns?.length > 0 && (
            <View style={styles.patternsCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="eye" size={20} color="#3b82f6" />
                <Text style={styles.cardTitle}>Key Observations</Text>
              </View>
              {insights.patterns.map((pattern, i) => (
                <View key={i} style={styles.patternItem}>
                  <View style={styles.patternDot} />
                  <Text style={styles.patternText}>{pattern}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Spending Stats */}
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Ionicons name="cart" size={24} color="#f59e0b" />
              <Text style={styles.statValue}>{analysis.total_transactions || 0}</Text>
              <Text style={styles.statLabel}>Transactions</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="trending-down" size={24} color="#22c55e" />
              <Text style={[styles.statValue, { color: '#22c55e' }]}>
                GHS {(analysis.total_spent || 0).toFixed(0)}
              </Text>
              <Text style={styles.statLabel}>Total Spent</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="gift" size={24} color="#a855f7" />
              <Text style={[styles.statValue, { color: '#a855f7' }]}>
                GHS {(analysis.total_cashback || 0).toFixed(2)}
              </Text>
              <Text style={styles.statLabel}>Cashback</Text>
            </View>
          </View>

          {/* Fraud Alerts */}
          {fraudAlerts.length > 0 && (
            <View style={styles.alertsCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="shield" size={20} color="#ef4444" />
                <Text style={[styles.cardTitle, { color: '#ef4444' }]}>Security Alerts</Text>
              </View>
              {fraudAlerts.map((alert, i) => (
                <View key={i} style={styles.alertItem}>
                  <Ionicons name="warning" size={16} color="#f59e0b" />
                  <Text style={styles.alertText}>{alert.description}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Tips Tab */}
      {activeTab === 'tips' && (
        <ScrollView style={styles.scrollView}>
          {/* Savings Tips */}
          {insights.tips?.length > 0 && (
            <View style={styles.tipsSection}>
              <View style={styles.cardHeader}>
                <Ionicons name="bulb" size={20} color="#f59e0b" />
                <Text style={styles.cardTitle}>Savings Tips</Text>
              </View>
              {insights.tips.map((tip, i) => (
                <View key={i} style={styles.tipItem}>
                  <View style={styles.tipNumber}>
                    <Text style={styles.tipNumberText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <View style={styles.recsSection}>
              <View style={styles.cardHeader}>
                <Ionicons name="star" size={20} color="#a855f7" />
                <Text style={styles.cardTitle}>Recommended For You</Text>
              </View>
              {recommendations.map((rec, i) => (
                <View key={i} style={styles.recCard}>
                  <View style={styles.recIcon}>
                    <Ionicons name="storefront" size={20} color="#3b82f6" />
                  </View>
                  <View style={styles.recInfo}>
                    <Text style={styles.recName}>{rec.merchant_name}</Text>
                    <Text style={styles.recReason}>{rec.reason}</Text>
                  </View>
                  {rec.potential_savings > 0 && (
                    <View style={styles.recSavings}>
                      <Text style={styles.recSavingsText}>
                        Save GHS {rec.potential_savings.toFixed(0)}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Cashback Tips */}
          <View style={styles.cashbackTips}>
            <View style={styles.cardHeader}>
              <Ionicons name="cash" size={20} color="#22c55e" />
              <Text style={styles.cardTitle}>Maximize Cashback</Text>
            </View>
            <View style={styles.cashbackItem}>
              <Ionicons name="people" size={18} color="#f59e0b" />
              <Text style={styles.cashbackText}>Refer friends to earn bonus cashback</Text>
            </View>
            <View style={styles.cashbackItem}>
              <Ionicons name="card" size={18} color="#a855f7" />
              <Text style={styles.cashbackText}>Upgrade to VIP card for higher rates</Text>
            </View>
            <View style={styles.cashbackItem}>
              <Ionicons name="flag" size={18} color="#3b82f6" />
              <Text style={styles.cashbackText}>Complete daily missions for XP & rewards</Text>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Chat Tab */}
      {activeTab === 'chat' && (
        <KeyboardAvoidingView 
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={100}
        >
          <ScrollView 
            ref={chatScrollRef}
            style={styles.chatMessages}
            onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
          >
            {/* Welcome Message */}
            {chatMessages.length === 0 && (
              <View style={styles.welcomeMessage}>
                <View style={styles.welcomeIcon}>
                  <Ionicons name="sparkles" size={32} color="#a855f7" />
                </View>
                <Text style={styles.welcomeTitle}>Hi! I'm your AI Assistant</Text>
                <Text style={styles.welcomeText}>
                  Ask me anything about your spending, cashback, or how to save more!
                </Text>
                <View style={styles.suggestedQuestions}>
                  {[
                    'How can I earn more cashback?',
                    'Analyze my spending this month',
                    'What merchants should I visit?'
                  ].map((q, i) => (
                    <TouchableOpacity 
                      key={i}
                      style={styles.suggestedBtn}
                      onPress={() => {
                        setInputMessage(q);
                      }}
                    >
                      <Text style={styles.suggestedText}>{q}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Messages */}
            {chatMessages.map((msg, i) => (
              <View 
                key={i} 
                style={[
                  styles.messageContainer,
                  msg.role === 'user' ? styles.userMessage : styles.assistantMessage
                ]}
              >
                {msg.role === 'assistant' && (
                  <View style={styles.assistantAvatar}>
                    <Ionicons name="sparkles" size={16} color="#a855f7" />
                  </View>
                )}
                <View style={[
                  styles.messageBubble,
                  msg.role === 'user' ? styles.userBubble : styles.assistantBubble
                ]}>
                  <Text style={[
                    styles.messageText,
                    msg.role === 'user' && styles.userMessageText
                  ]}>
                    {msg.content}
                  </Text>
                </View>
              </View>
            ))}

            {isSending && (
              <View style={[styles.messageContainer, styles.assistantMessage]}>
                <View style={styles.assistantAvatar}>
                  <Ionicons name="sparkles" size={16} color="#a855f7" />
                </View>
                <View style={[styles.messageBubble, styles.assistantBubble]}>
                  <ActivityIndicator size="small" color="#a855f7" />
                </View>
              </View>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Chat Input */}
          <View style={styles.chatInputContainer}>
            <TextInput
              style={styles.chatInput}
              placeholder="Ask me anything..."
              placeholderTextColor="#64748b"
              value={inputMessage}
              onChangeText={setInputMessage}
              multiline
              maxLength={500}
            />
            <TouchableOpacity 
              style={[styles.sendButton, !inputMessage.trim() && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!inputMessage.trim() || isSending}
            >
              <Ionicons name="send" size={20} color={inputMessage.trim() ? '#fff' : '#64748b'} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    padding: 8,
    gap: 8,
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#a855f7',
  },
  tabText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#0f172a',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  scoreCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },
  scoreCircle: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 8,
  },
  scoreValue: {
    color: '#fff',
    fontSize: 56,
    fontWeight: '700',
  },
  scoreMax: {
    color: '#64748b',
    fontSize: 20,
  },
  scoreDescription: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  summaryText: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 22,
  },
  patternsCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  patternItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  patternDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3b82f6',
    marginTop: 6,
  },
  patternText: {
    color: '#94a3b8',
    fontSize: 14,
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  statLabel: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 4,
  },
  alertsCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: 16,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  alertText: {
    color: '#fca5a5',
    fontSize: 13,
    flex: 1,
  },
  tipsSection: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  tipNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f59e0b20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipNumberText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '600',
  },
  tipText: {
    color: '#94a3b8',
    fontSize: 14,
    flex: 1,
  },
  recsSection: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  recCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  recIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f620',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recInfo: {
    flex: 1,
    marginLeft: 12,
  },
  recName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  recReason: {
    color: '#64748b',
    fontSize: 12,
  },
  recSavings: {
    backgroundColor: '#22c55e20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  recSavingsText: {
    color: '#22c55e',
    fontSize: 11,
    fontWeight: '500',
  },
  cashbackTips: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cashbackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  cashbackText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  chatContainer: {
    flex: 1,
  },
  chatMessages: {
    flex: 1,
    padding: 16,
  },
  welcomeMessage: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  welcomeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#a855f720',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  welcomeText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  suggestedQuestions: {
    gap: 8,
    width: '100%',
  },
  suggestedBtn: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  suggestedText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  assistantMessage: {
    justifyContent: 'flex-start',
  },
  assistantAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#a855f720',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#a855f7',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#1e293b',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    color: '#e2e8f0',
    fontSize: 14,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#fff',
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    paddingBottom: 24,
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    gap: 12,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#a855f7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#334155',
  },
});
