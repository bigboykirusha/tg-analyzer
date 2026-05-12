import type { ApiErrorResponse, AuthSuccessResponse, UserDto } from '@tg-analyzer/shared'
import { isDefinitiveAuthFailureCode, isTokenUsable } from '../utils/auth'

let refreshPromise: Promise<RefreshResult> | null = null

type FetchErrorLike = {
  message?: string
  status?: number
  data?: (ApiErrorResponse & Record<string, unknown>) | undefined
  response?: {
    status?: number
    _data?: (ApiErrorResponse & Record<string, unknown>) | undefined
  }
}

export type ApiClientError = Error & {
  statusCode?: number
  code?: string
  data?: (ApiErrorResponse & Record<string, unknown>) | undefined
}

type RefreshResult = {
  accessToken: string | null
  user: UserDto | null
  error: ApiClientError | null
  definitiveFailure: boolean
}

function normalizeApiError(error: unknown): ApiClientError {
  const source = (error ?? {}) as FetchErrorLike
  const data = source.data ?? source.response?._data
  const message = data?.message ?? source.message ?? 'Request failed'
  const normalized = new Error(message) as ApiClientError

  normalized.statusCode = source.status ?? source.response?.status
  normalized.code = typeof data?.code === 'string' ? data.code : undefined
  normalized.data = data

  return normalized
}

function setTransientAuthHealth(auth: ReturnType<typeof useAuthStore>) {
  if (!auth.isAuthorized) {
    auth.setAuthHealth('unauthenticated')
    return
  }

  auth.setAuthHealth(isTokenUsable(auth.accessToken) && auth.telegramSessionActive ? 'ready' : 'degraded')
}

async function redirectToLogin() {
  if (!import.meta.client) {
    return
  }

  if (window.location.pathname !== '/login') {
    await navigateTo('/login')
  }
}

async function doRefresh(apiUrl: string): Promise<RefreshResult> {
  const auth = useAuthStore()

  try {
    const refreshResult = await $fetch<AuthSuccessResponse>(`${apiUrl}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })

    if (!refreshResult.user) {
      const error = new Error('Refresh session invalid') as ApiClientError
      error.statusCode = 401
      error.code = 'AUTH_REFRESH_INVALID'
      auth.clear()
      return { accessToken: null, user: null, error, definitiveFailure: true }
    }

    auth.setAccess(refreshResult.accessToken, refreshResult.user)
    return {
      accessToken: refreshResult.accessToken,
      user: refreshResult.user,
      error: null,
      definitiveFailure: false,
    }
  } catch (rawError) {
    const error = normalizeApiError(rawError)

    if (error.code === 'TELEGRAM_REAUTH_REQUIRED') {
      auth.setTelegramSessionActive(false)
    }

    if (isDefinitiveAuthFailureCode(error.code)) {
      auth.clear()
      return { accessToken: null, user: null, error, definitiveFailure: true }
    }

    setTransientAuthHealth(auth)
    return { accessToken: null, user: null, error, definitiveFailure: false }
  }
}

export async function refreshAccessToken(apiUrl: string) {
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

  return execute().catch(async (rawError) => {
    const error = normalizeApiError(rawError)

    if (error.code === 'TELEGRAM_REAUTH_REQUIRED') {
      auth.setTelegramSessionActive(false)
      throw error
    }

    if (path === '/api/auth/refresh' || error.statusCode !== 401) {
      throw error
    }

    if (error.code === 'AUTH_TEMP_TOKEN_INVALID') {
      throw error
    }

    if (isDefinitiveAuthFailureCode(error.code)) {
      auth.clear()
      await redirectToLogin()
      throw error
    }

    const refreshResult = await refreshAccessToken(config.public.apiUrl)
    if (refreshResult.accessToken) {
      return execute()
    }

    if (refreshResult.definitiveFailure) {
      await redirectToLogin()
    }

    throw refreshResult.error ?? error
  })
}
