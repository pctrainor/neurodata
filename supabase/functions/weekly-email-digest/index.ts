// Weekly Email Digest Edge Function
// Runs every Monday to send personalized research digests to users
// Triggered by Supabase cron job

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.2.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UserPreferences {
  id: string
  email: string
  display_name: string
  research_interests: string[]
  preferred_modalities: string[]
  email_frequency: 'weekly' | 'none'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const genAI = new GoogleGenerativeAI(Deno.env.get('GOOGLE_GEMINI_API_KEY') ?? '')
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    
    console.log('Starting weekly email digest...')

    // 1. Get users who want weekly emails
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('id, email, display_name, research_interests, preferred_modalities')
      .eq('email_frequency', 'weekly')
      .eq('email_verified', true)

    if (usersError) throw usersError

    console.log(`Found ${users?.length || 0} users to email`)

    // 2. Get new studies from the past week
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const { data: newStudies } = await supabase
      .from('studies')
      .select('id, title, authors, abstract, modalities, sample_size, doi')
      .gte('created_at', oneWeekAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(20)

    // 3. Get news from the past week
    const { data: newsItems } = await supabase
      .from('neuroscience_news')
      .select('*')
      .gte('discovered_at', oneWeekAgo.toISOString())
      .order('discovered_at', { ascending: false })
      .limit(10)

    // 4. Get platform stats
    const { count: totalStudies } = await supabase
      .from('studies')
      .select('*', { count: 'exact', head: true })

    const { count: totalRegions } = await supabase
      .from('brain_regions')
      .select('*', { count: 'exact', head: true })

    const stats = {
      total_studies: totalStudies || 0,
      new_studies_this_week: newStudies?.length || 0,
      total_regions: totalRegions || 0,
      news_items: newsItems?.length || 0
    }

    // 5. Generate personalized emails for each user
    const emailResults = {
      sent: 0,
      failed: 0,
      skipped: 0
    }

    for (const user of (users || [])) {
      try {
        // Generate personalized content with AI
        const personalizationPrompt = `You are creating a personalized weekly research digest email for a neuroscience researcher.

User Profile:
- Name: ${user.display_name || 'Researcher'}
- Research Interests: ${user.research_interests?.join(', ') || 'General neuroscience'}
- Preferred Modalities: ${user.preferred_modalities?.join(', ') || 'All'}

New Studies This Week (${newStudies?.length || 0}):
${newStudies?.slice(0, 5).map(s => `- ${s.title} (${s.modalities?.join(', ')})`).join('\n') || 'No new studies'}

Neuroscience News:
${newsItems?.slice(0, 3).map(n => `- ${n.title}: ${n.summary}`).join('\n') || 'No news this week'}

Generate a brief, personalized introduction (2-3 sentences) for their weekly digest email. Highlight studies or news most relevant to their interests. Be professional but friendly.

Return only the introduction paragraph, no formatting or headers.`

        const introResult = await model.generateContent(personalizationPrompt)
        const personalizedIntro = introResult.response.text()

        // Build email HTML
        const emailHtml = generateEmailHtml({
          userName: user.display_name || 'Researcher',
          intro: personalizedIntro,
          newStudies: newStudies?.slice(0, 5) || [],
          newsItems: newsItems?.slice(0, 3) || [],
          stats
        })

        // Send email via Resend
        if (resendApiKey) {
          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: 'NeuroData Hub <digest@neurodata.io>',
              to: [user.email],
              subject: `🧠 Your Weekly Research Digest - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
              html: emailHtml
            })
          })

          if (emailResponse.ok) {
            emailResults.sent++
            console.log(`Email sent to ${user.email}`)
          } else {
            emailResults.failed++
            console.error(`Failed to send to ${user.email}:`, await emailResponse.text())
          }
        } else {
          // Log email content if no API key (dev mode)
          console.log(`[DEV] Would send email to ${user.email}`)
          emailResults.skipped++
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (userError) {
        console.error(`Error processing user ${user.id}:`, userError)
        emailResults.failed++
      }
    }

    // 6. Log digest results
    await supabase
      .from('sync_logs')
      .insert({
        sync_type: 'weekly_email_digest',
        results: emailResults,
        completed_at: new Date().toISOString()
      })

    console.log('Weekly digest completed:', emailResults)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Weekly email digest completed',
        results: emailResults
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Weekly digest error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error as Error).message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

// Generate beautiful email HTML
function generateEmailHtml(data: {
  userName: string
  intro: string
  newStudies: any[]
  newsItems: any[]
  stats: any
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NeuroData Hub Weekly Digest</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0f1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 12px; overflow: hidden; margin-top: 20px; margin-bottom: 20px;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%); padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">🧠 NeuroData Hub</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 16px;">Your Weekly Research Digest</p>
    </div>
    
    <!-- Personalized Intro -->
    <div style="padding: 24px 32px; border-bottom: 1px solid #1e293b;">
      <p style="color: #e2e8f0; margin: 0; font-size: 16px; line-height: 1.6;">
        Hi ${data.userName},
      </p>
      <p style="color: #94a3b8; margin: 16px 0 0 0; font-size: 15px; line-height: 1.7;">
        ${data.intro}
      </p>
    </div>
    
    <!-- Stats Bar -->
    <div style="display: flex; padding: 20px 32px; background-color: #0c1322; border-bottom: 1px solid #1e293b;">
      <div style="flex: 1; text-align: center;">
        <div style="color: #0891b2; font-size: 24px; font-weight: 700;">${data.stats.new_studies_this_week}</div>
        <div style="color: #64748b; font-size: 12px; margin-top: 4px;">New Studies</div>
      </div>
      <div style="flex: 1; text-align: center; border-left: 1px solid #1e293b;">
        <div style="color: #22c55e; font-size: 24px; font-weight: 700;">${data.stats.total_studies}</div>
        <div style="color: #64748b; font-size: 12px; margin-top: 4px;">Total Studies</div>
      </div>
      <div style="flex: 1; text-align: center; border-left: 1px solid #1e293b;">
        <div style="color: #a855f7; font-size: 24px; font-weight: 700;">${data.stats.total_regions}</div>
        <div style="color: #64748b; font-size: 12px; margin-top: 4px;">Brain Regions</div>
      </div>
    </div>
    
    <!-- New Studies Section -->
    ${data.newStudies.length > 0 ? `
    <div style="padding: 24px 32px; border-bottom: 1px solid #1e293b;">
      <h2 style="color: #e2e8f0; margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">📊 New Studies This Week</h2>
      ${data.newStudies.map(study => `
        <div style="background-color: #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
          <h3 style="color: #f1f5f9; margin: 0; font-size: 15px; font-weight: 600; line-height: 1.4;">${study.title}</h3>
          <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 13px;">
            ${study.authors?.slice(0, 2).join(', ')}${study.authors?.length > 2 ? ' et al.' : ''}
          </p>
          <div style="margin-top: 10px;">
            ${study.modalities?.slice(0, 3).map((mod: string) => `
              <span style="display: inline-block; background-color: rgba(8, 145, 178, 0.2); color: #22d3ee; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-right: 6px;">${mod}</span>
            `).join('')}
            ${study.sample_size ? `<span style="color: #64748b; font-size: 12px;">n=${study.sample_size}</span>` : ''}
          </div>
        </div>
      `).join('')}
      <a href="https://neurodata.io/dashboard/studies" style="display: inline-block; color: #0891b2; font-size: 14px; text-decoration: none; margin-top: 8px;">View all studies →</a>
    </div>
    ` : ''}
    
    <!-- News Section -->
    ${data.newsItems.length > 0 ? `
    <div style="padding: 24px 32px; border-bottom: 1px solid #1e293b;">
      <h2 style="color: #e2e8f0; margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">📰 Neuroscience News</h2>
      ${data.newsItems.map(news => `
        <div style="padding: 12px 0; border-bottom: 1px solid #1e293b;">
          <h4 style="color: #f1f5f9; margin: 0; font-size: 14px; font-weight: 600;">${news.title}</h4>
          <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 13px; line-height: 1.5;">${news.summary}</p>
          <span style="display: inline-block; background-color: rgba(34, 197, 94, 0.2); color: #4ade80; padding: 2px 8px; border-radius: 4px; font-size: 10px; margin-top: 8px;">${news.category}</span>
        </div>
      `).join('')}
    </div>
    ` : ''}
    
    <!-- CTA -->
    <div style="padding: 32px; text-align: center;">
      <a href="https://neurodata.io/dashboard" style="display: inline-block; background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
        Explore NeuroData Hub
      </a>
    </div>
    
    <!-- Footer -->
    <div style="padding: 24px 32px; background-color: #0c1322; text-align: center;">
      <p style="color: #64748b; margin: 0; font-size: 12px;">
        You're receiving this because you subscribed to weekly digests.
      </p>
      <p style="color: #64748b; margin: 8px 0 0 0; font-size: 12px;">
        <a href="https://neurodata.io/settings" style="color: #0891b2; text-decoration: none;">Manage preferences</a> · 
        <a href="https://neurodata.io/unsubscribe" style="color: #0891b2; text-decoration: none;">Unsubscribe</a>
      </p>
      <p style="color: #475569; margin: 16px 0 0 0; font-size: 11px;">
        © 2026 NeuroData Hub. Advancing neuroscience research.
      </p>
    </div>
    
  </div>
</body>
</html>
  `
}
