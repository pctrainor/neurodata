'use client'

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { 
  Brain, 
  FileText, 
  Cpu, 
  Database, 
  Globe, 
  Zap, 
  BarChart3, 
  FileOutput,
  Radio,
  Sparkles,
  Activity,
  GripVertical,
  Library,
  Scale,
  Users,
  Dna,
  HeartPulse,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Search,
  Plus,
  Settings2,
  Code2,
  Package,
  Star,
  Layers,
  Filter,
  X,
  Trash2,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Table2, FileSpreadsheet, FolderOpen, RefreshCw } from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

export interface DraggableNodeItem {
  type: string
  label: string
  icon: React.ElementType
  color: string
  bgColor: string
  payload: Record<string, unknown>
  tooltip: string
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  tags?: string[]
  isCustom?: boolean
  isUserData?: boolean // For user uploaded datasets
  id?: string // For custom modules, allows deletion
}

interface NodeCategory {
  id: string
  title: string
  icon: React.ElementType
  iconColor: string
  description: string
  items: DraggableNodeItem[]
  defaultExpanded?: boolean
}

// User dataset type (from API)
interface UserDataset {
  id: string
  name: string
  file_name: string
  file_type: string
  file_size_bytes: number
  row_count: number | null
  column_count: number | null
  columns: { name: string; type: string }[] | null
  category: string | null
}

interface NodePaletteProps {
  onCreateModule?: () => void
  customModules?: DraggableNodeItem[]
  onDeleteCustomModule?: (moduleId: string) => void
  onDeleteAllCustomModules?: () => void
  userDatasets?: UserDataset[] // User uploaded datasets
  onRefreshDatasets?: () => void
}

// ============================================================================
// NODE CATEGORIES DATA
// ============================================================================

const nodeCategories: NodeCategory[] = [
  {
    id: 'ai-agents',
    title: 'AI Agents',
    icon: Brain,
    iconColor: 'text-purple-400',
    description: 'Smart nodes that orchestrate and analyze',
    defaultExpanded: true,
    items: [
      { 
        type: 'brainNode', 
        label: 'AI Assistant', 
        icon: Sparkles, 
        color: 'text-indigo-400',
        bgColor: 'bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/30',
        payload: { label: 'AI Assistant', mode: 'general' },
        tooltip: 'General-purpose AI that can handle any task: writing, analysis, coding, creative work, and more!',
        difficulty: 'beginner',
        tags: ['core', 'general', 'versatile']
      },
      { 
        type: 'dataAnalyzerNode', 
        label: 'AI Data Analyst', 
        icon: Sparkles, 
        color: 'text-purple-400',
        bgColor: 'bg-gradient-to-r from-purple-500/10 via-violet-500/10 to-fuchsia-500/10 hover:from-purple-500/20 hover:via-violet-500/20 hover:to-fuchsia-500/20 border-purple-500/30',
        payload: { 
          label: 'AI Data Analyst', 
          analysisType: 'full',
          description: 'AI-powered analysis of entire datasets'
        },
        tooltip: '🤖 AI-powered data analysis! Handles MILLIONS of rows, finds patterns, correlations, anomalies. Connect dataset → AI Data Analyst → AI Assistant for insights.',
        difficulty: 'beginner',
        tags: ['ai', 'big-data', 'statistics', 'ml', 'patterns']
      },
      { 
        type: 'brainNode', 
        label: 'Brain Orchestrator', 
        icon: Brain, 
        color: 'text-pink-400',
        bgColor: 'bg-pink-500/10 hover:bg-pink-500/20 border-pink-500/30',
        payload: { label: 'Orchestrator' },
        tooltip: 'Specialized for neuroscience workflows. Coordinates brain data analysis and generates insights.',
        difficulty: 'intermediate',
        tags: ['neuro', 'orchestration']
      },
    ],
  },
  {
    id: 'reference-datasets',
    title: 'Reference Datasets',
    icon: Library,
    iconColor: 'text-amber-400',
    description: 'Gold-standard brain data for comparison',
    items: [
      { 
        type: 'referenceDatasetNode', 
        label: 'HCP Young Adult', 
        icon: Library, 
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30',
        payload: { 
          label: 'HCP 1200', 
          source: 'hcp', 
          subjectCount: 1200, 
          modality: 'fMRI/dMRI/T1w',
          description: 'Gold standard healthy brain connectivity' 
        },
        tooltip: '1,200 healthy young adults (22-35). Gold standard baseline.',
        difficulty: 'beginner',
        tags: ['healthy', 'baseline', 'fMRI']
      },
      { 
        type: 'referenceDatasetNode', 
        label: 'UCLA Neuropsych', 
        icon: HeartPulse, 
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30',
        payload: { 
          label: 'UCLA Consortium', 
          source: 'ucla', 
          subjectCount: 272, 
          modality: 'fMRI/T1w',
          description: 'ADHD, Schizophrenia, Bipolar phenotypes' 
        },
        tooltip: 'Clinical phenotypes: ADHD, Schizophrenia, Bipolar.',
        difficulty: 'intermediate',
        tags: ['clinical', 'psychiatric']
      },
      { 
        type: 'referenceDatasetNode', 
        label: 'Allen Brain Atlas', 
        icon: Dna, 
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30',
        payload: { 
          label: 'Allen Atlas', 
          source: 'allen', 
          subjectCount: 6, 
          modality: 'Gene Expression',
          description: '204 brain regions + gene expression' 
        },
        tooltip: 'Gene expression map for 204 brain regions.',
        difficulty: 'advanced',
        tags: ['genetics', 'expression']
      },
      { 
        type: 'referenceDatasetNode', 
        label: 'Midnight Scan Club', 
        icon: Users, 
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30',
        payload: { 
          label: 'Midnight Scan Club', 
          source: 'midnight_scan', 
          subjectCount: 10, 
          modality: 'fMRI (deep phenotyping)',
          description: '10 subjects, 5+ hours fMRI each' 
        },
        tooltip: 'Ultra-deep scanning: 10 subjects with 5+ hours each.',
        difficulty: 'advanced',
        tags: ['deep-phenotyping', 'variability']
      },
    ],
  },
  {
    id: 'comparison-agents',
    title: 'Comparison Agents',
    icon: Scale,
    iconColor: 'text-rose-400',
    description: 'Compare and benchmark brain data',
    items: [
      { 
        type: 'comparisonAgentNode', 
        label: 'Z-Score Benchmarker', 
        icon: Scale, 
        color: 'text-rose-400',
        bgColor: 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30',
        payload: { 
          label: 'Z-Score Benchmarker', 
          comparisonType: 'zscore',
          outputFormat: 'report'
        },
        tooltip: 'Calculate standard deviations from normal baseline.',
        difficulty: 'beginner',
        tags: ['statistics', 'clinical']
      },
      { 
        type: 'comparisonAgentNode', 
        label: 'Phenotype Correlator', 
        icon: Scale, 
        color: 'text-rose-400',
        bgColor: 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30',
        payload: { 
          label: 'Phenotype Correlator', 
          comparisonType: 'correlation',
          outputFormat: 'report'
        },
        tooltip: 'Match brain patterns to clinical diagnoses.',
        difficulty: 'intermediate',
        tags: ['diagnosis', 'correlation']
      },
      { 
        type: 'comparisonAgentNode', 
        label: 'Deviation Detector', 
        icon: Scale, 
        color: 'text-rose-400',
        bgColor: 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30',
        payload: { 
          label: 'Deviation Detector', 
          comparisonType: 'deviation',
          threshold: 2,
          outputFormat: 'heatmap'
        },
        tooltip: 'Find regions deviating >2 SD from healthy baseline.',
        difficulty: 'intermediate',
        tags: ['anomaly', 'detection']
      },
    ],
  },
  {
    id: 'brain-regions',
    title: 'Brain Regions',
    icon: Brain,
    iconColor: 'text-violet-400',
    description: 'Target specific brain areas',
    items: [
      { 
        type: 'brainRegionNode', 
        label: 'Region Selector', 
        icon: Brain, 
        color: 'text-violet-400',
        bgColor: 'bg-violet-500/10 hover:bg-violet-500/20 border-violet-500/30',
        payload: { label: 'Select Region...', regionId: null },
        tooltip: 'Choose from 204 brain regions.',
        difficulty: 'beginner',
        tags: ['spatial', 'ROI']
      },
      { 
        type: 'brainRegionNode', 
        label: 'Prefrontal Cortex', 
        icon: Brain, 
        color: 'text-violet-400',
        bgColor: 'bg-violet-500/10 hover:bg-violet-500/20 border-violet-500/30',
        payload: { label: 'Prefrontal Cortex', regionId: 'pfc', abbreviation: 'PFC' },
        tooltip: 'Executive control, decision-making, working memory.',
        difficulty: 'beginner',
        tags: ['frontal', 'executive']
      },
      { 
        type: 'brainRegionNode', 
        label: 'Amygdala', 
        icon: Brain, 
        color: 'text-violet-400',
        bgColor: 'bg-violet-500/10 hover:bg-violet-500/20 border-violet-500/30',
        payload: { label: 'Amygdala', regionId: 'amygdala', abbreviation: 'AMY' },
        tooltip: 'Emotion and fear center. Key for anxiety, PTSD.',
        difficulty: 'beginner',
        tags: ['limbic', 'emotion']
      },
      { 
        type: 'brainRegionNode', 
        label: 'Hippocampus', 
        icon: Brain, 
        color: 'text-violet-400',
        bgColor: 'bg-violet-500/10 hover:bg-violet-500/20 border-violet-500/30',
        payload: { label: 'Hippocampus', regionId: 'hippocampus', abbreviation: 'HIP' },
        tooltip: 'Memory formation hub. Critical for Alzheimer\'s.',
        difficulty: 'beginner',
        tags: ['memory', 'temporal']
      },
    ],
  },
  {
    id: 'data-sources',
    title: 'Data Sources',
    icon: Database,
    iconColor: 'text-emerald-400',
    description: 'Input data from various sources',
    items: [
      { 
        type: 'dataNode', 
        label: 'EEG File (.edf)', 
        icon: FileText, 
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30',
        payload: { label: 'EEG File', subType: 'file' },
        tooltip: 'Upload EEG recordings in .edf format.',
        difficulty: 'beginner',
        tags: ['EEG', 'upload']
      },
      { 
        type: 'dataNode', 
        label: 'Live Stream (LSL)', 
        icon: Radio, 
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30',
        payload: { label: 'Live Stream', subType: 'stream' },
        tooltip: 'Real-time data from Lab Streaming Layer devices.',
        difficulty: 'advanced',
        tags: ['real-time', 'BCI']
      },
      { 
        type: 'dataNode', 
        label: 'BIDS Dataset', 
        icon: Activity, 
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30',
        payload: { label: 'BIDS Dataset', subType: 'bids' },
        tooltip: 'Standard neuroimaging format for organized datasets.',
        difficulty: 'intermediate',
        tags: ['standard', 'organized']
      },
      {
        type: 'newsArticleNode',
        label: 'News Article',
        icon: FileText,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30',
        payload: { label: 'News Article', url: '' },
        tooltip: 'Analyze a news article for bias and content.',
        difficulty: 'beginner',
        tags: ['media', 'analysis']
      },
      {
        type: 'contentUrlInputNode',
        label: 'Content URL',
        icon: Globe,
        color: 'text-pink-400',
        bgColor: 'bg-pink-500/10 hover:bg-pink-500/20 border-pink-500/30',
        payload: { label: 'Content', url: '', platform: 'auto' },
        tooltip: 'Any URL: YouTube, TikTok, Instagram, Reddit, Twitter/X, Vimeo, or web articles.',
        difficulty: 'beginner',
        tags: ['video', 'social', 'youtube', 'tiktok', 'reddit']
      },
    ],
  },
  {
    id: 'preprocessing',
    title: 'Preprocessing',
    icon: Zap,
    iconColor: 'text-yellow-400',
    description: 'Clean and prepare your data',
    items: [
      { 
        type: 'preprocessingNode', 
        label: 'Bandpass Filter', 
        icon: Zap, 
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/30',
        payload: { label: 'Bandpass Filter', category: 'preprocessing' },
        tooltip: 'Keep only frequencies you want (1-40 Hz typical).',
        difficulty: 'beginner',
        tags: ['filter', 'frequency']
      },
      { 
        type: 'preprocessingNode', 
        label: 'ICA Artifact Removal', 
        icon: Zap, 
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/30',
        payload: { label: 'ICA Filter', category: 'preprocessing' },
        tooltip: 'Remove eye blinks and muscle artifacts.',
        difficulty: 'intermediate',
        tags: ['artifact', 'ICA']
      },
    ],
  },
  {
    id: 'analysis',
    title: 'Analysis',
    icon: BarChart3,
    iconColor: 'text-cyan-400',
    description: 'Extract insights from data',
    items: [
      { 
        type: 'analysisNode', 
        label: 'Power Spectral Density', 
        icon: BarChart3, 
        color: 'text-cyan-400',
        bgColor: 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30',
        payload: { label: 'PSD Analysis', category: 'analysis' },
        tooltip: 'Analyze frequency bands (delta, theta, alpha, beta).',
        difficulty: 'intermediate',
        tags: ['frequency', 'spectrum']
      },
      { 
        type: 'analysisNode', 
        label: 'Connectivity Matrix', 
        icon: BarChart3, 
        color: 'text-cyan-400',
        bgColor: 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30',
        payload: { label: 'Connectivity', category: 'analysis' },
        tooltip: 'Map how brain regions communicate.',
        difficulty: 'intermediate',
        tags: ['network', 'connectivity']
      },
    ],
  },
  {
    id: 'machine-learning',
    title: 'Machine Learning',
    icon: Sparkles,
    iconColor: 'text-pink-400',
    description: 'AI-powered pattern recognition',
    items: [
      { 
        type: 'mlNode', 
        label: 'Sleep Staging', 
        icon: Sparkles, 
        color: 'text-pink-400',
        bgColor: 'bg-pink-500/10 hover:bg-pink-500/20 border-pink-500/30',
        payload: { label: 'Sleep Stage ML', category: 'ml_inference' },
        tooltip: 'Auto-detect sleep stages from overnight EEG.',
        difficulty: 'intermediate',
        tags: ['sleep', 'classification']
      },
      { 
        type: 'mlNode', 
        label: 'Custom Model', 
        icon: Cpu, 
        color: 'text-pink-400',
        bgColor: 'bg-pink-500/10 hover:bg-pink-500/20 border-pink-500/30',
        payload: { label: 'Custom ML', category: 'ml_inference' },
        tooltip: 'Upload your own TensorFlow/PyTorch model.',
        difficulty: 'advanced',
        tags: ['custom', 'deep-learning']
      },
    ],
  },
  {
    id: 'output',
    title: 'Output',
    icon: FileOutput,
    iconColor: 'text-orange-400',
    description: 'Export and report results',
    items: [
      { 
        type: 'outputNode', 
        label: 'BIDS Export', 
        icon: FileOutput, 
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/30',
        payload: { label: 'BIDS Export', category: 'output_sink' },
        tooltip: 'Save results in BIDS format for sharing.',
        difficulty: 'beginner',
        tags: ['export', 'standard']
      },
      { 
        type: 'outputNode', 
        label: 'Report Generator', 
        icon: FileOutput, 
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/30',
        payload: { label: 'Report', category: 'output_sink' },
        tooltip: 'Generate PDF/HTML report with findings.',
        difficulty: 'beginner',
        tags: ['report', 'PDF']
      },
    ],
  },
]

// ============================================================================
// NODE DESCRIPTIONS - Detailed info for each node type
// ============================================================================

interface NodeDescription {
  overview: string
  useCases: string[]
  suggestedConnections: {
    label: string
    type: string
    direction: 'input' | 'output'
    reason: string
  }[]
  tips: string[]
}

const nodeDescriptions: Record<string, NodeDescription> = {
  // AI Agents
  'brainNode:general': {
    overview: 'The AI Assistant is your all-purpose intelligent agent. It can analyze data, write reports, answer questions, and perform virtually any task you describe. Think of it as having a smart collaborator who can handle complex reasoning.',
    useCases: [
      'Analyzing uploaded datasets and providing insights',
      'Writing summaries and reports based on workflow results',
      'Answering questions about your data',
      'General-purpose reasoning and problem-solving'
    ],
    suggestedConnections: [
      { label: 'AI Data Analyst', type: 'dataAnalyzerNode', direction: 'input', reason: 'Get statistical insights to inform AI responses' },
      { label: 'Data Source', type: 'dataNode', direction: 'input', reason: 'Provide raw data for analysis' },
      { label: 'Report Generator', type: 'outputNode', direction: 'output', reason: 'Export AI insights as formatted report' }
    ],
    tips: [
      'Double-click to customize the AI\'s behavior and instructions',
      'Connect multiple data sources for comprehensive analysis',
      'Use clear, specific prompts for best results'
    ]
  },
  'brainNode:orchestrator': {
    overview: 'The Brain Orchestrator is specialized for neuroscience workflows. It understands brain regions, neuroimaging data formats, and can coordinate complex multi-step brain data analysis pipelines.',
    useCases: [
      'Coordinating analysis of fMRI/EEG data',
      'Comparing brain regions across subjects',
      'Generating neuroscience-focused insights',
      'Orchestrating multi-modal brain data pipelines'
    ],
    suggestedConnections: [
      { label: 'Brain Region', type: 'brainRegionNode', direction: 'input', reason: 'Specify which brain regions to analyze' },
      { label: 'Reference Dataset', type: 'referenceDatasetNode', direction: 'input', reason: 'Compare against healthy baselines' },
      { label: 'EEG/fMRI File', type: 'dataNode', direction: 'input', reason: 'Provide neuroimaging data' },
      { label: 'Report Generator', type: 'outputNode', direction: 'output', reason: 'Export findings as clinical report' }
    ],
    tips: [
      'Connect brain regions before data sources for targeted analysis',
      'Use reference datasets for comparative analysis',
      'Great for clinical and research neuroscience workflows'
    ]
  },
  'dataAnalyzerNode': {
    overview: 'The AI Data Analyst uses Gemini AI to deeply analyze your datasets. It can handle millions of rows, find hidden patterns, detect anomalies, and generate intelligent insights about data quality, correlations, and suggested questions.',
    useCases: [
      'Statistical analysis of large CSV/TSV datasets',
      'Finding correlations between columns',
      'Detecting anomalies and outliers',
      'Assessing data quality scores',
      'Generating questions to explore the data'
    ],
    suggestedConnections: [
      { label: 'Your Dataset', type: 'dataNode', direction: 'input', reason: 'Provide the data to analyze' },
      { label: 'AI Assistant', type: 'brainNode', direction: 'output', reason: 'Get deeper insights based on statistics' },
      { label: 'Report Generator', type: 'outputNode', direction: 'output', reason: 'Export analysis results' }
    ],
    tips: [
      'Connect dataset BEFORE running the workflow',
      'Hover over the node after running to see AI insights',
      'Works best with CSV/TSV tabular data',
      'Data quality score helps identify data issues'
    ]
  },
  // Reference Datasets
  'referenceDatasetNode:hcp': {
    overview: 'The Human Connectome Project (HCP) Young Adult dataset contains high-quality neuroimaging data from 1,200 healthy adults aged 22-35. It\'s the gold standard for healthy brain baseline comparisons.',
    useCases: [
      'Establishing healthy brain baselines',
      'Comparing patient data against norms',
      'Research into typical brain connectivity',
      'Validating analysis pipelines'
    ],
    suggestedConnections: [
      { label: 'Brain Orchestrator', type: 'brainNode', direction: 'output', reason: 'Compare your data against HCP norms' },
      { label: 'Comparison Agent', type: 'comparisonAgentNode', direction: 'output', reason: 'Detect deviations from healthy baseline' },
      { label: 'Brain Region', type: 'brainRegionNode', direction: 'input', reason: 'Focus comparison on specific regions' }
    ],
    tips: [
      'Best used as a reference for clinical comparisons',
      'Combine with brain regions for targeted analysis',
      'High-quality fMRI and diffusion MRI data available'
    ]
  },
  // Data Sources
  'dataNode:file': {
    overview: 'The Data Source node allows you to upload or connect various data files to your workflow. It supports EEG files (.edf), neuroimaging data, CSV/TSV spreadsheets, and more.',
    useCases: [
      'Uploading patient EEG recordings',
      'Loading CSV data for analysis',
      'Connecting to neuroimaging files',
      'Importing external datasets'
    ],
    suggestedConnections: [
      { label: 'AI Data Analyst', type: 'dataAnalyzerNode', direction: 'output', reason: 'Get AI-powered statistical analysis' },
      { label: 'AI Assistant', type: 'brainNode', direction: 'output', reason: 'Ask questions about your data' },
      { label: 'Preprocessing', type: 'preprocessingNode', direction: 'output', reason: 'Clean and prepare data first' }
    ],
    tips: [
      'Drag and drop files directly onto the node',
      'Supports CSV, TSV, EDF, NIfTI, and more',
      'Use AI Data Analyst for large tabular datasets'
    ]
  },
  // Brain Regions
  'brainRegionNode': {
    overview: 'Brain Region nodes let you target specific areas of the brain for analysis. Choose from 204 anatomical regions or select commonly studied areas like Prefrontal Cortex, Amygdala, or Hippocampus.',
    useCases: [
      'Focusing analysis on specific brain structures',
      'Comparing activity across regions',
      'Clinical assessments of targeted areas',
      'Research into specific neural circuits'
    ],
    suggestedConnections: [
      { label: 'Brain Orchestrator', type: 'brainNode', direction: 'output', reason: 'Analyze the selected region' },
      { label: 'Reference Dataset', type: 'referenceDatasetNode', direction: 'input', reason: 'Compare region against norms' },
      { label: 'Comparison Agent', type: 'comparisonAgentNode', direction: 'output', reason: 'Detect regional abnormalities' }
    ],
    tips: [
      'Connect before data sources for region-specific analysis',
      'Multiple regions can be connected for comparative studies',
      'Each region includes metadata about function and disorders'
    ]
  },
  // Comparison Agents
  'comparisonAgentNode': {
    overview: 'Comparison Agents help you find differences between your data and reference baselines. They can correlate brain patterns with diagnoses or detect significant deviations from healthy norms.',
    useCases: [
      'Clinical diagnosis support',
      'Detecting abnormal brain patterns',
      'Research group comparisons',
      'Quality control against baselines'
    ],
    suggestedConnections: [
      { label: 'Reference Dataset', type: 'referenceDatasetNode', direction: 'input', reason: 'Baseline to compare against' },
      { label: 'Your Data Source', type: 'dataNode', direction: 'input', reason: 'Data to be compared' },
      { label: 'Brain Region', type: 'brainRegionNode', direction: 'input', reason: 'Focus comparison on specific areas' },
      { label: 'Report Generator', type: 'outputNode', direction: 'output', reason: 'Export comparison findings' }
    ],
    tips: [
      'Connect both a reference and your data for comparison',
      'Deviation detector flags regions >2 SD from baseline',
      'Useful for clinical decision support'
    ]
  },
  // Output
  'outputNode': {
    overview: 'Output nodes collect and format the results from your workflow. They can generate reports in various formats (PDF, HTML, BIDS) and serve as the endpoint for your analysis pipeline.',
    useCases: [
      'Generating shareable reports',
      'Exporting results in standard formats',
      'Creating clinical documentation',
      'Saving analysis for later review'
    ],
    suggestedConnections: [
      { label: 'AI Assistant', type: 'brainNode', direction: 'input', reason: 'Receive AI-generated insights' },
      { label: 'AI Data Analyst', type: 'dataAnalyzerNode', direction: 'input', reason: 'Include statistical analysis' },
      { label: 'Comparison Agent', type: 'comparisonAgentNode', direction: 'input', reason: 'Include comparison results' }
    ],
    tips: [
      'Double-click after workflow runs to see results',
      'Reports are auto-saved to the Reports page',
      'Connect multiple inputs for comprehensive reports'
    ]
  },
  // Preprocessing
  'preprocessingNode': {
    overview: 'Preprocessing nodes clean and prepare your data before analysis. They can filter noise, normalize signals, segment data, and apply various transformations to improve data quality.',
    useCases: [
      'Removing noise from EEG signals',
      'Normalizing data across subjects',
      'Segmenting time series data',
      'Artifact rejection'
    ],
    suggestedConnections: [
      { label: 'Data Source', type: 'dataNode', direction: 'input', reason: 'Raw data to be preprocessed' },
      { label: 'AI Assistant', type: 'brainNode', direction: 'output', reason: 'Analyze cleaned data' },
      { label: 'AI Data Analyst', type: 'dataAnalyzerNode', direction: 'output', reason: 'Statistics on clean data' }
    ],
    tips: [
      'Apply preprocessing before analysis for best results',
      'Choose filter types based on your data type',
      'Bandpass filters are common for EEG data'
    ]
  },
  // ML/Compute
  'mlNode': {
    overview: 'Machine Learning nodes apply trained models to your data. They can classify patterns, predict outcomes, or extract features using pre-trained or custom deep learning models.',
    useCases: [
      'Classifying brain states',
      'Predicting clinical outcomes',
      'Feature extraction',
      'Pattern recognition in signals'
    ],
    suggestedConnections: [
      { label: 'Preprocessed Data', type: 'preprocessingNode', direction: 'input', reason: 'Clean data improves model accuracy' },
      { label: 'Data Source', type: 'dataNode', direction: 'input', reason: 'Raw data for inference' },
      { label: 'Output Node', type: 'outputNode', direction: 'output', reason: 'Export predictions' }
    ],
    tips: [
      'Preprocess data before ML for better results',
      'EEGNet works well for EEG classification',
      'Custom models need TensorFlow/PyTorch format'
    ]
  },
  'computeNode': {
    overview: 'Compute nodes provide cloud or local processing power for heavy computations. They can offload intensive tasks to scalable infrastructure.',
    useCases: [
      'Heavy computational workloads',
      'Batch processing large datasets',
      'Running complex algorithms',
      'Parallel processing'
    ],
    suggestedConnections: [
      { label: 'Data Source', type: 'dataNode', direction: 'input', reason: 'Data to process' },
      { label: 'ML Node', type: 'mlNode', direction: 'output', reason: 'Feed processed data to models' },
      { label: 'Output Node', type: 'outputNode', direction: 'output', reason: 'Export computed results' }
    ],
    tips: [
      'Use for computationally intensive tasks',
      'Monitor progress in the workflow canvas',
      'Cloud compute scales with your needs'
    ]
  }
}

// Helper to get node description
function getNodeDescription(item: DraggableNodeItem): NodeDescription | null {
  // Check for specific type+mode combinations first
  if (item.type === 'brainNode') {
    const mode = (item.payload?.mode as string) || 'orchestrator'
    const key = `brainNode:${mode}`
    if (nodeDescriptions[key]) return nodeDescriptions[key]
  }
  
  // Check for type+subType combinations
  if (item.type === 'dataNode') {
    const subType = (item.payload?.subType as string) || 'file'
    const key = `dataNode:${subType}`
    if (nodeDescriptions[key]) return nodeDescriptions[key]
  }
  
  if (item.type === 'referenceDatasetNode') {
    const source = (item.payload?.source as string) || 'hcp'
    const key = `referenceDatasetNode:${source}`
    if (nodeDescriptions[key]) return nodeDescriptions[key]
  }
  
  // Fall back to base type
  return nodeDescriptions[item.type] || null
}

// ============================================================================
// DIFFICULTY BADGE COMPONENT
// ============================================================================

function DifficultyBadge({ level }: { level: 'beginner' | 'intermediate' | 'advanced' }) {
  const config = {
    beginner: { label: 'Easy', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
    intermediate: { label: 'Medium', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    advanced: { label: 'Pro', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  }
  const { label, color } = config[level]
  
  return (
    <span className={cn('text-[9px] px-1.5 py-0.5 rounded border font-medium', color)}>
      {label}
    </span>
  )
}

// ============================================================================
// DRAGGABLE NODE ITEM COMPONENT
// ============================================================================

function DraggableNodeItem({ 
  item, 
  isCompact, 
  onDelete,
  onItemClick
}: { 
  item: DraggableNodeItem; 
  isCompact?: boolean;
  onDelete?: (moduleId: string) => void;
  onItemClick?: (item: DraggableNodeItem) => void;
}) {
  const [isHovered, setIsHovered] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  const onDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData('application/reactflow', item.type)
    event.dataTransfer.setData('application/payload', JSON.stringify(item.payload))
    event.dataTransfer.effectAllowed = 'move'
  }

  const handleClick = (e: React.MouseEvent) => {
    // Only trigger click if not dragging
    if (onItemClick && !showDeleteConfirm) {
      onItemClick(item)
    }
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (item.id && onDelete) {
      onDelete(item.id)
    }
    setShowDeleteConfirm(false)
  }

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setShowDeleteConfirm(false)
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setShowDeleteConfirm(false); }}
    >
      <div
        className={cn(
          'flex items-center gap-2 p-2 border rounded-lg cursor-grab active:cursor-grabbing',
          'transition-all duration-200 group hover:scale-[1.02] active:scale-[0.98]',
          item.bgColor,
          item.isCustom && 'ring-1 ring-indigo-500/30'
        )}
        draggable
        onDragStart={onDragStart}
        onClick={handleClick}
      >
        <GripVertical className="w-3 h-3 text-slate-500 group-hover:text-slate-400 flex-shrink-0" />
        <item.icon className={cn('w-4 h-4 flex-shrink-0', item.color)} />
        <span className="text-xs font-medium text-slate-300 group-hover:text-slate-100 truncate flex-1">
          {item.label}
        </span>
        {item.difficulty && !isCompact && (
          <DifficultyBadge level={item.difficulty} />
        )}
        {item.isCustom && (
          <>
            <Star className="w-3 h-3 text-indigo-400 flex-shrink-0" fill="currentColor" />
            {/* Delete button appears on hover for custom items */}
            {isHovered && onDelete && !showDeleteConfirm && (
              <button
                onClick={handleDeleteClick}
                className="p-0.5 hover:bg-red-500/20 rounded transition-colors"
                title="Delete custom node"
              >
                <Trash2 className="w-3 h-3 text-red-400 hover:text-red-300" />
              </button>
            )}
            {/* Delete confirmation */}
            {showDeleteConfirm && (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleConfirmDelete}
                  className="px-1.5 py-0.5 text-[9px] bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={handleCancelDelete}
                  className="px-1.5 py-0.5 text-[9px] bg-slate-700 hover:bg-slate-600 text-slate-400 rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Tooltip on hover */}
      <AnimatePresence>
        {isHovered && !showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="absolute left-full top-0 ml-2 z-50 w-64 p-3 bg-slate-800 border border-slate-700 rounded-lg shadow-xl"
          >
            <div className="flex items-start gap-2 mb-2">
              <item.icon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', item.color)} />
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-white">{item.label}</p>
                {item.isCustom && (
                  <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 rounded border border-indigo-500/30">
                    <Star className="w-2.5 h-2.5" fill="currentColor" />
                    AI Generated
                  </span>
                )}
                {item.difficulty && <DifficultyBadge level={item.difficulty} />}
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{item.tooltip}</p>
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {item.tags.map(tag => (
                  <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-slate-700 text-slate-400 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// COLLAPSIBLE CATEGORY COMPONENT
// ============================================================================

function CategorySection({ category, isExpanded, onToggle, searchQuery, showDataActions, onRefreshDatasets, userDatasetCount, onItemClick }: {
  category: NodeCategory
  isExpanded: boolean
  onToggle: () => void
  searchQuery: string
  showDataActions?: boolean
  onRefreshDatasets?: () => void
  userDatasetCount?: number
  onItemClick?: (item: DraggableNodeItem) => void
}) {
  const filteredItems = useMemo(() => {
    if (!searchQuery) return category.items
    const q = searchQuery.toLowerCase()
    return category.items.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.tooltip.toLowerCase().includes(q) ||
      item.tags?.some(tag => tag.toLowerCase().includes(q))
    )
  }, [category.items, searchQuery])

  if (searchQuery && filteredItems.length === 0) return null

  return (
    <div className="mb-1 relative">
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-2 p-2 hover:bg-slate-800/50 rounded-lg transition-colors group",
          showDataActions ? "pr-20" : ""
        )}
      >
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
        )}
        <category.icon className={cn('w-4 h-4', category.iconColor)} />
        <span className="text-xs font-semibold text-slate-300 flex-1 text-left">
          {category.title}
          {showDataActions && userDatasetCount && userDatasetCount > 0 && (
            <span className="ml-1 text-blue-400">+{userDatasetCount}</span>
          )}
        </span>
        <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
          {filteredItems.length}
        </span>
      </button>
      
      {/* Data actions for data-sources category */}
      {showDataActions && (
        <div className="absolute right-2 top-2 flex items-center gap-1 z-10">
          {onRefreshDatasets && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRefreshDatasets();
              }}
              className="p-1.5 rounded-md text-blue-400 hover:bg-blue-500/20 transition-all"
              title="Refresh datasets"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
          <a
            href="/dashboard/data-sources"
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded-md text-slate-400 hover:text-blue-400 hover:bg-blue-500/20 transition-all"
            title="Manage your data"
          >
            <Upload className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
      
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pl-3 pr-1 py-1 space-y-1">
              {filteredItems.map((item) => (
                <DraggableNodeItem key={`${item.type}-${item.label}`} item={item} onItemClick={onItemClick} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// MAIN NODE PALETTE COMPONENT
// ============================================================================

export default function NodePalette({ 
  onCreateModule, 
  customModules = [], 
  onDeleteCustomModule, 
  onDeleteAllCustomModules,
  userDatasets = [],
  onRefreshDatasets
}: NodePaletteProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set([...nodeCategories.filter(c => c.defaultExpanded).map(c => c.id), 'custom', 'data-sources']) // Always expand custom and data-sources (for user uploads)
  )
  const [filterLevel, setFilterLevel] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  
  // Node description modal state
  const [selectedNode, setSelectedNode] = useState<DraggableNodeItem | null>(null)
  const [showNodeDescriptionModal, setShowNodeDescriptionModal] = useState(false)
  
  // Handle node item click - show description modal
  const handleNodeItemClick = useCallback((item: DraggableNodeItem) => {
    setSelectedNode(item)
    setShowNodeDescriptionModal(true)
  }, [])
  
  // Resizable and collapsible state
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nodePaletteCollapsed') === 'true'
    }
    return false
  })
  const [width, setWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nodePaletteWidth')
      return saved ? parseInt(saved, 10) : 288 // Default w-72 = 288px
    }
    return 288
  })
  const [isResizing, setIsResizing] = useState(false)
  const resizeRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  // Persist preferences
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nodePaletteCollapsed', String(isCollapsed))
    }
  }, [isCollapsed])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nodePaletteWidth', String(width))
    }
  }, [width])

  // Handle resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    startXRef.current = e.clientX
    startWidthRef.current = width
  }, [width])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      const delta = e.clientX - startXRef.current
      const newWidth = Math.min(Math.max(startWidthRef.current + delta, 200), 500) // Min 200px, Max 500px
      setWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing])

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }

  const expandAll = () => {
    setExpandedCategories(new Set([...nodeCategories.map(c => c.id), 'custom']))
  }

  const collapseAll = () => {
    setExpandedCategories(new Set())
  }

  // Filter custom modules by search query
  const filteredCustomModules = useMemo(() => {
    if (!searchQuery) return customModules
    const q = searchQuery.toLowerCase()
    return customModules.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.tooltip.toLowerCase().includes(q) ||
      item.tags?.some(tag => tag.toLowerCase().includes(q))
    )
  }, [customModules, searchQuery])

  // Convert user datasets to draggable node items
  const userDatasetItems: DraggableNodeItem[] = useMemo(() => {
    return userDatasets.map(dataset => ({
      type: 'dataNode',
      label: dataset.name,
      icon: dataset.file_type === 'csv' ? FileSpreadsheet : Table2,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30',
      payload: {
        label: dataset.name,
        isUserDataset: true,
        datasetId: dataset.id,
        fileName: dataset.file_name,
        fileType: dataset.file_type,
        fileSize: dataset.file_size_bytes,
        rowCount: dataset.row_count,
        columns: dataset.columns,
        source: 'user-upload',
      },
      tooltip: `Your uploaded file: ${dataset.file_name} (${dataset.row_count?.toLocaleString() || '?'} rows, ${dataset.columns?.length || '?'} columns)`,
      difficulty: 'beginner' as const,
      tags: ['user', 'upload', 'custom'],
      isUserData: true,
      id: `user-dataset-${dataset.id}`, // Unique ID for React keys
    }))
  }, [userDatasets])

  // Filter categories by difficulty level AND inject user datasets into data-sources
  const filteredCategories = useMemo(() => {
    let categories = nodeCategories.map(category => {
      // Inject user datasets at the top of data-sources category
      if (category.id === 'data-sources' && userDatasetItems.length > 0) {
        return {
          ...category,
          items: [...userDatasetItems, ...category.items]
        }
      }
      return category
    })
    
    if (filterLevel !== 'all') {
      categories = categories.map(category => ({
        ...category,
        items: category.items.filter(item => item.difficulty === filterLevel)
      })).filter(category => category.items.length > 0)
    }
    
    return categories
  }, [filterLevel, userDatasetItems])

  // Count all nodes including marketplace + custom
  const marketplaceNodes = nodeCategories.reduce((sum, cat) => sum + cat.items.length, 0)
  const totalNodes = marketplaceNodes + customModules.length

  // Collapsed state - show minimal sidebar
  if (isCollapsed) {
    return (
      <aside className={cn(
        "w-12 backdrop-blur-sm border-r flex flex-col h-full items-center py-4",
        isDark ? "bg-card/95 border-border" : "bg-white/95 border-slate-200"
      )}>
        <button
          onClick={() => setIsCollapsed(false)}
          className={cn(
            "p-2 rounded-lg transition-colors",
            isDark ? "hover:bg-muted text-muted-foreground hover:text-foreground" : "hover:bg-slate-100 text-slate-500 hover:text-slate-700"
          )}
          title="Expand Node Palette"
        >
          <PanelLeft className="w-5 h-5" />
        </button>
        <div className="mt-4 flex flex-col gap-2">
          <div className={cn(
            "p-2 rounded-lg",
            isDark ? "bg-purple-500/20" : "bg-purple-100"
          )} title="AI Agents">
            <Brain className="w-4 h-4 text-purple-400" />
          </div>
          <div className={cn(
            "p-2 rounded-lg",
            isDark ? "bg-cyan-500/20" : "bg-cyan-100"
          )} title="Reference Datasets">
            <Database className="w-4 h-4 text-cyan-400" />
          </div>
          <div className={cn(
            "p-2 rounded-lg",
            isDark ? "bg-emerald-500/20" : "bg-emerald-100"
          )} title="Data Sources">
            <FileText className="w-4 h-4 text-emerald-400" />
          </div>
        </div>
      </aside>
    )
  }

  return (
    <aside 
      className={cn(
        "backdrop-blur-sm border-r flex flex-col h-full relative",
        isDark ? "bg-card/95 border-border" : "bg-white/95 border-slate-200"
      )}
      style={{ width: `${width}px` }}
    >
      {/* Resize handle */}
      <div
        ref={resizeRef}
        onMouseDown={handleMouseDown}
        className={cn(
          "absolute top-0 right-0 w-1 h-full cursor-col-resize z-10 transition-colors",
          isResizing 
            ? "bg-primary" 
            : isDark 
              ? "hover:bg-primary/50" 
              : "hover:bg-primary/30"
        )}
      />
      
      {/* Header */}
      <div className={cn(
        "p-4 border-b",
        isDark ? "border-border" : "border-slate-200"
      )}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Node Palette</h2>
          </div>
          <div className="flex items-center gap-1">
            <span className={cn(
              "text-[10px] px-2 py-1 rounded-full",
              isDark ? "text-muted-foreground bg-muted" : "text-slate-500 bg-slate-100"
            )}>
              {totalNodes} nodes
            </span>
            <button
              onClick={() => setIsCollapsed(true)}
              className={cn(
                "p-1 rounded transition-colors",
                isDark ? "hover:bg-muted text-muted-foreground hover:text-foreground" : "hover:bg-slate-100 text-slate-500 hover:text-slate-700"
              )}
              title="Collapse Node Palette"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "w-full pl-9 pr-8 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary",
              isDark 
                ? "bg-muted border-border text-foreground placeholder:text-muted-foreground"
                : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
            )}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter & Expand Controls */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors',
                showFilters ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-slate-300'
              )}
            >
              <Filter className="w-3 h-3" />
              Filter
            </button>
          </div>
          <div className="flex items-center gap-1 text-[10px]">
            <button onClick={expandAll} className="text-muted-foreground hover:text-foreground px-1">
              Expand All
            </button>
            <span className="text-muted-foreground/50">|</span>
            <button onClick={collapseAll} className="text-muted-foreground hover:text-foreground px-1">
              Collapse
            </button>
          </div>
        </div>

        {/* Difficulty Filter Pills */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex gap-1 mt-3">
                {(['all', 'beginner', 'intermediate', 'advanced'] as const).map(level => (
                  <button
                    key={level}
                    onClick={() => setFilterLevel(level)}
                    className={cn(
                      'px-2 py-1 text-[10px] rounded-full border transition-colors capitalize',
                      filterLevel === level
                        ? 'bg-primary/20 border-primary/50 text-primary'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {level === 'all' ? 'All Levels' : level}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Scrollable Categories */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* Marketplace Categories (User datasets are injected into data-sources) */}
        {filteredCategories.map((category) => (
          <CategorySection
            key={category.id}
            category={category}
            isExpanded={expandedCategories.has(category.id)}
            onToggle={() => toggleCategory(category.id)}
            searchQuery={searchQuery}
            // Show refresh button and upload link for data-sources category
            showDataActions={category.id === 'data-sources'}
            onRefreshDatasets={onRefreshDatasets}
            userDatasetCount={userDatasets.length}
            onItemClick={handleNodeItemClick}
          />
        ))}

        {/* CUSTOM SECTION - AI Generated Nodes (at bottom) */}
        {(customModules.length > 0 || onCreateModule) && (
          <div className="mb-1 relative">
            <button
              onClick={() => toggleCategory('custom')}
              className={cn(
                "w-full flex items-center gap-2 p-2 pr-20 rounded-lg transition-colors group",
                isDark ? "hover:bg-muted/50" : "hover:bg-slate-100"
              )}
            >
              {expandedCategories.has('custom') ? (
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              )}
              <Star className="w-4 h-4 text-primary" fill="currentColor" />
              <span className="text-xs font-semibold text-primary flex-1 text-left">
                Custom
              </span>
              <span className="text-[10px] text-primary bg-primary/20 px-1.5 py-0.5 rounded border border-primary/30">
                {filteredCustomModules.length}
              </span>
            </button>
            {/* Action buttons - separate from toggle button */}
            <div className="absolute right-2 top-2 flex items-center gap-1 z-10">
              {customModules.length > 0 && onDeleteAllCustomModules && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowBulkDeleteConfirm(true); }}
                  className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors"
                  title="Delete all custom nodes"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              )}
              {onCreateModule && (
                <button
                  onClick={(e) => { e.stopPropagation(); onCreateModule(); }}
                  className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] bg-primary/20 hover:bg-primary/30 text-primary rounded transition-colors"
                  title="Create new custom module"
                >
                  <Plus className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
            
            {/* Bulk Delete Confirmation */}
            {showBulkDeleteConfirm && (
              <div className={cn(
                "mt-2 p-3 rounded-lg border",
                isDark ? "bg-red-950/50 border-red-500/30" : "bg-red-50 border-red-200"
              )}>
                <p className={cn(
                  "text-xs mb-2",
                  isDark ? "text-red-300" : "text-red-700"
                )}>
                  Delete all {customModules.length} custom nodes?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      onDeleteAllCustomModules?.()
                      setShowBulkDeleteConfirm(false)
                    }}
                    className="flex-1 px-2 py-1 text-[10px] font-medium bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                  >
                    Delete All
                  </button>
                  <button
                    onClick={() => setShowBulkDeleteConfirm(false)}
                    className={cn(
                      "flex-1 px-2 py-1 text-[10px] font-medium rounded transition-colors border",
                      isDark 
                        ? "border-slate-600 text-slate-300 hover:bg-slate-700" 
                        : "border-slate-300 text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
            <AnimatePresence initial={false}>
              {expandedCategories.has('custom') && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="pl-3 pr-1 py-1 space-y-1">
                    {filteredCustomModules.length > 0 ? (
                      filteredCustomModules.map((module) => (
                        <DraggableNodeItem 
                          key={module.id || module.label} 
                          item={module} 
                          isCompact 
                          onDelete={onDeleteCustomModule}
                          onItemClick={handleNodeItemClick}
                        />
                      ))
                    ) : customModules.length === 0 ? (
                      <div className="text-center py-3">
                        <p className="text-[10px] text-slate-500 mb-2">
                          No custom nodes yet
                        </p>
                        <p className="text-[9px] text-slate-600">
                          Use the AI Wizard to generate nodes, or save a workflow to create custom nodes.
                        </p>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-500 text-center py-2">
                        No matches found
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={cn(
        "p-3 border-t",
        isDark ? "border-border bg-card/50" : "border-slate-200 bg-slate-50"
      )}>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          
          {customModules.length > 0 && (
            <div className="flex items-center gap-1 text-primary">
              <Star className="w-2.5 h-2.5" fill="currentColor" />
              <span>{customModules.length} custom</span>
            </div>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          Drag nodes onto the canvas to build your workflow
        </p>
      </div>
      
      {/* Node Description Modal */}
      <AnimatePresence>
        {showNodeDescriptionModal && selectedNode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowNodeDescriptionModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={cn(
                "relative w-full max-w-lg mx-4 p-6 rounded-2xl shadow-2xl border max-h-[85vh] overflow-y-auto",
                isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setShowNodeDescriptionModal(false)}
                className={cn(
                  "absolute top-4 right-4 p-1.5 rounded-lg transition-colors",
                  isDark ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500"
                )}
              >
                <X className="w-5 h-5" />
              </button>
              
              {/* Header */}
              <div className="flex items-start gap-3 mb-4">
                <div className={cn("p-2.5 rounded-xl", selectedNode.bgColor)}>
                  <selectedNode.icon className={cn("w-6 h-6", selectedNode.color)} />
                </div>
                <div className="flex-1">
                  <h2 className={cn(
                    "text-xl font-bold",
                    isDark ? "text-white" : "text-slate-900"
                  )}>
                    {selectedNode.label}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    {selectedNode.difficulty && <DifficultyBadge level={selectedNode.difficulty} />}
                    {selectedNode.tags && selectedNode.tags.slice(0, 3).map(tag => (
                      <span key={tag} className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded",
                        isDark ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-600"
                      )}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Description Content */}
              {(() => {
                const description = getNodeDescription(selectedNode)
                if (!description) {
                  return (
                    <div className={cn(
                      "p-4 rounded-lg text-sm",
                      isDark ? "bg-slate-800/50 text-slate-300" : "bg-slate-50 text-slate-600"
                    )}>
                      <p>{selectedNode.tooltip}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        Drag this node onto the canvas to use it in your workflow.
                      </p>
                    </div>
                  )
                }
                
                return (
                  <div className="space-y-4">
                    {/* Overview */}
                    <div>
                      <h3 className={cn(
                        "text-sm font-semibold mb-2 flex items-center gap-2",
                        isDark ? "text-slate-200" : "text-slate-800"
                      )}>
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        Overview
                      </h3>
                      <p className={cn(
                        "text-sm leading-relaxed",
                        isDark ? "text-slate-400" : "text-slate-600"
                      )}>
                        {description.overview}
                      </p>
                    </div>
                    
                    {/* Use Cases */}
                    <div>
                      <h3 className={cn(
                        "text-sm font-semibold mb-2 flex items-center gap-2",
                        isDark ? "text-slate-200" : "text-slate-800"
                      )}>
                        <Layers className="w-4 h-4 text-blue-400" />
                        Use Cases
                      </h3>
                      <ul className="space-y-1.5">
                        {description.useCases.map((useCase, i) => (
                          <li key={i} className={cn(
                            "flex items-start gap-2 text-sm",
                            isDark ? "text-slate-400" : "text-slate-600"
                          )}>
                            <span className="text-green-400 mt-1">•</span>
                            {useCase}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    {/* Suggested Connections */}
                    <div>
                      <h3 className={cn(
                        "text-sm font-semibold mb-2 flex items-center gap-2",
                        isDark ? "text-slate-200" : "text-slate-800"
                      )}>
                        <Zap className="w-4 h-4 text-yellow-400" />
                        Suggested Connections
                      </h3>
                      <div className="space-y-2">
                        {description.suggestedConnections.map((conn, i) => (
                          <div key={i} className={cn(
                            "flex items-center gap-3 p-2.5 rounded-lg border",
                            isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"
                          )}>
                            <div className={cn(
                              "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold",
                              conn.direction === 'input' 
                                ? "bg-emerald-500/20 text-emerald-400" 
                                : "bg-orange-500/20 text-orange-400"
                            )}>
                              {conn.direction === 'input' ? '←' : '→'}
                            </div>
                            <div className="flex-1">
                              <p className={cn(
                                "text-sm font-medium",
                                isDark ? "text-slate-200" : "text-slate-800"
                              )}>
                                {conn.label}
                              </p>
                              <p className={cn(
                                "text-xs",
                                isDark ? "text-slate-500" : "text-slate-500"
                              )}>
                                {conn.reason}
                              </p>
                            </div>
                            <span className={cn(
                              "text-[9px] px-1.5 py-0.5 rounded",
                              conn.direction === 'input' 
                                ? "bg-emerald-500/10 text-emerald-400" 
                                : "bg-orange-500/10 text-orange-400"
                            )}>
                              {conn.direction}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Tips */}
                    <div>
                      <h3 className={cn(
                        "text-sm font-semibold mb-2 flex items-center gap-2",
                        isDark ? "text-slate-200" : "text-slate-800"
                      )}>
                        <Star className="w-4 h-4 text-amber-400" />
                        Pro Tips
                      </h3>
                      <ul className="space-y-1.5">
                        {description.tips.map((tip, i) => (
                          <li key={i} className={cn(
                            "flex items-start gap-2 text-sm",
                            isDark ? "text-slate-400" : "text-slate-600"
                          )}>
                            <span className="text-amber-400 mt-0.5">💡</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )
              })()}
              
              {/* Footer */}
              <div className={cn(
                "mt-6 pt-4 border-t flex items-center justify-between",
                isDark ? "border-slate-700" : "border-slate-200"
              )}>
                <p className={cn(
                  "text-xs",
                  isDark ? "text-slate-500" : "text-slate-400"
                )}>
                  💡 Drag this node onto the canvas to use it
                </p>
                <button
                  onClick={() => setShowNodeDescriptionModal(false)}
                  className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  )
}
