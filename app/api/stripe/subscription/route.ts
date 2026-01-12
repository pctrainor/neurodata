import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getStripe } from '@/lib/stripe'
import { getTierFromPriceId, SubscriptionTier } from '@/lib/stripe-config'

export const dynamic = 'force-dynamic'

// Get Supabase admin client
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Get user from cookies
async function getSessionUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            )
          } catch {
            // Ignore
          }
        },
      },
    }
  )
  
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

function tierFromSubscription(sub: { items: { data: Array<{ price?: { id?: string } }> } }): SubscriptionTier {
  for (const item of sub.items.data) {
    const priceId = item.price?.id
    if (priceId) {
      const tier = getTierFromPriceId(priceId)
      if (tier !== 'free') return tier
    }
  }
  return 'free'
}

export async function GET() {
  try {
    const user = await getSessionUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const stripe = getStripe()

    // Get user's Stripe customer ID from database
    const { data: dbUser } = await supabaseAdmin
      .from('users')
      .select('stripe_customer_id, stripe_subscription_id, subscription_tier, subscription_status')
      .eq('id', user.id)
      .maybeSingle()

    let tier: SubscriptionTier = 'free'
    let status: string | null = null
    let stripeCustomerId = dbUser?.stripe_customer_id || null
    let currentPeriodEnd: string | null = null

    // If we have a customer ID, check Stripe directly for current subscription
    if (stripeCustomerId) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: stripeCustomerId,
          status: 'all',
          limit: 1,
        })

        if (subscriptions.data.length > 0) {
          const sub = subscriptions.data[0]
          status = sub.status
          // Get period end from the subscription object
          const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end
          if (periodEnd) {
            currentPeriodEnd = new Date(periodEnd * 1000).toISOString()
          }

          if (sub.status === 'active' || sub.status === 'trialing') {
            tier = tierFromSubscription(sub)
          }

          // Update database with latest from Stripe
          await supabaseAdmin.from('users').upsert({
            id: user.id,
            subscription_tier: tier,
            subscription_status: status,
            stripe_subscription_id: sub.id,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' })
        }
      } catch (stripeError) {
        console.error('[subscription] Error fetching from Stripe:', stripeError)
        // Fall back to database value
        tier = (dbUser?.subscription_tier as SubscriptionTier) || 'free'
        status = dbUser?.subscription_status || null
      }
    } else {
      // No Stripe customer - check if they have any subscription via email
      try {
        const customers = await stripe.customers.list({
          email: user.email,
          limit: 1,
        })

        if (customers.data.length > 0) {
          stripeCustomerId = customers.data[0].id

          // Update the user record with the customer ID
          await supabaseAdmin.from('users').upsert({
            id: user.id,
            stripe_customer_id: stripeCustomerId,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' })

          // Now check their subscription
          const subscriptions = await stripe.subscriptions.list({
            customer: stripeCustomerId,
            status: 'all',
            limit: 1,
          })

          if (subscriptions.data.length > 0) {
            const sub = subscriptions.data[0]
            status = sub.status
            const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end
            if (periodEnd) {
              currentPeriodEnd = new Date(periodEnd * 1000).toISOString()
            }

            if (sub.status === 'active' || sub.status === 'trialing') {
              tier = tierFromSubscription(sub)
            }

            await supabaseAdmin.from('users').upsert({
              id: user.id,
              subscription_tier: tier,
              subscription_status: status,
              stripe_subscription_id: sub.id,
              stripe_customer_id: stripeCustomerId,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'id' })
          }
        }
      } catch (e) {
        console.error('[subscription] Error looking up customer by email:', e)
      }
    }

    return NextResponse.json({
      tier,
      status,
      stripeCustomerId,
      currentPeriodEnd,
      email: user.email,
    })
  } catch (error) {
    console.error('[subscription] Error:', error)
    return NextResponse.json({ error: 'Failed to get subscription' }, { status: 500 })
  }
}
