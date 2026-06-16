export interface User {
  id: string;
  name: string;
  email: string;
  studyGoal: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
}

export interface MoodEntry {
  id: string;
  mood: 'great' | 'good' | 'okay' | 'low' | 'stressed';
  emoji: string;
  label: string;
  date: string; // YYYY-MM-DD
}

export interface FocusSession {
  id: string;
  duration: number; // minutes
  type: 'work' | 'break';
  date: string; // YYYY-MM-DD
  completedAt: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface QuizResult {
  id: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  score: number;
  total: number;
  date: string;
  questions: QuizQuestion[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  condition: string;
}

export interface Goals {
  dailyTasks: number;
  dailyFocusMinutes: number;
}

export interface NotificationSettings {
  studyReminders: boolean;
  moodCheckIn: boolean;
  taskDeadlines: boolean;
  reminderHour: number;
}

export type ThemeMode = 'dark' | 'light';
