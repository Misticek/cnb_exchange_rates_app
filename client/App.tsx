import React, { useEffect, useMemo, useState } from 'react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'

import type { ExchangeRate, ExchangeRatesResponse } from '../common/types/exchange'
import {
  AppContainer,
  ConvertedBox,
  ErrorText,
  Grid,
  GridSpan2,
  Input,
  Label,
  RatesTitle,
  ScrollX,
  Select,
  Table,
  Td,
  TdRight,
  ThLeft,
  ThRight
} from './styles'

const API_RATES_URL = import.meta.env.API_RATES_URL || 'http://127.0.0.1:3003/api/cnb/daily'

function App() {
  const [czkAmount, setCzkAmount] = useState('')
  const [code, setCode] = useState('')

  const { data, isLoading, error } = useQuery<ExchangeRatesResponse>({
    queryKey: ['cnbRates'],
    queryFn: async () => {
      const res = await fetch(API_RATES_URL, { cache: 'no-cache' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    },
  })

  // Set initial selected currency when data loads
  useEffect(() => {
    if (data?.rates?.length && !code) {
      setCode(data.rates[0].currencyCode)
    }
  }, [data, code])

  const selectedRate = useMemo(
    () => data?.rates?.find((rate: ExchangeRate) => rate.currencyCode === code) || null,
    [data?.rates, code]
  )

  const converted = useMemo(() => {
    // TODO: Alternatively this could be in separate method so that it can be tested
    const amountCzk = Number(String(czkAmount).replace(',', '.'))
    if (!selectedRate || !isFinite(amountCzk)) return null
    return amountCzk * (selectedRate.amount / selectedRate.rate)
  }, [czkAmount, selectedRate])

  const getErrorMessage = (message?: string) => {
    return <ErrorText>Error: {message || 'Unknown error'}</ErrorText>
  }

  return (
    <AppContainer>
      <h1>Czech National Bank Exchange Rates</h1>
      {isLoading && <p>Loading latest rates…</p>}
      {error && getErrorMessage(error.message)}
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
                value={code}
                onChange={e => setCode(e.target.value)}
              >
                {data.rates.map((r: ExchangeRate) => (
                  <option key={r.currencyCode} value={r.currencyCode}>{r.currencyCode} — {r.currency}</option>
                ))}
              </Select>
            </div>
            <GridSpan2>
              <Label>Converted amount</Label>
              <ConvertedBox
                data-testid="converted-box">
                {converted == null || isNaN(converted) ? (
                  '-'
                ) : (
                  <strong>{converted.toLocaleString(undefined, { maximumFractionDigits: 4 })} {code}</strong>
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
              {data.rates.map((rate: ExchangeRate) => (
                <tr key={rate.currencyCode}>
                  <Td>{rate.country}</Td>
                  <Td>{rate.currency}</Td>
                  <TdRight>{rate.amount}</TdRight>
                  <Td>{rate.currencyCode}</Td>
                  <TdRight>{rate.rate.toLocaleString(undefined, {
                    minimumFractionDigits: 3,
                    maximumFractionDigits: 3
                  })}</TdRight>
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

export { App }

function AppRoot({ client }: { client?: QueryClient }) {
  const queryClient = client || new QueryClient({
    defaultOptions: {
      queries: {
        retry: 2,
        staleTime: 0, // force refetch per test instance
        refetchOnWindowFocus: false,
      },
    },
  })
  return (
    <QueryClientProvider client={queryClient}>
      <App/>
    </QueryClientProvider>
  )
}

export default AppRoot
