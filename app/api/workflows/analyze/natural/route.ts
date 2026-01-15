import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Get Gemini API key - check both env var names used in the project
const geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || ''

// Initialize Gemini
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      prompt, 
      workflowContext, 
      nodeCount, 
      nodeTypes,
      nodeNames,
      hasResults,
      completedCount,
      completedResults,
      aggregatedResult,
      rawResultText, // Fallback when perNodeResults mapping fails
      phase, // 'suggestion' or 'final'
      groundingSuggestion // Previous suggestion for grounding final output
    } = body

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      )
    }

    if (!geminiApiKey || !genAI) {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY not configured. Add GOOGLE_GEMINI_API_KEY or GEMINI_API_KEY to your .env.local file.' },
        { status: 500 }
      )
    }

    // Build results section for the prompt
    let resultsSection = ''
    if (completedResults && completedResults.length > 0) {
      resultsSection = `\n\n=== ACTUAL RESULTS FROM WORKFLOW (${completedResults.length} samples) ===\n`
      completedResults.forEach((r: { name: string; type: string; result: string }, i: number) => {
        resultsSection += `\n[${i + 1}. ${r.name} (${r.type})]:\n${r.result}\n`
      })
    }
    
    // FALLBACK: Include raw result text when perNodeResults mapping failed
    if (rawResultText && (!completedResults || completedResults.length === 0)) {
      resultsSection += `\n\n=== RAW WORKFLOW RESULT (fallback - perNodeResults mapping failed) ===\n${rawResultText}\n`
    }

    // Build grounding section if this is the final phase
    let groundingSection = ''
    if (phase === 'final' && groundingSuggestion) {
      groundingSection = `
=== GROUNDING CONTEXT (User's previous intent and suggested format) ===
User's original intent: "${groundingSuggestion.userIntent}"

Previously suggested Python code structure:
\`\`\`python
${groundingSuggestion.suggestedCode}
\`\`\`

Previously suggested output format (${groundingSuggestion.formatType}):
${groundingSuggestion.suggestedFormat}

IMPORTANT: Use this grounding context to generate the FINAL output. The user has already defined their intent and approved the suggested structure. Now populate it with ACTUAL data from the results above.
`
    }

    // Build the system context - different prompts for suggestion vs final phase
    let systemPrompt: string
    
    if (phase === 'final' && groundingSuggestion) {
      // FINAL PHASE: Generate grounded output using actual results
      systemPrompt = `You are an expert data analyst for NeuroData Hub, a neuroscience workflow platform.

${groundingSection}

=== WORKFLOW CONTEXT ===
${workflowContext}

Node count: ${nodeCount}
Completed nodes: ${completedCount || 0}
Node types: ${nodeTypes?.join(', ') || 'various'}
${nodeNames ? `Node names: ${nodeNames.slice(0, 20).join(', ')}${nodeNames.length > 20 ? '...' : ''}` : ''}
${resultsSection}
${aggregatedResult ? `\nAggregated data: ${JSON.stringify(aggregatedResult).substring(0, 800)}` : ''}

=== TASK ===
Generate the FINAL analysis output based on the user's original intent and the grounding context provided above.
- Use the suggested Python code structure as a guide for what analysis to perform
- Use the suggested output format as a template, but populate it with ACTUAL data
- Be specific and reference real data from the results
- Generate both Python code (with \`\`\`python) AND markdown/HTML output (with \`\`\`markdown or \`\`\`html)
- The output should be ready to display to the user`
    } else {
      // SUGGESTION PHASE: Generate template/suggestions based on workflow structure
      systemPrompt = `You are an expert data analyst for NeuroData Hub, a neuroscience workflow platform.
Users describe what they want their analysis output to achieve, and you help them by suggesting:
1. Python code structure for data aggregation
2. A sample output format (markdown or HTML)

=== WORKFLOW CONTEXT ===
${workflowContext}

Node count: ${nodeCount}
Completed nodes: ${completedCount || 0}
Node types: ${nodeTypes?.join(', ') || 'various'}
${nodeNames ? `Node names: ${nodeNames.slice(0, 20).join(', ')}${nodeNames.length > 20 ? '...' : ''}` : ''}

=== USER'S DESIRED OUTPUT ===
${prompt}

=== TASK ===
Based on the workflow structure and the user's intent, provide:

1. **PYTHON CODE** (\`\`\`python block) - Code that will analyze the workflow results when available:
   - Works with 'nodes' (list of dicts: nodeId, nodeName, nodeType, result, status)
   - Aggregates, filters, or processes the data as the user described
   - Outputs formatted markdown or structured data
   - Include comments explaining what each section does
   - Use realistic variable names based on the actual node names in the workflow

2. **SAMPLE OUTPUT FORMAT** (\`\`\`markdown or \`\`\`html block) - A template showing:
   - The structure the final output will have
   - Placeholder values that look realistic (e.g., "[Scientist 1 - Rating: 8.5/10]")
   - Based on actual node names from the workflow
   - Well-formatted with headers, tables, or sections as appropriate

3. **BRIEF EXPLANATION** - 2-3 sentences explaining how the code works and what the output will show.

DO NOT say "workflow hasn't run yet" - instead, provide actionable suggestions that will work when results are available.
The user is setting up their analysis BEFORE running the workflow, so give them useful templates.`
    }

    // Call Gemini - use gemini-2.0-flash which is the same model used by workflows
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      generationConfig: { 
        temperature: 0.3, 
        topP: 0.9, 
        maxOutputTokens: 4000 
      }
    })
    const result = await model.generateContent(systemPrompt)
    const response = await result.response
    const text = response.text()

    // Parse the response to extract code blocks if any
    const pythonCodeMatch = text.match(/```python\n([\s\S]*?)```/)
    const htmlMatch = text.match(/```html\n([\s\S]*?)```/)
    const markdownMatch = text.match(/```markdown\n([\s\S]*?)```/)

    // Build response
    const responseData: {
      success: boolean
      content: string
      generatedCode?: string
      displayContent?: string
      displayFormat?: 'markdown' | 'html'
      phase?: 'suggestion' | 'final'
    } = {
      success: true,
      content: text,
      phase: phase || 'suggestion'
    }

    // Extract Python code if present
    if (pythonCodeMatch) {
      responseData.generatedCode = pythonCodeMatch[1].trim()
    }

    // Extract display content if present
    if (htmlMatch) {
      responseData.displayContent = htmlMatch[1].trim()
      responseData.displayFormat = 'html'
    } else if (markdownMatch) {
      responseData.displayContent = markdownMatch[1].trim()
      responseData.displayFormat = 'markdown'
    }

    return NextResponse.json(responseData)

  } catch (error) {
    console.error('Natural language analysis error:', error)
    return NextResponse.json(
      { 
        success: false, 
        content: '',
        error: error instanceof Error ? error.message : 'Analysis failed' 
      },
      { status: 500 }
    )
  }
}
