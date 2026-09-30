import React, { useState, useRef } from 'react'
import { X, Copy, Download, Check, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'

function formatBytes(bytes = 0) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export default function ShareSnapshotModal({ overviewData, range = '7d', onClose }) {
  const [copied, setCopied] = useState(false)
  const cardRef = useRef(null)

  const kpis = overviewData?.kpis || {}
  const visitors = kpis.visitors?.value || 0
  const pageviews = kpis.pageviews?.value || 0
  const transfers = kpis.totalTransfers?.value || 0
  const dataShared = formatBytes(kpis.dataSharedBytes?.value || 0)
  const downloads = kpis.totalDownloads?.value || 0

  const summaryText = `🚀 SwiftShare Metrics (${range.toUpperCase()}):
• Unique Visitors: ${visitors.toLocaleString()}
• Page Views: ${pageviews.toLocaleString()}
• Transfers Created: ${transfers.toLocaleString()}
• Total Data Shared: ${dataShared}
• Files Downloaded: ${downloads.toLocaleString()}
🔒 Real verified telemetry from SwiftShare.`

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(summaryText)
      setCopied(true)
      toast.success('Summary copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy summary')
    }
  }

  const handleDownloadPng = async () => {
    if (!cardRef.current) return
    try {
      // Create SVG data URL
      const card = cardRef.current
      const width = card.offsetWidth * 2
      const height = card.offsetHeight * 2

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.scale(2, 2)

      // Draw rounded background
      ctx.fillStyle = '#0F0B08'
      ctx.fillRect(0, 0, card.offsetWidth, card.offsetHeight)

      // Gradient accent border
      ctx.strokeStyle = '#EA580C'
      ctx.lineWidth = 2
      ctx.strokeRect(1, 1, card.offsetWidth - 2, card.offsetHeight - 2)

      // Header
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 18px sans-serif'
      ctx.fillText('⚡ SwiftShare Verified Metrics', 24, 38)

      ctx.fillStyle = '#9CA3AF'
      ctx.font = '12px sans-serif'
      ctx.fillText(`Range: Last ${range.toUpperCase()} • Real Telemetry`, 24, 60)

      // Metrics Grid
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 22px monospace'
      ctx.fillText(`${visitors.toLocaleString()}`, 24, 110)
      ctx.fillStyle = '#9CA3AF'
      ctx.font = '11px sans-serif'
      ctx.fillText('Unique Visitors', 24, 128)

      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 22px monospace'
      ctx.fillText(`${transfers.toLocaleString()}`, 180, 110)
      ctx.fillStyle = '#9CA3AF'
      ctx.font = '11px sans-serif'
      ctx.fillText('Files Shared', 180, 128)

      ctx.fillStyle = '#EA580C'
      ctx.font = 'bold 22px monospace'
      ctx.fillText(`${dataShared}`, 320, 110)
      ctx.fillStyle = '#9CA3AF'
      ctx.font = '11px sans-serif'
      ctx.fillText('Data Transferred', 320, 128)

      // Footer
      ctx.fillStyle = '#6B7280'
      ctx.font = '11px sans-serif'
      ctx.fillText('swiftshare.io • Fast, ephemeral P2P and cloud sharing', 24, 175)

      const pngUrl = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = pngUrl
      a.download = `swiftshare-metrics-${range}-${Date.now()}.png`
      a.click()
      toast.success('Snapshot downloaded')
    } catch (err) {
      toast.error('Failed to export image')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg p-6 rounded-2xl bg-[var(--surface-card)] border border-[var(--border)] text-[var(--text)] flex flex-col gap-5 shadow-2xl">
        <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--accent)]" />
            <h3 className="font-bold text-sm">Promotional Metrics Snapshot</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-3)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Branded Card Preview */}
        <div
          ref={cardRef}
          className="p-6 rounded-2xl bg-[#0F0B08] border-2 border-[var(--accent)] text-white flex flex-col gap-4 shadow-xl"
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="text-base font-bold flex items-center gap-1.5">
                ⚡ SwiftShare Verified Metrics
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5">
                Range: Last {range.toUpperCase()} • Real Verified Data
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/40 font-bold">
              Verified
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 py-2 border-y border-white/10">
            <div>
              <div className="text-lg font-bold font-mono text-white">
                {visitors.toLocaleString()}
              </div>
              <div className="text-[10px] text-gray-400">Visitors</div>
            </div>
            <div>
              <div className="text-lg font-bold font-mono text-white">
                {transfers.toLocaleString()}
              </div>
              <div className="text-[10px] text-gray-400">Transfers</div>
            </div>
            <div>
              <div className="text-lg font-bold font-mono text-[var(--accent)]">
                {dataShared}
              </div>
              <div className="text-[10px] text-gray-400">Data Shared</div>
            </div>
          </div>

          <div className="text-[10px] text-gray-500 font-medium flex justify-between items-center">
            <span>swiftshare.io</span>
            <span>Fast, secure temporary file sharing</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
          <button
            onClick={handleCopyText}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-[var(--success)]" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied Summary' : 'Copy Summary Text'}
          </button>

          <button
            onClick={handleDownloadPng}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-[var(--accent)]/20"
          >
            <Download className="w-4 h-4" /> Download PNG Snapshot
          </button>
        </div>
      </div>
    </div>
  )
}
