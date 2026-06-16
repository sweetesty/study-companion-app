import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  User, Task, MoodEntry, FocusSession,
  QuizResult, ChatMessage, Goals, NotificationSettings, ThemeMode,
} from '../constants/types';

const STORAGE_KEY = 'studycompanion_state';

interface AppState {
  // Auth & onboarding
  user: User | null;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;

  // Theme
  themeMode: ThemeMode;

  // Data
  tasks: Task[];
  moods: MoodEntry[];
  focusSessions: FocusSession[];
  quizResults: QuizResult[];
  chatMessages: ChatMessage[];

  // Config
  goals: Goals;
  notificationSettings: NotificationSettings;
  apiKey: string;

  // Loading
  isLoading: boolean;

  // Actions — auth
  signUp: (email: string, name: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  completeOnboarding: (name: string, studyGoal: string) => Promise<void>;

  // Actions — theme
  toggleTheme: () => void;

  // Actions — tasks
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'completed'>) => void;
  completeTask: (id: string) => void;
  deleteTask: (id: string) => void;

  // Actions — mood
  saveMood: (mood: MoodEntry) => void;

  // Actions — focus
  addFocusSession: (session: Omit<FocusSession, 'id'>) => void;

  // Actions — quiz
  saveQuizResult: (result: Omit<QuizResult, 'id'>) => void;

  // Actions — chat
  addChatMessage: (msg: Omit<ChatMessage, 'id'>) => void;
  clearChat: () => void;

  // Actions — settings
  updateGoals: (goals: Goals) => void;
  updateNotificationSettings: (s: NotificationSettings) => void;
  setApiKey: (key: string) => void;

  // Persistence
  loadState: () => Promise<void>;
  persist: () => Promise<void>;
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

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
  goals: { dailyTasks: 3, dailyFocusMinutes: 50 },
  notificationSettings: {
    studyReminders: true,
    moodCheckIn: true,
    taskDeadlines: true,
    reminderHour: 9,
  },
  apiKey: '',
  isLoading: true,

  signUp: async (email, name, password) => {
    const user: User = {
      id: uid(),
      name,
      email,
      studyGoal: '',
      createdAt: new Date().toISOString(),
    };
    set({ user, isAuthenticated: true, isLoading: false });
    await get().persist();
  },

  signIn: async (email, password) => {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.user && parsed.user.email === email) {
        set({
          user: parsed.user,
          isAuthenticated: true,
          hasCompletedOnboarding: parsed.hasCompletedOnboarding ?? false,
          tasks: parsed.tasks ?? [],
          moods: parsed.moods ?? [],
          focusSessions: parsed.focusSessions ?? [],
          quizResults: parsed.quizResults ?? [],
          chatMessages: parsed.chatMessages ?? [],
          goals: parsed.goals ?? { dailyTasks: 3, dailyFocusMinutes: 50 },
          notificationSettings: parsed.notificationSettings ?? {
            studyReminders: true,
            moodCheckIn: true,
            taskDeadlines: true,
            reminderHour: 9,
          },
          apiKey: parsed.apiKey ?? '',
          themeMode: parsed.themeMode ?? 'dark',
        });
        return;
      }
    }
    throw new Error('Invalid credentials');
  },

  signOut: async () => {
    set({
      user: null,
      isAuthenticated: false,
      hasCompletedOnboarding: false,
      tasks: [],
      moods: [],
      focusSessions: [],
      quizResults: [],
      chatMessages: [],
    });
    await AsyncStorage.removeItem(STORAGE_KEY);
  },

  completeOnboarding: async (name, studyGoal) => {
    const user = get().user;
    if (!user) return;
    const updated = { ...user, name, studyGoal };
    set({ user: updated, hasCompletedOnboarding: true });
    await get().persist();
  },

  toggleTheme: () => {
    const next: ThemeMode = get().themeMode === 'dark' ? 'light' : 'dark';
    set({ themeMode: next });
    get().persist();
  },

  addTask: (task) => {
    const newTask: Task = {
      ...task,
      id: uid(),
      completed: false,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ tasks: [newTask, ...s.tasks] }));
    get().persist();
  },

  completeTask: (id) => {
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, completed: !t.completed, completedAt: new Date().toISOString() } : t
      ),
    }));
    get().persist();
  },

  deleteTask: (id) => {
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
    get().persist();
  },

  saveMood: (mood) => {
    set((s) => {
      const filtered = s.moods.filter((m) => m.date !== mood.date);
      return { moods: [mood, ...filtered] };
    });
    get().persist();
  },

  addFocusSession: (session) => {
    const newSession: FocusSession = { ...session, id: uid() };
    set((s) => ({ focusSessions: [newSession, ...s.focusSessions] }));
    get().persist();
  },

  saveQuizResult: (result) => {
    const newResult: QuizResult = { ...result, id: uid() };
    set((s) => ({ quizResults: [newResult, ...s.quizResults] }));
    get().persist();
  },

  addChatMessage: (msg) => {
    const newMsg: ChatMessage = { ...msg, id: uid() };
    set((s) => ({ chatMessages: [...s.chatMessages, newMsg] }));
    get().persist();
  },

  clearChat: () => {
    set({ chatMessages: [] });
    get().persist();
  },

  updateGoals: (goals) => {
    set({ goals });
    get().persist();
  },

  updateNotificationSettings: (notificationSettings) => {
    set({ notificationSettings });
    get().persist();
  },

  setApiKey: (apiKey) => {
    set({ apiKey });
    get().persist();
  },

  loadState: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        set({
          user: parsed.user ?? null,
          isAuthenticated: parsed.isAuthenticated ?? false,
          hasCompletedOnboarding: parsed.hasCompletedOnboarding ?? false,
          tasks: parsed.tasks ?? [],
          moods: parsed.moods ?? [],
          focusSessions: parsed.focusSessions ?? [],
          quizResults: parsed.quizResults ?? [],
          chatMessages: parsed.chatMessages ?? [],
          goals: parsed.goals ?? { dailyTasks: 3, dailyFocusMinutes: 50 },
          notificationSettings: parsed.notificationSettings ?? {
            studyReminders: true,
            moodCheckIn: true,
            taskDeadlines: true,
            reminderHour: 9,
          },
          apiKey: parsed.apiKey ?? '',
          themeMode: parsed.themeMode ?? 'dark',
        });
      }
    } catch (_) {}
    set({ isLoading: false });
  },

  persist: async () => {
    const s = get();
    const toSave = {
      user: s.user,
      isAuthenticated: s.isAuthenticated,
      hasCompletedOnboarding: s.hasCompletedOnboarding,
      tasks: s.tasks,
      moods: s.moods,
      focusSessions: s.focusSessions,
      quizResults: s.quizResults,
      chatMessages: s.chatMessages,
      goals: s.goals,
      notificationSettings: s.notificationSettings,
      apiKey: s.apiKey,
      themeMode: s.themeMode,
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  },
}));

// Helper selectors
export function getStreak(
  tasks: Task[],
  focusSessions: FocusSession[]
): number {
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
  tasks: Task[],
  focusSessions: FocusSession[],
  quizResults: QuizResult[],
  moods: MoodEntry[],
  streak: number
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
