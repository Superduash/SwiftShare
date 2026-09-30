import React, { useState, useEffect } from 'react'
import { ShieldCheck, ShieldAlert, Key, LogOut, Trash2, RefreshCw } from 'lucide-react'
import { fetchAuditLogs } from '../../services/adminApi'

export default function AuditPanel() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  const loadLogs = async () => {
    setLoading(true)
    try {
      const data = await fetchAuditLogs()
      setLogs(data || [])
    } catch (err) {
      console.error('Failed to load audit logs', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [])

  const getActionBadge = (action) => {
    switch (action) {
      case 'login_success':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--success)]/10 text-[var(--success)] text-[11px] font-semibold">
            <ShieldCheck className="w-3 h-3" /> Login Success
          </span>
        )
      case 'login_failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--danger)]/10 text-[var(--danger)] text-[11px] font-semibold">
            <ShieldAlert className="w-3 h-3" /> Login Failed
          </span>
        )
      case 'expire_transfer':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--warning)]/10 text-[var(--warning)] text-[11px] font-semibold">
            <Trash2 className="w-3 h-3" /> Force Expire
          </span>
        )
      case 'logout':
      case 'logout_all':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--text-3)]/10 text-[var(--text-3)] text-[11px] font-semibold">
            <LogOut className="w-3 h-3" /> {action === 'logout_all' ? 'Logout All' : 'Logout'}
          </span>
        )
      default:
        return (
          <span className="px-2 py-0.5 rounded-md bg-[var(--surface-hover)] text-[var(--text-2)] text-[11px] font-semibold">
            {action}
          </span>
        )
    }
  }

  return (
    <div className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border)] flex flex-col gap-4">
      <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
        <div>
          <h2 className="text-sm font-bold text-[var(--text)]">Admin Audit Log</h2>
          <p className="text-xs text-[var(--text-3)]">
            Immutable log of administrative access, authentication attempts, and moderation actions
          </p>
        </div>
        <button
          onClick={loadLogs}
          className="p-1.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-2)]"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-[var(--text-3)] animate-pulse">
          Loading audit entries...
        </div>
      ) : logs.length === 0 ? (
        <div className="py-16 text-center text-xs text-[var(--text-3)]">
          No audit logs recorded yet
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-3)] font-medium">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Admin User</th>
                <th className="py-2.5 px-3">Masked IP</th>
                <th className="py-2.5 px-3">Client UA</th>
                <th className="py-2.5 px-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr
                  key={log._id || i}
                  className="border-b border-[var(--border)]/30 hover:bg-[var(--surface-hover)] transition-colors"
                >
                  <td className="py-2.5 px-3 font-mono text-[var(--text-3)]">
                    {log.ts ? new Date(log.ts).toLocaleString() : '—'}
                  </td>
                  <td className="py-2.5 px-3">{getActionBadge(log.action)}</td>
                  <td className="py-2.5 px-3 font-semibold text-[var(--text)]">{log.username}</td>
                  <td className="py-2.5 px-3 font-mono text-[var(--text-2)]">{log.ipMasked || '—'}</td>
                  <td className="py-2.5 px-3 text-[var(--text-3)] truncate max-w-[150px]" title={log.ua}>
                    {log.ua || '—'}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-[var(--text-3)]">
                    {log.details && Object.keys(log.details).length > 0 ? JSON.stringify(log.details) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
