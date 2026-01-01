// Service Worker for Push Notifications

self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push received:', event);
  
  let data = {
    title: 'Coach IA',
    body: '¡Es hora de entrenar!',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'coach-notification'
  };
  
  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (e) {
    console.error('[Service Worker] Error parsing push data:', e);
  }
  
  const options = {
    body: data.body,
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    tag: data.tag || 'coach-notification',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    },
    actions: [
      { action: 'train', title: '¡Vamos!' },
      { action: 'later', title: 'Más tarde' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'later') {
    return;
  }
  
  // Open the app or focus existing window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // Try to focus an existing window
        for (let client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window if none exists
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url || '/training');
        }
      })
  );
});

self.addEventListener('install', function(event) {
  console.log('[Service Worker] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('[Service Worker] Activated');
  event.waitUntil(clients.claim());
});
