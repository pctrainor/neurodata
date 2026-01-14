/**
 * Demo Content Library
 * 
 * Real-world content examples for testing and demo purposes.
 * These are actual trending videos and content that can be used
 * to demonstrate the Content Impact Analyzer and other workflows.
 */

export interface DemoContent {
  id: string
  title: string
  url: string
  platform: 'youtube' | 'tiktok' | 'twitter' | 'news' | 'podcast'
  category: string
  description: string
  thumbnailUrl?: string
  duration?: string
  views?: string
  tags: string[]
  addedAt: string
}

// ============================================
// VIRAL YOUTUBE CONTENT
// ============================================
export const viralYouTubeContent: DemoContent[] = [
  {
    id: 'mrbeast-squid-game',
    title: 'MrBeast $456,000 Squid Game Recreation',
    url: 'https://www.youtube.com/watch?v=0e3GPea1Tyg',
    platform: 'youtube',
    category: 'Entertainment',
    description: 'Most viewed YouTube video of all time. Perfect for testing mass-appeal content impact.',
    duration: '25:41',
    views: '650M+',
    tags: ['mrbeast', 'squid game', 'viral', 'challenge', 'money'],
    addedAt: '2025-11-01',
  },
  {
    id: 'baby-shark',
    title: 'Baby Shark Dance - Most Viewed Video Ever',
    url: 'https://www.youtube.com/watch?v=XqZsoesa55w',
    platform: 'youtube',
    category: 'Kids/Music',
    description: 'The most viewed YouTube video in history. Test how different age groups respond.',
    duration: '2:17',
    views: '14B+',
    tags: ['baby shark', 'kids', 'music', 'viral', 'dance'],
    addedAt: '2025-01-01',
  },
  {
    id: 'charlie-bit-me',
    title: 'Charlie Bit My Finger - Original Viral Video',
    url: 'https://www.youtube.com/watch?v=_OBlgSz8sSM',
    platform: 'youtube',
    category: 'Classic Viral',
    description: 'One of the first YouTube viral hits. Analyze nostalgia and simple humor impact.',
    duration: '0:56',
    views: '900M+',
    tags: ['viral', 'classic', 'nostalgia', 'kids', 'funny'],
    addedAt: '2025-01-01',
  },
  {
    id: 'gangnam-style',
    title: 'PSY - Gangnam Style',
    url: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
    platform: 'youtube',
    category: 'Music',
    description: 'First video to hit 1B views. Test cross-cultural viral content appeal.',
    duration: '4:13',
    views: '5B+',
    tags: ['psy', 'kpop', 'dance', 'viral', 'music'],
    addedAt: '2025-01-01',
  },
  {
    id: 'despacito',
    title: 'Luis Fonsi - Despacito ft. Daddy Yankee',
    url: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
    platform: 'youtube',
    category: 'Music',
    description: 'Most liked YouTube video. Analyze emotional response to music videos.',
    duration: '4:42',
    views: '8B+',
    tags: ['despacito', 'latin', 'music', 'viral', 'dance'],
    addedAt: '2025-01-01',
  },
  {
    id: 'mark-rober-glitter',
    title: 'Mark Rober - Glitter Bomb Trap for Package Thieves',
    url: 'https://www.youtube.com/watch?v=xoxhDk-hwuo',
    platform: 'youtube',
    category: 'Tech/DIY',
    description: 'Viral engineering revenge video. Test satisfaction and justice response.',
    duration: '10:59',
    views: '120M+',
    tags: ['mark rober', 'engineering', 'revenge', 'viral', 'satisfying'],
    addedAt: '2025-01-01',
  },
]

// ============================================
// TIKTOK VIRAL CONTENT
// ============================================
export const viralTikTokContent: DemoContent[] = [
  {
    id: 'tiktok-bella-poarch',
    title: 'Bella Poarch - M to the B',
    url: 'https://www.tiktok.com/@bellapoarch/video/6862153058223197445',
    platform: 'tiktok',
    category: 'Music/Lip Sync',
    description: 'Most liked TikTok ever. Simple lip sync that captivated millions.',
    duration: '0:10',
    views: '700M+',
    tags: ['bella poarch', 'lip sync', 'viral', 'music'],
    addedAt: '2025-01-01',
  },
  {
    id: 'tiktok-ocean-spray',
    title: 'Fleetwood Mac Ocean Spray Skateboard',
    url: 'https://www.tiktok.com/@420doggface208/video/6876424179084709126',
    platform: 'tiktok',
    category: 'Lifestyle',
    description: 'The viral skateboard video that boosted Fleetwood Mac streams. Test nostalgia response.',
    duration: '0:25',
    views: '85M+',
    tags: ['fleetwood mac', 'skateboard', 'vibes', 'chill'],
    addedAt: '2025-01-01',
  },
  {
    id: 'tiktok-corn-kid',
    title: 'Corn Kid - "It\'s Corn!"',
    url: 'https://www.tiktok.com/@doingthings/video/7138879783280227630',
    platform: 'tiktok',
    category: 'Wholesome',
    description: 'Viral wholesome content that became a song. Test positive emotional response.',
    duration: '0:30',
    views: '50M+',
    tags: ['corn', 'wholesome', 'kids', 'viral', 'funny'],
    addedAt: '2025-01-01',
  },
]

// ============================================
// NEWS SEGMENTS (For Media Bias Analyzer)
// ============================================
export const newsSegments: DemoContent[] = [
  {
    id: 'cnn-breaking',
    title: 'CNN Breaking News Coverage',
    url: 'https://www.youtube.com/watch?v=fCBhvVwLcpY',
    platform: 'news',
    category: 'CNN',
    description: 'CNN live breaking news style. Analyze urgency framing impact.',
    duration: '10:00',
    views: '2M+',
    tags: ['cnn', 'breaking news', 'live', 'journalism'],
    addedAt: '2025-01-01',
  },
  {
    id: 'fox-news-segment',
    title: 'Fox News Opinion Segment',
    url: 'https://www.youtube.com/watch?v=WBZnau8Px5E',
    platform: 'news',
    category: 'Fox News',
    description: 'Conservative opinion programming. Compare viewer response by demographic.',
    duration: '8:00',
    views: '1.5M+',
    tags: ['fox news', 'opinion', 'conservative', 'politics'],
    addedAt: '2025-01-01',
  },
  {
    id: 'bbc-documentary',
    title: 'BBC Documentary Style Reporting',
    url: 'https://www.youtube.com/watch?v=rB7XFQo6bnk',
    platform: 'news',
    category: 'BBC',
    description: 'British neutral documentary style. Use as baseline for comparison.',
    duration: '15:00',
    views: '3M+',
    tags: ['bbc', 'documentary', 'neutral', 'british'],
    addedAt: '2025-01-01',
  },
  {
    id: 'ap-factual',
    title: 'AP News - Fact-Based Reporting',
    url: 'https://www.youtube.com/watch?v=9Auq9mYxFEE',
    platform: 'news',
    category: 'AP News',
    description: 'Wire service factual style. Control group for bias testing.',
    duration: '5:00',
    views: '500K+',
    tags: ['ap news', 'factual', 'neutral', 'wire service'],
    addedAt: '2025-01-01',
  },
]

// ============================================
// ADVERTISEMENT CONTENT
// ============================================
export const advertisementContent: DemoContent[] = [
  {
    id: 'apple-1984-ad',
    title: 'Apple 1984 Super Bowl Commercial',
    url: 'https://www.youtube.com/watch?v=VtvjbmoDx-I',
    platform: 'youtube',
    category: 'Classic Ad',
    description: 'Iconic Super Bowl ad that changed advertising forever. Test nostalgia and brand impact.',
    duration: '1:00',
    views: '20M+',
    tags: ['apple', 'super bowl', 'classic', 'iconic', '1984'],
    addedAt: '2025-01-01',
  },
  {
    id: 'old-spice-ad',
    title: 'Old Spice - The Man Your Man Could Smell Like',
    url: 'https://www.youtube.com/watch?v=owGykVbfgUE',
    platform: 'youtube',
    category: 'Humor Ad',
    description: 'Viral humorous ad campaign. Test humor effectiveness across demographics.',
    duration: '0:33',
    views: '60M+',
    tags: ['old spice', 'humor', 'viral', 'marketing'],
    addedAt: '2025-01-01',
  },
  {
    id: 'nike-dream-crazy',
    title: 'Nike - Dream Crazy (Colin Kaepernick)',
    url: 'https://www.youtube.com/watch?v=WW2yKSt2C7o',
    platform: 'youtube',
    category: 'Controversial Ad',
    description: 'Controversial Nike campaign. Test political brand response by demographic.',
    duration: '2:04',
    views: '30M+',
    tags: ['nike', 'controversial', 'political', 'sports'],
    addedAt: '2025-01-01',
  },
]

// ============================================
// EDUCATIONAL CONTENT
// ============================================
export const educationalContent: DemoContent[] = [
  {
    id: 'veritasium-turbo',
    title: 'Veritasium: The Surprising Secret of Turbulence',
    url: 'https://www.youtube.com/watch?v=5zI9sG3pjVU',
    platform: 'youtube',
    category: 'Science',
    description: 'Complex physics made accessible. Test science engagement across education levels.',
    duration: '22:18',
    views: '15M+',
    tags: ['veritasium', 'physics', 'science', 'education'],
    addedAt: '2025-01-01',
  },
  {
    id: 'kurzgesagt-blackhole',
    title: 'Kurzgesagt: What If You Fall Into a Black Hole?',
    url: 'https://www.youtube.com/watch?v=QqsLTNkzvaY',
    platform: 'youtube',
    category: 'Science Animation',
    description: 'Animated science explainer. Compare engagement with animated vs live content.',
    duration: '10:15',
    views: '25M+',
    tags: ['kurzgesagt', 'black hole', 'animation', 'science'],
    addedAt: '2025-01-01',
  },
]

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getAllDemoContent(): DemoContent[] {
  return [
    ...viralYouTubeContent,
    ...viralTikTokContent,
    ...newsSegments,
    ...advertisementContent,
    ...educationalContent,
  ]
}

export function getDemoContentByCategory(category: string): DemoContent[] {
  return getAllDemoContent().filter(c => c.category.toLowerCase().includes(category.toLowerCase()))
}

export function getDemoContentByPlatform(platform: DemoContent['platform']): DemoContent[] {
  return getAllDemoContent().filter(c => c.platform === platform)
}

export function getRandomDemoContent(count: number = 5): DemoContent[] {
  const all = getAllDemoContent()
  const shuffled = all.sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

// Featured content for the workflow marketplace
export const featuredDemoContent = {
  contentImpactAnalyzer: viralYouTubeContent[0], // Logan Paul knockout
  mediaBiasAnalyzer: newsSegments,
  adEffectivenessTester: advertisementContent[0], // Super Bowl ads
}
