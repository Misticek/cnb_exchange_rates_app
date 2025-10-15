export interface ExchangeRate {
  country: string
  currency: string
  amount: number
  currencyCode: string
  rate: number
}

export interface ExchangeRatesResponse {
  date: string // ISO date (YYYY-MM-DD)
  rates: ExchangeRate[]
}
