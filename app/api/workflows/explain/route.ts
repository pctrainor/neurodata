import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { workflow } = await request.json()

    if (!workflow || !workflow.nodes) {
      return NextResponse.json(
        { error: 'Workflow data is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      )
    }

    // Categorize nodes by type for better analysis
    const inputNodes = workflow.nodes.filter((n: { type: string }) => 
      n.type === 'dataNode' || n.type === 'contentUrlInputNode' || n.type === 'newsArticleNode'
    )
    const processingNodes = workflow.nodes.filter((n: { type: string }) => 
      n.type === 'brainNode' || n.type === 'preprocessingNode' || n.type === 'analysisNode'
    )
    const outputNodes = workflow.nodes.filter((n: { type: string }) => 
      n.type === 'outputNode'
    )

    // Build detailed node descriptions
    const nodesDescription = workflow.nodes.map((n: { type: string; label: string; data: Record<string, unknown> }, i: number) => {
      let details = `${i + 1}. [${n.type}] "${n.label}"`
      
      // Add relevant details based on node type
      if (n.data?.instructions) {
        details += `\n   Instructions: "${String(n.data.instructions).slice(0, 100)}..."`
      }
      if (n.data?.inputText) {
        details += `\n   Input Text: "${String(n.data.inputText).slice(0, 100)}..."`
      }
      if (n.data?.fileName) {
        details += `\n   File: ${n.data.fileName}`
      }
      if (n.data?.sampleDataDescription) {
        details += `\n   Data: ${n.data.sampleDataDescription}`
      }
      
      return details
    }).join('\n')

    const connectionsDescription = workflow.connections?.map((c: { from: string; to: string }) => 
      `  ${c.from} → ${c.to}`
    ).join('\n') || 'No connections defined'

    let videoContext = '';
    if (workflow.videoUrl) {
      videoContext = `\n\nCONTENT URL: ${workflow.videoUrl}\n`;
    }

    const prompt = `You are an expert workflow analyst reviewing a data processing workflow. Analyze the ENTIRE workflow from start to finish and provide a comprehensive summary.

WORKFLOW NAME: "${workflow.name}"
${videoContext}
WORKFLOW STATISTICS:
- Total Nodes: ${workflow.nodes.length}
- Input Nodes: ${inputNodes.length}
- Processing/AI Nodes: ${processingNodes.length}
- Output Nodes: ${outputNodes.length}
- Total Connections: ${workflow.connections?.length || 0}

ALL NODES (in order):
${nodesDescription}

DATA FLOW (connections):
${connectionsDescription}

Please provide a COMPREHENSIVE REVIEW that includes:

## 📋 Workflow Summary
A clear 2-3 sentence overview of what this workflow accomplishes.

## 🔄 Data Flow Analysis
Trace the data flow from input to output. Explain how data moves through the workflow step by step.

## 🧠 Processing Steps
For each AI/processing node, explain:
- What it does
- How it contributes to the overall goal

## 📊 Expected Output
What results or insights will this workflow produce?

## ✅ Strengths
What's well-designed about this workflow?

## 💡 Suggestions
Any recommendations to improve the workflow (optional, only if relevant).

Use markdown formatting. Be specific and reference actual node names from the workflow.`

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          }
        })
      }
    )

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error('Gemini API error:', errorText)
      return NextResponse.json(
        { error: 'Failed to generate explanation' },
        { status: 500 }
      )
    }

    const geminiData = await geminiResponse.json()
    const explanation = geminiData.candidates?.[0]?.content?.parts?.[0]?.text

    if (!explanation) {
      return NextResponse.json(
        { error: 'No explanation generated' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      explanation,
      workflowName: workflow.name
    })

  } catch (error) {
    console.error('Workflow explanation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
