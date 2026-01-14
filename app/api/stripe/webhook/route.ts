import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import { getTierFromPriceId, SubscriptionTier } from '@/lib/stripe-config'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Create admin supabase client for webhook operations
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, serviceKey)
}

function normalizeTier(value: unknown): SubscriptionTier | null {
  if (typeof value !== 'string') return null
  const v = value.trim().toLowerCase()
  if (v === 'free') return 'free'
  if (v === 'researcher') return 'researcher'
  if (v === 'clinical') return 'clinical'
  return null
}

function tierFromSubscription(sub: Stripe.Subscription): SubscriptionTier {
  const prices = sub.items.data
    .map((i) => i.price?.id)
    .filter((id): id is string => typeof id === 'string')

  for (const priceId of prices) {
    const tier = getTierFromPriceId(priceId)
    if (tier !== 'free') return tier
  }

  return 'free'
}

async function upsertUserSubscription(params: {
  userId: string
  email?: string | null
  stripeCustomerId?: string | null
  stripeSubscriptionId?: string | null
  subscriptionStatus?: string | null
  tier?: SubscriptionTier
}) {
  const supabase = getSupabaseAdmin()

  try {
    const row: Record<string, unknown> = {
      id: params.userId,
      updated_at: new Date().toISOString(),
    }

    if (typeof params.email === 'string') row.email = params.email
    if (typeof params.stripeCustomerId === 'string') row.stripe_customer_id = params.stripeCustomerId
    if (typeof params.stripeSubscriptionId === 'string') row.stripe_subscription_id = params.stripeSubscriptionId
    if (typeof params.subscriptionStatus === 'string') row.subscription_status = params.subscriptionStatus
    if (params.tier) row.subscription_tier = params.tier

    console.log('[stripe/webhook] Upserting user subscription:', row)

    const { error } = await supabase.from('users').upsert(row, { onConflict: 'id' })
    if (error) {
      console.error('[stripe/webhook] Upsert error:', error)
    }
  } catch (e) {
    console.error('[stripe/webhook] Failed to upsert user subscription', e)
  }
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Missing STRIPE_WEBHOOK_SECRET' }, { status: 500 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  const rawBody = await request.text()
  const stripe = getStripe()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature'
    return NextResponse.json({ error: 'Invalid signature', details: message }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        const userId =
          typeof session.metadata?.user_id === 'string'
            ? session.metadata.user_id
            : typeof session.client_reference_id === 'string'
              ? session.client_reference_id
              : null

        if (!userId) {
          console.warn('[stripe/webhook] checkout.session.completed: no userId found')
          break
        }

        const stripeCustomerId = typeof session.customer === 'string' ? session.customer : null
        const stripeSubscriptionId = typeof session.subscription === 'string' ? session.subscription : null

        console.log('[stripe/webhook] checkout.session.completed:', {
          userId,
          customerId: stripeCustomerId,
          subscriptionId: stripeSubscriptionId,
          metadata: session.metadata,
        })

        // Check if this is a credit purchase (one-time payment)
        if (session.metadata?.type === 'credit_purchase') {
          const credits = parseInt(session.metadata.credits || '0', 10)
          
          if (credits > 0) {
            console.log('[stripe/webhook] Processing credit purchase:', { userId, credits })
            
            const supabase = getSupabaseAdmin()
            
            // Add credits to user's balance using bonus_credits field
            const { data: existingCredits, error: fetchError } = await supabase
              .from('user_credits')
              .select('bonus_credits, credits_balance')
              .eq('user_id', userId)
              .single()
            
            if (fetchError && fetchError.code !== 'PGRST116') {
              console.error('[stripe/webhook] Error fetching user credits:', fetchError)
            }
            
            if (existingCredits) {
              // Update existing credits
              const newBonusCredits = (existingCredits.bonus_credits || 0) + credits
              const newBalance = (existingCredits.credits_balance || 0) + credits
              
              const { error: updateError } = await supabase
                .from('user_credits')
                .update({ 
                  bonus_credits: newBonusCredits,
                  credits_balance: newBalance,
                  updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
              
              if (updateError) {
                console.error('[stripe/webhook] Error updating credits:', updateError)
              } else {
                console.log('[stripe/webhook] Credits added successfully:', { userId, credits, newBalance })
              }
            } else {
              // Create new credits record
              const { error: insertError } = await supabase
                .from('user_credits')
                .insert({
                  user_id: userId,
                  bonus_credits: credits,
                  credits_balance: credits,
                  monthly_allocation: 0,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
              
              if (insertError) {
                console.error('[stripe/webhook] Error inserting credits:', insertError)
              } else {
                console.log('[stripe/webhook] New credits record created:', { userId, credits })
              }
            }
            
            // Record the transaction in credit_transactions if table exists
            try {
              await supabase
                .from('credit_transactions')
                .insert({
                  user_id: userId,
                  amount: credits,
                  type: 'purchase',
                  description: `Purchased ${credits} credits`,
                  stripe_session_id: session.id,
                  created_at: new Date().toISOString()
                })
            } catch {
              // Table might not exist, ignore
            }
          }
          
          break // Exit early for credit purchases
        }

        // Handle subscription purchases
        let tier = normalizeTier(session.metadata?.tier)
        let subscriptionStatus: string | null = null

        if (stripeSubscriptionId) {
          const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId)
          subscriptionStatus = typeof sub.status === 'string' ? sub.status : null
          tier = tier || tierFromSubscription(sub)
        }

        await upsertUserSubscription({
          userId,
          email: session.customer_details?.email || null,
          stripeCustomerId,
          stripeSubscriptionId,
          subscriptionStatus,
          tier: tier || 'researcher',
        })

        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const userId = typeof sub.metadata?.user_id === 'string' ? sub.metadata.user_id : null
        if (!userId) break

        const stripeCustomerId = typeof sub.customer === 'string' ? sub.customer : null
        const stripeSubscriptionId = typeof sub.id === 'string' ? sub.id : null
        const subscriptionStatus = typeof sub.status === 'string' ? sub.status : null

        const tier = event.type === 'customer.subscription.deleted' ? 'free' : tierFromSubscription(sub)

        console.log('[stripe/webhook] subscription event:', {
          type: event.type,
          userId,
          tier,
          status: subscriptionStatus,
        })

        await upsertUserSubscription({
          userId,
          stripeCustomerId,
          stripeSubscriptionId,
          subscriptionStatus,
          tier,
        })

        break
      }

      default:
        console.log('[stripe/webhook] Unhandled event type:', event.type)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[stripe/webhook] Error processing event:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
