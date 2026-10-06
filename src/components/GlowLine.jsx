import './GlowLine.css'

// duration: זמן מעבר מצד לצד בשניות; height: גובה האזור בפיקסלים
export default function GlowLine({duration=7,height=64,className='',style}){
  return <div className={`glowLine ${className}`} style={{'--glow-duration':`${duration}s`,height,...style}} aria-hidden="true">
    <div className="glowLine__haze"/>
    <div className="glowLine__bloom"/>
    <div className="glowLine__base"/>
    <div className="glowLine__lit"/>
    <div className="glowLine__orb"/>
  </div>
}
