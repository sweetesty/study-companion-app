import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { NotificationSettings, Task } from '../constants/types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('study-reminders', {
      name: 'Study Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3B82F6',
    });
    await Notifications.setNotificationChannelAsync('mood-checkin', {
      name: 'Mood Check-in',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    await Notifications.setNotificationChannelAsync('task-alerts', {
      name: 'Task Alerts',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// Cancel all scheduled notifications of a specific identifier prefix
async function cancelByPrefix(prefix: string) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if ((n.identifier ?? '').startsWith(prefix)) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

export async function scheduleAllNotifications(
  settings: NotificationSettings,
  tasks: Task[]
): Promise<void> {
  const granted = await requestPermissions();
  if (!granted) return;

  // ── Study reminder ───────────────────────────────────────────────────────
  await cancelByPrefix('study-reminder');
  if (settings.studyReminders) {
    await Notifications.scheduleNotificationAsync({
      identifier: 'study-reminder-daily',
      content: {
        title: '📚 Time to study!',
        body: 'Your daily study session is waiting. Keep that streak alive!',
        ...(Platform.OS === 'android' ? { channelId: 'study-reminders' } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: settings.reminderHour,
        minute: 0,
      },
    });
  }

  // ── Mood check-in ────────────────────────────────────────────────────────
  await cancelByPrefix('mood-checkin');
  if (settings.moodCheckIn) {
    await Notifications.scheduleNotificationAsync({
      identifier: 'mood-checkin-daily',
      content: {
        title: '😊 How are you feeling?',
        body: 'Take a moment to log your mood and reflect on your day.',
        ...(Platform.OS === 'android' ? { channelId: 'mood-checkin' } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 20,
        minute: 0,
      },
    });
  }

  // ── Task deadline alerts ──────────────────────────────────────────────────
  await cancelByPrefix('task-deadline');
  if (settings.taskDeadlines) {
    const today = new Date().toISOString().slice(0, 10);
    const dueTodayPending = tasks.filter(
      (t) => !t.completed && t.dueDate === today
    );
    for (const task of dueTodayPending.slice(0, 5)) {
      await Notifications.scheduleNotificationAsync({
        identifier: `task-deadline-${task.id}`,
        content: {
          title: '⏰ Task due today',
          body: `"${task.title}" is due today. Don't forget!`,
          ...(Platform.OS === 'android' ? { channelId: 'task-alerts' } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 8,
          minute: 0,
        },
      });
    }
  }
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function sendLocalNotification(title: string, body: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null,
  });
}
