import React from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { getErrorInfo } from '../utils/errors'

export default function ErrorState({ code, title, description, action, onAction }) {
  const navigate = useNavigate()
  const info = code ? getErrorInfo(code) : null
  const Icon = info?.icon
  const displayTitle = title || info?.title || 'Error'
  const displayDesc = description || info?.description || 'Something went wrong.'
  const displayAction = action || info?.action || 'Go home'
  const color = info?.color || 'var(--danger)'

  function handleAction() {
    if (onAction) return onAction()
    navigate('/')
  }

  return (
    <motion.div
      className="text-center py-12 px-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {Icon && (
        <div
          className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
          style={{ background: `${color}12` }}
        >
          <Icon size={28} style={{ color }} />
        </div>
      )}
      <h2 className="font-display font-bold text-xl mb-2" style={{ color: 'var(--text)' }}>{displayTitle}</h2>
      <p className="text-sm max-w-xs mx-auto mb-6" style={{ color: 'var(--text-3)' }}>{displayDesc}</p>
      <button className="btn-primary mx-auto" onClick={handleAction}>
        {displayAction}
      </button>
    </motion.div>
  )
}
