import { useMemo, memo, useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import { getSettings } from '../utils/storage'

function makeRand(seed) {
  let s = seed >>> 0
  return () => { s = Math.imul(s, 1664525) + 1013904223 >>> 0; return s / 0xffffffff }
}

// Adaptive particle density based on device capability
function getParticleDensity() {
  // Check for low-end devices
  const isLowEnd = navigator.hardwareConcurrency <= 4 || 
                   /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  
  // Check for high refresh rate displays
  const isHighRefresh = window.screen?.availWidth > 1920 || window.devicePixelRatio > 2
  
  if (isLowEnd) return 0.6 // 60% particles on low-end
  if (isHighRefresh) return 1.2 // 120% particles on high-end
  return 1.0 // 100% particles on standard devices
}

/* ── SUNRISE (light): Clean solid gradient background ── */
const SunriseScene = memo(function SunriseScene() {
  return (
    <div style={{ 
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(180deg, rgba(255, 240, 220, 0.3) 0%, rgba(255, 200, 150, 0.15) 50%, transparent 100%)',
    }} />
  )
})

/* ── SUNSET (dark): Clean solid gradient background ── */
const SunsetScene = memo(function SunsetScene() {
  return (
    <div style={{ 
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(180deg, rgba(180, 40, 0, 0.12) 0%, rgba(140, 30, 0, 0.08) 40%, transparent 100%)',
    }} />
  )
})

/* ── SAKURA ── */
const SakuraScene = memo(function SakuraScene() {
  const density = getParticleDensity()
  const petals = useMemo(() => {
    const r = makeRand(42)
    const count = Math.floor(20 * density)
    return Array.from({ length: count }, (_, i) => ({
      id: i, left: `${r() * 110 - 5}%`, size: `${6 + r() * 10}px`,
      dur: `${8 + r() * 10}s`, delay: `${-(r() * 20)}s`,
      drift: `${(r()-0.5)*180}px`, rotStart: `${r()*180}deg`, rotEnd: `${420+r()*540}deg`,
      opacity: 0.55 + r() * 0.35,
      color: i%4===0?'rgba(244,114,182,0.75)':i%4===1?'rgba(236,72,153,0.65)':i%4===2?'rgba(249,168,212,0.60)':'rgba(253,164,175,0.70)',
      shape: i % 5,
    }))
  }, [density])
  return (
    <>
      <div style={{ position:'absolute',right:'-10%',top:'-10%',width:'55vw',height:'45vw',borderRadius:'50%',filter:'blur(90px)',background:'radial-gradient(ellipse,rgba(236,72,153,0.12) 0%,rgba(244,114,182,0.06) 50%,transparent 70%)',animation:'ss-float-slow 30s -5s ease-in-out infinite alternate',willChange:'transform',transform:'translate3d(0,0,0)'}} />
      <div style={{ position:'absolute',left:'-5%',bottom:'10%',width:'40vw',height:'32vw',borderRadius:'50%',filter:'blur(70px)',background:'radial-gradient(ellipse,rgba(192,132,252,0.10) 0%,transparent 70%)',animation:'ss-float-slow 26s -12s ease-in-out infinite alternate-reverse',willChange:'transform',transform:'translate3d(0,0,0)'}} />
      {petals.map(p => (
        <div key={p.id} style={{ position:'absolute',left:p.left,top:'-30px',width:p.size,height:p.size,'--drift':p.drift,'--rot-start':p.rotStart,'--rot-end':p.rotEnd,'--max-opacity':p.opacity,animation:`ss-petal-fall ${p.dur} ${p.delay} linear infinite`,borderRadius:p.shape<2?'0 100% 0 100%':p.shape<4?'100% 0 100% 0':'50% 50% 50% 0',background:p.color,transform:'translate3d(0,0,0)',willChange:'transform, opacity'}} />
      ))}
    </>
  )
})

/* ── MIDNIGHT: Deep space ── */
const MidnightScene = memo(function MidnightScene() {
  const density = getParticleDensity()
  const stars = useMemo(() => {
    const r = makeRand(7)
    const count = Math.floor(80 * density)
    return Array.from({ length: count }, (_, i) => ({
      id: i, left: `${r()*100}%`, top: `${r()*90}%`,
      size: `${0.8+r()*2.2}px`, opacity: 0.2+r()*0.75,
      dur: `${2.5+r()*5.5}s`, delay: `${-(r()*8)}s`,
      color: i%5===0?'rgba(160,210,255,0.95)':i%5===1?'rgba(255,255,255,0.88)':i%5===2?'rgba(120,180,255,0.90)':i%5===3?'rgba(100,160,250,0.88)':'rgba(210,235,255,0.82)',
    }))
  }, [density])
  return (
    <>
      <div style={{ position:'absolute',inset:0,background:'radial-gradient(ellipse 60% 40% at 20% 30%,rgba(15,30,80,0.22) 0%,transparent 60%)',willChange:'opacity',transform:'translate3d(0,0,0)'}} />
      <div style={{ position:'absolute',inset:0,background:'radial-gradient(ellipse 50% 35% at 80% 70%,rgba(8,15,50,0.20) 0%,transparent 55%)',willChange:'opacity',transform:'translate3d(0,0,0)'}} />
      <div style={{ position:'absolute',left:'60%',top:'15%',width:'20vw',height:'8vw',borderRadius:'50%',filter:'blur(40px)',background:'radial-gradient(ellipse,rgba(40,80,180,0.14) 0%,rgba(20,40,100,0.06) 50%,transparent 70%)',transform:'rotate(-25deg) translate3d(0,0,0)',animation:'ss-float-slow 50s -20s ease-in-out infinite alternate',willChange:'transform'}} />
      <div style={{ position:'absolute',left:'10%',bottom:'-15%',width:'70vw',height:'30vw',borderRadius:'50%',filter:'blur(100px)',background:'radial-gradient(ellipse,rgba(15,40,100,0.18) 0%,transparent 70%)',animation:'ss-float-slow 46s -10s ease-in-out infinite alternate',willChange:'transform',transform:'translate3d(0,0,0)'}} />
      {stars.map(s => (
        <div key={s.id} style={{ position:'absolute',left:s.left,top:s.top,width:s.size,height:s.size,borderRadius:'50%',background:s.color,boxShadow:`0 0 ${parseFloat(s.size)*2.5}px ${s.color}`,'--max-opacity':s.opacity,animation:`ss-star-twinkle ${s.dur} ${s.delay} ease-in-out infinite alternate`,willChange:'opacity',transform:'translate3d(0,0,0)'}} />
      ))}
    </>
  )
})

/* ── LAVENDER ── */
const LavenderScene = memo(function LavenderScene() {
  const density = getParticleDensity()
  const petals = useMemo(() => {
    const r = makeRand(33)
    const count = Math.floor(20 * density)
    return Array.from({ length: count }, (_, i) => ({
      id: i, left: `${r()*110-5}%`, size: `${5+r()*9}px`,
      dur: `${9+r()*12}s`, delay: `${-(r()*22)}s`,
      drift: `${(r()-0.5)*150}px`, rotStart: `${r()*200}deg`, rotEnd: `${400+r()*500}deg`,
      opacity: 0.5+r()*0.40,
      color: i%4===0?'rgba(167,139,250,0.78)':i%4===1?'rgba(196,165,253,0.68)':i%4===2?'rgba(216,180,254,0.65)':'rgba(139,92,246,0.75)',
      shape: i % 3,
    }))
  }, [density])
  return (
    <>
      <div style={{ position:'absolute',right:'-8%',top:'-8%',width:'55vw',height:'45vw',borderRadius:'50%',filter:'blur(90px)',background:'radial-gradient(ellipse,rgba(139,92,246,0.14) 0%,rgba(167,139,250,0.07) 50%,transparent 70%)',animation:'ss-float-slow 32s -5s ease-in-out infinite alternate',willChange:'transform',transform:'translate3d(0,0,0)'}} />
      <div style={{ position:'absolute',left:'-5%',bottom:'15%',width:'42vw',height:'34vw',borderRadius:'50%',filter:'blur(80px)',background:'radial-gradient(ellipse,rgba(167,139,250,0.12) 0%,transparent 70%)',animation:'ss-float-slow 28s -14s ease-in-out infinite alternate-reverse',willChange:'transform',transform:'translate3d(0,0,0)'}} />
      {petals.map(p => (
        <div key={p.id} style={{ position:'absolute',left:p.left,top:'-30px',width:p.size,height:p.size,'--drift':p.drift,'--rot-start':p.rotStart,'--rot-end':p.rotEnd,'--max-opacity':p.opacity,animation:`ss-petal-fall ${p.dur} ${p.delay} linear infinite`,borderRadius:p.shape===0?'0 100% 0 100%':p.shape===1?'100% 0 100% 0':'60% 40% 60% 40%',background:p.color,willChange:'transform, opacity',transform:'translate3d(0,0,0)'}} />
      ))}
    </>
  )
})

/* ── FOREST: Full-screen fireflies with emphasis on right side ── */
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
        id: i, left: `${leftPos}%`, top: `${5 + r() * 85}%`,
        size: `${2.2 + r() * 3.5}px`, dur: `${3.5 + r() * 6.5}s`, delay: `${-(r() * 10)}s`,
        moveDur: `${7 + r() * 13}s`, moveDelay: `${-(r() * 15)}s`,
        tx: `${(r()-0.5)*120}px`, ty: `${(r()-0.5)*100}px`,
        color: i%3===0?'rgba(52,211,153,0.95)':i%3===1?'rgba(110,231,183,0.85)':'rgba(134,239,172,0.90)',
      }
    })
  }, [density])
  const mist = useMemo(() => {
    const r = makeRand(88)
    return Array.from({ length: 6 }, (_, i) => ({
      id: i, left: `${-10+r()*100}%`, bottom: `${r()*30}%`,
      w: `${220+r()*320}px`, h: `${90+r()*140}px`,
      opacity: 0.05+r()*0.08, dur: `${22+r()*22}s`, delay: `${-(r()*30)}s`,
      tx: `${(r()-0.5)*120}px`,
    }))
  }, [])
  return (
    <>
      {mist.map(m => (
        <div key={m.id} style={{ position:'absolute',left:m.left,bottom:m.bottom,width:m.w,height:m.h,borderRadius:'50%',filter:'blur(45px)',background:`radial-gradient(ellipse,rgba(0,216,124,${m.opacity*2.2}) 0%,rgba(52,211,153,${m.opacity}) 40%,transparent 70%)`,'--tx':m.tx,animation:`ss-mist-drift ${m.dur} ${m.delay} ease-in-out infinite alternate`,willChange:'transform',transform:'translate3d(0,0,0)'}} />
      ))}
      <div style={{ position:'absolute',top:0,left:0,right:0,height:'35%',filter:'blur(60px)',background:'linear-gradient(180deg,rgba(0,216,124,0.09) 0%,transparent 100%)',animation:'ss-float-slow 32s ease-in-out infinite alternate',willChange:'transform',transform:'translate3d(0,0,0)'}} />
      {fireflies.map(f => (
        <div key={f.id} style={{ position:'absolute',left:f.left,top:f.top,'--tx':f.tx,'--ty':f.ty,animation:`ss-nebula-drift ${f.moveDur} ${f.moveDelay} ease-in-out infinite alternate`,willChange:'transform',transform:'translate3d(0,0,0)'}}>
          <div style={{ width:f.size,height:f.size,borderRadius:'50%',background:f.color,boxShadow:`0 0 ${parseFloat(f.size)*5.5}px ${f.color},0 0 ${parseFloat(f.size)*11}px ${f.color.replace(/0\.\d+\)/,'0.35)')}`,animation:`ss-firefly-blink ${f.dur} ${f.delay} ease-in-out infinite`,willChange:'opacity, transform',transform:'translate3d(0,0,0)'}} />
        </div>
      ))}
    </>
  )
})

/* ── VOLCANIC: Immersive magma with heat haze, lava veins, dense embers ── */
const VolcanicScene = memo(function VolcanicScene() {
  const density = getParticleDensity()
  const embers = useMemo(() => {
    const r = makeRand(77)
    const count = Math.floor(38 * density)
    return Array.from({ length: count }, (_, i) => {
      const isLarge = i < 8
      return {
        id: i, left: `${2+r()*96}%`, bottom: `${r()*(isLarge?12:24)}%`,
        size: `${isLarge ? (4.5+r()*7) : (1.8+r()*4.5)}px`,
        dur: `${isLarge ? (7+r()*7) : (3.5+r()*8.5)}s`,
        delay: `${-(r()*14)}s`,
        drift: `${(r()-0.5)*(isLarge?70:110)}px`,
        rise: `${-(isLarge ? (32+r()*45) : (55+r()*65))}vh`,
        opacity: isLarge ? (0.75+r()*0.22) : (0.55+r()*0.38),
        core: i%4===0?'#FF2222':i%4===1?'#DD0000':i%4===2?'#FF5020':'#EE3535',
        outer: i%4===0?'rgba(230,0,0,0.65)':i%4===1?'rgba(190,0,0,0.60)':i%4===2?'rgba(255,70,0,0.55)':'rgba(210,30,30,0.60)',
      }
    })
  }, [density])
  return (
    <>
      {/* Primary magma pool — wide, deep */}
      <div style={{ position:'absolute',left:'-8%',bottom:'-20%',right:'-8%',height:'60%',filter:'blur(80px)',background:'radial-gradient(ellipse 90% 65% at 50% 100%,rgba(210,15,0,0.40) 0%,rgba(190,0,0,0.24) 35%,rgba(130,0,0,0.12) 55%,transparent 72%)',animation:'ss-lava-pulse 7s ease-in-out infinite alternate',willChange:'opacity',transform:'translate3d(0,0,0)'}} />
      {/* Secondary magma — shifted left, slower pulse */}
      <div style={{ position:'absolute',left:'-5%',bottom:'-12%',width:'55vw',height:'35vw',borderRadius:'50%',filter:'blur(70px)',background:'radial-gradient(ellipse,rgba(230,25,0,0.32) 0%,rgba(190,0,0,0.17) 50%,transparent 72%)',animation:'ss-lava-pulse 11s -3s ease-in-out infinite alternate',willChange:'opacity',transform:'translate3d(0,0,0)'}} />
      {/* Tertiary magma — right side accent */}
      <div style={{ position:'absolute',right:'-5%',bottom:'-8%',width:'45vw',height:'28vw',borderRadius:'50%',filter:'blur(65px)',background:'radial-gradient(ellipse,rgba(210,0,0,0.28) 0%,rgba(170,15,0,0.14) 55%,transparent 72%)',animation:'ss-lava-pulse 9s -6s ease-in-out infinite alternate-reverse',willChange:'opacity',transform:'translate3d(0,0,0)'}} />
      {/* Center molten core */}
      <div style={{ position:'absolute',left:'30%',bottom:'-6%',width:'40vw',height:'20vw',borderRadius:'50%',filter:'blur(55px)',background:'radial-gradient(ellipse,rgba(255,45,0,0.22) 0%,rgba(210,15,0,0.12) 55%,transparent 72%)',animation:'ss-lava-pulse 14s -7s ease-in-out infinite alternate',willChange:'opacity',transform:'translate3d(0,0,0)'}} />
      {/* Ambient red wash on upper area */}
      <div style={{ position:'absolute',left:'20%',top:'10%',width:'60vw',height:'40vw',borderRadius:'50%',filter:'blur(120px)',background:'radial-gradient(ellipse,rgba(130,0,0,0.10) 0%,transparent 70%)',animation:'ss-float-slow 40s -8s ease-in-out infinite alternate',willChange:'transform',transform:'translate3d(0,0,0)'}} />
      {/* Embers */}
      {embers.map(e => (
        <div key={e.id} style={{ position:'absolute',left:e.left,bottom:e.bottom,width:e.size,height:e.size,borderRadius:'50%',background:`radial-gradient(circle,${e.core} 0%,${e.outer} 50%,transparent 100%)`,boxShadow:`0 0 ${parseFloat(e.size)*4.5}px ${e.core},0 0 ${parseFloat(e.size)*9}px ${e.outer},0 0 ${parseFloat(e.size)*16}px rgba(190,0,0,0.28)`,'--drift':e.drift,'--rise':e.rise,'--max-opacity':e.opacity,animation:`ss-ember-rise ${e.dur} ${e.delay} ease-out infinite`,willChange:'transform, opacity',transform:'translate3d(0,0,0)'}} />
      ))}
    </>
  )
})

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
        willChange: 'opacity'
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
        willChange: 'transform'
      }} />
    </>
  )
})

/* ── LIGHT ── */
const LightScene = memo(function LightScene() {
  const bubbles = useMemo(() => {
    const r = makeRand(99)
    return Array.from({ length: 10 }, (_, i) => ({
      id: i, left: `${10+r()*80}%`, bottom: `${-5+r()*20}%`,
      size: `${32+r()*65}px`, dur: `${13+r()*13}s`, delay: `${-(r()*18)}s`,
      opacity: 0.18+r()*0.15,
      color: i%3===0?'rgba(96,165,250,0.32)':i%3===1?'rgba(167,139,250,0.28)':'rgba(52,211,153,0.28)',
      drift: `${(r()-0.5)*70}px`, rise: `${-(52+r()*42)}vh`,
    }))
  }, [])
  return (
    <>
      <div style={{ position:'absolute',inset:0,backgroundImage:'radial-gradient(circle,rgba(0,0,0,0.03) 1px,transparent 1px)',backgroundSize:'40px 40px',opacity:0.6}} />
      {bubbles.map(b => (
        <div key={b.id} style={{ position:'absolute',left:b.left,bottom:b.bottom,width:b.size,height:b.size,borderRadius:'50%',border:`1.8px solid ${b.color}`,background:'radial-gradient(ellipse at 30% 30%,rgba(255,255,255,0.55),transparent 65%)',' --drift':b.drift,'--rise':b.rise,'--max-opacity':b.opacity,animation:`ss-bubble-float ${b.dur} ${b.delay} ease-in-out infinite`,willChange:'transform, opacity',transform:'translate3d(0,0,0)'}} />
      ))}
    </>
  )
})

const SCENES = {
  sunrise: SunriseScene, sunset: SunsetScene,
  sakura: SakuraScene, midnight: MidnightScene,
  lavender: LavenderScene, forest: ForestScene,
  volcanic: VolcanicScene, dark: DarkScene, light: LightScene,
}

export default memo(function AmbientBackground() {
  const { theme } = useTheme()
  const [reducedMotion, setReducedMotion] = useState(() => getSettings().reducedMotion)
  const [isReady, setIsReady] = useState(false)
  
  // Listen for settings changes
  useEffect(() => {
    const handleSettingsChange = () => {
      setReducedMotion(getSettings().reducedMotion)
    }
    window.addEventListener('swiftshare:settings-changed', handleSettingsChange)
    return () => window.removeEventListener('swiftshare:settings-changed', handleSettingsChange)
  }, [])
  
  // Delay rendering to prevent initial flicker
  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 0)
    return () => clearTimeout(timer)
  }, [])
  
  // Check if reduce motion is enabled - if so, don't render anything
  if (reducedMotion || !isReady) return null
  
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
        contain: 'layout style paint',
        isolation: 'isolate',
        background: 'transparent',
        opacity: 1,
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
      }}
    >
      <Scene />
    </div>
  )
})
