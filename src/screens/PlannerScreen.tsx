import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Modal, Alert, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Plus, Trash2, CheckCircle, Circle, X, Calendar,
  Bell, Clock, Flame, Target, ChevronDown,
} from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import { requestPermissions } from '../services/notificationService';
import { useAppStore } from '../store/useAppStore';
import { useToast } from '../components/Toast';
import { useTheme } from '../hooks/useTheme';
import { Task } from '../constants/types';

const QUICK_PRESETS = [
  { label: '15 min', mins: 15 },
  { label: '30 min', mins: 30 },
  { label: '1 hour', mins: 60 },
  { label: '2 hours', mins: 120 },
];

const PRIORITIES = [
  { key: 'low', label: 'Low', color: '#10b981' },
  { key: 'medium', label: 'Medium', color: '#f59e0b' },
  { key: 'high', label: 'High', color: '#ef4444' },
] as const;
type Priority = 'low' | 'medium' | 'high';

function todayStr() { return new Date().toISOString().slice(0, 10); }

function formatDate(d: string): string {
  if (!d) return '';
  const today = todayStr();
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);
  if (d === today) return 'Today';
  if (d === tomorrowStr) return 'Tomorrow';
  const [, m, day] = d.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m) - 1]} ${parseInt(day)}`;
}

function isOverdue(dueDate: string): boolean {
  return !!dueDate && dueDate < todayStr();
}

export default function PlannerScreen() {
  const { theme } = useTheme();
  const { tasks, addTask, completeTask, deleteTask } = useAppStore();
  const { showToast } = useToast();

  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(todayStr());
  const [priority, setPriority] = useState<Priority>('medium');
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all');

  const [reminderTask, setReminderTask] = useState<Task | null>(null);
  const [customHour, setCustomHour] = useState('');
  const [customMin, setCustomMin] = useState('');

  const pending = tasks.filter((t) => !t.completed);
  const completed = tasks.filter((t) => t.completed);
  const today = tasks.filter((t) => t.dueDate === todayStr() || t.createdAt.slice(0, 10) === todayStr());
  const todayDone = today.filter((t) => t.completed).length;
  const progress = today.length > 0 ? todayDone / today.length : 0;

  const filtered =
    filter === 'all' ? tasks :
    filter === 'pending' ? pending :
    completed;

  const handleAdd = () => {
    if (!title.trim()) { showToast('Enter a task title', 'error'); return; }
    addTask({ title: title.trim(), description: description.trim(), dueDate });
    showToast('Task added!', 'success');
    setShowModal(false);
    setTitle(''); setDescription(''); setDueDate(todayStr()); setPriority('medium');
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Task', 'Remove this task?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteTask(id); showToast('Task deleted', 'info'); } },
    ]);
  };

  const scheduleReminder = async (secondsFromNow: number) => {
    if (!reminderTask) return;
    const granted = await requestPermissions();
    if (!granted) { showToast('Allow notifications in device settings', 'error'); return; }
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Study Reminder',
          body: `Time to work on: ${reminderTask.title}`,
          sound: true,
          ...(Platform.OS === 'android' ? { channelId: 'study-reminders' } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: secondsFromNow,
          repeats: false,
        },
      });
      const mins = Math.round(secondsFromNow / 60);
      const when = mins < 60 ? `in ${mins} min` : `in ${Math.round(mins / 60)}h`;
      showToast(`Reminder set ${when}`, 'success');
    } catch (e: any) {
      showToast(e?.message ?? 'Could not set reminder', 'error');
    }
    setReminderTask(null); setCustomHour(''); setCustomMin('');
  };

  const handleCustomReminder = () => {
    const h = parseInt(customHour);
    const m = parseInt(customMin || '0');
    if (isNaN(h) || h < 0 || h > 23) { showToast('Enter a valid hour (0–23)', 'error'); return; }
    const now = new Date();
    const target = new Date(); target.setHours(h, m, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    scheduleReminder(Math.round((target.getTime() - now.getTime()) / 1000));
  };

  const s = styles(theme);

  return (
    <View style={s.root}>
      {/* ── Header ── */}
      <LinearGradient colors={theme.headerGradient} style={s.header}>
        <View style={s.headerTop}>
          <View>
            <Text style={s.headerTitle}>Study Planner</Text>
            <Text style={s.headerDate}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
          </View>
          <View style={s.headerStats}>
            <View style={s.statPill}>
              <Flame size={13} color="#f59e0b" />
              <Text style={s.statPillText}>{pending.length} left</Text>
            </View>
            <View style={[s.statPill, { backgroundColor: '#10b98122', borderColor: '#10b98144' }]}>
              <Target size={13} color="#10b981" />
              <Text style={[s.statPillText, { color: '#10b981' }]}>{completed.length} done</Text>
            </View>
          </View>
        </View>

        {/* Today's progress */}
        {today.length > 0 && (
          <View style={s.progressWrap}>
            <View style={s.progressLabelRow}>
              <Text style={s.progressLabel}>Today's progress</Text>
              <Text style={s.progressFraction}>{todayDone}/{today.length}</Text>
            </View>
            <View style={s.progressTrack}>
              <LinearGradient
                colors={progress === 1 ? ['#10b981', '#059669'] : ['#6c47ff', '#2563eb']}
                style={[s.progressFill, { width: `${Math.round(progress * 100)}%` as any }]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              />
            </View>
            {progress === 1 && (
              <Text style={s.allDoneText}>All done for today!</Text>
            )}
          </View>
        )}
      </LinearGradient>

      {/* ── Filter tabs ── */}
      <View style={[s.filterRow, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        {([
          { key: 'all', label: `All (${tasks.length})` },
          { key: 'pending', label: `Pending (${pending.length})` },
          { key: 'done', label: `Done (${completed.length})` },
        ] as { key: typeof filter; label: string }[]).map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[s.filterTab, filter === f.key && s.filterTabActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[s.filterTabText, { color: filter === f.key ? '#6c47ff' : theme.textMuted }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Task list ── */}
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <View style={s.emptyState}>
            <View style={s.emptyIcon}>
              {filter === 'done'
                ? <Target size={48} color={theme.textMuted} />
                : <CheckCircle size={48} color={theme.textMuted} />}
            </View>
            <Text style={[s.emptyTitle, { color: theme.textPrimary }]}>
              {filter === 'done' ? 'No completed tasks yet' : 'No tasks here'}
            </Text>
            <Text style={[s.emptyHint, { color: theme.textMuted }]}>
              {filter === 'done' ? 'Complete a task to see it here' : 'Tap + to add your first task'}
            </Text>
          </View>
        ) : (
          filtered.map((t, i) => (
            <TaskCard
              key={t.id}
              task={t}
              index={i}
              onComplete={completeTask}
              onDelete={handleDelete}
              onReminder={!t.completed ? () => { setReminderTask(t); setCustomHour(''); setCustomMin(''); } : undefined}
              theme={theme}
            />
          ))
        )}
        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ── FAB ── */}
      <TouchableOpacity style={s.fab} onPress={() => setShowModal(true)} activeOpacity={0.85}>
        <LinearGradient colors={['#6c47ff', '#2563eb']} style={s.fabGrad}>
          <Plus size={26} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* ── Add task modal ── */}
      <Modal visible={showModal} transparent animationType="slide">
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[s.sheet, { backgroundColor: theme.surface }]}>
            {/* Handle */}
            <View style={[s.handle, { backgroundColor: theme.border }]} />

            <View style={s.sheetHeader}>
              <Text style={[s.sheetTitle, { color: theme.textPrimary }]}>New Task</Text>
              <TouchableOpacity onPress={() => setShowModal(false)} style={[s.closeBtn, { backgroundColor: theme.background }]}>
                <X size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Title */}
            <TextInput
              style={[s.input, { color: theme.textPrimary, borderColor: theme.inputBorder, backgroundColor: theme.inputBg }]}
              placeholder="What needs to be done?"
              placeholderTextColor={theme.textMuted}
              value={title}
              onChangeText={setTitle}
              autoFocus
            />

            {/* Description */}
            <TextInput
              style={[s.input, s.textArea, { color: theme.textPrimary, borderColor: theme.inputBorder, backgroundColor: theme.inputBg }]}
              placeholder="Add a description (optional)"
              placeholderTextColor={theme.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
            />

            {/* Due date + priority row */}
            <View style={s.rowFields}>
              <View style={[s.fieldWrap, { flex: 1 }]}>
                <Text style={[s.fieldLabel, { color: theme.textMuted }]}>Due date</Text>
                <View style={[s.fieldInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                  <Calendar size={14} color={theme.textSecondary} />
                  <TextInput
                    style={{ flex: 1, color: theme.textPrimary, fontSize: 14 }}
                    value={dueDate}
                    onChangeText={setDueDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>
              </View>
            </View>

            {/* Priority */}
            <Text style={[s.fieldLabel, { color: theme.textMuted, marginBottom: 8 }]}>Priority</Text>
            <View style={s.priorityRow}>
              {PRIORITIES.map((p) => (
                <TouchableOpacity
                  key={p.key}
                  style={[
                    s.priorityChip,
                    { borderColor: p.color + '66', backgroundColor: priority === p.key ? p.color + '22' : 'transparent' },
                    priority === p.key && { borderColor: p.color },
                  ]}
                  onPress={() => setPriority(p.key)}
                  activeOpacity={0.75}
                >
                  <View style={[s.priorityDot, { backgroundColor: p.color }]} />
                  <Text style={[s.priorityLabel, { color: priority === p.key ? p.color : theme.textSecondary }]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={s.addBtn} onPress={handleAdd} activeOpacity={0.85}>
              <LinearGradient colors={['#6c47ff', '#2563eb']} style={s.addBtnGrad}>
                <Plus size={18} color="#fff" />
                <Text style={s.addBtnText}>Add Task</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Reminder modal ── */}
      <Modal visible={!!reminderTask} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={[s.sheet, { backgroundColor: theme.surface }]}>
            <View style={[s.handle, { backgroundColor: theme.border }]} />

            <View style={s.sheetHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <LinearGradient colors={['#6c47ff', '#2563eb']} style={s.bellIcon}>
                  <Bell size={16} color="#fff" />
                </LinearGradient>
                <Text style={[s.sheetTitle, { color: theme.textPrimary }]}>Set Reminder</Text>
              </View>
              <TouchableOpacity onPress={() => setReminderTask(null)} style={[s.closeBtn, { backgroundColor: theme.background }]}>
                <X size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={[s.reminderTaskBadge, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Text style={[s.reminderTaskText, { color: theme.textPrimary }]} numberOfLines={2}>
                {reminderTask?.title}
              </Text>
            </View>

            {/* Quick presets */}
            <Text style={[s.fieldLabel, { color: theme.textMuted, marginBottom: 10 }]}>Quick presets</Text>
            <View style={s.presetGrid}>
              {QUICK_PRESETS.map((p) => (
                <TouchableOpacity
                  key={p.label}
                  style={[s.presetBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
                  onPress={() => scheduleReminder(p.mins * 60)}
                  activeOpacity={0.75}
                >
                  <Clock size={18} color="#6c47ff" />
                  <Text style={[s.presetLabel, { color: theme.textPrimary }]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom time */}
            <Text style={[s.fieldLabel, { color: theme.textMuted, marginTop: 16, marginBottom: 10 }]}>
              Specific time today
            </Text>
            <View style={s.customRow}>
              <View style={[s.timeBox, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                <TextInput
                  style={[s.timeInput, { color: theme.textPrimary }]}
                  placeholder="HH"
                  placeholderTextColor={theme.textMuted}
                  value={customHour}
                  onChangeText={setCustomHour}
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>
              <Text style={[s.timeSep, { color: theme.textSecondary }]}>:</Text>
              <View style={[s.timeBox, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                <TextInput
                  style={[s.timeInput, { color: theme.textPrimary }]}
                  placeholder="MM"
                  placeholderTextColor={theme.textMuted}
                  value={customMin}
                  onChangeText={setCustomMin}
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>
              <TouchableOpacity style={s.setBtn} onPress={handleCustomReminder} activeOpacity={0.85}>
                <LinearGradient colors={['#6c47ff', '#2563eb']} style={s.setBtnGrad}>
                  <Text style={s.setBtnText}>Set</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Task card ─────────────────────────────────────────────────────────────────
function TaskCard({ task, index, onComplete, onDelete, onReminder, theme }: {
  task: Task; index: number;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onReminder?: () => void;
  theme: any;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const done = task.completed;
  const overdue = !done && isOverdue(task.dueDate);
  const isToday = task.dueDate === todayStr();

  const accentColor = done ? '#10b981' : overdue ? '#ef4444' : isToday ? '#6c47ff' : '#2563eb';

  const handleComplete = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start(() => onComplete(task.id));
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <View style={[tc.card, { backgroundColor: theme.surface, borderColor: done ? '#10b98133' : theme.border }]}>
        {/* Left accent bar */}
        <View style={[tc.accent, { backgroundColor: accentColor }]} />

        {/* Checkbox */}
        <TouchableOpacity onPress={handleComplete} style={tc.check} activeOpacity={0.7}>
          {done
            ? <CheckCircle size={24} color="#10b981" />
            : <Circle size={24} color={theme.textMuted} />}
        </TouchableOpacity>

        {/* Content */}
        <View style={tc.body}>
          <Text
            style={[tc.title, { color: done ? theme.textMuted : theme.textPrimary },
              done && { textDecorationLine: 'line-through' }]}
            numberOfLines={2}
          >
            {task.title}
          </Text>
          {task.description ? (
            <Text style={[tc.desc, { color: theme.textMuted }]} numberOfLines={1}>{task.description}</Text>
          ) : null}
          {task.dueDate ? (
            <View style={tc.metaRow}>
              <View style={[tc.dateBadge, { backgroundColor: overdue ? '#ef444422' : accentColor + '18', borderColor: accentColor + '44' }]}>
                <Calendar size={10} color={overdue ? '#ef4444' : accentColor} />
                <Text style={[tc.dateText, { color: overdue ? '#ef4444' : accentColor }]}>
                  {overdue ? 'Overdue · ' : ''}{formatDate(task.dueDate)}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Actions */}
        <View style={tc.actions}>
          {!done && onReminder && (
            <TouchableOpacity
              onPress={onReminder}
              style={[tc.actionBtn, { backgroundColor: '#6c47ff18', borderColor: '#6c47ff33' }]}
            >
              <Bell size={14} color="#6c47ff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => onDelete(task.id)}
            style={[tc.actionBtn, { backgroundColor: '#ef444414', borderColor: '#ef444433' }]}
          >
            <Trash2 size={14} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const tc = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10,
    overflow: 'hidden',
  },
  accent: { position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: 2 },
  check: { paddingLeft: 8 },
  body: { flex: 1, gap: 3 },
  title: { fontSize: 15, fontWeight: '600', lineHeight: 20 },
  desc: { fontSize: 13, lineHeight: 18 },
  metaRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  dateBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  dateText: { fontSize: 11, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 6 },
  actionBtn: { width: 32, height: 32, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = (theme: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background },

  // Header
  header: { paddingTop: 56, paddingBottom: 24, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  headerTitle: { color: theme.heroText, fontSize: 28, fontWeight: '800' },
  headerDate: { color: theme.heroSubText, fontSize: 13, marginTop: 3 },
  headerStats: { flexDirection: 'row', gap: 8 },
  statPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#f59e0b22', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#f59e0b44' },
  statPillText: { color: '#f59e0b', fontSize: 12, fontWeight: '700' },

  // Progress
  progressWrap: { gap: 6 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { color: theme.heroSubText, fontSize: 12, fontWeight: '600' },
  progressFraction: { color: theme.heroSubText, fontSize: 12, fontWeight: '700' },
  progressTrack: { height: 6, backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  allDoneText: { color: '#10b981', fontSize: 12, fontWeight: '600', textAlign: 'center' },

  // Filter tabs
  filterRow: { flexDirection: 'row', borderBottomWidth: 1 },
  filterTab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  filterTabActive: { borderBottomWidth: 2, borderBottomColor: '#6c47ff' },
  filterTabText: { fontSize: 13, fontWeight: '700' },

  scroll: { flex: 1 },
  scrollContent: { padding: 16 },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginBottom: 6 },
  emptyHint: { fontSize: 14 },

  // FAB
  fab: {
    position: 'absolute', bottom: 28, right: 24,
    borderRadius: 28, overflow: 'hidden', elevation: 8,
    shadowColor: '#6c47ff', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12,
  },
  fabGrad: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },

  // Bottom sheet
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 36 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 20, fontWeight: '800' },
  closeBtn: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  // Form
  input: { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, borderWidth: 1, marginBottom: 12 },
  textArea: { height: 80, textAlignVertical: 'top' },
  rowFields: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  fieldWrap: {},
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  fieldInput: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },

  // Priority
  priorityRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  priorityChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderRadius: 12, paddingVertical: 10 },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  priorityLabel: { fontSize: 13, fontWeight: '700' },

  addBtn: { borderRadius: 16, overflow: 'hidden' },
  addBtnGrad: { flexDirection: 'row', paddingVertical: 16, alignItems: 'center', justifyContent: 'center', gap: 8 },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Reminder modal
  bellIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  reminderTaskBadge: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 20 },
  reminderTaskText: { fontSize: 14, fontWeight: '600' },
  presetGrid: { flexDirection: 'row', gap: 10 },
  presetBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1, gap: 4 },
  presetEmoji: { fontSize: 22 },
  presetLabel: { fontSize: 12, fontWeight: '700' },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timeBox: { borderWidth: 1, borderRadius: 12, width: 64, alignItems: 'center' },
  timeInput: { fontSize: 22, fontWeight: '800', paddingVertical: 10, textAlign: 'center', width: '100%' },
  timeSep: { fontSize: 26, fontWeight: '800' },
  setBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  setBtnGrad: { paddingVertical: 14, alignItems: 'center' },
  setBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
