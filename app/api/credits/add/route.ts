import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { STRIPE_CONFIG } from '@/lib/stripe-config'

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

// Validate discount code
function validateDiscountCode(code: string): { valid: boolean; percentOff: number; name?: string } {
  const normalizedCode = code.toUpperCase().trim()
  const discountCode = Object.values(STRIPE_CONFIG.creditDiscountCodes).find(
    (dc) => dc.code === normalizedCode && dc.active
  )
  
  if (discountCode) {
    return { valid: true, percentOff: discountCode.percentOff, name: discountCode.name }
  }
  
  return { valid: false, percentOff: 0 }
}

// POST - Add credits to user account (for testing/dev or with discount code)
export async function POST(request: Request) {
  try {
    const user = await getSessionUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      credits, 
      discountCode,
      reason = 'manual_add'
    } = body

    // Validate credits amount
    const creditsToAdd = parseInt(credits, 10)
    if (isNaN(creditsToAdd) || creditsToAdd <= 0 || creditsToAdd > 10000) {
      return NextResponse.json({ error: 'Invalid credits amount (1-10000)' }, { status: 400 })
    }

    // Check if this is a free/discounted add (requires valid code in production)
    const isProduction = process.env.NODE_ENV === 'production'
    let appliedDiscount = 0
    let discountName = ''
    
    if (discountCode) {
      const validation = validateDiscountCode(discountCode)
      if (!validation.valid) {
        return NextResponse.json({ error: 'Invalid discount code' }, { status: 400 })
      }
      appliedDiscount = validation.percentOff
      discountName = validation.name || ''
    } else if (isProduction) {
      // In production, require a discount code or payment
      return NextResponse.json({ 
        error: 'Discount code required. Use the checkout for purchases.' 
      }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Get current credits
    const { data: existingCredits, error: fetchError } = await supabase
      .from('user_credits')
      .select('bonus_credits, credits_balance, monthly_allocation')
      .eq('user_id', user.id)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('[credits/add] Error fetching user credits:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch credits' }, { status: 500 })
    }

    let newBalance: number
    let newBonusCredits: number

    if (existingCredits) {
      // Update existing credits
      newBonusCredits = (existingCredits.bonus_credits || 0) + creditsToAdd
      newBalance = (existingCredits.credits_balance || 0) + creditsToAdd

      const { error: updateError } = await supabase
        .from('user_credits')
        .update({
          bonus_credits: newBonusCredits,
          credits_balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      if (updateError) {
        console.error('[credits/add] Error updating credits:', updateError)
        return NextResponse.json({ error: 'Failed to update credits' }, { status: 500 })
      }
    } else {
      // Create new credits record
      newBonusCredits = creditsToAdd
      newBalance = creditsToAdd

      const { error: insertError } = await supabase
        .from('user_credits')
        .insert({
          user_id: user.id,
          bonus_credits: newBonusCredits,
          credits_balance: newBalance,
          monthly_allocation: 50, // Will be overridden by tier check
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (insertError) {
        console.error('[credits/add] Error inserting credits:', insertError)
        return NextResponse.json({ error: 'Failed to create credits record' }, { status: 500 })
      }
    }

    // Log the transaction
    try {
      await supabase
        .from('credit_transactions')
        .insert({
          user_id: user.id,
          amount: creditsToAdd,
          type: discountCode ? 'discount' : 'manual',
          description: discountCode 
            ? `Added ${creditsToAdd} credits with code: ${discountCode} (${discountName})`
            : `Added ${creditsToAdd} credits (${reason})`,
          created_at: new Date().toISOString()
        })
    } catch {
      // Transaction table might not exist, ignore
    }

    console.log('[credits/add] Credits added:', { 
      userId: user.id, 
      creditsAdded: creditsToAdd,
      newBalance,
      discountCode: discountCode || 'none'
    })

    return NextResponse.json({
      success: true,
      credits_added: creditsToAdd,
      new_balance: newBalance,
      bonus_credits: newBonusCredits,
      discount_applied: appliedDiscount,
      discount_name: discountName
    })
  } catch (error) {
    console.error('[credits/add] Error:', error)
    return NextResponse.json({ error: 'Failed to add credits' }, { status: 500 })
  }
}

// GET - Validate a discount code
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    
    if (!code) {
      return NextResponse.json({ error: 'Missing code parameter' }, { status: 400 })
    }
    
    const validation = validateDiscountCode(code)
    
    return NextResponse.json({
      valid: validation.valid,
      percent_off: validation.percentOff,
      name: validation.name || null
    })
  } catch (error) {
    console.error('[credits/add] GET Error:', error)
    return NextResponse.json({ error: 'Failed to validate code' }, { status: 500 })
  }
}
