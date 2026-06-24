import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Modal, Alert, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, Trash2, CheckCircle, Circle, X, Calendar } from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import { useToast } from '../components/Toast';
import { useTheme } from '../hooks/useTheme';
import { Task } from '../constants/types';

export default function PlannerScreen() {
  const { theme } = useTheme();
  const { tasks, addTask, completeTask, deleteTask } = useAppStore();
  const { showToast } = useToast();

  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));

  const pending = tasks.filter((t) => !t.completed);
  const completed = tasks.filter((t) => t.completed);

  const handleAdd = () => {
    if (!title.trim()) { showToast('Enter a task title', 'error'); return; }
    addTask({ title: title.trim(), description: description.trim(), dueDate });
    showToast('Task added!', 'success');
    setShowModal(false);
    setTitle(''); setDescription(''); setDueDate(new Date().toISOString().slice(0, 10));
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Task', 'Remove this task?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteTask(id); showToast('Task deleted', 'info'); } },
    ]);
  };

  const s = styles(theme);

  return (
    <View style={s.root}>
      {/* Header */}
      <LinearGradient colors={['#0f1b2d', theme.background]} style={s.header}>
        <Text style={s.headerTitle}>Study Planner</Text>
        <Text style={s.headerSub}>{pending.length} pending · {completed.length} done</Text>
      </LinearGradient>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Motivational banner */}
        {pending.length > 0 && (
          <View style={s.banner}>
            <Text style={s.bannerText}>💪 {pending.length} task{pending.length > 1 ? 's' : ''} to crush today!</Text>
          </View>
        )}

        {/* Pending */}
        <Text style={s.sectionLabel}>Pending</Text>
        {pending.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>✅</Text>
            <Text style={s.emptyText}>All clear! Tap + to add tasks.</Text>
          </View>
        ) : (
          pending.map((t) => <TaskCard key={t.id} task={t} onComplete={completeTask} onDelete={handleDelete} theme={theme} />)
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <>
            <Text style={[s.sectionLabel, { marginTop: 24 }]}>Completed ({completed.length})</Text>
            {completed.map((t) => <TaskCard key={t.id} task={t} onComplete={completeTask} onDelete={handleDelete} theme={theme} done />)}
          </>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={s.fab} onPress={() => setShowModal(true)} activeOpacity={0.85}>
        <LinearGradient colors={theme.gradient} style={s.fabGrad}>
          <Plus size={26} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Add task modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>New Task</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={s.label}>Title *</Text>
            <TextInput
              style={s.input}
              placeholder="What needs to be done?"
              placeholderTextColor={theme.textMuted}
              value={title}
              onChangeText={setTitle}
              autoFocus
            />

            <Text style={s.label}>Description</Text>
            <TextInput
              style={[s.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Optional details..."
              placeholderTextColor={theme.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
            />

            <Text style={s.label}>Due Date</Text>
            <View style={s.dateRow}>
              <Calendar size={16} color={theme.textSecondary} />
              <TextInput
                style={[s.input, { flex: 1, marginBottom: 0 }]}
                value={dueDate}
                onChangeText={setDueDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.textMuted}
              />
            </View>

            <TouchableOpacity style={s.addBtn} onPress={handleAdd} activeOpacity={0.85}>
              <LinearGradient colors={theme.gradient} style={s.addBtnGrad}>
                <Text style={s.addBtnText}>Add Task</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function TaskCard({ task, onComplete, onDelete, theme, done = false }: {
  task: Task; onComplete: (id: string) => void; onDelete: (id: string) => void; theme: any; done?: boolean;
}) {
  return (
    <View style={[taskStyles.card, { backgroundColor: theme.surface, borderColor: done ? theme.green + '44' : theme.border }]}>
      <TouchableOpacity onPress={() => onComplete(task.id)} style={taskStyles.checkBtn}>
        {done ? <CheckCircle size={22} color={theme.green} /> : <Circle size={22} color={theme.textMuted} />}
      </TouchableOpacity>
      <View style={taskStyles.info}>
        <Text style={[taskStyles.title, { color: done ? theme.textMuted : theme.textPrimary, textDecorationLine: done ? 'line-through' : 'none' }]}>
          {task.title}
        </Text>
        {task.description ? (
          <Text style={[taskStyles.desc, { color: theme.textMuted }]} numberOfLines={1}>{task.description}</Text>
        ) : null}
        {task.dueDate ? (
          <Text style={[taskStyles.date, { color: theme.textMuted }]}>📅 {task.dueDate}</Text>
        ) : null}
      </View>
      <TouchableOpacity onPress={() => onDelete(task.id)} style={taskStyles.deleteBtn}>
        <Trash2 size={16} color={theme.red + 'AA'} />
      </TouchableOpacity>
    </View>
  );
}

const taskStyles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    borderRadius: 14, padding: 14, marginBottom: 8,
    borderWidth: 1,
  },
  checkBtn: { paddingTop: 2 },
  info: { flex: 1 },
  title: { fontSize: 15, fontWeight: '500' },
  desc: { fontSize: 13, marginTop: 2 },
  date: { fontSize: 12, marginTop: 4 },
  deleteBtn: { padding: 4 },
});

const styles = (theme: any) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.background },
    header: { paddingTop: 56, paddingBottom: 20, paddingHorizontal: 24 },
    headerTitle: { color: theme.textPrimary, fontSize: 28, fontWeight: '700' },
    headerSub: { color: theme.textSecondary, fontSize: 14, marginTop: 4 },
    scroll: { flex: 1 },
    scrollContent: { padding: 20 },
    banner: {
      backgroundColor: theme.blue + '22',
      borderRadius: 12, padding: 14, marginBottom: 20,
      borderWidth: 1, borderColor: theme.blue + '44',
    },
    bannerText: { color: theme.blue, fontSize: 14, fontWeight: '600' },
    sectionLabel: { color: theme.textSecondary, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
    emptyState: { alignItems: 'center', paddingVertical: 40 },
    emptyIcon: { fontSize: 40, marginBottom: 8 },
    emptyText: { color: theme.textMuted, fontSize: 15 },
    fab: { position: 'absolute', bottom: 28, right: 24, borderRadius: 28, overflow: 'hidden', elevation: 8, shadowColor: theme.blue, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12 },
    fabGrad: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { color: theme.textPrimary, fontSize: 20, fontWeight: '700' },
    label: { color: theme.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
    input: { backgroundColor: theme.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: theme.textPrimary, fontSize: 15, borderWidth: 1, borderColor: theme.inputBorder, marginBottom: 4 },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    addBtn: { marginTop: 20, borderRadius: 14, overflow: 'hidden' },
    addBtnGrad: { paddingVertical: 16, alignItems: 'center' },
    addBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  });
