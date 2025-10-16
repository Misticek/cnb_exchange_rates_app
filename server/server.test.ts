import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { CNBServer } from './server'
import type { ExchangeRate } from '../common/types/exchange'

const sampleDailyText = `15 Oct 2025 # Daily rates\nCountry|Currency|Amount|Code|Rate\nUnited States|Dollar|1|USD|23.500\nEurozone|Euro|1|EUR|25.800\nJapan|Yen|100|JPY|15.800\n`

function mockFetchSuccess(text: string, contentType = 'text/plain') {
  ;(global as any).fetch = async () => ({
    ok: true,
    status: 200,
    headers: { get: (k: string) => (k === 'content-type' ? contentType : null) },
    text: async () => text,
  })
}

function mockFetchFailure(status = 500) {
  ;(global as any).fetch = async () => ({
    ok: false,
    status,
    headers: { get: () => 'text/plain' },
    text: async () => 'error',
  })
}

function mockFetchWrongContentType() {
  ;(global as any).fetch = async () => ({
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    text: async () => '{}',
  })
}

beforeEach(() => {
  process.env.NODE_ENV = 'test'
  process.env.CNB_DAILY_URL = 'https://example.test/daily.txt'
})

describe('CNBServer parsing utilities', () => {
  it('parses a valid date line', () => {
    const d = CNBServer.parseHeaderDateToISO('15 Oct 2025 # comment')
    expect(d.format('YYYY-MM-DD')).toBe('2025-10-15')
  })

  it('parses a valid date line without separator', () => {
    const d = CNBServer.parseHeaderDateToISO('15 Oct 2025')
    expect(d.format('YYYY-MM-DD')).toBe('2025-10-15')
  })

  it('throws on invalid date line', () => {
    expect(() => CNBServer.parseHeaderDateToISO('BadDate 2025')).toThrow(/Invalid date format/)
    expect(() => CNBServer.parseHeaderDateToISO('')).toThrow(/Invalid date format/)
  })

  it('extracts header indexes correctly', () => {
    const idx = CNBServer.getHeaderIndexes('Country|Currency|Amount|Code|Rate')
    expect(idx.country).toBe(0)
    expect(idx.rate).toBe(4)
  })

  it('throws when headers missing', () => {
    expect(() => CNBServer.getHeaderIndexes('Country|Currency|Amount|Rate')).toThrow(/Missing required headers/)
  })

  it('parses full daily text to JSON structure', () => {
    const json = CNBServer.parseDailyTxtToJson(sampleDailyText)
    expect(json.date).toBe('2025-10-15')
    expect(json.rates.length).toBe(3)
    const jpy: ExchangeRate | undefined = json.rates.find((r: ExchangeRate) => r.currencyCode === 'JPY')
    expect(jpy).toBeDefined()
    expect(jpy!.amount).toBe(100)
    expect(jpy!.rate).toBe(15.8)
  })
})

describe('CNBServer fetchCNBData()', () => {
  it('returns parsed data on success', async () => {
    mockFetchSuccess(sampleDailyText)
    const server = new CNBServer({ port: 0, cnbUrl: process.env.CNB_DAILY_URL! })
    const data = await server.fetchCNBData()
    expect(data.rates.some((r: ExchangeRate) => r.currencyCode === 'USD')).toBe(true)
  })

  it('throws on non-ok response', async () => {
    mockFetchFailure(503)
    const server = new CNBServer({ port: 0, cnbUrl: process.env.CNB_DAILY_URL! })
    await expect(server.fetchCNBData()).rejects.toThrow(/CNB response HTTP 503/)
  })

  it('throws on unexpected content type', async () => {
    mockFetchWrongContentType()
    const server = new CNBServer({ port: 0, cnbUrl: process.env.CNB_DAILY_URL! })
    await expect(server.fetchCNBData()).rejects.toThrow(/Unexpected content type/)
  })
})

describe('HTTP endpoints', () => {
  it('/health returns ok', async () => {
    mockFetchSuccess(sampleDailyText)
    const srv = new CNBServer({ port: 0, cnbUrl: process.env.CNB_DAILY_URL! })
    const res = await request(srv.getApp()).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })

  it('/api/cnb/daily returns exchange data', async () => {
    mockFetchSuccess(sampleDailyText)
    const srv = new CNBServer({ port: 0, cnbUrl: process.env.CNB_DAILY_URL! })
    const res = await request(srv.getApp()).get('/api/cnb/daily')
    expect(res.status).toBe(200)
    expect(res.body.date).toBe('2025-10-15')
    expect(res.body.rates.length).toBe(3)
  })

  it('/api/cnb/daily handles fetch failure', async () => {
    mockFetchFailure(500)
    const srv = new CNBServer({ port: 0, cnbUrl: process.env.CNB_DAILY_URL! })
    const res = await request(srv.getApp()).get('/api/cnb/daily')
    expect(res.status).toBe(500)
    expect(res.body.error).toMatch(/Server error processing exchange rate data/)
  })
})
