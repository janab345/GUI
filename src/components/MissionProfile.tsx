import { formatClock, type PhaseSpec } from '../sim/vehicle'

interface MissionProfileProps {
  currentPhase: number
  phaseRemaining: number
  phases: readonly PhaseSpec[]
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
            key={phase.name}
            className={`phase ${i === currentPhase ? 'active' : ''} ${i < currentPhase ? 'complete' : ''}`}
          >
            <span className="phase-marker">{i < currentPhase ? '✓' : i + 1}</span>
            <span className="phase-info">
              <span className="phase-name">{phase.name}</span>
              <span className="phase-equipment">
                {phase.engines} ENG{phase.rcs > 0 ? ` · ${phase.rcs} RCS` : ''}
              </span>
            </span>
            <span className="phase-time">
              {i === currentPhase
                ? `T-${formatClock(phaseRemaining)}`
                : `T+${formatClock(phase.start)}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
