/**
 * Connection Status Indicator
 * Subtle inline badge showing backend connectivity state.
 */

'use client'

import { memo } from 'react'
import type { ConnectionStatus } from '@/utils/voiceWebSocket'

interface Props {
  status: ConnectionStatus
}

const config: Record<ConnectionStatus, { label: string; dot: string; text: string }> = {
  connecting: {
    label: 'Connecting to Krishi Setu…',
    dot: 'bg-amber-400 animate-pulse',
    text: 'text-amber-600',
  },
  connected: {
    label: 'Connected',
    dot: 'bg-emerald-500',
    text: 'text-emerald-600',
  },
  reconnecting: {
    label: 'Reconnecting…',
    dot: 'bg-amber-400 animate-pulse',
    text: 'text-amber-600',
  },
  offline: {
    label: 'Server offline',
    dot: 'bg-red-400',
    text: 'text-red-500',
  },
}

function ConnectionIndicator({ status }: Props) {
  const { label, dot, text } = config[status]

  // Hide when connected (non-intrusive)
  if (status === 'connected') return null

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/60 backdrop-blur-sm border border-gray-200/50 text-[11px] font-medium ${text}`}
      role="status"
      aria-live="polite"
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </div>
  )
}

export default memo(ConnectionIndicator)
