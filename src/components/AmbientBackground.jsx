import { useMemo, memo } from 'react'
import { useTheme } from '../context/ThemeContext'

function makeRand(seed) {
  let s = seed >>> 0
  return () => { s = Math.imul(s, 1664525) + 1013904223 >>> 0; return s / 0xffffffff }
}

/* ── SUNSET LIGHT ── */
const SunsetScene = memo(function SunsetScene() {
  const motes = useMemo(() => {
    const r = makeRand(11)
    return Array.from({ length: 14 }, (_, i) => ({
      id: i, left: `${r() * 100}%`, top: `${20 + r() * 70}%`,
      size: `${1.5 + r() * 2.5}px`, dur: `${14 + r() * 16}s`, delay: `${-(r() * 20)}s`,
      tx: `${(r() - 0.5) * 90}px`, ty: `${-(10 + r() * 50)}px`,
      color: i % 3 === 0 ? 'rgba(255,178,92,0.75)' : i % 3 === 1 ? 'rgba(245,110,40,0.68)' : 'rgba(255,214,140,0.55)',
    }))
  }, [])
  return (
    <>
      <div style={{ position:'absolute',left:'10%',bottom:'-8%',width:'42vw',height:'30vw',borderRadius:'50%',filter:'blur(70px)',background:'radial-gradient(ellipse,rgba(255,138,54,0.18) 0%,rgba(255,193,99,0.08) 48%,transparent 72%)',animation:'ss-float-slow 34s -6s ease-in-out infinite alternate'}} />
      <div style={{ position:'absolute',right:'-8%',top:'-8%',width:'36vw',height:'26vw',borderRadius:'50%',filter:'blur(80px)',background:'radial-gradient(ellipse,rgba(255,188,96,0.10) 0%,rgba(231,72,32,0.05) 44%,transparent 72%)',animation:'ss-float-slow 42s -16s ease-in-out infinite alternate-reverse'}} />
      <div style={{ position:'absolute',left:'42%',top:'18%',width:'28vw',height:'18vw',borderRadius:'50%',filter:'blur(60px)',background:'radial-gradient(ellipse,rgba(255,220,150,0.08) 0%,transparent 68%)',animation:'ss-float-slow 28s -10s ease-in-out infinite alternate'}} />
      {motes.map(m => (
        <div key={m.id} style={{ position:'absolute',left:m.left,top:m.top,width:m.size,height:m.size,borderRadius:'50%',background:m.color,'--tx':m.tx,'--ty':m.ty,opacity:0,animation:`ss-mote-rise ${m.dur} ${m.delay} ease-out infinite`,boxShadow:`0 0 ${parseFloat(m.size)*3}px ${m.color}`}} />
      ))}
    </>
  )
})

/* ── SUNSET DARK ── */
const SunsetDarkScene = memo(function SunsetDarkScene() {
  const embers = useMemo(() => {
    const r = makeRand(55)
    return Array.from({ length: 16 }, (_, i) => ({
      id: i, left: `${3 + r() * 94}%`, bottom: `${r() * 18}%`,
      size: `${1.5 + r() * 3.5}px`, dur: `${6 + r() * 10}s`, delay: `${-(r() * 14)}s`,
      drift: `${(r() - 0.5) * 80}px`, rise: `${-(40 + r() * 55)}vh`,
      color: i % 3 === 0 ? '#FF8830' : i % 3 === 1 ? '#FF5500' : '#FFAA44',
      outer: i % 3 === 0 ? 'rgba(200,80,0,0.45)' : 'rgba(180,50,0,0.40)',
    }))
  }, [])
  return (
    <>
      <div style={{ position:'absolute',left:'-5%',bottom:'-18%',right:'-5%',height:'50%',filter:'blur(80px)',background:'radial-gradient(ellipse 90% 70% at 50% 100%,rgba(180,50,0,0.30) 0%,rgba(120,30,0,0.14) 50%,transparent 75%)',animation:'ss-lava-pulse 10s ease-in-out infinite alternate'}} />
      <div style={{ position:'absolute',left:'12%',bottom:'-8%',width:'32vw',height:'24vw',borderRadius:'50%',filter:'blur(60px)',background:'radial-gradient(ellipse,rgba(200,60,0,0.22) 0%,transparent 70%)',animation:'ss-float-slow 20s -4s ease-in-out infinite alternate'}} />
      <div style={{ position:'absolute',right:'8%',bottom:'-5%',width:'28vw',height:'20vw',borderRadius:'50%',filter:'blur(55px)',background:'radial-gradient(ellipse,rgba(180,40,0,0.18) 0%,transparent 70%)',animation:'ss-float-slow 26s -12s ease-in-out infinite alternate-reverse'}} />
      {embers.map(e => (
        <div key={e.id} style={{ position:'absolute',left:e.left,bottom:e.bottom,width:e.size,height:e.size,borderRadius:'50%',background:`radial-gradient(circle,${e.color} 0%,${e.outer} 60%,transparent 100%)`,boxShadow:`0 0 ${parseFloat(e.size)*4}px ${e.color}`,'--drift':e.drift,'--rise':e.rise,'--max-opacity':0.75,animation:`ss-ember-rise ${e.dur} ${e.delay} ease-out infinite`}} />
      ))}
    </>
  )
})

/* ── SAKURA ── */
const SakuraScene = memo(function SakuraScene() {
  const petals = useMemo(() => {
    const r = makeRand(42)
    return Array.from({ length: 18 }, (_, i) => ({
      id: i, left: `${r() * 110 - 5}%`, size: `${6 + r() * 9}px`,
      dur: `${9 + r() * 10}s`, delay: `${-(r() * 20)}s`,
      drift: `${(r()-0.5)*160}px`, rotStart: `${r()*180}deg`, rotEnd: `${400+r()*520}deg`,
      opacity: 0.5 + r() * 0.4,
      color: i%4===0?'rgba(244,114,182,0.70)':i%4===1?'rgba(236,72,153,0.60)':i%4===2?'rgba(249,168,212,0.55)':'rgba(253,164,175,0.65)',
      shape: i % 5,
    }))
  }, [])
  return (
    <>
      <div style={{ position:'absolute',right:'-10%',top:'-10%',width:'55vw',height:'45vw',borderRadius:'50%',filter:'blur(90px)',background:'radial-gradient(ellipse,rgba(236,72,153,0.12) 0%,rgba(244,114,182,0.06) 50%,transparent 70%)',animation:'ss-float-slow 30s -5s ease-in-out infinite alternate'}} />
      <div style={{ position:'absolute',left:'-5%',bottom:'10%',width:'40vw',height:'32vw',borderRadius:'50%',filter:'blur(70px)',background:'radial-gradient(ellipse,rgba(192,132,252,0.10) 0%,transparent 70%)',animation:'ss-float-slow 26s -12s ease-in-out infinite alternate-reverse'}} />
      {petals.map(p => (
        <div key={p.id} style={{ position:'absolute',left:p.left,top:'-30px',width:p.size,height:p.size,'--drift':p.drift,'--rot-start':p.rotStart,'--rot-end':p.rotEnd,'--max-opacity':p.opacity,animation:`ss-petal-fall ${p.dur} ${p.delay} linear infinite`,borderRadius:p.shape<2?'0 100% 0 100%':p.shape<4?'100% 0 100% 0':'50% 50% 50% 0',background:p.color,transform:`rotate(${p.rotStart})`}} />
      ))}
    </>
  )
})

/* ── MIDNIGHT: Deep space ── */
const MidnightScene = memo(function MidnightScene() {
  const stars = useMemo(() => {
    const r = makeRand(7)
    return Array.from({ length: 70 }, (_, i) => ({
      id: i, left: `${r()*100}%`, top: `${r()*90}%`,
      size: `${0.6+r()*1.8}px`, opacity: 0.15+r()*0.72,
      dur: `${2.8+r()*5.2}s`, delay: `${-(r()*7)}s`,
      color: i%5===0?'rgba(150,200,255,0.92)':i%5===1?'rgba(255,255,255,0.82)':i%5===2?'rgba(100,170,255,0.86)':i%5===3?'rgba(80,150,240,0.82)':'rgba(200,225,255,0.74)',
    }))
  }, [])
  return (
    <>
      <div style={{ position:'absolute',inset:0,background:'radial-gradient(ellipse 60% 40% at 20% 30%,rgba(15,30,80,0.22) 0%,transparent 60%)'}} />
      <div style={{ position:'absolute',inset:0,background:'radial-gradient(ellipse 50% 35% at 80% 70%,rgba(8,15,50,0.20) 0%,transparent 55%)'}} />
      <div style={{ position:'absolute',left:'60%',top:'15%',width:'20vw',height:'8vw',borderRadius:'50%',filter:'blur(40px)',background:'radial-gradient(ellipse,rgba(40,80,180,0.14) 0%,rgba(20,40,100,0.06) 50%,transparent 70%)',transform:'rotate(-25deg)',animation:'ss-float-slow 50s -20s ease-in-out infinite alternate'}} />
      <div style={{ position:'absolute',left:'10%',bottom:'-15%',width:'70vw',height:'30vw',borderRadius:'50%',filter:'blur(100px)',background:'radial-gradient(ellipse,rgba(15,40,100,0.18) 0%,transparent 70%)',animation:'ss-float-slow 46s -10s ease-in-out infinite alternate'}} />
      {stars.map(s => (
        <div key={s.id} style={{ position:'absolute',left:s.left,top:s.top,width:s.size,height:s.size,borderRadius:'50%',background:s.color,boxShadow:`0 0 ${parseFloat(s.size)*2}px ${s.color}`,'--max-opacity':s.opacity,animation:`ss-star-twinkle ${s.dur} ${s.delay} ease-in-out infinite alternate`}} />
      ))}
    </>
  )
})

/* ── LAVENDER ── */
const LavenderScene = memo(function LavenderScene() {
  const petals = useMemo(() => {
    const r = makeRand(33)
    return Array.from({ length: 18 }, (_, i) => ({
      id: i, left: `${r()*110-5}%`, size: `${5+r()*8}px`,
      dur: `${10+r()*12}s`, delay: `${-(r()*22)}s`,
      drift: `${(r()-0.5)*140}px`, rotStart: `${r()*200}deg`, rotEnd: `${380+r()*480}deg`,
      opacity: 0.45+r()*0.40,
      color: i%4===0?'rgba(167,139,250,0.75)':i%4===1?'rgba(196,165,253,0.65)':i%4===2?'rgba(216,180,254,0.60)':'rgba(139,92,246,0.70)',
      shape: i % 3,
    }))
  }, [])
  return (
    <>
      <div style={{ position:'absolute',right:'-8%',top:'-8%',width:'55vw',height:'45vw',borderRadius:'50%',filter:'blur(90px)',background:'radial-gradient(ellipse,rgba(139,92,246,0.14) 0%,rgba(167,139,250,0.07) 50%,transparent 70%)',animation:'ss-float-slow 32s -5s ease-in-out infinite alternate'}} />
      <div style={{ position:'absolute',left:'-5%',bottom:'15%',width:'42vw',height:'34vw',borderRadius:'50%',filter:'blur(80px)',background:'radial-gradient(ellipse,rgba(167,139,250,0.12) 0%,transparent 70%)',animation:'ss-float-slow 28s -14s ease-in-out infinite alternate-reverse'}} />
      {petals.map(p => (
        <div key={p.id} style={{ position:'absolute',left:p.left,top:'-30px',width:p.size,height:p.size,'--drift':p.drift,'--rot-start':p.rotStart,'--rot-end':p.rotEnd,'--max-opacity':p.opacity,animation:`ss-petal-fall ${p.dur} ${p.delay} linear infinite`,borderRadius:p.shape===0?'0 100% 0 100%':p.shape===1?'100% 0 100% 0':'60% 40% 60% 40%',background:p.color,transform:`rotate(${p.rotStart})`}} />
      ))}
    </>
  )
})

/* ── FOREST: Full-screen fireflies with emphasis on right side ── */
const ForestScene = memo(function ForestScene() {
  const fireflies = useMemo(() => {
    const r = makeRand(66)
    return Array.from({ length: 28 }, (_, i) => {
      // Bias distribution: first 10 spread everywhere, next 10 biased right, last 8 far right
      let leftPos
      if (i < 10) leftPos = 3 + r() * 94
      else if (i < 20) leftPos = 40 + r() * 58
      else leftPos = 60 + r() * 38
      return {
        id: i, left: `${leftPos}%`, top: `${5 + r() * 85}%`,
        size: `${2 + r() * 3}px`, dur: `${4 + r() * 6}s`, delay: `${-(r() * 10)}s`,
        moveDur: `${8 + r() * 12}s`, moveDelay: `${-(r() * 15)}s`,
        tx: `${(r()-0.5)*100}px`, ty: `${(r()-0.5)*80}px`,
        color: i%3===0?'rgba(52,211,153,0.9)':i%3===1?'rgba(110,231,183,0.8)':'rgba(134,239,172,0.85)',
      }
    })
  }, [])
  const mist = useMemo(() => {
    const r = makeRand(88)
    return Array.from({ length: 5 }, (_, i) => ({
      id: i, left: `${-10+r()*100}%`, bottom: `${r()*30}%`,
      w: `${200+r()*300}px`, h: `${80+r()*120}px`,
      opacity: 0.04+r()*0.07, dur: `${25+r()*20}s`, delay: `${-(r()*30)}s`,
      tx: `${(r()-0.5)*100}px`,
    }))
  }, [])
  return (
    <>
      {mist.map(m => (
        <div key={m.id} style={{ position:'absolute',left:m.left,bottom:m.bottom,width:m.w,height:m.h,borderRadius:'50%',filter:'blur(40px)',background:`radial-gradient(ellipse,rgba(0,216,124,${m.opacity*2}) 0%,rgba(52,211,153,${m.opacity}) 40%,transparent 70%)`,'--tx':m.tx,animation:`ss-mist-drift ${m.dur} ${m.delay} ease-in-out infinite alternate`}} />
      ))}
      <div style={{ position:'absolute',top:0,left:0,right:0,height:'35%',filter:'blur(60px)',background:'linear-gradient(180deg,rgba(0,216,124,0.08) 0%,transparent 100%)',animation:'ss-float-slow 32s ease-in-out infinite alternate'}} />
      {fireflies.map(f => (
        <div key={f.id} style={{ position:'absolute',left:f.left,top:f.top,'--tx':f.tx,'--ty':f.ty,animation:`ss-nebula-drift ${f.moveDur} ${f.moveDelay} ease-in-out infinite alternate`}}>
          <div style={{ width:f.size,height:f.size,borderRadius:'50%',background:f.color,boxShadow:`0 0 ${parseFloat(f.size)*5}px ${f.color},0 0 ${parseFloat(f.size)*10}px ${f.color.replace(/0\.\d+\)/,'0.3)')}`,animation:`ss-firefly-blink ${f.dur} ${f.delay} ease-in-out infinite`}} />
        </div>
      ))}
    </>
  )
})

/* ── VOLCANIC: Heavy lava glow + dense embers ── */
const VolcanicScene = memo(function VolcanicScene() {
  const embers = useMemo(() => {
    const r = makeRand(77)
    return Array.from({ length: 28 }, (_, i) => ({
      id: i, left: `${3+r()*90}%`, bottom: `${r()*20}%`,
      size: `${2+r()*5}px`, dur: `${5+r()*9}s`, delay: `${-(r()*14)}s`,
      drift: `${(r()-0.5)*90}px`, rise: `${-(55+r()*60)}vh`,
      opacity: 0.60+r()*0.35,
      core: i%3===0?'#FF1A1A':i%3===1?'#CC0000':'#E83030',
      outer: i%3===0?'rgba(200,0,0,0.55)':i%3===1?'rgba(180,0,0,0.50)':'rgba(220,20,20,0.50)',
    }))
  }, [])
  return (
    <>
      {/* Deep crimson lava pool at bottom */}
      <div style={{ position:'absolute',left:'-5%',bottom:'-15%',right:'-5%',height:'55%',filter:'blur(80px)',background:'radial-gradient(ellipse 80% 60% at 50% 100%,rgba(180,0,0,0.32) 0%,rgba(200,20,0,0.18) 45%,transparent 70%)',animation:'ss-lava-pulse 8s ease-in-out infinite alternate'}} />
      {/* Left lava orb */}
      <div style={{ position:'absolute',left:'8%',bottom:'-5%',width:'30vw',height:'25vw',borderRadius:'50%',filter:'blur(65px)',background:'radial-gradient(ellipse,rgba(200,0,0,0.25) 0%,rgba(160,0,0,0.12) 55%,transparent 72%)',animation:'ss-float-slow 18s -6s ease-in-out infinite alternate'}} />
      {/* Right lava orb */}
      <div style={{ position:'absolute',right:'5%',bottom:'-5%',width:'26vw',height:'20vw',borderRadius:'50%',filter:'blur(60px)',background:'radial-gradient(ellipse,rgba(170,0,0,0.22) 0%,rgba(200,20,0,0.10) 55%,transparent 72%)',animation:'ss-float-slow 24s -12s ease-in-out infinite alternate-reverse'}} />
      {/* Center lava streak */}
      <div style={{ position:'absolute',left:'25%',bottom:'-10%',width:'50vw',height:'18vw',borderRadius:'50%',filter:'blur(70px)',background:'radial-gradient(ellipse,rgba(220,20,0,0.18) 0%,transparent 68%)',animation:'ss-lava-pulse 12s -4s ease-in-out infinite alternate'}} />
      {embers.map(e => (
        <div key={e.id} style={{ position:'absolute',left:e.left,bottom:e.bottom,width:e.size,height:e.size,borderRadius:'50%',background:`radial-gradient(circle,${e.core} 0%,${e.outer} 55%,transparent 100%)`,boxShadow:`0 0 ${parseFloat(e.size)*4}px ${e.core},0 0 ${parseFloat(e.size)*8}px rgba(180,0,0,0.3)`,'--drift':e.drift,'--rise':e.rise,'--max-opacity':e.opacity,animation:`ss-ember-rise ${e.dur} ${e.delay} ease-out infinite`}} />
      ))}
    </>
  )
})

/* ── DARK ── */
const DarkScene = memo(function DarkScene() {
  const glints = useMemo(() => {
    const r = makeRand(44)
    return Array.from({ length: 10 }, (_, i) => ({
      id: i, left: `${r()*100}%`, top: `${r()*100}%`,
      size: `${0.8+r()*1.5}px`, dur: `${4+r()*6}s`, delay: `${-(r()*8)}s`,
    }))
  }, [])
  return (
    <>
      <div style={{ position:'absolute',inset:0,backgroundImage:'radial-gradient(circle,rgba(255,255,255,0.03) 1px,transparent 1px)',backgroundSize:'48px 48px',animation:'ss-grid-fade 12s ease-in-out infinite alternate'}} />
      <div style={{ position:'absolute',left:'20%',top:'20%',width:'60vw',height:'40vw',borderRadius:'50%',filter:'blur(120px)',background:'radial-gradient(ellipse,rgba(255,255,255,0.03) 0%,transparent 70%)',animation:'ss-float-slow 40s ease-in-out infinite alternate'}} />
      {glints.map(g => (
        <div key={g.id} style={{ position:'absolute',left:g.left,top:g.top,width:g.size,height:g.size,borderRadius:'50%',background:'rgba(255,255,255,0.6)',animation:`ss-star-twinkle ${g.dur} ${g.delay} ease-in-out infinite alternate`}} />
      ))}
    </>
  )
})

/* ── LIGHT ── */
const LightScene = memo(function LightScene() {
  const bubbles = useMemo(() => {
    const r = makeRand(99)
    return Array.from({ length: 8 }, (_, i) => ({
      id: i, left: `${10+r()*80}%`, bottom: `${-5+r()*20}%`,
      size: `${30+r()*60}px`, dur: `${14+r()*12}s`, delay: `${-(r()*18)}s`,
      opacity: 0.15+r()*0.15,
      color: i%3===0?'rgba(96,165,250,0.3)':i%3===1?'rgba(167,139,250,0.25)':'rgba(52,211,153,0.25)',
      drift: `${(r()-0.5)*60}px`, rise: `${-(50+r()*40)}vh`,
    }))
  }, [])
  return (
    <>
      <div style={{ position:'absolute',inset:0,backgroundImage:'radial-gradient(circle,rgba(0,0,0,0.025) 1px,transparent 1px)',backgroundSize:'40px 40px'}} />
      {bubbles.map(b => (
        <div key={b.id} style={{ position:'absolute',left:b.left,bottom:b.bottom,width:b.size,height:b.size,borderRadius:'50%',border:`1.5px solid ${b.color}`,background:'radial-gradient(ellipse at 30% 30%,rgba(255,255,255,0.5),transparent 60%)','--drift':b.drift,'--rise':b.rise,'--max-opacity':b.opacity,animation:`ss-bubble-float ${b.dur} ${b.delay} ease-in-out infinite`}} />
      ))}
    </>
  )
})

const SCENES = {
  sunset: SunsetScene, 'sunset-dark': SunsetDarkScene,
  sakura: SakuraScene, midnight: MidnightScene,
  lavender: LavenderScene, forest: ForestScene,
  volcanic: VolcanicScene, dark: DarkScene, light: LightScene,
}

export default memo(function AmbientBackground() {
  const { theme } = useTheme()
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null
  const Scene = SCENES[theme]
  if (!Scene) return null
  return (
    <div aria-hidden="true" style={{ position:'fixed',inset:0,pointerEvents:'none',overflow:'hidden',zIndex:0,contain:'strict' }}>
      <Scene />
    </div>
  )
})
