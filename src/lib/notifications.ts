import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { getApp } from 'firebase/app';

export async function registerStudyNotifications(): Promise<{
  granted: boolean;
  fcmToken?: string;
  note: string;
}> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return {
      granted: false,
      note: 'This browser does not support desktop or push notifications.',
    };
  }

  let permission: NotificationPermission = 'default';
  try {
    permission = await Notification.requestPermission();
  } catch {
    return {
      granted: false,
      note: 'Browser notification popups are blocked in this preview frame. In-app reminders remain active.',
    };
  }

  if (permission !== 'granted') {
    return {
      granted: false,
      note: 'Notification permission was not granted. In-app reminders remain active, or enable notifications in browser settings.',
    };
  }

  let fcmToken: string | undefined;
  try {
    const messagingSupported = await isSupported();
    if (messagingSupported && 'serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
      if (vapidKey && vapidKey.trim()) {
        const messaging = getMessaging(getApp());
        fcmToken = await getToken(messaging, {
          vapidKey: vapidKey.trim(),
          serviceWorkerRegistration: registration,
        });
      }
    }
  } catch (err) {
    console.warn('FCM registration fallback to browser notifications:', err);
  }

  return {
    granted: true,
    fcmToken,
    note: fcmToken
      ? 'Firebase Cloud Messaging reminders enabled.'
      : 'Study reminders enabled (browser notifications active).',
  };
}

export async function showDueCardsNotification(
  dueCount: number,
  customTitle?: string,
  customBody?: string,
  notifId?: string
): Promise<{ ok: boolean; message: string }> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return {
      ok: false,
      message: 'Browser notifications are unavailable on this device. In-app reminders are shown in your bell.',
    };
  }
  if (Notification.permission !== 'granted') {
    return {
      ok: false,
      message: 'Browser push permission is off, so your reminder was added to your notification bell.',
    };
  }

  const title = customTitle || 'IsipAgham Study Reminder';
  const body =
    customBody ||
    (dueCount > 0
      ? `You have ${dueCount} physics flashcard${dueCount === 1 ? '' : 's'} due for spaced-repetition review today.`
      : 'Time for your daily Grade 12 Physics study session!');
  const targetUrl = notifId
    ? `/notifications?notif=${encodeURIComponent(notifId)}`
    : '/notifications';

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          data: { url: targetUrl, notifId: notifId || '', title, body },
        });
        return { ok: true, message: 'Reminder notification sent!' };
      }
    }

    const notif = new Notification(title, {
      body,
      icon: '/pwa-192x192.png',
    });
    notif.onclick = () => {
      try {
        window.focus();
      } catch {
        // ignore focus restrictions
      }
      window.dispatchEvent(
        new CustomEvent('isipagham:open-bell', {
          detail: { notifId: notifId || null, title, body },
        })
      );
      notif.close();
    };
    return { ok: true, message: 'Reminder notification sent!' };
  } catch {
    return {
      ok: false,
      message: 'System notification popup was blocked here, so your reminder was added to your notification bell.',
    };
  }
}
