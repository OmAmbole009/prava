/**
 * useCurrencyRates.ts
 * 
 * Fetches live exchange rates from exchangerate-api.com (free, no key needed for basic)
 * Falls back to approximate static rates if offline.
 * Converts any minor (integer) amount to a target currency.
 */
import { useEffect, useState, useCallback } from "react";
import { setLiveExchangeRates } from "@shared/locale";

// Free endpoint — no API key needed, updated every 24h
// Using open.er-api.com which is CORS-friendly
const API_URL = "https://open.er-api.com/v6/latest/USD";

// Fallback approximate rates (against USD, updated 2026)
const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83.5,
  CAD: 1.36,
  AUD: 1.53,
  JPY: 149.5,
  CNY: 7.24,
  SGD: 1.34,
  AED: 3.67,
  CHF: 0.9,
  MXN: 17.1,
  BRL: 4.97,
  ZAR: 18.6,
  KRW: 1330,
  IDR: 15700,
  THB: 35.1,
  MYR: 4.72,
  PHP: 56.4,
  NGN: 1580,
  KES: 131,
  EGP: 30.9,
  SAR: 3.75,
  QAR: 3.64,
  PKR: 278,
  BDT: 110,
  VND: 24800,
  HKD: 7.83,
  TWD: 31.5,
  NZD: 1.63,
  SEK: 10.4,
  NOK: 10.6,
  DKK: 6.88,
  PLN: 3.95,
  CZK: 22.7,
  HUF: 357,
  RON: 4.57,
  BGN: 1.8,
  HRK: 6.9,
  RUB: 91,
  TRY: 32.5,
  UAH: 37.5,
  ILS: 3.65,
  MAD: 10.0,
  TND: 3.12,
};

interface RatesState {
  rates: Record<string, number>;
  baseCurrency: string; // always "USD"
  lastUpdated: Date | null;
  loading: boolean;
  error: boolean;
}

let cachedRates: Record<string, number> | null = null;
let cacheTime = 0;
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

export function useCurrencyRates() {
  const [state, setState] = useState<RatesState>({
    rates: FALLBACK_RATES,
    baseCurrency: "USD",
    lastUpdated: null,
    loading: true,
    error: false,
  });

  useEffect(() => {
    // Use cached rates if fresh
    if (cachedRates && Date.now() - cacheTime < CACHE_TTL) {
      setState({ rates: cachedRates, baseCurrency: "USD", lastUpdated: new Date(cacheTime), loading: false, error: false });
      return;
    }

    let cancelled = false;
    fetch(API_URL, { signal: AbortSignal.timeout(5000) })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.rates && typeof data.rates === "object") {
          const merged: Record<string, number> = { ...FALLBACK_RATES, ...data.rates };
          cachedRates = merged;
          cacheTime = Date.now();
          setLiveExchangeRates(merged);
          setState({ rates: merged, baseCurrency: "USD", lastUpdated: new Date(), loading: false, error: false });
        }
      })
      .catch(() => {
        if (cancelled) return;
        setState((s) => ({ ...s, rates: FALLBACK_RATES, loading: false, error: true }));
      });

    return () => { cancelled = true; };
  }, []);

  /**
   * Convert a "minor" (integer cents/paise) amount from `fromCurrency` to `toCurrency`.
   * Returns the converted minor integer.
   */
  const convertMinor = useCallback(
    (minorAmount: number, fromCurrency: string, toCurrency: string): number => {
      if (fromCurrency === toCurrency) return minorAmount;
      const fromRate = state.rates[fromCurrency] ?? 1;
      const toRate = state.rates[toCurrency] ?? 1;
      // minorAmount is in fromCurrency. Convert to USD first, then to toCurrency.
      // Minor amounts are in integer paise/cents (divide by 100 to get major)
      return Math.round(minorAmount * (toRate / fromRate));
    },
    [state.rates]
  );

  /**
   * Get the exchange rate between two currencies (how much 1 unit of `from` costs in `to`).
   */
  const getRate = useCallback(
    (from: string, to: string): number => {
      const fromRate = state.rates[from] ?? 1;
      const toRate = state.rates[to] ?? 1;
      return toRate / fromRate;
    },
    [state.rates]
  );

  return { ...state, convertMinor, getRate };
}
