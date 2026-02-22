/**
 * Central API configuration for Krishi Setu
 * All backend URLs flow through this file — NEVER hardcode localhost.
 */

export const API_BASE: string =
  (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '')

export const WS_BASE: string = API_BASE
  .replace('https://', 'wss://')
  .replace('http://', 'ws://')
