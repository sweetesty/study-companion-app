import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Switch, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  LogOut, Sun, Moon, Key, Bell, Target, Trophy, ChevronRight, Eye, EyeOff,
} from 'lucide-react-native';
import { useAppStore, ACHIEVEMENTS, getEarnedAchievements, getStreak } from '../store/useAppStore';
import { useToast } from '../components/Toast';
import { useTheme } from '../hooks/useTheme';
import { scheduleAllNotifications, cancelAllNotifications } from '../services/notificationService';
import { NotificationSettings } from '../constants/types';

export default function ProfileScreen() {
  const { theme, isDark } = useTheme();
  const { user, signOut, toggleTheme, apiKey, setApiKey, goals, updateGoals, notificationSettings, updateNotificationSettings, tasks, focusSessions, moods, quizResults } = useAppStore();
  const { showToast } = useToast();

  const [showKey, setShowKey] = useState(false);
  const [keyInput, setKeyInput] = useState(apiKey);
  const [dailyTasks, setDailyTasks] = useState(goals.dailyTasks.toString());
  const [dailyFocus, setDailyFocus] = useState(goals.dailyFocusMinutes.toString());

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

  const handleSaveKey = () => {
    setApiKey(keyInput.trim());
    showToast('API key saved!', 'success');
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
      <LinearGradient colors={theme.gradient} style={s.hero}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
        <Text style={s.name}>{user?.name ?? 'Student'}</Text>
        <Text style={s.email}>{user?.email ?? ''}</Text>
        {user?.studyGoal ? <Text style={s.goal}>{user.studyGoal}</Text> : null}
      </LinearGradient>

      {/* Stats */}
      <View style={s.statsRow}>
        <MiniStat label="Tasks Done" value={tasks.filter((t) => t.completed).length} emoji="✅" theme={theme} />
        <MiniStat label="Focus Hours" value={(totalFocusMin / 60).toFixed(1)} emoji="⏱️" theme={theme} />
        <MiniStat label="Streak" value={`${streak}d`} emoji="🔥" theme={theme} />
        <MiniStat label="Quizzes" value={quizResults.length} emoji="🧠" theme={theme} />
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
              <View key={a.id} style={[s.achieveCard, { backgroundColor: theme.surface, borderColor: earned ? theme.yellow + '66' : theme.border, opacity: earned ? 1 : 0.4 }]}>
                <Text style={s.achieveIcon}>{a.icon}</Text>
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

      {/* API Key */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Key size={16} color={theme.green} />
          <Text style={s.sectionTitle}>Groq API Key</Text>
        </View>
        <View style={[s.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[s.apiNote, { color: theme.textMuted }]}>
            Required for AI Quiz Generator and Study Coach. Get your free key at console.groq.com
          </Text>
          <View style={s.keyRow}>
            <TextInput
              style={[s.keyInput, { color: theme.textPrimary, borderColor: theme.inputBorder, backgroundColor: theme.inputBg }]}
              value={keyInput}
              onChangeText={setKeyInput}
              secureTextEntry={!showKey}
              placeholder="gsk_..."
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowKey(!showKey)} style={s.eyeBtn}>
              {showKey ? <EyeOff size={18} color={theme.textMuted} /> : <Eye size={18} color={theme.textMuted} />}
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={s.saveBtn} onPress={handleSaveKey} activeOpacity={0.8}>
            <Text style={[s.saveBtnText, { color: theme.green }]}>Save Key</Text>
          </TouchableOpacity>
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
      <View style={[s.section, { marginBottom: 40 }]}>
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <LogOut size={18} color={theme.red} />
          <Text style={[s.logoutText, { color: theme.red }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function MiniStat({ label, value, emoji, theme }: any) {
  return (
    <View style={[miniStyles.box, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={miniStyles.emoji}>{emoji}</Text>
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
  emoji: { fontSize: 18, marginBottom: 2 },
  value: { fontSize: 17, fontWeight: '700' },
  label: { fontSize: 9, textAlign: 'center', marginTop: 1 },
});

const toggleStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  label: { fontSize: 14 },
});

const styles = (theme: any) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.background },
    content: { paddingBottom: 16 },
    hero: { paddingTop: 64, paddingBottom: 28, alignItems: 'center' },
    avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
    avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
    name: { color: '#fff', fontSize: 22, fontWeight: '700' },
    email: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 },
    goal: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 6, fontStyle: 'italic' },
    statsRow: { flexDirection: 'row', gap: 8, padding: 16 },
    section: { paddingHorizontal: 20, marginTop: 8 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    sectionTitle: { color: theme.textPrimary, fontSize: 15, fontWeight: '700', flex: 1 },
    sectionCount: { color: theme.textMuted, fontSize: 12 },
    card: { borderRadius: 16, padding: 16, borderWidth: 1 },
    achieveGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    achieveCard: { width: '47%', borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1 },
    achieveIcon: { fontSize: 26, marginBottom: 6 },
    achieveTitle: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
    achieveDesc: { fontSize: 10, textAlign: 'center', marginTop: 2, lineHeight: 14 },
    goalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    goalLabel: { color: theme.textSecondary, fontSize: 14 },
    goalInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, width: 60, textAlign: 'center', fontSize: 14 },
    saveBtn: { alignItems: 'center', paddingVertical: 10 },
    saveBtnText: { fontSize: 14, fontWeight: '700' },
    apiNote: { fontSize: 12, lineHeight: 18, marginBottom: 10 },
    keyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    keyInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
    eyeBtn: { padding: 8 },
    themeBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 16, borderWidth: 1 },
    themeBtnText: { flex: 1, fontSize: 15, fontWeight: '500' },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: theme.red + '44', backgroundColor: theme.red + '11' },
    logoutText: { fontSize: 15, fontWeight: '700' },
  });
