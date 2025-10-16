import dayjs from 'dayjs'
import express from 'express'
import type { Request, Response } from 'express'
import type { ExchangeRate, ExchangeRatesResponse } from '../common/types/exchange'
import dotenv from 'dotenv'

dotenv.config()

interface CNBServerOptions {
  port?: number | string
  cnbUrl?: string
}

export class CNBServer {
  private readonly port: number
  private readonly cnbUrl: string
  private readonly app: express.Express

  constructor({ port, cnbUrl }: CNBServerOptions) {
    if (!port) {
      console.error('Error: PORT environment variable is not set.')
      throw new Error('Port is required')
    }
    if (!cnbUrl) {
      console.error('Error: CNB_DAILY_URL environment variable is not set.')
      throw new Error('CNB_DAILY_URL environment variable is not set.')
    }
    this.port = Number(port)
    this.cnbUrl = cnbUrl
    this.app = express()

    this.setupMiddleware()
    this.setupRoutes()
  }

  getApp(): express.Express {
    return this.app
  }

  private setupMiddleware(): void {
    this.app.use((_req, res, next) => {
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.setHeader('Cache-Control', 'public, max-age=300')
      res.setHeader('Access-Control-Allow-Origin', '*')
      next();
    });
  }

  static parseHeaderDateToISO(firstLine: string): dayjs.Dayjs {
    const datePart = firstLine.split('#')[0]?.trim()
    // Strict pattern: e.g. 15 Oct 2025
    const datePattern = /^\d{1,2} [A-Za-z]{3} \d{4}$/
    if (!datePattern.test(datePart)) {
      throw new Error(`Invalid date format in CNB data: ${datePart}`)
    }
    const parsed = dayjs(datePart, 'D MMM YYYY', true)
    if (!parsed.isValid()) {
      throw new Error(`Invalid date format in CNB data: ${datePart}`)
    }
    return parsed
  }

  static getHeaderIndexes(headerLine: string) {
    const headerParts = headerLine.split('|').map(s => s.trim().toLowerCase())
    const indexes = {
      country: headerParts.indexOf('country'),
      currency: headerParts.indexOf('currency'),
      amount: headerParts.indexOf('amount'),
      code: headerParts.indexOf('code'),
      rate: headerParts.indexOf('rate'),
    }
    const missingHeaders = Object.entries(indexes)
      .filter(([_, index]) => index === -1)
      .map(([name]) => name)
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required headers in CNB data: ${missingHeaders.join(', ')}`)
    }
    return indexes
  }

  static parseCurrencyRateData(parts: string[], idx: ReturnType<typeof CNBServer.getHeaderIndexes>): ExchangeRate | null {
    if (!Array.isArray(parts)) return null
    const amountStr = parts[idx.amount] || '1'
    const code = parts[idx.code] || ''
    const rateStr = parts[idx.rate] || ''
    const amount = Number(amountStr)
    const rate = Number(rateStr)
    if (!code || !isFinite(amount) || !isFinite(rate) || amount <= 0 || rate <= 0) return null
    return {
      country: (parts[idx.country] || ''),
      currency: (parts[idx.currency] || ''),
      amount,
      currencyCode: code,
      rate
    }
  }

  static parseDailyTxtToJson(text: string): ExchangeRatesResponse {
    const lines = text.split(/\r?\n/).filter(Boolean)
    if (lines.length < 3) return { date: '', rates: [] }
    try {
      const currencyDate = CNBServer.parseHeaderDateToISO(lines[0] ?? '')
      const idx = CNBServer.getHeaderIndexes(lines[1] ?? '')
      const rates = lines.slice(2)
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => CNBServer.parseCurrencyRateData(line.split('|').map(s => s.trim()), idx))
        .filter(Boolean) as ExchangeRate[]
      return { date: currencyDate.format('YYYY-MM-DD'), rates }
    } catch (error) {
      console.error('Error parsing CNB data:', error)
      return { date: '', rates: [] }
    }
  }

  async fetchCNBData(): Promise<ExchangeRatesResponse> {
    const cnbResponse = await fetch(this.cnbUrl)
    if (!cnbResponse.ok) {
      throw new Error(`CNB response HTTP ${cnbResponse.status}`)
    }
    const contentType = cnbResponse.headers.get('content-type') || ''
    if (!contentType.includes('text/plain') && !contentType.includes('text/html')) {
      throw new Error(`Unexpected content type: ${contentType}`)
    }
    return CNBServer.parseDailyTxtToJson(await cnbResponse.text())
  }

  setupRoutes(): void {
    this.app.get('/api/cnb/daily', async (_req: Request, res: Response) => {
      try {
        const data = await this.fetchCNBData()
        res.json(data)
      } catch (e: any) {
        console.error('CNB API error:', e)
        res.status(500).json({
          error: 'Server error processing exchange rate data',
          timestamp: new Date().toISOString()
        })
      }
    })
    this.app.get('/health', (_req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() })
    })
  }

  start(): void {
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error)
    })
    this.app.listen(this.port, () => {
      console.log(`CNB Exchange rates: Server running on http://localhost:${this.port}`)
    })
  }
}

// Only auto-start outside test environment
if (process.env.NODE_ENV !== 'test') {
  const server = new CNBServer({ port: process.env.PORT, cnbUrl: process.env.CNB_DAILY_URL })
  server.start()
}
