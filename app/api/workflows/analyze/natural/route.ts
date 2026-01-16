import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Configure route for longer execution times (Gemini can take 30-60s for complex prompts)
export const maxDuration = 60 // Maximum function duration in seconds (Vercel Pro: 60s, Hobby: 10s)
export const dynamic = 'force-dynamic'

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
      systemPrompt = `You are an expert data analyst for NeuroData Hub. Generate a clean, well-organized analysis.

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
Generate a clean, WELL-FORMATTED analysis based on the user's intent and the data above.

OUTPUT FORMAT REQUIREMENTS:
1. Use proper markdown with ## headers for main sections
2. Use bullet points (- ) for lists, not asterisks
3. Use **bold** for emphasis and key terms
4. Use tables where data is comparative (use | header | header | format)
5. Keep paragraphs short and scannable
6. Include specific numbers and data from the results
7. End with a brief "Key Takeaways" or "Summary" section

Generate ONLY the final markdown output - no code blocks, no explanations about what you're doing.
Start directly with the analysis content.`
    } else {
      // SUGGESTION PHASE: Generate analysis based on workflow results
      systemPrompt = `You are an expert data analyst for NeuroData Hub. Generate a clean, organized analysis.

=== WORKFLOW CONTEXT ===
${workflowContext}

Node count: ${nodeCount}
Completed nodes: ${completedCount || 0}
Node types: ${nodeTypes?.join(', ') || 'various'}
${nodeNames ? `Node names: ${nodeNames.slice(0, 20).join(', ')}${nodeNames.length > 20 ? '...' : ''}` : ''}
${resultsSection}

=== USER REQUEST ===
${prompt}

=== OUTPUT REQUIREMENTS ===
Generate a CLEAN, WELL-FORMATTED analysis following these rules:

1. **Structure**: Use markdown with clear ## headers for each section
2. **Lists**: Use - for bullet points, keep items concise
3. **Tables**: Use markdown tables (| col1 | col2 |) for comparative data
4. **Metrics**: Bold key numbers like **85%** or **Score: 9/10**
5. **Sections to include** (adapt based on user request):
   - Executive Summary (2-3 sentences)
   - Key Findings (bullet points)
   - Detailed Analysis (organized by topic)
   - Recommendations or Next Steps
   - Summary Table (if applicable)

6. **Style**:
   - Be direct and specific
   - Use actual data from the results
   - Keep paragraphs short (2-3 sentences max)
   - Avoid filler words and meta-commentary
   - Don't explain what you're going to do, just do it

Start your response directly with the analysis - no preamble or "Here's the analysis:" type introductions.`
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
