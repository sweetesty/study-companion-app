import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
  Animated, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useAppStore } from '../../store/useAppStore';
import { useTheme } from '../../hooks/useTheme';

const { width, height } = Dimensions.get('window');
const AUTO_ADVANCE_MS = 3200;

const SLIDES = [
  {
    emoji: '📚',
    title: 'Welcome to StudyMate',
    body: 'Your AI-powered companion for smarter, more effective studying.',
    gradient: ['#1a0533', '#0d1b3e'] as [string, string],
    accent: '#8b5cf6',
  },
  {
    emoji: '🧠',
    title: 'AI Quiz Generator',
    body: 'Generate custom quizzes on any topic with instant explanations.',
    gradient: ['#0d1b3e', '#0c1a2e'] as [string, string],
    accent: '#3b82f6',
  },
  {
    emoji: '📝',
    title: 'Study from Notes',
    body: 'Upload your PDFs or paste notes — get flashcards, quizzes, and more.',
    gradient: ['#0c1a2e', '#0f172a'] as [string, string],
    accent: '#6366f1',
  },
  {
    emoji: '⏱️',
    title: 'Pomodoro Focus Timer',
    body: 'Stay focused with timed sessions and track your study hours.',
    gradient: ['#0f172a', '#111827'] as [string, string],
    accent: '#10b981',
  },
  {
    emoji: '🤖',
    title: 'Your AI Study Coach',
    body: 'Get personalized guidance, a custom study plan, and motivation.',
    gradient: ['#111827', '#1a0533'] as [string, string],
    accent: '#f59e0b',
  },
];

export default function IntroScreen() {
  const { theme } = useTheme();
  const { markIntroSeen } = useAppStore();

  const [index, setIndex] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const progressRef = useRef<Animated.CompositeAnimation | null>(null);

  const advance = (next: number) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.96, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setIndex(next);
      fadeAnim.setValue(0);
      scaleAnim.setValue(1.03);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    });
  };

  useEffect(() => {
    progressAnim.setValue(0);
    if (progressRef.current) progressRef.current.stop();
    progressRef.current = Animated.timing(progressAnim, {
      toValue: 1,
      duration: AUTO_ADVANCE_MS,
      useNativeDriver: false,
    });
    progressRef.current.start(({ finished }) => {
      if (!finished) return;
      if (index < SLIDES.length - 1) {
        advance(index + 1);
      }
      // last slide — leave progress full, user taps Get Started
    });
    return () => { if (progressRef.current) progressRef.current.stop(); };
  }, [index]);

  const handleDotPress = (i: number) => {
    if (i !== index) advance(i);
  };

  const swipeGesture = Gesture.Pan()
    .runOnJS(true)
    .onEnd((e) => {
      if (e.translationX < -50 && index < SLIDES.length - 1) {
        advance(index + 1);
      } else if (e.translationX > 50 && index > 0) {
        advance(index - 1);
      }
    });

  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <GestureDetector gesture={swipeGesture}>
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={slide.gradient} style={StyleSheet.absoluteFill} />

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: progressWidth, backgroundColor: slide.accent }]} />
      </View>

      {/* Skip */}
      <TouchableOpacity style={styles.skipBtn} onPress={markIntroSeen} activeOpacity={0.7}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Content */}
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={[styles.emojiWrap, { backgroundColor: slide.accent + '22', borderColor: slide.accent + '55' }]}>
          <Text style={styles.emoji}>{slide.emoji}</Text>
        </View>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.body}>{slide.body}</Text>
      </Animated.View>

      {/* Dots */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => handleDotPress(i)} hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}>
            <Animated.View
              style={[
                styles.dot,
                i === index
                  ? { width: 24, backgroundColor: slide.accent }
                  : { backgroundColor: 'rgba(255,255,255,0.3)' },
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* CTA */}
      {isLast ? (
        <TouchableOpacity style={styles.ctaBtn} onPress={markIntroSeen} activeOpacity={0.85}>
          <LinearGradient colors={[slide.accent, slide.accent + 'aa']} style={styles.ctaGrad}>
            <Text style={styles.ctaText}>Get Started 🚀</Text>
          </LinearGradient>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.nextBtn} onPress={() => advance(index + 1)} activeOpacity={0.8}>
          <Text style={[styles.nextText, { color: slide.accent }]}>Next →</Text>
        </TouchableOpacity>
      )}
    </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  progressTrack: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  progressFill: { height: 3, borderRadius: 2 },
  skipBtn: { position: 'absolute', top: 56, right: 24 },
  skipText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '600' },
  content: { alignItems: 'center', paddingHorizontal: 36, marginBottom: 60 },
  emojiWrap: {
    width: 120, height: 120, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginBottom: 36,
  },
  emoji: { fontSize: 58 },
  title: {
    color: '#fff', fontSize: 28, fontWeight: '800',
    textAlign: 'center', marginBottom: 16, letterSpacing: -0.4,
    lineHeight: 34,
  },
  body: {
    color: 'rgba(255,255,255,0.65)', fontSize: 16,
    textAlign: 'center', lineHeight: 24, maxWidth: 300,
  },
  dotsRow: {
    position: 'absolute', bottom: 140,
    flexDirection: 'row', gap: 8, alignItems: 'center',
  },
  dot: { height: 6, borderRadius: 3, width: 6 },
  ctaBtn: {
    position: 'absolute', bottom: 52,
    left: 32, right: 32, borderRadius: 18, overflow: 'hidden',
  },
  ctaGrad: { paddingVertical: 20, alignItems: 'center' },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.2 },
  nextBtn: { position: 'absolute', bottom: 68, right: 32 },
  nextText: { fontSize: 16, fontWeight: '700' },
});
