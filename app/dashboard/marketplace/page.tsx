'use client'

import { useState } from 'react'
import { useTheme } from 'next-themes'
import { 
  Search, 
  Star, 
  Download, 
  Play,
  TrendingUp,
  Brain,
  Library,
  Scale,
  Dna,
  HeartPulse,
  Users,
  Layers,
  Sparkles,
  Clock,
  CheckCircle2,
  ShoppingCart,
  ExternalLink,
  Youtube,
  Tv
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { viralYouTubeContent, newsSegments, advertisementContent } from '@/lib/demo-content'

interface MarketplaceWorkflow {
  id: string
  name: string
  description: string
  longDescription: string
  icon: React.ElementType
  iconColor: string
  category: 'clinical' | 'research' | 'pharma' | 'education'
  price: number | 'free'
  rating: number
  downloads: number
  author: string
  authorVerified: boolean
  referenceDataset: string
  referenceSubjects: number
  tags: string[]
  featured: boolean
  isTemplate?: boolean
  isOfficial?: boolean
  nodeTypes: string[]
  estimatedTime: string
}

// Pre-built Marketplace Products based on your vision
const marketplaceWorkflows: MarketplaceWorkflow[] = [
  // ⭐ FLAGSHIP: Content Impact Analyzer - 100 Brain Node Simulation
  {
    id: 'content-impact-analyzer',
    name: 'Content Impact Analyzer',
    description: 'Simulate 100 diverse brain profiles watching your content. Understand psychological impact in real-time.',
    longDescription: 'Revolutionary workflow: paste any YouTube, TikTok, or media URL. 100 AI-simulated brain nodes with diverse demographic profiles analyze attention, emotional response, cognitive load, and persuasion patterns. Get a comprehensive report on how your content affects viewer psychology.',
    icon: Brain,
    iconColor: 'text-fuchsia-400',
    category: 'research',
    price: 49,
    rating: 4.9,
    downloads: 12847,
    author: 'NeuroData Hub',
    authorVerified: true,
    referenceDataset: 'HCP 1200 + UCLA Phenotypes + Custom Personas',
    referenceSubjects: 1472,
    tags: ['YouTube', 'TikTok', 'Content Analysis', 'Psychology', 'Persuasion', 'Attention', 'Media', 'Creator Tools'],
    featured: true,
    isTemplate: true,
    isOfficial: true,
    nodeTypes: ['Content URL Input', '100x Brain Simulators', 'Attention Tracker', 'Emotion Analyzer', 'Persuasion Detector', 'Cognitive Load Monitor', 'Demographics Segmenter', 'Results Dashboard'],
    estimatedTime: '3-5 min',
  },
  // ⭐ NEW: Media Bias Analyzer - For news/propaganda analysis
  {
    id: 'media-bias-analyzer',
    name: 'Media Bias Analyzer',
    description: 'Analyze how news segments affect different viewer demographics. Fox, CNN, MSNBC - see the neural impact.',
    longDescription: 'Upload any news clip or paste URL. Simulate viewer brain responses across political spectrums, age groups, and education levels. Understand confirmation bias, emotional manipulation, and persuasion techniques at the neurological level.',
    icon: Scale,
    iconColor: 'text-orange-400',
    category: 'research',
    price: 79,
    rating: 4.8,
    downloads: 8934,
    author: 'NeuroData Hub',
    authorVerified: true,
    referenceDataset: 'Political Cognition Dataset + HCP Demographics',
    referenceSubjects: 2100,
    tags: ['News', 'Propaganda', 'Political', 'Bias Detection', 'Media Literacy', 'Fox News', 'CNN', 'Psychology'],
    featured: true,
    isTemplate: true,
    isOfficial: true,
    nodeTypes: ['Media URL Input', 'Demographic Brain Profiles', 'Confirmation Bias Detector', 'Emotional Trigger Mapper', 'Persuasion Score', 'Trust Response', 'Political Spectrum Analysis', 'Comparison Report'],
    estimatedTime: '5-8 min',
  },
  {
    id: 'neuro-psych-screener',
    name: 'Neuro-Psych Screener',
    description: 'Compare patient scans against UCLA phenotypes. Get diagnostic insights in 15 minutes.',
    longDescription: 'Upload a scan, compare against 272 subjects with ADHD, Schizophrenia, Bipolar phenotypes. Data-backed second opinions.',
    icon: HeartPulse,
    iconColor: 'text-rose-400',
    category: 'clinical',
    price: 29,
    rating: 4.9,
    downloads: 1247,
    author: 'NeuroAI Labs',
    authorVerified: true,
    referenceDataset: 'UCLA Consortium for Neuropsychiatric Phenomics',
    referenceSubjects: 272,
    tags: ['Clinical', 'Psychiatry', 'fMRI', 'Diagnostic', 'Phenotyping'],
    featured: true,
    isTemplate: true,
    isOfficial: true,
    nodeTypes: ['User Data', 'UCLA Reference', 'Phenotype Correlator', 'PDF Report'],
    estimatedTime: '15 min',
  },
  {
    id: 'personalized-connectome-mapper',
    name: 'Connectome Mapper',
    description: 'Find white matter deviations vs HCP 1200 healthy controls. For TBI rehab planning.',
    longDescription: 'Upload DTI, find tracts deviating >2 SD from healthy average. 3D deviation reports.',
    icon: Library,
    iconColor: 'text-amber-400',
    category: 'clinical',
    price: 49,
    rating: 4.8,
    downloads: 892,
    author: 'Connectome Core',
    authorVerified: true,
    referenceDataset: 'HCP 1200',
    referenceSubjects: 1200,
    tags: ['TBI', 'DTI', 'Connectome', 'Rehab'],
    featured: false,
    isTemplate: true,
    isOfficial: true,
    nodeTypes: ['DTI Upload', 'HCP Reference', 'Deviation Detector', '3D Report'],
    estimatedTime: '25 min',
  },
  {
    id: 'gene-region-correlator',
    name: 'Gene-Region Correlator',
    description: 'Map gene expression to brain circuits. Allen Atlas + Midnight Scan Club.',
    longDescription: 'Enter a gene → find high-expression regions → see how they connect at rest.',
    icon: Dna,
    iconColor: 'text-emerald-400',
    category: 'pharma',
    price: 99,
    rating: 4.7,
    downloads: 456,
    author: 'PharmaNeuro Inc',
    authorVerified: true,
    referenceDataset: 'Allen + MSC',
    referenceSubjects: 10,
    tags: ['Gene Expression', 'Drug Discovery', 'Connectivity'],
    featured: false,
    isTemplate: true,
    isOfficial: true,
    nodeTypes: ['Gene Query', 'Allen Atlas', 'MSC Reference', 'Connectivity Map'],
    estimatedTime: '20 min',
  },
  {
    id: 'eeg-cleaning-pipeline',
    name: 'EEG Deep Clean v4',
    description: 'PhD-grade EEG preprocessing. Bandpass → ICA → Quality check.',
    longDescription: 'Battle-tested workflow: artifact removal, ICA, MSC quality standards.',
    icon: Sparkles,
    iconColor: 'text-purple-400',
    category: 'research',
    price: 19,
    rating: 4.6,
    downloads: 3420,
    author: 'PhDStudent_EEG',
    authorVerified: false,
    referenceDataset: 'MSC Standards',
    referenceSubjects: 10,
    tags: ['EEG', 'Preprocessing', 'ICA'],
    featured: false,
    isTemplate: true,
    nodeTypes: ['EEG File', 'Bandpass', 'ICA', 'Quality Check'],
    estimatedTime: '10 min',
  },
  {
    id: 'sleep-staging-workflow',
    name: 'Sleep Stager',
    description: 'YASA-powered sleep staging. Upload EEG, get hypnogram.',
    longDescription: 'Automated sleep staging validated against HCP sleep data.',
    icon: Brain,
    iconColor: 'text-blue-400',
    category: 'clinical',
    price: 29,
    rating: 4.5,
    downloads: 1893,
    author: 'SleepLab AI',
    authorVerified: true,
    referenceDataset: 'HCP Sleep',
    referenceSubjects: 1200,
    tags: ['Sleep', 'EEG', 'YASA'],
    featured: false,
    isTemplate: true,
    isOfficial: true,
    nodeTypes: ['EEG Upload', 'YASA ML', 'Hypnogram'],
    estimatedTime: '5 min',
  },
  {
    id: 'motor-imagery-bci',
    name: 'Motor Imagery BCI',
    description: 'Real-time motor imagery classification. EEGNet + CSP.',
    longDescription: 'Ready-to-use BCI pipeline: preprocessing, features, classification.',
    icon: Brain,
    iconColor: 'text-pink-400',
    category: 'research',
    price: 'free',
    rating: 4.4,
    downloads: 5621,
    author: 'BCI Open Source',
    authorVerified: true,
    referenceDataset: 'OpenBCI Motor Imagery',
    referenceSubjects: 109,
    tags: ['BCI', 'Motor Imagery', 'Real-time'],
    featured: false,
    isTemplate: true,
    nodeTypes: ['EEG Stream', 'Bandpass', 'CSP', 'EEGNet'],
    estimatedTime: 'Real-time',
  },

  // =========================================================================
  // 🎯 AI AGENT PANEL WORKFLOWS - Synthetic Focus Groups
  // =========================================================================
  
  // 📝 CONTENT & CREATIVE
  {
    id: 'essay-grading-panel',
    name: '50 Teachers Grading Panel',
    description: 'Get 50 AI teachers with different rubrics to grade essays, papers, or assignments.',
    longDescription: 'Upload any written work. 50 diverse AI teacher personas evaluate based on different criteria: grammar, creativity, argument structure, evidence usage, originality. Get consensus scores and detailed feedback.',
    icon: Users,
    iconColor: 'text-blue-400',
    category: 'education',
    price: 19,
    rating: 4.8,
    downloads: 8234,
    author: 'NeuroData Hub',
    authorVerified: true,
    referenceDataset: 'Educational Assessment Standards',
    referenceSubjects: 50,
    tags: ['Education', 'Grading', 'Essays', 'Teachers', 'Feedback', 'Academic'],
    featured: true,
    isTemplate: true,
    isOfficial: true,
    nodeTypes: ['Essay Input', '50x Teacher Agents', 'Rubric Evaluator', 'Consensus Builder', 'Grade Report'],
    estimatedTime: '2-3 min',
  },
  {
    id: 'book-editor-panel',
    name: '30 Editors Review Panel',
    description: 'Submit your manuscript chapter to 30 AI editors with different publishing backgrounds.',
    longDescription: 'Fiction, non-fiction, academic - get feedback from 30 simulated editors: developmental editors, copy editors, sensitivity readers, genre specialists. Identify plot holes, pacing issues, and market fit.',
    icon: Library,
    iconColor: 'text-amber-400',
    category: 'education',
    price: 29,
    rating: 4.7,
    downloads: 3421,
    author: 'NeuroData Hub',
    authorVerified: true,
    referenceDataset: 'Publishing Industry Profiles',
    referenceSubjects: 30,
    tags: ['Writing', 'Editing', 'Publishing', 'Manuscripts', 'Books', 'Authors'],
    featured: false,
    isTemplate: true,
    isOfficial: true,
    nodeTypes: ['Manuscript Input', '30x Editor Agents', 'Genre Analyzer', 'Pacing Tracker', 'Feedback Aggregator'],
    estimatedTime: '3-5 min',
  },
  {
    id: 'movie-critic-panel',
    name: '100 Film Critics Panel',
    description: 'Get your short film or trailer reviewed by 100 AI critics with diverse tastes.',
    longDescription: 'Upload video content. 100 simulated film critics evaluate cinematography, storytelling, acting, pacing, originality. Get a Rotten Tomatoes-style consensus with individual reviews.',
    icon: Tv,
    iconColor: 'text-red-400',
    category: 'research',
    price: 39,
    rating: 4.6,
    downloads: 2156,
    author: 'NeuroData Hub',
    authorVerified: true,
    referenceDataset: 'Film Critic Personas',
    referenceSubjects: 100,
    tags: ['Film', 'Video', 'Critics', 'Movies', 'Trailers', 'Filmmakers'],
    featured: false,
    isTemplate: true,
    isOfficial: true,
    nodeTypes: ['Video Input', '100x Critic Agents', 'Rotten Score', 'Review Aggregator', 'Consensus Report'],
    estimatedTime: '4-6 min',
  },

  // 💼 BUSINESS & PRODUCT
  {
    id: 'investor-pitch-panel',
    name: '25 VCs Pitch Review',
    description: 'Pitch your startup idea to 25 AI venture capitalists with different investment theses.',
    longDescription: 'Submit your pitch deck or description. 25 simulated VCs evaluate: market size, team strength, competitive moat, unit economics, scalability. Get pass/invest decisions with detailed reasoning.',
    icon: TrendingUp,
    iconColor: 'text-green-400',
    category: 'pharma',
    price: 49,
    rating: 4.9,
    downloads: 5678,
    author: 'NeuroData Hub',
    authorVerified: true,
    referenceDataset: 'VC Decision Patterns',
    referenceSubjects: 25,
    tags: ['Startup', 'VC', 'Pitch', 'Investment', 'Fundraising', 'Entrepreneurship'],
    featured: true,
    isTemplate: true,
    isOfficial: true,
    nodeTypes: ['Pitch Input', '25x VC Agents', 'Due Diligence', 'Term Sheet Generator', 'Funding Probability'],
    estimatedTime: '3-4 min',
  },
  {
    id: 'product-focus-group',
    name: '100 User Personas Panel',
    description: 'Test your product concept with 100 diverse AI user personas before building.',
    longDescription: 'Describe your product idea. 100 simulated users across demographics, tech-savviness, and use cases evaluate: would they use it, what would they pay, what features matter most, deal-breakers.',
    icon: Users,
    iconColor: 'text-purple-400',
    category: 'pharma',
    price: 29,
    rating: 4.8,
    downloads: 7890,
    author: 'NeuroData Hub',
    authorVerified: true,
    referenceDataset: 'Consumer Behavior Profiles',
    referenceSubjects: 100,
    tags: ['Product', 'UX', 'Focus Group', 'Market Research', 'Validation', 'Personas'],
    featured: true,
    isTemplate: true,
    isOfficial: true,
    nodeTypes: ['Product Description', '100x User Agents', 'Feature Prioritizer', 'Pricing Analyzer', 'NPS Predictor'],
    estimatedTime: '2-4 min',
  },
  {
    id: 'hiring-interview-panel',
    name: '10 Interview Panel',
    description: 'Evaluate job candidates with 10 AI interviewers covering different competencies.',
    longDescription: 'Submit resume and job description. 10 AI interviewers assess: technical skills, culture fit, leadership potential, communication, problem-solving. Get hiring recommendation with concerns.',
    icon: Users,
    iconColor: 'text-indigo-400',
    category: 'pharma',
    price: 19,
    rating: 4.5,
    downloads: 3245,
    author: 'NeuroData Hub',
    authorVerified: true,
    referenceDataset: 'HR Assessment Frameworks',
    referenceSubjects: 10,
    tags: ['Hiring', 'HR', 'Interviews', 'Recruiting', 'Talent', 'Assessment'],
    featured: false,
    isTemplate: true,
    isOfficial: true,
    nodeTypes: ['Resume Input', 'Job Description', '10x Interviewer Agents', 'Competency Matrix', 'Hire/No-Hire'],
    estimatedTime: '2-3 min',
  },

  // ⚖️ LEGAL & COMPLIANCE
  {
    id: 'contract-review-panel',
    name: '20 Lawyers Contract Review',
    description: 'Have 20 AI lawyers with different specialties review your contract for risks.',
    longDescription: 'Upload any contract. 20 simulated lawyers (corporate, IP, employment, litigation, etc.) identify: risky clauses, missing protections, negotiation opportunities, red flags. Get risk score and recommendations.',
    icon: Scale,
    iconColor: 'text-orange-400',
    category: 'clinical',
    price: 39,
    rating: 4.9,
    downloads: 6543,
    author: 'NeuroData Hub',
    authorVerified: true,
    referenceDataset: 'Legal Risk Assessment',
    referenceSubjects: 20,
    tags: ['Legal', 'Contracts', 'Lawyers', 'Risk', 'Compliance', 'Due Diligence'],
    featured: true,
    isTemplate: true,
    isOfficial: true,
    nodeTypes: ['Contract Input', '20x Lawyer Agents', 'Clause Analyzer', 'Risk Score', 'Negotiation Tips'],
    estimatedTime: '3-5 min',
  },
  {
    id: 'policy-review-panel',
    name: '15 Policy Experts Panel',
    description: 'Get your company policy reviewed by 15 AI experts: HR, legal, DEI, security.',
    longDescription: 'Submit any internal policy. 15 specialists evaluate: legal compliance, employee impact, enforcement feasibility, bias detection, industry best practices. Get improvement suggestions.',
    icon: Scale,
    iconColor: 'text-cyan-400',
    category: 'clinical',
    price: 29,
    rating: 4.6,
    downloads: 2134,
    author: 'NeuroData Hub',
    authorVerified: true,
    referenceDataset: 'Corporate Policy Standards',
    referenceSubjects: 15,
    tags: ['Policy', 'HR', 'Compliance', 'DEI', 'Corporate', 'Governance'],
    featured: false,
    isTemplate: true,
    isOfficial: true,
    nodeTypes: ['Policy Input', '15x Expert Agents', 'Compliance Checker', 'Bias Detector', 'Recommendations'],
    estimatedTime: '2-4 min',
  },

  // 🔬 RESEARCH & SCIENCE
  {
    id: 'peer-review-panel',
    name: '50 Scientists Peer Review',
    description: 'Submit your research paper to 50 AI scientists for pre-submission peer review.',
    longDescription: 'Upload paper draft. 50 simulated scientists across disciplines evaluate: methodology, statistical validity, novelty, reproducibility, writing clarity. Catch issues before journal submission.',
    icon: Dna,
    iconColor: 'text-emerald-400',
    category: 'research',
    price: 49,
    rating: 4.8,
    downloads: 4567,
    author: 'NeuroData Hub',
    authorVerified: true,
    referenceDataset: 'Academic Review Standards',
    referenceSubjects: 50,
    tags: ['Research', 'Peer Review', 'Academic', 'Papers', 'Science', 'Publication'],
    featured: true,
    isTemplate: true,
    isOfficial: true,
    nodeTypes: ['Paper Input', '50x Scientist Agents', 'Method Validator', 'Stats Checker', 'Revision Suggestions'],
    estimatedTime: '4-6 min',
  },
  {
    id: 'hypothesis-debate',
    name: '100 Experts Hypothesis Debate',
    description: 'Test a scientific hypothesis with 100 AI experts who argue for and against.',
    longDescription: 'State any hypothesis. 100 simulated domain experts debate: supporting evidence, counter-arguments, experimental designs to test it, confidence levels. Achieve scientific consensus or identify key uncertainties.',
    icon: Brain,
    iconColor: 'text-pink-400',
    category: 'research',
    price: 39,
    rating: 4.7,
    downloads: 3890,
    author: 'NeuroData Hub',
    authorVerified: true,
    referenceDataset: 'Scientific Reasoning Patterns',
    referenceSubjects: 100,
    tags: ['Hypothesis', 'Science', 'Debate', 'Research', 'Evidence', 'Consensus'],
    featured: false,
    isTemplate: true,
    isOfficial: true,
    nodeTypes: ['Hypothesis Input', '100x Expert Agents', 'Pro Arguments', 'Con Arguments', 'Confidence Score'],
    estimatedTime: '3-5 min',
  },

  // 🎨 CREATIVE & MARKETING
  {
    id: 'brand-name-panel',
    name: '75 Consumers Name Testing',
    description: 'Test your brand/product name with 75 AI consumers before launch.',
    longDescription: 'Submit name candidates. 75 diverse simulated consumers rate: memorability, pronunciation, associations, emotional response, cultural sensitivity across demographics. Pick the winner.',
    icon: Sparkles,
    iconColor: 'text-yellow-400',
    category: 'pharma',
    price: 19,
    rating: 4.6,
    downloads: 5432,
    author: 'NeuroData Hub',
    authorVerified: true,
    referenceDataset: 'Brand Perception Studies',
    referenceSubjects: 75,
    tags: ['Branding', 'Naming', 'Marketing', 'Consumer', 'Testing', 'Launch'],
    featured: false,
    isTemplate: true,
    isOfficial: true,
    nodeTypes: ['Name Candidates', '75x Consumer Agents', 'Association Map', 'Memorability Score', 'Winner Selector'],
    estimatedTime: '2-3 min',
  },
  {
    id: 'social-post-panel',
    name: '50 Followers Reaction Panel',
    description: 'Test your social media post with 50 AI followers before publishing.',
    longDescription: 'Draft your tweet, LinkedIn post, or Instagram caption. 50 simulated followers react: would they like, share, comment? What emotions does it trigger? A/B test variations instantly.',
    icon: Users,
    iconColor: 'text-blue-500',
    category: 'education',
    price: 9,
    rating: 4.5,
    downloads: 12456,
    author: 'NeuroData Hub',
    authorVerified: true,
    referenceDataset: 'Social Media Engagement Patterns',
    referenceSubjects: 50,
    tags: ['Social Media', 'Content', 'Marketing', 'Engagement', 'Twitter', 'LinkedIn'],
    featured: false,
    isTemplate: true,
    isOfficial: true,
    nodeTypes: ['Post Input', '50x Follower Agents', 'Engagement Predictor', 'Sentiment Map', 'A/B Comparison'],
    estimatedTime: '1-2 min',
  },
  {
    id: 'recipe-rating-panel',
    name: '50 Chefs Recipe Rating',
    description: 'Get your recipe rated by 50 AI chefs with different culinary backgrounds.',
    longDescription: 'Submit your recipe. 50 simulated chefs (French, Italian, Asian, pastry, etc.) rate: taste balance, technique difficulty, presentation suggestions, improvement tips. Perfect for food bloggers and restaurants.',
    icon: Sparkles,
    iconColor: 'text-orange-500',
    category: 'education',
    price: 19,
    rating: 4.8,
    downloads: 4321,
    author: 'NeuroData Hub',
    authorVerified: true,
    referenceDataset: 'Culinary Assessment Standards',
    referenceSubjects: 50,
    tags: ['Food', 'Recipes', 'Chefs', 'Cooking', 'Culinary', 'Rating'],
    featured: false,
    isTemplate: true,
    isOfficial: true,
    nodeTypes: ['Recipe Input', '50x Chef Agents', 'Taste Analyzer', 'Difficulty Score', 'Improvement Tips'],
    estimatedTime: '2-3 min',
  },

  // 🏥 HEALTHCARE & WELLNESS
  {
    id: 'symptom-panel',
    name: '25 Doctors Symptom Analysis',
    description: 'Describe symptoms to 25 AI doctors with different specialties for differential diagnosis.',
    longDescription: 'Enter patient symptoms. 25 simulated specialists (cardiologist, neurologist, internist, etc.) each provide differential diagnoses, recommended tests, and urgency levels. For educational purposes only.',
    icon: HeartPulse,
    iconColor: 'text-rose-400',
    category: 'clinical',
    price: 29,
    rating: 4.7,
    downloads: 8765,
    author: 'NeuroData Hub',
    authorVerified: true,
    referenceDataset: 'Medical Diagnostic Patterns',
    referenceSubjects: 25,
    tags: ['Medical', 'Diagnosis', 'Symptoms', 'Doctors', 'Healthcare', 'Education'],
    featured: false,
    isTemplate: true,
    isOfficial: true,
    nodeTypes: ['Symptom Input', '25x Doctor Agents', 'Differential Dx', 'Test Recommendations', 'Urgency Score'],
    estimatedTime: '2-4 min',
  },
  {
    id: 'therapy-perspectives',
    name: '10 Therapists Perspective Panel',
    description: 'Get 10 AI therapists from different modalities to analyze a situation.',
    longDescription: 'Describe a personal challenge. 10 simulated therapists (CBT, psychodynamic, DBT, ACT, etc.) each offer their perspective, coping strategies, and growth opportunities. For self-reflection only.',
    icon: Brain,
    iconColor: 'text-teal-400',
    category: 'clinical',
    price: 19,
    rating: 4.6,
    downloads: 6543,
    author: 'NeuroData Hub',
    authorVerified: true,
    referenceDataset: 'Therapeutic Frameworks',
    referenceSubjects: 10,
    tags: ['Mental Health', 'Therapy', 'Self-Help', 'Psychology', 'Coping', 'Wellness'],
    featured: false,
    isTemplate: true,
    isOfficial: true,
    nodeTypes: ['Situation Input', '10x Therapist Agents', 'Modality Comparison', 'Coping Strategies', 'Action Steps'],
    estimatedTime: '2-3 min',
  },

  // ⭐ NEW: Ad Effectiveness Tester
  {
    id: 'ad-effectiveness-tester',
    name: 'Ad Effectiveness Tester',
    description: 'Test your ad against 100 simulated viewer brains before spending on media.',
    longDescription: 'Upload your video ad. Simulate attention patterns, emotional peaks, brand recall moments, and call-to-action effectiveness across diverse demographic brain profiles.',
    icon: TrendingUp,
    iconColor: 'text-green-400',
    category: 'pharma',
    price: 39,
    rating: 4.7,
    downloads: 4521,
    author: 'AdNeuro Labs',
    authorVerified: true,
    referenceDataset: 'Consumer Neuroscience Dataset',
    referenceSubjects: 500,
    tags: ['Advertising', 'Marketing', 'Attention', 'Brand Recall', 'ROI'],
    featured: false,
    isTemplate: true,
    isOfficial: true,
    nodeTypes: ['Video Upload', 'Attention Heatmap', 'Emotion Timeline', 'Brand Recall Score', 'CTA Effectiveness', 'Demographic Breakdown'],
    estimatedTime: '2-4 min',
  },
]

const categoryColors: Record<string, { bg: string; text: string }> = {
  clinical: { bg: 'bg-rose-500/10', text: 'text-rose-400' },
  research: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
  pharma: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  education: { bg: 'bg-purple-500/10', text: 'text-purple-400' },
}

function WorkflowCard({ workflow }: { workflow: MarketplaceWorkflow }) {
  const Icon = workflow.icon
  const catColor = categoryColors[workflow.category] || categoryColors.research
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  
  return (
    <Card className={cn(
      'group hover:border-foreground/20 transition-all duration-200 relative overflow-hidden',
      'border-border bg-card',
      workflow.featured && 'ring-1 ring-amber-500/30'
    )}>
      {/* Compact Header */}
      <div className="p-4 pb-2">
        {/* Top row: Icon + Title + Price */}
        <div className="flex items-start gap-3">
          <div className={cn('p-2 rounded-lg shrink-0', catColor.bg)}>
            <Icon className={cn('w-5 h-5', workflow.iconColor)} />
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm leading-tight truncate text-foreground group-hover:text-foreground/80 transition-colors" title={workflow.name}>
                {workflow.name}
              </h3>
              {workflow.price === 'free' ? (
                <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[10px] px-1.5 py-0 shrink-0">
                  Free
                </Badge>
              ) : (
                <span className="text-sm font-bold whitespace-nowrap text-foreground shrink-0">
                  ${workflow.price}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-muted-foreground">{workflow.author}</span>
              {workflow.authorVerified && <CheckCircle2 className="w-3 h-3 text-blue-400" />}
            </div>
          </div>
        </div>

        {/* Badges row (compact) */}
        {(workflow.featured || workflow.isTemplate || workflow.isOfficial) && (
          <div className="flex gap-1 mt-2">
            {workflow.featured && (
              <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 text-[10px] px-1.5 py-0">
                <Star className="w-2.5 h-2.5 mr-0.5 fill-amber-400" />
                Featured
              </Badge>
            )}
            {workflow.isOfficial && (
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px] px-1.5 py-0">
                Official
              </Badge>
            )}
          </div>
        )}
      </div>
      
      <CardContent className="p-4 pt-2 space-y-2">
        {/* Description */}
        <p className="text-xs line-clamp-2 text-muted-foreground">
          {workflow.description}
        </p>
        
        {/* Reference Dataset (compact) */}
        <div className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md bg-accent text-accent-foreground">
          <Library className="w-3 h-3 text-amber-400 shrink-0" />
          <span className="truncate">{workflow.referenceDataset}</span>
          <span className="shrink-0 text-muted-foreground">
            ({workflow.referenceSubjects.toLocaleString()})
          </span>
        </div>
        
        {/* Info Row - estimated time only */}
        <div className="flex items-center gap-3 text-xs pt-1 text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {workflow.estimatedTime}
          </span>
          <span className="flex items-center gap-1">
            <Layers className="w-3 h-3" />
            {workflow.nodeTypes.length} nodes
          </span>
        </div>
        
        {/* Action Button (single, full width) */}
        <Link href={`/dashboard/workflows/new?template=${workflow.id}`} className="block pt-1">
          <Button 
            className="w-full text-xs h-8"
            size="sm"
          >
            <Play className="w-3.5 h-3.5 mr-1.5" />
            Use Template
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}

export default function MarketplacePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'rating' | 'downloads' | 'price'>('downloads')
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  
  const filteredWorkflows = marketplaceWorkflows
    .filter(w => {
      if (categoryFilter !== 'all' && w.category !== categoryFilter) return false
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          w.name.toLowerCase().includes(query) ||
          w.description.toLowerCase().includes(query) ||
          w.tags.some(t => t.toLowerCase().includes(query)) ||
          w.referenceDataset.toLowerCase().includes(query)
        )
      }
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating
        case 'downloads':
          return b.downloads - a.downloads
        case 'price':
          const aPrice = typeof a.price === 'number' ? a.price : 0
          const bPrice = typeof b.price === 'number' ? b.price : 0
          return aPrice - bPrice
        default:
          return 0
      }
    })
  
  const featuredWorkflows = filteredWorkflows.filter(w => w.featured)
  const otherWorkflows = filteredWorkflows.filter(w => !w.featured)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className={cn(
            'text-2xl font-bold flex items-center gap-3',
            isDark ? 'text-slate-100' : 'text-slate-800'
          )}>
            <Layers className="w-7 h-7 text-indigo-400" />
            Workflow Marketplace
          </h1>
          <p className={cn('mt-1', isDark ? 'text-slate-400' : 'text-slate-500')}>
            Pre-built workflows with reference datasets • Control Group as a Service
          </p>
        </div>
        
        <Link href="/dashboard/workflows/new">
          <Button className="bg-indigo-600 hover:bg-indigo-500">
            <Brain className="w-4 h-4 mr-2" />
            Build Custom
          </Button>
        </Link>
      </div>

      {/* 🔥 Try With Trending Content - MOVED TO TOP */}
      <div className={cn(
        'rounded-xl p-5 border',
        isDark 
          ? 'bg-gradient-to-r from-fuchsia-500/10 via-violet-500/10 to-cyan-500/10 border-fuchsia-500/20'
          : 'bg-gradient-to-r from-fuchsia-50 via-violet-50 to-cyan-50 border-fuchsia-200'
      )}>
        <h2 className={cn(
          'text-base font-semibold mb-3 flex items-center gap-2',
          isDark ? 'text-slate-100' : 'text-slate-800'
        )}>
          <Play className="w-4 h-4 text-fuchsia-400" />
          Try With Trending Content
          <Badge className="ml-2 bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30 text-[10px]">
            Live Demo Data
          </Badge>
        </h2>
        <p className={cn('text-sm mb-4', isDark ? 'text-slate-400' : 'text-slate-600')}>
          Click any content below to instantly test our workflows with real viral videos and news clips
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Viral YouTube Content */}
          {viralYouTubeContent.slice(0, 2).map(content => (
            <Link 
              key={content.id}
              href={`/dashboard/workflows/new?template=content-impact-analyzer&demoContent=${content.id}`}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border transition-all hover:scale-[1.02]',
                isDark 
                  ? 'bg-slate-800/50 border-slate-700 hover:border-red-500/50 hover:bg-slate-800'
                  : 'bg-white border-slate-200 hover:border-red-400 hover:shadow-md'
              )}
            >
              <div className="p-2 bg-red-500/10 rounded-lg shrink-0">
                <Youtube className="w-5 h-5 text-red-500" />
              </div>
              <div className="min-w-0">
                <p className={cn('text-sm font-medium truncate', isDark ? 'text-slate-200' : 'text-slate-800')}>
                  {content.title}
                </p>
                <p className={cn('text-xs truncate', isDark ? 'text-slate-500' : 'text-slate-500')}>
                  {content.views} views • {content.duration}
                </p>
                <div className="flex gap-1 mt-1.5">
                  {content.tags.slice(0, 2).map(tag => (
                    <Badge key={tag} variant="outline" className="text-[9px] px-1.5 py-0">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </Link>
          ))}
          
          {/* News Segment */}
          <Link 
            href={`/dashboard/workflows/new?template=media-bias-analyzer&demoContent=news-comparison`}
            className={cn(
              'flex items-start gap-3 p-3 rounded-lg border transition-all hover:scale-[1.02]',
              isDark 
                ? 'bg-slate-800/50 border-slate-700 hover:border-orange-500/50 hover:bg-slate-800'
                : 'bg-white border-slate-200 hover:border-orange-400 hover:shadow-md'
            )}
          >
            <div className="p-2 bg-orange-500/10 rounded-lg shrink-0">
              <Tv className="w-5 h-5 text-orange-500" />
            </div>
            <div className="min-w-0">
              <p className={cn('text-sm font-medium truncate', isDark ? 'text-slate-200' : 'text-slate-800')}>
                Compare Fox vs CNN vs MSNBC
              </p>
              <p className={cn('text-xs truncate', isDark ? 'text-slate-500' : 'text-slate-500')}>
                Same story, different framing
              </p>
              <div className="flex gap-1 mt-1.5">
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-red-400/50 text-red-400">Fox</Badge>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-blue-400/50 text-blue-400">CNN</Badge>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-purple-400/50 text-purple-400">MSNBC</Badge>
              </div>
            </div>
          </Link>
        </div>
        
        <div className="mt-3 text-center">
          <Link 
            href="/dashboard/marketplace/demo-content"
            className={cn('text-xs hover:underline', isDark ? 'text-fuchsia-400' : 'text-fuchsia-600')}
          >
            View all {viralYouTubeContent.length + newsSegments.length + advertisementContent.length}+ demo content examples →
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className={cn(
            'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4',
            isDark ? 'text-slate-500' : 'text-slate-400'
          )} />
          <input
            type="text"
            placeholder="Search workflows, datasets, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'w-full pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50',
              isDark 
                ? 'bg-slate-800/50 border border-slate-700 text-slate-100 placeholder:text-slate-500' 
                : 'bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400'
            )}
          />
        </div>
        
        <div className="flex gap-2">
          {['all', 'clinical', 'research', 'pharma'].map(cat => (
            <Button
              key={cat}
              variant={categoryFilter === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                'text-xs',
                categoryFilter === cat 
                  ? 'bg-indigo-600 hover:bg-indigo-500' 
                  : isDark 
                    ? 'border-slate-700 text-slate-400 hover:bg-slate-800'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              )}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Button>
          ))}
        </div>
        
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className={cn(
            'px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50',
            isDark 
              ? 'bg-black border border-slate-700 text-slate-300 [&>option]:bg-black' 
              : 'bg-white border border-slate-200 text-slate-600'
          )}
        >
          <option value="downloads">Most Popular</option>
          <option value="rating">Highest Rated</option>
          <option value="price">Lowest Price</option>
        </select>
      </div>

      {/* Featured Section - 4 column grid */}
      {featuredWorkflows.length > 0 && (
        <div>
          <h2 className={cn(
            'text-base font-semibold mb-3 flex items-center gap-2',
            isDark ? 'text-slate-100' : 'text-slate-800'
          )}>
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            Featured Workflows
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {featuredWorkflows.map(workflow => (
              <WorkflowCard key={workflow.id} workflow={workflow} />
            ))}
          </div>
        </div>
      )}

      {/* All Workflows - 4 column grid */}
      <div>
        <h2 className={cn(
          'text-base font-semibold mb-3',
          isDark ? 'text-slate-100' : 'text-slate-800'
        )}>
          All Workflows
          <span className={cn('text-sm font-normal ml-2', isDark ? 'text-slate-500' : 'text-slate-400')}>
            ({otherWorkflows.length} results)
          </span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {otherWorkflows.map(workflow => (
            <WorkflowCard key={workflow.id} workflow={workflow} />
          ))}
        </div>
      </div>

      {/* Empty State */}
      {filteredWorkflows.length === 0 && (
        <div className="text-center py-12">
          <Search className={cn('w-10 h-10 mx-auto mb-3', isDark ? 'text-slate-600' : 'text-slate-400')} />
          <h3 className={cn('text-base font-medium', isDark ? 'text-slate-300' : 'text-slate-600')}>No workflows found</h3>
          <p className={cn('text-sm mt-1', isDark ? 'text-slate-500' : 'text-slate-400')}>Try adjusting your search or filters</p>
        </div>
      )}

      {/* Creator CTA - compact */}
      <div className={cn(
        'rounded-xl p-6 text-center border',
        isDark 
          ? 'bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border-indigo-500/30'
          : 'bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border-indigo-200'
      )}>
        <h3 className={cn('text-lg font-bold mb-1', isDark ? 'text-slate-100' : 'text-slate-800')}>
          Become a Workflow Creator
        </h3>
        <p className={cn('text-sm max-w-xl mx-auto mb-4', isDark ? 'text-slate-400' : 'text-slate-600')}>
          Share your expertise and earn $50-$800 per workflow. Join PhD students and clinicians already earning.
        </p>
        <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500">
          <Sparkles className="w-4 h-4 mr-2" />
          Submit Your Workflow
        </Button>
      </div>
    </div>
  )
}
