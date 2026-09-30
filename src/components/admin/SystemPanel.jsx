import React, { useState, useEffect } from 'react'
import {
  Server, Database, HardDrive, Cpu, AlertTriangle, CheckCircle2,
  RefreshCw, Clock, Activity, ShieldCheck
} from 'lucide-react'
import { fetchSystemHealth } from '../../services/adminApi'

function formatUptime(seconds = 0) {
  const d = Math.floor(seconds / (3600 * 24))
  const h = Math.floor((seconds % (3600 * 24)) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${d}d ${h}h ${m}m ${s}s`
}

export default function SystemPanel() {
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadHealth = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchSystemHealth()
      setHealth(data)
    } catch (err) {
      setError('Failed to retrieve system status')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHealth()
  }, [])

  if (loading && !health) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-pulse">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 bg-[var(--surface-hover)] rounded-2xl" />
        ))}
      </div>
    )
  }

  if (error && !health) {
    return (
      <div className="p-6 rounded-2xl bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-[var(--danger)] text-center">
        <p className="font-semibold text-sm">{error}</p>
        <button
          onClick={loadHealth}
          className="mt-3 px-4 py-1.5 bg-[var(--surface)] text-xs rounded-xl font-medium border border-[var(--border)] inline-flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    )
  }

  const isRedisFallback = health?.services?.redis?.status === 'fallback_memory'

  return (
    <div className="flex flex-col gap-6">
      {/* Warning banner if running in fallback mode */}
      {isRedisFallback && (
        <div className="p-4 rounded-2xl bg-[var(--warning)]/10 border border-[var(--warning)]/20 text-[var(--warning)] flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold">Notice: Rate Limiter Running in In-Memory Fallback Mode</span>
            <p className="mt-0.5 opacity-90">
              Upstash Redis credentials are not configured or unreachable. SwiftShare is using high-performance in-memory LRU tracking.
            </p>
          </div>
        </div>
      )}

      {/* Services Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* MongoDB */}
        <div className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-3)]">Database</span>
            <Database className="w-4 h-4 text-[var(--text-3)]" />
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                health?.services?.mongodb?.status === 'healthy'
                  ? 'bg-[var(--success)]'
                  : 'bg-[var(--danger)]'
              }`}
            />
            <span className="text-sm font-bold text-[var(--text)] capitalize">
              MongoDB Atlas {health?.services?.mongodb?.status}
            </span>
          </div>
        </div>

        {/* Cloudflare R2 */}
        <div className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-3)]">Object Storage</span>
            <HardDrive className="w-4 h-4 text-[var(--text-3)]" />
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                health?.services?.r2?.status === 'healthy'
                  ? 'bg-[var(--success)]'
                  : 'bg-[var(--danger)]'
              }`}
            />
            <span className="text-sm font-bold text-[var(--text)] capitalize">
              Cloudflare R2 {health?.services?.r2?.status}
            </span>
          </div>
        </div>

        {/* Rate Limiter */}
        <div className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-3)]">Rate Limiter</span>
            <ShieldCheck className="w-4 h-4 text-[var(--text-3)]" />
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                health?.services?.redis?.status === 'healthy'
                  ? 'bg-[var(--success)]'
                  : 'bg-[var(--warning)]'
              }`}
            />
            <span className="text-sm font-bold text-[var(--text)] capitalize">
              {health?.services?.redis?.status === 'healthy' ? 'Upstash Redis Active' : 'In-Memory Fallback'}
            </span>
          </div>
        </div>
      </div>

      {/* Memory & Uptime */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Node.js Memory Allocation */}
        <div className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border)] flex flex-col gap-4">
          <h2 className="text-sm font-bold text-[var(--text)]">Memory Utilization</h2>
          <p className="text-xs text-[var(--text-3)]">
            Node.js process heap and resident set size (Render 512 MB target)
          </p>

          <div className="flex flex-col gap-3 text-xs mt-2">
            <div>
              <div className="flex justify-between text-[var(--text-2)] mb-1">
                <span>Heap Used</span>
                <span className="font-mono font-bold">{health?.memory?.heapUsedMB || 0} MB / {health?.memory?.heapTotalMB || 0} MB</span>
              </div>
              <div className="w-full h-2 bg-[var(--surface-hover)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] rounded-full"
                  style={{
                    width: `${Math.min(100, Math.round(((health?.memory?.heapUsedMB || 0) / (health?.memory?.heapTotalMB || 1)) * 100))}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[var(--text-2)] mb-1">
                <span>Resident Set Size (RSS)</span>
                <span className="font-mono font-bold">{health?.memory?.rssMB || 0} MB / 512 MB</span>
              </div>
              <div className="w-full h-2 bg-[var(--surface-hover)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#3B82F6] rounded-full"
                  style={{
                    width: `${Math.min(100, Math.round(((health?.memory?.rssMB || 0) / 512) * 100))}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Runtime Diagnostics */}
        <div className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border)] flex flex-col gap-4">
          <h2 className="text-sm font-bold text-[var(--text)]">Runtime Diagnostics</h2>
          <div className="grid grid-cols-2 gap-3 text-xs mt-1">
            <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex flex-col gap-1">
              <span className="text-[var(--text-3)]">Process Uptime</span>
              <span className="font-mono font-bold text-[var(--text)]">{formatUptime(health?.uptime || 0)}</span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex flex-col gap-1">
              <span className="text-[var(--text-3)]">Version</span>
              <span className="font-mono font-bold text-[var(--text)]">v{health?.version || '0.7.7'}</span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex flex-col gap-1">
              <span className="text-[var(--text-3)]">Sockets Connected</span>
              <span className="font-mono font-bold text-[var(--text)]">{health?.sockets?.connectedCount || 0}</span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex flex-col gap-1">
              <span className="text-[var(--text-3)]">Node Platform</span>
              <span className="font-mono font-bold text-[var(--text)]">{process.env.NODE_ENV || 'production'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
