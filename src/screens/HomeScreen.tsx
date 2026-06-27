import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import {
  Flame, Brain, Timer, Smile, BarChart2, ChevronRight, Zap, ClipboardList,
  CheckSquare, Clock, BookOpen, PenLine, Trophy, Star, Heart, Award,
} from 'lucide-react-native';

const ACHIEVE_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  first_task:   { icon: <CheckSquare size={24} color="#10b981" />, color: '#10b981' },
  week_streak:  { icon: <Flame size={24} color="#f97316" />,       color: '#f97316' },
  quiz_5:       { icon: <BookOpen size={24} color="#8B5CF6" />,    color: '#8B5CF6' },
  focus_600:    { icon: <Clock size={24} color="#3B82F6" />,       color: '#3B82F6' },
  mood_7:       { icon: <Heart size={24} color="#ec4899" />,       color: '#ec4899' },
  perfect_quiz: { icon: <Star size={24} color="#F59E0B" />,        color: '#F59E0B' },
  tasks_30:     { icon: <Trophy size={24} color="#F59E0B" />,      color: '#F59E0B' },
  month_streak: { icon: <Award size={24} color="#a78bfa" />,       color: '#a78bfa' },
};
import { useAppStore, getStreak, getTodayTasks, getTodayFocusMinutes, getEarnedAchievements, ACHIEVEMENTS } from '../store/useAppStore';
import { useTheme } from '../hooks/useTheme';

const { width } = Dimensions.get('window');

function greet(name: string) {
  const h = new Date().getHours();
  if (h < 12) return `Good morning,\n${name}`;
  if (h < 18) return `Good afternoon,\n${name}`;
  if (h < 22) return `Good evening,\n${name}`;
  return `Night owl mode,\n${name}`;
}

export default function HomeScreen() {
  const { theme } = useTheme();
  const nav = useNavigation<any>();
  const { user, tasks, focusSessions, moods, quizResults, goals } = useAppStore();

  const streak = getStreak(tasks, focusSessions);
  const { pending, completed } = getTodayTasks(tasks);
  const todayFocusMin = getTodayFocusMinutes(focusSessions);
  const earnedIds = getEarnedAchievements(tasks, focusSessions, quizResults, moods, streak);
  const todayMood = moods.find((m) => m.date === new Date().toISOString().slice(0, 10));
  const taskProgress = Math.min(completed.length / (goals.dailyTasks || 1), 1);
  const focusProgress = Math.min(todayFocusMin / (goals.dailyFocusMinutes || 1), 1);
  const suggestions = buildSuggestions({ pending, completed, todayFocusMin, todayMood, streak, quizResults, goals, nav });

  const s = styles(theme);

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {/* Hero */}
      <LinearGradient colors={theme.heroGradient} locations={[0, 0.55, 1]} style={s.hero}>
        <Text style={s.greeting}>{greet(user?.name ?? 'Student')}</Text>
        {user?.studyGoal ? <Text style={s.subtitle}>{user.studyGoal}</Text> : null}

        <View style={s.heroStats}>
          <HeroStat value={streak} label="day streak" icon={<Flame size={18} color={theme.yellow} />} glow={theme.yellow} />
          <View style={s.heroStatDivider} />
          <HeroStat value={completed.length} label="done today" icon={<CheckSquare size={18} color={theme.green} />} glow={theme.green} />
          <View style={s.heroStatDivider} />
          <HeroStat value={todayFocusMin} label="focus mins" icon={<Clock size={18} color={theme.blue} />} glow={theme.blue} />
        </View>
      </LinearGradient>

      {/* Today's Progress */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Today's Progress</Text>
        <View style={[s.progressCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <ProgressRow label="Tasks" current={completed.length} total={goals.dailyTasks} progress={taskProgress} color={theme.blue} purple={theme.purple} theme={theme} />
          <View style={s.progressDivider} />
          <ProgressRow label="Focus" current={todayFocusMin} total={goals.dailyFocusMinutes} progress={focusProgress} color={theme.purple} purple={theme.blue} theme={theme} unit="min" />
        </View>
      </View>

      {/* Quick Actions */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Quick Actions</Text>
        <View style={s.actionsGrid}>
          <ActionCard icon={<Smile size={24} color="#fff" />} label="Mood Check" gradient={['#10B981', '#059669']} onPress={() => nav.navigate('Mood')} theme={theme} />
          <ActionCard icon={<Brain size={24} color="#fff" />} label="Study Notes" gradient={['#8B5CF6', '#6D28D9']} onPress={() => nav.navigate('Notes')} theme={theme} />
          <ActionCard icon={<Timer size={24} color="#fff" />} label="Focus Mode" gradient={['#3B82F6', '#1D4ED8']} onPress={() => nav.navigate('Focus')} theme={theme} />
          <ActionCard icon={<BarChart2 size={24} color="#fff" />} label="Dashboard" gradient={['#F59E0B', '#D97706']} onPress={() => nav.navigate('Dashboard')} theme={theme} />
        </View>

      </View>

      {/* Today's Tasks preview */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Today's Tasks</Text>
          <TouchableOpacity onPress={() => nav.navigate('Planner')} style={s.seeAllBtn}>
            <ClipboardList size={14} color={theme.blue} />
            <Text style={[s.seeAll, { color: theme.blue }]}>See all</Text>
          </TouchableOpacity>
        </View>
        {pending.length === 0 && completed.length === 0 ? (
          <View style={[s.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={s.emptyText}>No tasks today. Add some in Planner!</Text>
          </View>
        ) : (
          <View style={[s.tasksCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {[...pending.slice(0, 4)].map((t, i) => (
              <View key={t.id} style={[s.taskRow, i < Math.min(pending.length, 4) - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
                <View style={[s.taskDot, { backgroundColor: theme.blue }]} />
                <Text style={[s.taskTitle, { color: theme.textPrimary }]} numberOfLines={1}>{t.title}</Text>
                {t.dueDate && <Text style={[s.taskDate, { color: theme.textMuted }]}>{t.dueDate.slice(5)}</Text>}
              </View>
            ))}
            {pending.length > 4 && (
              <TouchableOpacity style={s.moreBtn} onPress={() => nav.navigate('Planner')}>
                <Text style={[s.moreText, { color: theme.blue }]}>+{pending.length - 4} more tasks →</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Smart Suggestions */}
      {suggestions.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>
            <Zap size={14} color={theme.yellow} /> Smart Suggestions
          </Text>
          <View style={s.suggestList}>
            {suggestions.map((sg, i) => (
              <TouchableOpacity
                key={i}
                style={[s.suggestCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={sg.action}
                activeOpacity={0.8}
              >
                <View style={s.suggestIcon}>{sg.icon}</View>
                <Text style={[s.suggestText, { color: theme.textSecondary }]}>{sg.text}</Text>
                {sg.action && <ChevronRight size={16} color={theme.textMuted} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Achievements */}
      {earnedIds.length > 0 && (
        <View style={[s.section, { marginBottom: 32 }]}>
          <Text style={s.sectionTitle}>Achievements</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.badgeRow}>
            {ACHIEVEMENTS.filter((a) => earnedIds.includes(a.id)).map((a) => {
              const ai = ACHIEVE_ICONS[a.id];
              return (
                <View key={a.id} style={[s.badge, { backgroundColor: theme.surface, borderColor: (ai?.color ?? theme.yellow) + '44' }]}>
                  <View style={s.badgeIcon}>{ai?.icon ?? <Trophy size={24} color={theme.yellow} />}</View>
                  <Text style={[s.badgeTitle, { color: theme.textSecondary }]}>{a.title}</Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

function HeroStat({ value, label, icon, glow }: { value: number; label: string; icon: React.ReactNode; glow: string }) {
  return (
    <View style={heroStatStyles.wrap}>
      <View style={heroStatStyles.iconWrap}>{icon}</View>
      <Text style={[heroStatStyles.value, { color: '#fff', textShadowColor: glow, textShadowRadius: 8 }]}>{value}</Text>
      <Text style={heroStatStyles.label}>{label}</Text>
    </View>
  );
}
const heroStatStyles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center' },
  iconWrap: { marginBottom: 4 },
  value: { fontSize: 28, fontWeight: '800', textShadowOffset: { width: 0, height: 0 } },
  label: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '500', marginTop: 1 },
});

function ProgressRow({ label, current, total, progress, color, purple, theme, unit = '' }: any) {
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '600' }}>{label}</Text>
        <Text style={{ color: theme.textPrimary, fontSize: 13, fontWeight: '700' }}>{current}{unit} / {total}{unit}</Text>
      </View>
      <View style={{ height: 8, backgroundColor: theme.border, borderRadius: 6, overflow: 'hidden' }}>
        <LinearGradient
          colors={[color, purple]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={{ height: 8, width: `${Math.max(progress * 100, 2)}%`, borderRadius: 6 }}
        />
      </View>
    </View>
  );
}

function ActionCard({ icon, label, gradient, onPress, theme }: { icon: React.ReactNode; label: string; gradient: [string, string]; onPress: () => void; theme: any }) {
  return (
    <TouchableOpacity style={styles2.wrap} onPress={onPress} activeOpacity={0.85}>
      <LinearGradient colors={gradient} style={styles2.card}>
        <View style={styles2.iconCircle}>{icon}</View>
        <Text style={styles2.label}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}
const styles2 = StyleSheet.create({
  wrap: { width: (width - 56) / 2, borderRadius: 18, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
  card: { padding: 18, alignItems: 'flex-start', minHeight: 100 },
  iconCircle: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  label: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

function buildSuggestions({ pending, completed, todayFocusMin, todayMood, streak, quizResults, nav }: any) {
  const list: { icon: React.ReactNode; text: string; action?: () => void }[] = [];
  if (!todayMood) list.push({ icon: <Smile size={20} color="#10b981" />, text: 'Log your mood for today to track your wellbeing.', action: () => nav.navigate('Mood') });
  if (pending.length === 0 && completed.length === 0) list.push({ icon: <PenLine size={20} color="#8B5CF6" />, text: 'No tasks yet. Add something to your planner!', action: () => nav.navigate('Planner') });
  if (todayFocusMin === 0) list.push({ icon: <Clock size={20} color="#3B82F6" />, text: 'Start a focus session to build your streak.', action: () => nav.navigate('Focus') });
  if (streak >= 3) list.push({ icon: <Flame size={20} color="#f97316" />, text: `You are on a ${streak}-day streak. Keep it up!` });
  if (quizResults.length === 0) list.push({ icon: <BookOpen size={20} color="#8B5CF6" />, text: 'Try the AI Quiz Generator to test your knowledge.', action: () => nav.navigate('Quiz') });
  return list.slice(0, 3);
}

const styles = (theme: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background },
  content: { paddingBottom: 16 },
  hero: { paddingTop: 60, paddingBottom: 28, paddingHorizontal: 24 },
  greeting: { color: theme.heroText, fontSize: 28, fontWeight: '800', letterSpacing: -0.5, lineHeight: 36 },
  subtitle: { color: theme.heroSubText, fontSize: 13, marginTop: 6, marginBottom: 20 },
  heroStats: { flexDirection: 'row', backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', borderRadius: 18, padding: 16, marginTop: 12 },
  heroStatDivider: { width: 1, backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)', marginHorizontal: 4 },
  section: { paddingHorizontal: 20, marginTop: 22 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { color: theme.textPrimary, fontSize: 17, fontWeight: '700', marginBottom: 12 },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  seeAll: { fontSize: 13, fontWeight: '600' },
  progressCard: { borderRadius: 18, padding: 18, borderWidth: 1 },
  progressDivider: { height: 1, backgroundColor: theme.border, marginVertical: 14 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  notesBanner: { borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  notesIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(96,165,250,0.2)', alignItems: 'center', justifyContent: 'center' },
  notesBannerTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 2 },
  notesBannerSub: { color: 'rgba(255,255,255,0.55)', fontSize: 12, lineHeight: 16 },
  tasksCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  taskDot: { width: 8, height: 8, borderRadius: 4 },
  taskTitle: { fontSize: 14, fontWeight: '500', flex: 1 },
  taskDate: { fontSize: 12 },
  moreBtn: { padding: 12, alignItems: 'center' },
  moreText: { fontSize: 13, fontWeight: '600' },
  emptyCard: { borderRadius: 14, padding: 18, alignItems: 'center', borderWidth: 1 },
  emptyText: { color: theme.textMuted, fontSize: 14 },
  suggestList: { gap: 8 },
  suggestCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, borderWidth: 1 },
  suggestIcon: { width: 32, alignItems: 'center' },
  suggestText: { fontSize: 14, lineHeight: 20, flex: 1 },
  badgeRow: { gap: 10, paddingRight: 16 },
  badge: { borderRadius: 14, padding: 14, alignItems: 'center', minWidth: 80, borderWidth: 1 },
  badgeIcon: { marginBottom: 6, alignItems: 'center' as const },
  badgeTitle: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
});
