import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AppRoot from './App'

function mockFetchOnce(payload: any, ok = true, status = 200) {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok,
    status,
    json: async () => payload,
  })))
}

describe('AppRoot tests', () => {
  beforeAll(() => {
    mockFetchOnce({
      date: '2025-01-15',
      rates: [
        { country: 'United States', currency: 'Dollar', amount: 1, currencyCode: 'USD', rate: 23.5 },
        { country: 'Eurozone', currency: 'Euro', amount: 1, currencyCode: 'EUR', rate: 25.8 }
      ],
    })
  })
  
  it('shows loading then data and initial currency selection', async () => {

    render(<AppRoot/>)
    expect(screen.getByText(/Loading latest rates/i)).toBeInTheDocument()

    const sourceLine = await screen.findByText(/Source: CNB daily rates/i)
    expect(sourceLine).toHaveTextContent(/2025-01-15/)

    const select = screen.getByLabelText(/Currency/i) as HTMLSelectElement
    expect(select.value).toBe('USD')

    const convertedBox = screen.getByTestId('converted-box')
    expect(convertedBox).toHaveTextContent('0 USD')
  })

  it('computes converted amount after entering CZK value (USD)', async () => {

    render(<AppRoot/>)
    await screen.findByText(/2025-01-15/)

    const input = screen.getByLabelText(/Amount in CZK/i)
    await userEvent.clear(input)
    await userEvent.type(input, '1000')

    await waitFor(() => {
      const convertedBox = screen.getByTestId('converted-box')
      expect(convertedBox).toHaveTextContent(/42\.55.* USD$/)
    })
  })

  it('switching currency recomputes value (EUR)', async () => {
    render(<AppRoot/>)
    await screen.findByText(/2025-01-15/)

    const input = screen.getByLabelText(/Amount in CZK/i)

    await userEvent.type(input, '1000')

    const select = screen.getByLabelText(/Currency/i)
    await userEvent.selectOptions(select, 'EUR')
    await waitFor(() => {
      const convertedBox = screen.getByTestId('converted-box')
      expect(convertedBox).toHaveTextContent(/38\.75.* EUR$/)
    })
  })
})
