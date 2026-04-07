import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wifi } from 'lucide-react'
import { getNearbyDevices } from '../services/api'

export default function NearbyDevices() {
  const [devices, setDevices] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    let active = true

    const fetchDevices = async () => {
      try {
        const res = await getNearbyDevices()
        if (active) {
          setDevices(Array.isArray(res?.devices) ? res.devices : [])
        }
      } catch {
        if (active) setDevices([])
      }
    }

    fetchDevices()
    const id = setInterval(fetchDevices, 12000)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [])

  if (!devices.length) return null

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Wifi size={14} style={{ color: '#22D3EE' }} />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Nearby Devices</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {devices.slice(0, 6).map((d, i) => (
          <button
            key={`${d.code || 'device'}-${i}`}
            onClick={() => d.code && navigate(`/join?code=${d.code}`)}
            className="btn-ghost py-1.5 px-2.5 text-xs"
          >
            {(d.deviceName || 'Device')} {d.fileCount ? `(${d.fileCount})` : ''}
          </button>
        ))}
      </div>
    </div>
  )
}
