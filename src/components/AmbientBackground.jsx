import { useMemo, memo, useState, useEffect, useRef, useCallback } from 'react'
import { useTheme } from '../context/ThemeContext'
import { getSettings } from '../utils/storage'

function makeRand(seed) {
  let s = seed >>> 0
  return () => { s = Math.imul(s, 1664525) + 1013904223 >>> 0; return s / 0xffffffff }
}

// Adaptive particle density based on device capability
function getParticleDensity() {
  const isLowEnd = navigator.hardwareConcurrency <= 4 ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  const isHighRefresh = window.screen?.availWidth > 1920 || window.devicePixelRatio > 2

  if (isLowEnd) return 0.6
  if (isHighRefresh) return 1.2
  return 1.0
}

/* ═══════════════════════════════════════════════════════════════
   PARTICLE HOOK — Uses Web Animations API instead of CSS @keyframes
   
   WHY: CSS @keyframes with var() custom properties (--max-opacity, 
   --drift, --rise, etc.) don't work in Firefox. The Web Animations 
   API works identically in Chrome, Firefox, Edge, and Safari.
   ═══════════════════════════════════════════════════════════════ */

function useParticleAnimation(ref, keyframes, options) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const anim = el.animate(keyframes, options)
    return () => anim.cancel()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}

/* ── Single Petal (Web Animations API) ── */
const Petal = memo(function Petal({ p }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const anim = el.animate([
      { transform: 'translate3d(0, -40px, 0) rotate(0deg)', opacity: 0 },
      { transform: 'translate3d(0, -20px, 0) rotate(15deg)', opacity: p.opacity, offset: 0.08 },
      { transform: `translate3d(${p.drift * 0.5}px, 50vh, 0) rotate(360deg)`, opacity: p.opacity, offset: 0.5 },
      { transform: `translate3d(${p.drift}px, 95vh, 0) rotate(650deg)`, opacity: p.opacity, offset: 0.85 },
      { transform: `translate3d(${p.drift}px, 110vh, 0) rotate(720deg)`, opacity: 0 },
    ], {
      duration: p.dur * 1000,
      delay: p.delay * 1000,
      iterations: Infinity,
      easing: 'linear',
    })
    return () => anim.cancel()
  }, [p])
  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        left: p.left,
        top: '-30px',
        width: `${p.size}px`,
        height: `${p.size}px`,
        borderRadius: p.shape < 2 ? '0 100% 0 100%' : p.shape < 4 ? '100% 0 100% 0' : '50% 50% 50% 0',
        background: p.color,
        willChange: 'transform, opacity',
      }}
    />
  )
})

/* ── SAKURA — Falling petals ── */
const SakuraScene = memo(function SakuraScene() {
  const density = getParticleDensity()
  const petals = useMemo(() => {
    const r = makeRand(42)
    const count = Math.floor(20 * density)
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${r() * 110 - 5}%`,
      size: r() * 6 + 6,
      dur: r() * 8 + 6,
      delay: -(r() * 20),
      drift: (r() - 0.5) * 180,
      opacity: 0.55 + r() * 0.35,
      color: i % 4 === 0 ? 'rgba(244,114,182,0.75)' : i % 4 === 1 ? 'rgba(236,72,153,0.65)' : i % 4 === 2 ? 'rgba(249,168,212,0.60)' : 'rgba(253,164,175,0.70)',
      shape: i % 5,
    }))
  }, [density])
  return (
    <>
      <div style={{ position: 'absolute', right: '-10%', top: '-10%', width: '55vw', height: '45vw', borderRadius: '50%', filter: 'blur(90px)', background: 'radial-gradient(ellipse,rgba(236,72,153,0.12) 0%,rgba(244,114,182,0.06) 50%,transparent 70%)', animation: 'ss-float-slow 30s -5s ease-in-out infinite alternate' }} />
      <div style={{ position: 'absolute', left: '-5%', bottom: '10%', width: '40vw', height: '32vw', borderRadius: '50%', filter: 'blur(70px)', background: 'radial-gradient(ellipse,rgba(192,132,252,0.10) 0%,transparent 70%)', animation: 'ss-float-slow 26s -12s ease-in-out infinite alternate-reverse' }} />
      {petals.map(p => <Petal key={p.id} p={p} />)}
    </>
  )
})

/* ── Single Star (Web Animations API) ── */
const Star = memo(function Star({ s }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const anim = el.animate([
      { opacity: s.opacity * 0.15, transform: 'translate3d(0,0,0) scale(0.85)' },
      { opacity: s.opacity, transform: 'translate3d(0,0,0) scale(1.15)' },
    ], {
      duration: s.dur * 1000,
      delay: s.delay * 1000,
      iterations: Infinity,
      direction: 'alternate',
      easing: 'ease-in-out',
    })
    return () => anim.cancel()
  }, [s])
  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        left: s.left,
        top: s.top,
        width: `${s.size}px`,
        height: `${s.size}px`,
        borderRadius: '50%',
        background: s.color,
        boxShadow: `0 0 ${s.size * 2.5}px ${s.color}`,
        willChange: 'transform, opacity',
      }}
    />
  )
})

/* ── MIDNIGHT: Deep space with twinkling stars ── */
const MidnightScene = memo(function MidnightScene() {
  const density = getParticleDensity()
  const stars = useMemo(() => {
    const r = makeRand(7)
    const count = Math.floor(80 * density)
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${r() * 100}%`,
      top: `${r() * 90}%`,
      size: r() * 2 + 1,
      opacity: 0.2 + r() * 0.75,
      dur: r() * 5 + 3,
      delay: -(r() * 8),
      color: i % 5 === 0 ? 'rgba(160,210,255,0.95)' : i % 5 === 1 ? 'rgba(255,255,255,0.88)' : i % 5 === 2 ? 'rgba(120,180,255,0.90)' : i % 5 === 3 ? 'rgba(100,160,250,0.88)' : 'rgba(210,235,255,0.82)',
    }))
  }, [density])
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 40% at 20% 30%,rgba(15,30,80,0.22) 0%,transparent 60%)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 50% 35% at 80% 70%,rgba(8,15,50,0.20) 0%,transparent 55%)' }} />
      <div style={{ position: 'absolute', left: '60%', top: '15%', width: '20vw', height: '8vw', borderRadius: '50%', filter: 'blur(40px)', background: 'radial-gradient(ellipse,rgba(40,80,180,0.14) 0%,rgba(20,40,100,0.06) 50%,transparent 70%)', transform: 'rotate(-25deg)', animation: 'ss-float-slow 50s -20s ease-in-out infinite alternate' }} />
      <div style={{ position: 'absolute', left: '10%', bottom: '-15%', width: '70vw', height: '30vw', borderRadius: '50%', filter: 'blur(100px)', background: 'radial-gradient(ellipse,rgba(15,40,100,0.18) 0%,transparent 70%)', animation: 'ss-float-slow 46s -10s ease-in-out infinite alternate' }} />
      {stars.map(s => <Star key={s.id} s={s} />)}
    </>
  )
})

/* ── Single Lavender Petal (reuses Petal logic with different shapes) ── */
const LavenderPetal = memo(function LavenderPetal({ p }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const anim = el.animate([
      { transform: 'translate3d(0, -40px, 0) rotate(0deg)', opacity: 0 },
      { transform: 'translate3d(0, -20px, 0) rotate(20deg)', opacity: p.opacity, offset: 0.08 },
      { transform: `translate3d(${p.drift * 0.5}px, 50vh, 0) rotate(340deg)`, opacity: p.opacity, offset: 0.5 },
      { transform: `translate3d(${p.drift}px, 95vh, 0) rotate(620deg)`, opacity: p.opacity, offset: 0.85 },
      { transform: `translate3d(${p.drift}px, 110vh, 0) rotate(720deg)`, opacity: 0 },
    ], {
      duration: p.dur * 1000,
      delay: p.delay * 1000,
      iterations: Infinity,
      easing: 'linear',
    })
    return () => anim.cancel()
  }, [p])
  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        left: p.left,
        top: '-30px',
        width: `${p.size}px`,
        height: `${p.size}px`,
        borderRadius: p.shape === 0 ? '0 100% 0 100%' : p.shape === 1 ? '100% 0 100% 0' : '60% 40% 60% 40%',
        background: p.color,
        willChange: 'transform, opacity',
      }}
    />
  )
})

/* ── LAVENDER — Falling violet petals ── */
const LavenderScene = memo(function LavenderScene() {
  const density = getParticleDensity()
  const petals = useMemo(() => {
    const r = makeRand(33)
    const count = Math.floor(20 * density)
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${r() * 110 - 5}%`,
      size: r() * 7 + 6,
      dur: r() * 10 + 8,
      delay: -(r() * 22),
      drift: (r() - 0.5) * 150,
      opacity: 0.5 + r() * 0.40,
      color: i % 4 === 0 ? 'rgba(167,139,250,0.78)' : i % 4 === 1 ? 'rgba(196,165,253,0.68)' : i % 4 === 2 ? 'rgba(216,180,254,0.65)' : 'rgba(139,92,246,0.75)',
      shape: i % 3,
    }))
  }, [density])
  return (
    <>
      <div style={{ position: 'absolute', right: '-8%', top: '-8%', width: '55vw', height: '45vw', borderRadius: '50%', filter: 'blur(90px)', background: 'radial-gradient(ellipse,rgba(139,92,246,0.14) 0%,rgba(167,139,250,0.07) 50%,transparent 70%)', animation: 'ss-float-slow 32s -5s ease-in-out infinite alternate' }} />
      <div style={{ position: 'absolute', left: '-5%', bottom: '15%', width: '42vw', height: '34vw', borderRadius: '50%', filter: 'blur(80px)', background: 'radial-gradient(ellipse,rgba(167,139,250,0.12) 0%,transparent 70%)', animation: 'ss-float-slow 28s -14s ease-in-out infinite alternate-reverse' }} />
      {petals.map(p => <LavenderPetal key={p.id} p={p} />)}
    </>
  )
})

/* ── Single Firefly (Web Animations API) ── */
const Firefly = memo(function Firefly({ f }) {
  const wrapperRef = useRef(null)
  const glowRef = useRef(null)
  useEffect(() => {
    const wrapper = wrapperRef.current
    const glow = glowRef.current
    if (!wrapper || !glow) return
    // Movement animation (drift)
    const moveAnim = wrapper.animate([
      { transform: 'translate3d(0, 0, 0) scale(1)' },
      { transform: `translate3d(${f.tx}px, ${f.ty}px, 0) scale(1.15)` },
    ], {
      duration: f.moveDur * 1000,
      delay: f.moveDelay * 1000,
      iterations: Infinity,
      direction: 'alternate',
      easing: 'ease-in-out',
    })
    // Blink animation
    const blinkAnim = glow.animate([
      { opacity: 0.05, transform: 'translate3d(0,0,0) scale(0.6)' },
      { opacity: 0.9, transform: 'translate3d(0,0,0) scale(1.2)', offset: 0.3 },
      { opacity: 0.3, transform: 'translate3d(0,0,0) scale(0.9)', offset: 0.6 },
      { opacity: 0.9, transform: 'translate3d(0,0,0) scale(1.1)', offset: 0.8 },
      { opacity: 0.05, transform: 'translate3d(0,0,0) scale(0.6)' },
    ], {
      duration: f.dur * 1000,
      delay: f.delay * 1000,
      iterations: Infinity,
      easing: 'ease-in-out',
    })
    return () => { moveAnim.cancel(); blinkAnim.cancel() }
  }, [f])
  return (
    <div
      ref={wrapperRef}
      style={{
        position: 'absolute',
        left: f.left,
        top: f.top,
        willChange: 'transform',
      }}
    >
      <div
        ref={glowRef}
        style={{
          width: `${f.size}px`,
          height: `${f.size}px`,
          borderRadius: '50%',
          background: f.color,
          boxShadow: `0 0 ${f.size * 5.5}px ${f.color},0 0 ${f.size * 11}px ${f.color.replace(/0\.\d+\)/, '0.35)')}`,
          willChange: 'transform, opacity',
        }}
      />
    </div>
  )
})

/* ── Single Mist Cloud (Web Animations API) ── */
const MistCloud = memo(function MistCloud({ m }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const anim = el.animate([
      { transform: 'translate3d(0, 0, 0) scaleY(1)', opacity: 0.4 },
      { transform: `translate3d(${m.tx}px, 0, 0) scaleY(1.3)`, opacity: 1 },
    ], {
      duration: m.dur * 1000,
      delay: m.delay * 1000,
      iterations: Infinity,
      direction: 'alternate',
      easing: 'ease-in-out',
    })
    return () => anim.cancel()
  }, [m])
  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        left: m.left,
        bottom: m.bottom,
        width: `${m.w}px`,
        height: `${m.h}px`,
        borderRadius: '50%',
        filter: 'blur(45px)',
        background: `radial-gradient(ellipse,rgba(0,216,124,${m.opacity * 2.2}) 0%,rgba(52,211,153,${m.opacity}) 40%,transparent 70%)`,
        willChange: 'transform, opacity',
      }}
    />
  )
})

/* ── FOREST: Full-screen fireflies ── */
const ForestScene = memo(function ForestScene() {
  const density = getParticleDensity()
  const fireflies = useMemo(() => {
    const r = makeRand(66)
    const count = Math.floor(32 * density)
    return Array.from({ length: count }, (_, i) => {
      let leftPos
      if (i < 12) leftPos = 3 + r() * 94
      else if (i < 24) leftPos = 40 + r() * 58
      else leftPos = 60 + r() * 38
      return {
        id: i,
        left: `${leftPos}%`,
        top: `${5 + r() * 85}%`,
        size: r() * 3 + 2.5,
        dur: r() * 6 + 4,
        delay: -(r() * 10),
        moveDur: r() * 12 + 8,
        moveDelay: -(r() * 15),
        tx: (r() - 0.5) * 120,
        ty: (r() - 0.5) * 100,
        color: i % 3 === 0 ? 'rgba(52,211,153,0.95)' : i % 3 === 1 ? 'rgba(110,231,183,0.85)' : 'rgba(134,239,172,0.90)',
      }
    })
  }, [density])
  const mist = useMemo(() => {
    const r = makeRand(88)
    return Array.from({ length: 6 }, (_, i) => ({
      id: i,
      left: `${-10 + r() * 100}%`,
      bottom: `${r() * 30}%`,
      w: 220 + r() * 320,
      h: 90 + r() * 140,
      opacity: 0.05 + r() * 0.08,
      dur: r() * 20 + 24,
      delay: -(r() * 30),
      tx: (r() - 0.5) * 120,
    }))
  }, [])
  return (
    <>
      {mist.map(m => <MistCloud key={m.id} m={m} />)}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '35%', filter: 'blur(60px)', background: 'linear-gradient(180deg,rgba(0,216,124,0.09) 0%,transparent 100%)', animation: 'ss-float-slow 32s ease-in-out infinite alternate' }} />
      {fireflies.map(f => <Firefly key={f.id} f={f} />)}
    </>
  )
})

/* ── Single Ember (Web Animations API) ── */
const Ember = memo(function Ember({ e }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const anim = el.animate([
      { transform: 'translate3d(0, 0, 0) scale(1)', opacity: 0 },
      { opacity: e.opacity, offset: 0.12 },
      { opacity: e.opacity * 0.6, offset: 0.75 },
      { transform: `translate3d(${e.drift}px, ${e.rise}vh, 0) scale(0.15)`, opacity: 0 },
    ], {
      duration: e.dur * 1000,
      delay: e.delay * 1000,
      iterations: Infinity,
      easing: 'ease-out',
    })
    return () => anim.cancel()
  }, [e])
  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        left: e.left,
        bottom: e.bottom,
        width: `${e.size}px`,
        height: `${e.size}px`,
        borderRadius: '50%',
        background: `radial-gradient(circle,${e.core} 0%,${e.outer} 50%,transparent 100%)`,
        boxShadow: `0 0 ${e.size * 4.5}px ${e.core},0 0 ${e.size * 9}px ${e.outer},0 0 ${e.size * 16}px rgba(190,0,0,0.28)`,
        willChange: 'transform, opacity',
      }}
    />
  )
})

/* ── VOLCANIC: Magma with rising embers ── */
const VolcanicScene = memo(function VolcanicScene() {
  const density = getParticleDensity()
  const embers = useMemo(() => {
    const r = makeRand(77)
    const count = Math.floor(38 * density)
    return Array.from({ length: count }, (_, i) => {
      const isLarge = i < 8
      return {
        id: i,
        left: `${2 + r() * 96}%`,
        bottom: `${r() * (isLarge ? 12 : 24)}%`,
        size: isLarge ? (r() * 6 + 5) : (r() * 4 + 2),
        dur: isLarge ? (r() * 6 + 7.5) : (r() * 7 + 4.5),
        delay: -(r() * 14),
        drift: (r() - 0.5) * (isLarge ? 70 : 110),
        rise: -(isLarge ? (r() * 40 + 35) : (r() * 60 + 58)),
        opacity: isLarge ? (0.75 + r() * 0.22) : (0.55 + r() * 0.38),
        core: i % 4 === 0 ? '#FF2222' : i % 4 === 1 ? '#DD0000' : i % 4 === 2 ? '#FF5020' : '#EE3535',
        outer: i % 4 === 0 ? 'rgba(230,0,0,0.65)' : i % 4 === 1 ? 'rgba(190,0,0,0.60)' : i % 4 === 2 ? 'rgba(255,70,0,0.55)' : 'rgba(210,30,30,0.60)',
      }
    })
  }, [density])
  return (
    <>
      {/* Primary magma pool */}
      <div style={{ position: 'absolute', left: '-8%', bottom: '-20%', right: '-8%', height: '60%', filter: 'blur(80px)', background: 'radial-gradient(ellipse 90% 65% at 50% 100%,rgba(210,15,0,0.40) 0%,rgba(190,0,0,0.24) 35%,rgba(130,0,0,0.12) 55%,transparent 72%)', animation: 'ss-lava-pulse 7s ease-in-out infinite alternate' }} />
      {/* Secondary magma */}
      <div style={{ position: 'absolute', left: '-5%', bottom: '-12%', width: '55vw', height: '35vw', borderRadius: '50%', filter: 'blur(70px)', background: 'radial-gradient(ellipse,rgba(230,25,0,0.32) 0%,rgba(190,0,0,0.17) 50%,transparent 72%)', animation: 'ss-lava-pulse 11s -3s ease-in-out infinite alternate' }} />
      {/* Tertiary magma */}
      <div style={{ position: 'absolute', right: '-5%', bottom: '-8%', width: '45vw', height: '28vw', borderRadius: '50%', filter: 'blur(65px)', background: 'radial-gradient(ellipse,rgba(210,0,0,0.28) 0%,rgba(170,15,0,0.14) 55%,transparent 72%)', animation: 'ss-lava-pulse 9s -6s ease-in-out infinite alternate-reverse' }} />
      {/* Center molten core */}
      <div style={{ position: 'absolute', left: '30%', bottom: '-6%', width: '40vw', height: '20vw', borderRadius: '50%', filter: 'blur(55px)', background: 'radial-gradient(ellipse,rgba(255,45,0,0.22) 0%,rgba(210,15,0,0.12) 55%,transparent 72%)', animation: 'ss-lava-pulse 14s -7s ease-in-out infinite alternate' }} />
      {/* Ambient red wash */}
      <div style={{ position: 'absolute', left: '20%', top: '10%', width: '60vw', height: '40vw', borderRadius: '50%', filter: 'blur(120px)', background: 'radial-gradient(ellipse,rgba(130,0,0,0.10) 0%,transparent 70%)', animation: 'ss-float-slow 40s -8s ease-in-out infinite alternate' }} />
      {/* Embers */}
      {embers.map(e => <Ember key={e.id} e={e} />)}
    </>
  )
})

/* ── Themes WITHOUT particles — just clean ambient glows ── */

/* ── DARK: Clean subtle background without particles ── */
const DarkScene = memo(function DarkScene() {
  return (
    <>
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'radial-gradient(circle, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
        animation: 'ss-grid-fade 12s ease-in-out infinite alternate',
      }} />
      <div style={{
        position: 'absolute',
        left: '20%',
        top: '20%',
        width: '60vw',
        height: '40vw',
        borderRadius: '50%',
        filter: 'blur(120px)',
        background: 'radial-gradient(ellipse, rgba(255, 255, 255, 0.03) 0%, transparent 70%)',
        animation: 'ss-float-slow 40s ease-in-out infinite alternate',
      }} />
    </>
  )
})

/* ── LIGHT — Clean, no particles ── */
const LightScene = memo(function LightScene() {
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle,rgba(0,0,0,0.03) 1px,transparent 1px)', backgroundSize: '40px 40px', opacity: 0.6 }} />
      <div style={{
        position: 'absolute',
        right: '-5%',
        top: '-10%',
        width: '50vw',
        height: '40vw',
        borderRadius: '50%',
        filter: 'blur(100px)',
        background: 'radial-gradient(ellipse, rgba(96,165,250,0.06) 0%, transparent 70%)',
        animation: 'ss-float-slow 35s ease-in-out infinite alternate',
      }} />
    </>
  )
})

/* ── SUNRISE — Clean warm ambient, no particles ── */
const SunriseScene = memo(function SunriseScene() {
  return (
    <>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(180deg, rgba(255,240,200,0.30) 0%, rgba(255,200,130,0.15) 50%, transparent 100%)',
        animation: 'ss-float-slow 20s ease-in-out infinite alternate',
      }} />
      <div style={{
        position: 'absolute',
        left: '-5%', bottom: '-10%',
        width: '50vw', height: '40vw',
        borderRadius: '50%',
        filter: 'blur(80px)',
        background: 'radial-gradient(ellipse, rgba(255,180,60,0.14) 0%, transparent 70%)',
        animation: 'ss-float-slow 26s -10s ease-in-out infinite alternate-reverse',
      }} />
    </>
  )
})

/* ── SUNSET — Clean warm dark ambient, no particles ── */
const SunsetScene = memo(function SunsetScene() {
  return (
    <>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(180deg, rgba(180,40,0,0.12) 0%, rgba(140,30,0,0.08) 40%, transparent 100%)',
        animation: 'ss-lava-pulse 12s ease-in-out infinite alternate',
      }} />
      <div style={{
        position: 'absolute',
        left: '-10%', bottom: '-18%', right: '-10%',
        height: '50%',
        filter: 'blur(80px)',
        background: 'radial-gradient(ellipse 85% 60% at 50% 100%, rgba(190,50,0,0.22) 0%, rgba(160,30,0,0.12) 40%, transparent 70%)',
        animation: 'ss-lava-pulse 9s -3s ease-in-out infinite alternate',
      }} />
    </>
  )
})

// Themes WITH animated particles: sakura, midnight, lavender, forest, volcanic
// Themes WITHOUT particles (clean ambient only): light, dark, sunrise, sunset
const SCENES = {
  sunrise: SunriseScene, sunset: SunsetScene,
  sakura: SakuraScene, midnight: MidnightScene,
  lavender: LavenderScene, forest: ForestScene,
  volcanic: VolcanicScene, dark: DarkScene, light: LightScene,
}

export default memo(function AmbientBackground({ theme: themeProp }) {
  const { theme: contextTheme } = useTheme()
  const theme = themeProp || contextTheme
  const [reducedMotion, setReducedMotion] = useState(() => getSettings().reducedMotion)

  useEffect(() => {
    const handleSettingsChange = () => {
      setReducedMotion(getSettings().reducedMotion)
    }
    window.addEventListener('swiftshare:settings-changed', handleSettingsChange)
    return () => window.removeEventListener('swiftshare:settings-changed', handleSettingsChange)
  }, [])

  if (reducedMotion) return null

  const Scene = SCENES[theme]
  if (!Scene) return null

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 0,
      }}
    >
      <Scene />
    </div>
  )
})
