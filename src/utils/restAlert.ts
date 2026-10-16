import { callNative } from './native';

// Rest-over alert while the app is in the background or the screen is off (APK only).
// Scheduled when the app is hidden mid-rest and cancelled when it comes back, so an open
// app never gets both the in-app beep and a notification.

export const REST_ALERT_ID = 4242;
export const REST_CHANNEL_ID = 'rest-timer';

export function restAlertPayload(endAt: number, exerciseName?: string) {
  return {
    notifications: [
      {
        id: REST_ALERT_ID,
        title: 'Rest over 💪',
        body: exerciseName ? `Time for your next set — ${exerciseName}` : 'Time for your next set',
        channelId: REST_CHANNEL_ID,
        schedule: { at: new Date(endAt).toISOString(), allowWhileIdle: true },
      },
    ],
  };
}

let prepared: Promise<void> | null = null;

/** Ask for notification permission and create a loud, vibrating channel (once per app run). */
export function prepareRestAlerts(): Promise<void> {
  prepared ??= (async () => {
    await callNative('LocalNotifications', 'requestPermissions');
    await callNative('LocalNotifications', 'createChannel', {
      id: REST_CHANNEL_ID,
      name: 'Rest timer',
      description: 'Tells you when your rest between sets is over',
      importance: 5,
      visibility: 1,
      vibration: true,
    });
  })();
  return prepared;
}

export async function scheduleRestAlert(endAt: number, exerciseName?: string): Promise<void> {
  if (endAt - Date.now() < 1000) return;
  await prepareRestAlerts();
  await callNative('LocalNotifications', 'schedule', restAlertPayload(endAt, exerciseName));
}

export function cancelRestAlert(): Promise<unknown> {
  return callNative('LocalNotifications', 'cancel', { notifications: [{ id: REST_ALERT_ID }] });
}

export async function vibrate(ms = 500): Promise<void> {
  const done = await callNative('Haptics', 'vibrate', { duration: ms });
  if (done === null && typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(ms);
}
