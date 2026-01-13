/**
 * NeuroData Hub Stripe Configuration
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create products in Stripe Dashboard for each tier
 * 2. Create prices for each product (monthly and/or annual)
 * 3. Replace the placeholder IDs below with your actual Stripe IDs
 * 4. Set environment variables:
 *    - STRIPE_SECRET_KEY (server-side)
 *    - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (client-side)
 *    - STRIPE_WEBHOOK_SECRET (for webhook verification)
 */

export const STRIPE_CONFIG = {
  // Publishable key (used in client-side code)
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,

  products: {
    free: {
      id: 'prod_Tm3Gmsj8Tk2Qn9',
      name: 'Free',
      description: 'Explore the platform with limited workflows',
      workflowsPerMonth: 3,
      prices: {
        free: null, // Free tier has no price
      },
      features: [
        '3 workflows per month',
        'Basic node types',
        'Community templates',
        'OpenNeuro access',
        'Email support',
      ],
    },
    researcher: {
      id: 'prod_Tm3G9GyiaeEZnn',
      name: 'Researcher',
      description: 'For academic research teams',
      workflowsPerMonth: -1, // Unlimited
      prices: {
        monthly: 'price_1SoVA2KkfLbczEaw6fi6ab3C',
        annual: 'price_1SoVA9KkfLbczEawByCWqF7z',
      },
      features: [
        'Unlimited workflows',
        'All node types',
        'AI Wizard generation',
        'HCP 1200 + Allen Atlas',
        'Export to BIDS format',
        'Priority support',
      ],
    },
    clinical: {
      id: 'prod_Tm3Gvvauiuv0sP',
      name: 'Clinical',
      description: 'For hospitals and clinics',
      workflowsPerMonth: -1, // Unlimited
      prices: {
        monthly: 'price_1SoVAFKkfLbczEawQimGavQL',
        annual: 'price_1SoVALKkfLbczEaw9B277EsA',
      },
      features: [
        'Everything in Researcher',
        'TBI deviation reports',
        'Patient comparison tools',
        'HIPAA compliance',
        'Custom reference datasets',
        'Dedicated support',
      ],
    },
  },

  coupons: {
    welcome: {
      id: 'WELCOME20',
      name: 'Welcome Discount',
      percentOff: 20,
      durationInMonths: 3,
    },
  },

  // Premium Queries - for topping up credits/requests
  premiumQueries: {
    id: 'prod_RjD3Lgid4FWnlg',
    name: 'Premium Queries',
    description: 'Top up your workflow credits',
    priceId: 'price_1QpkdmKkfLbczEawcDlD5JSq', // $1 per query
    pricePerQuery: 1.00,
    // Credit pack options
    packs: [
      { queries: 10, price: 10, savings: 0 },
      { queries: 50, price: 45, savings: 10 },
      { queries: 100, price: 80, savings: 20 },
      { queries: 500, price: 350, savings: 30 },
    ],
  },
} as const

export type SubscriptionTier = 'free' | 'researcher' | 'clinical'
export type BillingInterval = 'monthly' | 'annual'

/**
 * Get the price ID for a subscription tier and billing interval
 */
export function getStripePriceId(
  tier: SubscriptionTier,
  interval: BillingInterval = 'monthly'
): string | null {
  if (tier === 'free') {
    return STRIPE_CONFIG.products.free.prices.free
  }

  if (tier === 'researcher') {
    return interval === 'annual'
      ? STRIPE_CONFIG.products.researcher.prices.annual
      : STRIPE_CONFIG.products.researcher.prices.monthly
  }

  if (tier === 'clinical') {
    return interval === 'annual'
      ? STRIPE_CONFIG.products.clinical.prices.annual
      : STRIPE_CONFIG.products.clinical.prices.monthly
  }

  return null
}

/**
 * Get the product ID for a subscription tier
 */
export function getStripeProductId(tier: SubscriptionTier): string | null {
  if (tier === 'free') return STRIPE_CONFIG.products.free.id
  if (tier === 'researcher') return STRIPE_CONFIG.products.researcher.id
  if (tier === 'clinical') return STRIPE_CONFIG.products.clinical.id
  return null
}

/**
 * Determine the tier from a Stripe price ID
 */
export function getTierFromPriceId(priceId: string): SubscriptionTier {
  // Check Clinical prices
  if (
    priceId === STRIPE_CONFIG.products.clinical.prices.monthly ||
    priceId === STRIPE_CONFIG.products.clinical.prices.annual
  ) {
    return 'clinical'
  }

  // Check Researcher prices
  if (
    priceId === STRIPE_CONFIG.products.researcher.prices.monthly ||
    priceId === STRIPE_CONFIG.products.researcher.prices.annual
  ) {
    return 'researcher'
  }

  // Default to free
  return 'free'
}

/**
 * Get the workflow limit for a tier
 * Returns -1 for unlimited
 */
export function getWorkflowLimit(tier: SubscriptionTier): number {
  return STRIPE_CONFIG.products[tier].workflowsPerMonth
}

/**
 * Check if a tier can use a specific feature
 */
export function canUseTier(userTier: SubscriptionTier, requiredTier: SubscriptionTier): boolean {
  const tierOrder: SubscriptionTier[] = ['free', 'researcher', 'clinical']
  return tierOrder.indexOf(userTier) >= tierOrder.indexOf(requiredTier)
}

/**
 * Get tier display info
 */
export function getTierInfo(tier: SubscriptionTier) {
  return STRIPE_CONFIG.products[tier]
}
