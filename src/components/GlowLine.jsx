import {useEffect,useRef} from 'react'
import './GlowLine.css'

// מזיז את ההילה בלופ רך מצד לצד: 8% עד 92% לאורך הקו
export function startGlowSweep(el,duration=7){
  let raf,start
  const tick=t=>{
    start??=t
    const phase=((t-start)/1000/duration)*Math.PI
    el.style.setProperty('--glow-x',`${50-42*Math.cos(phase)}%`)
    raf=requestAnimationFrame(tick)
  }
  raf=requestAnimationFrame(tick)
  return()=>cancelAnimationFrame(raf)
}

// duration: זמן מעבר מצד לצד בשניות; height: גובה האזור בפיקסלים
export default function GlowLine({duration=7,height=64,className='',style}){
  const ref=useRef(null)
  useEffect(()=>startGlowSweep(ref.current,duration),[duration])
  return <div ref={ref} className={`glowLine ${className}`} style={{height,...style}} aria-hidden="true">
    <div className="glowLine__haze"/>
    <div className="glowLine__bloom"/>
    <div className="glowLine__base"/>
    <div className="glowLine__lit"/>
    <div className="glowLine__orb"/>
  </div>
}
