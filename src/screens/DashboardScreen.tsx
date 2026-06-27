import React from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';
import { useAppStore, getStreak } from '../store/useAppStore';
import { useTheme } from '../hooks/useTheme';

const { width } = Dimensions.get('window');
const CHART_W = width - 48;

function getLast7DayLabels() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  });
}

function getLast7Dates() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
}

const MOOD_SCORES: Record<string, number> = { great: 5, good: 4, okay: 3, low: 2, stressed: 1 };

export default function DashboardScreen() {
  const { theme } = useTheme();
  const nav = useNavigation();
  const { tasks, focusSessions, moods, quizResults } = useAppStore();

  const streak = getStreak(tasks, focusSessions);
  const dates = getLast7Dates();
  const labels = getLast7DayLabels();

  const taskData = dates.map((d) =>
    tasks.filter((t) => t.completed && t.completedAt?.slice(0, 10) === d).length
  );

  const focusData = dates.map((d) =>
    focusSessions.filter((s) => s.date === d && s.type === 'work').reduce((a, s) => a + s.duration, 0) / 60
  );

  const moodData = dates.map((d) => {
    const entry = moods.find((m) => m.date === d);
    return entry ? MOOD_SCORES[entry.mood] ?? 3 : 0;
  });

  const chartConfig = {
    backgroundGradientFrom: theme.surface,
    backgroundGradientTo: theme.surface,
    color: (opacity = 1) => `rgba(59,130,246,${opacity})`,
    labelColor: () => theme.textMuted,
    strokeWidth: 2,
    propsForDots: { r: '4', fill: theme.blue },
    decimalPlaces: 1,
  };

  const totalTasksDone = tasks.filter((t) => t.completed).length;
  const totalFocusHours = (focusSessions.filter((s) => s.type === 'work').reduce((a, s) => a + s.duration, 0) / 60).toFixed(1);
  const avgQuizScore = quizResults.length
    ? Math.round(quizResults.reduce((a, r) => a + (r.score / r.total) * 100, 0) / quizResults.length)
    : 0;

  const s = styles(theme);

  return (
    <View style={s.root}>
      <LinearGradient colors={[theme.headerGradient[0], theme.headerGradient[2]]} style={s.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={s.backBtn}>
          <ArrowLeft size={22} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Progress Dashboard</Text>
        <Text style={s.headerSub}>Your learning analytics</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Summary stats */}
        <View style={s.statsRow}>
          <StatCard label="Tasks Done" value={totalTasksDone.toString()} emoji="✅" theme={theme} />
          <StatCard label="Focus Hours" value={totalFocusHours} emoji="⏱️" theme={theme} />
          <StatCard label="Streak" value={`${streak}d`} emoji="🔥" theme={theme} />
          <StatCard label="Avg Quiz" value={quizResults.length ? `${avgQuizScore}%` : '—'} emoji="🧠" theme={theme} />
        </View>

        {/* Task completion chart */}
        <View style={s.chartSection}>
          <Text style={s.chartTitle}>Tasks Completed — Last 7 Days</Text>
          <View style={s.chartCard}>
            <BarChart
              data={{ labels, datasets: [{ data: taskData.map((v) => Math.max(v, 0)) }] }}
              width={CHART_W}
              height={180}
              chartConfig={{ ...chartConfig, color: (op = 1) => `rgba(59,130,246,${op})` }}
              style={{ borderRadius: 12 }}
              fromZero
              showValuesOnTopOfBars
              yAxisLabel=""
              yAxisSuffix=""
            />
          </View>
        </View>

        {/* Focus sessions chart */}
        <View style={s.chartSection}>
          <Text style={s.chartTitle}>Focus Hours — Last 7 Days</Text>
          <View style={s.chartCard}>
            <BarChart
              data={{ labels, datasets: [{ data: focusData.map((v) => parseFloat(v.toFixed(1))) }] }}
              width={CHART_W}
              height={180}
              chartConfig={{ ...chartConfig, color: (op = 1) => `rgba(139,92,246,${op})` }}
              style={{ borderRadius: 12 }}
              fromZero
              showValuesOnTopOfBars
              yAxisLabel=""
              yAxisSuffix="h"
            />
          </View>
        </View>

        {/* Mood trend chart */}
        {moods.length >= 2 && (
          <View style={s.chartSection}>
            <Text style={s.chartTitle}>Mood Trend — Last 7 Days</Text>
            <View style={s.chartCard}>
              <LineChart
                data={{ labels, datasets: [{ data: moodData }] }}
                width={CHART_W}
                height={180}
                chartConfig={{
                  ...chartConfig,
                  color: (op = 1) => `rgba(16,185,129,${op})`,
                  propsForDots: { r: '5', fill: theme.green },
                }}
                style={{ borderRadius: 12 }}
                bezier
                fromZero
              />
            </View>
            <Text style={s.moodNote}>1=Stressed · 3=Okay · 5=Great</Text>
          </View>
        )}

        {/* Weekly summary */}
        <View style={[s.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={s.summaryTitle}>📊 Weekly Summary</Text>
          <SummaryRow label="Tasks completed this week" value={taskData.reduce((a, v) => a + v, 0).toString()} theme={theme} />
          <SummaryRow label="Focus sessions this week" value={dates.reduce((a, d) => a + focusSessions.filter((s) => s.date === d && s.type === 'work').length, 0).toString()} theme={theme} />
          <SummaryRow label="Moods logged this week" value={dates.filter((d) => moods.find((m) => m.date === d)).length.toString()} theme={theme} />
          <SummaryRow label="Quizzes taken total" value={quizResults.length.toString()} theme={theme} />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function StatCard({ label, value, emoji, theme }: any) {
  return (
    <View style={[statStyles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={statStyles.emoji}>{emoji}</Text>
      <Text style={[statStyles.value, { color: theme.textPrimary }]}>{value}</Text>
      <Text style={[statStyles.label, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

function SummaryRow({ label, value, theme }: any) {
  return (
    <View style={sumStyles.row}>
      <Text style={[sumStyles.label, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[sumStyles.value, { color: theme.textPrimary }]}>{value}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: { flex: 1, borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1 },
  emoji: { fontSize: 20, marginBottom: 4 },
  value: { fontSize: 20, fontWeight: '700' },
  label: { fontSize: 10, textAlign: 'center', marginTop: 2 },
});

const sumStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(128,128,128,0.2)' },
  label: { fontSize: 14 },
  value: { fontSize: 14, fontWeight: '700' },
});

const styles = (theme: any) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.background },
    header: { paddingTop: 56, paddingBottom: 20, paddingHorizontal: 24 },
    backBtn: { marginBottom: 12 },
    headerTitle: { color: theme.textPrimary, fontSize: 28, fontWeight: '700' },
    headerSub: { color: theme.textSecondary, fontSize: 14, marginTop: 4 },
    content: { padding: 20 },
    statsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    chartSection: { marginTop: 20 },
    chartTitle: { color: theme.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 10 },
    chartCard: { backgroundColor: theme.surface, borderRadius: 16, padding: 8, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' },
    moodNote: { color: theme.textMuted, fontSize: 11, marginTop: 6, textAlign: 'center' },
    summaryCard: { marginTop: 20, borderRadius: 16, padding: 16, borderWidth: 1 },
    summaryTitle: { color: theme.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  });
