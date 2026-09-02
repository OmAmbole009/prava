import { z } from "zod";
import { currencyCodes, formatMinorAmount } from "@shared/locale";

export const financialSummaryQuerySchema = z.object({
  businessId: z.number().int().positive(),
});

/**
 * This contract is intentionally server-only. A future document/ledger pipeline may
 * call it after calculation and professional verification; end users cannot submit
 * financial totals directly through the public workspace API.
 */
export const verifiedFinancialSummaryInputSchema = z.object({
  businessId: z.number().int().positive(),
  periodStart: z.date(),
  periodEnd: z.date(),
  currency: z.enum(currencyCodes).default("USD"),
  revenueMinor: z.number().int().nonnegative(),
  expensesMinor: z.number().int().nonnegative(),
  cashMinor: z.number().int(),
  gstPositionMinor: z.number().int(),
  receivablesMinor: z.number().int().nonnegative(),
  payablesMinor: z.number().int().nonnegative(),
});

export type VerifiedFinancialSummaryInput = z.infer<typeof verifiedFinancialSummaryInputSchema>;

export function formatMinor(minor: number, currency = "USD", locale = "en-US") {
  return formatMinorAmount(minor, currency, locale);
}
