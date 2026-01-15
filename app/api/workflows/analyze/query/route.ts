import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// =============================================================================
// NATURAL LANGUAGE QUERY API
// =============================================================================
// This API allows users to ask questions about their workflow data
// using natural language. It uses Gemini AI to interpret the query
// and provide intelligent analysis.
// =============================================================================

interface QueryRequest {
  query: string
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

interface QueryResult {
  success: boolean
  result: string
  error?: string
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as QueryRequest
    const { query, data } = body
    
    if (!query || !data) {
      return NextResponse.json({
        success: false,
        result: '',
        error: 'Missing query or data parameter'
      } as QueryResult, { status: 400 })
    }
    
    // Initialize Gemini
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        result: '',
        error: 'API key not configured'
      } as QueryResult, { status: 500 })
    }
    
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    
    // Prepare a concise data summary for the AI
    const dataSummary = prepareDataSummary(data)
    
    // Build the prompt
    const prompt = `You are an expert data analyst assistant. Analyze the following workflow execution data and answer the user's question.

## Data Summary
${dataSummary}

## User Question
${query}

## Instructions
- Provide a clear, concise answer based on the data
- Include specific numbers, percentages, or statistics when relevant
- If the question asks for comparisons, provide clear comparisons
- If the data doesn't contain information to answer the question, say so
- Format your response in a readable way with bullet points if listing multiple items
- Keep your answer focused and relevant to the question

Answer:`

    // Generate response
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    return NextResponse.json({
      success: true,
      result: text
    } as QueryResult)
    
  } catch (error) {
    console.error('Query analysis error:', error)
    return NextResponse.json({
      success: false,
      result: '',
      error: error instanceof Error ? error.message : 'Failed to analyze query'
    } as QueryResult, { status: 500 })
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function prepareDataSummary(data: QueryRequest['data']): string {
  const { nodes, aggregated, summary } = data
  
  const lines: string[] = []
  
  // Basic stats
  lines.push(`**Overview:**`)
  lines.push(`- Total Nodes: ${summary.totalNodes}`)
  lines.push(`- Completed: ${summary.completedNodes}`)
  lines.push(`- Node Types: ${summary.nodeTypes.join(', ')}`)
  
  // Calculate processing times if available
  const processingTimes = nodes
    .map(n => parseInt(n.processingTime || '0'))
    .filter(t => t > 0)
  
  if (processingTimes.length > 0) {
    const avgTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
    const minTime = Math.min(...processingTimes)
    const maxTime = Math.max(...processingTimes)
    
    lines.push(`\n**Processing Times:**`)
    lines.push(`- Average: ${avgTime.toFixed(2)}ms`)
    lines.push(`- Min: ${minTime}ms`)
    lines.push(`- Max: ${maxTime}ms`)
  }
  
  // Status breakdown
  const statusCounts: Record<string, number> = {}
  nodes.forEach(n => {
    statusCounts[n.status] = (statusCounts[n.status] || 0) + 1
  })
  
  lines.push(`\n**Status Breakdown:**`)
  Object.entries(statusCounts).forEach(([status, count]) => {
    lines.push(`- ${status}: ${count} (${((count / nodes.length) * 100).toFixed(1)}%)`)
  })
  
  // Node type breakdown
  const typeCounts: Record<string, number> = {}
  nodes.forEach(n => {
    typeCounts[n.nodeType] = (typeCounts[n.nodeType] || 0) + 1
  })
  
  lines.push(`\n**Node Type Distribution:**`)
  Object.entries(typeCounts).forEach(([type, count]) => {
    lines.push(`- ${type}: ${count}`)
  })
  
  // Sample of node results (first 5)
  lines.push(`\n**Sample Node Results (first 5):**`)
  nodes.slice(0, 5).forEach((node, i) => {
    const resultPreview = typeof node.result === 'object'
      ? JSON.stringify(node.result).slice(0, 200)
      : String(node.result).slice(0, 200)
    lines.push(`${i + 1}. ${node.nodeName} (${node.nodeType}): ${resultPreview}...`)
  })
  
  // Aggregated result summary
  if (aggregated && Object.keys(aggregated).length > 0) {
    lines.push(`\n**Aggregated Result:**`)
    
    // Extract key statistics if available
    if ('averageRating' in aggregated) {
      lines.push(`- Average Rating: ${aggregated.averageRating}`)
    }
    if ('totalResponses' in aggregated) {
      lines.push(`- Total Responses: ${aggregated.totalResponses}`)
    }
    if ('summary' in aggregated) {
      lines.push(`- Summary: ${String(aggregated.summary).slice(0, 300)}...`)
    }
    
    // Show keys available
    lines.push(`- Available keys: ${Object.keys(aggregated).join(', ')}`)
  }
  
  // Extract common patterns from results
  const allResults = nodes.map(n => n.result).filter(Boolean)
  
  // Look for ratings
  const ratings: number[] = []
  allResults.forEach(result => {
    if (typeof result === 'object' && result !== null) {
      const r = result as Record<string, unknown>
      if ('rating' in r) ratings.push(Number(r.rating))
      if ('score' in r) ratings.push(Number(r.score))
      if ('value' in r) ratings.push(Number(r.value))
    }
  })
  
  if (ratings.length > 0) {
    const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length
    lines.push(`\n**Detected Ratings/Scores:**`)
    lines.push(`- Count: ${ratings.length}`)
    lines.push(`- Average: ${avgRating.toFixed(2)}`)
    lines.push(`- Min: ${Math.min(...ratings)}`)
    lines.push(`- Max: ${Math.max(...ratings)}`)
    
    // Distribution
    const distribution: Record<string, number> = {}
    ratings.forEach(r => {
      const bucket = Math.round(r)
      distribution[bucket] = (distribution[bucket] || 0) + 1
    })
    lines.push(`- Distribution: ${JSON.stringify(distribution)}`)
  }
  
  return lines.join('\n')
}
