# NeuroData Hub - Automated Data Sync & Email Digest Setup

## Overview

This document describes the automated systems for:
1. **Daily Data Sync** - Uses Gemini AI to discover new neuroscience studies and news
2. **Weekly Email Digest** - Sends personalized research updates to users every Monday

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Supabase      │     │  Gemini AI       │     │   Resend        │
│   Cron Jobs     │────▶│  (Discovery)     │────▶│   (Emails)      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                        │
        ▼                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Supabase Database                           │
│  ┌──────────┐  ┌────────────────┐  ┌──────────────────────┐    │
│  │ studies  │  │ neuroscience_  │  │ email_digest_history │    │
│  │          │  │ news           │  │                      │    │
│  └──────────┘  └────────────────┘  └──────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Setup Instructions

### 1. Environment Variables

Add these to your Supabase project secrets (Dashboard → Settings → Edge Functions → Secrets):

```bash
GOOGLE_GEMINI_API_KEY=AIzaSyAeB9HKDSIz8yTCoscAc4enPbgYfvm3eN4
RESEND_API_KEY=re_xxxxxxxx  # Get from resend.com
```

### 2. Run Database Migration

Go to Supabase SQL Editor and run the contents of:
```
supabase/migrations/20260110_add_digest_tables.sql
```

This creates:
- `neuroscience_news` - Stores discovered news
- `sync_logs` - Tracks sync operations
- `email_digest_history` - Tracks sent emails
- Updates to `user_profiles` for email preferences

### 3. Deploy Edge Functions

```bash
# Install Supabase CLI if not already
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref fthgibjyqmsortffhnmj

# Deploy the functions
supabase functions deploy daily-data-sync
supabase functions deploy weekly-email-digest
```

### 4. Set Up Cron Jobs

In Supabase Dashboard → Database → Extensions, enable `pg_cron`.

Then run these SQL commands:

```sql
-- Daily data sync at 6 AM UTC
SELECT cron.schedule(
  'daily-data-sync',
  '0 6 * * *',  -- Every day at 6:00 AM UTC
  $$
  SELECT net.http_post(
    url := 'https://fthgibjyqmsortffhnmj.supabase.co/functions/v1/daily-data-sync',
    headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Weekly email digest on Monday at 9 AM UTC
SELECT cron.schedule(
  'weekly-email-digest',
  '0 9 * * 1',  -- Every Monday at 9:00 AM UTC
  $$
  SELECT net.http_post(
    url := 'https://fthgibjyqmsortffhnmj.supabase.co/functions/v1/weekly-email-digest',
    headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

### 5. Email Service Setup (Resend)

1. Go to [resend.com](https://resend.com) and create an account
2. Add your domain or use resend's free tier
3. Create an API key
4. Add it to Supabase secrets as `RESEND_API_KEY`

## Manual Testing

You can manually trigger the functions for testing:

```bash
# Test daily sync
curl -X POST https://fthgibjyqmsortffhnmj.supabase.co/functions/v1/daily-data-sync \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"

# Test weekly digest
curl -X POST https://fthgibjyqmsortffhnmj.supabase.co/functions/v1/weekly-email-digest \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

## What Gets Synced

### Daily Data Sync
- Searches for 5-10 new neuroscience studies from the past week
- Discovers 5-7 neuroscience news items
- Sources: OpenNeuro, HCP, Nature, Science, bioRxiv, etc.
- Stores new studies in the database
- Logs sync results

### Weekly Email Digest
- Personalizes content based on user's research interests
- Includes new studies matching user's preferred modalities
- Highlights relevant news
- Beautiful dark-themed email template

## Monitoring

Check sync status in the `sync_logs` table:

```sql
SELECT * FROM sync_logs 
ORDER BY created_at DESC 
LIMIT 10;
```

Check email delivery:

```sql
SELECT * FROM email_digest_history 
ORDER BY sent_at DESC 
LIMIT 10;
```

## Cost Considerations

- **Gemini API**: ~$0.01-0.05 per daily sync (minimal usage)
- **Resend**: Free tier includes 3,000 emails/month
- **Supabase Edge Functions**: Free tier includes 500,000 invocations/month

## Customization

### Changing Sync Frequency

Edit the cron expressions:
- `0 6 * * *` = Daily at 6 AM
- `0 */6 * * *` = Every 6 hours
- `0 9 * * 1` = Weekly on Monday at 9 AM

### Adding More Data Sources

Edit `daily-data-sync/index.ts` and update the prompt to include additional sources like:
- NIMH Data Archive
- UK Biobank
- ABIDE
- ADNI

### Customizing Email Template

Edit `weekly-email-digest/index.ts` → `generateEmailHtml()` function.

## Troubleshooting

### Function Not Running
- Check if cron extension is enabled
- Verify secrets are set correctly
- Check Edge Functions logs in Supabase Dashboard

### No Studies Being Added
- Check `sync_logs` for errors
- Verify Gemini API key is valid
- Studies may already exist (duplicate prevention)

### Emails Not Sending
- Verify Resend API key
- Check user has `email_verified = true`
- Check `email_frequency = 'weekly'`
