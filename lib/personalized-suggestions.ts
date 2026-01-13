import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Database row types (matching our DDL schema)
interface PromptTemplateRow {
  id: string
  title: string
  description: string
  prompt_text: string
  category: string
  subcategory?: string
  target_backgrounds: string[]
  target_interests: string[]
  target_goals: string[]
  target_experience_levels: string[]
  icon: string
  gradient: string
  difficulty: string
  estimated_time: string
  use_count: number
  success_rate: number
  avg_rating: number
  is_featured: boolean
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

interface WorkflowTemplateRow {
  id: string
  name: string
  description: string
  nodes: any
  edges: any
  viewport: any
  category: string
  subcategory?: string
  target_backgrounds: string[]
  target_interests: string[]
  target_goals: string[]
  target_experience_levels: string[]
  icon: string
  gradient: string
  difficulty: string
  node_count: number
  estimated_time: string
  thumbnail_url?: string
  preview_gif_url?: string
  use_count: number
  fork_count: number
  avg_rating: number
  is_featured: boolean
  is_active: boolean
  is_system: boolean
  display_order: number
  created_at: string
  updated_at: string
}

interface SearchSuggestionRow {
  id: string
  title: string
  description?: string
  search_query: string
  search_type: string
  category: string
  subcategory?: string
  target_backgrounds: string[]
  target_interests: string[]
  target_goals: string[]
  icon: string
  platform?: string
  content_type?: string
  example_thumbnail?: string
  example_creator?: string
  example_title?: string
  use_count: number
  conversion_rate: number
  is_trending: boolean
  is_active: boolean
  expires_at?: string
  display_order: number
  created_at: string
  updated_at: string
}

interface UserSuggestionsRow {
  id: string
  user_id: string
  user_background?: string
  user_experience_level?: string
  user_interests: string[]
  user_goals: string[]
  suggested_prompts: string[]
  suggested_workflows: string[]
  suggested_searches: string[]
  custom_prompts: any
  discovery_content: any
  prompts_used: string[]
  workflows_used: string[]
  searches_used: string[]
  last_interaction_at?: string
  is_stale: boolean
  generation_version: number
  generated_at: string
  updated_at: string
}

// Types for the suggestion system
export interface PromptTemplate {
  id: string
  title: string
  description: string
  prompt_text: string
  category: string
  subcategory?: string
  icon: string
  gradient: string
  difficulty: string
  estimated_time: string
  use_count: number
  avg_rating: number
  is_featured: boolean
  match_score?: number
}

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  nodes: any[]
  edges: any[]
  category: string
  icon: string
  gradient: string
  difficulty: string
  node_count: number
  estimated_time: string
  is_featured: boolean
  match_score?: number
}

export interface SearchSuggestion {
  id: string
  title: string
  description?: string
  search_query: string
  search_type: 'youtube_url' | 'tiktok_url' | 'article_url' | 'topic_search' | 'competitor_channel' | 'hashtag'
  category: string
  icon: string
  platform?: string
  content_type?: string
  is_trending: boolean
  match_score?: number
}

export interface CustomPrompt {
  title: string
  description: string
  prompt_text: string
  reason: string
  category: string
  icon: string
  gradient: string
}

export interface UserSuggestions {
  id: string
  user_id: string
  user_background?: string
  user_experience_level?: string
  user_interests: string[]
  user_goals: string[]
  suggested_prompts: string[]
  suggested_workflows: string[]
  suggested_searches: string[]
  custom_prompts: CustomPrompt[]
  discovery_content: any[]
  generated_at: string
}

export interface OnboardingData {
  background: string
  experience_level: string
  content_interests: string[]
  content_goals: string[]
  full_name?: string
  institution?: string
}

// Background to category mapping for AI generation
const BACKGROUND_CONTEXTS: Record<string, string> = {
  marketing: 'digital marketing professional focused on campaigns, brand growth, and analytics',
  content_creator: 'content creator focused on building audience, engagement, and viral content',
  business_owner: 'entrepreneur or business owner focused on growth, competition, and market positioning',
  agency: 'agency professional managing multiple clients and campaigns',
  student: 'student learning content strategy and digital marketing',
  researcher: 'researcher focused on academic work and data analysis',
}

const INTEREST_CONTEXTS: Record<string, string> = {
  tech_reviews: 'technology products, gadgets, software reviews',
  gaming: 'video games, streaming, esports, gaming culture',
  business: 'business strategy, entrepreneurship, startups',
  education: 'educational content, tutorials, learning',
  entertainment: 'entertainment, comedy, viral content',
  sports: 'sports content, athletics, fitness',
  music: 'music content, covers, production',
  lifestyle: 'lifestyle, daily vlogs, personal brand',
  news: 'news coverage, current events, journalism',
  science: 'science education, research, experiments',
  finance: 'personal finance, investing, crypto',
  travel: 'travel content, destinations, adventures',
}

const GOAL_CONTEXTS: Record<string, string> = {
  grow_audience: 'rapidly growing subscriber/follower count',
  increase_engagement: 'boosting likes, comments, shares, and watch time',
  improve_quality: 'elevating production value and content quality',
  learn_trends: 'staying ahead of platform trends and algorithm changes',
  competitor_analysis: 'understanding and outperforming competitors',
  monetization: 'maximizing revenue from content',
}

/**
 * PersonalizedSuggestionService
 * 
 * This service generates and manages personalized suggestions for users
 * based on their onboarding preferences.
 */
export class PersonalizedSuggestionService {
  private supabase: SupabaseClient
  private genAI: GoogleGenerativeAI | null

  constructor(supabaseUrl: string, supabaseKey: string, geminiApiKey?: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey)
    this.genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null
  }

  /**
   * Generate personalized suggestions for a user after onboarding
   */
  async generateSuggestionsForUser(
    userId: string,
    onboardingData: OnboardingData
  ): Promise<UserSuggestions | null> {
    try {
      const { background, experience_level, content_interests, content_goals } = onboardingData

      // 1. Get matching prompt templates
      const prompts = await this.getMatchingPrompts(background, content_interests, content_goals, experience_level)

      // 2. Get matching workflow templates
      const workflows = await this.getMatchingWorkflows(background, content_interests, content_goals, experience_level)

      // 3. Get matching search suggestions
      const searches = await this.getMatchingSearches(background, content_interests, content_goals)

      // 4. Generate custom AI prompts tailored to this specific user
      const customPrompts = await this.generateCustomPrompts(onboardingData)

      // 5. Store the suggestions using raw SQL via RPC or direct insert
      const insertData = {
        user_id: userId,
        user_background: background,
        user_experience_level: experience_level,
        user_interests: content_interests,
        user_goals: content_goals,
        suggested_prompts: prompts.map(p => p.id),
        suggested_workflows: workflows.map(w => w.id),
        suggested_searches: searches.map(s => s.id),
        custom_prompts: customPrompts,
        is_stale: false,
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await this.supabase
        .from('user_suggestions')
        .upsert(insertData as any, {
          onConflict: 'user_id'
        })
        .select()
        .single()

      if (error) {
        console.error('Error storing user suggestions:', error)
        return null
      }

      return data as unknown as UserSuggestions
    } catch (error) {
      console.error('Error generating suggestions:', error)
      return null
    }
  }

  /**
   * Get matching prompt templates ranked by relevance
   */
  private async getMatchingPrompts(
    background: string,
    interests: string[],
    goals: string[],
    experienceLevel: string,
    limit: number = 20
  ): Promise<PromptTemplate[]> {
    const { data, error } = await this.supabase
      .from('prompt_templates')
      .select('*')
      .eq('is_active', true)

    if (error || !data) return []

    // Cast data to our expected type
    const prompts = data as unknown as PromptTemplateRow[]

    // Calculate match scores and sort
    const scored = prompts.map(prompt => {
      let score = 0
      
      // Background match (highest weight)
      if (prompt.target_backgrounds?.includes(background)) score += 10
      
      // Interest matches
      const interestMatches = interests.filter(i => prompt.target_interests?.includes(i)).length
      score += interestMatches * 5
      
      // Goal matches
      const goalMatches = goals.filter(g => prompt.target_goals?.includes(g)).length
      score += goalMatches * 4
      
      // Experience level match
      if (prompt.target_experience_levels?.includes(experienceLevel)) score += 3
      
      // Featured bonus
      if (prompt.is_featured) score += 5
      
      // Popularity bonus (normalized)
      score += Math.min((prompt.use_count || 0) / 100, 3)
      
      return { ...prompt, match_score: score } as PromptTemplate
    })

    // Sort by match score and return top results
    return scored
      .sort((a, b) => (b.match_score || 0) - (a.match_score || 0))
      .slice(0, limit)
  }

  /**
   * Get matching workflow templates
   */
  private async getMatchingWorkflows(
    background: string,
    interests: string[],
    goals: string[],
    experienceLevel: string,
    limit: number = 10
  ): Promise<WorkflowTemplate[]> {
    const { data, error } = await this.supabase
      .from('workflow_templates')
      .select('*')
      .eq('is_active', true)

    if (error || !data) return []

    // Cast data to our expected type
    const workflows = data as unknown as WorkflowTemplateRow[]

    const scored = workflows.map(workflow => {
      let score = 0
      
      if (workflow.target_backgrounds?.includes(background)) score += 10
      const interestMatches = interests.filter(i => workflow.target_interests?.includes(i)).length
      score += interestMatches * 5
      const goalMatches = goals.filter(g => workflow.target_goals?.includes(g)).length
      score += goalMatches * 4
      if (workflow.target_experience_levels?.includes(experienceLevel)) score += 3
      if (workflow.is_featured) score += 5
      
      return { ...workflow, match_score: score } as WorkflowTemplate
    })

    return scored
      .sort((a, b) => (b.match_score || 0) - (a.match_score || 0))
      .slice(0, limit)
  }

  /**
   * Get matching search suggestions
   */
  private async getMatchingSearches(
    background: string,
    interests: string[],
    goals: string[],
    limit: number = 15
  ): Promise<SearchSuggestion[]> {
    const { data, error } = await this.supabase
      .from('search_suggestions')
      .select('*')
      .eq('is_active', true)

    if (error || !data) return []

    // Cast data to our expected type
    const searches = data as unknown as SearchSuggestionRow[]

    const scored = searches.map(search => {
      let score = 0
      
      if (search.target_backgrounds?.includes(background)) score += 10
      const interestMatches = interests.filter(i => search.target_interests?.includes(i)).length
      score += interestMatches * 5
      const goalMatches = goals.filter(g => search.target_goals?.includes(g)).length
      score += goalMatches * 4
      if (search.is_trending) score += 8
      
      return { ...search, match_score: score } as SearchSuggestion
    })

    return scored
      .sort((a, b) => (b.match_score || 0) - (a.match_score || 0))
      .slice(0, limit)
  }

  /**
   * Generate custom AI prompts specifically for this user's profile
   */
  private async generateCustomPrompts(onboardingData: OnboardingData): Promise<CustomPrompt[]> {
    if (!this.genAI) return this.getFallbackCustomPrompts(onboardingData)

    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

      const backgroundContext = BACKGROUND_CONTEXTS[onboardingData.background] || onboardingData.background
      const interestContext = onboardingData.content_interests
        .map(i => INTEREST_CONTEXTS[i] || i)
        .join(', ')
      const goalContext = onboardingData.content_goals
        .map(g => GOAL_CONTEXTS[g] || g)
        .join(', ')

      const prompt = `You are a content analysis expert. Generate 5 highly personalized AI workflow prompts for a user with this profile:

BACKGROUND: ${backgroundContext}
EXPERIENCE: ${onboardingData.experience_level}
INTERESTS: ${interestContext}
GOALS: ${goalContext}

Generate 5 unique, specific prompts that would be extremely valuable for this exact user. Each prompt should:
1. Be actionable and specific (not generic)
2. Reference their specific niche/interests
3. Help them achieve their stated goals
4. Match their experience level

Return as a JSON array with this structure:
[
  {
    "title": "Short catchy title (4-6 words)",
    "description": "One sentence explaining the value",
    "prompt_text": "The full prompt to send to the AI (2-4 sentences, specific and actionable)",
    "reason": "Why this is perfect for this user (1 sentence)",
    "category": "content_creation|marketing|business|research|education",
    "icon": "zap|trending-up|target|users|brain|sparkles|lightbulb|rocket",
    "gradient": "from-purple-500 to-pink-600|from-blue-500 to-cyan-600|from-amber-500 to-orange-600|from-green-500 to-emerald-600"
  }
]

Only return the JSON array, no other text.`

      const result = await model.generateContent(prompt)
      const response = result.response.text()
      
      // Parse JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      
      return this.getFallbackCustomPrompts(onboardingData)
    } catch (error) {
      console.error('Error generating custom prompts:', error)
      return this.getFallbackCustomPrompts(onboardingData)
    }
  }

  /**
   * Fallback prompts if AI generation fails
   */
  private getFallbackCustomPrompts(onboardingData: OnboardingData): CustomPrompt[] {
    const { background, content_interests, content_goals } = onboardingData
    const prompts: CustomPrompt[] = []

    // Generate based on background
    if (background === 'content_creator') {
      prompts.push({
        title: 'Analyze My Content Style',
        description: 'Get AI insights on your unique content fingerprint',
        prompt_text: 'Analyze this video and identify my unique content style. What makes my content distinctive? How can I double down on my strengths?',
        reason: 'Perfect for content creators looking to refine their brand',
        category: 'content_creation',
        icon: 'sparkles',
        gradient: 'from-purple-500 to-pink-600',
      })
    }

    if (background === 'marketing') {
      prompts.push({
        title: 'Campaign Performance Decoder',
        description: 'Understand what makes campaigns succeed',
        prompt_text: 'Analyze this marketing content and decode the strategy. What psychological triggers are being used? How can I adapt this for my campaigns?',
        reason: 'Essential for marketing professionals seeking inspiration',
        category: 'marketing',
        icon: 'target',
        gradient: 'from-blue-500 to-cyan-600',
      })
    }

    // Generate based on interests
    if (content_interests.includes('gaming')) {
      prompts.push({
        title: 'Gaming Highlight Optimizer',
        description: 'Find the perfect clips for maximum engagement',
        prompt_text: 'Analyze this gaming video and identify the top 5 clip-worthy moments. Explain why each would perform well as a short-form clip.',
        reason: 'Gaming creators need to maximize every piece of content',
        category: 'content_creation',
        icon: 'gamepad-2',
        gradient: 'from-purple-600 to-pink-600',
      })
    }

    if (content_interests.includes('tech_reviews')) {
      prompts.push({
        title: 'Tech Review Structure Analysis',
        description: 'Learn from top tech reviewers',
        prompt_text: 'Analyze this tech review video structure. Break down the intro hook, spec presentation, real-world testing, and conclusion. Suggest improvements.',
        reason: 'Tech reviewers need structured, comprehensive content',
        category: 'content_creation',
        icon: 'cpu',
        gradient: 'from-cyan-500 to-blue-600',
      })
    }

    // Generate based on goals
    if (content_goals.includes('grow_audience')) {
      prompts.push({
        title: 'Viral Element Detector',
        description: 'Find what makes content shareable',
        prompt_text: 'Analyze this viral content and identify the specific elements that made it shareable. What hooks, emotions, or patterns can I replicate?',
        reason: 'Audience growth requires understanding viral mechanics',
        category: 'content_creation',
        icon: 'trending-up',
        gradient: 'from-green-500 to-emerald-600',
      })
    }

    if (content_goals.includes('monetization')) {
      prompts.push({
        title: 'Monetization Opportunity Scanner',
        description: 'Identify revenue potential in content',
        prompt_text: 'Analyze this content for monetization opportunities. Identify sponsor fit, affiliate potential, product placement moments, and audience purchasing signals.',
        reason: 'Turn views into revenue with strategic content analysis',
        category: 'business',
        icon: 'dollar-sign',
        gradient: 'from-amber-500 to-orange-600',
      })
    }

    return prompts.slice(0, 5)
  }

  /**
   * Get suggestions for a user
   */
  async getUserSuggestions(userId: string): Promise<{
    prompts: PromptTemplate[]
    workflows: WorkflowTemplate[]
    searches: SearchSuggestion[]
    customPrompts: CustomPrompt[]
  } | null> {
    try {
      // Get user's suggestion record
      const { data: rawData, error } = await this.supabase
        .from('user_suggestions')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error || !rawData) return null

      // Cast to expected type
      const userSuggestions = rawData as unknown as UserSuggestionsRow

      // Fetch the actual templates
      const [prompts, workflows, searches] = await Promise.all([
        this.fetchPromptsByIds(userSuggestions.suggested_prompts || []),
        this.fetchWorkflowsByIds(userSuggestions.suggested_workflows || []),
        this.fetchSearchesByIds(userSuggestions.suggested_searches || []),
      ])

      return {
        prompts,
        workflows,
        searches,
        customPrompts: userSuggestions.custom_prompts || [],
      }
    } catch (error) {
      console.error('Error getting user suggestions:', error)
      return null
    }
  }

  private async fetchPromptsByIds(ids: string[]): Promise<PromptTemplate[]> {
    if (ids.length === 0) return []
    const { data } = await this.supabase
      .from('prompt_templates')
      .select('*')
      .in('id', ids)
    return (data as unknown as PromptTemplate[]) || []
  }

  private async fetchWorkflowsByIds(ids: string[]): Promise<WorkflowTemplate[]> {
    if (ids.length === 0) return []
    const { data } = await this.supabase
      .from('workflow_templates')
      .select('*')
      .in('id', ids)
    return (data as unknown as WorkflowTemplate[]) || []
  }

  private async fetchSearchesByIds(ids: string[]): Promise<SearchSuggestion[]> {
    if (ids.length === 0) return []
    const { data } = await this.supabase
      .from('search_suggestions')
      .select('*')
      .in('id', ids)
    return (data as unknown as SearchSuggestion[]) || []
  }

  /**
   * Track when a user uses a suggestion
   */
  async trackSuggestionUsage(
    userId: string,
    suggestionType: 'prompt' | 'workflow' | 'search' | 'custom',
    suggestionId: string,
    action: 'viewed' | 'clicked' | 'used' | 'completed' | 'rated' | 'dismissed',
    rating?: number
  ): Promise<void> {
    try {
      await this.supabase.from('suggestion_analytics').insert({
        user_id: userId,
        suggestion_type: suggestionType,
        suggestion_id: suggestionId,
        action,
        rating,
        created_at: new Date().toISOString(),
      } as any)

      // Update use count on the template
      if (action === 'used') {
        const tableName = suggestionType === 'prompt' ? 'prompt_templates' 
          : suggestionType === 'workflow' ? 'workflow_templates'
          : 'search_suggestions'
        
        await this.supabase.rpc('increment_use_count', { 
          table_name: tableName, 
          row_id: suggestionId 
        })
      }
    } catch (error) {
      console.error('Error tracking suggestion usage:', error)
    }
  }

  /**
   * Mark user suggestions as stale (when they update preferences)
   */
  async markSuggestionsStale(userId: string): Promise<void> {
    await this.supabase
      .from('user_suggestions')
      .update({ is_stale: true, updated_at: new Date().toISOString() } as any)
      .eq('user_id', userId)
  }
}

// Export a factory function for creating the service
export function createSuggestionService() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const geminiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY

  return new PersonalizedSuggestionService(supabaseUrl, supabaseKey, geminiKey)
}
