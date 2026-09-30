import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Eye, Users, UserCheck, Radio, ArrowUpRight, ArrowDownRight,
  HardDrive, Download, Zap, Flame, Lock, FileText, Bot, Clock,
  RefreshCw, TrendingUp
} from 'lucide-react'
import Sparkline from './charts/Sparkline'
import LineArea from './charts/LineArea'
import { fetchOverview, fetchTimeseries, fetchFunnel } from '../../services/adminApi'

function formatBytes(bytes = 0) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

function formatSpeed(bytesPerSec = 0) {
  if (!bytesPerSec) return '0 KB/s'
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`
}

export default function OverviewPanel({ range = '7d' }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [activeMetric, setActiveMetric] = useState('pageviews')
  const [timeseriesData, setTimeseriesData] = useState([])
  const [timeseriesLoading, setTimeseriesLoading] = useState(false)

  const [funnel, setFunnel] = useState(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [overviewResult, funnelResult] = await Promise.allSettled([
        fetchOverview(range),
        fetchFunnel(range),
      ])

      if (overviewResult.status === 'fulfilled') {
        setData(overviewResult.value)
      } else {
        setError(overviewResult.reason?.response?.data?.error || 'Failed to load overview data')
      }

      if (funnelResult.status === 'fulfilled') {
        setFunnel(funnelResult.value)
      } else {
        setFunnel({ visitors: 0, created: 0, downloaded: 0, createRate: 0, downloadRate: 0 })
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load overview data')
    } finally {
      setLoading(false)
    }
  }

  const loadTimeseries = async (metric) => {
    setTimeseriesLoading(true)
    try {
      const res = await fetchTimeseries(metric, range)
      setTimeseriesData(res?.series || [])
    } catch (err) {
      console.error('Failed to load timeseries', err)
    } finally {
      setTimeseriesLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [range])

  useEffect(() => {
    loadTimeseries(activeMetric)
  }, [activeMetric, range])

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-28 bg-[var(--surface-hover)] rounded-2xl" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-[var(--danger)] text-center">
        <p className="font-semibold text-sm">{error}</p>
        <button
          onClick={loadData}
          className="mt-3 px-4 py-1.5 bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-xs rounded-xl font-medium border border-[var(--border)] inline-flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    )
  }

  const kpis = data?.kpis || {}

  const kpiCards = [
    {
      label: 'Page Views',
      value: kpis.pageviews?.value?.toLocaleString() || '0',
      delta: kpis.pageviews?.delta,
      icon: Eye,
      metricKey: 'pageviews',
    },
    {
      label: 'Unique Visitors',
      value: kpis.visitors?.value?.toLocaleString() || '0',
      delta: kpis.visitors?.delta,
      icon: Users,
      metricKey: 'visitors',
    },
    {
      label: 'Returning Visitors',
      value: `${kpis.returningVisitorsPct?.value || 0}%`,
      icon: UserCheck,
    },
    {
      label: 'Online Now',
      value: kpis.onlineNow?.value || '0',
      icon: Radio,
      pulse: true,
    },
    {
      label: 'Total Transfers',
      value: kpis.totalTransfers?.value?.toLocaleString() || '0',
      delta: kpis.totalTransfers?.delta,
      icon: TrendingUp,
      metricKey: 'transfers',
    },
    {
      label: 'Active Transfers',
      value: kpis.activeTransfers?.value?.toLocaleString() || '0',
      icon: Clock,
    },
    {
      label: 'Files Shared',
      value: kpis.totalFiles?.value?.toLocaleString() || '0',
      delta: kpis.totalFiles?.delta,
      icon: HardDrive,
    },
    {
      label: 'Data Shared',
      value: formatBytes(kpis.dataSharedBytes?.value || 0),
      delta: kpis.dataSharedBytes?.delta,
      icon: HardDrive,
      metricKey: 'bytes',
    },
    {
      label: 'Total Downloads',
      value: kpis.totalDownloads?.value?.toLocaleString() || '0',
      delta: kpis.totalDownloads?.delta,
      icon: Download,
      metricKey: 'downloads',
    },
    {
      label: 'Download Rate',
      value: `${kpis.downloadRate?.value || 0}%`,
      icon: Download,
    },
    {
      label: 'Avg Speed',
      value: formatSpeed(kpis.avgTransferSpeed?.value || 0),
      icon: Zap,
    },
    {
      label: 'Burn Mode',
      value: `${kpis.burnModePct?.value || 0}%`,
      icon: Flame,
    },
    {
      label: 'Password Protected',
      value: `${kpis.passwordProtectedPct?.value || 0}%`,
      icon: Lock,
    },
    {
      label: 'Text Snippets',
      value: `${kpis.textSnippetPct?.value || 0}%`,
      icon: FileText,
    },
    {
      label: 'Crawler Hits',
      value: kpis.crawlerHits?.value?.toLocaleString() || '0',
      icon: Bot,
      metricKey: 'crawlerHits',
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Tracking Since Banner */}
      <div className="p-3.5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[var(--text-3)]">
        <div>
          <span className="font-semibold text-[var(--text-2)]">Tracking Status: </span>
          {data?.trackingSince ? (
            <span>
              PageView analytics recording since{' '}
              <strong className="text-[var(--text)]">
                {new Date(data.trackingSince).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </strong>
              . Transfer metrics reflect all-time historical data.
            </span>
          ) : (
            <span>No pageviews recorded yet. Transfer database is online.</span>
          )}
        </div>
        <div className="text-[11px] font-mono opacity-80">
          Last refreshed: {new Date(data?.dataThrough || Date.now()).toLocaleTimeString()}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {kpiCards.map((card, idx) => {
          const Icon = card.icon
          const isSelected = card.metricKey && activeMetric === card.metricKey

          return (
            <div
              key={idx}
              onClick={() => card.metricKey && setActiveMetric(card.metricKey)}
              className={`p-4 rounded-2xl bg-[var(--surface-card)] border transition-all duration-200 flex flex-col justify-between ${
                card.metricKey ? 'cursor-pointer hover:border-[var(--accent)]/50' : ''
              } ${
                isSelected
                  ? 'border-[var(--accent)] ring-1 ring-[var(--accent)] shadow-lg shadow-[var(--accent)]/10'
                  : 'border-[var(--border)]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[var(--text-3)] truncate">
                  {card.label}
                </span>
                <div className="relative">
                  <Icon className="w-4 h-4 text-[var(--text-3)]" />
                  {card.pulse && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--success)] animate-ping" />
                  )}
                </div>
              </div>

              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-bold font-mono tracking-tight text-[var(--text)]">
                  {card.value}
                </span>

                {typeof card.delta === 'number' && card.delta !== 0 && (
                  <span
                    className={`text-[11px] font-mono font-semibold flex items-center ${
                      card.delta > 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                    }`}
                  >
                    {card.delta > 0 ? (
                      <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                    ) : (
                      <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                    )}
                    {Math.abs(card.delta)}%
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Interactive Main Timeseries Chart */}
      <div className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border)] flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)]/50 pb-3">
          <div>
            <h2 className="text-sm font-bold text-[var(--text)] capitalize">
              {activeMetric} Over Time
            </h2>
            <p className="text-xs text-[var(--text-3)]">
              Activity bucketed by {range === '24h' ? 'hour' : 'day'} in Asia/Kolkata timezone
            </p>
          </div>

          {/* Metric Selector Tabs */}
          <div className="flex flex-wrap gap-1 bg-[var(--surface)] p-1 rounded-xl border border-[var(--border)]">
            {[
              { id: 'pageviews', label: 'Views' },
              { id: 'visitors', label: 'Visitors' },
              { id: 'transfers', label: 'Transfers' },
              { id: 'downloads', label: 'Downloads' },
              { id: 'bytes', label: 'Data' },
              { id: 'crawlerHits', label: 'Bots' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setActiveMetric(m.id)}
                className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
                  activeMetric === m.id
                    ? 'bg-[var(--accent)] text-white font-semibold shadow-sm'
                    : 'text-[var(--text-3)] hover:text-[var(--text)]'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {timeseriesLoading ? (
          <div className="h-[260px] flex items-center justify-center text-xs text-[var(--text-3)]">
            Loading chart data...
          </div>
        ) : (
          <LineArea
            data={timeseriesData}
            height={260}
            formatValue={(v) =>
              activeMetric === 'bytes' ? formatBytes(v) : v.toLocaleString()
            }
          />
        )}
      </div>

      {/* Conversion Funnel Card */}
      {funnel && (
        <div className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border)] flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-bold text-[var(--text)]">Conversion Funnel</h2>
            <p className="text-xs text-[var(--text-3)]">
              Visitor to transfer creation to download fulfillment rate
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex flex-col gap-1">
              <span className="text-xs text-[var(--text-3)]">1. Visitors</span>
              <span className="text-xl font-bold font-mono text-[var(--text)]">
                {funnel.visitors?.toLocaleString()}
              </span>
              <span className="text-[11px] text-[var(--text-3)]">100% Top of Funnel</span>
            </div>

            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex flex-col gap-1">
              <span className="text-xs text-[var(--text-3)]">2. Transfers Created</span>
              <span className="text-xl font-bold font-mono text-[var(--text)]">
                {funnel.created?.toLocaleString()}
              </span>
              <span className="text-[11px] text-[var(--accent)] font-semibold">
                {funnel.createRate}% Creation Rate
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex flex-col gap-1">
              <span className="text-xs text-[var(--text-3)]">3. Downloaded</span>
              <span className="text-xl font-bold font-mono text-[var(--text)]">
                {funnel.downloaded?.toLocaleString()}
              </span>
              <span className="text-[11px] text-[var(--success)] font-semibold">
                {funnel.downloadRate}% Fulfillment Rate
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
