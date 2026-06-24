import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import { useToast } from '../components/Toast';
import { useTheme } from '../hooks/useTheme';
import { MoodEntry } from '../constants/types';

const MOODS = [
  { id: 'great', emoji: '😄', label: 'Great', color: '#10B981' },
  { id: 'good', emoji: '😊', label: 'Good', color: '#3B82F6' },
  { id: 'okay', emoji: '😐', label: 'Okay', color: '#F59E0B' },
  { id: 'low', emoji: '😔', label: 'Low', color: '#8B5CF6' },
  { id: 'stressed', emoji: '😫', label: 'Stressed', color: '#EF4444' },
] as const;

export default function MoodScreen() {
  const { theme } = useTheme();
  const nav = useNavigation();
  const { moods, saveMood } = useAppStore();
  const { showToast } = useToast();

  const today = new Date().toISOString().slice(0, 10);
  const todayMood = moods.find((m) => m.date === today);
  const [selected, setSelected] = useState<string>(todayMood?.mood ?? '');

  const handleSave = () => {
    if (!selected) { showToast('Pick a mood first!', 'error'); return; }
    const mood = MOODS.find((m) => m.id === selected)!;
    const entry: MoodEntry = {
      id: Date.now().toString(),
      mood: mood.id,
      emoji: mood.emoji,
      label: mood.label,
      date: today,
    };
    saveMood(entry);
    showToast('Mood saved! 😊', 'success');
  };

  const last7 = getLast7Days().map((date) => ({
    date,
    entry: moods.find((m) => m.date === date),
  }));

  const s = styles(theme);

  return (
    <View style={s.root}>
      <LinearGradient colors={['#1a2a1a', theme.background]} style={s.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={s.backBtn}>
          <ArrowLeft size={22} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Mood Tracker</Text>
        <Text style={s.headerSub}>How are you feeling today?</Text>
      </LinearGradient>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Mood picker */}
        <View style={s.pickerCard}>
          <Text style={s.pickerLabel}>Today, {formatDate(today)}</Text>
          <View style={s.moodRow}>
            {MOODS.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[s.moodBtn, selected === m.id && { borderColor: m.color, backgroundColor: m.color + '22' }]}
                onPress={() => setSelected(m.id)}
                activeOpacity={0.8}
              >
                <Text style={s.moodEmoji}>{m.emoji}</Text>
                <Text style={[s.moodLabel, { color: selected === m.id ? m.color : theme.textMuted }]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={s.saveBtn} onPress={handleSave} activeOpacity={0.85}>
            <LinearGradient colors={theme.gradient} style={s.saveBtnGrad}>
              <Text style={s.saveBtnText}>Save Mood</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* 7-day history */}
        <Text style={s.historyLabel}>Last 7 Days</Text>
        <View style={s.historyCard}>
          {last7.map(({ date, entry }) => (
            <View key={date} style={s.historyRow}>
              <Text style={s.historyDate}>{formatShortDate(date)}</Text>
              {entry ? (
                <View style={s.historyMood}>
                  <Text style={s.historyEmoji}>{entry.emoji}</Text>
                  <Text style={[s.historyLabel2, { color: MOODS.find((m) => m.id === entry.mood)?.color ?? theme.textSecondary }]}>
                    {entry.label}
                  </Text>
                </View>
              ) : (
                <Text style={s.historyEmpty}>—</Text>
              )}
            </View>
          ))}
        </View>

        {/* Mood insight */}
        {moods.length >= 3 && (
          <View style={s.insightCard}>
            <Text style={s.insightTitle}>💡 Mood Insight</Text>
            <Text style={s.insightText}>{getMoodInsight(moods)}</Text>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function getLast7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().slice(0, 10);
  });
}

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatShortDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getMoodInsight(moods: MoodEntry[]): string {
  const recent = moods.slice(0, 7);
  const moodScores: Record<string, number> = { great: 5, good: 4, okay: 3, low: 2, stressed: 1 };
  const avg = recent.reduce((a, m) => a + (moodScores[m.mood] ?? 3), 0) / recent.length;
  if (avg >= 4) return "You've been in great spirits lately! Keep up the positive energy! 🌟";
  if (avg >= 3) return "Your mood has been steady. Small wins compound over time! 💪";
  return "Looks like it's been tough lately. Remember to take breaks and practice self-care. 💙";
}

const styles = (theme: any) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.background },
    header: { paddingTop: 56, paddingBottom: 24, paddingHorizontal: 24 },
    backBtn: { marginBottom: 12 },
    headerTitle: { color: theme.textPrimary, fontSize: 28, fontWeight: '700' },
    headerSub: { color: theme.textSecondary, fontSize: 14, marginTop: 4 },
    scroll: { flex: 1 },
    content: { padding: 20 },
    pickerCard: { backgroundColor: theme.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: theme.border },
    pickerLabel: { color: theme.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 16 },
    moodRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    moodBtn: { alignItems: 'center', padding: 10, borderRadius: 14, borderWidth: 2, borderColor: 'transparent', flex: 1, marginHorizontal: 2 },
    moodEmoji: { fontSize: 30, marginBottom: 4 },
    moodLabel: { fontSize: 11, fontWeight: '600' },
    saveBtn: { borderRadius: 14, overflow: 'hidden' },
    saveBtnGrad: { paddingVertical: 14, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    historyLabel: { color: theme.textSecondary, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 24, marginBottom: 10 },
    historyCard: { backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' },
    historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border },
    historyDate: { color: theme.textSecondary, fontSize: 13 },
    historyMood: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    historyEmoji: { fontSize: 18 },
    historyLabel2: { fontSize: 13, fontWeight: '600' },
    historyEmpty: { color: theme.textMuted, fontSize: 18 },
    insightCard: { backgroundColor: theme.blue + '15', borderRadius: 14, padding: 16, marginTop: 16, borderWidth: 1, borderColor: theme.blue + '44' },
    insightTitle: { color: theme.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 6 },
    insightText: { color: theme.textSecondary, fontSize: 14, lineHeight: 20 },
  });
