import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BookOpen } from 'lucide-react-native';
import {
  Home, ClipboardList, Timer, MessageSquare, User,
} from 'lucide-react-native';

import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../hooks/useTheme';

import AuthScreen from '../screens/auth/AuthScreen';
import IntroScreen from '../screens/onboarding/IntroScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import HomeScreen from '../screens/HomeScreen';
import PlannerScreen from '../screens/PlannerScreen';
import MoodScreen from '../screens/MoodScreen';
import FocusScreen from '../screens/FocusScreen';
import QuizScreen from '../screens/QuizScreen';
import DashboardScreen from '../screens/DashboardScreen';
import CoachScreen from '../screens/CoachScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NotesScreen from '../screens/NotesScreen';

export type RootStackParamList = {
  Intro: undefined;
  Auth: undefined;
  Onboarding: undefined;
  Main: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Planner: undefined;
  Focus: undefined;
  Coach: undefined;
  Profile: undefined;
};

export type HomeStackParamList = {
  HomeMain: undefined;
  Mood: undefined;
  Quiz: undefined;
  Dashboard: undefined;
  Notes: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();

function HomeStackNavigator() {
  const { theme } = useTheme();
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen name="Mood" component={MoodScreen} />
      <HomeStack.Screen name="Quiz" component={QuizScreen} />
      <HomeStack.Screen name="Dashboard" component={DashboardScreen} />
      <HomeStack.Screen name="Notes" component={NotesScreen} />
    </HomeStack.Navigator>
  );
}

function MainTabs() {
  const { theme } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.tabBarBorder,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.blue,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{ tabBarIcon: ({ color }) => <Home size={22} color={color} /> }}
      />
      <Tab.Screen
        name="Planner"
        component={PlannerScreen}
        options={{ tabBarIcon: ({ color }) => <ClipboardList size={22} color={color} /> }}
      />
      <Tab.Screen
        name="Focus"
        component={FocusScreen}
        options={{ tabBarIcon: ({ color }) => <Timer size={22} color={color} /> }}
      />
      <Tab.Screen
        name="Coach"
        component={CoachScreen}
        options={{
          tabBarIcon: ({ color }) => <MessageSquare size={22} color={color} />,
          tabBarBadge: undefined,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ color }) => <User size={22} color={color} /> }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { theme } = useTheme();
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const hasCompletedOnboarding = useAppStore((s) => s.hasCompletedOnboarding);
  const hasSeenIntro = useAppStore((s) => s.hasSeenIntro);
  const isLoading = useAppStore((s) => s.isLoading);

  if (isLoading) {
    return <SplashLoader theme={theme} />;
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {isAuthenticated && hasCompletedOnboarding ? (
          <RootStack.Screen name="Main" component={MainTabs} />
        ) : isAuthenticated && !hasCompletedOnboarding ? (
          <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : hasSeenIntro ? (
          <RootStack.Screen name="Auth" component={AuthScreen} />
        ) : (
          <RootStack.Screen name="Intro" component={IntroScreen} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

function SplashLoader({ theme }: { theme: any }) {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const SkeletonBar = ({ width, height = 14, style }: { width: string | number; height?: number; style?: any }) => (
    <Animated.View style={[{ width, height, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.12)', opacity: pulse }, style]} />
  );

  return (
    <LinearGradient colors={['#1a0533', '#0d1b3e', '#0B0B0B']} style={splash.root}>
      {/* Logo */}
      <View style={splash.logoArea}>
        <LinearGradient colors={['#3B82F6', '#8B5CF6']} style={splash.logoCircle}>
          <BookOpen size={34} color="#fff" />
        </LinearGradient>
        <Text style={splash.appName}>StudyMate</Text>
        <Text style={splash.tagline}>Your AI-powered study companion</Text>
      </View>

      {/* Skeleton content */}
      <View style={splash.skeletonArea}>
        {/* Hero card skeleton */}
        <View style={splash.skeletonCard}>
          <SkeletonBar width={120} height={12} style={{ marginBottom: 10 }} />
          <SkeletonBar width="90%" height={22} style={{ marginBottom: 8 }} />
          <SkeletonBar width="70%" height={14} />
        </View>

        {/* Stats row skeleton */}
        <View style={splash.skeletonRow}>
          {[1, 2, 3, 4].map((i) => (
            <Animated.View key={i} style={[splash.skeletonStat, { opacity: pulse }]} />
          ))}
        </View>

        {/* List items skeleton */}
        {[1, 2, 3].map((i) => (
          <View key={i} style={splash.skeletonItem}>
            <Animated.View style={[splash.skeletonDot, { opacity: pulse }]} />
            <View style={{ flex: 1, gap: 6 }}>
              <SkeletonBar width="75%" height={12} />
              <SkeletonBar width="50%" height={10} />
            </View>
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}

const splash = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  logoArea: { alignItems: 'center', marginBottom: 52 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  appName: { color: '#fff', fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  tagline: { color: 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 6 },
  skeletonArea: { width: '100%', gap: 14 },
  skeletonCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16, padding: 18, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  skeletonRow: { flexDirection: 'row', gap: 10 },
  skeletonStat: {
    flex: 1, height: 72, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  skeletonItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14, padding: 14, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  skeletonDot: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
});
