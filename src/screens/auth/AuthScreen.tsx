import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Animated, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BookOpen, Eye, EyeOff } from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';
import { useToast } from '../../components/Toast';
import { useTheme } from '../../hooks/useTheme';

export default function AuthScreen() {
  const { theme } = useTheme();
  const { signIn, signUp } = useAppStore();
  const { showToast } = useToast();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;

  const switchMode = (next: 'login' | 'signup') => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
    setMode(next);
    setEmail(''); setName(''); setPassword('');
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      showToast('Please fill in all fields', 'error');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      showToast('Please enter your name', 'error');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signup') {
        await signUp(email.trim(), name.trim(), password);
        showToast('Account created!', 'success');
      } else {
        await signIn(email.trim(), password);
        showToast('Welcome back!', 'success');
      }
    } catch (err: any) {
      showToast(err.message ?? 'Something went wrong', 'error');
    } finally {
      setLoading(false);
    }
  };

  const s = styles(theme);

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={[theme.background, theme.surface]} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={s.logoWrap}>
          <LinearGradient colors={theme.gradient} style={s.logoCircle}>
            <BookOpen size={32} color="#fff" />
          </LinearGradient>
          <Text style={s.appName}>StudyMate</Text>
          <Text style={s.tagline}>Your AI-powered study companion</Text>
        </View>

        <Animated.View style={[s.card, { opacity: fadeAnim }]}>
          <Text style={s.cardTitle}>{mode === 'login' ? 'Welcome back' : 'Create account'}</Text>

          {mode === 'signup' && (
            <View style={s.inputGroup}>
              <Text style={s.label}>Full name</Text>
              <TextInput
                style={s.input}
                placeholder="Your name"
                placeholderTextColor={theme.textMuted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={s.inputGroup}>
            <Text style={s.label}>Email</Text>
            <TextInput
              style={s.input}
              placeholder="you@example.com"
              placeholderTextColor={theme.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>Password</Text>
            <View style={s.passRow}>
              <TextInput
                style={[s.input, { flex: 1, marginBottom: 0 }]}
                placeholder="••••••••"
                placeholderTextColor={theme.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)} style={s.eyeBtn}>
                {showPass ? <EyeOff size={18} color={theme.textMuted} /> : <Eye size={18} color={theme.textMuted} />}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={s.submitBtn}
            onPress={handleSubmit}
            activeOpacity={0.85}
            disabled={loading}
          >
            <LinearGradient colors={theme.gradient} style={s.submitGrad}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.submitText}>{mode === 'login' ? 'Sign In' : 'Sign Up'}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={s.switchRow}>
            <Text style={s.switchText}>
              {mode === 'login' ? "Don't have an account? " : 'Already have one? '}
            </Text>
            <TouchableOpacity onPress={() => switchMode(mode === 'login' ? 'signup' : 'login')}>
              <Text style={s.switchLink}>{mode === 'login' ? 'Sign Up' : 'Sign In'}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.background },
    scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
    logoWrap: { alignItems: 'center', marginBottom: 40 },
    logoCircle: {
      width: 72, height: 72, borderRadius: 20,
      alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    },
    appName: { color: theme.textPrimary, fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
    tagline: { color: theme.textSecondary, fontSize: 14, marginTop: 4 },
    card: {
      backgroundColor: theme.surface,
      borderRadius: 20,
      padding: 24,
      borderWidth: 1,
      borderColor: theme.border,
    },
    cardTitle: { color: theme.textPrimary, fontSize: 22, fontWeight: '700', marginBottom: 24 },
    inputGroup: { marginBottom: 16 },
    label: { color: theme.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 6 },
    input: {
      backgroundColor: theme.inputBg,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      color: theme.textPrimary,
      fontSize: 15,
      borderWidth: 1,
      borderColor: theme.inputBorder,
    },
    passRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    eyeBtn: { padding: 12 },
    submitBtn: { marginTop: 8, borderRadius: 14, overflow: 'hidden' },
    submitGrad: { paddingVertical: 16, alignItems: 'center' },
    submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
    switchText: { color: theme.textSecondary, fontSize: 14 },
    switchLink: { color: theme.blue, fontSize: 14, fontWeight: '600' },
  });
