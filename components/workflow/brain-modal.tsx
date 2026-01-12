'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Brain, 
  X, 
  Sparkles, 
  Cpu, 
  Zap,
  Save,
  Trash2,
  ChevronDown
} from 'lucide-react'
import { Node } from '@xyflow/react'
import { cn } from '@/lib/utils'

interface BrainModalProps {
  node: Node | null
  onClose: () => void
  onSave: (nodeId: string, data: BrainInstructions) => void
  onDelete?: (nodeId: string) => void
}

export interface BrainInstructions {
  prompt: string
  model: string
  computeTier: string
  temperature: number
  maxTokens: number
}

const modelOptions = [
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', description: 'Fast, efficient' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', description: 'Best for reasoning' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: 'OpenAI flagship' },
  { value: 'claude-3.5-sonnet', label: 'Claude 3.5 Sonnet', description: 'Anthropic best' },
  { value: 'llama-3.1-70b', label: 'Llama 3.1 70B', description: 'Open source' },
]

const computeOptions = [
  { value: 'cpu-standard', label: 'Standard (CPU)', icon: Cpu, cores: '2 vCPU, 4GB RAM' },
  { value: 'cpu-performance', label: 'Performance (CPU)', icon: Cpu, cores: '8 vCPU, 16GB RAM' },
  { value: 'gpu-t4', label: 'GPU (NVIDIA T4)', icon: Zap, cores: '16GB VRAM' },
  { value: 'gpu-a100', label: 'GPU (NVIDIA A100)', icon: Zap, cores: '40GB VRAM' },
]

export default function BrainModal({ node, onClose, onSave, onDelete }: BrainModalProps) {
  const [instructions, setInstructions] = useState<BrainInstructions>({
    prompt: '',
    model: 'gemini-2.0-flash',
    computeTier: 'cpu-standard',
    temperature: 0.7,
    maxTokens: 4096,
  })

  // Load existing data when node changes
  useEffect(() => {
    if (node?.data) {
      setInstructions({
        prompt: (node.data.prompt as string) || '',
        model: (node.data.model as string) || 'gemini-2.0-flash',
        computeTier: (node.data.computeTier as string) || 'cpu-standard',
        temperature: (node.data.temperature as number) || 0.7,
        maxTokens: (node.data.maxTokens as number) || 4096,
      })
    }
  }, [node])

  const handleSave = () => {
    if (node) {
      onSave(node.id, instructions)
      onClose()
    }
  }

  const handleDelete = () => {
    if (node && onDelete) {
      onDelete(node.id)
      onClose()
    }
  }

  if (!node) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-xl bg-slate-900/95 backdrop-blur-xl border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-500/10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-500/20 rounded-xl">
                <Brain className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Brain Instructions</h3>
                <p className="text-xs text-slate-400">{node.data.label as string}</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5 text-slate-400 hover:text-white" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-5">
            {/* Natural Language Goal */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Natural Language Goal
              </label>
              <textarea
                value={instructions.prompt}
                onChange={(e) => setInstructions({ ...instructions, prompt: e.target.value })}
                className={cn(
                  'w-full h-32 bg-slate-800/50 border border-slate-700 rounded-xl p-4',
                  'text-sm text-slate-200 placeholder:text-slate-500',
                  'focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none',
                  'resize-none transition-all'
                )}
                placeholder="e.g., Take the EEG file, remove eye blink artifacts using ICA, compute the power spectral density, and tell me if the subject shows signs of drowsiness based on increased theta/alpha ratio..."
              />
              <p className="text-xs text-slate-500 mt-2">
                Describe what you want this agent to do with the connected data
              </p>
            </div>

            {/* Model & Compute Selection */}
            <div className="grid grid-cols-2 gap-4">
              {/* Agent Model */}
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Agent Model
                </label>
                <div className="relative">
                  <select
                    value={instructions.model}
                    onChange={(e) => setInstructions({ ...instructions, model: e.target.value })}
                    className={cn(
                      'w-full appearance-none bg-slate-800/50 border border-slate-700 rounded-xl',
                      'p-3 pr-10 text-sm text-slate-200 outline-none',
                      'focus:ring-2 focus:ring-purple-500 focus:border-transparent',
                      'cursor-pointer transition-all'
                    )}
                  >
                    {modelOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {modelOptions.find(m => m.value === instructions.model)?.description}
                </p>
              </div>

              {/* Compute Power */}
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Compute Power
                </label>
                <div className="relative">
                  <select
                    value={instructions.computeTier}
                    onChange={(e) => setInstructions({ ...instructions, computeTier: e.target.value })}
                    className={cn(
                      'w-full appearance-none bg-slate-800/50 border border-slate-700 rounded-xl',
                      'p-3 pr-10 text-sm text-slate-200 outline-none',
                      'focus:ring-2 focus:ring-purple-500 focus:border-transparent',
                      'cursor-pointer transition-all'
                    )}
                  >
                    {computeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {computeOptions.find(c => c.value === instructions.computeTier)?.cores}
                </p>
              </div>
            </div>

            {/* Advanced Settings */}
            <div className="pt-3 border-t border-slate-800">
              <details className="group">
                <summary className="text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer list-none flex items-center gap-2">
                  <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                  Advanced Settings
                </summary>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 block mb-2">
                      Temperature: {instructions.temperature}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={instructions.temperature}
                      onChange={(e) => setInstructions({ ...instructions, temperature: parseFloat(e.target.value) })}
                      className="w-full accent-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-2">
                      Max Tokens: {instructions.maxTokens}
                    </label>
                    <input
                      type="range"
                      min="256"
                      max="8192"
                      step="256"
                      value={instructions.maxTokens}
                      onChange={(e) => setInstructions({ ...instructions, maxTokens: parseInt(e.target.value) })}
                      className="w-full accent-purple-500"
                    />
                  </div>
                </div>
              </details>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-5 border-t border-slate-800 bg-slate-900/50 rounded-b-2xl">
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg text-sm transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete Node
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-slate-400 hover:text-white text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Save Instructions
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
