import { Node, Edge } from '@xyflow/react'

// Pre-built workflow templates for the Marketplace
// These are the "Control Group as a Service" products

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  nodes: Node[]
  edges: Edge[]
}

const edgeStyle = {
  style: { strokeWidth: 2, stroke: '#6366f1' },
  type: 'smoothstep' as const,
  animated: true,
}

// ============================================
// DEMOGRAPHIC PROFILES FOR BRAIN SIMULATIONS
// ============================================
const demographicProfiles = [
  // Age groups
  { id: 'gen-z-18-24', label: 'Gen Z (18-24)', traits: ['digital native', 'short attention span', 'visual learner', 'skeptical of traditional media'] },
  { id: 'millennial-25-34', label: 'Millennial (25-34)', traits: ['tech savvy', 'values authenticity', 'research-oriented', 'socially conscious'] },
  { id: 'millennial-35-44', label: 'Elder Millennial (35-44)', traits: ['career focused', 'family oriented', 'nostalgic', 'brand loyal'] },
  { id: 'gen-x-45-54', label: 'Gen X (45-54)', traits: ['skeptical', 'independent', 'values quality', 'work-life balance'] },
  { id: 'boomer-55-64', label: 'Boomer (55-64)', traits: ['traditional values', 'brand loyal', 'detail oriented', 'prefers long-form'] },
  { id: 'senior-65+', label: 'Senior (65+)', traits: ['wisdom seeker', 'health conscious', 'family focused', 'trust authority'] },
  
  // Political/worldview
  { id: 'progressive-urban', label: 'Progressive Urban', traits: ['environmentalist', 'tech optimist', 'diversity focused', 'change oriented'] },
  { id: 'moderate-suburban', label: 'Moderate Suburban', traits: ['pragmatic', 'family security', 'economic focus', 'balanced views'] },
  { id: 'conservative-rural', label: 'Conservative Rural', traits: ['traditional values', 'self-reliant', 'community focused', 'skeptical of change'] },
  { id: 'libertarian-tech', label: 'Libertarian Tech', traits: ['innovation focused', 'privacy conscious', 'anti-establishment', 'individual freedom'] },
  
  // Education levels
  { id: 'high-school', label: 'High School Education', traits: ['practical learner', 'experience based', 'local focus', 'hands-on'] },
  { id: 'some-college', label: 'Some College', traits: ['curious', 'career building', 'skill focused', 'adaptable'] },
  { id: 'bachelors', label: 'Bachelor\'s Degree', traits: ['analytical', 'career oriented', 'research capable', 'critical thinker'] },
  { id: 'masters-phd', label: 'Graduate Degree', traits: ['expert knowledge', 'research focused', 'nuanced thinking', 'evidence based'] },
  
  // Personality types (Big 5)
  { id: 'high-openness', label: 'High Openness', traits: ['creative', 'curious', 'adventurous', 'appreciates art'] },
  { id: 'high-conscientiousness', label: 'High Conscientiousness', traits: ['organized', 'goal oriented', 'reliable', 'detail focused'] },
  { id: 'high-extraversion', label: 'High Extraversion', traits: ['social', 'energetic', 'talkative', 'seeks excitement'] },
  { id: 'high-agreeableness', label: 'High Agreeableness', traits: ['cooperative', 'trusting', 'helpful', 'empathetic'] },
  { id: 'high-neuroticism', label: 'High Neuroticism', traits: ['emotionally reactive', 'anxious', 'moody', 'stress sensitive'] },
  
  // Consumer types
  { id: 'early-adopter', label: 'Early Adopter', traits: ['innovation seeker', 'risk tolerant', 'influencer', 'tech enthusiast'] },
  { id: 'mainstream', label: 'Mainstream Consumer', traits: ['follows trends', 'values reviews', 'price conscious', 'brand aware'] },
  { id: 'skeptic-laggard', label: 'Skeptic/Laggard', traits: ['traditional', 'risk averse', 'proof required', 'slow to change'] },
  
  // Emotional states
  { id: 'stress-high', label: 'High Stress State', traits: ['cortisol elevated', 'attention scattered', 'seeks relief', 'impulse prone'] },
  { id: 'relaxed', label: 'Relaxed State', traits: ['open minded', 'patient', 'receptive', 'thoughtful processing'] },
  { id: 'excited', label: 'Excited State', traits: ['high dopamine', 'action oriented', 'optimistic', 'engagement ready'] },
]

// Generate 100 brain nodes with diverse demographics
function generateBrainSimulatorNodes(startX: number, startY: number): Node[] {
  const nodes: Node[] = []
  const cols = 10
  const nodeWidth = 180
  const nodeHeight = 120
  const padding = 20
  
  for (let i = 0; i < 100; i++) {
    const profile = demographicProfiles[i % demographicProfiles.length]
    const variation = Math.floor(i / demographicProfiles.length) + 1
    const col = i % cols
    const row = Math.floor(i / cols)
    
    nodes.push({
      id: `brain-sim-${i + 1}`,
      type: 'brainNode',
      position: { 
        x: startX + col * (nodeWidth + padding), 
        y: startY + row * (nodeHeight + padding) 
      },
      data: {
        label: `${profile.label} #${variation}`,
        demographicId: profile.id,
        traits: profile.traits,
        prompt: `You are simulating the brain of a viewer with profile: ${profile.label}. Traits: ${profile.traits.join(', ')}. 
                 Analyze the content and report:
                 1. Attention patterns (what moments grabbed attention, what caused drops)
                 2. Emotional response timeline (joy, fear, anger, sadness, surprise, disgust)
                 3. Cognitive load assessment (was content easy to process or overwhelming)
                 4. Persuasion susceptibility (what techniques worked/failed on this profile)
                 5. Memory encoding prediction (what will this viewer remember in 24h)
                 6. Action likelihood (will they share, buy, subscribe, or ignore)`,
        model: 'gemini-2.0-flash',
        computeTier: 'cpu-standard',
        status: 'idle',
        simulationMode: true,
      },
    })
  }
  
  return nodes
}

// ============================================
// CONTENT IMPACT ANALYZER (100 Brain Nodes)
// ============================================

// Demo content URLs for testing
const DEMO_CONTENT = {
  // Viral YouTube Shorts - replace with current trending content
  viralShort: 'https://www.youtube.com/shorts/fo7nPOespzA',
  // MrBeast viral video
  mrBeast: 'https://www.youtube.com/watch?v=0e3GPea1Tyg',
  // Sample news clip (placeholder)
  newsClip: 'https://www.youtube.com/watch?v=example',
}

export const contentImpactAnalyzer: WorkflowTemplate = {
  id: 'content-impact-analyzer',
  name: 'Content Impact Analyzer',
  description: 'Simulate 100 diverse brain profiles analyzing your content for psychological impact',
  nodes: [
    // Input Section - Prominent Content URL with Video Thumbnail
    {
      id: 'content-url-input',
      type: 'contentUrlInputNode',
      position: { x: 50, y: 500 },
      data: {
        label: 'Content URL Input',
        url: DEMO_CONTENT.viralShort,
        videoTitle: 'Viral YouTube Short - Demo Content',
        platform: 'youtube',
        status: 'idle',
      },
    },
    {
      id: 'content-processor',
      type: 'preprocessingNode',
      position: { x: 350, y: 600 },
      data: {
        label: 'Content Extractor',
        category: 'preprocessing',
        description: 'Extracts video, audio, transcript, thumbnails, and metadata',
        status: 'idle',
      },
    },
    
    // Reference datasets
    {
      id: 'hcp-reference',
      type: 'referenceDatasetNode',
      position: { x: 100, y: 750 },
      data: {
        label: 'HCP 1200 Baseline',
        source: 'hcp',
        subjectCount: 1200,
        modality: 'fMRI/Behavioral',
        description: 'Healthy brain activity baselines for comparison',
        status: 'idle',
      },
    },
    {
      id: 'ucla-phenotypes',
      type: 'referenceDatasetNode',
      position: { x: 100, y: 900 },
      data: {
        label: 'UCLA Phenotypes',
        source: 'ucla',
        subjectCount: 272,
        modality: 'Behavioral/Cognitive',
        description: 'Neuropsychiatric response patterns',
        status: 'idle',
      },
    },
    
    // Brain simulation grid (100 nodes)
    ...generateBrainSimulatorNodes(600, 100),
    
    // Aggregation layer
    {
      id: 'attention-aggregator',
      type: 'analysisNode',
      position: { x: 2600, y: 200 },
      data: {
        label: 'Attention Aggregator',
        category: 'analysis',
        description: 'Aggregates attention patterns across all 100 brain profiles',
        status: 'idle',
      },
    },
    {
      id: 'emotion-aggregator',
      type: 'analysisNode',
      position: { x: 2600, y: 350 },
      data: {
        label: 'Emotion Aggregator',
        category: 'analysis',
        description: 'Builds emotional response heatmap across demographics',
        status: 'idle',
      },
    },
    {
      id: 'persuasion-aggregator',
      type: 'analysisNode',
      position: { x: 2600, y: 500 },
      data: {
        label: 'Persuasion Analyzer',
        category: 'analysis',
        description: 'Identifies which persuasion techniques worked on which segments',
        status: 'idle',
      },
    },
    {
      id: 'cognitive-load-aggregator',
      type: 'analysisNode',
      position: { x: 2600, y: 650 },
      data: {
        label: 'Cognitive Load Mapper',
        category: 'analysis',
        description: 'Maps content complexity vs audience processing capacity',
        status: 'idle',
      },
    },
    {
      id: 'demographic-segmenter',
      type: 'analysisNode',
      position: { x: 2600, y: 800 },
      data: {
        label: 'Demographic Segmenter',
        category: 'analysis',
        description: 'Segments results by age, politics, personality, education',
        status: 'idle',
      },
    },
    
    // Final synthesis
    {
      id: 'master-synthesizer',
      type: 'brainNode',
      position: { x: 2900, y: 500 },
      data: {
        label: 'Master Synthesizer',
        prompt: `You are the master analyst synthesizing results from 100 brain simulations.
                 Create a comprehensive Content Impact Report including:
                 
                 1. EXECUTIVE SUMMARY
                    - Overall effectiveness score (1-100)
                    - Key strengths and weaknesses
                    - Top 3 actionable recommendations
                 
                 2. ATTENTION ANALYSIS
                    - Attention curve visualization data
                    - Drop-off points and causes
                    - Peak engagement moments
                 
                 3. EMOTIONAL JOURNEY
                    - Emotional arc across content timeline
                    - Which demographics responded most emotionally
                    - Emotional manipulation detection
                 
                 4. PERSUASION EFFECTIVENESS
                    - Techniques used and success rates
                    - Demographic susceptibility map
                    - Trust vs skepticism patterns
                 
                 5. DEMOGRAPHIC BREAKDOWN
                    - Response by age group
                    - Response by political leaning
                    - Response by personality type
                    - Response by education level
                 
                 6. MEMORY & ACTION PREDICTION
                    - What viewers will remember in 24h
                    - Predicted share/subscribe/purchase rates
                    - Call-to-action effectiveness
                 
                 7. ETHICAL CONSIDERATIONS
                    - Manipulation techniques detected
                    - Potential harm assessment
                    - Misinformation risk score`,
        model: 'gemini-2.0-flash',
        computeTier: 'gpu-a10',
        status: 'idle',
      },
    },
    
    // Output
    {
      id: 'results-dashboard',
      type: 'outputNode',
      position: { x: 3200, y: 500 },
      data: {
        label: 'Impact Dashboard',
        category: 'output_sink',
        outputType: 'dashboard',
        description: 'Interactive dashboard with charts, heatmaps, and recommendations',
        status: 'idle',
      },
    },
  ],
  edges: [
    // Input flow
    { id: 'e-input-1', source: 'content-url-input', target: 'content-processor', ...edgeStyle },
    
    // Content to all brain simulators
    ...Array.from({ length: 100 }, (_, i) => ({
      id: `e-content-brain-${i + 1}`,
      source: 'content-processor',
      target: `brain-sim-${i + 1}`,
      ...edgeStyle,
    })),
    
    // Reference data to brain simulators (connect to first few for visual clarity)
    { id: 'e-hcp-brain-1', source: 'hcp-reference', target: 'brain-sim-1', ...edgeStyle },
    { id: 'e-ucla-brain-1', source: 'ucla-phenotypes', target: 'brain-sim-1', ...edgeStyle },
    
    // Brain simulators to aggregators (distribute evenly)
    ...Array.from({ length: 100 }, (_, i) => {
      const aggregators = ['attention-aggregator', 'emotion-aggregator', 'persuasion-aggregator', 'cognitive-load-aggregator', 'demographic-segmenter']
      const targetAggregator = aggregators[i % aggregators.length]
      return {
        id: `e-brain-agg-${i + 1}`,
        source: `brain-sim-${i + 1}`,
        target: targetAggregator,
        ...edgeStyle,
      }
    }),
    
    // Aggregators to master synthesizer
    { id: 'e-att-synth', source: 'attention-aggregator', target: 'master-synthesizer', ...edgeStyle },
    { id: 'e-emo-synth', source: 'emotion-aggregator', target: 'master-synthesizer', ...edgeStyle },
    { id: 'e-pers-synth', source: 'persuasion-aggregator', target: 'master-synthesizer', ...edgeStyle },
    { id: 'e-cog-synth', source: 'cognitive-load-aggregator', target: 'master-synthesizer', ...edgeStyle },
    { id: 'e-demo-synth', source: 'demographic-segmenter', target: 'master-synthesizer', ...edgeStyle },
    
    // Final output
    { id: 'e-synth-output', source: 'master-synthesizer', target: 'results-dashboard', ...edgeStyle },
  ],
}

// ============================================
// MEDIA BIAS ANALYZER (Political Content Analysis)
// ============================================
export const mediaBiasAnalyzer: WorkflowTemplate = {
  id: 'media-bias-analyzer',
  name: 'Media Bias Analyzer',
  description: 'Analyze how news/media affects different political demographics',
  nodes: [
    // Input - News Article Node
    {
      id: 'media-url-input',
      type: 'newsArticleNode',
      position: { x: 100, y: 400 },
      data: {
        label: 'Fox News Article',
        url: 'https://www.foxnews.com/us/new-video-shows-minutes-leading-up-deadly-minneapolis-ice-shooting',
        status: 'idle',
      },
    },
    {
      id: 'media-processor',
      type: 'preprocessingNode',
      position: { x: 350, y: 400 },
      data: {
        label: 'Media Extractor',
        category: 'preprocessing',
        description: 'Extracts transcript, speaker analysis, visual framing',
        status: 'idle',
      },
    },
    
    // Political spectrum brain nodes
    {
      id: 'brain-far-left',
      type: 'brainNode',
      position: { x: 600, y: 100 },
      data: {
        label: 'Progressive Left',
        prompt: 'Simulate viewer who is progressive/left-leaning. Analyze for confirmation bias, emotional triggers, trust response.',
        model: 'gemini-2.0-flash',
        computeTier: 'cpu-standard',
        status: 'idle',
      },
    },
    {
      id: 'brain-left',
      type: 'brainNode',
      position: { x: 600, y: 220 },
      data: {
        label: 'Liberal',
        prompt: 'Simulate viewer who is liberal/center-left. Analyze for confirmation bias, emotional triggers, trust response.',
        model: 'gemini-2.0-flash',
        computeTier: 'cpu-standard',
        status: 'idle',
      },
    },
    {
      id: 'brain-center',
      type: 'brainNode',
      position: { x: 600, y: 340 },
      data: {
        label: 'Moderate/Independent',
        prompt: 'Simulate viewer who is moderate/independent. Analyze for persuasion effectiveness, logical appeal, trust response.',
        model: 'gemini-2.0-flash',
        computeTier: 'cpu-standard',
        status: 'idle',
      },
    },
    {
      id: 'brain-right',
      type: 'brainNode',
      position: { x: 600, y: 460 },
      data: {
        label: 'Conservative',
        prompt: 'Simulate viewer who is conservative/center-right. Analyze for confirmation bias, emotional triggers, trust response.',
        model: 'gemini-2.0-flash',
        computeTier: 'cpu-standard',
        status: 'idle',
      },
    },
    {
      id: 'brain-far-right',
      type: 'brainNode',
      position: { x: 600, y: 580 },
      data: {
        label: 'Traditional Right',
        prompt: 'Simulate viewer who is traditional/far-right. Analyze for confirmation bias, emotional triggers, trust response.',
        model: 'gemini-2.0-flash',
        computeTier: 'cpu-standard',
        status: 'idle',
      },
    },
    {
      id: 'brain-apolitical',
      type: 'brainNode',
      position: { x: 600, y: 700 },
      data: {
        label: 'Apolitical',
        prompt: 'Simulate viewer who is apolitical/disengaged. Analyze for attention, emotional response without political framing.',
        model: 'gemini-2.0-flash',
        computeTier: 'cpu-standard',
        status: 'idle',
      },
    },
    
    // Analysis nodes
    {
      id: 'bias-detector',
      type: 'analysisNode',
      position: { x: 900, y: 280 },
      data: {
        label: 'Bias Detector',
        category: 'analysis',
        description: 'Identifies framing, word choice, omissions, emphasis patterns',
        status: 'idle',
      },
    },
    {
      id: 'manipulation-scanner',
      type: 'analysisNode',
      position: { x: 900, y: 420 },
      data: {
        label: 'Manipulation Scanner',
        category: 'analysis',
        description: 'Detects emotional manipulation, fear tactics, tribal appeals',
        status: 'idle',
      },
    },
    {
      id: 'fact-checker',
      type: 'analysisNode',
      position: { x: 900, y: 560 },
      data: {
        label: 'Fact Checker',
        category: 'analysis',
        description: 'Cross-references claims against fact databases',
        status: 'idle',
      },
    },
    
    // Synthesis
    {
      id: 'media-synthesizer',
      type: 'brainNode',
      position: { x: 1150, y: 400 },
      data: {
        label: 'Media Impact Synthesizer',
        prompt: `Synthesize the political spectrum brain responses and analysis.
                 Create a Media Bias Report including:
                 1. Bias score (-100 left to +100 right)
                 2. Manipulation techniques used
                 3. Which demographics will be persuaded
                 4. Which demographics will be skeptical
                 5. Fact-check summary
                 6. Emotional manipulation score
                 7. Trust erosion/building analysis`,
        model: 'gemini-2.0-flash',
        computeTier: 'gpu-a10',
        status: 'idle',
      },
    },
    
    // Output
    {
      id: 'bias-report',
      type: 'outputNode',
      position: { x: 1400, y: 400 },
      data: {
        label: 'Bias Analysis Report',
        category: 'output_sink',
        outputType: 'report',
        status: 'idle',
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'media-url-input', target: 'media-processor', ...edgeStyle },
    { id: 'e2', source: 'media-processor', target: 'brain-far-left', ...edgeStyle },
    { id: 'e3', source: 'media-processor', target: 'brain-left', ...edgeStyle },
    { id: 'e4', source: 'media-processor', target: 'brain-center', ...edgeStyle },
    { id: 'e5', source: 'media-processor', target: 'brain-right', ...edgeStyle },
    { id: 'e6', source: 'media-processor', target: 'brain-far-right', ...edgeStyle },
    { id: 'e7', source: 'media-processor', target: 'brain-apolitical', ...edgeStyle },
    { id: 'e8', source: 'brain-far-left', target: 'bias-detector', ...edgeStyle },
    { id: 'e9', source: 'brain-left', target: 'bias-detector', ...edgeStyle },
    { id: 'e10', source: 'brain-center', target: 'bias-detector', ...edgeStyle },
    { id: 'e11', source: 'brain-right', target: 'manipulation-scanner', ...edgeStyle },
    { id: 'e12', source: 'brain-far-right', target: 'manipulation-scanner', ...edgeStyle },
    { id: 'e13', source: 'brain-apolitical', target: 'fact-checker', ...edgeStyle },
    { id: 'e14', source: 'bias-detector', target: 'media-synthesizer', ...edgeStyle },
    { id: 'e15', source: 'manipulation-scanner', target: 'media-synthesizer', ...edgeStyle },
    { id: 'e16', source: 'fact-checker', target: 'media-synthesizer', ...edgeStyle },
    { id: 'e17', source: 'media-synthesizer', target: 'bias-report', ...edgeStyle },
  ],
}

// ============================================
// AD EFFECTIVENESS TESTER
// ============================================
export const adEffectivenessTester: WorkflowTemplate = {
  id: 'ad-effectiveness-tester',
  name: 'Ad Effectiveness Tester',
  description: 'Test your ad against 100 simulated viewer brains before spending on media',
  nodes: [
    // Input
    {
      id: 'ad-upload',
      type: 'dataNode',
      position: { x: 100, y: 300 },
      data: {
        label: 'Video Ad Upload',
        subType: 'file',
        placeholder: 'Upload your video ad or paste URL',
        status: 'idle',
      },
    },
    {
      id: 'ad-processor',
      type: 'preprocessingNode',
      position: { x: 350, y: 300 },
      data: {
        label: 'Ad Analyzer',
        category: 'preprocessing',
        description: 'Extracts visuals, audio, pacing, CTA placement',
        status: 'idle',
      },
    },
    
    // Consumer brain profiles (6 key segments)
    {
      id: 'brain-impulse-buyer',
      type: 'brainNode',
      position: { x: 600, y: 100 },
      data: {
        label: 'Impulse Buyer',
        prompt: 'Simulate an impulse buyer brain. High dopamine response to deals, easily excited, low impulse control. Analyze ad effectiveness.',
        model: 'gemini-2.0-flash',
        computeTier: 'cpu-standard',
        status: 'idle',
      },
    },
    {
      id: 'brain-skeptic',
      type: 'brainNode',
      position: { x: 600, y: 220 },
      data: {
        label: 'Skeptical Consumer',
        prompt: 'Simulate a skeptical consumer brain. Requires proof, reads reviews, resistant to emotional appeals. Analyze ad effectiveness.',
        model: 'gemini-2.0-flash',
        computeTier: 'cpu-standard',
        status: 'idle',
      },
    },
    {
      id: 'brain-value-seeker',
      type: 'brainNode',
      position: { x: 600, y: 340 },
      data: {
        label: 'Value Seeker',
        prompt: 'Simulate a value-conscious brain. Price comparisons, ROI focused, seeks deals. Analyze ad effectiveness.',
        model: 'gemini-2.0-flash',
        computeTier: 'cpu-standard',
        status: 'idle',
      },
    },
    {
      id: 'brain-brand-loyal',
      type: 'brainNode',
      position: { x: 600, y: 460 },
      data: {
        label: 'Brand Loyal',
        prompt: 'Simulate a brand-loyal brain. Emotional attachment to brands, resistant to switching. Analyze ad effectiveness.',
        model: 'gemini-2.0-flash',
        computeTier: 'cpu-standard',
        status: 'idle',
      },
    },
    {
      id: 'brain-early-adopter',
      type: 'brainNode',
      position: { x: 600, y: 580 },
      data: {
        label: 'Early Adopter',
        prompt: 'Simulate an early adopter brain. Excited by innovation, FOMO driven, influences others. Analyze ad effectiveness.',
        model: 'gemini-2.0-flash',
        computeTier: 'cpu-standard',
        status: 'idle',
      },
    },
    
    // Analysis nodes
    {
      id: 'attention-heatmap',
      type: 'analysisNode',
      position: { x: 900, y: 200 },
      data: {
        label: 'Attention Heatmap',
        category: 'analysis',
        description: 'Second-by-second attention tracking across segments',
        status: 'idle',
      },
    },
    {
      id: 'emotion-timeline',
      type: 'analysisNode',
      position: { x: 900, y: 350 },
      data: {
        label: 'Emotion Timeline',
        category: 'analysis',
        description: 'Emotional peaks, valleys, and arc analysis',
        status: 'idle',
      },
    },
    {
      id: 'brand-recall',
      type: 'analysisNode',
      position: { x: 900, y: 500 },
      data: {
        label: 'Brand Recall Score',
        category: 'analysis',
        description: 'Predicted brand/message recall in 24h',
        status: 'idle',
      },
    },
    
    // Synthesis
    {
      id: 'ad-synthesizer',
      type: 'brainNode',
      position: { x: 1150, y: 350 },
      data: {
        label: 'Ad Effectiveness Engine',
        prompt: `Synthesize all brain simulations and analysis into an Ad Effectiveness Report:
                 
                 1. OVERALL SCORE (1-100)
                 2. ATTENTION ANALYSIS
                    - First 3 seconds hook effectiveness
                    - Drop-off points
                    - Peak engagement moments
                 3. EMOTIONAL IMPACT
                    - Emotional arc quality
                    - Key emotional triggers
                 4. BRAND RECALL PREDICTION
                    - Logo visibility score
                    - Message retention prediction
                 5. CTA EFFECTIVENESS
                    - Click/conversion likelihood per segment
                 6. SEGMENT BREAKDOWN
                    - Which consumer types will convert
                    - Which will ignore
                 7. RECOMMENDATIONS
                    - Top 3 improvements to boost ROI`,
        model: 'gemini-2.0-flash',
        computeTier: 'gpu-a10',
        status: 'idle',
      },
    },
    
    // Output
    {
      id: 'ad-report',
      type: 'outputNode',
      position: { x: 1400, y: 350 },
      data: {
        label: 'Ad Effectiveness Report',
        category: 'output_sink',
        outputType: 'dashboard',
        status: 'idle',
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'ad-upload', target: 'ad-processor', ...edgeStyle },
    { id: 'e2', source: 'ad-processor', target: 'brain-impulse-buyer', ...edgeStyle },
    { id: 'e3', source: 'ad-processor', target: 'brain-skeptic', ...edgeStyle },
    { id: 'e4', source: 'ad-processor', target: 'brain-value-seeker', ...edgeStyle },
    { id: 'e5', source: 'ad-processor', target: 'brain-brand-loyal', ...edgeStyle },
    { id: 'e6', source: 'ad-processor', target: 'brain-early-adopter', ...edgeStyle },
    { id: 'e7', source: 'brain-impulse-buyer', target: 'attention-heatmap', ...edgeStyle },
    { id: 'e8', source: 'brain-skeptic', target: 'attention-heatmap', ...edgeStyle },
    { id: 'e9', source: 'brain-value-seeker', target: 'emotion-timeline', ...edgeStyle },
    { id: 'e10', source: 'brain-brand-loyal', target: 'emotion-timeline', ...edgeStyle },
    { id: 'e11', source: 'brain-early-adopter', target: 'brand-recall', ...edgeStyle },
    { id: 'e12', source: 'attention-heatmap', target: 'ad-synthesizer', ...edgeStyle },
    { id: 'e13', source: 'emotion-timeline', target: 'ad-synthesizer', ...edgeStyle },
    { id: 'e14', source: 'brand-recall', target: 'ad-synthesizer', ...edgeStyle },
    { id: 'e15', source: 'ad-synthesizer', target: 'ad-report', ...edgeStyle },
  ],
}

// Template 1: Neuro-Psych Screener (UCLA)
export const neuroPsychScreener: WorkflowTemplate = {
  id: 'neuro-psych-screener',
  name: 'Neuro-Psych Screener',
  description: 'Compare patient scans against UCLA Consortium phenotypes',
  nodes: [
    {
      id: 'user-data-1',
      type: 'dataNode',
      position: { x: 100, y: 200 },
      data: { 
        label: 'Patient Scan', 
        subType: 'file',
        status: 'idle',
        progress: 0 
      },
    },
    {
      id: 'reference-ucla',
      type: 'referenceDatasetNode',
      position: { x: 100, y: 350 },
      data: {
        label: 'UCLA Consortium',
        source: 'ucla',
        subjectCount: 272,
        modality: 'fMRI/T1w',
        description: 'ADHD, Schizophrenia, Bipolar phenotypes',
        status: 'idle',
      },
    },
    {
      id: 'preprocess-1',
      type: 'preprocessingNode',
      position: { x: 350, y: 200 },
      data: {
        label: 'Normalize & Register',
        category: 'preprocessing',
        status: 'idle',
        progress: 0,
      },
    },
    {
      id: 'comparison-1',
      type: 'comparisonAgentNode',
      position: { x: 600, y: 275 },
      data: {
        label: 'Phenotype Correlator',
        comparisonType: 'correlation',
        outputFormat: 'report',
        prompt: 'Compare this patient\'s prefrontal cortex activity against the UCLA Schizophrenia cohort and Healthy Control cohort. Calculate correlation coefficients for each phenotype.',
        status: 'idle',
        progress: 0,
      },
    },
    {
      id: 'brain-1',
      type: 'brainNode',
      position: { x: 850, y: 200 },
      data: {
        label: 'Clinical Interpreter',
        prompt: 'Analyze the correlation results and provide a clinical interpretation. Identify which neuropsychiatric phenotype this patient most closely matches and highlight specific brain regions of concern.',
        model: 'gemini-2.0-flash',
        computeTier: 'cpu-standard',
        status: 'idle',
      },
    },
    {
      id: 'output-1',
      type: 'outputNode',
      position: { x: 1100, y: 200 },
      data: {
        label: 'Clinical Report',
        category: 'output_sink',
        status: 'idle',
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'user-data-1', target: 'preprocess-1', ...edgeStyle },
    { id: 'e2', source: 'preprocess-1', target: 'comparison-1', ...edgeStyle },
    { id: 'e3', source: 'reference-ucla', target: 'comparison-1', ...edgeStyle },
    { id: 'e4', source: 'comparison-1', target: 'brain-1', ...edgeStyle },
    { id: 'e5', source: 'brain-1', target: 'output-1', ...edgeStyle },
  ],
}

// Template 2: Personalized Connectome Mapper (HCP)
export const connectomeMapper: WorkflowTemplate = {
  id: 'personalized-connectome-mapper',
  name: 'Personalized Connectome Mapper',
  description: 'Map white matter deviations against HCP 1200 gold standard',
  nodes: [
    {
      id: 'user-dti',
      type: 'dataNode',
      position: { x: 100, y: 200 },
      data: {
        label: 'Patient DTI Scan',
        subType: 'file',
        status: 'idle',
        progress: 0,
      },
    },
    {
      id: 'reference-hcp',
      type: 'referenceDatasetNode',
      position: { x: 100, y: 400 },
      data: {
        label: 'HCP Young Adult 1200',
        source: 'hcp',
        subjectCount: 1200,
        modality: 'dMRI/DTI',
        description: 'Gold standard healthy brain connectivity',
        status: 'idle',
      },
    },
    {
      id: 'preprocess-dti',
      type: 'preprocessingNode',
      position: { x: 350, y: 200 },
      data: {
        label: 'DTI Preprocessing',
        category: 'preprocessing',
        status: 'idle',
        progress: 0,
      },
    },
    {
      id: 'analysis-tractography',
      type: 'analysisNode',
      position: { x: 350, y: 350 },
      data: {
        label: 'Tractography',
        category: 'analysis',
        status: 'idle',
        progress: 0,
      },
    },
    {
      id: 'deviation-detector',
      type: 'comparisonAgentNode',
      position: { x: 600, y: 275 },
      data: {
        label: 'Deviation Detector',
        comparisonType: 'deviation',
        threshold: 2,
        outputFormat: 'heatmap',
        prompt: 'Identify white matter tracts that deviate more than 2 standard deviations from the HCP healthy average. Focus on major fiber bundles: corpus callosum, arcuate fasciculus, corticospinal tract.',
        status: 'idle',
        progress: 0,
      },
    },
    {
      id: 'brain-tbi',
      type: 'brainNode',
      position: { x: 850, y: 200 },
      data: {
        label: 'TBI Analyst',
        prompt: 'Based on the white matter deviation analysis, identify potential traumatic brain injury patterns. Suggest rehabilitation focus areas and predict functional implications.',
        model: 'gemini-2.0-flash',
        computeTier: 'gpu-a10',
        status: 'idle',
      },
    },
    {
      id: 'output-3d',
      type: 'outputNode',
      position: { x: 1100, y: 200 },
      data: {
        label: '3D Deviation Report',
        category: 'output_sink',
        status: 'idle',
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'user-dti', target: 'preprocess-dti', ...edgeStyle },
    { id: 'e2', source: 'preprocess-dti', target: 'analysis-tractography', ...edgeStyle },
    { id: 'e3', source: 'analysis-tractography', target: 'deviation-detector', ...edgeStyle },
    { id: 'e4', source: 'reference-hcp', target: 'deviation-detector', ...edgeStyle },
    { id: 'e5', source: 'deviation-detector', target: 'brain-tbi', ...edgeStyle },
    { id: 'e6', source: 'brain-tbi', target: 'output-3d', ...edgeStyle },
  ],
}

// Template 3: Gene-Region Correlator (Allen + MSC)
export const geneRegionCorrelator: WorkflowTemplate = {
  id: 'gene-region-correlator',
  name: 'Gene-Region Correlator',
  description: 'Link gene expression to brain activity using Allen Atlas + Midnight Scan Club',
  nodes: [
    {
      id: 'gene-input',
      type: 'dataNode',
      position: { x: 100, y: 150 },
      data: {
        label: 'Gene Query (e.g., DRD2)',
        subType: 'web',
        status: 'idle',
        progress: 0,
      },
    },
    {
      id: 'reference-allen',
      type: 'referenceDatasetNode',
      position: { x: 100, y: 300 },
      data: {
        label: 'Allen Brain Atlas',
        source: 'allen',
        subjectCount: 6,
        modality: 'Gene Expression',
        description: '204 brain regions + gene expression profiles',
        status: 'idle',
      },
    },
    {
      id: 'reference-msc',
      type: 'referenceDatasetNode',
      position: { x: 100, y: 450 },
      data: {
        label: 'Midnight Scan Club',
        source: 'midnight_scan',
        subjectCount: 10,
        modality: 'fMRI (deep phenotyping)',
        description: '10 subjects, 5+ hours fMRI each',
        status: 'idle',
      },
    },
    {
      id: 'gene-analysis',
      type: 'analysisNode',
      position: { x: 400, y: 225 },
      data: {
        label: 'Gene Expression Mapping',
        category: 'analysis',
        status: 'idle',
        progress: 0,
      },
    },
    {
      id: 'connectivity-analysis',
      type: 'analysisNode',
      position: { x: 400, y: 400 },
      data: {
        label: 'Functional Connectivity',
        category: 'analysis',
        status: 'idle',
        progress: 0,
      },
    },
    {
      id: 'brain-correlator',
      type: 'brainNode',
      position: { x: 700, y: 300 },
      data: {
        label: 'Gene-Function Correlator',
        prompt: 'For the queried gene, find all brain regions where it is highly expressed using Allen Atlas data. Then analyze how those specific regions communicate during rest using Midnight Scan Club fMRI connectivity data. Identify potential drug target implications.',
        model: 'gemini-2.0-flash',
        computeTier: 'gpu-a10',
        status: 'idle',
      },
    },
    {
      id: 'output-visual',
      type: 'outputNode',
      position: { x: 1000, y: 300 },
      data: {
        label: 'Visual Gene-Activity Map',
        category: 'output_sink',
        status: 'idle',
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'gene-input', target: 'gene-analysis', ...edgeStyle },
    { id: 'e2', source: 'reference-allen', target: 'gene-analysis', ...edgeStyle },
    { id: 'e3', source: 'reference-msc', target: 'connectivity-analysis', ...edgeStyle },
    { id: 'e4', source: 'gene-analysis', target: 'brain-correlator', ...edgeStyle },
    { id: 'e5', source: 'connectivity-analysis', target: 'brain-correlator', ...edgeStyle },
    { id: 'e6', source: 'brain-correlator', target: 'output-visual', ...edgeStyle },
  ],
}

// Template 4: EEG Cleaning Pipeline (Community)
export const eegCleaningPipeline: WorkflowTemplate = {
  id: 'eeg-cleaning-pipeline',
  name: 'Deep Cleaning Pipeline v4',
  description: 'PhD-grade EEG preprocessing workflow',
  nodes: [
    {
      id: 'eeg-input',
      type: 'dataNode',
      position: { x: 100, y: 200 },
      data: {
        label: 'Raw EEG File',
        subType: 'file',
        status: 'idle',
        progress: 0,
      },
    },
    {
      id: 'bandpass',
      type: 'preprocessingNode',
      position: { x: 300, y: 200 },
      data: {
        label: 'Bandpass Filter (0.1-100Hz)',
        category: 'preprocessing',
        status: 'idle',
        progress: 0,
      },
    },
    {
      id: 'notch',
      type: 'preprocessingNode',
      position: { x: 500, y: 200 },
      data: {
        label: 'Notch Filter (60Hz)',
        category: 'preprocessing',
        status: 'idle',
        progress: 0,
      },
    },
    {
      id: 'ica',
      type: 'preprocessingNode',
      position: { x: 700, y: 200 },
      data: {
        label: 'ICA Artifact Removal',
        category: 'preprocessing',
        status: 'idle',
        progress: 0,
      },
    },
    {
      id: 'rereference',
      type: 'preprocessingNode',
      position: { x: 900, y: 200 },
      data: {
        label: 'Average Re-Reference',
        category: 'preprocessing',
        status: 'idle',
        progress: 0,
      },
    },
    {
      id: 'output-clean',
      type: 'outputNode',
      position: { x: 1100, y: 200 },
      data: {
        label: 'Clean EEG Export',
        category: 'output_sink',
        status: 'idle',
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'eeg-input', target: 'bandpass', ...edgeStyle },
    { id: 'e2', source: 'bandpass', target: 'notch', ...edgeStyle },
    { id: 'e3', source: 'notch', target: 'ica', ...edgeStyle },
    { id: 'e4', source: 'ica', target: 'rereference', ...edgeStyle },
    { id: 'e5', source: 'rereference', target: 'output-clean', ...edgeStyle },
  ],
}

// Template 5: Motor Imagery BCI Starter (Free)
export const motorImageryBCI: WorkflowTemplate = {
  id: 'motor-imagery-bci',
  name: 'Motor Imagery BCI Starter',
  description: 'EEGNet-based motor imagery classification',
  nodes: [
    {
      id: 'eeg-stream',
      type: 'dataNode',
      position: { x: 100, y: 200 },
      data: {
        label: 'EEG Stream (LSL)',
        subType: 'stream',
        status: 'idle',
        progress: 0,
      },
    },
    {
      id: 'bandpass-mi',
      type: 'preprocessingNode',
      position: { x: 300, y: 200 },
      data: {
        label: 'Bandpass (8-30Hz)',
        category: 'preprocessing',
        status: 'idle',
        progress: 0,
      },
    },
    {
      id: 'csp',
      type: 'analysisNode',
      position: { x: 500, y: 200 },
      data: {
        label: 'CSP Features',
        category: 'analysis',
        status: 'idle',
        progress: 0,
      },
    },
    {
      id: 'eegnet',
      type: 'mlNode',
      position: { x: 700, y: 200 },
      data: {
        label: 'EEGNet Classifier',
        category: 'ml_inference',
        status: 'idle',
        progress: 0,
      },
    },
    {
      id: 'output-prediction',
      type: 'outputNode',
      position: { x: 900, y: 200 },
      data: {
        label: 'Movement Prediction',
        category: 'output_sink',
        status: 'idle',
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'eeg-stream', target: 'bandpass-mi', ...edgeStyle },
    { id: 'e2', source: 'bandpass-mi', target: 'csp', ...edgeStyle },
    { id: 'e3', source: 'csp', target: 'eegnet', ...edgeStyle },
    { id: 'e4', source: 'eegnet', target: 'output-prediction', ...edgeStyle },
  ],
}

// ============================================
// STUDENT TEST ANALYSIS TEMPLATE
// ============================================

function generateStudentNodes(count: number, startX: number, startY: number): Node[] {
  const nodes: Node[] = []
  const cols = 5 // Number of columns for student nodes
  const nodeWidth = 180
  const nodeHeight = 100
  const padding = 30

  for (let i = 0; i < count; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)

    nodes.push({
      id: `student-${i + 1}`,
      type: 'dataNode',
      position: {
        x: startX + col * (nodeWidth + padding),
        y: startY + row * (nodeHeight + padding),
      },
      data: {
        label: `Student ${i + 1} Test Data`,
        subType: 'file',
        description: `Test data for student ${i + 1}`,
        status: 'idle',
      },
    })
  }
  return nodes
}

export const studentTestAnalysis: WorkflowTemplate = {
  id: 'student-test-analysis',
  name: 'Student Test Analysis',
  description: 'Analyze test data for multiple students',
  nodes: [
    // Input for all student data
    {
      id: 'all-student-data-input',
      type: 'dataNode',
      position: { x: 50, y: 200 },
      data: {
        label: 'All Student Test Data',
        subType: 'file',
        description: 'Consolidated test data for all students',
        status: 'idle',
      },
    },
    
    // Dynamically generated student nodes
    ...generateStudentNodes(10, 300, 50),

    // Preprocessing node
    {
      id: 'data-preprocessing',
      type: 'preprocessingNode',
      position: { x: 600, y: 300 },
      data: {
        label: 'Data Preprocessing',
        category: 'preprocessing',
        description: 'Clean and normalize student test data',
        status: 'idle',
      },
    },

    // Analysis node
    {
      id: 'performance-analysis',
      type: 'analysisNode',
      position: { x: 900, y: 300 },
      data: {
        label: 'Performance Analysis',
        category: 'analysis',
        description: 'Analyze student performance metrics',
        status: 'idle',
      },
    },

    // Output node
    {
      id: 'report-output',
      type: 'outputNode',
      position: { x: 1200, y: 300 },
      data: {
        label: 'Student Performance Report',
        category: 'output_sink',
        outputType: 'report',
        status: 'idle',
      },
    },
  ],
  edges: [
    // Connect all student nodes to preprocessing
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `e-student-${i + 1}-preprocess`,
      source: `student-${i + 1}`,
      target: 'data-preprocessing',
      ...edgeStyle,
    })),
    { id: 'e-all-data-preprocess', source: 'all-student-data-input', target: 'data-preprocessing', ...edgeStyle },
    { id: 'e-preprocess-analysis', source: 'data-preprocessing', target: 'performance-analysis', ...edgeStyle },
    { id: 'e-analysis-output', source: 'performance-analysis', target: 'report-output', ...edgeStyle },
  ],
}

// Template for Complex Brain Analysis
export const complexBrainAnalysis: WorkflowTemplate = {
  id: 'complex-brain-analysis',
  name: 'Complex Brain Analysis',
  description: 'A sophisticated workflow for in-depth brain analysis, combining multiple data sources and advanced techniques.',
  nodes: [
    { id: 'fmri-data', type: 'dataNode', position: { x: 50, y: 100 }, data: { label: 'fMRI Scans', subType: 'bids' } },
    { id: 'eeg-data', type: 'dataNode', position: { x: 50, y: 250 }, data: { label: 'EEG Recordings', subType: 'file' } },
    { id: 'pfc-region', type: 'brainRegionNode', position: { x: 600, y: 400 }, data: { label: 'Prefrontal Cortex', regionId: 'pfc', abbreviation: 'PFC' } },
    { id: 'fmri-preprocess', type: 'preprocessingNode', position: { x: 300, y: 100 }, data: { label: 'fMRI Preprocessing', category: 'preprocessing' } },
    { id: 'eeg-preprocess', type: 'preprocessingNode', position: { x: 300, y: 250 }, data: { label: 'EEG Preprocessing', category: 'preprocessing' } },
    { id: 'fmri-analysis', type: 'analysisNode', position: { x: 600, y: 100 }, data: { label: 'fMRI GLM Analysis', category: 'analysis' } },
    { id: 'eeg-analysis', type: 'analysisNode', position: { x: 600, y: 250 }, data: { label: 'EEG Source Localization', category: 'analysis' } },
    { id: 'multimodal-integration', type: 'brainNode', position: { x: 900, y: 200 }, data: { label: 'AI Multimodal Integration' } },
    { id: 'report-output', type: 'outputNode', position: { x: 1200, y: 200 }, data: { label: 'Integrated Brain Report', category: 'output_sink' } },
  ],
  edges: [
    { id: 'e1', source: 'fmri-data', target: 'fmri-preprocess', ...edgeStyle },
    { id: 'e2', source: 'eeg-data', target: 'eeg-preprocess', ...edgeStyle },
    { id: 'e3', source: 'fmri-preprocess', target: 'fmri-analysis', ...edgeStyle },
    { id: 'e4', source: 'eeg-preprocess', target: 'eeg-analysis', ...edgeStyle },
    { id: 'e5', source: 'pfc-region', target: 'multimodal-integration', ...edgeStyle },
    { id: 'e6', source: 'fmri-analysis', target: 'multimodal-integration', ...edgeStyle },
    { id: 'e7', source: 'eeg-analysis', target: 'multimodal-integration', ...edgeStyle },
    { id: 'e8', source: 'multimodal-integration', target: 'report-output', ...edgeStyle },
  ],
};

// Template 6: ADHD Phenotype Matching
export const adhdPhenotypeMatch: WorkflowTemplate = {
  id: 'adhd-phenotype-match',
  name: 'ADHD Phenotype Matching',
  description: 'Compare patient connectivity to UCLA ADHD phenotype database for differential diagnosis',
  nodes: [
    { id: 'patient-fmri', type: 'dataNode', position: { x: 50, y: 200 }, data: { label: 'Patient Resting-State fMRI', subType: 'file' } },
    { id: 'ucla-adhd', type: 'referenceDatasetNode', position: { x: 50, y: 350 }, data: { label: 'UCLA Consortium', source: 'ucla', subjectCount: 272 } },
    { id: 'connectivity-analysis', type: 'analysisNode', position: { x: 300, y: 200 }, data: { label: 'Connectivity Matrix', category: 'analysis' } },
    { id: 'phenotype-correlator', type: 'comparisonAgentNode', position: { x: 550, y: 275 }, data: { label: 'Phenotype Correlator', comparisonType: 'correlation' } },
    { id: 'diagnostic-ai', type: 'brainNode', position: { x: 800, y: 200 }, data: { label: 'Differential Diagnosis AI' } },
    { id: 'diagnosis-report', type: 'outputNode', position: { x: 1050, y: 200 }, data: { label: 'Phenotype Match Report', category: 'output_sink' } },
  ],
  edges: [
    { id: 'e1', source: 'patient-fmri', target: 'connectivity-analysis', ...edgeStyle },
    { id: 'e2', source: 'connectivity-analysis', target: 'phenotype-correlator', ...edgeStyle },
    { id: 'e3', source: 'ucla-adhd', target: 'phenotype-correlator', ...edgeStyle },
    { id: 'e4', source: 'phenotype-correlator', target: 'diagnostic-ai', ...edgeStyle },
    { id: 'e5', source: 'diagnostic-ai', target: 'diagnosis-report', ...edgeStyle },
  ],
};

// ============================================
// QUICK START TEMPLATE - Universal starter workflow
// Simple: Input → AI Analysis → Report
// ============================================
export const quickStartAnalyzer: WorkflowTemplate = {
  id: 'quick-start-analyzer',
  name: 'Quick Start Analyzer',
  description: 'Simple starter workflow: paste any URL → AI analyzes it → generates insights report',
  nodes: [
    // Input: Content URL (video, article, website)
    {
      id: 'content-input',
      type: 'contentUrlInputNode',
      position: { x: 80, y: 250 },
      data: {
        label: 'Paste Any URL',
        url: '',
        platform: 'other',
        status: 'idle',
        description: 'Video, article, or website to analyze',
      },
    },
    // AI Brain - The main analysis engine
    {
      id: 'ai-brain',
      type: 'brainNode',
      position: { x: 400, y: 200 },
      data: {
        label: 'AI Analyzer',
        prompt: `Analyze this content comprehensively:

1. **Content Summary**: What is this about? Key points in 2-3 sentences.

2. **Engagement Analysis**: 
   - Hook effectiveness (first 3 seconds / first paragraph)
   - Attention retention factors
   - Call-to-action clarity

3. **Emotional Profile**:
   - Primary emotions triggered
   - Emotional arc/journey
   - Memorable moments

4. **Audience Appeal**:
   - Who would love this? Who would hate it?
   - Viral potential (1-10)
   - Share motivation

5. **Improvement Suggestions**:
   - Top 3 quick wins
   - What's missing?

Provide specific, actionable insights.`,
        model: 'gemini-2.0-flash',
        status: 'idle',
      },
    },
    // Reference for context
    {
      id: 'hcp-reference',
      type: 'referenceDatasetNode',
      position: { x: 80, y: 400 },
      data: {
        label: 'HCP Baseline',
        source: 'hcp',
        subjectCount: 1200,
        description: 'Healthy brain response baselines',
        status: 'idle',
      },
    },
    // Output Report
    {
      id: 'report-output',
      type: 'outputNode',
      position: { x: 720, y: 250 },
      data: {
        label: 'Insights Report',
        outputType: 'report',
        status: 'idle',
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'content-input', target: 'ai-brain', ...edgeStyle },
    { id: 'e2', source: 'hcp-reference', target: 'ai-brain', ...edgeStyle },
    { id: 'e3', source: 'ai-brain', target: 'report-output', ...edgeStyle },
  ],
};

export const workflowTemplates = {
  'quick-start-analyzer': quickStartAnalyzer,
  'content-impact-analyzer': contentImpactAnalyzer,
  'media-bias-analyzer': mediaBiasAnalyzer,
  'ad-effectiveness-tester': adEffectivenessTester,
  'neuro-psych-screener': neuroPsychScreener,
  'personalized-connectome-mapper': connectomeMapper,
  'gene-region-correlator': geneRegionCorrelator,
  'eeg-cleaning-pipeline': eegCleaningPipeline,
  'motor-imagery-bci': motorImageryBCI,
  'student-test-analysis': studentTestAnalysis,
  'complex-brain-analysis': complexBrainAnalysis,
  'adhd-phenotype-match': adhdPhenotypeMatch,
}

export function getTemplateById(id: string): WorkflowTemplate | null {
  return (workflowTemplates as Record<string, WorkflowTemplate>)[id] || null
}
