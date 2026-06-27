import { supabase } from '../lib/supabase';
import { Task, MoodEntry, FocusSession, QuizResult, ChatMessage } from '../constants/types';

// ─── Profile ─────────────────────────────────────────────────────────────────

export async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertProfile(userId: string, updates: Record<string, any>) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...updates, updated_at: new Date().toISOString() });
  if (error) throw error;
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export async function fetchTasks(userId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    dueDate: row.due_date ?? '',
    completed: row.completed ?? false,
    completedAt: row.completed_at ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
  }));
}

export async function upsertTask(userId: string, task: Task) {
  const { error } = await supabase.from('tasks').upsert({
    id: task.id,
    user_id: userId,
    title: task.title,
    description: task.description,
    due_date: task.dueDate,
    completed: task.completed,
    completed_at: task.completedAt ?? null,
    created_at: task.createdAt,
  });
  if (error) throw error;
}

export async function deleteTaskDb(taskId: string) {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) throw error;
}

// ─── Moods ────────────────────────────────────────────────────────────────────

export async function fetchMoods(userId: string): Promise<MoodEntry[]> {
  const { data, error } = await supabase
    .from('moods')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    mood: row.mood,
    emoji: row.emoji,
    label: row.label,
    date: row.date,
  }));
}

export async function upsertMood(userId: string, mood: MoodEntry) {
  const { error } = await supabase.from('moods').upsert(
    { id: mood.id, user_id: userId, mood: mood.mood, emoji: mood.emoji, label: mood.label, date: mood.date },
    { onConflict: 'user_id,date' }
  );
  if (error) throw error;
}

// ─── Focus Sessions ───────────────────────────────────────────────────────────

export async function fetchFocusSessions(userId: string): Promise<FocusSession[]> {
  const { data, error } = await supabase
    .from('focus_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    duration: row.duration,
    type: row.type,
    date: row.date,
    completedAt: row.completed_at,
  }));
}

export async function insertFocusSession(userId: string, session: FocusSession) {
  const { error } = await supabase.from('focus_sessions').insert({
    id: session.id,
    user_id: userId,
    duration: session.duration,
    type: session.type,
    date: session.date,
    completed_at: session.completedAt,
  });
  if (error) throw error;
}

// ─── Quiz Results ─────────────────────────────────────────────────────────────

export async function fetchQuizResults(userId: string): Promise<QuizResult[]> {
  const { data, error } = await supabase
    .from('quiz_results')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    topic: row.topic,
    difficulty: row.difficulty,
    score: row.score,
    total: row.total,
    date: row.date,
    questions: row.questions ?? [],
  }));
}

export async function insertQuizResult(userId: string, result: QuizResult) {
  const { error } = await supabase.from('quiz_results').insert({
    id: result.id,
    user_id: userId,
    topic: result.topic,
    difficulty: result.difficulty,
    score: result.score,
    total: result.total,
    date: result.date,
    questions: result.questions,
  });
  if (error) throw error;
}

// ─── Chat Messages ────────────────────────────────────────────────────────────

export async function fetchChatMessages(userId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: true })
    .limit(100);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    role: row.role as 'user' | 'assistant',
    content: row.content,
    timestamp: row.timestamp,
  }));
}

export async function insertChatMessage(userId: string, msg: ChatMessage) {
  const { error } = await supabase.from('chat_messages').insert({
    id: msg.id,
    user_id: userId,
    role: msg.role,
    content: msg.content,
    timestamp: msg.timestamp,
  });
  if (error) throw error;
}

export async function deleteChatMessages(userId: string) {
  const { error } = await supabase.from('chat_messages').delete().eq('user_id', userId);
  if (error) throw error;
}
