-- ============================================
-- PERSONALIZED SUGGESTIONS - SEED DATA
-- ============================================
-- Run this AFTER the schema DDL
-- Contains comprehensive prompt templates, workflow templates, and search suggestions
-- for all user backgrounds, interests, and goals
-- ============================================

-- ============================================
-- PROMPT TEMPLATES - CONTENT CREATORS
-- ============================================

-- TikTok Content Creators
INSERT INTO prompt_templates (title, description, prompt_text, category, subcategory, target_backgrounds, target_interests, target_goals, target_experience_levels, icon, gradient, difficulty, estimated_time, is_featured) VALUES

('Viral TikTok Hook Analyzer', 
 'Analyze what makes TikTok hooks go viral in your niche', 
 'Analyze this TikTok video and break down the hook structure. Identify the first 3 seconds attention grab, the pattern interrupt technique used, and why it would make viewers stop scrolling. Suggest 5 alternative hooks I could use for similar content.',
 'content_creation', 'tiktok',
 ARRAY['content_creator', 'marketing', 'agency'],
 ARRAY['entertainment', 'lifestyle', 'music'],
 ARRAY['grow_audience', 'increase_engagement'],
 ARRAY['beginner', 'intermediate'],
 'zap', 'from-pink-500 to-rose-600', 'beginner', '3-5 min', TRUE),

('TikTok Trend Reverse Engineering',
 'Decode trending TikTok formats and sounds for your niche',
 'Analyze this trending TikTok and reverse engineer the format. Break down: 1) The audio/sound choice and why it works, 2) The visual template structure, 3) The text overlay strategy, 4) The timing and pacing. Then suggest how I can adapt this trend for [MY NICHE] content.',
 'content_creation', 'tiktok',
 ARRAY['content_creator', 'marketing'],
 ARRAY['entertainment', 'music', 'lifestyle'],
 ARRAY['learn_trends', 'grow_audience'],
 ARRAY['beginner', 'intermediate', 'advanced'],
 'trending-up', 'from-fuchsia-500 to-pink-600', 'intermediate', '5-8 min', TRUE),

('TikTok Algorithm Optimization',
 'Understand why some videos get pushed by the algorithm',
 'Analyze this TikTok video performance. Evaluate: watch time optimization (loop potential, pacing), engagement triggers (questions, CTAs, controversy), hashtag strategy, posting time implications, and sound virality. Provide a score out of 100 for algorithm-friendliness.',
 'content_creation', 'tiktok',
 ARRAY['content_creator', 'marketing', 'agency'],
 ARRAY['entertainment', 'gaming', 'lifestyle'],
 ARRAY['grow_audience', 'learn_trends'],
 ARRAY['intermediate', 'advanced'],
 'brain', 'from-violet-500 to-purple-600', 'advanced', '8-12 min', FALSE),

-- YouTube Content Creators
('YouTube Thumbnail Psychology Analysis',
 'Decode what makes thumbnails irresistible to click',
 'Analyze this YouTube video thumbnail and break down the psychological triggers: facial expressions, color contrast, text placement, curiosity gap, and emotional appeal. Rate CTR potential and suggest 3 thumbnail variations that could outperform the original.',
 'content_creation', 'youtube',
 ARRAY['content_creator', 'marketing', 'agency'],
 ARRAY['tech_reviews', 'gaming', 'education', 'entertainment'],
 ARRAY['grow_audience', 'increase_engagement'],
 ARRAY['beginner', 'intermediate', 'advanced'],
 'image', 'from-red-500 to-orange-600', 'intermediate', '5-8 min', TRUE),

('YouTube Title A/B Test Generator',
 'Generate high-CTR title variations for your videos',
 'Analyze this YouTube video and its current title. Generate 10 alternative titles using different psychological frameworks: curiosity gap, number-based, how-to, challenge, controversy, transformation, fear of missing out, and authority-based. Rank them by predicted CTR.',
 'content_creation', 'youtube',
 ARRAY['content_creator', 'marketing', 'business_owner'],
 ARRAY['tech_reviews', 'education', 'business'],
 ARRAY['grow_audience', 'increase_engagement'],
 ARRAY['beginner', 'intermediate'],
 'type', 'from-red-600 to-rose-600', 'beginner', '3-5 min', TRUE),

('YouTube Competitor Deep Dive',
 'Analyze top competitors to find content gaps and opportunities',
 'Analyze this YouTube channel as a competitor. Break down: 1) Their content strategy and upload patterns, 2) Best performing video formats, 3) Title and thumbnail patterns, 4) Audience engagement style, 5) Content gaps I could fill, 6) What they do better than me, and 7) Unique angles I could take.',
 'content_creation', 'youtube',
 ARRAY['content_creator', 'business_owner', 'agency'],
 ARRAY['tech_reviews', 'gaming', 'business', 'education'],
 ARRAY['competitor_analysis', 'grow_audience'],
 ARRAY['intermediate', 'advanced'],
 'users', 'from-amber-500 to-orange-600', 'advanced', '10-15 min', FALSE),

('YouTube Video Structure Breakdown',
 'Analyze video pacing, retention hooks, and structure',
 'Analyze this YouTube video structure. Map out the retention curve by identifying: intro hook (0-30s), content pillars, retention hooks used throughout, pace changes, B-roll usage, call-to-action placement, and end screen strategy. Suggest improvements for better watch time.',
 'content_creation', 'youtube',
 ARRAY['content_creator', 'agency'],
 ARRAY['education', 'tech_reviews', 'entertainment'],
 ARRAY['improve_quality', 'increase_engagement'],
 ARRAY['intermediate', 'advanced'],
 'film', 'from-red-500 to-pink-600', 'advanced', '10-15 min', FALSE),

-- Podcast Creators
('Podcast Episode Title Optimizer',
 'Generate compelling podcast episode titles that drive downloads',
 'Analyze this podcast episode content and generate 10 episode title options. Consider: searchability, curiosity hooks, guest name inclusion, numbered lists, question formats, and controversy angles. Include suggested episode descriptions for each.',
 'content_creation', 'podcast',
 ARRAY['content_creator', 'business_owner', 'researcher'],
 ARRAY['business', 'education', 'entertainment'],
 ARRAY['grow_audience', 'improve_quality'],
 ARRAY['beginner', 'intermediate'],
 'mic', 'from-green-500 to-emerald-600', 'beginner', '5-8 min', FALSE),

('Podcast Guest Research Assistant',
 'Prepare thoroughly for podcast guest interviews',
 'Research this person as a potential podcast guest. Find: their background and expertise, recent work and achievements, controversial or interesting opinions, previous podcast appearances (and what they discussed), social media presence, and generate 15 unique interview questions they probably haven''t been asked before.',
 'content_creation', 'podcast',
 ARRAY['content_creator', 'business_owner'],
 ARRAY['business', 'education', 'entertainment'],
 ARRAY['improve_quality', 'grow_audience'],
 ARRAY['intermediate', 'advanced'],
 'user-check', 'from-teal-500 to-cyan-600', 'intermediate', '10-15 min', FALSE);

-- ============================================
-- PROMPT TEMPLATES - MARKETING PROFESSIONALS
-- ============================================

INSERT INTO prompt_templates (title, description, prompt_text, category, subcategory, target_backgrounds, target_interests, target_goals, target_experience_levels, icon, gradient, difficulty, estimated_time, is_featured) VALUES

('Viral Marketing Campaign Analyzer',
 'Decode successful marketing campaigns to replicate their success',
 'Analyze this marketing campaign/advertisement. Break down: 1) Target audience identification, 2) Emotional triggers used, 3) Value proposition clarity, 4) Call-to-action effectiveness, 5) Channel strategy, 6) Viral mechanics (if any), 7) Estimated budget and ROI. Suggest how to adapt this for my brand.',
 'marketing', 'campaigns',
 ARRAY['marketing', 'agency', 'business_owner'],
 ARRAY['business', 'entertainment'],
 ARRAY['learn_trends', 'competitor_analysis'],
 ARRAY['intermediate', 'advanced'],
 'megaphone', 'from-blue-500 to-indigo-600', 'advanced', '10-15 min', TRUE),

('Social Media Content Calendar Generator',
 'Plan a month of content based on trending topics and your niche',
 'Analyze trending topics and content in [MY NICHE]. Generate a 30-day social media content calendar with: daily post ideas, optimal posting times, hashtag suggestions, content mix (educational, entertaining, promotional), trending sounds/formats to use, and key dates/events to leverage.',
 'marketing', 'social_media',
 ARRAY['marketing', 'agency', 'content_creator', 'business_owner'],
 ARRAY['business', 'lifestyle', 'tech_reviews'],
 ARRAY['grow_audience', 'learn_trends'],
 ARRAY['beginner', 'intermediate'],
 'calendar', 'from-purple-500 to-pink-600', 'intermediate', '15-20 min', TRUE),

('Brand Voice Analyzer',
 'Define and document a brand voice from existing content',
 'Analyze this brand''s content across their channels. Document their: tone (formal/casual/playful), vocabulary patterns, emoji usage, sentence structure, humor style, values expressed, audience relationship style, and unique phrases. Create a brand voice guide I can use.',
 'marketing', 'branding',
 ARRAY['marketing', 'agency', 'business_owner'],
 ARRAY['business'],
 ARRAY['improve_quality'],
 ARRAY['intermediate', 'advanced'],
 'palette', 'from-amber-500 to-yellow-600', 'intermediate', '10-15 min', FALSE),

('Influencer Vetting Report',
 'Deep dive analysis of potential influencer partnerships',
 'Analyze this influencer for potential partnership. Evaluate: 1) Audience authenticity (follower quality), 2) Engagement rate trends, 3) Brand safety check, 4) Content quality and consistency, 5) Previous brand partnerships, 6) Audience demographics fit, 7) Rate estimation, 8) Partnership risk assessment.',
 'marketing', 'influencer',
 ARRAY['marketing', 'agency', 'business_owner'],
 ARRAY['business', 'lifestyle', 'entertainment'],
 ARRAY['competitor_analysis', 'monetization'],
 ARRAY['intermediate', 'advanced'],
 'badge-check', 'from-green-500 to-teal-600', 'advanced', '10-15 min', FALSE),

('Ad Creative Analysis',
 'Break down high-performing ad creatives',
 'Analyze this advertisement creative. Evaluate: visual hierarchy, copy framework (AIDA, PAS, etc.), emotional triggers, social proof elements, urgency tactics, brand consistency, mobile optimization, and predicted performance. Generate 5 variations that could outperform the original.',
 'marketing', 'advertising',
 ARRAY['marketing', 'agency'],
 ARRAY['business'],
 ARRAY['improve_quality', 'learn_trends'],
 ARRAY['intermediate', 'advanced'],
 'layout', 'from-indigo-500 to-blue-600', 'advanced', '8-12 min', FALSE);

-- ============================================
-- PROMPT TEMPLATES - BUSINESS OWNERS
-- ============================================

INSERT INTO prompt_templates (title, description, prompt_text, category, subcategory, target_backgrounds, target_interests, target_goals, target_experience_levels, icon, gradient, difficulty, estimated_time, is_featured) VALUES

('Competitor Product Teardown',
 'Deep analysis of competitor products and positioning',
 'Analyze this competitor product/service. Create a comprehensive teardown: 1) Feature comparison matrix, 2) Pricing strategy analysis, 3) Target market positioning, 4) Unique selling propositions, 5) Customer pain points addressed, 6) Weaknesses to exploit, 7) Market positioning opportunities for my product.',
 'business', 'competitive_analysis',
 ARRAY['business_owner', 'marketing'],
 ARRAY['business', 'tech_reviews'],
 ARRAY['competitor_analysis'],
 ARRAY['intermediate', 'advanced'],
 'search', 'from-slate-500 to-zinc-600', 'advanced', '15-20 min', TRUE),

('Customer Review Mining',
 'Extract insights from customer reviews at scale',
 'Analyze customer reviews for this product/company. Extract: 1) Top 5 praised features, 2) Top 5 complaints, 3) Unexpected use cases, 4) Emotional language patterns, 5) Competitor mentions, 6) Feature requests, 7) Customer segment insights. Create an action plan based on findings.',
 'business', 'customer_insights',
 ARRAY['business_owner', 'marketing', 'agency'],
 ARRAY['business', 'tech_reviews'],
 ARRAY['improve_quality', 'competitor_analysis'],
 ARRAY['intermediate', 'advanced'],
 'message-square', 'from-emerald-500 to-green-600', 'intermediate', '10-15 min', FALSE),

('Pitch Deck Analyzer',
 'Evaluate and improve startup pitch decks',
 'Analyze this pitch deck/business presentation. Evaluate: story flow, problem-solution clarity, market size validation, competitive positioning, team credibility, financial projections reasonability, ask clarity, and design quality. Provide specific improvement recommendations for each section.',
 'business', 'fundraising',
 ARRAY['business_owner', 'student'],
 ARRAY['business', 'finance'],
 ARRAY['improve_quality'],
 ARRAY['intermediate', 'advanced'],
 'presentation', 'from-violet-500 to-purple-600', 'advanced', '15-20 min', FALSE),

('Market Entry Strategy Generator',
 'Analyze market opportunities for new product launches',
 'Analyze this market/industry for potential entry. Research: 1) Market size and growth trends, 2) Key players and market share, 3) Customer segments and needs, 4) Regulatory considerations, 5) Entry barriers, 6) Potential partnerships, 7) Go-to-market strategy recommendations.',
 'business', 'strategy',
 ARRAY['business_owner', 'marketing'],
 ARRAY['business', 'finance'],
 ARRAY['grow_audience', 'competitor_analysis'],
 ARRAY['advanced', 'expert'],
 'target', 'from-blue-600 to-cyan-600', 'advanced', '20-30 min', FALSE);

-- ============================================
-- PROMPT TEMPLATES - STUDENTS & RESEARCHERS
-- ============================================

INSERT INTO prompt_templates (title, description, prompt_text, category, subcategory, target_backgrounds, target_interests, target_goals, target_experience_levels, icon, gradient, difficulty, estimated_time, is_featured) VALUES

('Research Paper Summarizer',
 'Get key insights from academic papers quickly',
 'Analyze this research paper/article. Extract: 1) Key thesis/hypothesis, 2) Methodology overview, 3) Main findings, 4) Limitations acknowledged, 5) Future research suggested, 6) How this connects to [MY RESEARCH AREA], 7) Potential citation use cases.',
 'research', 'academic',
 ARRAY['researcher', 'student'],
 ARRAY['science', 'education'],
 ARRAY['learn_trends', 'improve_quality'],
 ARRAY['beginner', 'intermediate', 'advanced'],
 'file-text', 'from-cyan-500 to-blue-600', 'intermediate', '5-10 min', TRUE),

('Literature Review Assistant',
 'Map relationships between research papers',
 'Analyze these research sources for my literature review on [TOPIC]. Identify: 1) Common themes across papers, 2) Conflicting findings, 3) Methodological approaches used, 4) Research gaps in the field, 5) Key authors and citation networks, 6) Suggested structure for my literature review.',
 'research', 'academic',
 ARRAY['researcher', 'student'],
 ARRAY['science', 'education'],
 ARRAY['improve_quality'],
 ARRAY['intermediate', 'advanced'],
 'library', 'from-indigo-500 to-violet-600', 'advanced', '20-30 min', FALSE),

('Study Content Analyzer',
 'Break down educational content for better learning',
 'Analyze this educational content (video/article/lecture). Create: 1) Key concept summary, 2) Important definitions, 3) Relationships between concepts, 4) Practice questions to test understanding, 5) Common misconceptions to avoid, 6) Related topics to explore.',
 'education', 'learning',
 ARRAY['student', 'researcher'],
 ARRAY['education', 'science'],
 ARRAY['improve_quality'],
 ARRAY['beginner', 'intermediate'],
 'book-open', 'from-yellow-500 to-amber-600', 'beginner', '5-10 min', TRUE),

('Thesis Outline Generator',
 'Structure your research thesis or dissertation',
 'Based on my research topic [TOPIC] and preliminary findings, generate a comprehensive thesis outline. Include: 1) Suggested chapter structure, 2) Key arguments for each section, 3) Methodology recommendations, 4) Potential challenges and solutions, 5) Timeline estimation.',
 'research', 'academic',
 ARRAY['student', 'researcher'],
 ARRAY['education', 'science'],
 ARRAY['improve_quality'],
 ARRAY['advanced', 'expert'],
 'graduation-cap', 'from-purple-600 to-pink-600', 'advanced', '15-20 min', FALSE);

-- ============================================
-- PROMPT TEMPLATES - AGENCY PROFESSIONALS
-- ============================================

INSERT INTO prompt_templates (title, description, prompt_text, category, subcategory, target_backgrounds, target_interests, target_goals, target_experience_levels, icon, gradient, difficulty, estimated_time, is_featured) VALUES

('Client Social Audit',
 'Comprehensive social media audit for client onboarding',
 'Perform a comprehensive social media audit for this brand. Analyze: 1) Profile optimization across platforms, 2) Content performance by type, 3) Posting frequency and timing, 4) Engagement rates vs industry benchmarks, 5) Audience growth trends, 6) Competitor comparison, 7) Top 10 recommendations.',
 'agency', 'audits',
 ARRAY['agency', 'marketing'],
 ARRAY['business'],
 ARRAY['competitor_analysis', 'improve_quality'],
 ARRAY['intermediate', 'advanced'],
 'clipboard-check', 'from-teal-500 to-emerald-600', 'advanced', '20-30 min', TRUE),

('Client Pitch Research',
 'Research potential clients for winning pitches',
 'Research this company as a potential client. Find: 1) Current marketing challenges (from job postings, news, reviews), 2) Recent campaigns and performance, 3) Competitors'' marketing strategies, 4) Decision maker contacts, 5) Budget indicators, 6) Perfect pitch angles for our agency.',
 'agency', 'business_development',
 ARRAY['agency'],
 ARRAY['business'],
 ARRAY['grow_audience', 'monetization'],
 ARRAY['intermediate', 'advanced'],
 'briefcase', 'from-blue-600 to-indigo-600', 'advanced', '15-20 min', FALSE),

('Multi-Platform Content Adapter',
 'Adapt content for different social platforms',
 'Analyze this piece of content and adapt it for multiple platforms. Create optimized versions for: 1) Instagram (carousel, reel, story), 2) TikTok (with trending sound suggestions), 3) LinkedIn (professional angle), 4) Twitter/X (thread format), 5) YouTube (short and long-form). Include platform-specific best practices.',
 'agency', 'content',
 ARRAY['agency', 'marketing', 'content_creator'],
 ARRAY['business', 'entertainment'],
 ARRAY['grow_audience', 'improve_quality'],
 ARRAY['intermediate', 'advanced'],
 'share-2', 'from-pink-500 to-rose-600', 'intermediate', '10-15 min', FALSE);

-- ============================================
-- PROMPT TEMPLATES - NICHE SPECIFIC
-- ============================================

INSERT INTO prompt_templates (title, description, prompt_text, category, subcategory, target_backgrounds, target_interests, target_goals, target_experience_levels, icon, gradient, difficulty, estimated_time, is_featured) VALUES

-- Gaming
('Gaming Video Retention Analyzer',
 'Optimize gaming content for maximum watch time',
 'Analyze this gaming video for retention optimization. Evaluate: intro hook effectiveness, gameplay selection, commentary engagement, editing pace, highlight moments, thumbnail/title clickbait alignment, and community engagement. Compare to top gaming creators in this niche.',
 'content_creation', 'gaming',
 ARRAY['content_creator'],
 ARRAY['gaming'],
 ARRAY['grow_audience', 'increase_engagement'],
 ARRAY['beginner', 'intermediate', 'advanced'],
 'gamepad-2', 'from-purple-600 to-pink-600', 'intermediate', '8-12 min', TRUE),

-- Tech Reviews
('Tech Review Script Generator',
 'Create comprehensive tech review outlines',
 'Analyze this tech product for a review video. Generate: 1) Hook ideas (3 options), 2) Key specs to highlight, 3) Comparison points with competitors, 4) Pros and cons structure, 5) B-roll shot list, 6) Viewer FAQ predictions, 7) Affiliate opportunity assessment.',
 'content_creation', 'tech',
 ARRAY['content_creator', 'marketing'],
 ARRAY['tech_reviews'],
 ARRAY['improve_quality', 'monetization'],
 ARRAY['intermediate', 'advanced'],
 'cpu', 'from-cyan-500 to-blue-600', 'intermediate', '10-15 min', TRUE),

-- Finance
('Financial Content Compliance Check',
 'Ensure finance content meets regulatory guidelines',
 'Analyze this financial content for compliance and best practices. Check for: 1) Required disclaimers, 2) Potentially misleading claims, 3) Risk disclosure adequacy, 4) Educational vs advice boundary, 5) Platform-specific guidelines (YouTube, TikTok). Suggest compliant alternatives.',
 'content_creation', 'finance',
 ARRAY['content_creator', 'business_owner'],
 ARRAY['finance'],
 ARRAY['improve_quality'],
 ARRAY['intermediate', 'advanced', 'expert'],
 'shield-check', 'from-green-600 to-emerald-600', 'advanced', '10-15 min', FALSE),

-- Music
('Music Video Trend Analysis',
 'Decode viral music content patterns',
 'Analyze this music video/content for viral elements. Break down: 1) Audio trend alignment, 2) Visual aesthetic trends, 3) Dance/movement virality potential, 4) Hashtag and challenge potential, 5) Cross-platform adaptation opportunities, 6) Collaboration opportunities.',
 'content_creation', 'music',
 ARRAY['content_creator'],
 ARRAY['music', 'entertainment'],
 ARRAY['grow_audience', 'learn_trends'],
 ARRAY['beginner', 'intermediate'],
 'music', 'from-fuchsia-500 to-purple-600', 'beginner', '5-8 min', FALSE),

-- Travel
('Travel Content Location Scout',
 'Research destinations for travel content',
 'Research this destination for travel content. Find: 1) Iconic shot locations, 2) Hidden gems and unique angles, 3) Best times/seasons to visit, 4) Trending travel content from this location, 5) Content differentiators from other creators, 6) Practical filming considerations.',
 'content_creation', 'travel',
 ARRAY['content_creator'],
 ARRAY['travel', 'lifestyle'],
 ARRAY['improve_quality', 'grow_audience'],
 ARRAY['beginner', 'intermediate'],
 'map-pin', 'from-sky-500 to-blue-600', 'beginner', '8-12 min', FALSE),

-- Sports
('Sports Highlight Analyzer',
 'Break down what makes sports content engaging',
 'Analyze this sports content for engagement patterns. Evaluate: 1) Highlight selection and pacing, 2) Commentary style and energy, 3) Graphics and stats integration, 4) Replay and slow-motion usage, 5) Music and sound design, 6) Fan reaction incorporation. Suggest improvements.',
 'content_creation', 'sports',
 ARRAY['content_creator'],
 ARRAY['sports'],
 ARRAY['increase_engagement', 'improve_quality'],
 ARRAY['intermediate', 'advanced'],
 'trophy', 'from-orange-500 to-red-600', 'intermediate', '8-12 min', FALSE),

-- News
('News Content Fact-Check Framework',
 'Verify and structure news content responsibly',
 'Analyze this news topic/story. Create: 1) Key facts verification checklist, 2) Multiple source comparison, 3) Timeline of events, 4) Different perspective summary, 5) Potential bias indicators, 6) Suggested neutral framing for content creation.',
 'content_creation', 'news',
 ARRAY['content_creator', 'researcher'],
 ARRAY['news'],
 ARRAY['improve_quality'],
 ARRAY['intermediate', 'advanced', 'expert'],
 'newspaper', 'from-slate-600 to-zinc-600', 'advanced', '15-20 min', FALSE);

-- ============================================
-- SEARCH SUGGESTIONS - CONTENT EXAMPLES
-- ============================================

INSERT INTO search_suggestions (title, description, search_query, search_type, category, subcategory, target_backgrounds, target_interests, target_goals, icon, platform, content_type, is_trending, display_order) VALUES

-- TikTok Examples
('Viral TikTok Hook Example',
 'Study this viral hook technique',
 'https://www.tiktok.com/@mrbeast/video/example',
 'tiktok_url', 'examples', 'hooks',
 ARRAY['content_creator', 'marketing'],
 ARRAY['entertainment', 'lifestyle'],
 ARRAY['grow_audience', 'learn_trends'],
 'zap', 'tiktok', 'video', TRUE, 1),

('Trending Sound Usage',
 'See how creators use trending sounds',
 'trending sounds tiktok 2025',
 'topic_search', 'research', 'trends',
 ARRAY['content_creator'],
 ARRAY['music', 'entertainment'],
 ARRAY['learn_trends', 'grow_audience'],
 'music', 'tiktok', 'topic', TRUE, 2),

-- YouTube Examples
('Perfect YouTube Thumbnail Study',
 'Analyze high-CTR thumbnail design',
 'https://www.youtube.com/watch?v=example',
 'youtube_url', 'examples', 'thumbnails',
 ARRAY['content_creator', 'marketing'],
 ARRAY['tech_reviews', 'gaming'],
 ARRAY['grow_audience', 'improve_quality'],
 'image', 'youtube', 'video', FALSE, 10),

('MrBeast Video Structure',
 'Study the master of retention',
 'https://www.youtube.com/@MrBeast',
 'competitor_channel', 'research', 'structure',
 ARRAY['content_creator'],
 ARRAY['entertainment'],
 ARRAY['improve_quality', 'competitor_analysis'],
 'user', 'youtube', 'channel', TRUE, 3),

('MKBHD Tech Review Style',
 'Premium tech review format analysis',
 'https://www.youtube.com/@mkbhd',
 'competitor_channel', 'research', 'tech',
 ARRAY['content_creator'],
 ARRAY['tech_reviews'],
 ARRAY['improve_quality', 'competitor_analysis'],
 'cpu', 'youtube', 'channel', FALSE, 11),

-- Business/Marketing Examples
('Successful Product Launch Campaign',
 'Analyze a viral product launch',
 'viral product launch marketing 2025',
 'topic_search', 'research', 'campaigns',
 ARRAY['marketing', 'business_owner', 'agency'],
 ARRAY['business'],
 ARRAY['learn_trends', 'competitor_analysis'],
 'rocket', 'web', 'topic', FALSE, 20),

('Brand TikTok Marketing',
 'How brands succeed on TikTok',
 'best brand tiktok accounts marketing',
 'topic_search', 'research', 'brand_marketing',
 ARRAY['marketing', 'agency'],
 ARRAY['business', 'entertainment'],
 ARRAY['learn_trends'],
 'building', 'tiktok', 'topic', TRUE, 4),

-- Educational Content
('Top Educational YouTubers',
 'Study the best explainer content',
 'educational youtube channels 2025',
 'topic_search', 'research', 'education',
 ARRAY['content_creator', 'student'],
 ARRAY['education', 'science'],
 ARRAY['improve_quality', 'learn_trends'],
 'book-open', 'youtube', 'topic', FALSE, 30),

-- Gaming
('Gaming Content Trends',
 'What gaming content is working now',
 'trending gaming content youtube tiktok',
 'topic_search', 'research', 'gaming',
 ARRAY['content_creator'],
 ARRAY['gaming'],
 ARRAY['learn_trends', 'grow_audience'],
 'gamepad-2', 'youtube', 'topic', TRUE, 5),

-- Finance
('Finance Creator Best Practices',
 'How top finance creators build trust',
 'best finance youtube channels advice',
 'topic_search', 'research', 'finance',
 ARRAY['content_creator', 'business_owner'],
 ARRAY['finance'],
 ARRAY['grow_audience', 'improve_quality'],
 'dollar-sign', 'youtube', 'topic', FALSE, 40);

-- ============================================
-- WORKFLOW TEMPLATES - PRE-BUILT WORKFLOWS
-- ============================================

INSERT INTO workflow_templates (name, description, nodes, edges, category, subcategory, target_backgrounds, target_interests, target_goals, target_experience_levels, icon, gradient, difficulty, node_count, estimated_time, is_featured) VALUES

('Quick Content Analyzer',
 'Simple single-video analysis for beginners',
 '[{"id":"input-1","type":"contentUrlInputNode","position":{"x":100,"y":200},"data":{"label":"Content URL","url":""}},{"id":"brain-1","type":"brainNode","position":{"x":400,"y":200},"data":{"label":"AI Analysis","analysisType":"comprehensive"}},{"id":"output-1","type":"outputNode","position":{"x":700,"y":200},"data":{"label":"Results"}}]',
 '[{"id":"e1","source":"input-1","target":"brain-1"},{"id":"e2","source":"brain-1","target":"output-1"}]',
 'analysis', 'simple',
 ARRAY['content_creator', 'marketing', 'student'],
 ARRAY['entertainment', 'education', 'tech_reviews'],
 ARRAY['learn_trends', 'improve_quality'],
 ARRAY['beginner'],
 'brain', 'from-indigo-500 to-purple-600', 'beginner', 3, '2-3 min', TRUE),

('Competitor Comparison Pipeline',
 'Compare two pieces of content side by side',
 '[{"id":"input-1","type":"contentUrlInputNode","position":{"x":100,"y":100},"data":{"label":"Your Content"}},{"id":"input-2","type":"contentUrlInputNode","position":{"x":100,"y":350},"data":{"label":"Competitor Content"}},{"id":"brain-1","type":"brainNode","position":{"x":400,"y":225},"data":{"label":"Comparative Analysis"}},{"id":"output-1","type":"outputNode","position":{"x":700,"y":225},"data":{"label":"Comparison Report"}}]',
 '[{"id":"e1","source":"input-1","target":"brain-1"},{"id":"e2","source":"input-2","target":"brain-1"},{"id":"e3","source":"brain-1","target":"output-1"}]',
 'analysis', 'comparison',
 ARRAY['content_creator', 'marketing', 'agency'],
 ARRAY['tech_reviews', 'gaming', 'business'],
 ARRAY['competitor_analysis'],
 ARRAY['beginner', 'intermediate'],
 'git-compare', 'from-amber-500 to-orange-600', 'beginner', 4, '5-8 min', TRUE),

('Multi-Content Trend Analysis',
 'Analyze multiple videos to find patterns',
 '[{"id":"input-1","type":"contentUrlInputNode","position":{"x":100,"y":50},"data":{"label":"Video 1"}},{"id":"input-2","type":"contentUrlInputNode","position":{"x":100,"y":175},"data":{"label":"Video 2"}},{"id":"input-3","type":"contentUrlInputNode","position":{"x":100,"y":300},"data":{"label":"Video 3"}},{"id":"input-4","type":"contentUrlInputNode","position":{"x":100,"y":425},"data":{"label":"Video 4"}},{"id":"brain-1","type":"brainNode","position":{"x":400,"y":200},"data":{"label":"Pattern Analysis"}},{"id":"output-1","type":"outputNode","position":{"x":700,"y":200},"data":{"label":"Trend Report"}}]',
 '[{"id":"e1","source":"input-1","target":"brain-1"},{"id":"e2","source":"input-2","target":"brain-1"},{"id":"e3","source":"input-3","target":"brain-1"},{"id":"e4","source":"input-4","target":"brain-1"},{"id":"e5","source":"brain-1","target":"output-1"}]',
 'analysis', 'trends',
 ARRAY['marketing', 'agency', 'content_creator'],
 ARRAY['entertainment', 'tech_reviews', 'gaming'],
 ARRAY['learn_trends', 'competitor_analysis'],
 ARRAY['intermediate', 'advanced'],
 'trending-up', 'from-purple-500 to-pink-600', 'intermediate', 6, '10-15 min', FALSE),

('Content Performance Audit',
 'Full audit workflow for content strategy',
 '[{"id":"input-1","type":"contentUrlInputNode","position":{"x":100,"y":100},"data":{"label":"Content to Audit"}},{"id":"brain-1","type":"brainNode","position":{"x":350,"y":100},"data":{"label":"Thumbnail Analysis","analysisType":"thumbnail"}},{"id":"brain-2","type":"brainNode","position":{"x":350,"y":250},"data":{"label":"Title & Hook Analysis","analysisType":"hooks"}},{"id":"brain-3","type":"brainNode","position":{"x":350,"y":400},"data":{"label":"Engagement Signals","analysisType":"engagement"}},{"id":"brain-4","type":"brainNode","position":{"x":600,"y":250},"data":{"label":"Synthesis","analysisType":"comprehensive"}},{"id":"output-1","type":"outputNode","position":{"x":850,"y":250},"data":{"label":"Audit Report"}}]',
 '[{"id":"e1","source":"input-1","target":"brain-1"},{"id":"e2","source":"input-1","target":"brain-2"},{"id":"e3","source":"input-1","target":"brain-3"},{"id":"e4","source":"brain-1","target":"brain-4"},{"id":"e5","source":"brain-2","target":"brain-4"},{"id":"e6","source":"brain-3","target":"brain-4"},{"id":"e7","source":"brain-4","target":"output-1"}]',
 'analysis', 'audit',
 ARRAY['agency', 'marketing', 'content_creator'],
 ARRAY['tech_reviews', 'entertainment', 'business'],
 ARRAY['improve_quality', 'competitor_analysis'],
 ARRAY['advanced', 'expert'],
 'clipboard-check', 'from-teal-500 to-emerald-600', 'advanced', 6, '15-20 min', FALSE);

-- ============================================
-- UPDATE STATISTICS
-- ============================================

-- Add some realistic usage stats to make featured items look popular
UPDATE prompt_templates SET use_count = floor(random() * 500 + 100)::int WHERE is_featured = TRUE;
UPDATE prompt_templates SET use_count = floor(random() * 100 + 10)::int WHERE is_featured = FALSE;
UPDATE prompt_templates SET avg_rating = (random() * 1.5 + 3.5)::numeric(2,1);
UPDATE prompt_templates SET success_rate = (random() * 0.3 + 0.7)::numeric(3,2);

UPDATE workflow_templates SET use_count = floor(random() * 300 + 50)::int WHERE is_featured = TRUE;
UPDATE workflow_templates SET use_count = floor(random() * 50 + 5)::int WHERE is_featured = FALSE;
UPDATE workflow_templates SET avg_rating = (random() * 1.5 + 3.5)::numeric(2,1);

UPDATE search_suggestions SET use_count = floor(random() * 200 + 20)::int WHERE is_trending = TRUE;
UPDATE search_suggestions SET use_count = floor(random() * 50 + 5)::int WHERE is_trending = FALSE;

-- ============================================
-- VERIFY SEED DATA
-- ============================================

-- Check counts
DO $$
BEGIN
  RAISE NOTICE 'Prompt templates created: %', (SELECT COUNT(*) FROM prompt_templates);
  RAISE NOTICE 'Workflow templates created: %', (SELECT COUNT(*) FROM workflow_templates);
  RAISE NOTICE 'Search suggestions created: %', (SELECT COUNT(*) FROM search_suggestions);
END $$;
