import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Switch, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  LogOut, Sun, Moon, Bell, Target, Trophy, ChevronRight,
  CheckSquare, Clock, BookOpen, Flame, Star, Heart, Award, Medal,
} from 'lucide-react-native';
import { useAppStore, ACHIEVEMENTS, getEarnedAchievements, getStreak } from '../store/useAppStore';
import { useToast } from '../components/Toast';
import { useTheme } from '../hooks/useTheme';
import { scheduleAllNotifications, cancelAllNotifications } from '../services/notificationService';
import { NotificationSettings } from '../constants/types';

export default function ProfileScreen() {
  const { theme, isDark } = useTheme();
  const { user, signOut, toggleTheme, goals, updateGoals, notificationSettings, updateNotificationSettings, tasks, focusSessions, moods, quizResults } = useAppStore();
  const { showToast } = useToast();

  const [dailyTasks, setDailyTasks] = useState(goals.dailyTasks.toString());
  const [dailyFocus, setDailyFocus] = useState(goals.dailyFocusMinutes.toString());

  const ACHIEVE_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
    first_task:   { icon: <CheckSquare size={22} color="#10b981" />, color: '#10b981' },
    week_streak:  { icon: <Flame size={22} color="#f97316" />,       color: '#f97316' },
    quiz_5:       { icon: <BookOpen size={22} color="#8B5CF6" />,    color: '#8B5CF6' },
    focus_600:    { icon: <Clock size={22} color="#3B82F6" />,       color: '#3B82F6' },
    mood_7:       { icon: <Heart size={22} color="#ec4899" />,       color: '#ec4899' },
    perfect_quiz: { icon: <Star size={22} color="#F59E0B" />,        color: '#F59E0B' },
    tasks_30:     { icon: <Trophy size={22} color="#F59E0B" />,      color: '#F59E0B' },
    month_streak: { icon: <Award size={22} color="#a78bfa" />,       color: '#a78bfa' },
  };

  const streak = getStreak(tasks, focusSessions);
  const earnedIds = getEarnedAchievements(tasks, focusSessions, quizResults, moods, streak);
  const totalFocusMin = focusSessions.filter((s) => s.type === 'work').reduce((a, s) => a + s.duration, 0);

  const initials = (user?.name ?? 'U').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  const handleSaveGoals = () => {
    const dt = parseInt(dailyTasks) || 3;
    const df = parseInt(dailyFocus) || 50;
    updateGoals({ dailyTasks: dt, dailyFocusMinutes: df });
    showToast('Goals updated!', 'success');
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const s = styles(theme);

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient colors={theme.heroGradient} style={s.hero}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
        <Text style={s.name}>{user?.name ?? 'Student'}</Text>
        <Text style={s.email}>{user?.email ?? ''}</Text>
        {user?.studyGoal ? <Text style={s.goal}>{user.studyGoal.replace(/^\p{Emoji}\s*/u, '')}</Text> : null}
      </LinearGradient>

      {/* Stats */}
      <View style={s.statsRow}>
        <MiniStat label="Tasks Done" value={tasks.filter((t) => t.completed).length} theme={theme} />
        <MiniStat label="Focus Hours" value={(totalFocusMin / 60).toFixed(1)} theme={theme} />
        <MiniStat label="Streak" value={`${streak}d`} theme={theme} />
        <MiniStat label="Quizzes" value={quizResults.length} theme={theme} />
      </View>

      {/* Achievements */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Trophy size={16} color={theme.yellow} />
          <Text style={s.sectionTitle}>Achievements</Text>
          <Text style={s.sectionCount}>{earnedIds.length}/{ACHIEVEMENTS.length}</Text>
        </View>
        <View style={s.achieveGrid}>
          {ACHIEVEMENTS.map((a) => {
            const earned = earnedIds.includes(a.id);
            return (
              <View key={a.id} style={[s.achieveCard, { backgroundColor: theme.surface, borderColor: earned ? (ACHIEVE_ICONS[a.id]?.color ?? theme.yellow) + '66' : theme.border }]}>
                <View style={s.achieveIconWrap}>
                  {ACHIEVE_ICONS[a.id]?.icon ?? <Medal size={22} color={theme.textMuted} />}
                </View>
                <Text style={[s.achieveTitle, { color: theme.textPrimary }]}>{a.title}</Text>
                <Text style={[s.achieveDesc, { color: theme.textMuted }]}>{a.description}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Daily Goals */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Target size={16} color={theme.blue} />
          <Text style={s.sectionTitle}>Daily Goals</Text>
        </View>
        <View style={[s.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={s.goalRow}>
            <Text style={s.goalLabel}>Tasks per day</Text>
            <TextInput
              style={[s.goalInput, { color: theme.textPrimary, borderColor: theme.inputBorder, backgroundColor: theme.inputBg }]}
              value={dailyTasks}
              onChangeText={setDailyTasks}
              keyboardType="numeric"
            />
          </View>
          <View style={s.goalRow}>
            <Text style={s.goalLabel}>Focus minutes per day</Text>
            <TextInput
              style={[s.goalInput, { color: theme.textPrimary, borderColor: theme.inputBorder, backgroundColor: theme.inputBg }]}
              value={dailyFocus}
              onChangeText={setDailyFocus}
              keyboardType="numeric"
            />
          </View>
          <TouchableOpacity style={s.saveBtn} onPress={handleSaveGoals} activeOpacity={0.8}>
            <Text style={[s.saveBtnText, { color: theme.blue }]}>Save Goals</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Notifications */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Bell size={16} color={theme.purple} />
          <Text style={s.sectionTitle}>Notifications</Text>
        </View>
        <View style={[s.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <ToggleRow
            label="Study Reminders"
            value={notificationSettings.studyReminders}
            onChange={(v) => {
              const updated: NotificationSettings = { ...notificationSettings, studyReminders: v };
              updateNotificationSettings(updated);
              scheduleAllNotifications(updated, tasks).catch(() => {});
            }}
            theme={theme}
          />
          <ToggleRow
            label="Daily Mood Check-in"
            value={notificationSettings.moodCheckIn}
            onChange={(v) => {
              const updated: NotificationSettings = { ...notificationSettings, moodCheckIn: v };
              updateNotificationSettings(updated);
              scheduleAllNotifications(updated, tasks).catch(() => {});
            }}
            theme={theme}
          />
          <ToggleRow
            label="Task Deadline Alerts"
            value={notificationSettings.taskDeadlines}
            onChange={(v) => {
              const updated: NotificationSettings = { ...notificationSettings, taskDeadlines: v };
              updateNotificationSettings(updated);
              scheduleAllNotifications(updated, tasks).catch(() => {});
            }}
            theme={theme}
          />
        </View>
      </View>

      {/* Theme toggle */}
      <View style={s.section}>
        <TouchableOpacity
          style={[s.themeBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={toggleTheme}
          activeOpacity={0.8}
        >
          {isDark ? <Sun size={20} color={theme.yellow} /> : <Moon size={20} color={theme.purple} />}
          <Text style={[s.themeBtnText, { color: theme.textPrimary }]}>
            Switch to {isDark ? 'Light' : 'Dark'} Mode
          </Text>
          <ChevronRight size={18} color={theme.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <View style={[s.section, { marginBottom: 40, marginTop: 60 }]}>
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <LogOut size={18} color={theme.red} />
          <Text style={[s.logoutText, { color: theme.red }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function MiniStat({ label, value, theme }: any) {
  return (
    <View style={[miniStyles.box, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[miniStyles.value, { color: theme.textPrimary }]}>{value}</Text>
      <Text style={[miniStyles.label, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

function ToggleRow({ label, value, onChange, theme }: { label: string; value: boolean; onChange: (v: boolean) => void; theme: any }) {
  return (
    <View style={toggleStyles.row}>
      <Text style={[toggleStyles.label, { color: theme.textSecondary }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: theme.border, true: theme.blue + '88' }}
        thumbColor={value ? theme.blue : theme.textMuted}
      />
    </View>
  );
}

const miniStyles = StyleSheet.create({
  box: { flex: 1, borderRadius: 14, padding: 10, alignItems: 'center', borderWidth: 1 },
  emoji: { marginBottom: 4 },
  value: { fontSize: 17, fontWeight: '700' },
  label: { fontSize: 9, textAlign: 'center', marginTop: 1 },
});

const toggleStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  label: { fontSize: 14 },
});

const styles = (theme: any) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.background },
    content: { paddingBottom: 40 },
    hero: { paddingTop: 64, paddingBottom: 32, alignItems: 'center' },
    avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 14, borderWidth: 2, borderColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.15)' },
    avatarText: { color: theme.heroText, fontSize: 30, fontWeight: '700' },
    name: { color: theme.heroText, fontSize: 22, fontWeight: '700' },
    email: { color: theme.heroSubText, fontSize: 13, marginTop: 4 },
    goal: { color: theme.heroSubText, fontSize: 13, marginTop: 8, fontStyle: 'italic' },
    statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 20 },
    section: { paddingHorizontal: 20, marginTop: 20 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
    sectionTitle: { color: theme.textPrimary, fontSize: 15, fontWeight: '700', flex: 1 },
    sectionCount: { color: theme.textMuted, fontSize: 12 },
    card: { borderRadius: 16, padding: 20, borderWidth: 1 },
    achieveGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    achieveCard: { width: '47%', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1 },
    achieveIcon: { fontSize: 28, marginBottom: 8 },
    achieveTitle: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
    achieveDesc: { fontSize: 10, textAlign: 'center', marginTop: 4, lineHeight: 15 },
    goalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    goalLabel: { color: theme.textSecondary, fontSize: 14 },
    goalInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, width: 64, textAlign: 'center', fontSize: 14 },
    saveBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
    saveBtnText: { fontSize: 14, fontWeight: '700' },
    themeBtn: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 16, padding: 18, borderWidth: 1 },
    themeBtnText: { flex: 1, fontSize: 15, fontWeight: '500' },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: theme.red + '44', backgroundColor: theme.red + '11' },
    logoutText: { fontSize: 15, fontWeight: '700' },
  });
