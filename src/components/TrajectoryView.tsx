import { useEffect, useRef } from 'react'
import { horizontalSpeed } from '../sim/vehicle'
import type { VehicleState } from '../sim/vehicle'

interface TrajectoryViewProps {
  state: VehicleState
  thrust: number
  phase: string
  phaseIndex: number
  phaseSpec: { name: string; engines: number; rcs: number }
  tilt: number
}

function fmt(num: number, decimals = 0) {
  return num.toFixed(decimals)
}

export default function TrajectoryView({
  state,
  thrust,
  phase,
  phaseSpec,
  tilt,
}: TrajectoryViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)

  const alt = state.position[1]
  const vVert = state.velocity[1]
  const vHorz = horizontalSpeed(state)
  const rangeToPad = Math.hypot(state.position[0], state.position[2])
  const fuel = Math.round(state.fuel)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr
        canvas.height = rect.height * dpr
      }
      ctx.scale(dpr, dpr)
      const W = rect.width
      const H = rect.height

      // Background
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, W, H)

      // Stars
      ctx.fillStyle = 'rgba(232, 217, 175, 0.4)'
      for (let i = 0; i < 40; i++) {
        const sx = (i * 137.5) % W
        const sy = (i * 73.3) % (H * 0.6)
        ctx.fillRect(sx, sy, 1, 1)
      }

      // Coordinate transform - side view: X = horizontal range, Y = altitude (inverted for screen)
      const maxAlt = 15000
      const scaleY = (H * 0.75) / maxAlt
      const scaleX = (W * 0.4) / 2000 // scale for horizontal range

      const groundY = H - 60
      const startX = W * 0.25

      // Lunar surface
      ctx.strokeStyle = '#908172'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, groundY)
      // simple uneven surface
      for (let x = 0; x <= W; x += 20) {
        const bump = Math.sin(x * 0.01) * 2 + Math.sin(x * 0.023) * 1.5
        ctx.lineTo(x, groundY + bump)
      }
      ctx.stroke()
      ctx.fillStyle = 'rgba(144, 129, 114, 0.08)'
      ctx.lineTo(W, groundY + 40)
      ctx.lineTo(0, groundY + 40)
      ctx.closePath()
      ctx.fill()

      // Desired landing point (PAD-01)
      const padX = startX + 0 * scaleX
      const padY = groundY
      ctx.strokeStyle = 'rgba(104, 154, 106, 0.6)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(padX, padY - 4, 12, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(padX - 16, padY)
      ctx.lineTo(padX + 16, padY)
      ctx.moveTo(padX, padY - 16)
      ctx.lineTo(padX, padY + 4)
      ctx.stroke()
      ctx.fillStyle = 'rgba(104, 154, 106, 0.7)'
      ctx.font = '9px JetBrains Mono, monospace'
      ctx.fillText('PAD-01', padX - 16, padY - 22)

      // Trajectory line (desired/actual path trace)
      ctx.strokeStyle = 'rgba(104, 154, 106, 0.4)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      // simple descent curve
      for (let a = maxAlt; a >= 0; a -= 500) {
        const tx = startX + (200 - (a / maxAlt) * 200) * scaleX * 0.5
        const ty = groundY - a * scaleY
        if (a === maxAlt) ctx.moveTo(tx, ty)
        else ctx.lineTo(tx, ty)
      }
      ctx.stroke()
      ctx.setLineDash([])

      // Current vehicle position
      const vx = startX + (state.position[0] / 2000) * scaleX * 10 // spread out a bit for visibility
      const vy = groundY - Math.min(alt, maxAlt) * scaleY
      const landed = alt < 2

      // Thrust plume if firing
      if (thrust > 0.01 && state.engineArmed && !landed) {
        ctx.save()
        ctx.translate(vx, vy)
        const angle = tilt * (Math.PI / 180)
        ctx.rotate(angle)
        const plumeLen = thrust * 35
        const grad = ctx.createLinearGradient(0, 0, 0, plumeLen)
        grad.addColorStop(0, 'rgba(249, 144, 57, 0.8)')
        grad.addColorStop(1, 'rgba(249, 80, 57, 0)')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.moveTo(-3, 6)
        ctx.lineTo(3, 6)
        ctx.lineTo(0, 6 + plumeLen)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
      }

      // Vehicle icon (miniature representation of lander)
      ctx.save()
      ctx.translate(vx, vy)
      const angle = tilt * (Math.PI / 180)
      ctx.rotate(angle)
      
      // Body
      ctx.strokeStyle = '#e8d9af'
      ctx.fillStyle = 'rgba(83, 83, 83, 0.7)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, -14)
      ctx.lineTo(4, -4)
      ctx.lineTo(4, 4)
      ctx.lineTo(2, 6)
      ctx.lineTo(-2, 6)
      ctx.lineTo(-4, 4)
      ctx.lineTo(-4, -4)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // Engine bells
      ctx.fillStyle = '#908172'
      ctx.fillRect(-3, 6, 2, 2)
      ctx.fillRect(1, 6, 2, 2)
      ctx.fillRect(-1, 7, 2, 2)

      // RCS indicators
      if (state.rcs.left || state.rcs.right) {
        ctx.fillStyle = 'rgba(102, 170, 255, 0.8)'
        if (state.rcs.left) ctx.fillRect(-5, -2, 1, 3)
        if (state.rcs.right) ctx.fillRect(4, -2, 1, 3)
      }

      ctx.restore()

      // Altitude scale on left
      ctx.fillStyle = 'rgba(232, 217, 175, 0.6)'
      ctx.font = '9px JetBrains Mono, monospace'
      for (let a = 15000; a >= 0; a -= 3000) {
        const y = groundY - a * scaleY
        ctx.fillText(a === 0 ? '0' : `${a/1000}km`, 8, y + 3)
        ctx.strokeStyle = 'rgba(232, 217, 175, 0.2)'
        ctx.beginPath()
        ctx.moveTo(30, y)
        ctx.lineTo(W - 30, y)
        ctx.stroke()
      }

      // Range scale on bottom
      ctx.fillStyle = 'rgba(232, 217, 175, 0.6)'
      ctx.fillText('RANGE (m)', W / 2 - 25, groundY + 35)
      for (let r = 0; r <= 2000; r += 500) {
        const x = startX + (r / 2000) * scaleX * 10
        ctx.fillText(`${r}`, x - 10, groundY + 18)
      }

      // "LUNAR SURFACE" label
      ctx.fillStyle = 'rgba(232, 217, 175, 0.5)'
      ctx.fillText('LUNAR SURFACE', 8, groundY + 14)

      animRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [state, thrust, tilt, alt])

  return (
    <div className="traj-screen">
      <header className="traj-header">
        <div>
          <div className="traj-title">PDI TRAJECTORY - SCREEN A</div>
          <div className="traj-subtitle">POWERED DESCENT INITIATION | 15KM → SURFACE</div>
        </div>
        <div className="traj-meta">
          <span>PHASE: {phase.toUpperCase()}</span>
          <span>ENGINES: {phaseSpec.engines}</span>
          <span>RCS: {phaseSpec.rcs}</span>
        </div>
      </header>

      <div className="traj-main">
        <canvas ref={canvasRef} className="traj-canvas" />

        {/* Corner panels - gruvbox style, minimal transparent */}
        <div className="traj-panel traj-panel-tl">
          <div className="traj-panel-title">NAVIGATION</div>
          <div className="traj-row"><span>ALTITUDE</span><span>{fmt(alt)} m</span></div>
          <div className="traj-row"><span>V VERT</span><span>{vVert.toFixed(1)} m/s</span></div>
          <div className="traj-row"><span>V HORZ</span><span>{vHorz.toFixed(1)} m/s</span></div>
          <div className="traj-row"><span>RANGE</span><span>{rangeToPad.toFixed(0)} m</span></div>
        </div>

        <div className="traj-panel traj-panel-tr">
          <div className="traj-panel-title">GUIDANCE</div>
          <div className="traj-row"><span>DESIRED</span><span>PAD-01</span></div>
          <div className="traj-row"><span>TARGET RADIUS</span><span>100 m</span></div>
          <div className="traj-row"><span>VVERT LIM</span><span>&lt; 1.0 m/s</span></div>
          <div className="traj-row"><span>VHORZ LIM</span><span>&lt; 0.5 m/s</span></div>
        </div>

        <div className="traj-panel traj-panel-bl">
          <div className="traj-panel-title">CONTROL</div>
          <div className="traj-row"><span>THROTTLE</span><span>{Math.round(state.throttle * 100)} %</span></div>
          <div className="traj-row"><span>THRUST</span><span>{Math.round(thrust * 100)} %</span></div>
          <div className="traj-row"><span>TILT</span><span>{tilt >= 0 ? '+' : ''}{tilt.toFixed(1)}°</span></div>
          <div className="traj-row"><span>RCS L/R</span><span>{state.rcs.left ? 'L' : '-'}{state.rcs.right ? 'R' : '-'}</span></div>
        </div>

        <div className="traj-panel traj-panel-br">
          <div className="traj-panel-title">VEHICLE</div>
          <div className="traj-row"><span>ENGINE</span><span className={state.engineArmed ? 'ok' : 'warn'}>{state.engineArmed ? 'ARMED' : 'SAFE'}</span></div>
          <div className="traj-row"><span>FUEL</span><span className={fuel < 20 ? 'warn' : ''}>{fuel}%</span></div>
          <div className="traj-row"><span>PHASE TIME</span><span>{fmt(state.phaseRemaining)}s</span></div>
          <div className="traj-row"><span>TIME SCALE</span><span>{state.timeScale}x</span></div>
        </div>
      </div>
    </div>
  )
}
