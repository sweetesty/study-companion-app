import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { Play, Pause, RotateCcw, Coffee, Brain } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import { useAppStore } from '../store/useAppStore';
import { useToast } from '../components/Toast';
import { useTheme } from '../hooks/useTheme';
import { CelebrationOverlay } from '../components/CelebrationOverlay';
import { requestPermissions } from '../services/notificationService';

const BREAK_MINUTES = 5;
const DURATION_OPTIONS = [15, 25, 45, 60, 90];

function CircularTimer({ progress, color, size = 220, strokeWidth = 14 }: {
  progress: number; color: string; size?: number; strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke={color + '22'} strokeWidth={strokeWidth} fill="transparent" />
      <Circle
        cx={size / 2} cy={size / 2} r={radius}
        stroke={color} strokeWidth={strokeWidth} fill="transparent"
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}

export default function FocusScreen() {
  const { theme } = useTheme();
  const { focusSessions, addFocusSession } = useAppStore();
  const { showToast } = useToast();

  const [isWork, setIsWork] = useState(true);
  const [workMinutes, setWorkMinutes] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSeconds = (isWork ? workMinutes : BREAK_MINUTES) * 60;
  const progress = timeLeft / totalSeconds;

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setRunning(false);
  }, []);

  const fireCompletionAlert = useCallback(async (isWorkSession: boolean) => {
    // Fire an immediate notification so the phone plays its default alert sound
    try {
      const granted = await requestPermissions();
      if (granted) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: isWorkSession ? 'Focus session complete!' : 'Break time is over!',
            body: isWorkSession
              ? `${workMinutes} min done. Take a 5-minute break!`
              : 'Time to get back to work!',
            sound: true,
            ...(Platform.OS === 'android' ? { channelId: 'study-reminders' } : {}),
          },
          trigger: null, // fires immediately
        });
      }
    } catch (_) {}
  }, [workMinutes]);

  const handleComplete = useCallback(() => {
    stop();
    if (isWork) {
      addFocusSession({
        duration: workMinutes,
        type: 'work',
        date: new Date().toISOString().slice(0, 10),
        completedAt: new Date().toISOString(),
      });
      setSessionCount((c) => c + 1);
      setShowCelebration(true);
      setIsWork(false);
      setTimeLeft(BREAK_MINUTES * 60);
      fireCompletionAlert(true);
    } else {
      showToast('Break over! Time to focus.', 'info');
      fireCompletionAlert(false);
      setIsWork(true);
      setTimeLeft(workMinutes * 60);
    }
  }, [isWork, workMinutes, stop, addFocusSession, showToast, fireCompletionAlert]);

  // Tick — pure updater, no side effects inside
  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1));
    }, 1000);
    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };
  }, [running]);

  // Completion — fires once when timeLeft reaches 0 while running
  useEffect(() => {
    if (timeLeft === 0 && running) handleComplete();
  }, [timeLeft, running, handleComplete]);

  const toggle = () => {
    if (running) { stop(); } else { setRunning(true); }
  };

  const reset = () => {
    stop();
    setTimeLeft((isWork ? workMinutes : BREAK_MINUTES) * 60);
  };

  const selectDuration = (mins: number) => {
    if (running) return;
    setWorkMinutes(mins);
    if (isWork) setTimeLeft(mins * 60);
  };

  const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const seconds = (timeLeft % 60).toString().padStart(2, '0');

  const color = isWork ? theme.blue : theme.green;

  const today = new Date().toISOString().slice(0, 10);
  const todaySessions = focusSessions.filter((s) => s.date === today && s.type === 'work');
  const todayMinutes = todaySessions.reduce((a, s) => a + s.duration, 0);

  const s = styles(theme);

  return (
    <View style={s.root}>
      <LinearGradient colors={[theme.headerGradient[0], theme.headerGradient[2]]} style={s.header}>
        <Text style={s.headerTitle}>Focus Mode</Text>
        <Text style={s.headerSub}>
          {isWork ? 'Work Session' : 'Break Time'} · Session #{sessionCount + 1}
        </Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Duration picker — only when not running and in work mode */}
        {isWork && !running && (
          <View style={s.durationRow}>
            {DURATION_OPTIONS.map((mins) => (
              <TouchableOpacity
                key={mins}
                style={[s.durationBtn, workMinutes === mins && { backgroundColor: color + '33', borderColor: color }]}
                onPress={() => selectDuration(mins)}
              >
                <Text style={[s.durationText, { color: workMinutes === mins ? color : theme.textSecondary }]}>
                  {mins}m
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Timer */}
        <View style={s.timerWrap}>
          <CircularTimer progress={progress} color={color} />
          <View style={s.timerInner}>
            <Text style={[s.timerTime, { color }]}>{minutes}:{seconds}</Text>
            <Text style={s.timerLabel}>{isWork ? 'Focus' : 'Break'}</Text>
          </View>
        </View>

        {/* Controls */}
        <View style={s.controls}>
          <TouchableOpacity style={[s.ctrlBtn, { borderColor: theme.border }]} onPress={reset}>
            <RotateCcw size={22} color={theme.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={s.playBtn} onPress={toggle} activeOpacity={0.85}>
            <LinearGradient colors={[color, color + 'CC']} style={s.playGrad}>
              {running ? <Pause size={28} color="#fff" /> : <Play size={28} color="#fff" />}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.ctrlBtn, { borderColor: theme.border }]}
            onPress={() => { stop(); setIsWork(!isWork); setTimeLeft((!isWork ? workMinutes : BREAK_MINUTES) * 60); }}
          >
            {isWork
              ? <Coffee size={22} color={theme.textSecondary} />
              : <Brain size={22} color={theme.blue} />
            }
          </TouchableOpacity>
        </View>

        {/* Today stats */}
        <View style={s.statsRow}>
          <StatBox label="Today's Sessions" value={todaySessions.length.toString()} theme={theme} />
          <StatBox label="Focus Minutes" value={todayMinutes.toString()} theme={theme} />
          <StatBox label="This Session" value={`#${sessionCount + 1}`} theme={theme} />
        </View>

        {/* Session history */}
        {todaySessions.length > 0 && (
          <>
            <Text style={s.historyLabel}>Today's Sessions</Text>
            <View style={s.historyCard}>
              {todaySessions.slice(0, 8).map((sess, i) => (
                <View key={sess.id} style={s.historyRow}>
                  <View style={[s.historyDot, { backgroundColor: theme.blue }]} />
                  <Text style={s.historyText}>Session {i + 1} · {sess.duration} min</Text>
                  <Text style={s.historyTime}>{new Date(sess.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
              ))}
            </View>
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      <CelebrationOverlay
        visible={showCelebration}
        title="Focus Session Complete!"
        message={`Great work! You've completed ${sessionCount} session${sessionCount > 1 ? 's' : ''} today. Take a 5-minute break!`}
        onClose={() => setShowCelebration(false)}
      />
    </View>
  );
}

function StatBox({ label, value, theme }: { label: string; value: string; theme: any }) {
  return (
    <View style={[statStyles.box, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[statStyles.value, { color: theme.textPrimary }]}>{value}</Text>
      <Text style={[statStyles.label, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  box: { flex: 1, borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1 },
  value: { fontSize: 22, fontWeight: '700' },
  label: { fontSize: 11, textAlign: 'center', marginTop: 2 },
});

const styles = (theme: any) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.background },
    header: { paddingTop: 56, paddingBottom: 20, paddingHorizontal: 24 },
    headerTitle: { color: theme.textPrimary, fontSize: 28, fontWeight: '700' },
    headerSub: { color: theme.textSecondary, fontSize: 14, marginTop: 4 },
    scroll: { alignItems: 'center', paddingHorizontal: 20 },
    timerWrap: { marginTop: 24, alignItems: 'center', justifyContent: 'center' },
    timerInner: { position: 'absolute', alignItems: 'center' },
    timerTime: { fontSize: 52, fontWeight: '700', letterSpacing: -1 },
    timerLabel: { color: theme.textSecondary, fontSize: 14, fontWeight: '600', marginTop: 4 },
    controls: { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 28 },
    ctrlBtn: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    playBtn: { borderRadius: 36, overflow: 'hidden' },
    playGrad: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
    durationRow: { flexDirection: 'row', gap: 8, marginTop: 16, marginBottom: 4 },
    durationBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: theme.border },
    durationText: { fontSize: 13, fontWeight: '700' },
    statsRow: { flexDirection: 'row', gap: 10, marginTop: 28, width: '100%' },
    historyLabel: { color: theme.textSecondary, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 24, marginBottom: 10, alignSelf: 'flex-start' },
    historyCard: { width: '100%', backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' },
    historyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: theme.border },
    historyDot: { width: 8, height: 8, borderRadius: 4 },
    historyText: { flex: 1, color: theme.textSecondary, fontSize: 14 },
    historyTime: { color: theme.textMuted, fontSize: 12 },
  });
