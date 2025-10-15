import React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'

import type { ExchangeRate, ExchangeRatesResponse } from '../common/types/exchange'
import { AppContainer, ErrorText, Grid, GridSpan2, Label, Input, Select, ConvertedBox, RatesTitle, ScrollX, Table, ThLeft, ThRight, Td, TdRight } from './styles'

const RATES_URL = import.meta.env.VITE_CNB_URL || 'http://127.0.0.1:3003/api/cnb/daily'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  const [czkAmount, setCzkAmount] = useState('')
  const [selectedCode, setSelectedCode] = useState('')

  // Use React Query to fetch exchange rates
  const { data, isLoading, error } = useQuery({
    queryKey: ['cnbRates'],
    queryFn: async () => {
      const res = await fetch(RATES_URL, { cache: 'no-cache' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const rawData = await res.json()
      return rawData
    },
  })

  // Set initial selected currency when data loads
  useEffect(() => {
    if (data?.rates?.length && !selectedCode) {
      setSelectedCode(data.rates[0].currencyCode)
    }
  }, [data, selectedCode])

  const selectedRate = useMemo(
    () => data?.rates?.find(r => r.currencyCode === selectedCode) || null,
    [data?.rates, selectedCode]
  )

  const converted = useMemo(() => {
    const amountCzk = Number(String(czkAmount).replace(',', '.'))
    if (!selectedRate || !isFinite(amountCzk)) return null
    // CNB rate = CZK per "amount" units of currency
    // 1 foreign unit costs (rate/amount) CZK. For CZK -> foreign: amountCzk / (rate/amount)
    const result = amountCzk * (selectedRate.amount / selectedRate.rate)
    return result
  }, [czkAmount, selectedRate])

  return (
    <AppContainer>
      <h1>Czech National Bank Exchange Rates</h1>
      {isLoading && <p>Loading latest rates…</p>}
      {error && (
        <ErrorText>Error: {error instanceof Error ? error.message : 'Failed to load rates'}</ErrorText>
      )}
      {!isLoading && !error && data && (
        <>
          <p style={{ marginTop: 0 }}>Source: CNB daily rates — {data.date}</p>

          <Grid>
            <div>
              <Label htmlFor="czk">Amount in CZK</Label>
              <Input
                id="czk"
                type="number"
                inputMode="decimal"
                placeholder="1000"
                value={czkAmount}
                onChange={e => setCzkAmount(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="code">Currency</Label>
              <Select
                id="code"
                value={selectedCode}
                onChange={e => setSelectedCode(e.target.value)}
              >
                {data.rates.map((r: ExchangeRate) => (
                  <option key={r.currencyCode} value={r.currencyCode}>{r.currencyCode} — {r.currency}</option>
                ))}
              </Select>
            </div>
            <GridSpan2>
              <Label>Converted amount</Label>
              <ConvertedBox>
                {converted == null || isNaN(converted) ? (
                  '-'
                ) : (
                  <strong>{converted.toLocaleString(undefined, { maximumFractionDigits: 4 })} {selectedCode}</strong>
                )}
              </ConvertedBox>
            </GridSpan2>
          </Grid>

          <RatesTitle>Rates list</RatesTitle>
          <ScrollX>
            <Table>
              <thead>
              <tr>
                <ThLeft>Country</ThLeft>
                <ThLeft>Currency</ThLeft>
                <ThRight>Amount</ThRight>
                <ThLeft>Code</ThLeft>
                <ThRight>Rate (CZK)</ThRight>
              </tr>
              </thead>
              <tbody>
              {data.rates.map((r: ExchangeRate) => (
                <tr key={r.currencyCode}>
                  <Td>{r.country}</Td>
                  <Td>{r.currency}</Td>
                  <TdRight>{r.amount}</TdRight>
                  <Td>{r.currencyCode}</Td>
                  <TdRight>{r.rate.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</TdRight>
                </tr>
              ))}
              </tbody>
            </Table>
          </ScrollX>
        </>
      )}
    </AppContainer>
  )
}

function AppRoot() {
  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  )
}

export default AppRoot
