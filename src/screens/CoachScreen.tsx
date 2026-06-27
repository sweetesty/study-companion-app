import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import {
  Send, Trash2, Bot, Sparkles, Calendar, Clock,
  CheckCircle, Plus, Minus, ClipboardList, ChevronRight,
} from 'lucide-react-native';
import { useAppStore, getStreak } from '../store/useAppStore';
import { useToast } from '../components/Toast';
import { useTheme } from '../hooks/useTheme';
import { chatWithCoach, generateStudyPlan, hasGroqKey } from '../services/aiService';
import { ChatMessage } from '../constants/types';

type Mode = 'chat' | 'plan';

const QUICK_PROMPTS = [
  "How do I stay focused?",
  "Tips for memorizing faster",
  "I'm feeling overwhelmed",
  "Best study techniques?",
];

function todayStr() { return new Date().toISOString().slice(0, 10); }
function addDays(n: number) {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function formatDate(d: string) {
  if (!d) return '';
  const [, m, day] = d.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m)-1]} ${parseInt(day)}`;
}

export default function CoachScreen() {
  const { theme } = useTheme();
  const nav = useNavigation<any>();
  const { user, chatMessages, addChatMessage, clearChat, addTask, apiKey, tasks, focusSessions, moods, quizResults } = useAppStore();
  const { showToast } = useToast();

  const [mode, setMode] = useState<Mode>('chat');

  // ── Chat state ──────────────────────────────────────────────────────────────
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
    if (!hasGroqKey(apiKey)) { showToast('Add your Groq API key in Profile', 'error'); return; }
    addChatMessage({ role: 'user', content: msgText, timestamp: new Date().toISOString() });
    setInput('');
    Keyboard.dismiss();
    setTyping(true);
    try {
      const streak = getStreak(tasks, focusSessions);
      const history = [...chatMessages, { role: 'user' as const, content: msgText, id: '', timestamp: '' }]
        .slice(-20).map((m) => ({ role: m.role, content: m.content }));
      const reply = await chatWithCoach(apiKey, history, {
        name: user?.name ?? 'Student', studyGoal: user?.studyGoal ?? '',
        streak, recentMood: moods[0]?.label, recentQuizTopic: quizResults[0]?.topic,
      });
      addChatMessage({ role: 'assistant', content: reply, timestamp: new Date().toISOString() });
    } catch (err: any) {
      showToast(err.message ?? 'Coach is unavailable', 'error');
    } finally { setTyping(false); }
  };

  // ── Plan state ──────────────────────────────────────────────────────────────
  const [goal, setGoal] = useState('');
  const [deadline, setDeadline] = useState(addDays(3));
  const [sessionsPerDay, setSessionsPerDay] = useState(2);
  const [planLoading, setPlanLoading] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<{
    summary: string;
    tasks: { title: string; description: string; dueDate: string; duration: number }[];
  } | null>(null);
  const [addedToPlanner, setAddedToPlanner] = useState(false);

  const generatePlan = async () => {
    if (!goal.trim()) { showToast('Describe what you want to study', 'error'); return; }
    if (!hasGroqKey(apiKey)) { showToast('Add your Groq API key in Profile', 'error'); return; }
    if (deadline < todayStr()) { showToast('Deadline must be today or later', 'error'); return; }
    setPlanLoading(true);
    setGeneratedPlan(null);
    setAddedToPlanner(false);
    try {
      const plan = await generateStudyPlan(apiKey, goal.trim(), deadline, sessionsPerDay);
      setGeneratedPlan(plan);
    } catch (err: any) {
      showToast(err.message ?? 'Could not generate plan', 'error');
    } finally { setPlanLoading(false); }
  };

  const addAllToPlanner = () => {
    if (!generatedPlan) return;
    generatedPlan.tasks.forEach((t) => {
      addTask({ title: t.title, description: `${t.description} (${t.duration} min)`, dueDate: t.dueDate });
    });
    setAddedToPlanner(true);
    showToast(`${generatedPlan.tasks.length} tasks added to Planner!`, 'success');
  };

  const s = styles(theme);

  return (
    <View style={[s.root, { backgroundColor: theme.background }]}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <LinearGradient colors={theme.headerGradient} style={s.header}>
        <View style={s.headerTop}>
          <View style={s.headerLeft}>
            <LinearGradient colors={['#6c47ff', '#2563eb']} style={s.avatarOrb}>
              <Bot size={20} color="#fff" />
            </LinearGradient>
            <View>
              <Text style={s.headerTitle}>Sage</Text>
              <View style={s.onlineRow}>
                <View style={s.onlineDot} />
                <Text style={s.onlineText}>AI Study Coach · Online</Text>
              </View>
            </View>
          </View>
          {mode === 'chat' && chatMessages.length > 0 && (
            <TouchableOpacity onPress={() => { clearChat(); showToast('Chat cleared', 'info'); }}>
              <Trash2 size={18} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Mode tabs */}
        <View style={s.modeTabs}>
          <TouchableOpacity
            style={[s.modeTab, mode === 'chat' && s.modeTabActive]}
            onPress={() => setMode('chat')}
          >
            <Bot size={14} color={mode === 'chat' ? '#fff' : theme.textMuted} />
            <Text style={[s.modeTabText, { color: mode === 'chat' ? '#fff' : theme.textMuted }]}>Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.modeTab, mode === 'plan' && s.modeTabActive]}
            onPress={() => setMode('plan')}
          >
            <Sparkles size={14} color={mode === 'plan' ? '#fff' : theme.textMuted} />
            <Text style={[s.modeTabText, { color: mode === 'plan' ? '#fff' : theme.textMuted }]}>Study Plan</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ── CHAT MODE ── */}
      {mode === 'chat' && (
        <>
          {chatMessages.length === 0 ? (
            <View style={s.emptyWrap}>
              <Text style={s.emptyEmoji}>🤖</Text>
              <Text style={[s.emptyTitle, { color: theme.textPrimary }]}>Hi, I'm Sage!</Text>
              <Text style={[s.emptySub, { color: theme.textSecondary }]}>
                Your personal AI study coach. Ask me anything about studying, or use the{' '}
                <Text style={{ color: '#6c47ff', fontWeight: '700' }}>Study Plan</Text> tab to build a real plan.
              </Text>
              <View style={s.quickPromptsWrap}>
                {QUICK_PROMPTS.map((p) => (
                  <TouchableOpacity key={p} style={[s.quickBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => send(p)} activeOpacity={0.8}>
                    <Text style={[s.quickText, { color: theme.textSecondary }]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {/* Plan CTA */}
              <TouchableOpacity
                style={s.planCta}
                onPress={() => setMode('plan')}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#6c47ff', '#2563eb']} style={s.planCtaGrad}>
                  <Sparkles size={16} color="#fff" />
                  <Text style={s.planCtaText}>Generate a personalised study plan →</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={chatMessages}
              keyExtractor={(m) => m.id}
              renderItem={({ item }) => {
                const isUser = item.role === 'user';
                return (
                  <View style={[s.msgRow, isUser ? s.msgRowUser : s.msgRowAI]}>
                    {!isUser && (
                      <LinearGradient colors={['#6c47ff', '#2563eb']} style={s.aiAvatar}>
                        <Bot size={13} color="#fff" />
                      </LinearGradient>
                    )}
                    <View style={[s.bubble, isUser ? s.bubbleUser : [s.bubbleAI, { backgroundColor: theme.surface, borderColor: theme.border }]]}>
                      <Text style={[s.bubbleText, { color: isUser ? '#fff' : theme.textPrimary }]}>{item.content}</Text>
                      <Text style={[s.timestamp, { color: isUser ? 'rgba(255,255,255,0.55)' : theme.textMuted }]}>
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                );
              }}
              contentContainerStyle={s.msgList}
              showsVerticalScrollIndicator={false}
              ListFooterComponent={
                typing ? (
                  <View style={[s.msgRow, s.msgRowAI]}>
                    <LinearGradient colors={['#6c47ff', '#2563eb']} style={s.aiAvatar}>
                      <Bot size={13} color="#fff" />
                    </LinearGradient>
                    <View style={[s.bubble, s.bubbleAI, s.typingBubble, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <ActivityIndicator size="small" color="#6c47ff" />
                      <Text style={[s.bubbleText, { color: theme.textMuted }]}> Sage is thinking…</Text>
                    </View>
                  </View>
                ) : null
              }
            />
          )}

          {chatMessages.length > 0 && (
            <View style={s.quickRow}>
              {QUICK_PROMPTS.slice(0, 2).map((p) => (
                <TouchableOpacity key={p} style={[s.quickChip, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => send(p)} activeOpacity={0.8}>
                  <Text style={[s.quickChipText, { color: theme.textSecondary }]} numberOfLines={1}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={[s.inputRow, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
            <TextInput
              style={[s.input, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.inputBorder }]}
              placeholder="Ask Sage anything…"
              placeholderTextColor={theme.textMuted}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[s.sendBtn, { opacity: input.trim() && !typing ? 1 : 0.35 }]}
              onPress={() => send(input)}
              disabled={!input.trim() || typing}
              activeOpacity={0.8}
            >
              <LinearGradient colors={['#6c47ff', '#2563eb']} style={s.sendGrad}>
                <Send size={17} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ── PLAN MODE ── */}
      {mode === 'plan' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.planScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Intro */}
          <View style={[s.planIntro, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={s.planIntroEmoji}>🧠</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.planIntroTitle, { color: theme.textPrimary }]}>AI Study Planner</Text>
              <Text style={[s.planIntroSub, { color: theme.textSecondary }]}>
                Tell Sage what you need to study. It'll build a day-by-day plan and add it straight to your Planner.
              </Text>
            </View>
          </View>

          {/* Goal input */}
          <Text style={[s.fieldLabel, { color: theme.textMuted }]}>What do you need to study?</Text>
          <TextInput
            style={[s.goalInput, { backgroundColor: theme.inputBg, borderColor: generatedPlan ? theme.border : '#6c47ff66', color: theme.textPrimary }]}
            placeholder='e.g. "Biology exam — chapters 5–8" or "JavaScript for beginners"'
            placeholderTextColor={theme.textMuted}
            value={goal}
            onChangeText={(v) => { setGoal(v); setGeneratedPlan(null); setAddedToPlanner(false); }}
            multiline
            textAlignVertical="top"
          />

          {/* Deadline + sessions row */}
          <View style={s.configRow}>
            <View style={s.configField}>
              <Text style={[s.fieldLabel, { color: theme.textMuted }]}>Deadline</Text>
              <View style={[s.configInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                <Calendar size={14} color={theme.textSecondary} />
                <TextInput
                  style={{ flex: 1, color: theme.textPrimary, fontSize: 14 }}
                  value={deadline}
                  onChangeText={(v) => { setDeadline(v); setGeneratedPlan(null); }}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.textMuted}
                />
              </View>
            </View>

            <View style={s.configField}>
              <Text style={[s.fieldLabel, { color: theme.textMuted }]}>Sessions/day</Text>
              <View style={s.stepper}>
                <TouchableOpacity
                  style={[s.stepBtn, { backgroundColor: theme.inputBg, borderColor: theme.border }]}
                  onPress={() => setSessionsPerDay((v) => Math.max(1, v - 1))}
                >
                  <Minus size={14} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={[s.stepValue, { color: '#6c47ff' }]}>{sessionsPerDay}</Text>
                <TouchableOpacity
                  style={[s.stepBtn, { backgroundColor: theme.inputBg, borderColor: theme.border }]}
                  onPress={() => setSessionsPerDay((v) => Math.min(5, v + 1))}
                >
                  <Plus size={14} color={theme.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Generate button */}
          <TouchableOpacity
            style={[s.generateBtn, planLoading && { opacity: 0.6 }]}
            onPress={generatePlan}
            disabled={planLoading}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#6c47ff', '#2563eb']} style={s.generateGrad}>
              {planLoading ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={s.generateText}>Building your plan…</Text>
                </>
              ) : (
                <>
                  <Sparkles size={17} color="#fff" />
                  <Text style={s.generateText}>Generate Study Plan</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Generated plan */}
          {generatedPlan && (
            <View style={s.planResult}>
              {/* Summary */}
              <View style={[s.summaryCard, { backgroundColor: '#6c47ff18', borderColor: '#6c47ff44' }]}>
                <Sparkles size={15} color="#6c47ff" />
                <Text style={[s.summaryText, { color: theme.textPrimary }]}>{generatedPlan.summary}</Text>
              </View>

              {/* Task list */}
              <Text style={[s.planSectionLabel, { color: theme.textMuted }]}>
                {generatedPlan.tasks.length} study sessions planned
              </Text>

              {generatedPlan.tasks.map((t, i) => (
                <View key={i} style={[s.planTaskCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={[s.planTaskNum, { backgroundColor: '#6c47ff' + (i < 9 ? 'dd' : 'aa') }]}>
                    <Text style={s.planTaskNumText}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.planTaskTitle, { color: theme.textPrimary }]}>{t.title}</Text>
                    <Text style={[s.planTaskDesc, { color: theme.textSecondary }]} numberOfLines={2}>{t.description}</Text>
                    <View style={s.planTaskMeta}>
                      <View style={[s.planMetaBadge, { backgroundColor: '#6c47ff18' }]}>
                        <Calendar size={10} color="#a78bfa" />
                        <Text style={[s.planMetaText, { color: '#a78bfa' }]}>{formatDate(t.dueDate)}</Text>
                      </View>
                      <View style={[s.planMetaBadge, { backgroundColor: '#2563eb18' }]}>
                        <Clock size={10} color="#60a5fa" />
                        <Text style={[s.planMetaText, { color: '#60a5fa' }]}>{t.duration} min</Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}

              {/* Add to planner CTA */}
              {addedToPlanner ? (
                <View style={s.addedBadge}>
                  <CheckCircle size={18} color="#10b981" />
                  <Text style={s.addedText}>Added to Planner!</Text>
                  <TouchableOpacity onPress={() => nav.navigate('Planner')} style={s.goToPlanner}>
                    <Text style={s.goToPlannerText}>View →</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={s.addBtn} onPress={addAllToPlanner} activeOpacity={0.85}>
                  <LinearGradient colors={['#10b981', '#059669']} style={s.addBtnGrad}>
                    <ClipboardList size={17} color="#fff" />
                    <Text style={s.addBtnText}>Add {generatedPlan.tasks.length} tasks to Planner</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>
      )}
    </KeyboardAvoidingView>
    </View>
  );
}

const styles = (theme: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background },

  // Header
  header: { paddingTop: 52, paddingBottom: 0, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarOrb: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#10b981' },
  onlineText: { color: '#10b981', fontSize: 11, fontWeight: '600' },

  // Mode tabs
  modeTabs: { flexDirection: 'row', gap: 8, paddingBottom: 0 },
  modeTab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    marginBottom: 1,
  },
  modeTabActive: { backgroundColor: '#6c47ff' },
  modeTabText: { fontSize: 13, fontWeight: '700' },

  // Chat
  msgList: { padding: 16, paddingBottom: 8 },
  msgRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowAI: { justifyContent: 'flex-start', gap: 8 },
  aiAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  bubble: { maxWidth: '78%', borderRadius: 18, padding: 12 },
  bubbleUser: { backgroundColor: '#6c47ff', borderBottomRightRadius: 4 },
  bubbleAI: { borderBottomLeftRadius: 4, borderWidth: 1 },
  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  timestamp: { fontSize: 10, marginTop: 4 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  emptyEmoji: { fontSize: 52, marginBottom: 14 },
  emptyTitle: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  quickPromptsWrap: { width: '100%', gap: 8, marginBottom: 20 },
  quickBtn: { borderRadius: 12, padding: 14, borderWidth: 1 },
  quickText: { fontSize: 14 },
  planCta: { width: '100%', borderRadius: 14, overflow: 'hidden' },
  planCtaGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  planCtaText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  quickRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  quickChip: { flex: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  quickChipText: { fontSize: 12, textAlign: 'center' },
  inputRow: { flexDirection: 'row', gap: 10, padding: 12, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100, borderWidth: 1 },
  sendBtn: { alignSelf: 'flex-end', borderRadius: 22, overflow: 'hidden' },
  sendGrad: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  // Plan mode
  planScroll: { padding: 20, paddingTop: 16 },
  planIntro: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 20 },
  planIntroEmoji: { fontSize: 32 },
  planIntroTitle: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  planIntroSub: { fontSize: 13, lineHeight: 18 },
  fieldLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
  goalInput: { borderRadius: 14, borderWidth: 1, padding: 14, fontSize: 15, minHeight: 80, lineHeight: 22, marginBottom: 16 },
  configRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  configField: { flex: 1 },
  configInput: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 44, borderRadius: 12 },
  stepBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontSize: 20, fontWeight: '800', minWidth: 30, textAlign: 'center' },
  generateBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 24 },
  generateGrad: { flexDirection: 'row', paddingVertical: 16, alignItems: 'center', justifyContent: 'center', gap: 8 },
  generateText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Plan result
  planResult: { gap: 0 },
  summaryCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 16 },
  summaryText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '500' },
  planSectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  planTaskCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 8,
  },
  planTaskNum: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  planTaskNumText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  planTaskTitle: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  planTaskDesc: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  planTaskMeta: { flexDirection: 'row', gap: 8 },
  planMetaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  planMetaText: { fontSize: 11, fontWeight: '700' },
  addBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 16 },
  addBtnGrad: { flexDirection: 'row', paddingVertical: 16, alignItems: 'center', justifyContent: 'center', gap: 8 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  addedBadge: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, borderRadius: 14, backgroundColor: '#064e3b', padding: 16 },
  addedText: { color: '#10b981', fontWeight: '700', fontSize: 15, flex: 1 },
  goToPlanner: {},
  goToPlannerText: { color: '#6ee7b7', fontWeight: '700', fontSize: 14 },
});
