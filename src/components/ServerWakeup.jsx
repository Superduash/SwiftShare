import React, { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { pingServer } from '../services/api'

export default function ServerWakeup() {
  const [checking, setChecking] = useState(false)
  const [latency, setLatency] = useState(null)

  const check = async () => {
    setChecking(true)
    const res = await pingServer()
    setLatency(res?.latencyMs ?? null)
    setChecking(false)
    if (res?.ok) {
      window.location.reload()
    }
  }

  useEffect(() => {
    const id = setInterval(check, 5000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="card p-8 max-w-md w-full text-center">
        <div className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.12)' }}>
          <RefreshCw size={20} style={{ color: '#818CF8' }} className={checking ? 'animate-spin' : ''} />
        </div>
        <h2 className="font-heading text-xl mb-2" style={{ color: 'var(--text)' }}>Waking server</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-2)' }}>The backend may take a little time on cold start.</p>
        <button className="btn-primary" onClick={check} disabled={checking}>
          {checking ? 'Checking...' : 'Check again'}
        </button>
        {latency !== null ? <p className="text-xs mt-3" style={{ color: 'var(--text-3)' }}>Last ping: {latency} ms</p> : null}
      </div>
    </div>
  )
}
