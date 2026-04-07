import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { ArrowLeft, Download, Search, Clock, AlertCircle, Zap } from 'lucide-react'
import { getFileMetadata } from '../services/api'
import NearbyDevices from '../components/NearbyDevices'

const CODE_LEN = 6
const VALID = /^[A-Z2-9]$/

export default function JoinPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [digits, setDigits] = useState(Array(CODE_LEN).fill(''))
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const refs = useRef([])

  useEffect(() => {
    const rawCode = searchParams.get('code') || ''
    const cleaned = rawCode.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, CODE_LEN)

    if (cleaned.length === CODE_LEN) {
      setDigits(cleaned.split(''))
    }
  }, [searchParams])

  const handleInput = (idx, val) => {
    const char = val.toUpperCase().slice(-1)
    if (char && !VALID.test(char)) return
    const next = [...digits]; next[idx] = char; setDigits(next); setError(null)
    if (char && idx < CODE_LEN-1) refs.current[idx+1]?.focus()
    if (char && idx === CODE_LEN-1) {
      const full = next.join('')
      if (full.length === CODE_LEN) submit(full)
    }
  }

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace') {
      const next = [...digits]
      if (next[idx]) { next[idx]=''; setDigits(next) }
      else if (idx>0) { next[idx-1]=''; setDigits(next); refs.current[idx-1]?.focus() }
    }
    if (e.key === 'ArrowLeft' && idx>0) refs.current[idx-1]?.focus()
    if (e.key === 'ArrowRight' && idx<CODE_LEN-1) refs.current[idx+1]?.focus()
    if (e.key === 'Enter') { const c=digits.join(''); if(c.length===CODE_LEN) submit(c) }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,CODE_LEN)
    if (!pasted.length) return
    const next = Array(CODE_LEN).fill('')
    pasted.split('').forEach((c,i)=>{ next[i]=c })
    setDigits(next)
    refs.current[Math.min(pasted.length, CODE_LEN-1)]?.focus()
    if (pasted.length === CODE_LEN) submit(pasted)
  }

  const submit = async (code) => {
    if (loading) return
    setLoading(true); setError(null)
    try {
      const data = await getFileMetadata(code)
      navigate(`/download/${code}`, { state:{ fileData:data }})
    } catch(err) {
      const status = err?.status
      const errorCode = err?.code

      if (err?.isNetworkError) {
        setError({ type: 'error', msg: 'Network error. Check your connection and try again.' })
        toast.error('Network error. Please check your connection.')
        return
      }

      if (status === 404) {
        setError({ type: 'notfound', msg: 'Transfer not found' })
      } else if (status === 410 && errorCode === 'TRANSFER_EXPIRED') {
        setError({ type: 'expired', msg: 'This transfer has expired' })
      } else if (status === 410 && errorCode === 'ALREADY_DOWNLOADED') {
        setError({ type: 'burned', msg: 'Already downloaded — this was a one-time transfer' })
      } else {
        setError({ type:'error', msg: err.message||'Something went wrong' })
      }
    } finally { setLoading(false) }
  }

  const errConfig = {
    expired:  { icon: Clock,         color: '#FBBF24', bg: 'rgba(251,191,36,0.07)',  border: 'rgba(251,191,36,0.2)' },
    burned:   { icon: AlertCircle,   color: '#F87171', bg: 'rgba(248,113,113,0.07)', border: 'rgba(248,113,113,0.2)' },
    notfound: { icon: Search,        color: '#8B90AA', bg: 'rgba(74,78,101,0.1)',    border: 'rgba(74,78,101,0.2)' },
    error:    { icon: AlertCircle,   color: '#F87171', bg: 'rgba(248,113,113,0.07)', border: 'rgba(248,113,113,0.2)' },
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background:'var(--bg)' }}>
      <div className="fixed inset-0 grid-bg opacity-100 pointer-events-none"/>
      <div className="fixed pointer-events-none" style={{
        top:'-15%', left:'-5%', width:'400px', height:'400px', borderRadius:'50%',
        background:'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 65%)', filter:'blur(40px)'
      }}/>

      <div className="relative max-w-md mx-auto w-full px-4 py-10 flex-1 flex flex-col">

        {/* Nav */}
        <motion.div
          className="flex items-center justify-between mb-12"
          initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }}
        >
          <button className="btn-ghost py-2 px-3 text-sm" onClick={()=>navigate('/')}>
            <ArrowLeft size={14}/> Back
          </button>
          <span className="font-heading text-sm" style={{ color:'var(--text)', letterSpacing:'-0.01em' }}>
            Swift<span style={{ color:'#818CF8' }}>Share</span>
          </span>
        </motion.div>

        {/* Card */}
        <motion.div
          className="card p-7 mb-5"
          initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.2)' }}>
              <Download size={20} style={{ color:'#818CF8' }}/>
            </div>
            <h1 className="font-display text-2xl mb-1.5" style={{ color:'var(--text)', letterSpacing:'-0.03em' }}>
              Enter code
            </h1>
            <p style={{ color:'var(--text-2)', fontSize:'14px' }}>
              6-digit code from the sender
            </p>
          </div>

          {/* OTP inputs */}
          <div className="flex justify-center gap-2 sm:gap-2.5 mb-6" onPaste={handlePaste}>
            {digits.map((d,i) => (
              <motion.div
                key={i}
                className={`code-char ${d?'filled':''}`}
                style={{
                  width:'clamp(40px,12vw,52px)',
                  height:'clamp(48px,14vw,64px)',
                  fontSize:'clamp(18px,5vw,26px)',
                }}
                animate={d ? { scale:[1,1.1,1] } : { scale:1 }}
                transition={{ duration:0.14, type:'spring' }}
              >
                <input
                  ref={el => refs.current[i]=el}
                  type="text" inputMode="text" maxLength={1}
                  value={d}
                  onChange={e=>handleInput(i,e.target.value)}
                  onKeyDown={e=>handleKeyDown(i,e)}
                  onFocus={e=>e.target.select()}
                  disabled={loading}
                  autoComplete="off"
                  autoFocus={i===0}
                />
              </motion.div>
            ))}
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (() => {
              const { icon: Ic, color, bg, border } = errConfig[error.type]||errConfig.error
              return (
                <motion.div
                  className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium mb-5"
                  style={{ background:bg, border:`1px solid ${border}`, color }}
                  initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                >
                  <Ic size={14}/> {error.msg}
                </motion.div>
              )
            })()}
          </AnimatePresence>

          {/* Submit */}
          <button
            className="btn-primary w-full justify-center text-base"
            onClick={()=>{ const c=digits.join(''); if(c.length===CODE_LEN) submit(c) }}
            disabled={digits.join('').length < CODE_LEN || loading}
          >
            {loading ? (
              <>
                <motion.div animate={{ rotate:360 }} transition={{ duration:1, repeat:Infinity, ease:'linear' }}>
                  <Search size={15}/>
                </motion.div>
                Looking up…
              </>
            ) : (
              <><Download size={16}/> Get File</>
            )}
          </button>

          <p className="text-center mt-4" style={{ color:'var(--text-3)', fontSize:'12px' }}>
            📷 Or scan the QR from the sender's screen
          </p>
        </motion.div>

        {/* Nearby */}
        <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.25 }}>
          <NearbyDevices/>
        </motion.div>

      </div>
    </div>
  )
}
