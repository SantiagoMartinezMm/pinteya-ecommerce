/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'notification-cache-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/notification-icon.png',
        '/badge-icon.png'
      ]);
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { notification } = event.data;
    self.registration.showNotification(notification.title, notification.options);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    const alertData = event.notification.data;
    
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        if (clientList.length > 0) {
          clientList[0].focus();
          clientList[0].postMessage({
            type: 'NOTIFICATION_CLICKED',
            alert: alertData
          });
        } else {
          clients.openWindow(`/dashboard/alerts/${alertData.id}`);
        }
      })
    );
  }
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    ...data.options,
    icon: '/notification-icon.png',
    badge: '/badge-icon.png',
    data: data.alert
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});