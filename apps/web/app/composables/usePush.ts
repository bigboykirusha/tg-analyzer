/**
 * Web push on this browser: the person's own news (a report ready, a quiz answered, a link opened or ending) as a
 * notification of the phone or the computer. The browser asks for permission only after a tap on «Включить».
 *
 * States:
 * - `hidden` — the server has no push set up, or the page is not ready yet: nothing to show;
 * - `unsupported` — this browser cannot (an old one, or Telegram's in-app browser);
 * - `install` — an iPhone or iPad in Safari: push works only for the site added to the Home Screen (iOS 16.4+);
 * - `denied` — refused once; only the browser's settings can allow it again;
 * - `off` — can be turned on; `on` — this browser receives them.
 */
export type PushState = 'hidden' | 'unsupported' | 'install' | 'denied' | 'off' | 'on'

const SW_URL = '/sw.js'

function isAppleMobile() {
  const nav = navigator as Navigator & { standalone?: boolean }
  // iPadOS reports itself as a Mac; a touch screen gives it away.
  return /iPhone|iPad|iPod/.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1)
}

function isInstalled() {
  const nav = navigator as Navigator & { standalone?: boolean }
  return nav.standalone === true || window.matchMedia('(display-mode: standalone)').matches
}

function supported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/** The VAPID key as the bytes `subscribe` wants. */
function keyBytes(base64url: string) {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
}

async function registration() {
  return (await navigator.serviceWorker.getRegistration(SW_URL)) ?? navigator.serviceWorker.register(SW_URL)
}

async function currentSubscription() {
  if (!supported()) return null
  const found = await navigator.serviceWorker.getRegistration(SW_URL)
  return (await found?.pushManager.getSubscription()) ?? null
}

export function usePush() {
  const state = useState<PushState>('push-state', () => 'hidden')
  const busy = useState('push-busy', () => false)
  const publicKey = useState<string | null | undefined>('push-key', () => undefined)
  const { locale } = useI18n()

  async function loadKey() {
    if (publicKey.value === undefined) {
      try {
        publicKey.value = (await api('GET /api/v1/notifications/push')).publicKey
      } catch {
        return null
      }
    }
    return publicKey.value
  }

  async function send(subscription: PushSubscription) {
    const json = subscription.toJSON()
    await api('POST /api/v1/notifications/push', {
      body: {
        endpoint: subscription.endpoint,
        keys: { p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' },
        locale: locale.value,
      },
    })
  }

  /**
   * Reads the state, and keeps a subscription that already exists tied to whoever is signed in now (and to the
   * site's language): cheap, so it runs on every start.
   */
  async function refresh() {
    if (!import.meta.client) return
    if (!(await loadKey())) return void (state.value = 'hidden')
    if (!supported()) return void (state.value = isAppleMobile() && !isInstalled() ? 'install' : 'unsupported')
    if (Notification.permission === 'denied') return void (state.value = 'denied')
    const subscription = Notification.permission === 'granted' ? await currentSubscription() : null
    state.value = subscription ? 'on' : 'off'
    if (subscription) await send(subscription).catch(() => undefined)
  }

  /** From a tap: the browser's question first (it must follow the gesture), then the subscription. */
  async function enable() {
    if (busy.value || !supported()) return false
    busy.value = true
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        state.value = permission === 'denied' ? 'denied' : 'off'
        return false
      }
      const key = await loadKey()
      if (!key) return false
      const worker = await registration()
      await navigator.serviceWorker.ready
      const subscription =
        (await worker.pushManager.getSubscription()) ??
        (await worker.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) }))
      await send(subscription)
      state.value = 'on'
      return true
    } finally {
      busy.value = false
    }
  }

  /** Off on this browser: the server forgets it, the browser drops the subscription. */
  async function disable() {
    if (busy.value) return
    busy.value = true
    try {
      const subscription = await currentSubscription()
      if (subscription) {
        await api('POST /api/v1/notifications/push/remove', { body: { endpoint: subscription.endpoint } }).catch(
          () => undefined,
        )
        await subscription.unsubscribe().catch(() => undefined)
      }
      state.value = 'off'
    } finally {
      busy.value = false
    }
  }

  return { state, busy, refresh, enable, disable }
}

/**
 * Signing out: this browser stops receiving the person's news (the next account on a shared computer must not get
 * them). Called while the session still works; never blocks the sign-out.
 */
export async function forgetPushOnThisBrowser() {
  try {
    const subscription = await currentSubscription()
    if (!subscription) return
    await api('POST /api/v1/notifications/push/remove', { body: { endpoint: subscription.endpoint } }).catch(
      () => undefined,
    )
    await subscription.unsubscribe()
  } catch {
    // Nothing to forget, or the browser refused: the server drops the address on its next 410.
  }
}
