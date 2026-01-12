import { NextResponse } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/supabase'
import type { Item, SearchParams } from '@/types'

export async function GET(request: Request) {
  try {
    const supabase = await getAuthenticatedSupabaseClient()
    const { data: { user }, error: authError } = await getCurrentUser(supabase)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const params: SearchParams = {
      query: searchParams.get('query') || undefined,
      category_id: searchParams.get('category_id') || undefined,
      status: searchParams.get('status') as Item['status'] || undefined,
      sort_by: searchParams.get('sort_by') as SearchParams['sort_by'] || 'created_at',
      sort_order: searchParams.get('sort_order') as 'asc' | 'desc' || 'desc',
      page: parseInt(searchParams.get('page') || '1'),
      page_size: parseInt(searchParams.get('page_size') || '50'),
    }

    let query = supabase
      .from('items')
      .select('*, category:categories(*)', { count: 'exact' })
      .eq('user_id', user.id)

    // Apply filters
    if (params.query) {
      query = query.textSearch('search_vector', params.query)
    }
    if (params.category_id) {
      query = query.eq('category_id', params.category_id)
    }
    if (params.status) {
      query = query.eq('status', params.status)
    }

    // Apply sorting
    query = query.order(params.sort_by || 'created_at', { ascending: params.sort_order === 'asc' })

    // Apply pagination
    const from = ((params.page || 1) - 1) * (params.page_size || 50)
    const to = from + (params.page_size || 50) - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching items:', error)
      return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
    }

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      page: params.page || 1,
      page_size: params.page_size || 50,
      has_more: (count || 0) > (from + (data?.length || 0)),
    })
  } catch (error) {
    console.error('Error in items API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await getAuthenticatedSupabaseClient()
    const { data: { user }, error: authError } = await getCurrentUser(supabase)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const itemData = {
      user_id: user.id,
      name: body.name,
      slug: body.slug,
      description: body.description,
      summary: body.summary,
      category_id: body.category_id,
      data: body.data || {},
      image_url: body.image_url,
      source_url: body.source_url,
      source_name: body.source_name,
      source_id: body.source_id,
      status: body.status || 'active',
      is_public: body.is_public ?? true,
    }

    const { data, error } = await supabase
      .from('items')
      .insert(itemData)
      .select()
      .single()

    if (error) {
      console.error('Error creating item:', error)
      return NextResponse.json({ error: 'Failed to create item' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in items POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
