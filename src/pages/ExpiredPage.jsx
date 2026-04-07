import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Clock, Flame, Search, ArrowRight, Zap } from 'lucide-react'

const REASONS = {
  expired: {
    icon: Clock,
    color: '#FBBF24',
    title: 'Transfer expired',
    desc: 'SwiftShare sessions auto-delete after 10 minutes to protect your privacy. Ask the sender to share again.',
  },
  burned: {
    icon: Flame,
    color: '#F87171',
    title: 'Already downloaded',
    desc: 'This was a one-time transfer. The file was downloaded and permanently deleted.',
  },
  notfound: {
    icon: Search,
    color: '#8B90AA',
    title: 'Not found',
    desc: 'This code doesn\'t exist. Double-check with the sender — codes expire after 10 minutes.',
  },
}

export default function ExpiredPage() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const reason = state?.reason || 'notfound'
  const { icon: Icon, color, title, desc } = REASONS[reason] || REASONS.notfound

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background:'var(--bg)' }}>
      <div className="fixed inset-0 grid-bg opacity-100 pointer-events-none"/>

      <motion.div
        className="relative max-w-sm w-full text-center"
        initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.45 }}
      >
        {/* Icon */}
        <motion.div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8"
          style={{ background:`${color}0D`, border:`1px solid ${color}22` }}
          animate={{ scale:[1,1.04,1] }}
          transition={{ duration:3, repeat:Infinity }}
        >
          <Icon size={36} style={{ color }}/>
        </motion.div>

        <h1 className="font-display text-3xl mb-3" style={{ color:'var(--text)', letterSpacing:'-0.03em' }}>
          {title}
        </h1>
        <p style={{ color:'var(--text-2)', fontSize:'15px', lineHeight:'1.6', marginBottom:'32px' }}>
          {desc}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button className="btn-primary justify-center" onClick={()=>navigate('/')}>
            <Zap size={15}/> Send a file <ArrowRight size={14}/>
          </button>
          <button className="btn-ghost justify-center" onClick={()=>navigate('/join')}>
            Try another code
          </button>
        </div>

        <p style={{ color:'var(--text-3)', fontSize:'11px', marginTop:'40px' }}>
          SwiftShare · Files auto-delete after 10 minutes
        </p>
      </motion.div>
    </div>
  )
}
