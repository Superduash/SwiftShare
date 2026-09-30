import React, { useState, useEffect } from 'react'
import {
  fetchTrafficPages, fetchTrafficSources, fetchTrafficCountries,
  fetchTrafficDevices, fetchTrafficHours, fetchTrafficCrawlers
} from '../../services/adminApi'
import Bars from './charts/Bars'
import Donut from './charts/Donut'
import Heatmap from './charts/Heatmap'

function getCountryFlag(isoCode = '') {
  if (!isoCode || isoCode.length !== 2) return '🌐'
  const codePoints = isoCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}

function getCountryName(isoCode = '') {
  if (!isoCode) return 'Unknown'
  try {
    const regionNames = new Intl.DisplayNames(['en'], { type: 'region' })
    return regionNames.of(isoCode.toUpperCase()) || isoCode
  } catch {
    return isoCode
  }
}

export default function TrafficPanel({ range = '7d' }) {
  const [pages, setPages] = useState([])
  const [sources, setSources] = useState(null)
  const [countries, setCountries] = useState([])
  const [devices, setDevices] = useState(null)
  const [heatmap, setHeatmap] = useState([])
  const [crawlers, setCrawlers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)

    Promise.all([
      fetchTrafficPages(range),
      fetchTrafficSources(range),
      fetchTrafficCountries(range),
      fetchTrafficDevices(range),
      fetchTrafficHours(range),
      fetchTrafficCrawlers(range),
    ])
      .then(([p, s, c, d, h, cr]) => {
        if (!active) return
        setPages(p || [])
        setSources(s || null)
        setCountries(c || [])
        setDevices(d || null)
        setHeatmap(h?.grid || [])
        setCrawlers(cr || [])
      })
      .catch((err) => console.error('Traffic panel load error', err))
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [range])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-64 bg-[var(--surface-hover)] rounded-2xl" />
        ))}
      </div>
    )
  }

  const sourceDonutData = sources?.categories
    ? [
        { label: 'Direct', value: sources.categories.direct || 0, color: 'var(--accent)' },
        { label: 'Search', value: sources.categories.search || 0, color: '#3B82F6' },
        { label: 'Social', value: sources.categories.social || 0, color: '#10B981' },
        { label: 'Other', value: sources.categories.other || 0, color: '#8B5CF6' },
      ].filter((d) => d.value > 0)
    : []

  return (
    <div className="flex flex-col gap-6">
      {/* Top Row: Pages & Traffic Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <div className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border)] flex flex-col gap-3">
          <h2 className="text-sm font-bold text-[var(--text)]">Top Pages</h2>
          <p className="text-xs text-[var(--text-3)] mb-2">
            Normalized route patterns visited by real users
          </p>

          {pages.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--text-3)]">
              No pageviews recorded yet for this range
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[300px]">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--text-3)]">
                    <th className="py-2 px-2 font-medium">Route</th>
                    <th className="py-2 px-2 font-medium text-right">Views</th>
                    <th className="py-2 px-2 font-medium text-right">Visitors</th>
                  </tr>
                </thead>
                <tbody>
                  {pages.map((p, i) => (
                    <tr
                      key={i}
                      className="border-b border-[var(--border)]/30 hover:bg-[var(--surface-hover)] transition-colors"
                    >
                      <td className="py-2 px-2 font-mono text-[var(--text)] font-medium">
                        {p.route}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-[var(--text-2)] font-semibold">
                        {p.views?.toLocaleString()}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-[var(--accent)] font-semibold">
                        {p.visitors?.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Traffic Sources */}
        <div className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border)] flex flex-col gap-3">
          <h2 className="text-sm font-bold text-[var(--text)]">Referrer Sources</h2>
          <p className="text-xs text-[var(--text-3)] mb-2">
            Traffic origin channels (Direct, Search, Social, Campaigns)
          </p>

          <Donut data={sourceDonutData} size={160} strokeWidth={20} />

          {sources?.utmCampaigns && sources.utmCampaigns.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[var(--border)]">
              <span className="text-xs font-bold text-[var(--text-2)]">Active UTM Campaigns</span>
              <div className="flex flex-col gap-1.5 mt-2">
                {sources.utmCampaigns.map((utm, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center text-xs p-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)]"
                  >
                    <span className="font-mono text-[var(--text)] truncate">
                      {utm.campaign || utm.source || 'unnamed'}
                    </span>
                    <span className="font-mono text-[var(--text-3)] font-semibold">
                      {utm.views} views
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Middle Row: Countries & Devices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Countries */}
        <div className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border)] flex flex-col gap-3">
          <h2 className="text-sm font-bold text-[var(--text)]">Visitor Countries</h2>
          <p className="text-xs text-[var(--text-3)] mb-2">
            Geographic distribution derived from Edge headers
          </p>

          {countries.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--text-3)]">
              No country data recorded yet
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto pr-1">
              {countries.map((c, i) => (
                <div key={i} className="flex flex-col gap-1 text-xs">
                  <div className="flex justify-between items-center text-[var(--text-2)]">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span>{getCountryFlag(c.code)}</span>
                      <span>{getCountryName(c.code)}</span>
                      <span className="text-[10px] text-[var(--text-3)] font-mono">({c.code})</span>
                    </span>
                    <span className="font-mono text-[var(--text)] font-semibold">
                      {c.visitors?.toLocaleString()} visitors
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[var(--surface-hover)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--accent)] rounded-full"
                      style={{
                        width: `${Math.max(
                          4,
                          Math.round((c.visitors / (countries[0]?.visitors || 1)) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Devices, Browsers & OS */}
        <div className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border)] flex flex-col gap-4">
          <h2 className="text-sm font-bold text-[var(--text)]">Client Environment</h2>
          <p className="text-xs text-[var(--text-3)]">
            Device, browser, and operating system distributions
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-[var(--text-2)]">Devices</span>
              <Bars data={devices?.devices || []} labelKey="_id" valueKey="count" maxHeight={150} />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-[var(--text-2)]">Browsers</span>
              <Bars data={devices?.browsers || []} labelKey="_id" valueKey="count" maxHeight={150} />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-[var(--text-2)]">OS</span>
              <Bars data={devices?.os || []} labelKey="_id" valueKey="count" maxHeight={150} />
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap: 7x24 Peak Hours */}
      <div className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border)] flex flex-col gap-3">
        <h2 className="text-sm font-bold text-[var(--text)]">Peak Hours Heatmap (7 × 24)</h2>
        <p className="text-xs text-[var(--text-3)] mb-2">
          Weekly traffic concentration by day and hour in Asia/Kolkata timezone
        </p>
        <Heatmap grid={heatmap} timezone="Asia/Kolkata" />
      </div>

      {/* Crawler & Bot Activity */}
      <div className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border)] flex flex-col gap-3">
        <h2 className="text-sm font-bold text-[var(--text)]">Search Crawlers & Bots</h2>
        <p className="text-xs text-[var(--text-3)] mb-2">
          SEO and indexer activity (Googlebot, Bingbot, DuckDuckBot, etc.)
        </p>

        {crawlers.length === 0 ? (
          <div className="py-8 text-center text-xs text-[var(--text-3)]">
            No crawler hits recorded in this time window
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {crawlers.map((cr, i) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-semibold text-[var(--text)]">{cr.bot || 'Bot'}</div>
                  <div className="text-[10px] text-[var(--text-3)] mt-0.5">
                    Last seen:{' '}
                    {cr.lastSeen
                      ? new Date(cr.lastSeen).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Never'}
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-[var(--accent)] px-2.5 py-1 rounded-md bg-[var(--surface-hover)]">
                  {cr.hits?.toLocaleString()} hits
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
