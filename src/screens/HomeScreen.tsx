import React, { useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import {
  Flame, Star, Brain, Timer, Smile, BarChart2, ChevronRight, Zap,
} from 'lucide-react-native';
import { useAppStore, getStreak, getTodayTasks, getTodayFocusMinutes, getEarnedAchievements, ACHIEVEMENTS } from '../store/useAppStore';
import { useTheme } from '../hooks/useTheme';

const { width } = Dimensions.get('window');

function greet(name: string) {
  const h = new Date().getHours();
  if (h < 12) return `Good morning, ${name}! ☀️`;
  if (h < 18) return `Good afternoon, ${name}! 🌤️`;
  if (h < 22) return `Good evening, ${name}! 🌙`;
  return `Night owl mode, ${name}! 🦉`;
}

export default function HomeScreen() {
  const { theme } = useTheme();
  const nav = useNavigation<any>();
  const {
    user, tasks, focusSessions, moods, quizResults, goals,
  } = useAppStore();

  const streak = getStreak(tasks, focusSessions);
  const { pending, completed } = getTodayTasks(tasks);
  const todayFocusMin = getTodayFocusMinutes(focusSessions);
  const earnedIds = getEarnedAchievements(tasks, focusSessions, quizResults, moods, streak);
  const todayMood = moods.find((m) => m.date === new Date().toISOString().slice(0, 10));

  const taskProgress = Math.min(completed.length / (goals.dailyTasks || 1), 1);
  const focusProgress = Math.min(todayFocusMin / (goals.dailyFocusMinutes || 1), 1);

  const suggestions = buildSuggestions({ pending, completed, todayFocusMin, todayMood, streak, quizResults, goals });

  const s = styles(theme);

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {/* Header gradient hero */}
      <LinearGradient colors={['#1a1040', theme.background]} style={s.hero}>
        <Text style={s.greeting}>{greet(user?.name ?? 'Student')}</Text>
        <Text style={s.subtitle}>{user?.studyGoal || 'Keep pushing forward!'}</Text>

        {/* Streak pill */}
        <View style={s.streakRow}>
          <View style={s.streakPill}>
            <Flame size={16} color="#F59E0B" />
            <Text style={s.streakText}>{streak} day streak</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Daily goals */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Today's Progress</Text>
        <View style={s.goalsCard}>
          <GoalRow
            label="Tasks"
            current={completed.length}
            total={goals.dailyTasks}
            progress={taskProgress}
            color={theme.blue}
            theme={theme}
          />
          <View style={{ height: 14 }} />
          <GoalRow
            label="Focus"
            current={todayFocusMin}
            total={goals.dailyFocusMinutes}
            progress={focusProgress}
            color={theme.purple}
            theme={theme}
            unit="min"
          />
        </View>
      </View>

      {/* Quick actions */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Quick Actions</Text>
        <View style={s.actionsGrid}>
          <ActionCard icon={<Smile size={22} color={theme.green} />} label="Mood" color={theme.green} onPress={() => nav.navigate('Mood')} theme={theme} />
          <ActionCard icon={<Brain size={22} color={theme.purple} />} label="Quiz" color={theme.purple} onPress={() => nav.navigate('Quiz')} theme={theme} />
          <ActionCard icon={<BarChart2 size={22} color={theme.blue} />} label="Dashboard" color={theme.blue} onPress={() => nav.navigate('Dashboard')} theme={theme} />
          <ActionCard icon={<Timer size={22} color={theme.yellow} />} label="Focus" color={theme.yellow} onPress={() => nav.navigate('Focus')} theme={theme} />
        </View>
      </View>

      {/* Achievements */}
      {earnedIds.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Achievements</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.badgeRow}>
            {ACHIEVEMENTS.filter((a) => earnedIds.includes(a.id)).map((a) => (
              <View key={a.id} style={s.badge}>
                <Text style={s.badgeIcon}>{a.icon}</Text>
                <Text style={s.badgeTitle}>{a.title}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Smart suggestions */}
      {suggestions.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>
            <Zap size={14} color={theme.yellow} /> Smart Suggestions
          </Text>
          <View style={s.suggestList}>
            {suggestions.map((s2, i) => (
              <TouchableOpacity
                key={i}
                style={[s.suggestCard, { backgroundColor: theme.surface }]}
                onPress={s2.action ? s2.action : undefined}
                activeOpacity={0.8}
              >
                <Text style={s.suggestEmoji}>{s2.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.suggestText}>{s2.text}</Text>
                </View>
                {s2.action && <ChevronRight size={16} color={theme.textMuted} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Today's tasks preview */}
      <View style={[s.section, { marginBottom: 32 }]}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Today's Tasks</Text>
          <TouchableOpacity onPress={() => nav.navigate('Planner')}>
            <Text style={[s.seeAll, { color: theme.blue }]}>See all →</Text>
          </TouchableOpacity>
        </View>
        {pending.length === 0 && completed.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>No tasks today. Add some in Planner! 📝</Text>
          </View>
        ) : (
          [...pending.slice(0, 3)].map((t) => (
            <View key={t.id} style={s.taskRow}>
              <View style={s.taskDot} />
              <Text style={s.taskTitle} numberOfLines={1}>{t.title}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function GoalRow({ label, current, total, progress, color, theme, unit = '' }: any) {
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '500' }}>{label}</Text>
        <Text style={{ color: theme.textPrimary, fontSize: 13, fontWeight: '700' }}>
          {current}{unit} / {total}{unit}
        </Text>
      </View>
      <View style={{ height: 8, backgroundColor: theme.border, borderRadius: 4, overflow: 'hidden' }}>
        <View style={{ height: 8, width: `${progress * 100}%`, backgroundColor: color, borderRadius: 4 }} />
      </View>
    </View>
  );
}

function ActionCard({ icon, label, color, onPress, theme }: any) {
  return (
    <TouchableOpacity style={[styles2.actionCard, { backgroundColor: theme.surface, borderColor: color + '44' }]} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles2.iconCircle, { backgroundColor: color + '22' }]}>{icon}</View>
      <Text style={[styles2.actionLabel, { color: theme.textPrimary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles2 = StyleSheet.create({
  actionCard: {
    width: (width - 56) / 2,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  iconCircle: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  actionLabel: { fontSize: 13, fontWeight: '600' },
});

function buildSuggestions({ pending, completed, todayFocusMin, todayMood, streak, quizResults, goals }: any) {
  const list: { emoji: string; text: string; action?: () => void }[] = [];

  if (!todayMood) list.push({ emoji: '😊', text: 'Log your mood for today to track your wellbeing.' });
  if (pending.length === 0 && completed.length === 0)
    list.push({ emoji: '📝', text: 'No tasks today yet. Add something to your planner!' });
  if (todayFocusMin === 0) list.push({ emoji: '⏱️', text: 'Start a focus session to build your streak.' });
  if (streak >= 3) list.push({ emoji: '🔥', text: `Amazing! You're on a ${streak}-day streak. Keep it up!` });
  if (quizResults.length === 0) list.push({ emoji: '🧠', text: 'Try the AI Quiz Generator to test your knowledge.' });

  return list.slice(0, 3);
}

const styles = (theme: any) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.background },
    content: { paddingBottom: 16 },
    hero: { paddingTop: 56, paddingBottom: 24, paddingHorizontal: 24 },
    greeting: { color: theme.textPrimary, fontSize: 24, fontWeight: '700', letterSpacing: -0.3 },
    subtitle: { color: theme.textSecondary, fontSize: 14, marginTop: 4 },
    streakRow: { flexDirection: 'row', marginTop: 12 },
    streakPill: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: '#F59E0B22', borderRadius: 20,
      paddingHorizontal: 12, paddingVertical: 6,
    },
    streakText: { color: '#F59E0B', fontSize: 13, fontWeight: '700' },
    section: { paddingHorizontal: 20, marginTop: 20 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    sectionTitle: { color: theme.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 10 },
    seeAll: { fontSize: 13, fontWeight: '600' },
    goalsCard: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
    actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    badgeRow: { gap: 10, paddingRight: 16 },
    badge: {
      backgroundColor: theme.surface,
      borderRadius: 14, padding: 14,
      alignItems: 'center', minWidth: 80,
      borderWidth: 1, borderColor: theme.border,
    },
    badgeIcon: { fontSize: 28, marginBottom: 4 },
    badgeTitle: { color: theme.textSecondary, fontSize: 11, fontWeight: '600', textAlign: 'center' },
    suggestList: { gap: 8 },
    suggestCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      borderRadius: 12, padding: 14,
      borderWidth: 1, borderColor: theme.border,
    },
    suggestEmoji: { fontSize: 22 },
    suggestText: { color: theme.textSecondary, fontSize: 14, lineHeight: 20, flex: 1 },
    emptyCard: {
      backgroundColor: theme.surface, borderRadius: 12, padding: 16,
      alignItems: 'center', borderWidth: 1, borderColor: theme.border,
    },
    emptyText: { color: theme.textMuted, fontSize: 14 },
    taskRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border,
    },
    taskDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.blue },
    taskTitle: { color: theme.textPrimary, fontSize: 14, flex: 1 },
  });
