import React, { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import {
  Radio, Play, Pause, ArrowUpRight, ArrowDownRight,
  Flame, Trash2, Eye, ShieldAlert, Wifi, WifiOff
} from 'lucide-react'

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')

export default function LivePanel() {
  const [events, setEvents] = useState([])
  const [isPaused, setIsPaused] = useState(false)
  const [onlineCount, setOnlineCount] = useState(0)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const token = sessionStorage.getItem('swiftshare_admin_token') || localStorage.getItem('swiftshare_admin_token')
    if (!token) return

    const socket = io(`${API_BASE}/admin`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
    })

    socket.on('connect', () => {
      setConnected(true)
    })

    socket.on('disconnect', () => {
      setConnected(false)
    })

    socket.on('online-count', ({ count }) => {
      setOnlineCount(count || 0)
    })

    const handleEvent = (type, data) => {
      if (isPaused) return
      setEvents((prev) => [
        {
          id: `${Date.now()}-${Math.random()}`,
          type,
          data,
          timestamp: new Date(),
        },
        ...prev.slice(0, 199),
      ])
    }

    socket.on('transfer-created', (d) => handleEvent('transfer-created', d))
    socket.on('download-started', (d) => handleEvent('download-started', d))
    socket.on('download-completed', (d) => handleEvent('download-completed', d))
    socket.on('transfer-expired', (d) => handleEvent('transfer-expired', d))
    socket.on('transfer-cancelled', (d) => handleEvent('transfer-cancelled', d))
    socket.on('visits-batch', (d) => handleEvent('visits-batch', d))
    socket.on('admin-login-failed', (d) => handleEvent('admin-login-failed', d))

    return () => {
      socket.disconnect()
    }
  }, [isPaused])

  const renderEventIcon = (type) => {
    switch (type) {
      case 'transfer-created':
        return <ArrowUpRight className="w-4 h-4 text-[var(--accent)]" />
      case 'download-started':
      case 'download-completed':
        return <ArrowDownRight className="w-4 h-4 text-[var(--success)]" />
      case 'transfer-expired':
      case 'transfer-cancelled':
        return <Trash2 className="w-4 h-4 text-[var(--danger)]" />
      case 'visits-batch':
        return <Eye className="w-4 h-4 text-[#3B82F6]" />
      case 'admin-login-failed':
        return <ShieldAlert className="w-4 h-4 text-[var(--danger)]" />
      default:
        return <Radio className="w-4 h-4 text-[var(--text-3)]" />
    }
  }

  const renderEventTitle = (ev) => {
    switch (ev.type) {
      case 'transfer-created':
        return `New Transfer created: ${ev.data?.code || ''}`
      case 'download-started':
        return `Download started for ${ev.data?.code || ''}`
      case 'download-completed':
        return `Download completed for ${ev.data?.code || ''}`
      case 'transfer-expired':
        return `Transfer expired: ${ev.data?.code || ''}`
      case 'visits-batch':
        return `${ev.data?.count || 1} new visitor view(s) on ${ev.data?.latest?.route || '/'}`
      case 'admin-login-failed':
        return `Failed admin login attempt from ${ev.data?.ipMasked || 'unknown'}`
      default:
        return 'System event'
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header Bar */}
      <div className="p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                connected ? 'bg-[var(--success)] animate-pulse' : 'bg-[var(--danger)]'
              }`}
            />
            <span className="text-xs font-semibold text-[var(--text)]">
              {connected ? 'Live Stream Connected' : 'Connecting to Socket...'}
            </span>
          </div>

          <div className="text-xs text-[var(--text-3)] pl-3 border-l border-[var(--border)]">
            Active Web Sockets:{' '}
            <strong className="text-[var(--text)] font-mono">{onlineCount}</strong>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors ${
              isPaused
                ? 'bg-[var(--warning)]/10 border-[var(--warning)]/30 text-[var(--warning)]'
                : 'bg-[var(--surface)] hover:bg-[var(--surface-hover)] border-[var(--border)] text-[var(--text-2)]'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            {isPaused ? 'Resume Stream' : 'Pause Stream'}
          </button>

          {events.length > 0 && (
            <button
              onClick={() => setEvents([])}
              className="px-3 py-1.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs text-[var(--text-3)] hover:text-[var(--text)] transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Live Event Stream */}
      <div className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border)] flex flex-col gap-3 min-h-[400px]">
        <h2 className="text-sm font-bold text-[var(--text)]">Real-Time Activity Feed</h2>

        {events.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 text-center text-xs text-[var(--text-3)] gap-2">
            <Radio className="w-8 h-8 text-[var(--accent)] animate-pulse opacity-60" />
            <span>Listening for real-time events on the /admin channel...</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto pr-1">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]/50 hover:border-[var(--border)] transition-all flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[var(--surface-card)] border border-[var(--border)]">
                    {renderEventIcon(ev.type)}
                  </div>
                  <div>
                    <div className="font-semibold text-[var(--text)]">
                      {renderEventTitle(ev)}
                    </div>
                    {ev.data?.ipMasked && (
                      <div className="text-[10px] text-[var(--text-3)] font-mono mt-0.5">
                        Client IP: {ev.data.ipMasked}
                      </div>
                    )}
                  </div>
                </div>

                <span className="font-mono text-[10px] text-[var(--text-3)] flex-shrink-0">
                  {new Date(ev.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
