import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Dimensions, ScrollView, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from '../../store/useAppStore';
import { useToast } from '../../components/Toast';
import { useTheme } from '../../hooks/useTheme';

const { width } = Dimensions.get('window');

const GOALS = [
  { id: 'academic', label: '🎓 Academic Excellence', desc: 'Ace exams and coursework' },
  { id: 'professional', label: '💼 Professional Development', desc: 'Grow skills for career' },
  { id: 'personal', label: '🌱 Personal Growth', desc: 'Learn for the joy of it' },
  { id: 'exam', label: '📋 Exam Preparation', desc: 'Focus on test readiness' },
];

const SLIDES = [
  {
    emoji: '📚',
    title: 'Welcome to StudyMate',
    body: 'Your AI-powered companion for smarter, more effective studying.',
  },
  {
    emoji: '🧠',
    title: 'AI Quiz Generator',
    body: 'Generate custom quizzes on any topic with instant explanations.',
  },
  {
    emoji: '⏱️',
    title: 'Pomodoro Focus Timer',
    body: 'Stay focused with timed sessions and track your study hours.',
  },
  {
    emoji: '🤖',
    title: 'Your AI Study Coach',
    body: 'Get personalized guidance, tips, and motivation whenever you need it.',
  },
];

export default function OnboardingScreen() {
  const { theme } = useTheme();
  const { completeOnboarding } = useAppStore();
  const { showToast } = useToast();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [selectedGoal, setSelectedGoal] = useState('');
  const slideAnim = useRef(new Animated.Value(0)).current;

  const totalSteps = SLIDES.length + 2; // slides + name + goal

  const animate = (next: number) => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -20, duration: 120, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setStep(next));
  };

  const handleNext = () => {
    if (step === SLIDES.length && !name.trim()) {
      showToast('Please enter your name', 'error');
      return;
    }
    if (step === SLIDES.length + 1) {
      if (!selectedGoal) {
        showToast('Please choose a goal', 'error');
        return;
      }
      const goalLabel = GOALS.find((g) => g.id === selectedGoal)?.label ?? selectedGoal;
      completeOnboarding(name.trim(), goalLabel);
      return;
    }
    animate(step + 1);
  };

  const s = styles(theme);

  const isNameStep = step === SLIDES.length;
  const isGoalStep = step === SLIDES.length + 1;
  const isSlide = step < SLIDES.length;
  const slide = isSlide ? SLIDES[step] : null;

  const progress = (step + 1) / totalSteps;

  return (
    <View style={s.root}>
      <LinearGradient colors={[theme.background, theme.surface + 'CC']} style={StyleSheet.absoluteFill} />

      {/* Progress bar */}
      <View style={s.progressTrack}>
        <Animated.View style={[s.progressBar, { width: `${progress * 100}%` }]} />
      </View>

      <Animated.View style={[s.content, { transform: [{ translateX: slideAnim }] }]}>
        {isSlide && slide && (
          <View style={s.slideWrap}>
            <Text style={s.slideEmoji}>{slide.emoji}</Text>
            <Text style={s.slideTitle}>{slide.title}</Text>
            <Text style={s.slideBody}>{slide.body}</Text>
          </View>
        )}

        {isNameStep && (
          <View style={s.inputStep}>
            <Text style={s.slideEmoji}>👋</Text>
            <Text style={s.slideTitle}>What's your name?</Text>
            <Text style={s.slideBody}>We'll personalize your experience just for you.</Text>
            <TextInput
              style={s.nameInput}
              placeholder="Enter your name..."
              placeholderTextColor={theme.textMuted}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoFocus
            />
          </View>
        )}

        {isGoalStep && (
          <View style={s.goalStep}>
            <Text style={s.slideEmoji}>🎯</Text>
            <Text style={s.slideTitle}>What's your study goal?</Text>
            <Text style={s.slideBody}>We'll tailor suggestions to match your ambitions.</Text>
            <View style={s.goalList}>
              {GOALS.map((g) => (
                <TouchableOpacity
                  key={g.id}
                  style={[s.goalCard, selectedGoal === g.id && s.goalCardActive]}
                  onPress={() => setSelectedGoal(g.id)}
                  activeOpacity={0.8}
                >
                  <Text style={s.goalLabel}>{g.label}</Text>
                  <Text style={s.goalDesc}>{g.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </Animated.View>

      {/* Dots */}
      <View style={s.dots}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <View key={i} style={[s.dot, i === step && s.dotActive]} />
        ))}
      </View>

      <TouchableOpacity style={s.nextBtn} onPress={handleNext} activeOpacity={0.85}>
        <LinearGradient colors={theme.gradient} style={s.nextGrad}>
          <Text style={s.nextText}>
            {step < totalSteps - 1 ? 'Continue →' : "Let's Go! 🚀"}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.background, paddingHorizontal: 24 },
    progressTrack: {
      height: 3,
      backgroundColor: theme.border,
      borderRadius: 2,
      marginTop: 56,
      marginBottom: 8,
    },
    progressBar: { height: 3, backgroundColor: theme.blue, borderRadius: 2 },
    content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    slideWrap: { alignItems: 'center' },
    slideEmoji: { fontSize: 72, marginBottom: 24 },
    slideTitle: {
      color: theme.textPrimary,
      fontSize: 26,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: 12,
      letterSpacing: -0.3,
    },
    slideBody: {
      color: theme.textSecondary,
      fontSize: 16,
      textAlign: 'center',
      lineHeight: 24,
      maxWidth: 300,
    },
    inputStep: { alignItems: 'center', width: '100%' },
    nameInput: {
      backgroundColor: theme.inputBg,
      borderRadius: 14,
      paddingHorizontal: 20,
      paddingVertical: 16,
      color: theme.textPrimary,
      fontSize: 18,
      borderWidth: 1,
      borderColor: theme.blue,
      width: '100%',
      marginTop: 24,
      textAlign: 'center',
    },
    goalStep: { width: '100%', alignItems: 'center' },
    goalList: { width: '100%', marginTop: 20, gap: 10 },
    goalCard: {
      backgroundColor: theme.surface,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
    goalCardActive: { borderColor: theme.purple, backgroundColor: theme.purple + '22' },
    goalLabel: { color: theme.textPrimary, fontSize: 15, fontWeight: '600' },
    goalDesc: { color: theme.textSecondary, fontSize: 13, marginTop: 2 },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 16 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.border },
    dotActive: { width: 18, backgroundColor: theme.blue },
    nextBtn: { borderRadius: 16, overflow: 'hidden', marginBottom: 40 },
    nextGrad: { paddingVertical: 18, alignItems: 'center' },
    nextText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  });
