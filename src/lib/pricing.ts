
export const PRICING_TIERS = {
  FREE_TRIAL: 'free_trial',
  PREMIUM: 'premium',
  UNLIMITED: 'unlimited'
} as const;

export type PricingTier = typeof PRICING_TIERS[keyof typeof PRICING_TIERS];

export const PRICING_DETAILS = {
  [PRICING_TIERS.FREE_TRIAL]: {
    duration: 0.5,
    price: 0,
    label: 'Free Trial',
    description: 'A quick taste of the experience, completely free.'
  },
  [PRICING_TIERS.PREMIUM]: {
    duration: 3,
    price: 2.49,
    label: 'Premium',
    description: 'The perfect balance for a satisfying session.'
  },
  [PRICING_TIERS.UNLIMITED]: {
    duration: 7,
    price: 4.99,
    label: 'Unlimited',
    description: 'Indulge longer for a deeper connection.'
  }
} as const;
