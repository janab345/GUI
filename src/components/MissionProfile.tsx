import { formatClock, PHASE_SECONDS } from '../sim/vehicle'

interface MissionProfileProps {
  currentPhase: number
  phaseRemaining: number
  phases: readonly string[]
}

export default function MissionProfile({
  currentPhase,
  phaseRemaining,
  phases,
}: MissionProfileProps) {
  return (
    <div className="panel mission-profile">
      <h3>Mission Profile</h3>
      <div className="phase-list">
        {phases.map((phase, i) => (
          <div
            key={phase}
            className={`phase ${i === currentPhase ? 'active' : ''} ${i < currentPhase ? 'complete' : ''}`}
          >
            <span className="phase-marker">{i < currentPhase ? '✓' : i + 1}</span>
            <span className="phase-name">{phase}</span>
            <span className="phase-time">
              {i === currentPhase
                ? `T-${formatClock(phaseRemaining)}`
                : `T+${formatClock(i * PHASE_SECONDS)}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
