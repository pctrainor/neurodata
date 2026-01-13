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
  AlertTriangle,
  Trash2,
  Brain,
  Database,
  Zap,
  BarChart3,
  FileOutput,
  Code2
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

import NodePalette, { DraggableNodeItem } from '@/components/workflow/node-palette'
import { nodeTypes } from '@/components/workflow/custom-nodes'
import BrainModal, { BrainInstructions } from '@/components/workflow/brain-modal'
import WorkflowWizard from '@/components/workflow/workflow-wizard'
import { cn } from '@/lib/utils'
import { getTemplateById } from '@/lib/workflow-templates'

// Custom module type definition (shared with new/page.tsx)
interface CustomModuleDefinition {
  id: string
  name: string
  description: string
  category: string
  icon: string
  behavior: string
  inputs: { id: string; name: string; type: string; required: boolean }[]
  outputs: { id: string; name: string; type: string }[]
  color: string
  createdAt: Date
}

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

interface WorkflowData {
  id: string
  name: string
  description?: string
  status: string
  is_template: boolean
  is_public: boolean
  tags?: string[]
  nodes: Array<{
    id: string
    name: string
    category: string
    position_x: number
    position_y: number
    config_values: Record<string, unknown>
  }>
  edges: Array<{
    id: string
    source_node_id: string
    target_node_id: string
    source_handle?: string
    target_handle?: string
  }>
}

// Map DB categories back to React Flow node types
const categoryToNodeType: Record<string, string> = {
  ml_inference: 'brainNode',
  input_source: 'dataNode',
  preprocessing: 'preprocessingNode',
  analysis: 'analysisNode',
  output_sink: 'outputNode',
}

function WorkflowCanvas() {
  const params = useParams()
  const workflowId = params.id as string
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const { screenToFlowPosition, fitView } = useReactFlow()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  
  // Workflow metadata
  const [workflowName, setWorkflowName] = useState('Loading...')
  const [workflowDescription, setWorkflowDescription] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isDemoMode, setIsDemoMode] = useState(false)
  
  // Save state
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  
  // Brain modal state
  const [showBrainModal, setShowBrainModal] = useState(false)
  const [selectedBrainNode, setSelectedBrainNode] = useState<Node | null>(null)
  
  // Selected node for deletion
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  
  // Wizard state
  const [showWizard, setShowWizard] = useState(false)
  
  // Running state
  const [isRunning, setIsRunning] = useState(false)
  
  // Custom modules state (shared across workflows via localStorage)
  const [customModules, setCustomModules] = useState<CustomModuleDefinition[]>([])
  
  // Load custom modules from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('neurodata_custom_modules')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const restored = parsed.map((m: CustomModuleDefinition) => ({
            ...m,
            createdAt: new Date(m.createdAt)
          }))
          setCustomModules(restored)
        }
      }
    } catch (e) {
      console.warn('Failed to load custom modules from localStorage:', e)
    }
  }, [])
  
  // Convert custom modules to draggable node items format
  const customModuleNodes = useMemo((): DraggableNodeItem[] => {
    const iconMap: Record<string, React.ElementType> = {
      brain: Brain,
      database: Database,
      zap: Zap,
      chart: BarChart3,
      output: FileOutput,
      sparkles: Sparkles,
      code: Code2,
    }
    
    return customModules.map(module => ({
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
      tags: ['custom', 'ai-generated'],
      id: module.id
    }))
  }, [customModules])
  
  // Delete a custom module by ID
  const handleDeleteCustomModule = useCallback((moduleId: string) => {
    setCustomModules(prev => {
      const updated = prev.filter(m => m.id !== moduleId)
      try {
        localStorage.setItem('neurodata_custom_modules', JSON.stringify(updated))
      } catch (e) {
        console.warn('Failed to update localStorage after deletion:', e)
      }
      return updated
    })
  }, [])

  // Load workflow data
  useEffect(() => {
    const loadWorkflow = async () => {
      try {
        setIsLoading(true)
        setLoadError(null)
        
        const response = await fetch(`/api/workflows/${workflowId}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            // Check if this is a demo/template ID pattern
            if (workflowId.startsWith('b0000001') || workflowId.includes('template')) {
              setIsDemoMode(true)

              // For "static" marketplace/template routes we still want a realistic, fully wired graph.
              // Default to the EEG pipeline template (matches the card users click).
              const template = getTemplateById('eeg-cleaning-pipeline')
              if (template) {
                setWorkflowName(template.name)
                setWorkflowDescription(template.description)
                setNodes(template.nodes)
                setEdges(template.edges)
              } else {
                setWorkflowName('Demo Workflow')
                setWorkflowDescription('This is a demo workflow. Database features are not available in demo mode.')
                setNodes([
                  { 
                    id: 'demo-1', 
                    type: 'dataNode', 
                    position: { x: 100, y: 200 }, 
                    data: { label: 'Sample Data', subType: 'file' } 
                  },
                  { 
                    id: 'demo-2', 
                    type: 'brainNode', 
                    position: { x: 400, y: 200 }, 
                    data: { label: 'AI Analyzer' } 
                  },
                ])
                setEdges([
                  { id: 'demo-e1', source: 'demo-1', target: 'demo-2', ...edgeOptions }
                ])
              }

              setIsLoading(false)
              return
            }
            throw new Error('Workflow not found')
          }
          throw new Error('Failed to load workflow')
        }
        
        const data: WorkflowData = await response.json()
        
        setWorkflowName(data.name)
        setWorkflowDescription(data.description || '')
        
        // Convert DB nodes to React Flow nodes
        const flowNodes: Node[] = data.nodes.map(node => ({
          id: node.id,
          type: categoryToNodeType[node.category] || 'preprocessingNode',
          position: { x: node.position_x, y: node.position_y },
          data: {
            label: node.name,
            ...node.config_values,
          }
        }))
        
        // Convert DB edges to React Flow edges
        // Note: Don't pass sourceHandle/targetHandle if they're default values,
        // as our custom nodes use default handles without explicit IDs
        const flowEdges: Edge[] = data.edges.map(edge => ({
          id: edge.id,
          source: edge.source_node_id,
          target: edge.target_node_id,
          // Only include handles if they're non-default values
          ...(edge.source_handle && edge.source_handle !== 'output' ? { sourceHandle: edge.source_handle } : {}),
          ...(edge.target_handle && edge.target_handle !== 'input' ? { targetHandle: edge.target_handle } : {}),
          ...edgeOptions,
        }))
        
        setNodes(flowNodes)
        setEdges(flowEdges)
        
      } catch (error) {
        console.error('Error loading workflow:', error)
        setLoadError(error instanceof Error ? error.message : 'Failed to load workflow')
      } finally {
        setIsLoading(false)
      }
    }
    
    if (workflowId) {
      loadWorkflow()
    }
  }, [workflowId, setNodes, setEdges])

  // Fit view after nodes load
  useEffect(() => {
    if (!isLoading && nodes.length > 0) {
      setTimeout(() => fitView({ padding: 0.2 }), 100)
    }
  }, [isLoading, nodes.length, fitView])

  // Handle connections
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, ...edgeOptions }, eds))
      setSaveStatus('idle')
    },
    [setEdges]
  )

  // Handle drag and drop
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      const nodeType = event.dataTransfer.getData('application/reactflow')
      
      // Only handle node palette drops, not file drops
      // File drops should be handled by individual DataNode components
      if (!nodeType) {
        // Check if this is a file drop - let it bubble to DataNode
        if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
          console.log('[Canvas] File drop detected, letting it bubble to nodes')
          return
        }
        return
      }
      
      event.preventDefault()

      try {
        // Get the payload (may be empty for some node types)
        const payloadStr = event.dataTransfer.getData('application/payload')
        const payload = payloadStr ? JSON.parse(payloadStr) : {}
        
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        })

        const newNode: Node = {
          id: `${nodeType}-${Date.now()}`,
          type: nodeType,
          position,
          data: { label: payload.label || 'New Node', ...payload },
        }

        setNodes((nds) => [...nds, newNode])
        setSaveStatus('idle')
      } catch (e) {
        console.error('Failed to parse node data:', e)
      }
    },
    [screenToFlowPosition, setNodes]
  )

  // Handle node click - select node and optionally open brain modal
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id)
    if (node.type === 'brainNode') {
      setSelectedBrainNode(node)
      setShowBrainModal(true)
    }
  }, [])

  // Handle pane click - deselect nodes
  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null)
  }, [])

  // Delete selected node
  const handleDeleteNode = useCallback(() => {
    if (!selectedNodeId) return
    
    setNodes((nds) => nds.filter((node) => node.id !== selectedNodeId))
    setEdges((eds) => eds.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId))
    setSelectedNodeId(null)
    setSaveStatus('idle')
  }, [selectedNodeId, setNodes, setEdges])

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

  // Handle brain modal save
  const handleBrainModalSave = useCallback((nodeId: string, instructions: BrainInstructions) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              ...instructions,
            },
          }
        }
        return node
      })
    )
    
    setShowBrainModal(false)
    setSelectedBrainNode(null)
    setSaveStatus('idle')
  }, [setNodes])

  // Save workflow
  const handleSaveWorkflow = useCallback(async () => {
    if (isDemoMode) {
      setSaveStatus('error')
      return
    }
    
    setSaveStatus('saving')
    
    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId,
          name: workflowName,
          description: workflowDescription,
          nodes: nodes.map(n => ({
            id: n.id,
            type: n.type,
            position: n.position,
            data: n.data,
          })),
          edges: edges.map(e => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
          })),
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        if (data.demoMode || response.status === 503) {
          setIsDemoMode(true)
        }
        throw new Error(data.message || 'Failed to save')
      }
      
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('Error saving workflow:', error)
      setSaveStatus('error')
    }
  }, [workflowId, workflowName, workflowDescription, nodes, edges, isDemoMode])

  // Reset workflow
  const handleReset = useCallback(() => {
    setNodes([])
    setEdges([])
    setSaveStatus('idle')
  }, [setNodes, setEdges])

  // Run workflow
  const handleRunWorkflow = useCallback(async () => {
    if (isDemoMode) return
    
    setIsRunning(true)
    
    try {
      const response = await fetch('/api/workflows/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId, nodes, edges }),
      })

      if (!response.ok) throw new Error('Failed to run workflow')
      
      // Handle streaming response or polling here
    } catch (error) {
      console.error('Error running workflow:', error)
    } finally {
      setIsRunning(false)
    }
  }, [workflowId, nodes, edges, isDemoMode])

  if (isLoading) {
    return (
      <div className="h-[500px] -m-4 md:-m-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading workflow...</p>
        </div>
      </div>
    )
  }

  if (loadError && !isDemoMode) {
    return (
      <div className="h-[500px] -m-4 md:-m-6 flex items-center justify-center">
        <div className="text-center max-w-md">
          <XCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold mb-2">Failed to Load Workflow</h2>
          <p className="text-muted-foreground mb-4">{loadError}</p>
          <Link
            href="/dashboard/workflows"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Workflows
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden">
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between px-4 py-3 border-b',
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      )}>
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/workflows"
            className={cn(
              'p-2 rounded-lg transition-colors',
              isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
            )}
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <input
              type="text"
              value={workflowName}
              onChange={(e) => {
                setWorkflowName(e.target.value)
                setSaveStatus('idle')
              }}
              className={cn(
                'text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-0',
                isDark ? 'text-white' : 'text-slate-800'
              )}
            />
            {isDemoMode && (
              <div className="flex items-center gap-1.5 text-xs text-amber-500">
                <AlertTriangle className="w-3 h-3" />
                Demo Mode - Database features disabled
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Save status indicator */}
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1.5 text-sm text-green-500">
              <CheckCircle2 className="w-4 h-4" />
              Saved
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1.5 text-sm text-red-500">
              <XCircle className="w-4 h-4" />
              {isDemoMode ? 'Demo mode' : 'Error saving'}
            </span>
          )}
          
          <button
            onClick={() => setShowWizard(true)}
            className={cn(
              'px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors',
              isDark 
                ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30' 
                : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
            )}
          >
            <Wand2 className="w-4 h-4" />
            AI Wizard
          </button>
          
          <button
            onClick={handleReset}
            className={cn(
              'p-2 rounded-lg transition-colors',
              isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
            )}
            title="Reset"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          
          <button
            onClick={handleSaveWorkflow}
            disabled={saveStatus === 'saving' || isDemoMode}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors',
              isDemoMode
                ? 'bg-slate-500/20 text-slate-400 cursor-not-allowed'
                : isDark 
                  ? 'bg-slate-700 hover:bg-slate-600 text-white' 
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
            )}
          >
            <Save className="w-4 h-4" />
            Save
          </button>
          
          <button
            onClick={handleRunWorkflow}
            disabled={isRunning || nodes.length === 0 || isDemoMode}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors',
              nodes.length === 0 || isDemoMode
                ? 'bg-slate-500/20 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500'
            )}
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run Workflow
              </>
            )}
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <NodePalette 
          customModules={customModuleNodes}
          onDeleteCustomModule={handleDeleteCustomModule}
        />
        
        <div ref={reactFlowWrapper} className="flex-1 min-h-0">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={edgeOptions}
            connectionLineStyle={connectionLineStyle}
            fitView
            className={isDark ? 'dark-flow' : ''}
          >
            <Controls className={isDark ? 'dark-controls' : ''} />
            <MiniMap 
              className={isDark ? 'dark-minimap' : ''}
              nodeColor={(node) => {
                switch (node.type) {
                  case 'brainNode': return '#8b5cf6'
                  case 'dataNode': return '#10b981'
                  case 'preprocessingNode': return '#f59e0b'
                  case 'analysisNode': return '#3b82f6'
                  case 'outputNode': return '#ec4899'
                  default: return '#6b7280'
                }
              }}
            />
            <Background 
              variant={BackgroundVariant.Dots} 
              gap={20} 
              size={1}
              color={isDark ? '#334155' : '#e2e8f0'}
            />
            
            <Panel position="bottom-center" className="mb-4">
              <div className={cn(
                'px-4 py-2 rounded-lg text-sm flex items-center gap-3',
                isDark ? 'bg-slate-800/90 text-slate-300' : 'bg-white/90 text-slate-600',
                'shadow-lg backdrop-blur-sm'
              )}>
                <span>
                  {nodes.length} nodes • {edges.length} connections • 
                  <span className={cn(
                    'ml-1',
                    isRunning ? 'text-green-500' : 'text-slate-400'
                  )}>
                    {isRunning ? 'Running' : 'Ready'}
                  </span>
                </span>
                
                {selectedNodeId && (
                  <button
                    onClick={handleDeleteNode}
                    className={cn(
                      'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors',
                      isDark 
                        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                        : 'bg-red-100 text-red-600 hover:bg-red-200'
                    )}
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete Node
                  </button>
                )}
              </div>
            </Panel>
          </ReactFlow>
        </div>
      </div>

      {/* Brain Modal */}
      {showBrainModal && selectedBrainNode && (
        <BrainModal
          node={selectedBrainNode}
          onClose={() => {
            setShowBrainModal(false)
            setSelectedBrainNode(null)
          }}
          onSave={handleBrainModalSave}
        />
      )}

      {/* Workflow Wizard */}
      {showWizard && (
        <WorkflowWizard
          onSelectWorkflow={(suggestion) => {
            // Convert suggestion to nodes/edges
            const newNodes: Node[] = suggestion.nodes.map((n, i) => ({
              id: `wizard-${i}-${Date.now()}`,
              type: n.type,
              position: { x: 150 + (i % 3) * 250, y: 100 + Math.floor(i / 3) * 150 },
              data: n.payload,
            }))
            
            const nodeIdMap = new Map<number, string>()
            newNodes.forEach((n, i) => nodeIdMap.set(i, n.id))
            
            const newEdges: Edge[] = suggestion.connections.map((c, i) => ({
              id: `wizard-edge-${i}-${Date.now()}`,
              source: nodeIdMap.get(c.from) || '',
              target: nodeIdMap.get(c.to) || '',
              ...edgeOptions,
            }))
            
            setNodes(newNodes)
            setEdges(newEdges)
            setWorkflowName(suggestion.name)
            setWorkflowDescription(suggestion.description)
            setShowWizard(false)
            setSaveStatus('idle')
            
            setTimeout(() => fitView({ padding: 0.2 }), 100)
          }}
          onClose={() => setShowWizard(false)}
        />
      )}
    </div>
  )
}

export default function WorkflowDetailPage() {
  return (
    <ReactFlowProvider>
      <div className="h-[calc(100vh-4rem)] min-h-0 overflow-hidden">
        <WorkflowCanvas />
      </div>
    </ReactFlowProvider>
  )
}
