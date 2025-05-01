
export const PRICING_TIERS = {
  FREE_TRIAL: 'free_trial',
  STANDARD: 'standard',
  EXTENDED: 'extended'
} as const;

export type PricingTier = typeof PRICING_TIERS[keyof typeof PRICING_TIERS];

export const PRICING_DETAILS = {
  [PRICING_TIERS.FREE_TRIAL]: {
    duration: 0.5,
    price: 0,
    label: 'Free Trial',
    description: 'A quick taste of the experience, completely free.'
  },
  [PRICING_TIERS.STANDARD]: {
    duration: 3,
    price: 2.99,
    label: 'Standard',
    description: 'The perfect balance for a satisfying session.'
  },
  [PRICING_TIERS.EXTENDED]: {
    duration: 7,
    price: 6.49,
    label: 'Extended',
    description: 'Indulge longer for a deeper connection.'
  }
} as const;
