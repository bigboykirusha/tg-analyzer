/**
 * TGDuet's service worker: web push only — no cache, no fetch handler (the site works online as before).
 * The server sends { title, body, url, tag }: what happened in the person's words, as in «Уведомления». A tap opens
 * the page it is about, in a TGDuet window that is already open when there is one.
 */

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let data
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  // A push must always show something: browsers punish a silent one.
  event.waitUntil(
    self.registration.showNotification(data.title || 'TGDuet', {
      body: data.body || '',
      tag: data.tag,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      lang: 'ru',
      data: { url: data.url || '/notifications' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/notifications', self.location.origin).href
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const open = windows.find((client) => new URL(client.url).origin === self.location.origin)
      if (open) {
        // The app moves there itself (plugins/push.client.ts), without reloading the page.
        open.postMessage({ type: 'tgduet:open', path: new URL(url).pathname + new URL(url).search })
        return open.focus()
      }
      return self.clients.openWindow(url)
    })(),
  )
})
