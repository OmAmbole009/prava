import { z } from "zod";
import { countryCodes, currencyCodes } from "@shared/locale";

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().transform(value => value || undefined);

export const businessInputSchema = z.object({
  name: z.string().trim().min(2, "Enter a business name").max(160),
  legalName: optionalText(200),
  businessType: z.string().trim().min(2, "Select a business type").max(96),
  industry: z.string().trim().min(2, "Select an industry").max(120),
  email: optionalText(320).pipe(z.string().email("Enter a valid email").optional()),
  phone: optionalText(32),
  addressLine1: optionalText(200),
  city: optionalText(96),
  state: optionalText(96),
  postalCode: optionalText(24),
  country: z.enum(countryCodes).default("US"),
  gstStatus: z.enum(["registered", "not_registered", "pending"]).default("not_registered"),
  gstin: optionalText(32).transform(value => value?.toUpperCase()),
  taxSystem: z.string().trim().min(2).max(64).default("Sales tax"),
  financialYear: z.string().trim().max(32).default("January–December"),
  currency: z.enum(currencyCodes).default("USD"),
  locale: z.string().trim().regex(/^[a-z]{2,3}(-[A-Z]{2})?$/, "Enter a valid locale").default("en-US"),
  timezone: z.string().trim().min(1).max(64).default("America/New_York"),
});

export const updateOnboardingSchema = businessInputSchema.extend({
  businessId: z.number().int().positive(),
  complete: z.boolean().default(false),
});

export const updateBusinessProfileSchema = z.object({
  businessId: z.number().int().positive(),
  country: z.enum(countryCodes).optional(),
  currency: z.enum(currencyCodes).optional(),
  taxSystem: z.string().trim().min(1).max(64).optional(),
  locale: z.string().trim().regex(/^[a-z]{2,3}(-[A-Z]{2})?$/).optional(),
  timezone: z.string().trim().min(1).max(64).optional(),
  name: z.string().trim().min(2).max(160).optional(),
  gstStatus: z.enum(["registered", "not_registered", "pending"]).optional(),
  gstin: optionalText(32).transform(value => value?.toUpperCase()),
});

export type BusinessInput = z.infer<typeof businessInputSchema>;

