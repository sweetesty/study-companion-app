import { supabase } from '../lib/supabase';
import { Task, MoodEntry, FocusSession, QuizResult } from '../constants/types';

// ─── Profile ────────────────────────────────────────────────────────────────

export async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function upsertProfile(userId: string, updates: Record<string, any>) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...updates, updated_at: new Date().toISOString() });
  if (error) throw error;
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

export async function fetchTasks(userId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(({ user_id, ...rest }) => rest as Task);
}

export async function upsertTask(userId: string, task: Task) {
  const { error } = await supabase
    .from('tasks')
    .upsert({ ...task, user_id: userId });
  if (error) throw error;
}

export async function deleteTaskDb(taskId: string) {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) throw error;
}

// ─── Moods ───────────────────────────────────────────────────────────────────

export async function fetchMoods(userId: string): Promise<MoodEntry[]> {
  const { data, error } = await supabase
    .from('moods')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(({ user_id, ...rest }) => rest as MoodEntry);
}

export async function upsertMood(userId: string, mood: MoodEntry) {
  const { error } = await supabase
    .from('moods')
    .upsert({ ...mood, user_id: userId }, { onConflict: 'user_id,date' });
  if (error) throw error;
}

// ─── Focus Sessions ──────────────────────────────────────────────────────────

export async function fetchFocusSessions(userId: string): Promise<FocusSession[]> {
  const { data, error } = await supabase
    .from('focus_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(({ user_id, ...rest }) => rest as FocusSession);
}

export async function insertFocusSession(userId: string, session: FocusSession) {
  const { error } = await supabase
    .from('focus_sessions')
    .insert({ ...session, user_id: userId });
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
  return (data ?? []).map(({ user_id, ...rest }) => rest as QuizResult);
}

export async function insertQuizResult(userId: string, result: QuizResult) {
  const { error } = await supabase
    .from('quiz_results')
    .insert({ ...result, user_id: userId });
  if (error) throw error;
}
