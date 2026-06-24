import 'react-native-url-polyfill/auto';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { supabase } from './src/lib/supabase';
import { useAppStore } from './src/store/useAppStore';
import { ToastProvider } from './src/components/Toast';
import AppNavigator from './src/navigation/AppNavigator';
import { useTheme } from './src/hooks/useTheme';
import { scheduleAllNotifications } from './src/services/notificationService';

function AppContent() {
  const { isDark } = useTheme();
  const { loadState, loadUserData, signOut } = useAppStore();

  useEffect(() => {
    loadState().then(() => {
      const { notificationSettings, tasks } = useAppStore.getState();
      scheduleAllNotifications(notificationSettings, tasks).catch(() => {});
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await loadUserData(session.user.id);
        useAppStore.setState((s) => ({
          user: s.user ? { ...s.user, email: session.user.email ?? '' } : null,
          isLoading: false,
        }));
      } else if (event === 'SIGNED_OUT') {
        await signOut();
      } else if (event === 'TOKEN_REFRESHED') {
        useAppStore.setState({ isLoading: false });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <ToastProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigator />
    </ToastProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppContent />
    </GestureHandlerRootView>
  );
}
