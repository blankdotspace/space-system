self.addEventListener('push', function (event) {
  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: data.icon || '/app/icon.png',
      badge: '/app/badge.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey:
          typeof data.id === 'string'
            ? data.id
            : self.crypto && 'randomUUID' in self.crypto
              ? self.crypto.randomUUID()
              : Date.now().toString(),
      },
    }
    event.waitUntil(self.registration.showNotification(data.title, options))
  }
})

self.addEventListener('notificationclick', function (event) {
  console.log('Notification click received.')
  event.notification.close()
  event.waitUntil(clients.openWindow('/'))
})

