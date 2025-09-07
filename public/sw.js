// Service Worker para Web Push Notifications
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(clients.claim());
});

// Listener para notificações push
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  if (!event.data) {
    console.log('No data in push event');
    return;
  }

  try {
    const data = event.data.json();
    console.log('Push data:', data);

    const notificationOptions = {
      body: data.body || 'Nova notificação',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: data.tag || 'general',
      data: {
        url: data.url || '/',
        ...data
      },
      requireInteraction: data.requireInteraction || false,
      silent: false,
      renotify: true
    };

    event.waitUntil(
      self.registration.showNotification(
        data.title || 'Disponibilidades CVA',
        notificationOptions
      )
    );
  } catch (error) {
    console.error('Error processing push notification:', error);
    
    // Fallback notification
    event.waitUntil(
      self.registration.showNotification('Nova Notificação', {
        body: 'Tem uma nova notificação disponível',
        icon: '/favicon.ico',
        data: { url: '/' }
      })
    );
  }
});

// Listener para cliques nas notificações
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/dashboard';
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Procurar por uma janela já aberta com a aplicação
      for (const client of clientList) {
        if (client.url === new URL(targetUrl, self.location.origin).href && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Se não encontrar, abrir nova janela
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Listener para fechar notificação
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
});