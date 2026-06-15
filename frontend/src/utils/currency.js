export const CURRENCY_LABELS = { usd: 'USD', usc: 'USC' }
export const USC_PER_USD = 100

export function currencyLabel(code = 'usd') {
  return CURRENCY_LABELS[code] ?? 'USD'
}

export function toUsd(value, currency = 'usd') {
  if (currency === 'usc') return value / USC_PER_USD
  return value
}

export function formatMoney(value, currency = 'usd', { showSign = true } = {}) {
  const label = currencyLabel(currency)
  const sign = showSign && value > 0 ? '+' : ''
  return `${sign}${Number(value).toFixed(2)} ${label}`
}

export function formatUsdEquivalent(value, currency = 'usd', { showSign = true } = {}) {
  if (currency !== 'usc') return null
  const usd = toUsd(value, currency)
  const sign = showSign && usd > 0 ? '+' : ''
  return `${sign}${usd.toFixed(2)} USD`
}
