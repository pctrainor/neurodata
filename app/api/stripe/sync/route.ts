import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getStripe } from '@/lib/stripe'
import { getTierFromPriceId, SubscriptionTier } from '@/lib/stripe-config'

export const dynamic = 'force-dynamic'

// Force sync subscription status from Stripe after checkout
// This is called when webhooks can't reach the server (local development)
// or as a fallback to ensure subscription status is up to date

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

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

export async function POST() {
  try {
    const user = await getSessionUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[stripe/sync] Syncing subscription for user:', user.id)

    const supabaseAdmin = getSupabaseAdmin()
    const stripe = getStripe()

    let tier: SubscriptionTier = 'free'
    let status: string | null = null
    let stripeCustomerId: string | null = null
    let stripeSubscriptionId: string | null = null

    // First, try to find customer by email
    try {
      const customers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      })

      if (customers.data.length > 0) {
        stripeCustomerId = customers.data[0].id
        console.log('[stripe/sync] Found customer:', stripeCustomerId)

        // Check their subscriptions
        const subscriptions = await stripe.subscriptions.list({
          customer: stripeCustomerId,
          status: 'all',
          limit: 5,
        })

        // Find the most recent active subscription
        const activeSub = subscriptions.data.find(
          s => s.status === 'active' || s.status === 'trialing'
        ) || subscriptions.data[0]

        if (activeSub) {
          status = activeSub.status
          stripeSubscriptionId = activeSub.id
          
          if (activeSub.status === 'active' || activeSub.status === 'trialing') {
            tier = tierFromSubscription(activeSub)
          }

          console.log('[stripe/sync] Found subscription:', {
            id: stripeSubscriptionId,
            status,
            tier,
          })
        }

        // Update the database
        const { error: upsertError } = await supabaseAdmin.from('users').upsert({
          id: user.id,
          email: user.email,
          subscription_tier: tier,
          subscription_status: status,
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: stripeSubscriptionId,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' })

        if (upsertError) {
          console.error('[stripe/sync] Error updating user:', upsertError)
        } else {
          console.log('[stripe/sync] User subscription updated successfully')
        }
      } else {
        console.log('[stripe/sync] No Stripe customer found for email:', user.email)
      }
    } catch (stripeError) {
      console.error('[stripe/sync] Stripe error:', stripeError)
      return NextResponse.json({ error: 'Failed to sync with Stripe' }, { status: 500 })
    }

    return NextResponse.json({
      synced: true,
      tier,
      status,
      stripeCustomerId,
    })
  } catch (error) {
    console.error('[stripe/sync] Error:', error)
    return NextResponse.json({ error: 'Failed to sync subscription' }, { status: 500 })
  }
}
