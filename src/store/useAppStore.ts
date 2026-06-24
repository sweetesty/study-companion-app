import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import {
  fetchProfile, upsertProfile,
  fetchTasks, upsertTask, deleteTaskDb,
  fetchMoods, upsertMood,
  fetchFocusSessions, insertFocusSession,
  fetchQuizResults, insertQuizResult,
} from '../services/dbService';
import {
  User, Task, MoodEntry, FocusSession,
  QuizResult, ChatMessage, Goals, NotificationSettings, ThemeMode,
} from '../constants/types';

const CHAT_KEY = 'studycompanion_chat';

interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  themeMode: ThemeMode;
  tasks: Task[];
  moods: MoodEntry[];
  focusSessions: FocusSession[];
  quizResults: QuizResult[];
  chatMessages: ChatMessage[];
  goals: Goals;
  notificationSettings: NotificationSettings;
  apiKey: string;
  isLoading: boolean;

  // Auth
  signUp: (email: string, name: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  completeOnboarding: (name: string, studyGoal: string) => Promise<void>;

  // Theme
  toggleTheme: () => void;

  // Tasks
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'completed'>) => void;
  completeTask: (id: string) => void;
  deleteTask: (id: string) => void;

  // Mood
  saveMood: (mood: MoodEntry) => void;

  // Focus
  addFocusSession: (session: Omit<FocusSession, 'id'>) => void;

  // Quiz
  saveQuizResult: (result: Omit<QuizResult, 'id'>) => void;

  // Chat (local only)
  addChatMessage: (msg: Omit<ChatMessage, 'id'>) => void;
  clearChat: () => void;

  // Settings
  updateGoals: (goals: Goals) => void;
  updateNotificationSettings: (s: NotificationSettings) => void;
  setApiKey: (key: string) => void;

  // Init
  loadState: () => Promise<void>;
  loadUserData: (userId: string) => Promise<void>;
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const DEFAULT_GOALS: Goals = { dailyTasks: 3, dailyFocusMinutes: 50 };
const DEFAULT_NOTIF: NotificationSettings = {
  studyReminders: true,
  moodCheckIn: true,
  taskDeadlines: true,
  reminderHour: 9,
};

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  hasCompletedOnboarding: false,
  themeMode: 'dark',
  tasks: [],
  moods: [],
  focusSessions: [],
  quizResults: [],
  chatMessages: [],
  goals: DEFAULT_GOALS,
  notificationSettings: DEFAULT_NOTIF,
  apiKey: '',
  isLoading: true,

  signUp: async (email, name, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (!data.user) throw new Error('Sign up failed');
    const user: User = {
      id: data.user.id,
      name,
      email,
      studyGoal: '',
      createdAt: new Date().toISOString(),
    };
    set({ user, isAuthenticated: true });
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.user) throw new Error('Sign in failed');
    await get().loadUserData(data.user.id);
  },

  signOut: async () => {
    await supabase.auth.signOut();
    await AsyncStorage.removeItem(CHAT_KEY);
    set({
      user: null,
      isAuthenticated: false,
      hasCompletedOnboarding: false,
      tasks: [],
      moods: [],
      focusSessions: [],
      quizResults: [],
      chatMessages: [],
      goals: DEFAULT_GOALS,
      notificationSettings: DEFAULT_NOTIF,
      apiKey: '',
    });
  },

  completeOnboarding: async (name, studyGoal) => {
    const user = get().user;
    if (!user) return;
    const updated = { ...user, name, studyGoal };
    set({ user: updated, hasCompletedOnboarding: true });
    await upsertProfile(user.id, {
      name,
      study_goal: studyGoal,
      onboarding_completed: true,
    });
  },

  toggleTheme: () => {
    const next: ThemeMode = get().themeMode === 'dark' ? 'light' : 'dark';
    set({ themeMode: next });
    const user = get().user;
    if (user) upsertProfile(user.id, { theme_mode: next }).catch(() => {});
  },

  addTask: (task) => {
    const newTask: Task = { ...task, id: uid(), completed: false, createdAt: new Date().toISOString() };
    set((s) => ({ tasks: [newTask, ...s.tasks] }));
    const user = get().user;
    if (user) upsertTask(user.id, newTask).catch(() => {});
  },

  completeTask: (id) => {
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, completed: !t.completed, completedAt: new Date().toISOString() } : t
      ),
    }));
    const updated = get().tasks.find((t) => t.id === id);
    const user = get().user;
    if (user && updated) upsertTask(user.id, updated).catch(() => {});
  },

  deleteTask: (id) => {
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
    deleteTaskDb(id).catch(() => {});
  },

  saveMood: (mood) => {
    set((s) => {
      const filtered = s.moods.filter((m) => m.date !== mood.date);
      return { moods: [mood, ...filtered] };
    });
    const user = get().user;
    if (user) upsertMood(user.id, mood).catch(() => {});
  },

  addFocusSession: (session) => {
    const newSession: FocusSession = { ...session, id: uid() };
    set((s) => ({ focusSessions: [newSession, ...s.focusSessions] }));
    const user = get().user;
    if (user) insertFocusSession(user.id, newSession).catch(() => {});
  },

  saveQuizResult: (result) => {
    const newResult: QuizResult = { ...result, id: uid() };
    set((s) => ({ quizResults: [newResult, ...s.quizResults] }));
    const user = get().user;
    if (user) insertQuizResult(user.id, newResult).catch(() => {});
  },

  addChatMessage: async (msg) => {
    const newMsg: ChatMessage = { ...msg, id: uid() };
    set((s) => {
      const updated = [...s.chatMessages, newMsg];
      AsyncStorage.setItem(CHAT_KEY, JSON.stringify(updated)).catch(() => {});
      return { chatMessages: updated };
    });
  },

  clearChat: () => {
    set({ chatMessages: [] });
    AsyncStorage.removeItem(CHAT_KEY).catch(() => {});
  },

  updateGoals: (goals) => {
    set({ goals });
    const user = get().user;
    if (user) upsertProfile(user.id, {
      daily_task_goal: goals.dailyTasks,
      daily_focus_goal: goals.dailyFocusMinutes,
    }).catch(() => {});
  },

  updateNotificationSettings: (notificationSettings) => {
    set({ notificationSettings });
    const user = get().user;
    if (user) upsertProfile(user.id, {
      notif_study_reminders: notificationSettings.studyReminders,
      notif_mood_checkin: notificationSettings.moodCheckIn,
      notif_task_deadlines: notificationSettings.taskDeadlines,
      notif_reminder_hour: notificationSettings.reminderHour,
    }).catch(() => {});
  },

  setApiKey: (apiKey) => {
    set({ apiKey });
    const user = get().user;
    if (user) upsertProfile(user.id, { api_key: apiKey }).catch(() => {});
  },

  loadUserData: async (userId: string) => {
    try {
      const [profile, tasks, moods, focusSessions, quizResults, chatRaw] = await Promise.all([
        fetchProfile(userId),
        fetchTasks(userId),
        fetchMoods(userId),
        fetchFocusSessions(userId),
        fetchQuizResults(userId),
        AsyncStorage.getItem(CHAT_KEY),
      ]);

      const user: User = {
        id: userId,
        name: profile?.name ?? '',
        email: '',
        studyGoal: profile?.study_goal ?? '',
        createdAt: profile?.created_at ?? new Date().toISOString(),
      };

      set({
        user,
        isAuthenticated: true,
        hasCompletedOnboarding: profile?.onboarding_completed ?? false,
        tasks: tasks ?? [],
        moods: moods ?? [],
        focusSessions: focusSessions ?? [],
        quizResults: quizResults ?? [],
        chatMessages: chatRaw ? JSON.parse(chatRaw) : [],
        goals: {
          dailyTasks: profile?.daily_task_goal ?? 3,
          dailyFocusMinutes: profile?.daily_focus_goal ?? 50,
        },
        notificationSettings: {
          studyReminders: profile?.notif_study_reminders ?? true,
          moodCheckIn: profile?.notif_mood_checkin ?? true,
          taskDeadlines: profile?.notif_task_deadlines ?? true,
          reminderHour: profile?.notif_reminder_hour ?? 9,
        },
        apiKey: profile?.api_key ?? '',
        themeMode: (profile?.theme_mode as ThemeMode) ?? 'dark',
      });
    } catch (_) {}
  },

  loadState: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Get email from session
        const email = session.user.email ?? '';
        await get().loadUserData(session.user.id);
        set((s) => ({ user: s.user ? { ...s.user, email } : null }));
      }
    } catch (_) {}
    set({ isLoading: false });
  },
}));

// ─── Selectors (unchanged) ────────────────────────────────────────────────────

export function getStreak(tasks: Task[], focusSessions: FocusSession[]): number {
  const activityDates = new Set<string>([
    ...tasks.filter((t) => t.completed && t.completedAt).map((t) => t.completedAt!.slice(0, 10)),
    ...focusSessions.map((s) => s.date),
  ]);
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    if (activityDates.has(dateStr)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

export function getTodayTasks(tasks: Task[]): { pending: Task[]; completed: Task[] } {
  const today = new Date().toISOString().slice(0, 10);
  const todayTasks = tasks.filter(
    (t) => t.dueDate === today || t.createdAt.slice(0, 10) === today
  );
  return {
    pending: todayTasks.filter((t) => !t.completed),
    completed: todayTasks.filter((t) => t.completed),
  };
}

export function getTodayFocusMinutes(sessions: FocusSession[]): number {
  const today = new Date().toISOString().slice(0, 10);
  return sessions
    .filter((s) => s.date === today && s.type === 'work')
    .reduce((acc, s) => acc + s.duration, 0);
}

export const ACHIEVEMENTS = [
  { id: 'first_task', title: 'First Step', description: 'Complete your first task', icon: '🎯' },
  { id: 'week_streak', title: 'Week Warrior', description: '7-day activity streak', icon: '🔥' },
  { id: 'quiz_5', title: 'Quiz Explorer', description: 'Complete 5 quizzes', icon: '🧠' },
  { id: 'focus_600', title: 'Focus Legend', description: 'Accumulate 10 hours of focus time', icon: '⏱️' },
  { id: 'mood_7', title: 'Mood Maestro', description: 'Log mood 7 days in a row', icon: '😊' },
  { id: 'perfect_quiz', title: 'Perfectionist', description: 'Get 100% on a quiz', icon: '💯' },
  { id: 'tasks_30', title: 'Task Champion', description: 'Complete 30 tasks total', icon: '🏆' },
  { id: 'month_streak', title: 'Consistency King', description: '30-day activity streak', icon: '🌟' },
];

export function getEarnedAchievements(
  tasks: Task[], focusSessions: FocusSession[],
  quizResults: QuizResult[], moods: MoodEntry[], streak: number
): string[] {
  const earned: string[] = [];
  const completedTasks = tasks.filter((t) => t.completed);
  const totalFocusMin = focusSessions.filter((s) => s.type === 'work').reduce((a, s) => a + s.duration, 0);
  if (completedTasks.length >= 1) earned.push('first_task');
  if (streak >= 7) earned.push('week_streak');
  if (streak >= 30) earned.push('month_streak');
  if (quizResults.length >= 5) earned.push('quiz_5');
  if (totalFocusMin >= 600) earned.push('focus_600');
  if (moods.length >= 7) earned.push('mood_7');
  if (quizResults.some((q) => q.score === q.total && q.total > 0)) earned.push('perfect_quiz');
  if (completedTasks.length >= 30) earned.push('tasks_30');
  return earned;
}
