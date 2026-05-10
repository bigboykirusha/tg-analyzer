let refreshPromise: Promise<string | null> | null = null

async function doRefresh(apiUrl: string) {
  const auth = useAuthStore()
  try {
    const refreshResult = await $fetch<{ accessToken: string; user: typeof auth.user }>(`${apiUrl}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })

    if (!refreshResult.user) {
      auth.clear()
      return null
    }

    auth.setAccess(refreshResult.accessToken, refreshResult.user)
    return refreshResult.accessToken
  } catch {
    auth.clear()
    return null
  }
}

async function refreshAccessToken(apiUrl: string) {
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = doRefresh(apiUrl).finally(() => {
    refreshPromise = null
  })

  return refreshPromise
}

export function useApiFetch<T>(path: string, options: Parameters<typeof $fetch<T>>[1] = {}) {
  const config = useRuntimeConfig()
  const auth = useAuthStore()

  const createHeaders = () => {
    const headers = new Headers(options.headers as HeadersInit | undefined)

    if (auth.accessToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${auth.accessToken}`)
    }

    return headers
  }

  const execute = () => $fetch<T>(`${config.public.apiUrl}${path}`, {
    credentials: 'include',
    ...options,
    headers: createHeaders(),
  })

  return execute().catch(async (error: any) => {
    if (error?.response?.status !== 401 || path === '/api/auth/refresh') {
      throw error
    }

    const newToken = await refreshAccessToken(config.public.apiUrl)
    if (!newToken) {
      throw error
    }

    return execute()
  })
}
