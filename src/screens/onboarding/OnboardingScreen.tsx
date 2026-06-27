import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from '../../store/useAppStore';
import { useToast } from '../../components/Toast';
import { useTheme } from '../../hooks/useTheme';

const GOALS = [
  { id: 'academic', label: '🎓 Academic Excellence', desc: 'Ace exams and coursework' },
  { id: 'professional', label: '💼 Professional Development', desc: 'Grow skills for career' },
  { id: 'personal', label: '🌱 Personal Growth', desc: 'Learn for the joy of it' },
  { id: 'exam', label: '📋 Exam Preparation', desc: 'Focus on test readiness' },
];

export default function OnboardingScreen() {
  const { theme } = useTheme();
  const { user, completeOnboarding } = useAppStore();
  const { showToast } = useToast();

  const [selectedGoal, setSelectedGoal] = useState('');
  const [saving, setSaving] = useState(false);

  const handleFinish = async () => {
    if (!selectedGoal) { showToast('Please choose a goal', 'error'); return; }
    setSaving(true);
    try {
      const goalLabel = GOALS.find((g) => g.id === selectedGoal)?.label ?? selectedGoal;
      await completeOnboarding(user?.name ?? '', goalLabel);
    } catch (err: any) {
      showToast(err.message ?? 'Something went wrong', 'error');
    } finally {
      setSaving(false);
    }
  };

  const s = styles(theme);

  return (
    <LinearGradient colors={theme.heroGradient} style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.wave}>👋</Text>
        <Text style={s.title}>
          Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
        </Text>
        <Text style={s.sub}>What's your main study goal? We'll personalise your experience.</Text>

        <View style={s.goalList}>
          {GOALS.map((g) => (
            <TouchableOpacity
              key={g.id}
              style={[s.goalCard, selectedGoal === g.id && s.goalCardActive, { backgroundColor: theme.surface, borderColor: selectedGoal === g.id ? '#8b5cf6' : theme.border }]}
              onPress={() => setSelectedGoal(g.id)}
              activeOpacity={0.8}
            >
              <Text style={[s.goalLabel, { color: theme.textPrimary }]}>{g.label}</Text>
              <Text style={[s.goalDesc, { color: theme.textSecondary }]}>{g.desc}</Text>
              {selectedGoal === g.id && (
                <View style={s.checkMark}><Text style={s.checkText}>✓</Text></View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[s.btn, !selectedGoal && { opacity: 0.5 }]}
          onPress={handleFinish}
          disabled={saving || !selectedGoal}
          activeOpacity={0.85}
        >
          <LinearGradient colors={['#8b5cf6', '#6d28d9']} style={s.btnGrad}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Let's Study! 🚀</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = (theme: any) => StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 60 },
  wave: { fontSize: 56, textAlign: 'center', marginBottom: 16 },
  title: { color: '#fff', fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 10, letterSpacing: -0.3 },
  sub: { color: 'rgba(255,255,255,0.65)', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  goalList: { gap: 12, marginBottom: 32 },
  goalCard: { borderRadius: 16, padding: 18, borderWidth: 1.5, position: 'relative' },
  goalCardActive: {},
  goalLabel: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  goalDesc: { fontSize: 13 },
  checkMark: {
    position: 'absolute', top: 14, right: 14,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#8b5cf6', alignItems: 'center', justifyContent: 'center',
  },
  checkText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  btn: { borderRadius: 16, overflow: 'hidden' },
  btnGrad: { paddingVertical: 18, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
