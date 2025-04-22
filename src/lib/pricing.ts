
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
    description: '30-second preview'
  },
  [PRICING_TIERS.STANDARD]: {
    duration: 3,
    price: 2.49,
    label: 'Standard',
    description: '3-minute experience'
  },
  [PRICING_TIERS.EXTENDED]: {
    duration: 7,
    price: 4.99,
    label: 'Extended',
    description: '7-minute premium session'
  }
} as const;
