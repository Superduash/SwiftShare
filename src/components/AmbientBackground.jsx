import { useMemo } from 'react'
import { useTheme } from '../context/ThemeContext'

function makeRand(seed) {
  let s = seed >>> 0
  return () => { s = Math.imul(s, 1664525) + 1013904223 >>> 0; return s / 0xffffffff }
}

function usePrefersReducedMotion() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/* ── SUNSET: Warm horizon glow + gentle drifting sparks ── */
function SunsetScene() {
  const motes = useMemo(() => {
    const r = makeRand(11)
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      left: `${r() * 100}%`,
      top: `${20 + r() * 70}%`,
      size: `${1.5 + r() * 2}px`,
      dur: `${14 + r() * 16}s`,
      delay: `${-(r() * 20)}s`,
      tx: `${(r() - 0.5) * 90}px`,
      ty: `${-(10 + r() * 50)}px`,
      opacity: 0.16 + r() * 0.28,
      color: i % 3 === 0 ? 'rgba(255,178,92,0.78)' : i % 3 === 1 ? 'rgba(245,110,40,0.72)' : 'rgba(255,214,140,0.58)',
    }))
  }, [])

  return (
    <>
      <div style={{
        position: 'absolute', left: '12%', bottom: '-6%', width: '42vw', height: '30vw',
        borderRadius: '50%', filter: 'blur(70px)',
        background: 'radial-gradient(ellipse, rgba(255,138,54,0.18) 0%, rgba(255,193,99,0.08) 48%, transparent 72%)',
        animation: 'ss-float-slow 34s -6s ease-in-out infinite alternate',
        willChange: 'transform',
      }} />
      <div style={{
        position: 'absolute', right: '-8%', top: '-8%', width: '36vw', height: '26vw',
        borderRadius: '50%', filter: 'blur(80px)',
        background: 'radial-gradient(ellipse, rgba(255,188,96,0.10) 0%, rgba(231,72,32,0.05) 44%, transparent 72%)',
        animation: 'ss-float-slow 42s -16s ease-in-out infinite alternate-reverse',
        willChange: 'transform',
      }} />
      <div style={{
        position: 'absolute', left: '42%', top: '18%', width: '28vw', height: '18vw',
        borderRadius: '50%', filter: 'blur(60px)',
        background: 'radial-gradient(ellipse, rgba(255,220,150,0.08) 0%, transparent 68%)',
        animation: 'ss-float-slow 28s -10s ease-in-out infinite alternate',
        willChange: 'transform',
      }} />

      <div style={{
        position: 'absolute', left: '24%', bottom: '0%', width: '48vw', height: '22vw',
        borderRadius: '50%', filter: 'blur(90px)',
        background: 'radial-gradient(ellipse, rgba(255,120,40,0.07) 0%, transparent 72%)',
        animation: 'ss-float-slow 46s -18s ease-in-out infinite alternate',
        willChange: 'transform',
      }} />

      {/* Floating dust motes */}
      {motes.map(m => (
        <div key={m.id} style={{
          position: 'absolute', left: m.left, top: m.top,
          width: m.size, height: m.size, borderRadius: '50%',
          background: m.color,
          '--tx': m.tx, '--ty': m.ty,
          opacity: 0,
          animation: `ss-mote-rise ${m.dur} ${m.delay} ease-out infinite`,
          willChange: 'transform, opacity',
          boxShadow: `0 0 ${parseFloat(m.size) * 3}px ${m.color}`,
        }} />
      ))}
    </>
  )
}

/* ── SAKURA: Petals + pink bloom ── */
function SakuraScene() {
  const petals = useMemo(() => {
    const r = makeRand(42)
    return Array.from({ length: 22 }, (_, i) => ({
      id: i,
      left: `${r() * 110 - 5}%`,
      size: `${6 + r() * 9}px`,
      dur: `${9 + r() * 10}s`,
      delay: `${-(r() * 20)}s`,
      drift: `${(r() - 0.5) * 160}px`,
      rotStart: `${r() * 180}deg`,
      rotEnd: `${400 + r() * 520}deg`,
      opacity: 0.5 + r() * 0.4,
      color: i % 4 === 0 ? 'rgba(244,114,182,0.70)' : i % 4 === 1 ? 'rgba(236,72,153,0.60)' : i % 4 === 2 ? 'rgba(249,168,212,0.55)' : 'rgba(253,164,175,0.65)',
      shape: i % 5,
    }))
  }, [])

  return (
    <>
      <div style={{
        position: 'absolute', right: '-10%', top: '-10%', width: '55vw', height: '45vw',
        borderRadius: '50%', filter: 'blur(90px)',
        background: 'radial-gradient(ellipse, rgba(236,72,153,0.12) 0%, rgba(244,114,182,0.06) 50%, transparent 70%)',
        animation: 'ss-float-slow 30s -5s ease-in-out infinite alternate',
        willChange: 'transform',
      }} />
      <div style={{
        position: 'absolute', left: '-5%', bottom: '10%', width: '40vw', height: '32vw',
        borderRadius: '50%', filter: 'blur(70px)',
        background: 'radial-gradient(ellipse, rgba(192,132,252,0.10) 0%, rgba(236,72,153,0.06) 50%, transparent 70%)',
        animation: 'ss-float-slow 26s -12s ease-in-out infinite alternate-reverse',
        willChange: 'transform',
      }} />
      {petals.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: p.left, top: '-30px',
          width: p.size, height: p.size,
          '--drift': p.drift, '--rot-start': p.rotStart, '--rot-end': p.rotEnd,
          '--max-opacity': p.opacity, '--petal-color': p.color,
          animation: `ss-petal-fall ${p.dur} ${p.delay} linear infinite`,
          willChange: 'transform, opacity',
          borderRadius: p.shape < 2 ? '0 100% 0 100%' : p.shape < 4 ? '100% 0 100% 0' : '50% 50% 50% 0',
          background: p.color,
          transform: `rotate(${p.rotStart})`,
        }} />
      ))}
    </>
  )
}

/* ── MIDNIGHT: Deep space starfield ── */
function MidnightScene() {
  const stars = useMemo(() => {
    const r = makeRand(7)
    return Array.from({ length: 88 }, (_, i) => ({
      id: i,
      left: `${r() * 100}%`, top: `${r() * 85}%`,
      size: `${0.7 + r() * 1.8}px`,
      opacity: 0.16 + r() * 0.72,
      dur: `${2.8 + r() * 5.2}s`, delay: `${-(r() * 7)}s`,
      color: i % 5 === 0 ? 'rgba(182,220,255,0.92)' : i % 5 === 1 ? 'rgba(255,255,255,0.82)' : i % 5 === 2 ? 'rgba(122,183,255,0.86)' : i % 5 === 3 ? 'rgba(96,165,250,0.82)' : 'rgba(208,232,255,0.74)',
    }))
  }, [])

  return (
    <>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 50% 18%, rgba(30,64,175,0.08) 0%, rgba(7,12,24,0.02) 30%, transparent 62%)',
        opacity: 0.9,
      }} />
      {stars.map(s => (
        <div key={s.id} style={{
          position: 'absolute', left: s.left, top: s.top,
          width: s.size, height: s.size, borderRadius: '50%',
          background: s.color,
          boxShadow: `0 0 ${parseFloat(s.size) * 2}px ${s.color}`,
          '--max-opacity': s.opacity,
          animation: `ss-star-twinkle ${s.dur} ${s.delay} ease-in-out infinite alternate`,
          willChange: 'opacity, transform',
        }} />
      ))}
      <div style={{
        position: 'absolute', left: '14%', bottom: '-12%', width: '72vw', height: '34vw',
        borderRadius: '50%', filter: 'blur(100px)',
        background: 'radial-gradient(ellipse, rgba(20,54,130,0.18) 0%, rgba(9,14,28,0.05) 52%, transparent 74%)',
        animation: 'ss-float-slow 44s -10s ease-in-out infinite alternate',
        willChange: 'transform',
      }} />
      <div style={{
        position: 'absolute', right: '8%', top: '14%', width: '24vw', height: '18vw',
        borderRadius: '50%', filter: 'blur(80px)',
        background: 'radial-gradient(ellipse, rgba(59,130,246,0.08) 0%, transparent 70%)',
        animation: 'ss-float-slow 52s -20s ease-in-out infinite alternate-reverse',
        willChange: 'transform',
      }} />
    </>
  )
}

/* ── LAVENDER: Lavender petals falling + soft violet glow ── */
function LavenderScene() {
  const petals = useMemo(() => {
    const r = makeRand(33)
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: `${r() * 110 - 5}%`,
      size: `${5 + r() * 8}px`,
      dur: `${10 + r() * 12}s`,
      delay: `${-(r() * 22)}s`,
      drift: `${(r() - 0.5) * 140}px`,
      rotStart: `${r() * 200}deg`,
      rotEnd: `${380 + r() * 480}deg`,
      opacity: 0.45 + r() * 0.40,
      color: i % 4 === 0 ? 'rgba(167,139,250,0.75)'
           : i % 4 === 1 ? 'rgba(196,165,253,0.65)'
           : i % 4 === 2 ? 'rgba(216,180,254,0.60)'
           : 'rgba(139,92,246,0.70)',
      shape: i % 3,
    }))
  }, [])

  return (
    <>
      {/* Soft violet ambient orbs */}
      <div style={{
        position: 'absolute', right: '-8%', top: '-8%', width: '55vw', height: '45vw',
        borderRadius: '50%', filter: 'blur(90px)',
        background: 'radial-gradient(ellipse, rgba(139,92,246,0.14) 0%, rgba(167,139,250,0.07) 50%, transparent 70%)',
        animation: 'ss-float-slow 32s -5s ease-in-out infinite alternate',
        willChange: 'transform',
      }} />
      <div style={{
        position: 'absolute', left: '-5%', bottom: '15%', width: '42vw', height: '34vw',
        borderRadius: '50%', filter: 'blur(80px)',
        background: 'radial-gradient(ellipse, rgba(167,139,250,0.12) 0%, rgba(129,140,248,0.06) 50%, transparent 70%)',
        animation: 'ss-float-slow 28s -14s ease-in-out infinite alternate-reverse',
        willChange: 'transform',
      }} />
      {/* Falling lavender petals */}
      {petals.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: p.left, top: '-30px',
          width: p.size, height: p.size,
          '--drift': p.drift, '--rot-start': p.rotStart, '--rot-end': p.rotEnd,
          '--max-opacity': p.opacity,
          animation: `ss-petal-fall ${p.dur} ${p.delay} linear infinite`,
          willChange: 'transform, opacity',
          borderRadius: p.shape === 0 ? '0 100% 0 100%' : p.shape === 1 ? '100% 0 100% 0' : '60% 40% 60% 40%',
          background: p.color,
          transform: `rotate(${p.rotStart})`,
        }} />
      ))}
    </>
  )
}

/* ── FOREST: Fireflies + bioluminescent mist ── */
function ForestScene() {
  const fireflies = useMemo(() => {
    const r = makeRand(66)
    return Array.from({ length: 22 }, (_, i) => ({
      id: i,
      left: `${r() * 95}%`, top: `${20 + r() * 65}%`,
      size: `${2 + r() * 3}px`,
      dur: `${4 + r() * 6}s`, delay: `${-(r() * 10)}s`,
      moveDur: `${8 + r() * 12}s`, moveDelay: `${-(r() * 15)}s`,
      tx: `${(r() - 0.5) * 100}px`, ty: `${(r() - 0.5) * 80}px`,
      color: i % 3 === 0 ? 'rgba(52,211,153,0.9)' : i % 3 === 1 ? 'rgba(110,231,183,0.8)' : 'rgba(134,239,172,0.85)',
    }))
  }, [])

  const mist = useMemo(() => {
    const r = makeRand(88)
    return Array.from({ length: 5 }, (_, i) => ({
      id: i,
      left: `${-10 + r() * 90}%`, bottom: `${r() * 30}%`,
      w: `${200 + r() * 300}px`, h: `${80 + r() * 120}px`,
      opacity: 0.04 + r() * 0.07,
      dur: `${25 + r() * 20}s`, delay: `${-(r() * 30)}s`,
      tx: `${(r() - 0.5) * 100}px`,
    }))
  }, [])

  return (
    <>
      {mist.map(m => (
        <div key={m.id} style={{
          position: 'absolute', left: m.left, bottom: m.bottom,
          width: m.w, height: m.h, borderRadius: '50%', filter: 'blur(40px)',
          background: `radial-gradient(ellipse, rgba(0,216,124,${m.opacity * 2}) 0%, rgba(52,211,153,${m.opacity}) 40%, transparent 70%)`,
          '--tx': m.tx,
          animation: `ss-mist-drift ${m.dur} ${m.delay} ease-in-out infinite alternate`,
          willChange: 'transform, opacity',
        }} />
      ))}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '35%', filter: 'blur(60px)',
        background: 'linear-gradient(180deg, rgba(0,216,124,0.08) 0%, transparent 100%)',
        animation: 'ss-float-slow 32s ease-in-out infinite alternate',
        willChange: 'opacity',
      }} />
      {fireflies.map(f => (
        <div key={f.id} style={{
          position: 'absolute', left: f.left, top: f.top,
          '--tx': f.tx, '--ty': f.ty,
          animation: `ss-nebula-drift ${f.moveDur} ${f.moveDelay} ease-in-out infinite alternate`,
          willChange: 'transform',
        }}>
          <div style={{
            width: f.size, height: f.size, borderRadius: '50%',
            background: f.color, boxShadow: `0 0 ${parseFloat(f.size) * 5}px ${f.color}, 0 0 ${parseFloat(f.size) * 10}px ${f.color.replace('0.9', '0.4').replace('0.8', '0.3').replace('0.85', '0.35')}`,
            animation: `ss-firefly-blink ${f.dur} ${f.delay} ease-in-out infinite`,
            willChange: 'opacity',
          }} />
        </div>
      ))}
    </>
  )
}

/* ── VOLCANIC: Crimson magma embers + deep lava glow ── */
function VolcanicScene() {
  const embers = useMemo(() => {
    const r = makeRand(77)
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: `${3 + r() * 90}%`,
      bottom: `${r() * 20}%`,
      size: `${2 + r() * 5}px`,
      dur: `${5 + r() * 9}s`, delay: `${-(r() * 14)}s`,
      drift: `${(r() - 0.5) * 90}px`,
      rise: `${-(55 + r() * 60)}vh`,
      opacity: 0.60 + r() * 0.35,
      // Pure crimson/red palette — no orange, no yellow
      core: i % 3 === 0 ? '#FF1A1A' : i % 3 === 1 ? '#CC0000' : '#E83030',
      outer: i % 3 === 0 ? 'rgba(200,0,0,0.55)' : i % 3 === 1 ? 'rgba(180,0,0,0.50)' : 'rgba(220,20,20,0.50)',
    }))
  }, [])

  return (
    <>
      {/* Deep crimson lava pool at bottom */}
      <div style={{
        position: 'absolute', left: '-5%', bottom: '-15%', right: '-5%', height: '50%',
        filter: 'blur(80px)',
        background: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(180,0,0,0.28) 0%, rgba(200,20,0,0.15) 45%, transparent 70%)',
        animation: 'ss-lava-pulse 8s ease-in-out infinite alternate',
        willChange: 'opacity',
      }} />
      {/* Left lava orb — pure red */}
      <div style={{
        position: 'absolute', left: '8%', bottom: '-5%', width: '30vw', height: '25vw',
        borderRadius: '50%', filter: 'blur(65px)',
        background: 'radial-gradient(ellipse, rgba(200,0,0,0.22) 0%, rgba(160,0,0,0.10) 55%, transparent 72%)',
        animation: 'ss-float-slow 18s -6s ease-in-out infinite alternate',
        willChange: 'transform',
      }} />
      {/* Right lava orb — deep crimson */}
      <div style={{
        position: 'absolute', right: '5%', bottom: '-5%', width: '26vw', height: '20vw',
        borderRadius: '50%', filter: 'blur(60px)',
        background: 'radial-gradient(ellipse, rgba(170,0,0,0.20) 0%, rgba(200,20,0,0.08) 55%, transparent 72%)',
        animation: 'ss-float-slow 24s -12s ease-in-out infinite alternate-reverse',
        willChange: 'transform',
      }} />
      {embers.map(e => (
        <div key={e.id} style={{
          position: 'absolute', left: e.left, bottom: e.bottom,
          width: e.size, height: e.size, borderRadius: '50%',
          background: `radial-gradient(circle, ${e.core} 0%, ${e.outer} 55%, transparent 100%)`,
          boxShadow: `0 0 ${parseFloat(e.size) * 4}px ${e.core}, 0 0 ${parseFloat(e.size) * 8}px rgba(180,0,0,0.3)`,
          '--drift': e.drift, '--rise': e.rise, '--max-opacity': e.opacity,
          animation: `ss-ember-rise ${e.dur} ${e.delay} ease-out infinite`,
          willChange: 'transform, opacity',
        }} />
      ))}
    </>
  )
}

/* ── DARK: Subtle geometric grid + micro glints ── */
function DarkScene() {
  const glints = useMemo(() => {
    const r = makeRand(44)
    return Array.from({ length: 12 }, (_, i) => ({
      id: i, left: `${r() * 100}%`, top: `${r() * 100}%`,
      size: `${0.8 + r() * 1.5}px`, opacity: 0.1 + r() * 0.25,
      dur: `${4 + r() * 6}s`, delay: `${-(r() * 8)}s`,
    }))
  }, [])

  return (
    <>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
        animation: 'ss-grid-fade 12s ease-in-out infinite alternate',
        willChange: 'opacity',
      }} />
      <div style={{
        position: 'absolute', left: '20%', top: '20%', width: '60vw', height: '40vw',
        borderRadius: '50%', filter: 'blur(120px)',
        background: 'radial-gradient(ellipse, rgba(255,255,255,0.03) 0%, transparent 70%)',
        animation: 'ss-float-slow 40s ease-in-out infinite alternate',
        willChange: 'transform',
      }} />
      {glints.map(g => (
        <div key={g.id} style={{
          position: 'absolute', left: g.left, top: g.top,
          width: g.size, height: g.size, borderRadius: '50%',
          background: 'rgba(255,255,255,0.6)',
          animation: `ss-star-twinkle ${g.dur} ${g.delay} ease-in-out infinite alternate`,
          willChange: 'opacity',
        }} />
      ))}
    </>
  )
}

/* ── LIGHT: Soft floating soap bubbles + gentle rays ── */
function LightScene() {
  const bubbles = useMemo(() => {
    const r = makeRand(99)
    return Array.from({ length: 8 }, (_, i) => ({
      id: i,
      left: `${10 + r() * 80}%`, bottom: `${-5 + r() * 20}%`,
      size: `${30 + r() * 60}px`,
      dur: `${14 + r() * 12}s`, delay: `${-(r() * 18)}s`,
      opacity: 0.15 + r() * 0.15,
      color: i % 3 === 0 ? 'rgba(96,165,250,0.3)' : i % 3 === 1 ? 'rgba(167,139,250,0.25)' : 'rgba(52,211,153,0.25)',
      drift: `${(r() - 0.5) * 60}px`,
      rise: `${-(50 + r() * 40)}vh`,
    }))
  }, [])

  return (
    <>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.025) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        willChange: 'opacity',
      }} />
      {bubbles.map(b => (
        <div key={b.id} style={{
          position: 'absolute', left: b.left, bottom: b.bottom,
          width: b.size, height: b.size, borderRadius: '50%',
          border: `1.5px solid ${b.color}`,
          background: `radial-gradient(ellipse at 30% 30%, rgba(255,255,255,0.5), transparent 60%)`,
          boxShadow: `inset 0 0 ${parseFloat(b.size) * 0.3}px ${b.color}`,
          '--drift': b.drift, '--rise': b.rise, '--max-opacity': b.opacity,
          animation: `ss-bubble-float ${b.dur} ${b.delay} ease-in-out infinite`,
          willChange: 'transform, opacity',
        }} />
      ))}
    </>
  )
}

const SCENES = {
  sunset: SunsetScene,
  sakura: SakuraScene,
  midnight: MidnightScene,
  lavender: LavenderScene,
  forest: ForestScene,
  volcanic: VolcanicScene,
  dark: DarkScene,
  light: LightScene,
}

export default function AmbientBackground() {
  const { theme } = useTheme()
  const reducedMotion = usePrefersReducedMotion()
  const Scene = SCENES[theme]
  if (reducedMotion || !Scene) return null
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        overflow: 'hidden', zIndex: 0, contain: 'strict',
      }}
    >
      <Scene />
    </div>
  )
}
