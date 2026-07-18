self.addEventListener('message', (event) => {
  if (event.data?.type !== 'SHOW_COMMUNITY_DAY_REMINDER') return;
  event.waitUntil(self.registration.showNotification(event.data.title, event.data.options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow('/community-day-singapore'));
});
