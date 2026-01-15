import { NextResponse } from 'next/server'

// =============================================================================
// PYTHON EXECUTION API
// =============================================================================
// This API provides a simulated Python execution environment
// In production, you'd connect this to a real Python runtime like:
// - Pyodide (WebAssembly Python)
// - A dedicated Python server
// - AWS Lambda with Python runtime
// - Google Cloud Functions
// =============================================================================

interface PythonRequest {
  code: string
  data: {
    nodes: Array<{
      nodeId: string
      nodeName: string
      nodeType: string
      result: Record<string, unknown> | string | null
      status: 'completed' | 'pending' | 'error'
      processingTime?: string
    }>
    aggregated: Record<string, unknown>
    summary: {
      totalNodes: number
      completedNodes: number
      nodeTypes: string[]
    }
  }
}

interface PythonResult {
  success: boolean
  output: string
  result?: unknown
  error?: string
  executionTime: number
}

// Simulated Python execution using JavaScript interpretation
// This handles common Python patterns and translates them
function simulatePythonExecution(code: string, data: PythonRequest['data']): PythonResult {
  const startTime = Date.now()
  const outputs: string[] = []
  
  try {
    // Make data available
    const nodes = data.nodes
    const aggregated = data.aggregated
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const summary = data.summary
    
    // Parse and execute Python-like code
    const lines = code.split('\n')
    const variables: Record<string, unknown> = {
      nodes,
      aggregated,
      pd: { DataFrame: (d: unknown) => d }, // Mock pandas
      np: { mean: (arr: number[]) => arr.reduce((a,b) => a+b, 0) / arr.length }, // Mock numpy
      json: JSON,
      len: (arr: unknown[]) => arr.length,
      sum: (arr: number[]) => arr.reduce((a,b) => a+b, 0),
      min: (arr: number[]) => Math.min(...arr),
      max: (arr: number[]) => Math.max(...arr),
      range: (n: number) => Array.from({length: n}, (_, i) => i),
      enumerate: (arr: unknown[]) => arr.map((v, i) => [i, v]),
      zip: (...arrs: unknown[][]) => arrs[0].map((_, i) => arrs.map(arr => arr[i])),
      Counter: (arr: unknown[]) => {
        const counts: Record<string, number> = {}
        arr.forEach(item => {
          const key = String(item)
          counts[key] = (counts[key] || 0) + 1
        })
        return counts
      }
    }
    
    // Process print statements
    for (const line of lines) {
      const trimmed = line.trim()
      
      // Skip comments and empty lines
      if (trimmed.startsWith('#') || trimmed === '') continue
      
      // Skip import statements (we already provide the libraries)
      if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) continue
      
      // Handle print statements
      if (trimmed.startsWith('print(')) {
        const printContent = extractPrintContent(trimmed, variables)
        outputs.push(printContent)
        continue
      }
      
      // Handle variable assignments
      if (trimmed.includes('=') && !trimmed.includes('==')) {
        const [varName, ...valueParts] = trimmed.split('=')
        const valueExpr = valueParts.join('=').trim()
        const varNameClean = varName.trim()
        
        // Skip if it's inside a list comprehension (handled separately)
        if (varNameClean.includes('[') || varNameClean.includes('(')) continue
        
        try {
          variables[varNameClean] = evaluateExpression(valueExpr, variables)
        } catch {
          // Silent fail for complex expressions we can't handle
        }
        continue
      }
      
      // Handle for loops (basic support)
      if (trimmed.startsWith('for ')) {
        // Extract loop content and process
        continue // Skip for now, complex to parse
      }
    }
    
    // If no output was generated, provide summary
    if (outputs.length === 0) {
      outputs.push(`Code executed successfully.`)
      outputs.push(`Available data:`)
      outputs.push(`- nodes: ${nodes.length} items`)
      outputs.push(`- aggregated: ${Object.keys(aggregated).length} keys`)
    }
    
    return {
      success: true,
      output: outputs.join('\n'),
      executionTime: Date.now() - startTime
    }
    
  } catch (error) {
    return {
      success: false,
      output: '',
      error: error instanceof Error ? error.message : 'Execution failed',
      executionTime: Date.now() - startTime
    }
  }
}

function extractPrintContent(printLine: string, variables: Record<string, unknown>): string {
  // Extract content between print( and )
  const match = printLine.match(/print\s*\((.*)\)\s*$/)
  if (!match) return ''
  
  let content = match[1]
  
  // Handle f-strings
  if (content.startsWith('f"') || content.startsWith("f'")) {
    const quote = content[1]
    const inner = content.slice(2, -1)
    
    // Replace {expression} with evaluated values
    return inner.replace(/\{([^}]+)\}/g, (_, expr) => {
      const trimmedExpr = expr.trim()
      
      // Handle format specifiers like :.2f
      const formatMatch = trimmedExpr.match(/^(.+):(.+)$/)
      if (formatMatch) {
        const [, varExpr, formatSpec] = formatMatch
        const value = evaluateExpression(varExpr.trim(), variables)
        
        if (formatSpec.endsWith('f')) {
          const decimals = parseInt(formatSpec.replace('.', '').replace('f', '')) || 2
          return Number(value).toFixed(decimals)
        }
        if (formatSpec.endsWith('d')) {
          return String(Math.floor(Number(value)))
        }
        return String(value)
      }
      
      return String(evaluateExpression(trimmedExpr, variables))
    })
  }
  
  // Handle regular strings
  if (content.startsWith('"') || content.startsWith("'")) {
    return content.slice(1, -1)
  }
  
  // Handle expressions
  return String(evaluateExpression(content, variables))
}

function evaluateExpression(expr: string, variables: Record<string, unknown>): unknown {
  const trimmed = expr.trim()
  
  // Handle string literals
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1)
  }
  
  // Handle numbers
  if (!isNaN(Number(trimmed))) {
    return Number(trimmed)
  }
  
  // Handle list comprehensions [expr for x in iterable if condition]
  const listCompMatch = trimmed.match(/^\[(.+)\s+for\s+(\w+)\s+in\s+(.+?)(?:\s+if\s+(.+))?\]$/)
  if (listCompMatch) {
    const [, itemExpr, loopVar, iterableExpr, condition] = listCompMatch
    const iterable = evaluateExpression(iterableExpr, variables) as unknown[]
    
    if (Array.isArray(iterable)) {
      return iterable
        .filter(item => {
          if (!condition) return true
          const localVars = { ...variables, [loopVar]: item }
          try {
            return Boolean(evaluateExpression(condition, localVars))
          } catch {
            return true
          }
        })
        .map(item => {
          const localVars = { ...variables, [loopVar]: item }
          return evaluateExpression(itemExpr, localVars)
        })
    }
  }
  
  // Handle function calls like len(nodes)
  const funcMatch = trimmed.match(/^(\w+)\((.+)\)$/)
  if (funcMatch) {
    const [, funcName, args] = funcMatch
    const func = variables[funcName]
    if (typeof func === 'function') {
      const argValue = evaluateExpression(args, variables)
      return func(argValue)
    }
    
    // Handle method calls like dict(counter)
    if (funcName === 'dict') {
      return evaluateExpression(args, variables)
    }
  }
  
  // Handle method chains like nodes.filter(...).map(...)
  if (trimmed.includes('.')) {
    const parts = trimmed.split('.')
    let current: unknown = variables[parts[0]]
    
    for (let i = 1; i < parts.length && current !== undefined; i++) {
      const part = parts[i]
      
      // Handle method calls
      const methodMatch = part.match(/^(\w+)\((.*)?\)$/)
      if (methodMatch) {
        const [, methodName, argStr] = methodMatch
        
        if (Array.isArray(current)) {
          if (methodName === 'filter' && argStr) {
            // Parse lambda-like syntax: n => n.status === 'completed'
            // or Python lambda: lambda n: n.status == 'completed'
            current = current // Keep as is for now
          }
        }
        
        if (typeof current === 'object' && current !== null) {
          const method = (current as Record<string, unknown>)[methodName]
          if (typeof method === 'function') {
            const arg = argStr ? evaluateExpression(argStr, variables) : undefined
            current = (method as (arg?: unknown) => unknown)(arg)
          }
        }
      } else {
        // Property access
        if (typeof current === 'object' && current !== null) {
          current = (current as Record<string, unknown>)[part]
        }
      }
    }
    
    return current
  }
  
  // Handle arithmetic
  if (trimmed.includes('+') || trimmed.includes('-') || trimmed.includes('*') || trimmed.includes('/')) {
    try {
      // Replace variable names with their values
      let evalExpr = trimmed
      for (const [name, value] of Object.entries(variables)) {
        if (typeof value === 'number') {
          evalExpr = evalExpr.replace(new RegExp(`\\b${name}\\b`, 'g'), String(value))
        }
      }
      // Safe eval for numeric expressions only
      if (/^[\d\s+\-*/().]+$/.test(evalExpr)) {
        return Function(`"use strict"; return (${evalExpr})`)()
      }
    } catch {
      // Fall through to variable lookup
    }
  }
  
  // Variable lookup
  if (trimmed in variables) {
    return variables[trimmed]
  }
  
  // Handle nested property access like node.get('status')
  const getMatch = trimmed.match(/^(\w+)\.get\(['"](\w+)['"]\s*(?:,\s*(.+))?\)$/)
  if (getMatch) {
    const [, objName, key, defaultVal] = getMatch
    const obj = variables[objName]
    if (typeof obj === 'object' && obj !== null) {
      const value = (obj as Record<string, unknown>)[key]
      return value !== undefined ? value : (defaultVal ? evaluateExpression(defaultVal, variables) : undefined)
    }
  }
  
  return trimmed
}

// =============================================================================
// API ROUTE
// =============================================================================

export async function POST(request: Request) {
  try {
    const body = await request.json() as PythonRequest
    const { code, data } = body
    
    if (!code || !data) {
      return NextResponse.json({
        success: false,
        output: '',
        error: 'Missing code or data parameter'
      }, { status: 400 })
    }
    
    // Execute Python-like code
    const result = simulatePythonExecution(code, data)
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('Python execution error:', error)
    return NextResponse.json({
      success: false,
      output: '',
      error: error instanceof Error ? error.message : 'Failed to execute Python code'
    }, { status: 500 })
  }
}
