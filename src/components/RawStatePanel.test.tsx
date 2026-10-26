import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createInitialState } from '../sim/vehicle'
import RawStatePanel from './RawStatePanel'

describe('RawStatePanel', () => {
  it('renders the raw vehicle state on demand', () => {
    const html = renderToStaticMarkup(
      <RawStatePanel state={createInitialState()} onClose={() => undefined} />,
    )

    expect(html).toContain('RAW STATE')
    expect(html).toContain('&quot;position&quot;')
    expect(html).toContain('15000')
    expect(html).toContain('ENTER CLOSE')
  })
})
