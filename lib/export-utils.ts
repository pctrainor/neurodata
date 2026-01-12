/**
 * Export utilities for workflow results
 * Supports CSV, JSON, and Excel formats
 */

// Parse AI analysis result into structured sections
export function parseAnalysisResult(text: string): Record<string, string | Record<string, string>> {
  const sections: Record<string, string | Record<string, string>> = {}
  
  // Split by markdown headers
  const lines = text.split('\n')
  let currentSection = 'Summary'
  let currentSubsection = ''
  let currentContent: string[] = []
  
  for (const line of lines) {
    // Check for H2 headers (## Section Name)
    const h2Match = line.match(/^##\s+(.+)/)
    if (h2Match) {
      // Save previous section
      if (currentContent.length > 0) {
        if (currentSubsection) {
          if (typeof sections[currentSection] !== 'object') {
            sections[currentSection] = {}
          }
          (sections[currentSection] as Record<string, string>)[currentSubsection] = currentContent.join('\n').trim()
        } else {
          sections[currentSection] = currentContent.join('\n').trim()
        }
      }
      currentSection = h2Match[1].replace(/[*_]/g, '').trim()
      currentSubsection = ''
      currentContent = []
      continue
    }
    
    // Check for H3 headers (### Subsection Name)
    const h3Match = line.match(/^###\s+(.+)/)
    if (h3Match) {
      // Save previous subsection
      if (currentContent.length > 0 && currentSubsection) {
        if (typeof sections[currentSection] !== 'object') {
          sections[currentSection] = {}
        }
        (sections[currentSection] as Record<string, string>)[currentSubsection] = currentContent.join('\n').trim()
      }
      currentSubsection = h3Match[1].replace(/[*_]/g, '').trim()
      currentContent = []
      continue
    }
    
    currentContent.push(line)
  }
  
  // Save last section
  if (currentContent.length > 0) {
    if (currentSubsection) {
      if (typeof sections[currentSection] !== 'object') {
        sections[currentSection] = {}
      }
      (sections[currentSection] as Record<string, string>)[currentSubsection] = currentContent.join('\n').trim()
    } else {
      sections[currentSection] = currentContent.join('\n').trim()
    }
  }
  
  return sections
}

// Extract scores/metrics from the analysis
export function extractMetrics(text: string): Array<{ metric: string; value: string; category: string }> {
  const metrics: Array<{ metric: string; value: string; category: string }> = []
  
  // Match patterns like "Score: 85" or "Rating: 8/10" or "(0-100): 75"
  const scorePatterns = [
    /(?:Overall\s+)?(?:Engagement\s+)?Score[:\s]+(\d+(?:\.\d+)?)/gi,
    /(?:Rating|Level)[:\s]+(\d+(?:\.\d+)?)\s*(?:\/\s*10)?/gi,
    /(\d+(?:\.\d+)?)\s*(?:\/\s*10|\s*%|\/100)/g,
    /Intensity[:\s]+(\d+(?:\.\d+)?)/gi,
    /Percentile[:\s]+(\d+(?:\.\d+)?)/gi,
  ]
  
  // Match category patterns
  const categoryPatterns = [
    { pattern: /emotional|emotion|feeling/i, category: 'Emotional' },
    { pattern: /attention|focus|engage/i, category: 'Attention' },
    { pattern: /reward|dopamine|motivation/i, category: 'Reward' },
    { pattern: /memory|recall|remember/i, category: 'Memory' },
    { pattern: /social|share|viral/i, category: 'Social' },
    { pattern: /action|conversion|cta/i, category: 'Action' },
  ]
  
  const lines = text.split('\n')
  for (const line of lines) {
    for (const pattern of scorePatterns) {
      pattern.lastIndex = 0 // Reset regex
      const match = pattern.exec(line)
      if (match) {
        let category = 'General'
        for (const cp of categoryPatterns) {
          if (cp.pattern.test(line)) {
            category = cp.category
            break
          }
        }
        
        // Extract the metric name from surrounding context
        const metricName = line
          .replace(/[*_#\[\]]/g, '')
          .replace(/:\s*\d+.*$/, '')
          .trim()
          .slice(0, 50)
        
        metrics.push({
          metric: metricName || 'Score',
          value: match[1],
          category,
        })
      }
    }
  }
  
  return metrics
}

// Convert to CSV
export function toCSV(data: Array<Record<string, unknown>>, columns?: string[]): string {
  if (data.length === 0) return ''
  
  const cols = columns || Object.keys(data[0])
  const header = cols.join(',')
  
  const rows = data.map(row => 
    cols.map(col => {
      const val = row[col]
      if (val === null || val === undefined) return ''
      const str = String(val)
      // Escape quotes and wrap in quotes if contains comma, newline, or quotes
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }).join(',')
  )
  
  return [header, ...rows].join('\n')
}

// Convert to JSON (pretty printed)
export function toJSON(data: unknown): string {
  return JSON.stringify(data, null, 2)
}

// Download file
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Export as CSV
export function exportAsCSV(analysisResult: string, workflowName: string) {
  const metrics = extractMetrics(analysisResult)
  const sections = parseAnalysisResult(analysisResult)
  
  // Create rows from metrics
  const data: Array<Record<string, string>> = metrics.map(m => ({
    Category: m.category,
    Metric: m.metric,
    Value: m.value,
  }))
  
  // Add sections as rows
  Object.entries(sections).forEach(([section, content]) => {
    if (typeof content === 'string') {
      data.push({
        Category: 'Analysis',
        Metric: section,
        Value: content.slice(0, 500), // Truncate long content
      })
    } else {
      Object.entries(content).forEach(([subsection, value]) => {
        data.push({
          Category: section,
          Metric: subsection,
          Value: value.slice(0, 500),
        })
      })
    }
  })
  
  const csv = toCSV(data, ['Category', 'Metric', 'Value'])
  const filename = `${workflowName.replace(/\s+/g, '_')}_analysis_${new Date().toISOString().split('T')[0]}.csv`
  downloadFile(csv, filename, 'text/csv')
}

// Export as JSON
export function exportAsJSON(analysisResult: string, workflowName: string, metadata?: Record<string, unknown>) {
  const sections = parseAnalysisResult(analysisResult)
  const metrics = extractMetrics(analysisResult)
  
  const exportData = {
    workflow: workflowName,
    exportedAt: new Date().toISOString(),
    metadata: metadata || {},
    metrics,
    sections,
    rawAnalysis: analysisResult,
  }
  
  const json = toJSON(exportData)
  const filename = `${workflowName.replace(/\s+/g, '_')}_analysis_${new Date().toISOString().split('T')[0]}.json`
  downloadFile(json, filename, 'application/json')
}

// Export as Excel-compatible CSV (with BOM for proper Excel encoding)
export function exportAsExcel(analysisResult: string, workflowName: string) {
  const metrics = extractMetrics(analysisResult)
  const sections = parseAnalysisResult(analysisResult)
  
  // Create comprehensive worksheet data
  const data: Array<Record<string, string>> = []
  
  // Add header row
  data.push({
    Category: 'WORKFLOW ANALYSIS REPORT',
    Metric: workflowName,
    Value: new Date().toLocaleDateString(),
    Notes: '',
  })
  data.push({ Category: '', Metric: '', Value: '', Notes: '' })
  
  // Add metrics section
  data.push({ Category: '--- METRICS ---', Metric: '', Value: '', Notes: '' })
  metrics.forEach(m => {
    data.push({
      Category: m.category,
      Metric: m.metric,
      Value: m.value,
      Notes: '',
    })
  })
  data.push({ Category: '', Metric: '', Value: '', Notes: '' })
  
  // Add analysis sections
  data.push({ Category: '--- ANALYSIS ---', Metric: '', Value: '', Notes: '' })
  Object.entries(sections).forEach(([section, content]) => {
    if (typeof content === 'string') {
      data.push({
        Category: section,
        Metric: 'Summary',
        Value: content.slice(0, 1000),
        Notes: content.length > 1000 ? '(truncated)' : '',
      })
    } else {
      Object.entries(content).forEach(([subsection, value]) => {
        data.push({
          Category: section,
          Metric: subsection,
          Value: value.slice(0, 1000),
          Notes: value.length > 1000 ? '(truncated)' : '',
        })
      })
    }
  })
  
  const csv = toCSV(data, ['Category', 'Metric', 'Value', 'Notes'])
  // Add UTF-8 BOM for Excel compatibility
  const bom = '\uFEFF'
  const filename = `${workflowName.replace(/\s+/g, '_')}_analysis_${new Date().toISOString().split('T')[0]}.xls`
  downloadFile(bom + csv, filename, 'application/vnd.ms-excel')
}

// Copy to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.select()
    const success = document.execCommand('copy')
    document.body.removeChild(textArea)
    return success
  }
}
