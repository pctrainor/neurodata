# Personalized Suggestions System

A comprehensive system for generating tailored prompts, workflow templates, and search suggestions based on user onboarding preferences.

## Overview

When users complete the onboarding wizard, this system:
1. Captures their background, interests, experience level, and goals
2. Matches them against a library of pre-built prompt templates
3. Generates AI-powered custom prompts specifically for their profile
4. Stores personalized suggestions for quick access throughout the app

## Database Setup

Run these SQL files in your Supabase SQL Editor in order:

### 1. Schema (DDL)
```bash
database/personalized-suggestions-schema.sql
```

This creates:
- `prompt_templates` - Master library of AI wizard prompts
- `workflow_templates` - Pre-built workflow configurations
- `search_suggestions` - Suggested content to analyze
- `user_suggestions` - Computed suggestions per user
- `suggestion_analytics` - Engagement tracking
- `trending_topics` - Trending content for suggestions

### 2. Seed Data
```bash
database/personalized-suggestions-seed.sql
```

This populates templates for:
- **Content Creators**: TikTok, YouTube, Podcast creators
- **Marketing Professionals**: Campaign analysis, social strategy
- **Business Owners**: Competitor analysis, market research
- **Agency Professionals**: Client audits, multi-platform content
- **Students & Researchers**: Academic content, learning optimization
- **Niche-Specific**: Gaming, Tech, Finance, Music, Travel, Sports, News

## User Backgrounds Supported

| Background | Description |
|------------|-------------|
| `marketing` | Digital marketing professionals |
| `content_creator` | YouTubers, TikTokers, podcasters |
| `business_owner` | Entrepreneurs and founders |
| `agency` | Creative/marketing agency staff |
| `student` | Learning content strategy |
| `researcher` | Academic or industry research |

## Content Interests Supported

| Interest | Content Type |
|----------|--------------|
| `tech_reviews` | Technology, gadgets, software |
| `gaming` | Video games, esports, streaming |
| `business` | Entrepreneurship, startups |
| `education` | Tutorials, learning content |
| `entertainment` | Comedy, viral content |
| `sports` | Athletics, fitness |
| `music` | Music production, covers |
| `lifestyle` | Daily vlogs, personal brand |
| `news` | Current events, journalism |
| `science` | Research, experiments |
| `finance` | Investing, personal finance |
| `travel` | Destinations, adventures |

## Goals Supported

| Goal | Description |
|------|-------------|
| `grow_audience` | Increase subscribers/followers |
| `increase_engagement` | More likes, comments, shares |
| `improve_quality` | Better production value |
| `learn_trends` | Stay ahead of algorithm changes |
| `competitor_analysis` | Understand competitors |
| `monetization` | Maximize revenue |

## API Endpoints

### Generate Suggestions (POST)
```
POST /api/suggestions/generate
```

Called after onboarding to generate personalized suggestions.

**Request Body:**
```json
{
  "background": "content_creator",
  "experience_level": "intermediate",
  "content_interests": ["gaming", "tech_reviews"],
  "content_goals": ["grow_audience", "monetization"],
  "full_name": "John Doe",
  "institution": "Acme Inc"
}
```

### Get User Suggestions (GET)
```
GET /api/suggestions/generate
```

Returns the user's personalized suggestions.

**Response:**
```json
{
  "success": true,
  "suggestions": {
    "prompts": [...],
    "workflows": [...],
    "searches": [...],
    "customPrompts": [...]
  }
}
```

## Service Usage

```typescript
import { createSuggestionService } from '@/lib/personalized-suggestions'

// Create service instance
const service = createSuggestionService()

// Generate suggestions for a user
await service.generateSuggestionsForUser(userId, {
  background: 'content_creator',
  experience_level: 'intermediate',
  content_interests: ['gaming', 'tech_reviews'],
  content_goals: ['grow_audience'],
})

// Get user's suggestions
const suggestions = await service.getUserSuggestions(userId)

// Track engagement
await service.trackSuggestionUsage(userId, 'prompt', promptId, 'used')
```

## How Matching Works

Suggestions are ranked by a weighted scoring system:

| Factor | Weight |
|--------|--------|
| Background match | 10 points |
| Each interest match | 5 points |
| Each goal match | 4 points |
| Experience level match | 3 points |
| Featured template | 5 points |
| Trending content | 8 points |
| Popularity bonus | Up to 3 points |

## Custom AI Prompts

In addition to matching against the library, the system uses Gemini 2.0 Flash to generate 5 custom prompts specifically tailored to each user's unique profile combination.

Example for a Gaming Content Creator focused on audience growth:
- "Gaming Highlight Optimizer" - Find the perfect clips
- "Viral Element Detector" - What makes content shareable
- "Trending Game Analyzer" - Stay ahead of gaming trends

## Integration with Onboarding

The onboarding API (`/api/onboarding`) automatically triggers suggestion generation when users complete the wizard. The new preferences are extracted and passed to the suggestion service.

## Analytics

Track how users interact with suggestions:
- `viewed` - Suggestion was shown
- `clicked` - User clicked for details
- `used` - User started using the suggestion
- `completed` - User completed the workflow
- `rated` - User rated the suggestion (1-5)
- `dismissed` - User dismissed the suggestion

## Environment Variables

Required:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

Optional (for AI-generated custom prompts):
- `GOOGLE_GEMINI_API_KEY` or `GEMINI_API_KEY` - For generating custom prompts
- `SUPABASE_SERVICE_ROLE_KEY` - For server-side operations

## Extending the System

### Adding New Prompt Templates

```sql
INSERT INTO prompt_templates (
  title, description, prompt_text, category, subcategory,
  target_backgrounds, target_interests, target_goals, target_experience_levels,
  icon, gradient, difficulty, estimated_time, is_featured
) VALUES (
  'My New Prompt',
  'Description of what this prompt does',
  'The actual prompt text to send to AI...',
  'content_creation', 'youtube',
  ARRAY['content_creator', 'marketing'],
  ARRAY['tech_reviews', 'gaming'],
  ARRAY['grow_audience'],
  ARRAY['beginner', 'intermediate'],
  'sparkles', 'from-purple-500 to-pink-600', 'beginner', '5-10 min', TRUE
);
```

### Adding New Workflow Templates

```sql
INSERT INTO workflow_templates (
  name, description, nodes, edges, category,
  target_backgrounds, target_interests,
  icon, gradient, difficulty, node_count, estimated_time, is_featured
) VALUES (
  'My Workflow',
  'What this workflow does',
  '[{"id":"node-1","type":"contentUrlInputNode",...}]',
  '[{"id":"edge-1","source":"node-1","target":"node-2"}]',
  'analysis',
  ARRAY['content_creator'],
  ARRAY['gaming'],
  'brain', 'from-indigo-500 to-purple-600', 'beginner', 3, '5 min', TRUE
);
```
