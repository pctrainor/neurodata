import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '')

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { action, payload } = await request.json()

    switch (action) {
      case 'summarize_study':
        return await summarizeStudy(payload)
      case 'find_similar':
        return await findSimilarStudies(payload)
      case 'semantic_search':
        return await semanticSearch(payload)
      case 'ask_question':
        return await askQuestion(payload)
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('AI API error:', error)
    return NextResponse.json(
      { error: 'AI processing failed' },
      { status: 500 }
    )
  }
}

// Generate a plain-English summary of a study
async function summarizeStudy(payload: { study: any }) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  
  const prompt = `You are a neuroscience research assistant. Summarize this study in 2-3 sentences for a researcher. Focus on:
1. What was studied
2. Key methodology (imaging type, sample size)
3. Main findings or goals

Study Title: ${payload.study.title}
Authors: ${payload.study.authors?.join(', ') || 'Unknown'}
Abstract: ${payload.study.abstract || 'No abstract available'}
Modalities: ${payload.study.modalities?.join(', ') || 'Not specified'}
Sample Size: ${payload.study.sample_size || 'Not specified'}

Provide a concise, jargon-free summary:`

  const result = await model.generateContent(prompt)
  const summary = result.response.text()

  return NextResponse.json({ summary })
}

// Find studies similar to a given one
async function findSimilarStudies(payload: { studyId: string; title: string; modalities: string[] }) {
  // Get all studies from database
  const { data: studies } = await supabase
    .from('studies')
    .select('id, title, modalities, abstract, authors')
    .neq('id', payload.studyId)
    .limit(50)

  if (!studies || studies.length === 0) {
    return NextResponse.json({ similar: [] })
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  
  const prompt = `You are a neuroscience research assistant. Given the reference study and a list of other studies, identify the 3-5 most similar studies based on:
1. Similar imaging modalities
2. Similar research focus/topic
3. Complementary methodologies

Reference Study:
Title: ${payload.title}
Modalities: ${payload.modalities?.join(', ')}

Available Studies:
${studies.map((s, i) => `${i + 1}. ID: ${s.id} | Title: ${s.title} | Modalities: ${s.modalities?.join(', ')}`).join('\n')}

Return ONLY a JSON array of the most similar study IDs, ordered by relevance. Example: ["id1", "id2", "id3"]
Response:`

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  
  // Parse the JSON array from response
  const match = text.match(/\[[\s\S]*\]/)
  const similarIds = match ? JSON.parse(match[0]) : []
  
  // Get full study details for similar studies
  const { data: similarStudies } = await supabase
    .from('studies')
    .select('id, title, modalities, authors, sample_size')
    .in('id', similarIds)

  return NextResponse.json({ similar: similarStudies || [] })
}

// Semantic search across studies
async function semanticSearch(payload: { query: string }) {
  // Get all studies
  const { data: studies } = await supabase
    .from('studies')
    .select('id, title, abstract, modalities, authors, sample_size, doi')
    .limit(100)

  if (!studies || studies.length === 0) {
    return NextResponse.json({ results: [] })
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  
  const prompt = `You are a neuroscience research database assistant. A researcher is searching for studies.

Search Query: "${payload.query}"

Available Studies:
${studies.map((s, i) => `${i + 1}. ID: ${s.id}
   Title: ${s.title}
   Abstract: ${s.abstract?.substring(0, 200) || 'No abstract'}
   Modalities: ${s.modalities?.join(', ')}
`).join('\n')}

Based on the search query, identify the most relevant studies. Consider:
1. Direct topic matches
2. Relevant methodologies
3. Related brain regions or conditions

Return ONLY a JSON array of study IDs ordered by relevance (most relevant first). Include up to 10 studies.
Example: ["id1", "id2", "id3"]
Response:`

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  
  const match = text.match(/\[[\s\S]*\]/)
  const relevantIds = match ? JSON.parse(match[0]) : []
  
  // Get full study details
  const { data: relevantStudies } = await supabase
    .from('studies')
    .select('*')
    .in('id', relevantIds)

  // Maintain order from AI response
  const orderedResults = relevantIds
    .map((id: string) => relevantStudies?.find(s => s.id === id))
    .filter(Boolean)

  return NextResponse.json({ results: orderedResults })
}

// Ask a question about studies or the database
async function askQuestion(payload: { question: string; context?: any }) {
  // Get some studies for context
  const { data: studies } = await supabase
    .from('studies')
    .select('title, abstract, modalities, sample_size, authors')
    .limit(20)

  // Get brain regions count
  const { count: regionCount } = await supabase
    .from('brain_regions')
    .select('*', { count: 'exact', head: true })

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  
  const prompt = `You are NeuroData Hub's AI research assistant. Help researchers navigate and understand the neuroscience data available.

Database Overview:
- ${studies?.length || 0}+ studies from OpenNeuro and Human Connectome Project
- ${regionCount || 0}+ brain regions mapped
- Modalities include: fMRI, structural MRI, diffusion MRI, EEG, MEG

Sample Studies Available:
${studies?.slice(0, 10).map(s => `- ${s.title} (n=${s.sample_size}, ${s.modalities?.join(', ')})`).join('\n')}

${payload.context ? `Additional Context: ${JSON.stringify(payload.context)}` : ''}

User Question: ${payload.question}

Provide a helpful, concise answer. If you're unsure or the data isn't available, say so. Be specific about what's in the database vs general knowledge.`

  const result = await model.generateContent(prompt)
  const answer = result.response.text()

  return NextResponse.json({ answer })
}
