import express, { Request, Response } from 'express'
import type { ExchangeRate, ExchangeRatesResponse } from './src/types/exchange'

interface CNBServerOptions {
  port?: number | string
  cnbUrl: string
}

class CNBServer {
  private port: number
  private cnbUrl: string
  private app: express.Express

  constructor({ port, cnbUrl }: CNBServerOptions) {
    this.port = typeof port === 'string' ? parseInt(port, 10) : (port || 3003)
    this.cnbUrl = cnbUrl
    this.app = express()
    this.setupRoutes()
  }

  static parseDateToISO(firstLine: string): string {
    try {
      const datePart = firstLine.split('#')[0].trim()
      const d = new Date(datePart)
      if (!isNaN(d.getTime())) {
        const yyyy = d.getFullYear()
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        return `${yyyy}-${mm}-${dd}`
      }
    } catch {}
    return ''
  }

  static parseDailyTxtToJson(text: string): ExchangeRatesResponse {
    const lines = text.split(/\r?\n/).filter(Boolean)
    if (lines.length < 3) {
      return { date: '', rates: [] }
    }
    const firstLine = lines[0]
    const dateISO = CNBServer.parseDateToISO(firstLine)
    const header = lines[1]
    const headerParts = header.split('|').map(s => s.trim().toLowerCase())
    const idx = {
      country: headerParts.indexOf('country'),
      currency: headerParts.indexOf('currency'),
      amount: headerParts.indexOf('amount'),
      code: headerParts.indexOf('code'),
      rate: headerParts.indexOf('rate'),
    }
    const rates: ExchangeRate[] = []
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      const parts = line.split('|').map(s => s.trim())
      const country = parts[idx.country] || ''
      const currency = parts[idx.currency] || ''
      const amountStr = parts[idx.amount] || '1'
      const code = parts[idx.code] || ''
      const rateStr = parts[idx.rate] || ''
      const amount = Number(amountStr.replace(',', '.'))
      const rate = Number(rateStr.replace(',', '.'))
      if (!code || !isFinite(amount) || !isFinite(rate)) continue
      rates.push({
        country,
        currency,
        amount,
        currencyCode: code,
        rate,
        validFor: dateISO,
      })
    }
    return { date: dateISO, rates }
  }

  setupRoutes(): void {
    this.app.get('/api/cnb/daily', async (req: Request, res: Response) => {
      try {
        const upstream = await fetch(this.cnbUrl, {
          headers: {
            'User-Agent': 'CNB-Rates-App/1.0 (+https://localhost)'
          }
        })
        if (!upstream.ok) {
          return res.status(upstream.status).json({ error: `Upstream HTTP ${upstream.status}` })
        }
        const text = await upstream.text()
        const json = CNBServer.parseDailyTxtToJson(text)
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.setHeader('Cache-Control', 'public, max-age=300')
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.send(JSON.stringify(json))
      } catch (e: any) {
        res.status(500).json({ error: e?.message || 'Server error' })
      }
    })
    this.app.get('/api/health', (req: Request, res: Response) => {
      res.json({ ok: true })
    })
  }

  start(): void {
    this.app.listen(this.port, () => {
      console.log(`CNB tiny backend listening on http://localhost:${this.port}`)
    })
  }
}

const PORT = process.env.PORT || 3003
const CNB_DAILY_URL = 'https://www.cnb.cz/en/financial-markets/foreign-exchange-market/central-bank-exchange-rate-fixing/central-bank-exchange-rate-fixing/daily.txt'

const server = new CNBServer({ port: PORT, cnbUrl: CNB_DAILY_URL })
server.start()
