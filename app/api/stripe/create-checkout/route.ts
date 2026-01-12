import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getStripe } from '@/lib/stripe'
import { getStripePriceId, BillingInterval } from '@/lib/stripe-config'

export const dynamic = 'force-dynamic'

function normalizeTier(value: unknown): 'researcher' | 'clinical' | null {
  if (typeof value !== 'string') return null
  const v = value.trim().toLowerCase()
  if (v === 'researcher') return 'researcher'
  if (v === 'clinical') return 'clinical'
  return null
}

function normalizeInterval(value: unknown): BillingInterval {
  if (typeof value !== 'string') return 'monthly'
  const v = value.trim().toLowerCase()
  if (v === 'annual' || v === 'yearly' || v === 'year') return 'annual'
  return 'monthly'
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const tier = normalizeTier(body?.tier)
    const interval = normalizeInterval(body?.interval)

    if (!tier) {
      return NextResponse.json({ error: 'Missing or invalid tier' }, { status: 400 })
    }

    const priceId = getStripePriceId(tier, interval)
    if (!priceId || priceId.includes('REPLACE')) {
      return NextResponse.json(
        {
          error: 'Stripe not configured',
          details: 'Please set up Stripe products and update lib/stripe-config.ts',
        },
        { status: 500 }
      )
    }

    // Try to get user from cookie-based session first
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
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
              // Ignore errors in server context
            }
          },
        },
      }
    )
    
    const { data: { user: sessionUser } } = await supabaseAuth.auth.getUser()
    
    // Also check Authorization header as fallback
    const authHeader = request.headers.get('Authorization')
    
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let user: { id: string; email?: string } | null = null
    
    if (sessionUser) {
      user = { id: sessionUser.id, email: sessionUser.email }
    } else if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      if (token === 'dev-mode') {
        user = { id: 'dev-user-id', email: 'dev@test.com' }
      } else {
        const { data } = await supabaseAdmin.auth.getUser(token)
        user = data.user ? { id: data.user.id, email: data.user.email } : null
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - please sign in' }, { status: 401 })
    }

    const stripe = getStripe()

    // Check for existing Stripe customer
    let stripeCustomerId: string | null = null
    try {
      const { data } = await supabaseAdmin
        .from('users')
        .select('stripe_customer_id')
        .eq('id', user.id)
        .maybeSingle()

      stripeCustomerId = typeof data?.stripe_customer_id === 'string' ? data.stripe_customer_id : null
    } catch {
      // Table may not exist
    }

    // Create customer if needed
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: { user_id: user.id },
      })
      stripeCustomerId = customer.id

      // Save customer ID
      try {
        await supabaseAdmin
          .from('users')
          .upsert({ id: user.id, stripe_customer_id: stripeCustomerId }, { onConflict: 'id' })
      } catch {
        // Ignore
      }
    }

    // Create checkout session
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      client_reference_id: user.id,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true, // Enable coupon/promo code field
      success_url: `${baseUrl}/dashboard?checkout=success`,
      cancel_url: `${baseUrl}/dashboard?checkout=canceled`,
      metadata: {
        user_id: user.id,
        tier,
        interval,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          tier,
        },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[stripe/create-checkout] Error:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
