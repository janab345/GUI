import type { VehicleState } from '../sim/vehicle'

interface RawStatePanelProps {
  state: VehicleState
  onClose: () => void
}

export default function RawStatePanel({ state, onClose }: RawStatePanelProps) {
  return (
    <aside className="info-panel raw-state-panel" aria-label="Raw vehicle state">
      <header className="info-panel-header">
        <span className="info-panel-title">RAW STATE</span>
        <button
          type="button"
          className="info-close"
          onClick={onClose}
          title="Close (Enter)"
          aria-label="Close raw state"
        >
          ×
        </button>
      </header>

      <pre className="info-raw">{JSON.stringify(state, null, 2)}</pre>
      <footer className="info-hint">ENTER CLOSE</footer>
    </aside>
  )
}
