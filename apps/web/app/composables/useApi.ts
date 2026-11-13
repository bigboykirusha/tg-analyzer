import {
  buildApiPath,
  type ApiErrorCode,
  type ApiErrorResponse,
  type ApiOperation,
  type ApiParams,
  type ApiQuery,
  type ApiRequest,
  type ApiResponse,
  type AuthSuccessResponse,
} from '@tg-analyzer/shared'
import { FetchError, ofetch } from 'ofetch'

/** A failed API call with the server's machine-readable error code. */
export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly code: ApiErrorCode | 'NETWORK_ERROR',
    readonly retryAfter: number | null = null,
  ) {
    super(message)
    this.name = 'ApiClientError'
  }

  get isNetworkError() {
    return this.code === 'NETWORK_ERROR'
  }
}

function toClientError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) return error
  if (error instanceof FetchError) {
    const data = error.data as Partial<ApiErrorResponse> | undefined
    if (error.status && data?.code) {
      return new ApiClientError(data.message ?? error.message, error.status, data.code, data.retryAfter ?? null)
    }
    if (error.status && error.status < 500) {
      return new ApiClientError(error.message, error.status, 'INVALID_REQUEST')
    }
    if (error.status) return new ApiClientError(error.message, error.status, 'INTERNAL_ERROR')
  }
  return new ApiClientError(error instanceof Error ? error.message : 'Network error', null, 'NETWORK_ERROR')
}

const SESSION_ENDED: ReadonlySet<string> = new Set(['AUTH_REFRESH_INVALID'])

// ─── Access token refresh ──────────────────────────────────────────────────

let refreshInFlight: Promise<AuthSuccessResponse | null> | null = null

/** Pending work belongs to the session that started it, even after signing back into the same account. */
function guardSession(auth: ReturnType<typeof useAuthStore>) {
  const version = auth.sessionVersion
  return () => {
    if (auth.sessionVersion !== version) throw new DOMException('Session changed', 'AbortError')
  }
}

/** The refresh the page asked for before the app started (spa-loading-template.html); answers once. */
async function takeEarlyRefresh(): Promise<AuthSuccessResponse | null | undefined> {
  if (!import.meta.client) return undefined
  const holder = window as { __tgEarlyRefresh?: Promise<Response | null> }
  const early = holder.__tgEarlyRefresh
  delete holder.__tgEarlyRefresh
  const response = await early
  if (!response) return undefined
  if (response.status === 401) return null
  if (!response.ok) return undefined
  return (await response.json()) as AuthSuccessResponse
}

async function requestRefresh(): Promise<AuthSuccessResponse | null> {
  try {
    const early = await takeEarlyRefresh()
    if (early !== undefined) return early
    return await ofetch<AuthSuccessResponse>('/api/v1/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      timeout: 15_000,
    })
  } catch (rawError) {
    const error = toClientError(rawError)
    if (error.status === 401) return null
    throw error
  }
}

/**
 * Exchanges the refresh cookie for a new access token. Concurrent callers
 * share one request, and tabs coordinate through the Web Locks API so that
 * two tabs never rotate the same refresh token at once.
 *
 * Resolves to null when the session has ended; throws on network failures.
 */
export function refreshSession(): Promise<AuthSuccessResponse | null> {
  if (refreshInFlight) return refreshInFlight

  const auth = useAuthStore()
  const assertSession = guardSession(auth)
  const tokenBefore = auth.accessToken
  const run = async () => {
    assertSession()
    // Another tab may have refreshed while this one waited for the lock.
    if (auth.accessToken && auth.accessToken !== tokenBefore) {
      return { accessToken: auth.accessToken, user: auth.user! }
    }
    const result = await requestRefresh()
    assertSession()
    if (result) auth.signIn(result)
    else auth.signOut()
    return result
  }

  const locks = import.meta.client ? navigator.locks : undefined
  const pending: Promise<AuthSuccessResponse | null> = locks
    ? (locks.request('tg-analyzer-refresh', run) as unknown as Promise<AuthSuccessResponse | null>)
    : run()
  const shared = pending.finally(() => {
    refreshInFlight = null
  })
  refreshInFlight = shared
  return shared
}

// ─── Typed requests ────────────────────────────────────────────────────────

type RequestOptions<K extends ApiOperation> = {
  query?: ApiQuery<K>
  signal?: AbortSignal
} & ([ApiRequest<K>] extends [undefined] ? { body?: never } : { body: ApiRequest<K> }) &
  ([ApiParams<K>] extends [never] ? { params?: never } : { params: ApiParams<K> })

type OptionalArgs<K extends ApiOperation> = [ApiRequest<K>] extends [undefined]
  ? [ApiParams<K>] extends [never]
    ? [options?: RequestOptions<K>]
    : [options: RequestOptions<K>]
  : [options: RequestOptions<K>]

/**
 * Calls an endpoint of the shared API contract. Adds the access token,
 * refreshes it once on 401 and signs the user out when the session is gone.
 */
export async function api<K extends ApiOperation>(operation: K, ...args: OptionalArgs<K>): Promise<ApiResponse<K>> {
  const options = (args[0] ?? {}) as {
    body?: unknown
    query?: Record<string, unknown>
    params?: Record<string, string>
    signal?: AbortSignal
  }
  const separator = operation.indexOf(' ')
  const method = operation.slice(0, separator) as 'GET' | 'POST' | 'PATCH' | 'DELETE'
  const path = buildApiPath(operation.slice(separator + 1), options.params)
  const auth = useAuthStore()
  const assertSession = guardSession(auth)
  const isBinaryBody = options.body instanceof Blob

  const send = async () => {
    assertSession()
    const result = await ofetch<ApiResponse<K>>(path, {
      method,
      body: options.body as BodyInit | Record<string, unknown> | undefined,
      query: options.query,
      signal: options.signal,
      credentials: 'include',
      headers: {
        ...(auth.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {}),
        ...(isBinaryBody ? { 'Content-Type': (options.body as Blob).type || 'application/octet-stream' } : {}),
      },
    })
    assertSession()
    return result
  }

  try {
    return await send()
  } catch (rawError) {
    assertSession()
    const error = toClientError(rawError)
    if (error.code === 'TELEGRAM_REAUTH_REQUIRED') auth.markTelegramSessionInactive()
    if (error.status !== 401 || error.code !== 'AUTH_UNAUTHORIZED' || !auth.accessToken) throw error
  }

  // The access token expired: refresh once and retry.
  const refreshed = await refreshSession()
  if (!refreshed) {
    await redirectToLogin()
    throw new ApiClientError('Session expired', 401, 'AUTH_REFRESH_INVALID')
  }
  assertSession()
  try {
    return await send()
  } catch (rawError) {
    throw toClientError(rawError)
  }
}

export function isSessionEnded(error: unknown) {
  return error instanceof ApiClientError && SESSION_ENDED.has(error.code)
}

async function redirectToLogin() {
  if (!import.meta.client || useRoute().path === '/login') return
  await navigateTo('/login', { replace: true })
}
