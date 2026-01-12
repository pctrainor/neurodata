import Stripe from 'stripe'

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('Missing Stripe env var: STRIPE_SECRET_KEY')
  }

  return new Stripe(secretKey, {
    apiVersion: '2025-12-15.clover',
    typescript: true,
  })
}
