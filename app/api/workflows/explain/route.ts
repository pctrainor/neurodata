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

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      )
    }

    // Build a description of the workflow
    const nodesDescription = workflow.nodes.map((n: { type: string; label: string; data: Record<string, unknown> }, i: number) => 
      `${i + 1}. [${n.type}] "${n.label}"`
    ).join('\n')

    const connectionsDescription = workflow.connections?.map((c: { from: string; to: string }) => 
      `  ${c.from} → ${c.to}`
    ).join('\n') || 'No connections defined'

    let videoContext = '';
    if (workflow.videoUrl) {
      videoContext = `\n\nCONTENT URL: ${workflow.videoUrl}\n`;
    }

    const prompt = `You are explaining a neuroscience data analysis workflow to a researcher.

WORKFLOW: "${workflow.name}"
${videoContext}
NODES:
${nodesDescription}

DATA FLOW:
${connectionsDescription}

Please provide a clear, helpful explanation of:
1. What this workflow does (2-3 sentences)
2. Step-by-step explanation of each node and its role
3. What insights or outputs the user can expect
4. Any recommendations for improving the workflow

Keep the explanation accessible but technically accurate. Use markdown formatting for clarity.`

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
            maxOutputTokens: 1024,
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
