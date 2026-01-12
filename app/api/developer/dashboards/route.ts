/**
 * Developer Dashboards API
 * 
 * CRUD operations for custom developer dashboards.
 * Developers can create custom HTML/JS/Python dashboards that consume
 * the structured node results from workflow executions.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

interface CookieToSet {
  name: string
  value: string
  options?: CookieOptions
}

export interface DashboardConfig {
  id?: string
  name: string
  description?: string
  slug?: string
  dashboardType: 'custom' | 'template' | 'marketplace'
  
  // Code
  htmlTemplate?: string
  cssStyles?: string
  javascriptCode?: string
  pythonCode?: string
  
  // Schema expectations
  expectedNodeTypes?: string[]
  expectedOutputSchema?: Record<string, unknown>
  
  // Configuration schema for users
  configSchema?: Record<string, unknown>
  defaultConfig?: Record<string, unknown>
  
  // Marketplace
  isPublic?: boolean
  isMarketplace?: boolean
  priceCredits?: number
  category?: string
  tags?: string[]
}

// GET - List dashboards or get single dashboard
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet: CookieToSet[]) { cookiesToSet.forEach((c) => cookieStore.set(c)) },
        },
      }
    )
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const searchParams = request.nextUrl.searchParams
    const dashboardId = searchParams.get('id')
    const marketplace = searchParams.get('marketplace') === 'true'
    const category = searchParams.get('category')
    
    if (dashboardId) {
      // Get single dashboard
      const { data, error } = await supabase
        .from('developer_dashboards')
        .select('*')
        .eq('id', dashboardId)
        .or(`creator_id.eq.${user.id},is_public.eq.true`)
        .single()
      
      if (error || !data) {
        return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 })
      }
      
      return NextResponse.json({ dashboard: data })
    }
    
    // List dashboards
    let query = supabase
      .from('developer_dashboards')
      .select('*')
    
    if (marketplace) {
      query = query.eq('is_marketplace', true).eq('is_public', true)
    } else {
      query = query.or(`creator_id.eq.${user.id},is_public.eq.true`)
    }
    
    if (category) {
      query = query.eq('category', category)
    }
    
    query = query.order('created_at', { ascending: false })
    
    const { data, error } = await query
    
    if (error) {
      throw error
    }
    
    return NextResponse.json({
      dashboards: data || [],
      categories: ['analytics', 'visualization', 'export', 'reporting', 'custom'],
    })
    
  } catch (error) {
    console.error('Dashboards GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboards' }, { status: 500 })
  }
}

// POST - Create new dashboard
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet: CookieToSet[]) { cookiesToSet.forEach((c) => cookieStore.set(c)) },
        },
      }
    )
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body: DashboardConfig = await request.json()
    
    // Validate required fields
    if (!body.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    
    // Generate slug if not provided
    const slug = body.slug || body.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    
    const { data, error } = await supabase
      .from('developer_dashboards')
      .insert({
        creator_id: user.id,
        name: body.name,
        description: body.description,
        slug,
        dashboard_type: body.dashboardType || 'custom',
        html_template: body.htmlTemplate,
        css_styles: body.cssStyles,
        javascript_code: body.javascriptCode,
        python_code: body.pythonCode,
        expected_node_types: body.expectedNodeTypes,
        expected_output_schema: body.expectedOutputSchema,
        config_schema: body.configSchema,
        default_config: body.defaultConfig,
        is_public: body.isPublic || false,
        is_marketplace: body.isMarketplace || false,
        price_credits: body.priceCredits || 0,
        category: body.category,
        tags: body.tags,
      })
      .select()
      .single()
    
    if (error) {
      console.error('Dashboard create error:', error)
      throw error
    }
    
    return NextResponse.json({
      success: true,
      dashboard: data,
    })
    
  } catch (error) {
    console.error('Dashboards POST error:', error)
    return NextResponse.json({ error: 'Failed to create dashboard' }, { status: 500 })
  }
}

// PUT - Update dashboard
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet: CookieToSet[]) { cookiesToSet.forEach((c) => cookieStore.set(c)) },
        },
      }
    )
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body: DashboardConfig = await request.json()
    
    if (!body.id) {
      return NextResponse.json({ error: 'Dashboard ID is required' }, { status: 400 })
    }
    
    const { data, error } = await supabase
      .from('developer_dashboards')
      .update({
        name: body.name,
        description: body.description,
        html_template: body.htmlTemplate,
        css_styles: body.cssStyles,
        javascript_code: body.javascriptCode,
        python_code: body.pythonCode,
        expected_node_types: body.expectedNodeTypes,
        expected_output_schema: body.expectedOutputSchema,
        config_schema: body.configSchema,
        default_config: body.defaultConfig,
        is_public: body.isPublic,
        is_marketplace: body.isMarketplace,
        price_credits: body.priceCredits,
        category: body.category,
        tags: body.tags,
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.id)
      .eq('creator_id', user.id)
      .select()
      .single()
    
    if (error) {
      throw error
    }
    
    return NextResponse.json({
      success: true,
      dashboard: data,
    })
    
  } catch (error) {
    console.error('Dashboards PUT error:', error)
    return NextResponse.json({ error: 'Failed to update dashboard' }, { status: 500 })
  }
}

// DELETE - Delete dashboard
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet: CookieToSet[]) { cookiesToSet.forEach((c) => cookieStore.set(c)) },
        },
      }
    )
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const searchParams = request.nextUrl.searchParams
    const dashboardId = searchParams.get('id')
    
    if (!dashboardId) {
      return NextResponse.json({ error: 'Dashboard ID is required' }, { status: 400 })
    }
    
    const { error } = await supabase
      .from('developer_dashboards')
      .delete()
      .eq('id', dashboardId)
      .eq('creator_id', user.id)
    
    if (error) {
      throw error
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Dashboards DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete dashboard' }, { status: 500 })
  }
}
