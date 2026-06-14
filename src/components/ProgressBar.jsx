import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

export default function ProgressBar({ percent = 0, speed = 0, label = 'Uploading...', showSpeed = true, indeterminate = false }) {
  const speedMB = (speed / (1024 * 1024)).toFixed(1);
  const clampedPercent = Math.max(0, Math.min(100, percent));
  
  // Convert percentage to 0.0 - 1.0 scale for GPU transforms
  const scaleX = clampedPercent / 100;
  
  const [liveText, setLiveText] = useState('');
  const announced = useRef(new Set());

  useEffect(() => {
    if (indeterminate) return;
    const milestones = [25, 50, 75, 100];
    for (const m of milestones) {
      if (clampedPercent >= m && !announced.current.has(m)) {
        announced.current.add(m);
        setLiveText(m === 100 ? `${label} complete` : `${label} ${m}% complete`);
      }
    }
  }, [clampedPercent, label, indeterminate]);

  return (
    <div className="w-full">
      <span className="sr-only" aria-live="polite" aria-atomic="true">{liveText}</span>
      <div className="flex justify-between items-end mb-2">
        <span className="text-sm font-medium tracking-wide" style={{ color: 'var(--text)' }}>
          {label}
        </span>
        <div className="text-right">
          {!indeterminate && (
            <motion.span className="text-sm font-bold tabular-nums" style={{ color: 'var(--text)' }}>
              {Math.round(clampedPercent)}%
            </motion.span>
          )}
          {showSpeed && speed > 0 && !indeterminate && (
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs ml-2 tabular-nums" 
              style={{ color: 'var(--text-3)' }}
            >
              ({speedMB} MB/s)
            </motion.span>
          )}
        </div>
      </div>
      
      {/* Container with overflow-hidden to cleanly clip the scaling bar */}
      <div 
        className="h-2 w-full rounded-full relative overflow-hidden"
        style={{ background: 'var(--border)', transform: 'translateZ(0)' }}
      >
        {/* Main Progress Fill - GPU Accelerated */}
        {indeterminate ? (
          <motion.div
            className="absolute top-0 bottom-0 rounded-full"
            style={{ 
              background: 'var(--progress-fill, var(--accent))',
              width: '40%',
              willChange: 'transform'
            }}
            animate={{ 
              x: ['-100%', '250%'] 
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 1.2, 
              ease: 'easeInOut' 
            }}
          />
        ) : (
          <motion.div
            className="absolute top-0 left-0 bottom-0 origin-left rounded-full"
            style={{ 
              background: 'var(--progress-fill, var(--accent))',
              width: '100%',
              willChange: 'transform'
            }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX }}
            transition={{ 
              type: 'tween',
              ease: 'easeOut',
              duration: 0.3
            }}
          />
        )}
        
        {/* Continuous Active Shimmer Effect */}
        <motion.div
          className="absolute top-0 bottom-0 left-0 origin-left pointer-events-none mix-blend-overlay"
          style={{
            width: '100%',
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
          }}
          animate={{ x: ['-100%', '100%'] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
        />
      </div>
    </div>
  );
}
