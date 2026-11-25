// Firebase Cloud Messaging background push handler (no offline caching)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { notification: { title: 'IsipAgham', body: event.data.text() } };
  }

  const title = payload?.notification?.title || 'IsipAgham Study Reminder';
  const body =
    payload?.notification?.body ||
    'You have Physics study reminders waiting. Tap to read in your notification bell.';
  const notifId = payload?.data?.notifId || '';
  const targetUrl = notifId
    ? `/notifications?notif=${encodeURIComponent(notifId)}`
    : '/notifications';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: { url: targetUrl, notifId, title, body },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const targetUrl = data.url || '/?openBell=1';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.postMessage({
              type: 'OPEN_NOTIFICATION_BELL',
              notifId: data.notifId || null,
              title: event.notification.title || data.title || null,
              body: event.notification.body || data.body || null,
            });
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
        return undefined;
      })
  );
});
