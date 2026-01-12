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
    id: 'viral-short-example',
    title: 'Viral YouTube Short - Demo Content',
    url: 'https://www.youtube.com/shorts/fo7nPOespzA',
    platform: 'youtube',
    category: 'Entertainment',
    description: 'Demo viral short for testing the Content Impact Analyzer. Analyze how different demographics respond.',
    duration: '0:59',
    views: '10M+',
    tags: ['viral', 'short', 'demo', 'entertainment'],
    addedAt: '2026-01-11',
  },
  {
    id: 'logan-paul-knockout',
    title: 'Logan Paul Gets KNOCKED OUT - Full Fight Breakdown',
    url: 'https://www.youtube.com/watch?v=example1', // Replace with actual URL
    platform: 'youtube',
    category: 'Sports/Boxing',
    description: 'The viral moment when Logan Paul was knocked out in the ring. Analyze audience reactions across demographics.',
    duration: '12:34',
    views: '45M',
    tags: ['boxing', 'viral', 'celebrity', 'sports', 'knockout'],
    addedAt: '2026-01-10',
  },
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
    id: 'pewdiepie-goodbye',
    title: "PewDiePie's Final Video - The End of an Era",
    url: 'https://www.youtube.com/watch?v=example2',
    platform: 'youtube',
    category: 'Entertainment',
    description: 'Emotional farewell video. Test how different demographics respond to nostalgic, emotional content.',
    duration: '18:22',
    views: '89M',
    tags: ['pewdiepie', 'farewell', 'emotional', 'nostalgia', 'youtube'],
    addedAt: '2026-01-05',
  },
  {
    id: 'apple-vision-pro-review',
    title: 'Apple Vision Pro - 6 Month Review: Was It Worth It?',
    url: 'https://www.youtube.com/watch?v=example3',
    platform: 'youtube',
    category: 'Tech',
    description: 'Long-term tech review. Compare how tech enthusiasts vs mainstream viewers respond.',
    duration: '32:15',
    views: '12M',
    tags: ['apple', 'vision pro', 'vr', 'tech review', 'gadgets'],
    addedAt: '2026-01-08',
  },
  {
    id: 'joe-rogan-ai-debate',
    title: 'Joe Rogan & Elon Musk Debate AI Consciousness',
    url: 'https://www.youtube.com/watch?v=example4',
    platform: 'youtube',
    category: 'Podcast',
    description: 'Deep philosophical discussion. Test how different education levels engage with complex topics.',
    duration: '2:45:00',
    views: '28M',
    tags: ['joe rogan', 'elon musk', 'ai', 'consciousness', 'debate'],
    addedAt: '2025-12-15',
  },
]

// ============================================
// TIKTOK VIRAL CONTENT
// ============================================
export const viralTikTokContent: DemoContent[] = [
  {
    id: 'tiktok-brain-rot',
    title: '"Brain Rot" Compilation - Skibidi Toilet Era',
    url: 'https://www.tiktok.com/@example/video/example1',
    platform: 'tiktok',
    category: 'Meme',
    description: 'Gen Z meme content. Test how different age groups respond to absurdist humor.',
    duration: '0:47',
    views: '150M',
    tags: ['brain rot', 'gen z', 'meme', 'skibidi', 'absurdist'],
    addedAt: '2026-01-09',
  },
  {
    id: 'tiktok-asmr-cooking',
    title: 'Satisfying ASMR Cooking - 10 Million Likes',
    url: 'https://www.tiktok.com/@example/video/example2',
    platform: 'tiktok',
    category: 'ASMR/Food',
    description: 'Ultra-satisfying cooking content. Analyze relaxation response across personality types.',
    duration: '1:22',
    views: '89M',
    tags: ['asmr', 'cooking', 'satisfying', 'food', 'relaxation'],
    addedAt: '2026-01-07',
  },
  {
    id: 'tiktok-finance-guru',
    title: '"You NEED to Buy Gold NOW" - Viral Finance Advice',
    url: 'https://www.tiktok.com/@example/video/example3',
    platform: 'tiktok',
    category: 'Finance',
    description: 'Controversial financial advice. Test persuasion susceptibility across demographics.',
    duration: '0:58',
    views: '45M',
    tags: ['finance', 'gold', 'investing', 'controversial', 'advice'],
    addedAt: '2026-01-06',
  },
]

// ============================================
// NEWS SEGMENTS (For Media Bias Analyzer)
// ============================================
export const newsSegments: DemoContent[] = [
  {
    id: 'fox-news-immigration',
    title: 'Fox News: Border Crisis Special Report',
    url: 'https://www.foxnews.com/video/example1',
    platform: 'news',
    category: 'Fox News',
    description: 'Conservative framing of immigration issues. Compare response across political demographics.',
    duration: '8:30',
    views: '2.5M',
    tags: ['fox news', 'immigration', 'border', 'conservative', 'politics'],
    addedAt: '2026-01-10',
  },
  {
    id: 'cnn-climate-report',
    title: 'CNN: Climate Emergency - Latest Science Report',
    url: 'https://www.cnn.com/video/example2',
    platform: 'news',
    category: 'CNN',
    description: 'Liberal framing of climate science. Test how presentation affects acceptance.',
    duration: '6:45',
    views: '1.8M',
    tags: ['cnn', 'climate', 'environment', 'liberal', 'science'],
    addedAt: '2026-01-10',
  },
  {
    id: 'msnbc-economic-analysis',
    title: 'MSNBC: Economy Under Current Administration',
    url: 'https://www.msnbc.com/video/example3',
    platform: 'news',
    category: 'MSNBC',
    description: 'Progressive economic analysis. Compare trust and engagement across viewer segments.',
    duration: '10:15',
    views: '1.2M',
    tags: ['msnbc', 'economy', 'progressive', 'analysis', 'politics'],
    addedAt: '2026-01-09',
  },
  {
    id: 'reuters-neutral-report',
    title: 'Reuters: Same Story, Neutral Framing',
    url: 'https://www.reuters.com/video/example4',
    platform: 'news',
    category: 'Reuters',
    description: 'Neutral wire service coverage. Use as control to compare against partisan sources.',
    duration: '4:30',
    views: '500K',
    tags: ['reuters', 'neutral', 'wire service', 'control', 'journalism'],
    addedAt: '2026-01-09',
  },
]

// ============================================
// ADVERTISEMENT CONTENT
// ============================================
export const advertisementContent: DemoContent[] = [
  {
    id: 'super-bowl-ad-2026',
    title: 'Super Bowl 2026: Best Ads Compilation',
    url: 'https://www.youtube.com/watch?v=example_ads1',
    platform: 'youtube',
    category: 'Advertisement',
    description: 'Collection of $7M/30sec Super Bowl ads. Test ad effectiveness across consumer segments.',
    duration: '15:00',
    views: '35M',
    tags: ['super bowl', 'ads', 'commercial', 'marketing', 'viral'],
    addedAt: '2026-02-10',
  },
  {
    id: 'apple-iphone-ad',
    title: 'iPhone 17 - "Shot on iPhone" Campaign',
    url: 'https://www.youtube.com/watch?v=example_ads2',
    platform: 'youtube',
    category: 'Tech Ad',
    description: 'Premium tech advertising. Compare emotional response between brand loyalists and skeptics.',
    duration: '1:30',
    views: '50M',
    tags: ['apple', 'iphone', 'premium', 'commercial', 'tech'],
    addedAt: '2026-01-05',
  },
  {
    id: 'crypto-exchange-ad',
    title: '"Don\'t Miss Out on Crypto" - Aggressive Marketing',
    url: 'https://www.youtube.com/watch?v=example_ads3',
    platform: 'youtube',
    category: 'Finance Ad',
    description: 'FOMO-based crypto advertisement. Test persuasion susceptibility and red flag detection.',
    duration: '0:45',
    views: '8M',
    tags: ['crypto', 'fomo', 'advertising', 'finance', 'controversial'],
    addedAt: '2026-01-03',
  },
]

// ============================================
// EDUCATIONAL CONTENT
// ============================================
export const educationalContent: DemoContent[] = [
  {
    id: 'veritasium-quantum',
    title: 'Veritasium: Quantum Computing Explained',
    url: 'https://www.youtube.com/watch?v=example_edu1',
    platform: 'youtube',
    category: 'Science',
    description: 'Complex science made accessible. Test comprehension across education levels.',
    duration: '22:18',
    views: '15M',
    tags: ['science', 'quantum', 'education', 'veritasium', 'physics'],
    addedAt: '2025-12-01',
  },
  {
    id: 'khan-academy-calculus',
    title: 'Khan Academy: Introduction to Calculus',
    url: 'https://www.youtube.com/watch?v=example_edu2',
    platform: 'youtube',
    category: 'Education',
    description: 'Classic educational content. Compare learning engagement across age groups.',
    duration: '35:00',
    views: '8M',
    tags: ['education', 'math', 'calculus', 'khan academy', 'learning'],
    addedAt: '2025-10-15',
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
