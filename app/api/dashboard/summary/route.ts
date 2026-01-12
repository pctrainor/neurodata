import { NextResponse } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = await getAuthenticatedSupabaseClient()
    const { data: { user }, error: authError } = await getCurrentUser(supabase)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch items and categories
    const [itemsResult, categoriesResult, tasksResult] = await Promise.all([
      supabase
        .from('items')
        .select('id, status, verification_status, quality_score, enrichment_status, view_count, created_at')
        .eq('user_id', user.id),
      supabase
        .from('categories')
        .select('id, name')
        .or(`user_id.eq.${user.id},user_id.is.null`),
      supabase
        .from('agent_tasks')
        .select('id')
        .eq('status', 'pending'),
    ])

    const items = itemsResult.data || []
    const categories = categoriesResult.data || []

    // Calculate summary stats
    const total_items = items.length
    
    const items_by_status = items.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const items_by_category = items.reduce((acc, item) => {
      const cat = categories.find(c => c.id === (item as any).category_id)
      const catName = cat?.name || 'Uncategorized'
      acc[catName] = (acc[catName] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const verified_count = items.filter(i => i.verification_status === 'verified').length
    const pending_enrichment = items.filter(i => i.enrichment_status === 'pending').length
    const average_score = items.length > 0
      ? Math.round(items.reduce((sum, i) => sum + (i.quality_score || 0), 0) / items.length)
      : 0

    // Get recent items
    const recentItems = [...items]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)

    // Get top items by views
    const topItems = [...items]
      .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
      .slice(0, 5)

    const summary = {
      total_items,
      items_by_status,
      items_by_category,
      recent_items: recentItems,
      top_items: topItems,
      quality_overview: {
        average_score,
        verified_count,
        pending_enrichment,
      },
      agent_activity: {
        last_24h_runs: 0, // Would need agent_runs query
        items_processed_today: 0,
        pending_tasks: tasksResult.data?.length || 0,
      },
    }

    return NextResponse.json({ data: summary })
  } catch (error) {
    console.error('Error fetching dashboard summary:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
