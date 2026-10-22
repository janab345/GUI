interface MissionProfileProps {
  currentPhase: number
  phases: string[]
}

export default function MissionProfile({ currentPhase, phases }: MissionProfileProps) {
  return (
    <div className="panel mission-profile">
      <h3>Mission Profile</h3>
      <div className="phase-list">
        {phases.map((phase, i) => (
          <div
            key={i}
            className={`phase ${i === currentPhase ? 'active' : ''} ${i < currentPhase ? 'complete' : ''}`}
          >
            <span className="phase-marker">{i < currentPhase ? '✓' : i + 1}</span>
            <span className="phase-name">{phase}</span>
            <span className="phase-time">T+{String(i * 5).padStart(2, '0')}:00</span>
          </div>
        ))}
      </div>
    </div>
  )
}
