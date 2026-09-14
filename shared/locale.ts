export const countryOptions = [
  { code: "US", name: "United States", flag: "🇺🇸", symbol: "$", currency: "USD", locale: "en-US", timezone: "America/New_York", taxSystem: "Sales tax", fiscalYearStartMonth: 1 },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", symbol: "£", currency: "GBP", locale: "en-GB", timezone: "Europe/London", taxSystem: "VAT", fiscalYearStartMonth: 4 },
  { code: "CA", name: "Canada", flag: "🇨🇦", symbol: "C$", currency: "CAD", locale: "en-CA", timezone: "America/Toronto", taxSystem: "GST / HST", fiscalYearStartMonth: 1 },
  { code: "AU", name: "Australia", flag: "🇦🇺", symbol: "A$", currency: "AUD", locale: "en-AU", timezone: "Australia/Sydney", taxSystem: "GST", fiscalYearStartMonth: 7 },
  { code: "SG", name: "Singapore", flag: "🇸🇬", symbol: "S$", currency: "SGD", locale: "en-SG", timezone: "Asia/Singapore", taxSystem: "GST", fiscalYearStartMonth: 1 },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪", symbol: "AED", currency: "AED", locale: "en-AE", timezone: "Asia/Dubai", taxSystem: "VAT", fiscalYearStartMonth: 1 },
  { code: "DE", name: "Germany", flag: "🇩🇪", symbol: "€", currency: "EUR", locale: "de-DE", timezone: "Europe/Berlin", taxSystem: "VAT", fiscalYearStartMonth: 1 },
  { code: "FR", name: "France", flag: "🇫🇷", symbol: "€", currency: "EUR", locale: "fr-FR", timezone: "Europe/Paris", taxSystem: "VAT", fiscalYearStartMonth: 1 },
  { code: "JP", name: "Japan", flag: "🇯🇵", symbol: "¥", currency: "JPY", locale: "ja-JP", timezone: "Asia/Tokyo", taxSystem: "Consumption tax", fiscalYearStartMonth: 4 },
  { code: "BR", name: "Brazil", flag: "🇧🇷", symbol: "R$", currency: "BRL", locale: "pt-BR", timezone: "America/Sao_Paulo", taxSystem: "Consumption taxes", fiscalYearStartMonth: 1 },
  { code: "ZA", name: "South Africa", flag: "🇿🇦", symbol: "R", currency: "ZAR", locale: "en-ZA", timezone: "Africa/Johannesburg", taxSystem: "VAT", fiscalYearStartMonth: 3 },
  { code: "IN", name: "India", flag: "🇮🇳", symbol: "₹", currency: "INR", locale: "en-IN", timezone: "Asia/Kolkata", taxSystem: "GST", fiscalYearStartMonth: 4 },
] as const;

export type CountryCode = (typeof countryOptions)[number]["code"];
export type CurrencyCode = (typeof countryOptions)[number]["currency"];
export type CountryProfile = (typeof countryOptions)[number];

export const countryCodes = countryOptions.map(country => country.code) as [CountryCode, ...CountryCode[]];
export const currencyCodes = ["USD", "GBP", "CAD", "AUD", "SGD", "AED", "EUR", "JPY", "BRL", "ZAR", "INR"] as [CurrencyCode, ...CurrencyCode[]];
export const defaultCountry = countryOptions[0];
export const countryByCode = Object.fromEntries(countryOptions.map(country => [country.code, country])) as Record<CountryCode, CountryProfile>;

export function profileForCountry(code: string) {
  return countryByCode[code as CountryCode] ?? defaultCountry;
}

export function getCurrencySymbol(currency: string) {
  const match = countryOptions.find(c => c.currency === currency);
  return match?.symbol ?? "$";
}

// ─── Exchange Rates & Dynamic Conversion ─────────────────────────────────────
export const DEFAULT_EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.36,
  AUD: 1.53,
  SGD: 1.34,
  AED: 3.67,
  JPY: 149.5,
  BRL: 4.97,
  ZAR: 18.6,
  INR: 83.5,
};

let liveExchangeRates: Record<string, number> = { ...DEFAULT_EXCHANGE_RATES };

export function setLiveExchangeRates(rates: Record<string, number>) {
  if (rates && typeof rates === "object") {
    liveExchangeRates = { ...DEFAULT_EXCHANGE_RATES, ...rates };
  }
}

export function getLiveExchangeRates(): Record<string, number> {
  return { ...liveExchangeRates };
}

/**
 * Converts a minor amount from one currency to another using exchange rates against USD base.
 * @param minor The integer minor amount (e.g. 12500000 cents)
 * @param fromCurrency The original currency code (default: USD)
 * @param toCurrency The target currency code (e.g. INR, EUR, JPY)
 */
export function convertCurrencyMinor(minor: number, fromCurrency = "USD", toCurrency = "USD"): number {
  if (!minor || fromCurrency === toCurrency) return minor;
  const fromRate = liveExchangeRates[fromCurrency] ?? DEFAULT_EXCHANGE_RATES[fromCurrency] ?? 1;
  const toRate = liveExchangeRates[toCurrency] ?? DEFAULT_EXCHANGE_RATES[toCurrency] ?? 1;
  // Convert from origin to USD, then from USD to target
  const converted = Math.round(minor * (toRate / fromRate));
  return converted;
}

export function formatMinorAmount(minor: number, currency: string, locale = "en-US", fromCurrency = currency) {
  const converted = convertCurrencyMinor(minor, fromCurrency, currency);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "JPY" ? 0 : 2,
  }).format(converted / 100);
}

export function formatWorkspaceDate(value: Date | string | number, locale = "en-US", timezone = "UTC") {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(new Date(value));
}
