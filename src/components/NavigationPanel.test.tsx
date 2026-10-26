import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { deriveNav } from '../sim/nav'
import { createInitialState } from '../sim/vehicle'
import NavigationPanel from './NavigationPanel'

describe('NavigationPanel', () => {
  it('renders navigation values and simulated sensor status', () => {
    const html = renderToStaticMarkup(
      <NavigationPanel nav={deriveNav(createInitialState())} />,
    )

    expect(html).toContain('Navigation')
    expect(html).toContain('ALT AGL')
    expect(html).toContain('15.00 km')
    expect(html).toContain('NAV MODE')
    expect(html).toContain('SIM')
  })
})
