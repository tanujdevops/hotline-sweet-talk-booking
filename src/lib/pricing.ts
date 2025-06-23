
export const PRICING_TIERS = {
  FREE_TRIAL: 'free_trial',
  ESSENTIAL: 'essential',
  DELUXE: 'deluxe'
} as const;

export type PricingTier = typeof PRICING_TIERS[keyof typeof PRICING_TIERS];

export const PRICING_DETAILS = {
  [PRICING_TIERS.FREE_TRIAL]: {
    duration: 0.5,
    price: 0,
    label: 'Free Trial',
    description: 'A quick taste of the experience, completely free.'
  },
  [PRICING_TIERS.ESSENTIAL]: {
    duration: 3,
    price: 2.49,
    label: 'Essential',
    description: 'Perfect for a focused 3-minute conversation.'
  },
  [PRICING_TIERS.DELUXE]: {
    duration: 7,
    price: 4.99,
    label: 'Deluxe',
    description: 'Extended 7-minute session for deeper connection.'
  }
} as const;
