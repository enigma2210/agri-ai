/**
 * Global API client wrapper for Krishi Setu
 *
 * - Centralized error handling
 * - Automatic retries with exponential backoff
 * - Configurable timeout
 * - User-friendly error messages (never raw network errors)
 */

import { API_BASE } from '@/config/api'

/* ── Types ── */

export interface ApiRequestOptions {
  /** HTTP method (default: GET) */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  /** JSON body (auto-stringified) */
  body?: unknown
  /** Extra headers */
  headers?: Record<string, string>
  /** Timeout in ms (default: 30 000) */
  timeout?: number
  /** Max retry attempts for transient failures (default: 2) */
  retries?: number
}

export class ApiError extends Error {
  status: number
  userMessage: string
  constructor(status: number, message: string, userMessage?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.userMessage =
      userMessage ?? friendlyMessage(status)
  }
}

/* ── Helpers ── */

function friendlyMessage(status: number): string {
  if (status === 0) return 'Unable to reach server. Please check your connection.'
  if (status === 408) return 'Request timed out. Please try again.'
  if (status === 429) return 'Too many requests. Please wait a moment.'
  if (status >= 500) return 'Server error. Please try again shortly.'
  return 'Something went wrong. Please try again.'
}

function isRetryable(status: number): boolean {
  return status === 0 || status === 408 || status === 429 || status >= 500
}

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/* ── Core fetch wrapper ── */

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const {
    method = 'GET',
    body,
    headers: extraHeaders,
    timeout = 30_000,
    retries = 2,
  } = options

  const url = `${API_BASE}${path}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...extraHeaders,
  }

  let lastError: ApiError | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      await wait(Math.min(1000 * 2 ** (attempt - 1), 8000))
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)

    try {
      const res = await fetch(url, {
        method,
        headers,
        body: body != null ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      clearTimeout(timer)

      if (!res.ok) {
        let detail = ''
        try {
          const json = await res.json()
          detail = json?.detail ?? json?.message ?? ''
        } catch { /* ignore parse errors */ }
        const err = new ApiError(
          res.status,
          detail || `HTTP ${res.status}`,
        )
        if (isRetryable(res.status) && attempt < retries) {
          lastError = err
          continue
        }
        throw err
      }

      // 204 No Content
      if (res.status === 204) return undefined as T

      return (await res.json()) as T
    } catch (err) {
      clearTimeout(timer)

      if (err instanceof ApiError) {
        lastError = err
        if (isRetryable(err.status) && attempt < retries) continue
        throw err
      }

      // Network / abort errors
      const isTimeout =
        err instanceof DOMException && err.name === 'AbortError'
      const status = isTimeout ? 408 : 0
      const msg = isTimeout
        ? 'Request timed out'
        : err instanceof Error
          ? err.message
          : String(err)

      lastError = new ApiError(status, msg)
      if (attempt < retries) continue
      throw lastError
    }
  }

  throw lastError ?? new ApiError(0, 'Unknown error')
}

/* ── Convenience shortcuts ── */

export const api = {
  get: <T = unknown>(path: string, opts?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiFetch<T>(path, { ...opts, method: 'GET' }),

  post: <T = unknown>(path: string, body?: unknown, opts?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiFetch<T>(path, { ...opts, method: 'POST', body }),
}
