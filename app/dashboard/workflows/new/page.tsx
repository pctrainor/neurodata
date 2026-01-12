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
  X
} from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import WorkflowSidebar from '@/components/workflow/workflow-sidebar'
import { nodeTypes } from '@/components/workflow/custom-nodes'
import BrainModal, { BrainInstructions } from '@/components/workflow/brain-modal'
import WorkflowWizard from '@/components/workflow/workflow-wizard'
import WorkflowExplanationRenderer from '@/components/workflow/workflow-explanation-renderer'
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

// Initial nodes for demo
const initialNodes: Node[] = [
  { 
    id: 'data-1', 
    type: 'dataNode', 
    position: { x: 100, y: 200 }, 
    data: { label: 'Patient_001.edf', subType: 'file' } 
  },
  { 
    id: 'brain-1', 
    type: 'brainNode', 
    position: { x: 400, y: 150 }, 
    data: { label: 'EEG Analyzer', prompt: '', model: 'gemini-2.0-flash', computeTier: 'cpu-standard' } 
  },
  { 
    id: 'preprocess-1', 
    type: 'preprocessingNode', 
    position: { x: 400, y: 300 }, 
    data: { label: 'Bandpass Filter', category: 'preprocessing', status: 'idle' } 
  },
]

const initialEdges: Edge[] = [
  { id: 'e1-2', source: 'data-1', target: 'brain-1', ...edgeOptions },
  { id: 'e1-3', source: 'data-1', target: 'preprocess-1', ...edgeOptions },
]

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
  
  // Workflow state (must be before useEffect that uses setWorkflowName)
  const [workflowName, setWorkflowName] = useState('Untitled Workflow')
  const [isSaving, setIsSaving] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [isExplaining, setIsExplaining] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [analysisResult, setAnalysisResult] = useState<string | null>(null)
  const [perNodeResults, setPerNodeResults] = useState<Record<string, any>>({})
  const [showResults, setShowResults] = useState(false)
  const [workflowExplanation, setWorkflowExplanation] = useState<string | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)
  
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

  // Handle drop from palette
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      const type = event.dataTransfer.getData('application/reactflow')
      const payloadStr = event.dataTransfer.getData('application/payload')

      if (!type || !payloadStr) return

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
    // Optionally: open modal for news node on click (if you want single click)
    // if (node.type === 'contentUrlInputNode' || (node.data && node.data.subType === 'url')) {
    //   setNewsNodeToEdit(node)
    // }
  }, [])

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
          setSaveStatus('error')
          console.log('Database not configured - running in demo mode')
          return
        }
        throw new Error(result.error || 'Failed to save workflow')
      }

      // Store the workflow ID for future updates
      if (result.workflowId) {
        setWorkflowId(result.workflowId)
      }
      
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

      const response = await fetch('/api/workflows/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Workflow execution failed')
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
      setShowResults(true)

    } catch (error) {
      console.error('Workflow execution error:', error)
      
      // Mark nodes as failed
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          data: { ...n.data, status: 'failed', progress: 0 },
        }))
      )
    } finally {
      setIsRunning(false)
    }
  }

  // Reset workflow
  const handleResetWorkflow = () => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, status: 'idle', progress: 0 },
      }))
    )
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
    // Get the full template definition, which may have dynamically generated nodes
    const fullTemplate = getTemplateById(suggestion.id)
    if (!fullTemplate) {
      console.error(`Template with id ${suggestion.id} not found.`)
      return
    }

    const newNodes = fullTemplate.nodes.map((node: Node, index: number) => ({
      ...node,
      id: `${node.type}-${Date.now()}-${index}`, // Ensure unique IDs
    }))

    // The edges from the full template are already correctly formatted
    const newEdges = (fullTemplate.edges || []).map((edge: Edge, index: number) => ({
      ...edge,
      id: `e-wizard-${Date.now()}-${index}`, // Ensure unique IDs
    }))

    setNodes(newNodes)
    setEdges(newEdges)
    setWorkflowName(suggestion.name)
    setShowWizard(false)
    
    // Fit view after nodes are rendered with smart zoom
    setTimeout(() => fitView(getSmartZoomOptions(newNodes.length)), 150)
  }, [setNodes, setEdges, fitView])

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
      {/* Sidebar */}
      <WorkflowSidebar />
      
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
                <span>
                  {nodes.length} nodes • {edges.length} connections •
                  <span className={cn(
                    'ml-1',
                    isRunning ? 'text-green-400' : (isDark ? 'text-slate-400' : 'text-slate-500')
                  )}>
                    {isRunning ? '🟢 Running' : '⚪ Ready'}
                  </span>
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

          {/* Results Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="prose prose-invert prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-slate-300 leading-relaxed">
                {analysisResult}
              </div>
            </div>
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
