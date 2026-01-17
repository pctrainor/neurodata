'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Code2,
  Sparkles,
  Brain,
  Database,
  Zap,
  BarChart3,
  FileOutput,
  Package,
  Save,
  AlertCircle,
  ChevronRight,
  Settings2,
  Lightbulb,
  Check
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

export interface CustomModuleDefinition {
  id: string
  name: string
  description: string
  category: 'data' | 'preprocessing' | 'analysis' | 'ml' | 'output' | 'custom'
  icon: 'brain' | 'database' | 'zap' | 'chart' | 'output' | 'sparkles' | 'code'
  behavior: string
  inputs: ModuleInput[]
  outputs: ModuleOutput[]
  color: string
  createdAt: Date
  nodeType?: string // Original node type for deduplication
}

interface ModuleInput {
  id: string
  name: string
  type: 'data' | 'signal' | 'config' | 'any'
  required: boolean
}

interface ModuleOutput {
  id: string
  name: string
  type: 'data' | 'signal' | 'report' | 'any'
}

interface CreateModuleModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (module: CustomModuleDefinition) => void
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORY_OPTIONS = [
  { value: 'data', label: 'Data Source', icon: Database, color: 'text-emerald-400' },
  { value: 'preprocessing', label: 'Preprocessing', icon: Zap, color: 'text-yellow-400' },
  { value: 'analysis', label: 'Analysis', icon: BarChart3, color: 'text-cyan-400' },
  { value: 'ml', label: 'Machine Learning', icon: Sparkles, color: 'text-pink-400' },
  { value: 'output', label: 'Output', icon: FileOutput, color: 'text-orange-400' },
  { value: 'custom', label: 'Custom Logic', icon: Code2, color: 'text-indigo-400' },
]

const ICON_OPTIONS = [
  { value: 'brain', icon: Brain, color: 'text-purple-400' },
  { value: 'database', icon: Database, color: 'text-emerald-400' },
  { value: 'zap', icon: Zap, color: 'text-yellow-400' },
  { value: 'chart', icon: BarChart3, color: 'text-cyan-400' },
  { value: 'output', icon: FileOutput, color: 'text-orange-400' },
  { value: 'sparkles', icon: Sparkles, color: 'text-pink-400' },
  { value: 'code', icon: Code2, color: 'text-indigo-400' },
]

const COLOR_OPTIONS = [
  { value: 'purple', class: 'bg-purple-500', border: 'border-purple-500' },
  { value: 'emerald', class: 'bg-emerald-500', border: 'border-emerald-500' },
  { value: 'cyan', class: 'bg-cyan-500', border: 'border-cyan-500' },
  { value: 'pink', class: 'bg-pink-500', border: 'border-pink-500' },
  { value: 'amber', class: 'bg-amber-500', border: 'border-amber-500' },
  { value: 'indigo', class: 'bg-indigo-500', border: 'border-indigo-500' },
  { value: 'rose', class: 'bg-rose-500', border: 'border-rose-500' },
]

// ============================================================================
// COMPONENT
// ============================================================================

export default function CreateModuleModal({ isOpen, onClose, onSave }: CreateModuleModalProps) {
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<CustomModuleDefinition['category']>('custom')
  const [icon, setIcon] = useState<CustomModuleDefinition['icon']>('code')
  const [color, setColor] = useState('indigo')
  const [behavior, setBehavior] = useState('')
  const [inputs, setInputs] = useState<ModuleInput[]>([
    { id: '1', name: 'Input Data', type: 'any', required: true }
  ])
  const [outputs, setOutputs] = useState<ModuleOutput[]>([
    { id: '1', name: 'Output', type: 'any' }
  ])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const totalSteps = 3

  const validateStep = (stepNum: number): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (stepNum === 1) {
      if (!name.trim()) newErrors.name = 'Module name is required'
      if (name.length > 50) newErrors.name = 'Name must be under 50 characters'
      if (!description.trim()) newErrors.description = 'Description is required'
    }
    
    if (stepNum === 2) {
      if (!behavior.trim()) newErrors.behavior = 'Please describe what this module should do'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(step) && step < totalSteps) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleSave = () => {
    if (!validateStep(step)) return

    const module: CustomModuleDefinition = {
      id: `custom-${Date.now()}`,
      name,
      description,
      category,
      icon,
      behavior,
      inputs,
      outputs,
      color,
      createdAt: new Date(),
    }

    onSave(module)
    handleReset()
  }

  const handleReset = () => {
    setStep(1)
    setName('')
    setDescription('')
    setCategory('custom')
    setIcon('code')
    setColor('indigo')
    setBehavior('')
    setInputs([{ id: '1', name: 'Input Data', type: 'any', required: true }])
    setOutputs([{ id: '1', name: 'Output', type: 'any' }])
    setErrors({})
  }

  const addInput = () => {
    setInputs([...inputs, { id: String(Date.now()), name: '', type: 'any', required: false }])
  }

  const addOutput = () => {
    setOutputs([...outputs, { id: String(Date.now()), name: '', type: 'any' }])
  }

  const removeInput = (id: string) => {
    if (inputs.length > 1) {
      setInputs(inputs.filter(i => i.id !== id))
    }
  }

  const removeOutput = (id: string) => {
    if (outputs.length > 1) {
      setOutputs(outputs.filter(o => o.id !== id))
    }
  }

  const selectedCategory = CATEGORY_OPTIONS.find(c => c.value === category)
  const SelectedIcon = ICON_OPTIONS.find(i => i.value === icon)?.icon || Code2
  const selectedColor = COLOR_OPTIONS.find(c => c.value === color)

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl">
                <Package className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Create Custom Module</h2>
                <p className="text-sm text-slate-400">Step {step} of {totalSteps}</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="px-5 pt-4">
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((s) => (
                <React.Fragment key={s}>
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                    s < step ? 'bg-indigo-500 text-white' :
                    s === step ? 'bg-indigo-500/20 border-2 border-indigo-500 text-indigo-400' :
                    'bg-slate-800 text-slate-500'
                  )}>
                    {s < step ? <Check className="w-4 h-4" /> : s}
                  </div>
                  {s < 3 && (
                    <div className={cn(
                      'flex-1 h-0.5 rounded',
                      s < step ? 'bg-indigo-500' : 'bg-slate-800'
                    )} />
                  )}
                </React.Fragment>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-slate-500">
              <span>Basic Info</span>
              <span>Behavior</span>
              <span>Connections</span>
            </div>
          </div>

          {/* Content */}
          <div className="p-5 overflow-y-auto max-h-[50vh]">
            {/* Step 1: Basic Info */}
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-5"
              >
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Module Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Custom EEG Filter"
                    className={cn(
                      'w-full px-4 py-2.5 bg-slate-800 border rounded-lg text-white placeholder:text-slate-500',
                      'focus:outline-none focus:ring-2 focus:ring-indigo-500/50',
                      errors.name ? 'border-red-500' : 'border-slate-700'
                    )}
                  />
                  {errors.name && (
                    <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What does this module do?"
                    rows={2}
                    className={cn(
                      'w-full px-4 py-2.5 bg-slate-800 border rounded-lg text-white placeholder:text-slate-500 resize-none',
                      'focus:outline-none focus:ring-2 focus:ring-indigo-500/50',
                      errors.description ? 'border-red-500' : 'border-slate-700'
                    )}
                  />
                  {errors.description && (
                    <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.description}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Category
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {CATEGORY_OPTIONS.map((cat) => (
                      <button
                        key={cat.value}
                        onClick={() => setCategory(cat.value as any)}
                        className={cn(
                          'flex items-center gap-2 p-3 border rounded-lg transition-colors text-left',
                          category === cat.value
                            ? 'bg-indigo-500/20 border-indigo-500/50 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                        )}
                      >
                        <cat.icon className={cn('w-4 h-4', cat.color)} />
                        <span className="text-xs">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Icon
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {ICON_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setIcon(opt.value as any)}
                          className={cn(
                            'p-2.5 border rounded-lg transition-colors',
                            icon === opt.value
                              ? 'bg-indigo-500/20 border-indigo-500/50'
                              : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                          )}
                        >
                          <opt.icon className={cn('w-5 h-5', opt.color)} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Color
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {COLOR_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setColor(opt.value)}
                          className={cn(
                            'w-8 h-8 rounded-lg transition-all',
                            opt.class,
                            color === opt.value
                              ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110'
                              : 'hover:scale-105'
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                  <p className="text-xs text-slate-500 mb-2">Preview</p>
                  <div className={cn(
                    'flex items-center gap-3 p-3 border rounded-lg',
                    `bg-${color}-500/10 border-${color}-500/30`
                  )}>
                    <SelectedIcon className={cn('w-5 h-5', `text-${color}-400`)} />
                    <div>
                      <p className="text-sm font-medium text-white">{name || 'Module Name'}</p>
                      <p className="text-xs text-slate-400">{description || 'Description'}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Behavior */}
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-5"
              >
                <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-indigo-300">Define the behavior</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Describe what this module should do in natural language. In a future update, 
                        you&apos;ll be able to write custom scripts in Python, JavaScript, or R.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    What should this module do? *
                  </label>
                  <textarea
                    value={behavior}
                    onChange={(e) => setBehavior(e.target.value)}
                    placeholder="e.g., Take the input EEG signal and apply a custom bandpass filter between 0.5-45Hz, then calculate the power spectral density for each frequency band (delta, theta, alpha, beta, gamma)."
                    rows={6}
                    className={cn(
                      'w-full px-4 py-3 bg-slate-800 border rounded-lg text-white placeholder:text-slate-500 resize-none',
                      'focus:outline-none focus:ring-2 focus:ring-indigo-500/50',
                      errors.behavior ? 'border-red-500' : 'border-slate-700'
                    )}
                  />
                  {errors.behavior && (
                    <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.behavior}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 mt-2">
                    The more specific you are, the better the AI can execute your module.
                  </p>
                </div>

                {/* Coming Soon: Scripting */}
                <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg opacity-60">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-400">Custom Scripting</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full">
                      Coming Soon
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Write custom Python, JavaScript, or R scripts to define exact behavior. 
                    Your scripts can interact with other nodes and process data in real-time.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step 3: Connections */}
            {step === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-5"
              >
                {/* Inputs */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-slate-300">
                      Inputs (data this module receives)
                    </label>
                    <button
                      onClick={addInput}
                      className="text-xs text-indigo-400 hover:text-indigo-300"
                    >
                      + Add Input
                    </button>
                  </div>
                  <div className="space-y-2">
                    {inputs.map((input, idx) => (
                      <div key={input.id} className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                          <ChevronRight className="w-3 h-3 text-emerald-400" />
                        </div>
                        <input
                          type="text"
                          value={input.name}
                          onChange={(e) => {
                            const newInputs = [...inputs]
                            newInputs[idx].name = e.target.value
                            setInputs(newInputs)
                          }}
                          placeholder="Input name"
                          className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500"
                        />
                        <select
                          value={input.type}
                          onChange={(e) => {
                            const newInputs = [...inputs]
                            newInputs[idx].type = e.target.value as any
                            setInputs(newInputs)
                          }}
                          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
                        >
                          <option value="any">Any</option>
                          <option value="data">Data</option>
                          <option value="signal">Signal</option>
                          <option value="config">Config</option>
                        </select>
                        <label className="flex items-center gap-1 text-xs text-slate-400">
                          <input
                            type="checkbox"
                            checked={input.required}
                            onChange={(e) => {
                              const newInputs = [...inputs]
                              newInputs[idx].required = e.target.checked
                              setInputs(newInputs)
                            }}
                            className="rounded border-slate-600 bg-slate-800"
                          />
                          Required
                        </label>
                        {inputs.length > 1 && (
                          <button
                            onClick={() => removeInput(input.id)}
                            className="p-1 text-slate-500 hover:text-red-400"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Outputs */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-slate-300">
                      Outputs (data this module produces)
                    </label>
                    <button
                      onClick={addOutput}
                      className="text-xs text-indigo-400 hover:text-indigo-300"
                    >
                      + Add Output
                    </button>
                  </div>
                  <div className="space-y-2">
                    {outputs.map((output, idx) => (
                      <div key={output.id} className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                          <ChevronRight className="w-3 h-3 text-orange-400 rotate-180" />
                        </div>
                        <input
                          type="text"
                          value={output.name}
                          onChange={(e) => {
                            const newOutputs = [...outputs]
                            newOutputs[idx].name = e.target.value
                            setOutputs(newOutputs)
                          }}
                          placeholder="Output name"
                          className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500"
                        />
                        <select
                          value={output.type}
                          onChange={(e) => {
                            const newOutputs = [...outputs]
                            newOutputs[idx].type = e.target.value as any
                            setOutputs(newOutputs)
                          }}
                          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
                        >
                          <option value="any">Any</option>
                          <option value="data">Data</option>
                          <option value="signal">Signal</option>
                          <option value="report">Report</option>
                        </select>
                        {outputs.length > 1 && (
                          <button
                            onClick={() => removeOutput(output.id)}
                            className="p-1 text-slate-500 hover:text-red-400"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                  <p className="text-xs text-slate-500 mb-3">Module Summary</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-400">Name</p>
                      <p className="text-white font-medium">{name}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Category</p>
                      <p className="text-white font-medium">{selectedCategory?.label}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Inputs</p>
                      <p className="text-white font-medium">{inputs.length}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Outputs</p>
                      <p className="text-white font-medium">{outputs.length}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-5 border-t border-slate-800">
            <button
              onClick={step > 1 ? handleBack : onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              {step > 1 ? 'Back' : 'Cancel'}
            </button>
            <div className="flex gap-3">
              {step < totalSteps ? (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  <Save className="w-4 h-4" />
                  Create Module
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
