import React, { useState, useEffect } from 'react'
import {
  Search, Filter, ArrowUpDown, Download, Trash2, X, AlertTriangle,
  ChevronLeft, ChevronRight, CheckCircle2, Shield, Flame, HardDrive,
  FileCode, Layers, Clock, Zap, RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'
import { fetchTransfers, fetchTransferDetails, expireTransfer, fetchBreakdowns, getExportUrl } from '../../services/adminApi'
import Bars from './charts/Bars'

function formatBytes(bytes = 0) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export default function TransfersPanel({ range = '7d' }) {
  const [transfers, setTransfers] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Filters
  const [statusFilter, setStatusFilter] = useState('')
  const [burnFilter, setBurnFilter] = useState('')
  const [passwordFilter, setPasswordFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState('createdAt_desc')

  // Drawer / Modals
  const [selectedTransfer, setSelectedTransfer] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [expireModalCode, setExpireModalCode] = useState(null)
  const [expireConfirmText, setExpireConfirmText] = useState('')
  const [expiring, setExpiring] = useState(false)

  // Breakdowns
  const [breakdowns, setBreakdowns] = useState(null)

  const loadTransfers = async () => {
    setLoading(true)
    try {
      const res = await fetchTransfers({
        page,
        limit: 20,
        status: statusFilter,
        burn: burnFilter,
        password: passwordFilter,
        search: searchQuery,
        sort: sortOrder,
      })
      setTransfers(res?.items || [])
      setTotalPages(res?.totalPages || 1)
      setTotalCount(res?.total || 0)
    } catch (err) {
      toast.error('Failed to load transfers')
    } finally {
      setLoading(false)
    }
  }

  const loadBreakdowns = async () => {
    try {
      const res = await fetchBreakdowns(range)
      setBreakdowns(res)
    } catch (err) {
      console.error('Failed to load breakdowns', err)
    }
  }

  useEffect(() => {
    loadTransfers()
  }, [page, statusFilter, burnFilter, passwordFilter, sortOrder])

  useEffect(() => {
    loadBreakdowns()
  }, [range])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setPage(1)
    loadTransfers()
  }

  const handleRowClick = async (code) => {
    setDetailsLoading(true)
    setSelectedTransfer(null)
    try {
      const details = await fetchTransferDetails(code)
      setSelectedTransfer(details)
    } catch (err) {
      toast.error('Failed to load transfer details')
    } finally {
      setDetailsLoading(false)
    }
  }

  const handleExpireSubmit = async (e) => {
    e.preventDefault()
    if (expireConfirmText !== 'EXPIRE') return

    setExpiring(true)
    try {
      await expireTransfer(expireModalCode)
      toast.success(`Transfer ${expireModalCode} force expired`)
      setExpireModalCode(null)
      setExpireConfirmText('')
      if (selectedTransfer?.code === expireModalCode) {
        setSelectedTransfer((prev) => (prev ? { ...prev, status: 'DELETED' } : null))
      }
      loadTransfers()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to expire transfer')
    } finally {
      setExpiring(false)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2 py-0.5 rounded-md bg-[var(--success)]/10 text-[var(--success)] text-[11px] font-semibold">Active</span>
      case 'CLAIMED':
        return <span className="px-2 py-0.5 rounded-md bg-[var(--warning)]/10 text-[var(--warning)] text-[11px] font-semibold">Claimed</span>
      case 'CANCELLED':
        return <span className="px-2 py-0.5 rounded-md bg-[var(--text-3)]/10 text-[var(--text-3)] text-[11px] font-semibold">Cancelled</span>
      case 'EXPIRED':
        return <span className="px-2 py-0.5 rounded-md bg-[var(--danger)]/10 text-[var(--danger)] text-[11px] font-semibold">Expired</span>
      case 'DELETED':
      default:
        return <span className="px-2 py-0.5 rounded-md bg-[var(--danger)]/10 text-[var(--danger)] text-[11px] font-semibold">Deleted</span>
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Breakdowns Grid */}
      {breakdowns && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border)] flex flex-col gap-2">
            <span className="text-xs font-bold text-[var(--text)]">File Types Mix</span>
            <Bars data={breakdowns.mimeTypes || []} labelKey="_id" valueKey="count" maxHeight={120} />
          </div>

          <div className="p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border)] flex flex-col gap-2">
            <span className="text-xs font-bold text-[var(--text)]">Size Buckets</span>
            <Bars data={breakdowns.sizes || []} labelKey="_id" valueKey="count" maxHeight={120} barColor="#3B82F6" />
          </div>

          <div className="p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border)] flex flex-col gap-2">
            <span className="text-xs font-bold text-[var(--text)]">Feature Adoption</span>
            <div className="flex flex-col gap-2 text-xs pt-1">
              <div className="flex justify-between">
                <span className="text-[var(--text-3)] flex items-center gap-1"><Flame className="w-3.5 h-3.5" /> Burn Mode</span>
                <span className="font-mono font-semibold">{breakdowns.flags?.burn || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-3)] flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Passwords</span>
                <span className="font-mono font-semibold">{breakdowns.flags?.password || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-3)] flex items-center gap-1"><Layers className="w-3.5 h-3.5" /> Multi-File</span>
                <span className="font-mono font-semibold">{breakdowns.flags?.multiFile || 0}</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border)] flex flex-col gap-2">
            <span className="text-xs font-bold text-[var(--text)]">Kind Distribution</span>
            <Bars data={breakdowns.kind || []} labelKey="_id" valueKey="count" maxHeight={120} barColor="#10B981" />
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-[var(--text-3)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search code or device..."
            className="w-full pl-9 pr-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-xs text-[var(--text)] placeholder-[var(--text-3)] focus:outline-none focus:border-[var(--accent)]"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="px-2.5 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-2)] focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="CLAIMED">Claimed</option>
            <option value="EXPIRED">Expired</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="DELETED">Deleted</option>
          </select>

          {/* Sort Filter */}
          <select
            value={sortOrder}
            onChange={(e) => { setSortOrder(e.target.value); setPage(1) }}
            className="px-2.5 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-2)] focus:outline-none"
          >
            <option value="createdAt_desc">Newest First</option>
            <option value="createdAt_asc">Oldest First</option>
            <option value="size_desc">Largest Size</option>
            <option value="downloads_desc">Most Downloads</option>
          </select>

          {/* CSV Export Button */}
          <a
            href={getExportUrl('transfers', range)}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs text-[var(--text-2)] flex items-center gap-1.5 font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </a>
        </div>
      </div>

      {/* Main Transfers Table */}
      <div className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border)] flex flex-col gap-4">
        <div className="flex justify-between items-center text-xs text-[var(--text-3)] font-medium">
          <span>Showing {transfers.length} of {totalCount} total transfers</span>
          <span>Page {page} of {totalPages}</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-[var(--text-3)] animate-pulse">
            Loading transfers...
          </div>
        ) : transfers.length === 0 ? (
          <div className="py-16 text-center text-xs text-[var(--text-3)] border border-dashed border-[var(--border)] rounded-xl">
            No transfers match the selected filters
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-3)] font-medium">
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Files / Size</th>
                  <th className="py-2.5 px-3">Flags</th>
                  <th className="py-2.5 px-3 text-right">Downloads</th>
                  <th className="py-2.5 px-3">Device / IP</th>
                  <th className="py-2.5 px-3">Created</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((t) => (
                  <tr
                    key={t.code}
                    onClick={() => handleRowClick(t.code)}
                    className="border-b border-[var(--border)]/30 hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-3 font-mono font-bold text-[var(--text)]">
                      {t.code}
                    </td>
                    <td className="py-3 px-3">
                      {getStatusBadge(t.status)}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-[var(--text-2)]">
                        {t.fileCount} file{t.fileCount !== 1 ? 's' : ''} ({formatBytes(t.totalSize)})
                      </div>
                      <div className="text-[10px] text-[var(--text-3)] uppercase font-mono mt-0.5">
                        {t.kind}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex gap-1.5 items-center">
                        {t.burnAfterDownload && (
                          <span title="Burn after download" className="text-[var(--danger)]">
                            <Flame className="w-3.5 h-3.5" />
                          </span>
                        )}
                        {t.passwordProtected && (
                          <span title="Password protected" className="text-[var(--warning)]">
                            <Shield className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-[var(--text)]">
                      {t.downloadCount}
                    </td>
                    <td className="py-3 px-3">
                      <div className="truncate max-w-[120px] text-[var(--text-2)]" title={t.senderDeviceName}>
                        {t.senderDeviceName || 'Unknown Device'}
                      </div>
                      <div className="text-[10px] font-mono text-[var(--text-3)]">
                        {t.senderIpMasked}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-[var(--text-3)]">
                      {t.createdAt
                        ? new Date(t.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {t.status === 'ACTIVE' && (
                        <button
                          onClick={() => setExpireModalCode(t.code)}
                          className="px-2 py-1 bg-[var(--danger)]/10 hover:bg-[var(--danger)]/20 text-[var(--danger)] rounded-lg text-[11px] font-medium transition-colors"
                        >
                          Expire
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        <div className="flex items-center justify-between border-t border-[var(--border)] pt-3 text-xs">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] disabled:opacity-40 flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Prev
          </button>
          <span className="text-[var(--text-3)] font-mono">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-1.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] disabled:opacity-40 flex items-center gap-1"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Transfer Details Drawer */}
      {selectedTransfer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[var(--surface-card)] border-l border-[var(--border)] h-full p-6 flex flex-col gap-5 overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
              <div>
                <span className="text-xs text-[var(--text-3)]">Transfer Details</span>
                <h3 className="text-lg font-bold font-mono text-[var(--text)]">
                  {selectedTransfer.code}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTransfer(null)}
                className="p-1 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-3)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div className="flex justify-between py-1 border-b border-[var(--border)]/40">
                <span className="text-[var(--text-3)]">Status</span>
                <span>{getStatusBadge(selectedTransfer.status)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border)]/40">
                <span className="text-[var(--text-3)]">Size / Files</span>
                <span className="font-mono font-semibold">
                  {formatBytes(selectedTransfer.totalSize)} ({selectedTransfer.fileCount} items)
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border)]/40">
                <span className="text-[var(--text-3)]">Downloads</span>
                <span className="font-mono font-semibold">{selectedTransfer.downloadCount}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border)]/40">
                <span className="text-[var(--text-3)]">Sender Device</span>
                <span>{selectedTransfer.senderDeviceName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border)]/40">
                <span className="text-[var(--text-3)]">Masked IP</span>
                <span className="font-mono">{selectedTransfer.senderIpMasked}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border)]/40">
                <span className="text-[var(--text-3)]">Created At</span>
                <span>{selectedTransfer.createdAt ? new Date(selectedTransfer.createdAt).toLocaleString() : '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border)]/40">
                <span className="text-[var(--text-3)]">Expires At</span>
                <span>{selectedTransfer.expiresAt ? new Date(selectedTransfer.expiresAt).toLocaleString() : '—'}</span>
              </div>
            </div>

            {/* Activity Timeline */}
            <div>
              <h4 className="text-xs font-bold text-[var(--text)] mb-3">Activity Timeline</h4>
              {selectedTransfer.activity?.length === 0 ? (
                <p className="text-xs text-[var(--text-3)]">No activity logged.</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {selectedTransfer.activity.map((act, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex flex-col gap-1 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-[var(--accent)] capitalize">
                          {act.event}
                        </span>
                        <span className="text-[10px] text-[var(--text-3)] font-mono">
                          {act.timestamp ? new Date(act.timestamp).toLocaleTimeString() : ''}
                        </span>
                      </div>
                      <div className="text-[11px] text-[var(--text-3)]">
                        {act.device} {act.ipMasked ? `• ${act.ipMasked}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Moderation Force Expire Button */}
            {selectedTransfer.status === 'ACTIVE' && (
              <div className="mt-auto pt-4 border-t border-[var(--border)]">
                <button
                  onClick={() => setExpireModalCode(selectedTransfer.code)}
                  className="w-full py-2 bg-[var(--danger)]/10 hover:bg-[var(--danger)]/20 text-[var(--danger)] text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" /> Force Expire Transfer
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Force Expire Confirmation Modal */}
      {expireModalCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm p-6 rounded-2xl bg-[var(--surface-card)] border border-[var(--danger)]/30 text-[var(--text)] flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-[var(--danger)]">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <h3 className="font-bold text-sm">Confirm Moderation Action</h3>
            </div>
            <p className="text-xs text-[var(--text-3)]">
              This will immediately delete the files from R2 and mark the transfer expired. Type{' '}
              <strong className="text-[var(--danger)] font-mono">EXPIRE</strong> below to proceed.
            </p>

            <form onSubmit={handleExpireSubmit} className="flex flex-col gap-3">
              <input
                type="text"
                required
                value={expireConfirmText}
                onChange={(e) => setExpireConfirmText(e.target.value)}
                placeholder='Type "EXPIRE"'
                className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs font-mono text-[var(--text)] focus:outline-none focus:border-[var(--danger)]"
              />

              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => { setExpireModalCode(null); setExpireConfirmText('') }}
                  className="px-3 py-1.5 rounded-xl border border-[var(--border)] text-xs font-medium hover:bg-[var(--surface-hover)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={expireConfirmText !== 'EXPIRE' || expiring}
                  className="px-4 py-1.5 rounded-xl bg-[var(--danger)] text-white text-xs font-bold hover:opacity-90 disabled:opacity-40 transition-opacity"
                >
                  {expiring ? 'Expiring...' : 'Confirm Expire'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
