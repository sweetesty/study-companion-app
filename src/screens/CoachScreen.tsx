import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Send, Trash2, Bot } from 'lucide-react-native';
import { useAppStore, getStreak } from '../store/useAppStore';
import { useToast } from '../components/Toast';
import { useTheme } from '../hooks/useTheme';
import { chatWithCoach } from '../services/aiService';
import { ChatMessage } from '../constants/types';

const QUICK_PROMPTS = [
  "How do I stay focused?",
  "Create a study plan for me",
  "How to memorize better?",
  "I'm feeling overwhelmed",
];

export default function CoachScreen() {
  const { theme } = useTheme();
  const { user, chatMessages, addChatMessage, clearChat, apiKey, tasks, focusSessions, moods, quizResults } = useAppStore();
  const { showToast } = useToast();
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (chatMessages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [chatMessages]);

  const send = async (text: string) => {
    const msgText = text.trim();
    if (!msgText) return;
    if (!apiKey) { showToast('Add your Groq API key in Profile', 'error'); return; }

    addChatMessage({ role: 'user', content: msgText, timestamp: new Date().toISOString() });
    setInput('');
    setTyping(true);

    try {
      const streak = getStreak(tasks, focusSessions);
      const recentMood = moods[0]?.label;
      const recentQuizTopic = quizResults[0]?.topic;

      const history = [...chatMessages, { role: 'user' as const, content: msgText, id: '', timestamp: '' }]
        .slice(-20)
        .map((m) => ({ role: m.role, content: m.content }));

      const reply = await chatWithCoach(apiKey, history, {
        name: user?.name ?? 'Student',
        studyGoal: user?.studyGoal ?? '',
        streak,
        recentMood,
        recentQuizTopic,
      });

      addChatMessage({ role: 'assistant', content: reply, timestamp: new Date().toISOString() });
    } catch (err: any) {
      showToast(err.message ?? 'Coach is unavailable', 'error');
    } finally {
      setTyping(false);
    }
  };

  const s = styles(theme);

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[s.msgRow, isUser ? s.msgRowUser : s.msgRowAI]}>
        {!isUser && (
          <View style={s.aiAvatar}>
            <Bot size={14} color={theme.purple} />
          </View>
        )}
        <View style={[s.bubble, isUser ? s.bubbleUser : s.bubbleAI]}>
          <Text style={[s.bubbleText, { color: isUser ? '#fff' : theme.textPrimary }]}>{item.content}</Text>
          <Text style={[s.timestamp, { color: isUser ? 'rgba(255,255,255,0.6)' : theme.textMuted }]}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
      {/* Header */}
      <LinearGradient colors={['#1a0d2d', theme.background]} style={s.header}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.headerTitle}>AI Study Coach</Text>
            <View style={s.onlineRow}>
              <View style={s.onlineDot} />
              <Text style={s.onlineText}>Sage · Online</Text>
            </View>
          </View>
          {chatMessages.length > 0 && (
            <TouchableOpacity onPress={() => { clearChat(); showToast('Chat cleared', 'info'); }}>
              <Trash2 size={20} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Messages */}
      {chatMessages.length === 0 ? (
        <View style={s.emptyWrap}>
          <Text style={s.emptyEmoji}>🤖</Text>
          <Text style={s.emptyTitle}>Hi, I'm Sage!</Text>
          <Text style={s.emptySub}>Your personal AI study coach. Ask me anything about studying, time management, or your academic goals.</Text>
          <View style={s.quickPromptsWrap}>
            {QUICK_PROMPTS.map((p) => (
              <TouchableOpacity key={p} style={[s.quickBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => send(p)} activeOpacity={0.8}>
                <Text style={[s.quickText, { color: theme.textSecondary }]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={chatMessages}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          contentContainerStyle={s.msgList}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            typing ? (
              <View style={[s.msgRow, s.msgRowAI]}>
                <View style={s.aiAvatar}><Bot size={14} color={theme.purple} /></View>
                <View style={[s.bubble, s.bubbleAI, s.typingBubble]}>
                  <ActivityIndicator size="small" color={theme.purple} />
                  <Text style={[s.bubbleText, { color: theme.textMuted }]}> Sage is thinking...</Text>
                </View>
              </View>
            ) : null
          }
        />
      )}

      {/* Quick prompts (shown when there are messages) */}
      {chatMessages.length > 0 && (
        <View style={s.quickRow}>
          {QUICK_PROMPTS.slice(0, 2).map((p) => (
            <TouchableOpacity key={p} style={[s.quickChip, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => send(p)} activeOpacity={0.8}>
              <Text style={[s.quickChipText, { color: theme.textSecondary }]} numberOfLines={1}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Input */}
      <View style={[s.inputRow, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        <TextInput
          style={[s.input, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.inputBorder }]}
          placeholder="Ask Sage anything..."
          placeholderTextColor={theme.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={1000}
          onSubmitEditing={() => send(input)}
        />
        <TouchableOpacity
          style={[s.sendBtn, { opacity: input.trim() && !typing ? 1 : 0.4 }]}
          onPress={() => send(input)}
          disabled={!input.trim() || typing}
          activeOpacity={0.8}
        >
          <LinearGradient colors={theme.gradient} style={s.sendGrad}>
            <Send size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.background },
    header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 24 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    headerTitle: { color: theme.textPrimary, fontSize: 22, fontWeight: '700' },
    onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.green },
    onlineText: { color: theme.green, fontSize: 12, fontWeight: '600' },
    msgList: { padding: 16, paddingBottom: 8 },
    msgRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
    msgRowUser: { justifyContent: 'flex-end' },
    msgRowAI: { justifyContent: 'flex-start', gap: 8 },
    aiAvatar: {
      width: 28, height: 28, borderRadius: 14,
      backgroundColor: theme.purple + '22', borderWidth: 1, borderColor: theme.purple + '44',
      alignItems: 'center', justifyContent: 'center',
    },
    bubble: { maxWidth: '78%', borderRadius: 18, padding: 12 },
    bubbleUser: { backgroundColor: theme.blue, borderBottomRightRadius: 4 },
    bubbleAI: { backgroundColor: theme.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: theme.border },
    typingBubble: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    bubbleText: { fontSize: 15, lineHeight: 22 },
    timestamp: { fontSize: 10, marginTop: 4 },
    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    emptyEmoji: { fontSize: 56, marginBottom: 16 },
    emptyTitle: { color: theme.textPrimary, fontSize: 22, fontWeight: '700', marginBottom: 8 },
    emptySub: { color: theme.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
    quickPromptsWrap: { width: '100%', gap: 8 },
    quickBtn: { borderRadius: 12, padding: 14, borderWidth: 1 },
    quickText: { fontSize: 14 },
    quickRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
    quickChip: { flex: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
    quickChipText: { fontSize: 12, textAlign: 'center' },
    inputRow: { flexDirection: 'row', gap: 10, padding: 12, borderTopWidth: 1 },
    input: {
      flex: 1, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10,
      fontSize: 15, maxHeight: 100, borderWidth: 1,
    },
    sendBtn: { alignSelf: 'flex-end', borderRadius: 22, overflow: 'hidden' },
    sendGrad: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  });
