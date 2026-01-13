'use client'

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  Connection,
  Edge,
  Node,
  useReactFlow,
  Panel,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import { 
  Save, 
  Play, 
  Pause, 
  RotateCcw,
  Settings,
  Share2,
  Download,
  Upload,
  ChevronLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  Wand2,
  Sparkles,
  MessageSquareText,
  Trash2,
  FileJson,
  FileSpreadsheet,
  Copy,
  Check,
  ChevronDown,
  Menu,
  X,
  Brain,
  Database,
  Zap,
  BarChart3,
  FileOutput,
  Code2,
  FileText
} from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import NodePalette from '@/components/workflow/node-palette'
import CreateModuleModal, { CustomModuleDefinition } from '@/components/workflow/create-module-modal'
import AnalysisResultsRenderer from '@/components/workflow/analysis-results-renderer'
import { nodeTypes } from '@/components/workflow/custom-nodes'
import BrainModal, { BrainInstructions } from '@/components/workflow/brain-modal'
import WorkflowWizard from '@/components/workflow/workflow-wizard'
import WorkflowExplanationRenderer from '@/components/workflow/workflow-explanation-renderer'
import UpgradeModal from '@/components/upgrade-modal'
import { cn } from '@/lib/utils'
import { getTemplateById } from '@/lib/workflow-templates';
import { exportAsCSV, exportAsJSON, exportAsExcel, copyToClipboard } from '@/lib/export-utils'

// Custom edge styles
const edgeOptions = {
  style: { strokeWidth: 2, stroke: '#6366f1' },
  type: 'smoothstep',
  animated: true,
}

const connectionLineStyle = {
  strokeWidth: 2,
  stroke: '#6366f1',
}

// Initial nodes - start with empty canvas for new workflows
const initialNodes: Node[] = []

const initialEdges: Edge[] = []

function buildPrewiredEdges(nodes: Node[]): Edge[] {
  // If a template doesn't provide edges (or provides an empty list),
  // generate a reasonable set of connections so the canvas is immediately usable.
  if (!nodes || nodes.length === 0) return []

  const byId = new Map(nodes.map((n) => [n.id, n]))
  const hasType = (id: string, type: string) => byId.get(id)?.type === type
  const labelOf = (n: Node) => String((n.data as any)?.label || '').toLowerCase()

  const mk = (source: string, target: string, idx: number): Edge => ({
    id: `e-autowire-${Date.now()}-${idx}`,
    source,
    target,
    ...edgeOptions,
  })

  // 1) Prefer an explicit EEG pipeline graph if we recognize it by node ids.
  // This matches the Marketplace "Standard EEG Preprocessing Pipeline" / eeg-cleaning-pipeline.
  const looksLikeEEGPipeline =
    byId.has('eeg-input') &&
    byId.has('bandpass') &&
    byId.has('notch') &&
    byId.has('ica') &&
    byId.has('rereference') &&
    byId.has('output-clean')

  if (looksLikeEEGPipeline) {
    const edges: Edge[] = []
    edges.push(mk('eeg-input', 'bandpass', edges.length))
    edges.push(mk('bandpass', 'notch', edges.length))
    edges.push(mk('notch', 'ica', edges.length))
    edges.push(mk('ica', 'rereference', edges.length))
    edges.push(mk('rereference', 'output-clean', edges.length))
    return edges
  }

  // 2) Generic fallback: connect left-to-right by x position within the same "lane".
  // This keeps most linear templates wired without needing per-template rules.
  const sorted = [...nodes].sort((a, b) => (a.position?.x ?? 0) - (b.position?.x ?? 0))

  const edges: Edge[] = []

  // First connect any Data nodes into the first compute-ish node.
  const firstCompute = sorted.find((n) =>
    ['preprocessingNode', 'analysisNode', 'mlNode', 'comparisonAgentNode', 'brainNode'].includes(String(n.type))
  )
  if (firstCompute) {
    for (const n of sorted) {
      if (n.type === 'dataNode' || n.type === 'referenceDatasetNode') {
        edges.push(mk(n.id, firstCompute.id, edges.length))
      }
    }
  }

  // Then create a simple chain across compute nodes to the first output.
  const computeish = sorted.filter((n) =>
    ['preprocessingNode', 'analysisNode', 'mlNode', 'comparisonAgentNode', 'brainNode'].includes(String(n.type))
  )
  const output = sorted.find((n) => n.type === 'outputNode')

  for (let i = 0; i < computeish.length - 1; i++) {
    edges.push(mk(computeish[i].id, computeish[i + 1].id, edges.length))
  }

  if (output) {
    const last = computeish[computeish.length - 1]
    if (last) edges.push(mk(last.id, output.id, edges.length))
  }

  // Deduplicate in case we added the same pair twice.
  const seen = new Set<string>()
  return edges.filter((e) => {
    const key = `${e.source}=>${e.target}`
    if (seen.has(key)) return false
    seen.add(key)
    // Only keep edges pointing to existing nodes.
    return byId.has(e.source) && byId.has(e.target)
  })
}

// Smart zoom helper - adapts based on node count
function getSmartZoomOptions(nodeCount: number, options?: { padding?: number; duration?: number }) {
  const base = { padding: options?.padding ?? 0.3, ...(options?.duration ? { duration: options.duration } : {}) }
  
  if (nodeCount >= 50) {
    // Large workflows (100+ brain nodes) - zoom out significantly
    return { ...base, maxZoom: 0.4 }
  } else if (nodeCount >= 20) {
    // Medium-large workflows
    return { ...base, maxZoom: 0.6 }
  } else if (nodeCount >= 10) {
    // Medium workflows  
    return { ...base, maxZoom: 0.85 }
  } else {
    // Small workflows (typical case) - keep nodes visible and readable
    return { ...base, maxZoom: 1.2 }
  }
}

function WorkflowCanvas() {
  // News node modal state
  const [newsNodeToEdit, setNewsNodeToEdit] = useState<Node | null>(null)
  // Data node modal state (for editing data sources)
  const [dataNodeToEdit, setDataNodeToEdit] = useState<Node | null>(null)
  // Nodes and edges state
  // (removed duplicate declaration)

  // Nodes and edges state
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Set a default news article URL for static route/demo if no URL is present
  useEffect(() => {
    const urlNodeIndex = nodes.findIndex(
      n => (n.type === 'contentUrlInputNode' || n.type === 'newsArticleNode' || (n.data && n.data.subType === 'url')) && !n.data?.url
    );
    if (urlNodeIndex !== -1) {
      const DEFAULT_ARTICLE = {
        url: 'https://www.bbc.com/news/world-67112345',
        label: 'Sample News Article',
      };
      setNodes(nodes => nodes.map((n, i) =>
        i === urlNodeIndex
          ? { ...n, data: { ...n.data, ...DEFAULT_ARTICLE } }
          : n
      ));
    }
  }, [nodes, setNodes]);
  // ...existing code...


  // Workflow ID state (for updates vs creates)
  const [workflowId, setWorkflowId] = useState<string | null>(null)

  // Fetch per-node results from backend if workflowId is present
  useEffect(() => {
    if (!workflowId) return;
    const fetchResults = async () => {
      try {
        const res = await fetch(`/api/workflows/results/${workflowId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data && Array.isArray(data.results)) {
          // Map results by node_id
          const resultsMap = data.results.reduce((acc: Record<string, any>, r: any) => {
            acc[r.node_id] = r.result;
            return acc;
          }, {});
          setPerNodeResults(resultsMap);
        }
      } catch (err) {
        // Ignore errors for now
      }
    };
    fetchResults();
  }, [workflowId]);
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  // (removed duplicate declaration)
  const { screenToFlowPosition, fitView, getNodes } = useReactFlow()
  const searchParams = useSearchParams()
  const { theme, resolvedTheme } = useTheme()
  
  // Determine if we're in dark mode
  const isDark = resolvedTheme === 'dark'
  
  // Mobile state
  const [isMobile, setIsMobile] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  
  // Brain modal state
  const [selectedBrain, setSelectedBrain] = useState<Node | null>(null)
  
  // Selected node for deletion
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  
  // Wizard modal state
  const [showWizard, setShowWizard] = useState(false)
  
  // Custom module modal state
  const [showCreateModule, setShowCreateModule] = useState(false)
  const [customModules, setCustomModules] = useState<CustomModuleDefinition[]>([])
  
  // Load custom modules from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('neurodata_custom_modules')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Restore Date objects
          const restored = parsed.map((m: CustomModuleDefinition) => ({
            ...m,
            createdAt: new Date(m.createdAt)
          }))
          setCustomModules(restored)
          console.log('📦 Loaded', restored.length, 'custom modules from localStorage')
        }
      }
    } catch (e) {
      console.warn('Failed to load custom modules from localStorage:', e)
    }
  }, [])
  
  // Save custom modules to localStorage whenever they change
  useEffect(() => {
    if (customModules.length > 0) {
      try {
        localStorage.setItem('neurodata_custom_modules', JSON.stringify(customModules))
        console.log('💾 Saved', customModules.length, 'custom modules to localStorage')
      } catch (e) {
        console.warn('Failed to save custom modules to localStorage:', e)
      }
    }
  }, [customModules])
  
  // Workflow state (must be before useEffect that uses setWorkflowName)
  const [workflowName, setWorkflowName] = useState('Untitled Workflow')
  const [isSaving, setIsSaving] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [isWaitingForAI, setIsWaitingForAI] = useState(false) // Shows "Processing with AI..." overlay
  const [isExplaining, setIsExplaining] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [analysisResult, setAnalysisResult] = useState<string | null>(null)
  const [perNodeResults, setPerNodeResults] = useState<Record<string, unknown>>({})
  const [showResults, setShowResults] = useState(false)
  const [workflowExplanation, setWorkflowExplanation] = useState<string | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [showEmptyState, setShowEmptyState] = useState(true)
  const [runError, setRunError] = useState<string | null>(null)
  
  // Upgrade modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [creditsInfo, setCreditsInfo] = useState<{
    workflowsUsed: number
    workflowsLimit: number
    tier: 'free' | 'researcher' | 'clinical'
  }>({ workflowsUsed: 0, workflowsLimit: 3, tier: 'free' })
  
  // Debug: Log when results state changes
  useEffect(() => {
    console.log('[Debug] Results state changed:', { 
      showResults, 
      hasAnalysisResult: !!analysisResult, 
      analysisResultLength: analysisResult?.length || 0 
    })
  }, [showResults, analysisResult])
  
  // Auto-open wizard if ?wizard=true param is present
  useEffect(() => {
    const shouldOpenWizard = searchParams.get('wizard') === 'true'
    if (shouldOpenWizard) {
      // Clear the canvas for a fresh start with wizard
      setNodes([])
      setEdges([])
      setWorkflowName('Untitled Workflow')
      setShowWizard(true)
    }
  }, [searchParams, setNodes, setEdges])
  
  // Detect mobile on mount and window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  // Auto-snap to first node on mobile after initialization
  useEffect(() => {
    if (isMobile && !isInitialized && nodes.length > 0) {
      setTimeout(() => {
        const allNodes = getNodes()
        if (allNodes.length > 0) {
          // Snap to first node with smooth animation
          fitView({ 
            nodes: [allNodes[0]], 
            padding: 0.2, 
            duration: 600,
            maxZoom: 1.5
          })
        }
        setIsInitialized(true)
      }, 300)
    }
  }, [isMobile, nodes.length, isInitialized, getNodes, fitView])
  
  // Load template from URL parameter
  useEffect(() => {
    const templateId = searchParams.get('template')
    const regionId = searchParams.get('region')
    const regionName = searchParams.get('regionName')
    const regionAbbr = searchParams.get('regionAbbr')
    const wizardMode = searchParams.get('wizard')
    const videoUrl = searchParams.get('videoUrl')
    const videoTitle = searchParams.get('videoTitle')
    const videoCreator = searchParams.get('creator')
    
    // Skip template loading if in wizard mode
    if (wizardMode === 'true') return
    
    if (templateId) {
      // Load marketplace template
      const template = getTemplateById(templateId)
      if (template) {
        let templateNodes = [...template.nodes]
        
        // If we have a video URL from onboarding, update the content URL node
        if (videoUrl && templateId === 'content-impact-analyzer') {
          templateNodes = templateNodes.map((node) => {
            if (node.type === 'contentUrlInputNode' || node.type === 'newsArticleNode' || (node.data as any)?.subType === 'url') {
              return {
                ...node,
                data: {
                  ...node.data,
                  label: videoTitle ? decodeURIComponent(videoTitle) : (node.data as any).label,
                  url: decodeURIComponent(videoUrl),
                  creator: videoCreator ? decodeURIComponent(videoCreator) : undefined,
                }
              }
            }
            return node
          })
        }
        
        setNodes(templateNodes)
        const edges = template.edges && template.edges.length > 0 ? template.edges : buildPrewiredEdges(templateNodes)
        setEdges(edges)
        setWorkflowName(template.name)
        // Fit view with smart zoom based on node count
        setTimeout(() => fitView(getSmartZoomOptions(templateNodes.length)), 150)
      }
    } else if (regionId && regionName) {
      // Create a new workflow with the selected brain region
      const regionNode: Node = {
        id: `region-${Date.now()}`,
        type: 'brainRegionNode',
        position: { x: 100, y: 200 },
        data: {
          label: decodeURIComponent(regionName),
          regionId: regionId,
          abbreviation: regionAbbr ? decodeURIComponent(regionAbbr) : undefined,
          hemisphere: 'bilateral',
        },
      }
      
      // Add a brain node connected to the region
      const brainNode: Node = {
        id: `brain-${Date.now()}`,
        type: 'brainNode',
        position: { x: 400, y: 200 },
        data: {
          label: 'Region Analyzer',
          prompt: `Analyze the ${decodeURIComponent(regionName)} region. Focus all analysis specifically on this brain structure.`,
          model: 'gemini-2.0-flash',
          computeTier: 'cpu-standard',
        },
      }
      
      // Add an output node
      const outputNode: Node = {
        id: `output-${Date.now()}`,
        type: 'outputNode',
        position: { x: 700, y: 200 },
        data: {
          label: 'Region Report',
          category: 'output_sink',
        },
      }
      
      const newEdges: Edge[] = [
        { id: `e-region-brain-${Date.now()}`, source: regionNode.id, target: brainNode.id, ...edgeOptions },
        { id: `e-brain-output-${Date.now()}`, source: brainNode.id, target: outputNode.id, ...edgeOptions },
      ]
      
      setNodes([regionNode, brainNode, outputNode])
      setEdges(newEdges)
      setWorkflowName(`${decodeURIComponent(regionName)} Analysis`)
      
      setTimeout(() => fitView(getSmartZoomOptions(3)), 150)
    }
  }, [searchParams, setNodes, setEdges, fitView])

  // Handle new connections
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, ...edgeOptions }, eds))
    },
    [setEdges]
  )

  // Handle drag over
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  // Handle drop from palette (only for node palette items, not file drops)
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      const type = event.dataTransfer.getData('application/reactflow')
      const payloadStr = event.dataTransfer.getData('application/payload')

      // Only handle node palette drops, not file drops
      // File drops should be handled by individual DataNode components
      if (!type || !payloadStr) {
        // Check if this is a file drop - if so, don't prevent default here
        // to allow DataNode to handle it
        if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
          console.log('[Canvas] File drop detected, letting it bubble to nodes')
          return // Let the event bubble to DataNode
        }
        return
      }
      
      event.preventDefault()

      const payload = JSON.parse(payloadStr)
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: {
          ...payload,
          status: 'idle',
          progress: 0,
        },
      }

      setNodes((nds) => nds.concat(newNode))
    },
    [screenToFlowPosition, setNodes]
  )

  // Handle node click
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id)
    if (node.type === 'brainNode') {
      setSelectedBrain(node)
    }
    
    // Clear AI-generated label when user clicks on a node (acknowledges it)
    if (node.data?.aiGenerated) {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === node.id
            ? { ...n, data: { ...n.data, aiGenerated: false } }
            : n
        )
      )
    }
    // Optionally: open modal for news node on click (if you want single click)
    // if (node.type === 'contentUrlInputNode' || (node.data && node.data.subType === 'url')) {
    //   setNewsNodeToEdit(node)
    // }
  }, [setNodes])

  // Handle node double click: zoom in, and open modal for news article nodes only
  // (ContentUrlInputNode has its own internal modal, so we don't open one for it)
  const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    // Zoom to the double-clicked node
    fitView({ nodes: [node], padding: 0.2, duration: 600, maxZoom: 1.5 });
    // Only open the external modal for newsArticleNode type
    // ContentUrlInputNode handles its own modal internally
    if (node.type === 'newsArticleNode') {
      setNewsNodeToEdit(node);
    }
    // Open data source modal for dataNode type
    if (node.type === 'dataNode') {
      setDataNodeToEdit(node);
    }
  }, [fitView]);

  // Handle pane click - deselect nodes
  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null)
  }, [])

  // Save brain instructions
  const handleSaveBrainInstructions = useCallback(
    (nodeId: string, data: BrainInstructions) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                ...data,
              },
            }
          }
          return node
        })
      )
    },
    [setNodes]
  )

  // Delete node
  const handleDeleteNode = useCallback(
    (nodeId?: string) => {
      const targetId = nodeId || selectedNodeId
      if (!targetId) return
      
      setNodes((nds) => nds.filter((node) => node.id !== targetId))
      setEdges((eds) => eds.filter((edge) => edge.source !== targetId && edge.target !== targetId))
      setSelectedNodeId(null)
    },
    [setNodes, setEdges, selectedNodeId]
  )

  // Keyboard shortcut for delete
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedNodeId) {
        // Don't delete if user is typing in an input
        if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
          return
        }
        event.preventDefault()
        handleDeleteNode()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedNodeId, handleDeleteNode])

  // Workflow ID state (for updates vs creates)

  // Save workflow to API
  const handleSaveWorkflow = async () => {
    setIsSaving(true)
    setSaveStatus('saving')
    
    try {
      // Prepare the "clean graph" payload (following Gemini's pattern)
      const payload = {
        workflowId: workflowId || undefined,
        name: workflowName,
        description: '',
        tags: [],
        nodes: nodes.map(node => ({
          id: node.id,
          type: node.type,
          position: node.position,
          data: node.data,
        })),
        edges: edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
        })),
        canvas_zoom: 1,
        canvas_offset_x: 0,
        canvas_offset_y: 0,
      }

      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer dev-mode', // Dev mode auth
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok) {
        // Handle demo mode / database not configured
        if (result.demoMode || response.status === 503) {
          console.log('🎭 Database not configured - running in demo mode, saving custom modules anyway')
          
          // Save AI-generated nodes as custom modules even in demo mode
          const aiNodes = nodes.filter(n => n.data.aiGenerated)
          console.log('📦 [Demo Mode] Found', aiNodes.length, 'AI-generated nodes to save as custom modules')
          
          if (aiNodes.length > 0) {
            const savedModuleNames = new Set<string>()
            
            aiNodes.forEach(node => {
              const baseLabel = String(node.data.label || node.type || 'Custom Node').split(' - ')[0].trim()
              const moduleName = `${baseLabel}`
              
              if (savedModuleNames.has(moduleName)) return
              savedModuleNames.add(moduleName)
              
              const newModule: CustomModuleDefinition = {
                id: `ai-module-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: moduleName,
                description: `AI-generated from "${workflowName}"`,
                category: node.type?.includes('brain') ? 'analysis' : 
                         node.type?.includes('data') ? 'data' : 
                         node.type?.includes('output') ? 'output' : 
                         node.type?.includes('preprocessing') ? 'preprocessing' : 'custom',
                icon: node.type?.includes('brain') ? 'brain' : 
                      node.type?.includes('data') ? 'database' : 
                      node.type?.includes('output') ? 'output' : 
                      node.type?.includes('preprocessing') ? 'zap' : 'sparkles',
                behavior: String(node.data.description || node.data.behavior || `Custom ${baseLabel} module`),
                inputs: [{ id: 'input-1', name: 'Input Data', type: 'any', required: true }],
                outputs: [{ id: 'output-1', name: 'Result', type: 'any' }],
                color: node.type?.includes('brain') ? 'purple' : 
                       node.type?.includes('data') ? 'emerald' : 
                       node.type?.includes('output') ? 'orange' : 
                       node.type?.includes('preprocessing') ? 'cyan' : 'pink',
                createdAt: new Date(),
              }
              
              setCustomModules(prev => {
                if (prev.some(m => m.name === newModule.name)) {
                  console.log('⏭️ [Demo] Skipping duplicate module:', newModule.name)
                  return prev
                }
                console.log('✨ [Demo] Added custom module:', newModule.name)
                return [...prev, newModule]
              })
            })
          }
          
          // Clear AI labels in demo mode
          setNodes((nds) => {
            const updated = nds.map((n) => ({
              ...n,
              data: { ...n.data, aiGenerated: false, _lastModified: Date.now() },
            }))
            console.log('✅ Cleared AI labels in demo mode. Nodes:', updated.length, 'aiGenerated values:', updated.map(n => n.data.aiGenerated))
            return updated
          })
          setSaveStatus('saved')
          setTimeout(() => setSaveStatus('idle'), 2000)
          return
        }
        throw new Error(result.error || 'Failed to save workflow')
      }

      // Store the workflow ID for future updates
      if (result.workflowId) {
        setWorkflowId(result.workflowId)
      }
      
      // Extract AI-generated nodes and save as custom modules (for reuse in future workflows)
      const aiNodes = nodes.filter(n => n.data.aiGenerated)
      console.log('📦 Found', aiNodes.length, 'AI-generated nodes to potentially save as custom modules')
      
      if (aiNodes.length > 0) {
        // Save each unique AI-generated node as a reusable custom module
        const savedModuleNames = new Set<string>()
        
        aiNodes.forEach(node => {
          const baseLabel = String(node.data.label || node.type || 'Custom Node').split(' - ')[0].trim()
          const moduleName = `${baseLabel}`
          
          // Skip if we already saved this name or if it already exists
          if (savedModuleNames.has(moduleName)) return
          savedModuleNames.add(moduleName)
          
          const newModule: CustomModuleDefinition = {
            id: `ai-module-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: moduleName,
            description: `AI-generated from "${workflowName}"`,
            category: node.type?.includes('brain') ? 'analysis' : 
                     node.type?.includes('data') ? 'data' : 
                     node.type?.includes('output') ? 'output' : 
                     node.type?.includes('preprocessing') ? 'preprocessing' : 'custom',
            icon: node.type?.includes('brain') ? 'brain' : 
                  node.type?.includes('data') ? 'database' : 
                  node.type?.includes('output') ? 'output' : 
                  node.type?.includes('preprocessing') ? 'zap' : 'sparkles',
            behavior: String(node.data.description || node.data.behavior || `Custom ${baseLabel} module`),
            inputs: [{ id: 'input-1', name: 'Input Data', type: 'any', required: true }],
            outputs: [{ id: 'output-1', name: 'Result', type: 'any' }],
            color: node.type?.includes('brain') ? 'purple' : 
                   node.type?.includes('data') ? 'emerald' : 
                   node.type?.includes('output') ? 'orange' : 
                   node.type?.includes('preprocessing') ? 'cyan' : 'pink',
            createdAt: new Date(),
          }
          
          setCustomModules(prev => {
            // Don't add duplicates by name
            if (prev.some(m => m.name === newModule.name)) {
              console.log('⏭️ Skipping duplicate module:', newModule.name)
              return prev
            }
            console.log('✨ Added custom module:', newModule.name)
            return [...prev, newModule]
          })
        })
      }
      
      // Clear AI-generated labels after successful save (user has adopted the workflow)
      console.log('🧹 Clearing AI labels on all nodes after save...')
      setNodes((nds) => {
        const updated = nds.map((n) => ({
          ...n,
          // Force React Flow to detect the change by adding a _lastModified timestamp
          data: { ...n.data, aiGenerated: false, _lastModified: Date.now() },
        }))
        console.log('✅ Cleared AI labels. Nodes updated:', updated.length, 'aiGenerated values:', updated.map(n => n.data.aiGenerated))
        return updated
      })
      
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('Error saving workflow:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  // Run workflow with real AI
  const handleRunWorkflow = async () => {
    // First, check if user has credits remaining
    try {
      const creditsResponse = await fetch('/api/credits', { credentials: 'include' })
      if (creditsResponse.ok) {
        const creditsData = await creditsResponse.json()
        const workflowsLimit = creditsData.workflows_limit ?? 3
        const workflowsUsed = creditsData.workflows_executed_this_month ?? 0
        const isUnlimited = workflowsLimit === -1
        const workflowsRemaining = isUnlimited ? -1 : Math.max(0, workflowsLimit - workflowsUsed)
        
        // Update credits info for the modal
        setCreditsInfo({
          workflowsUsed,
          workflowsLimit,
          tier: creditsData.subscription_tier || 'free'
        })
        
        // If no workflows remaining and not unlimited, show upgrade modal
        if (!isUnlimited && workflowsRemaining <= 0) {
          setShowUpgradeModal(true)
          return // Don't run the workflow
        }
      }
    } catch (error) {
      console.warn('Failed to check credits, proceeding anyway:', error)
    }
    
    setIsRunning(true)
    setAnalysisResult(null)
    setShowResults(false)
    
    const isLargeWorkflow = nodes.length > 20
    
    // Sort nodes by position (left to right, top to bottom) to process in order
    const sortedNodes = [...nodes].sort((a, b) => {
      if (Math.abs(a.position.x - b.position.x) > 100) {
        return a.position.x - b.position.x
      }
      return a.position.y - b.position.y
    })
    
    // Group nodes by their x-position (columns/layers)
    const nodeColumns: Node[][] = []
    let currentColumn: Node[] = []
    let lastX = -Infinity
    
    for (const node of sortedNodes) {
      if (node.position.x - lastX > 150) {
        if (currentColumn.length > 0) {
          nodeColumns.push(currentColumn)
        }
        currentColumn = [node]
      } else {
        currentColumn.push(node)
      }
      lastX = node.position.x
    }
    if (currentColumn.length > 0) {
      nodeColumns.push(currentColumn)
    }
    
    console.log(`Processing ${nodeColumns.length} columns of nodes`)
    
    // Timing config - slower for better visual experience
    const timing = {
      queueDelay: 500,           // Initial queue display
      zoomDuration: 600,         // Camera pan duration
      initializeDelay: 300,      // Blue initializing state
      runningDelay: 400,         // Green running state  
      progressDelay: 300,        // Progress update
      columnPause: 200,          // Pause between columns
      completionWave: 150,       // Wave completion speed
    }
    
    // Mark all nodes as queued first with a nice pause
    setNodes((nds) =>
      nds.map((n) => ({ ...n, data: { ...n.data, status: 'queued', progress: 0 } }))
    )
    await new Promise(resolve => setTimeout(resolve, timing.queueDelay))
    
    // Process column by column with zoom
    for (let colIdx = 0; colIdx < nodeColumns.length; colIdx++) {
      const column = nodeColumns[colIdx]
      const columnNodeIds = column.map(n => n.id)
      
      // Zoom to this column with smooth animation
      fitView({
        nodes: column,
        padding: 0.4,
        duration: timing.zoomDuration,
        maxZoom: isLargeWorkflow ? 0.9 : 1.2,
      })
      
      // Wait for zoom to complete
      await new Promise(resolve => setTimeout(resolve, timing.zoomDuration * 0.7))
      
      // Mark column as initializing (blue pulse)
      setNodes((nds) =>
        nds.map((n) =>
          columnNodeIds.includes(n.id)
            ? { ...n, data: { ...n.data, status: 'initializing', progress: 10 } }
            : n
        )
      )
      await new Promise(resolve => setTimeout(resolve, timing.initializeDelay))
      
      // Mark column as running (green pulse)
      setNodes((nds) =>
        nds.map((n) =>
          columnNodeIds.includes(n.id)
            ? { ...n, data: { ...n.data, status: 'running', progress: 30 } }
            : n
        )
      )
      await new Promise(resolve => setTimeout(resolve, timing.runningDelay))
      
      // Update progress to 60%
      setNodes((nds) =>
        nds.map((n) =>
          columnNodeIds.includes(n.id)
            ? { ...n, data: { ...n.data, progress: 60 } }
            : n
        )
      )
      await new Promise(resolve => setTimeout(resolve, timing.progressDelay))
      
      // Update progress to 80%
      setNodes((nds) =>
        nds.map((n) =>
          columnNodeIds.includes(n.id)
            ? { ...n, data: { ...n.data, progress: 80 } }
            : n
        )
      )
      
      // Mark previous columns as completed
      if (colIdx > 0) {
        const prevColumnIds = nodeColumns[colIdx - 1].map(n => n.id)
        setNodes((nds) =>
          nds.map((n) =>
            prevColumnIds.includes(n.id)
              ? { ...n, data: { ...n.data, status: 'completed', progress: 100 } }
              : n
          )
        )
      }
      
      await new Promise(resolve => setTimeout(resolve, timing.columnPause))
    }
    
    // Mark last column as completed
    if (nodeColumns.length > 0) {
      const lastColumnIds = nodeColumns[nodeColumns.length - 1].map(n => n.id)
      setNodes((nds) =>
        nds.map((n) =>
          lastColumnIds.includes(n.id)
            ? { ...n, data: { ...n.data, status: 'running', progress: 90 } }
            : n
        )
      )
    }
    
    // Zoom out to show all nodes while API is processing
    fitView(getSmartZoomOptions(nodes.length, { duration: 800 }))
    
    // Show "Waiting for AI" overlay
    setIsWaitingForAI(true)
    setRunError(null)
    
    try {
      // Generate a workflow execution ID if we don't have one
      const executionId = workflowId || `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`
      
      // Call the real AI workflow execution API
      const payload = {
        workflowId: executionId,
        name: workflowName,
        nodes: nodes.map(node => ({
          id: node.id,
          type: node.type,
          position: node.position,
          data: node.data,
        })),
        edges: edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
        })),
      }

      console.log('Sending workflow run request...')
      const response = await fetch('/api/workflows/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      console.log('Response status:', response.status)
      const result = await response.json()
      console.log('Response result:', { hasAnalysis: !!result.analysis, analysisLength: result.analysis?.length })

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Workflow execution failed')
      }
      
      if (!result.analysis) {
        throw new Error('No analysis returned from AI')
      }

      // Mark all nodes as completed with wave animation from left to right
      for (let colIdx = 0; colIdx < nodeColumns.length; colIdx++) {
        const column = nodeColumns[colIdx]
        const columnNodeIds = column.map(n => n.id)
        
        // Zoom to completing column
        fitView({
          nodes: column,
          padding: 0.3,
          duration: 300,
          maxZoom: 0.8,
        })
        
        setNodes((nds) =>
          nds.map((n) =>
            columnNodeIds.includes(n.id)
              ? { ...n, data: { ...n.data, status: 'completed', progress: 100 } }
              : n
          )
        )
        await new Promise(resolve => setTimeout(resolve, 80))
      }
      
      // Final zoom out to show everything completed
      await new Promise(resolve => setTimeout(resolve, 200))
      fitView(getSmartZoomOptions(nodes.length, { duration: 600 }))

      // Store and show the analysis result
      console.log('Workflow result:', { 
        hasAnalysis: !!result.analysis, 
        hasPerNodeResults: !!result.perNodeResults,
        perNodeResultsCount: result.perNodeResults?.length || 0,
        perNodeResultsSample: result.perNodeResults?.slice(0, 2)
      })
      
      setAnalysisResult(result.analysis)
      
      // Always trigger credits/execution count refresh after successful run
      // Small delay to ensure database insert has committed
      setTimeout(() => {
        // Clear both localStorage and sessionStorage caches
        localStorage.removeItem('neurodata_credits')
        sessionStorage.removeItem('neurodata_credits_session')
        window.dispatchEvent(new Event('neurodata:credits-refresh'))
        console.log('✅ Triggered credits refresh after workflow run')
      }, 500)
      
      if (result.perNodeResults && Array.isArray(result.perNodeResults)) {
        // Build a map by nodeId (primary) and also by nodeName (fallback)
        const resultsById: Record<string, any> = {}
        const resultsByName: Record<string, any> = {}
        
        result.perNodeResults.forEach((res: any) => {
          if (res.nodeId) resultsById[res.nodeId] = res
          if (res.nodeName) resultsByName[res.nodeName] = res
        })
        
        console.log('resultsById keys:', Object.keys(resultsById).slice(0, 5))
        console.log('resultsByName keys:', Object.keys(resultsByName).slice(0, 5))
        console.log('Node IDs in workflow:', nodes.slice(0, 5).map(n => ({ id: n.id, label: n.data?.label })))
        
        // Map results to actual workflow nodes, trying nodeId first, then nodeName
        const resultsMap: Record<string, any> = {}
        nodes.forEach(node => {
          if (resultsById[node.id]) {
            resultsMap[node.id] = resultsById[node.id]
          } else {
            const nodeLabel = typeof node.data?.label === 'string' ? node.data.label : null
            if (nodeLabel && resultsByName[nodeLabel]) {
              resultsMap[node.id] = resultsByName[nodeLabel]
            }
          }
        })
        
        console.log('Mapped perNodeResults:', Object.keys(resultsMap).length, 'of', nodes.length, 'nodes')
        setPerNodeResults(resultsMap)
      } else {
        console.warn('No perNodeResults in response or not an array')
      }
      
      // Clear AI-generated labels after successful run (user has committed to the workflow)
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          data: { ...n.data, aiGenerated: false },
        }))
      )
      
      console.log('Setting showResults=true, analysisResult length:', result.analysis?.length)
      setShowResults(true)

    } catch (error) {
      console.error('Workflow execution error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setRunError(errorMessage)
      
      // Mark nodes as failed
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          data: { ...n.data, status: 'failed', progress: 0 },
        }))
      )
    } finally {
      setIsRunning(false)
      setIsWaitingForAI(false)
    }
  }

  // Reset workflow - clears all nodes and edges
  const handleResetWorkflow = () => {
    setNodes([])
    setEdges([])
    setWorkflowName('Untitled Workflow')
    setAnalysisResult(null)
    setSelectedNodeId(null)
  }

  // Explain workflow - uses Gemini to summarize what the current workflow does
      const handleExplainWorkflow = async () => {
    if (nodes.length === 0) return
    
    setIsExplaining(true)
    try {
      // Find the contentUrlInputNode or newsArticleNode if it exists to pass its URL to the explanation API
      const contentUrlNode = nodes.find(n => n.type === 'contentUrlInputNode' || n.type === 'newsArticleNode')
      const videoUrl = contentUrlNode?.data?.url as string | undefined

      // Build a description of the workflow for Gemini
      const workflowDescription = {
        name: workflowName,
        nodes: nodes.map(n => ({
          type: n.type,
          label: n.data.label || n.type,
          data: n.data
        })),
        connections: edges.map(e => ({
          from: nodes.find(n => n.id === e.source)?.data?.label || e.source,
          to: nodes.find(n => n.id === e.target)?.data?.label || e.target
        })),
        videoUrl: videoUrl, // Pass the video URL if available
      }
      
      const response = await fetch('/api/workflows/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow: workflowDescription })
      })
      
      if (response.ok) {
        const data = await response.json()
        setWorkflowExplanation(data.explanation)
        setShowExplanation(true)
      }
    } catch (error) {
      console.error('Failed to explain workflow:', error)
    } finally {
      setIsExplaining(false)
    }
  }  // Handle wizard workflow selection
  const handleWizardSelect = useCallback((suggestion: {
    id: string
    name: string
    description: string
    // This needs to match the structure from the wizard component, which uses a simplified format
    nodes: Array<{ type: string; label: string; payload: Record<string, unknown> }>
    connections: Array<{ from: number; to: number }>
    category: string
  }) => {
    // First, try to get the full template if it exists (for pre-defined templates)
    const fullTemplate = getTemplateById(suggestion.id)
    
    let newNodes: Node[]
    let newEdges: Edge[]
    
    if (fullTemplate) {
      // Use the full template with properly positioned nodes
      // Mark all wizard-created nodes as AI-generated
      newNodes = fullTemplate.nodes.map((node: Node, index: number) => ({
        ...node,
        id: `${node.type}-${Date.now()}-${index}`,
        data: {
          ...node.data,
          aiGenerated: true, // Flag to show this was created by AI Wizard
        },
      }))
      newEdges = (fullTemplate.edges || []).map((edge: Edge, index: number) => ({
        ...edge,
        id: `e-wizard-${Date.now()}-${index}`,
      }))
    } else {
      // Dynamically build nodes from the wizard suggestion
      // Calculate positions in a grid layout
      const GRID_SPACING_X = 280
      const GRID_SPACING_Y = 150
      const COLS = 3
      
      newNodes = suggestion.nodes.map((node, index) => {
        const col = index % COLS
        const row = Math.floor(index / COLS)
        
        return {
          id: `${node.type}-${Date.now()}-${index}`,
          type: node.type,
          position: { 
            x: 100 + col * GRID_SPACING_X, 
            y: 100 + row * GRID_SPACING_Y 
          },
          data: {
            ...node.payload,
            label: node.label || node.payload?.label || node.type,
            status: 'idle',
            aiGenerated: true, // Flag to show this was created by AI Wizard
          },
        } as Node
      })
      
      // Build edges from connections
      newEdges = suggestion.connections.map((conn, index) => ({
        id: `e-wizard-${Date.now()}-${index}`,
        source: newNodes[conn.from]?.id || '',
        target: newNodes[conn.to]?.id || '',
        type: 'smoothstep',
        animated: false,
        style: { stroke: '#6366f1', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#6366f1',
        },
      } as Edge)).filter(e => e.source && e.target)
    }

    setNodes(newNodes)
    setEdges(newEdges)
    setWorkflowName(suggestion.name)
    setShowWizard(false)
    
    // Immediately save AI-generated nodes as custom modules (don't wait for Save)
    console.log('🪄 Wizard completed - saving', newNodes.length, 'nodes as custom modules immediately')
    const savedModuleNames = new Set<string>()
    
    newNodes.forEach(node => {
      const baseLabel = String(node.data.label || node.type || 'Custom Node').split(' - ')[0].trim()
      const moduleName = `${baseLabel}`
      
      // Skip duplicates
      if (savedModuleNames.has(moduleName)) return
      savedModuleNames.add(moduleName)
      
      const newModule: CustomModuleDefinition = {
        id: `ai-module-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: moduleName,
        description: `AI-generated from "${suggestion.name}"`,
        category: node.type?.includes('brain') ? 'analysis' : 
                 node.type?.includes('data') ? 'data' : 
                 node.type?.includes('output') ? 'output' : 
                 node.type?.includes('preprocessing') ? 'preprocessing' : 'custom',
        icon: node.type?.includes('brain') ? 'brain' : 
              node.type?.includes('data') ? 'database' : 
              node.type?.includes('output') ? 'output' : 
              node.type?.includes('preprocessing') ? 'zap' : 'sparkles',
        behavior: String(node.data.description || node.data.behavior || `Custom ${baseLabel} module`),
        inputs: [{ id: 'input-1', name: 'Input Data', type: 'any', required: true }],
        outputs: [{ id: 'output-1', name: 'Result', type: 'any' }],
        color: node.type?.includes('brain') ? 'purple' : 
               node.type?.includes('data') ? 'emerald' : 
               node.type?.includes('output') ? 'orange' : 
               node.type?.includes('preprocessing') ? 'cyan' : 'pink',
        createdAt: new Date(),
      }
      
      setCustomModules(prev => {
        // Don't add duplicates by name
        if (prev.some(m => m.name === newModule.name)) {
          console.log('⏭️ [Wizard] Skipping duplicate module:', newModule.name)
          return prev
        }
        console.log('✨ [Wizard] Added custom module:', newModule.name)
        return [...prev, newModule]
      })
    })
    
    // Fit view after nodes are rendered with smart zoom
    setTimeout(() => fitView(getSmartZoomOptions(newNodes.length)), 150)
  }, [setNodes, setEdges, fitView, setCustomModules])

  // Handle custom module creation
  const handleSaveCustomModule = useCallback((module: CustomModuleDefinition) => {
    setCustomModules(prev => [...prev, module])
    setShowCreateModule(false)
    // TODO: Save to backend
  }, [])

  // Icon mapping for custom modules
  const getIconForModule = (iconName: string): React.ElementType => {
    const iconMap: Record<string, React.ElementType> = {
      brain: Brain,
      database: Database,
      zap: Zap,
      chart: BarChart3,
      output: FileOutput,
      sparkles: Sparkles,
      code: Code2,
    }
    return iconMap[iconName] || Code2
  }

  // Convert custom modules to draggable node items format
  const customModuleNodes = useMemo(() => {
    console.log('🔄 Converting', customModules.length, 'custom modules to nodes')
    
    // Icon mapping for custom modules
    const iconMap: Record<string, React.ElementType> = {
      brain: Brain,
      database: Database,
      zap: Zap,
      chart: BarChart3,
      output: FileOutput,
      sparkles: Sparkles,
      code: Code2,
    }
    
    return customModules.map(module => {
      const item = {
        type: 'customModuleNode',
        label: module.name,
        icon: iconMap[module.icon] || Sparkles,
        color: `text-${module.color}-400`,
        bgColor: `bg-${module.color}-500/10 hover:bg-${module.color}-500/20 border-${module.color}-500/30`,
        payload: { 
          label: module.name, 
          behavior: module.behavior,
          inputs: module.inputs,
          outputs: module.outputs,
          customModuleId: module.id
        },
        tooltip: module.description,
        isCustom: true,
        tags: ['custom', 'ai-generated'] as string[],
        id: module.id // Include ID for deletion
      }
      console.log('  - Created node item:', module.name)
      return item
    })
  }, [customModules])

  // Delete a custom module by ID
  const handleDeleteCustomModule = useCallback((moduleId: string) => {
    console.log('🗑️ Deleting custom module:', moduleId)
    setCustomModules(prev => {
      const updated = prev.filter(m => m.id !== moduleId)
      // Also update localStorage
      try {
        localStorage.setItem('neurodata_custom_modules', JSON.stringify(updated))
        console.log('💾 Updated localStorage after deletion, remaining:', updated.length)
      } catch (e) {
        console.warn('Failed to update localStorage after deletion:', e)
      }
      return updated
    })
  }, [])

  // Minimap node color
  const minimapNodeColor = useCallback((node: Node) => {
    const colors: Record<string, string> = {
      brainNode: '#a855f7',
      dataNode: '#10b981',
      preprocessingNode: '#eab308',
      analysisNode: '#06b6d4',
      mlNode: '#ec4899',
      outputNode: '#f97316',
      computeNode: '#3b82f6',
    }
    return colors[node.type || ''] || '#64748b'
  }, [])

  return (
    <div className="flex h-full min-h-0 bg-slate-950 text-slate-100 overflow-hidden">
      {/* Sidebar - Unified Node Palette */}
      <NodePalette 
        onCreateModule={() => setShowCreateModule(true)}
        customModules={customModuleNodes}
        onDeleteCustomModule={handleDeleteCustomModule}
      />
      
      {/* Main Canvas Area */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* Top Bar - with proper padding */}
        <div className="min-h-[4rem] h-auto bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 flex flex-wrap items-center justify-between px-4 py-2 gap-y-2 z-10">
          {/* Left: Back + Title */}
          <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-[200px]">
            <Link 
              href="/dashboard/workflows"
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors shrink-0"
            >
              <ChevronLeft className="w-5 h-5 text-slate-400" />
            </Link>
            <div className="flex flex-col flex-1 min-w-0">
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="bg-transparent border-none text-base md:text-lg font-semibold text-white focus:outline-none focus:ring-2 focus:ring-purple-500 rounded px-2 py-0.5 w-full truncate"
                placeholder="Untitled Workflow"
              />
              <div className="flex items-center gap-2 px-2 h-4">
                {saveStatus === 'saving' && (
                  <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Saving...
                  </span>
                )}
                {saveStatus === 'saved' && (
                  <span className="flex items-center gap-1.5 text-[10px] text-green-400">
                    <CheckCircle2 className="w-3 h-3" />
                    Saved
                  </span>
                )}
                {saveStatus === 'error' && (
                  <span className="flex items-center gap-1.5 text-[10px] text-red-400">
                    <XCircle className="w-3 h-3" />
                    Error
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center justify-end flex-wrap gap-2 ml-auto">
            <button 
              onClick={() => setShowWizard(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-purple-300 hover:from-purple-600/30 hover:to-pink-600/30 border border-purple-500/30 rounded-lg transition-all whitespace-nowrap"
            >
              <Wand2 className="w-4 h-4" />
              <span className="hidden sm:inline">AI Wizard</span>
              <span className="sm:hidden">Wizard</span>
            </button>
            <button 
              onClick={handleExplainWorkflow}
              disabled={isExplaining || nodes.length === 0}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all border whitespace-nowrap',
                nodes.length > 0
                  ? 'bg-gradient-to-r from-amber-600/20 to-orange-600/20 text-amber-300 hover:from-amber-600/30 hover:to-orange-600/30 border-amber-500/30'
                  : 'bg-slate-800/50 text-slate-500 border-slate-700/50 cursor-not-allowed'
              )}
            >
              {isExplaining ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">{isExplaining ? 'Explaining...' : 'Explain'}</span>
            </button>
            <button 
              onClick={handleResetWorkflow}
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
              title="Reset Workflow"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Reset</span>
            </button>
            <button 
              onClick={handleSaveWorkflow}
              disabled={isSaving}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors whitespace-nowrap',
                'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white',
                isSaving && 'opacity-50 cursor-not-allowed'
              )}
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">Save</span>
            </button>
            <button
              onClick={isRunning ? undefined : handleRunWorkflow}
              disabled={isRunning}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-medium transition-all whitespace-nowrap shadow-lg',
                isRunning
                  ? 'bg-yellow-600 text-white cursor-wait'
                  : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white border border-green-500/50 shadow-green-900/20'
              )}
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Run</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 min-h-0 relative overflow-hidden" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes.map(node => ({
              ...node,
              data: {
                ...node.data,
                nodeResult: perNodeResults[node.id],
                isRunning: isRunning,
              }
            }))}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={edgeOptions}
            connectionLineStyle={connectionLineStyle}
            fitView
            fitViewOptions={getSmartZoomOptions(nodes.length, { padding: 0.2 })}
            minZoom={0.1}
            maxZoom={2}
            className={isDark ? 'bg-slate-950' : 'bg-slate-100'}
            proOptions={{ hideAttribution: true }}
          >
      {/* News Node Edit Modal */}
      {newsNodeToEdit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl p-6">
            <h2 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">Edit News Article</h2>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Article Title</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded text-slate-900 dark:text-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                  value={typeof newsNodeToEdit.data?.label === 'string' ? newsNodeToEdit.data.label : ''}
                  onChange={e => {
                    const newLabel = e.target.value;
                    setNodes(nds => nds.map(n =>
                      n.id === newsNodeToEdit.id ? { ...n, data: { ...n.data, label: newLabel } } : n
                    ));
                    setNewsNodeToEdit(n => n ? { ...n, data: { ...n.data, label: newLabel } } : n);
                  }}
                  placeholder="Article title or name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Article URL</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded text-slate-900 dark:text-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                  value={typeof newsNodeToEdit.data?.url === 'string' ? newsNodeToEdit.data.url : ''}
                  onChange={e => {
                    const newUrl = e.target.value;
                    setNodes(nds => nds.map(n =>
                      n.id === newsNodeToEdit.id ? { ...n, data: { ...n.data, url: newUrl } } : n
                    ));
                    setNewsNodeToEdit(n => n ? { ...n, data: { ...n.data, url: newUrl } } : n);
                  }}
                  placeholder="Paste news article URL here"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium"
                onClick={() => setNewsNodeToEdit(null)}
              >
                Save
              </button>
              <button
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white rounded-lg"
                onClick={() => setNewsNodeToEdit(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Data Node Edit Modal */}
      {dataNodeToEdit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-500/20 rounded-xl">
                <Database className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Configure Data Source</h2>
                <p className="text-xs text-slate-500">Double-click to edit or drag a file to attach data</p>
              </div>
            </div>
            
            <div className="space-y-4 mb-6">
              {/* Node Label */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data Source Name</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded text-slate-900 dark:text-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                  value={typeof dataNodeToEdit.data?.label === 'string' ? dataNodeToEdit.data.label : ''}
                  onChange={e => {
                    const newLabel = e.target.value;
                    setNodes(nds => nds.map(n =>
                      n.id === dataNodeToEdit.id ? { ...n, data: { ...n.data, label: newLabel } } : n
                    ));
                    setDataNodeToEdit(n => n ? { ...n, data: { ...n.data, label: newLabel } } : n);
                  }}
                  placeholder="e.g., SAT Exam Questions, Player Stats, etc."
                />
              </div>

              {/* Description / Sample Data Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data Description</label>
                <textarea
                  className="w-full p-2 border rounded text-slate-900 dark:text-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 min-h-[80px]"
                  value={typeof dataNodeToEdit.data?.sampleDataDescription === 'string' ? dataNodeToEdit.data.sampleDataDescription : (typeof dataNodeToEdit.data?.description === 'string' ? dataNodeToEdit.data.description : '')}
                  onChange={e => {
                    const newDesc = e.target.value;
                    setNodes(nds => nds.map(n =>
                      n.id === dataNodeToEdit.id ? { ...n, data: { ...n.data, sampleDataDescription: newDesc, description: newDesc } } : n
                    ));
                    setDataNodeToEdit(n => n ? { ...n, data: { ...n.data, sampleDataDescription: newDesc, description: newDesc } } : n);
                  }}
                  placeholder="Describe the data this node should contain (e.g., '100 SAT math and reading questions with difficulty levels')"
                />
              </div>

              {/* Attached File Info */}
              {typeof dataNodeToEdit.data?.fileName === 'string' && dataNodeToEdit.data.fileName && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-medium text-emerald-400">
                      {dataNodeToEdit.data.fileName}
                    </span>
                  </div>
                  {typeof dataNodeToEdit.data?.fileSize === 'number' && (
                    <div className="text-xs text-slate-400 mt-1">
                      {(dataNodeToEdit.data.fileSize / 1024).toFixed(1)} KB
                    </div>
                  )}
                  <button
                    className="mt-2 text-xs text-red-400 hover:text-red-300"
                    onClick={() => {
                      setNodes(nds => nds.map(n =>
                        n.id === dataNodeToEdit.id ? { 
                          ...n, 
                          data: { 
                            ...n.data, 
                            fileName: undefined, 
                            fileSize: undefined, 
                            fileContent: undefined,
                            csvHeaders: undefined
                          } 
                        } : n
                      ));
                      setDataNodeToEdit(n => n ? { 
                        ...n, 
                        data: { 
                          ...n.data, 
                          fileName: undefined, 
                          fileSize: undefined, 
                          fileContent: undefined,
                          csvHeaders: undefined
                        } 
                      } : n);
                    }}
                  >
                    Remove attached file
                  </button>
                </div>
              )}

              {/* Drop Zone for Files */}
              {!(typeof dataNodeToEdit.data?.fileName === 'string' && dataNodeToEdit.data.fileName) && (
                <div 
                  className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center hover:border-emerald-500/50 transition-colors cursor-pointer"
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-emerald-500', 'bg-emerald-500/10'); }}
                  onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-emerald-500', 'bg-emerald-500/10'); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-emerald-500', 'bg-emerald-500/10');
                    const files = e.dataTransfer.files;
                    if (files.length > 0) {
                      const file = files[0];
                      const isJson = file.name.endsWith('.json');
                      const isCsv = file.name.endsWith('.csv');
                      
                      if (isJson || isCsv) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          try {
                            let content: unknown;
                            let description = '';
                            
                            if (isJson) {
                              content = JSON.parse(event.target?.result as string);
                              const recordCount = Array.isArray(content) ? content.length : Object.keys(content as object).length;
                              description = `${recordCount} records from ${file.name}`;
                            } else {
                              const csvText = event.target?.result as string;
                              const lines = csvText.split('\n').filter(line => line.trim());
                              const headers = lines[0]?.split(',').map(h => h.trim().replace(/"/g, ''));
                              content = lines.slice(1).map(line => {
                                const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
                                const row: Record<string, string> = {};
                                headers?.forEach((header, i) => { row[header] = values[i] || ''; });
                                return row;
                              });
                              description = `${(content as unknown[]).length} rows, ${headers?.length || 0} columns from ${file.name}`;
                            }
                            
                            setNodes(nds => nds.map(n =>
                              n.id === dataNodeToEdit.id ? { 
                                ...n, 
                                data: { 
                                  ...n.data, 
                                  fileName: file.name,
                                  fileSize: file.size,
                                  fileContent: content,
                                  sampleDataDescription: description
                                } 
                              } : n
                            ));
                            setDataNodeToEdit(n => n ? { 
                              ...n, 
                              data: { 
                                ...n.data, 
                                fileName: file.name,
                                fileSize: file.size,
                                fileContent: content,
                                sampleDataDescription: description
                              } 
                            } : n);
                          } catch (err) {
                            console.error('Failed to parse file:', err);
                          }
                        };
                        reader.readAsText(file);
                      }
                    }
                  }}
                >
                  <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Drop a JSON or CSV file here</p>
                  <p className="text-xs text-slate-500 mt-1">or leave empty to use AI-generated sample data</p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium"
                onClick={() => setDataNodeToEdit(null)}
              >
                Save
              </button>
              <button
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white rounded-lg"
                onClick={() => setDataNodeToEdit(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
            <Background 
              color={isDark ? '#1e293b' : '#cbd5e1'} 
              gap={20} 
              variant={BackgroundVariant.Dots}
            />
            <Controls 
              className={isDark 
                ? '!bg-slate-800 !border-slate-700 !rounded-xl !shadow-xl' 
                : '!bg-white !border-slate-300 !rounded-xl !shadow-lg'
              }
              showInteractive={false}
            />
            <MiniMap 
              nodeColor={minimapNodeColor}
              maskColor={isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(241, 245, 249, 0.8)'}
              className={isDark 
                ? '!bg-slate-900 !border-slate-700 !rounded-xl'
                : '!bg-white !border-slate-300 !rounded-xl'
              }
            />

            {/* Empty State - shown when canvas is blank and not dismissed */}
            {nodes.length === 0 && !isRunning && showEmptyState && (
              <Panel position="top-center" className="mt-24">
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={cn(
                    'relative text-center p-8 rounded-2xl border-2 border-dashed max-w-md',
                    isDark 
                      ? 'bg-slate-900/80 backdrop-blur-sm border-slate-700'
                      : 'bg-white/80 backdrop-blur-sm border-slate-300'
                  )}
                >
                  {/* Close button */}
                  <button
                    onClick={() => setShowEmptyState(false)}
                    className={cn(
                      'absolute top-3 right-3 p-1.5 rounded-lg transition-colors',
                      isDark 
                        ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200' 
                        : 'hover:bg-slate-200 text-slate-500 hover:text-slate-700'
                    )}
                    title="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-indigo-400" />
                  </div>
                  <h3 className={cn(
                    'text-lg font-bold mb-2',
                    isDark ? 'text-white' : 'text-slate-900'
                  )}>
                    Start Building Your Workflow
                  </h3>
                  <p className={cn(
                    'text-sm mb-4',
                    isDark ? 'text-slate-400' : 'text-slate-600'
                  )}>
                    Drag nodes from the palette on the left, or use the AI Wizard to generate a workflow automatically.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => setShowWizard(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <Wand2 className="w-4 h-4" />
                      AI Wizard
                    </button>
                  </div>
                  <p className={cn(
                    'text-xs mt-4',
                    isDark ? 'text-slate-500' : 'text-slate-500'
                  )}>
                    💡 Tip: Drop a Brain Orchestrator to get started
                  </p>
                </motion.div>
              </Panel>
            )}
            
            {/* Info Panel */}
            <Panel position="bottom-center" className="mb-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'px-4 py-2 backdrop-blur-sm border rounded-full text-xs flex items-center gap-3',
                  isDark 
                    ? 'bg-slate-800/90 border-slate-700 text-slate-400'
                    : 'bg-white/90 border-slate-300 text-slate-600'
                )}
              >
                <span className={cn(
                  isRunning ? 'text-green-400' : (isDark ? 'text-slate-400' : 'text-slate-500')
                )}>
                  {isRunning ? 'Running' : 'Ready'}
                </span>

                {selectedNodeId && (
                  <button
                    onClick={() => handleDeleteNode()}
                    className={cn(
                      'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors',
                      isDark
                        ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                        : 'bg-red-100 text-red-600 hover:bg-red-200'
                    )}
                    title="Delete selected node"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete Node
                  </button>
                )}
              </motion.div>
            </Panel>
          </ReactFlow>
        </div>
      </div>

      {/* Brain Instruction Modal */}
      {selectedBrain && (
        <BrainModal
          node={selectedBrain}
          onClose={() => setSelectedBrain(null)}
          onSave={handleSaveBrainInstructions}
          onDelete={handleDeleteNode}
        />
      )}

      {/* Workflow Wizard Modal */}
      {showWizard && (
        <WorkflowWizard
          onSelectWorkflow={handleWizardSelect}
          onClose={() => setShowWizard(false)}
        />
      )}

      {/* Upgrade Modal - shown when user has no credits remaining */}
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        currentTier={creditsInfo.tier}
        workflowsUsed={creditsInfo.workflowsUsed}
        workflowsLimit={creditsInfo.workflowsLimit}
      />

      {/* AI Processing Overlay */}
      {isWaitingForAI && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900/95 border border-slate-700 rounded-xl p-8 flex flex-col items-center gap-4 shadow-2xl"
          >
            <div className="relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full"
              />
              <Brain className="w-8 h-8 text-indigo-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-white mb-1">Processing with AI</h3>
              <p className="text-sm text-slate-400">Gemini is analyzing your workflow...</p>
              <p className="text-xs text-slate-500 mt-2">This may take 10-20 seconds</p>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Error Toast */}
      {runError && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-4 right-4 z-50 bg-red-900/95 border border-red-700 rounded-lg p-4 shadow-2xl max-w-md"
        >
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-red-200 mb-1">Workflow Execution Failed</h4>
              <p className="text-sm text-red-300/80">{runError}</p>
            </div>
            <button
              onClick={() => setRunError(null)}
              className="text-red-400 hover:text-red-300 p-1"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* AI Analysis Results Panel */}
      {showResults && analysisResult && (
        <motion.div
          initial={{ opacity: 0, x: 400 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 400 }}
          className="fixed right-0 top-0 h-full w-[500px] bg-slate-900/95 backdrop-blur-sm border-l border-slate-700 shadow-2xl z-50 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-100">Analysis Complete</h3>
                <p className="text-xs text-slate-400">Powered by Gemini AI</p>
              </div>
            </div>
            <button
              onClick={() => setShowResults(false)}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          {/* Results Content - Using new Analysis Results Renderer */}
          <div className="flex-1 overflow-y-auto p-4">
            <AnalysisResultsRenderer analysisResult={analysisResult} />
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-700">
            {/* Export Dropdown */}
            <div className="relative mb-3">
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                <Download className="w-3 h-3" />
                Export Results
              </div>
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => exportAsCSV(analysisResult, workflowName)}
                  className="flex flex-col items-center gap-1 p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors group"
                >
                  <FileSpreadsheet className="w-4 h-4 text-green-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs text-slate-300">CSV</span>
                </button>
                <button
                  onClick={() => exportAsJSON(analysisResult, workflowName, { nodesCount: nodes.length })}
                  className="flex flex-col items-center gap-1 p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors group"
                >
                  <FileJson className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs text-slate-300">JSON</span>
                </button>
                <button
                  onClick={() => exportAsExcel(analysisResult, workflowName)}
                  className="flex flex-col items-center gap-1 p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors group"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs text-slate-300">Excel</span>
                </button>
                <button
                  onClick={async () => {
                    const success = await copyToClipboard(analysisResult)
                    if (success) {
                      // Could add a toast notification here
                      alert('Copied to clipboard!')
                    }
                  }}
                  className="flex flex-col items-center gap-1 p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors group"
                >
                  <Copy className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs text-slate-300">Copy</span>
                </button>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3">
              <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors text-sm font-medium">
                <Save className="w-4 h-4" />
                Save Analysis
              </button>
              <button className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-lg transition-colors text-sm font-medium">
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Workflow Explanation Modal */}
      {showExplanation && workflowExplanation && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl">
                  <Sparkles className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Workflow Explanation</h2>
                  <p className="text-sm text-slate-400">{workflowName}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowExplanation(false)} 
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <WorkflowExplanationRenderer explanation={workflowExplanation} />
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 flex justify-end gap-3">
              <button 
                onClick={() => setShowExplanation(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Got it
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Custom Module Creation Modal */}
      <CreateModuleModal
        isOpen={showCreateModule}
        onClose={() => setShowCreateModule(false)}
        onSave={handleSaveCustomModule}
      />
    </div>
  )
}

// Wrap with ReactFlowProvider
export default function WorkflowEditorPage() {
  return (
    <ReactFlowProvider>
      <div className="h-[calc(100vh-4rem)] min-h-0 overflow-hidden">
        <WorkflowCanvas />
      </div>
    </ReactFlowProvider>
  )
}
