# Neurodata Cloud Worker

Serverless worker for processing large-scale AI workflows in the cloud. Uses Azure Container Apps with scale-to-zero for cost efficiency.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────────┐
│   Mobile/Web    │────▶│    Supabase      │◀────│  Azure Container   │
│    Client       │     │   Job Queue      │     │     App Worker     │
└─────────────────┘     └──────────────────┘     └────────────────────┘
        │                        │                        │
        │ Submit job             │ Poll for pending       │
        │ (deduct credits)       │ jobs every 5s          │
        ▼                        ▼                        ▼
   User gets job ID       Store results in          Process nodes
   and polls for          cloud_compute_jobs        with Gemini AI
   completion             table                     
```

## Features

- **Scale to Zero**: No cost when idle - container only runs when jobs are pending
- **Auto-scaling**: Scales up to 3 replicas under load
- **Progress Tracking**: Real-time progress updates via Supabase
- **Credit Refunds**: Automatic refund on job failure
- **Large Workflows**: Handle 100,000+ nodes (no browser limitations)

## Costs

| State | Cost |
|-------|------|
| Idle (no jobs) | $0/month |
| Processing | ~$0.10-0.50/day |
| Heavy usage | ~$5-15/month |

## Deployment

### Prerequisites

1. Azure CLI installed and logged in:
   ```bash
   az login
   ```

2. Set environment variables:
   ```powershell
   $env:SUPABASE_URL = "https://your-project.supabase.co"
   $env:SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key"  # NOT the anon key!
   $env:GEMINI_API_KEY = "your-gemini-api-key"
   ```

### Deploy

```powershell
cd worker
.\deploy-azure.ps1
```

Or on Linux/Mac:
```bash
cd worker
chmod +x deploy-azure.sh
./deploy-azure.sh
```

## Local Development

1. Install dependencies:
   ```bash
   cd worker
   npm install
   ```

2. Create `.env` file:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   GEMINI_API_KEY=your-gemini-api-key
   ```

3. Run locally:
   ```bash
   npm run dev
   ```

## Useful Azure Commands

```bash
# View live logs
az containerapp logs show -n neurodata-worker -g neurodata-cloud --follow

# Check status
az containerapp show -n neurodata-worker -g neurodata-cloud --query properties.runningStatus

# Force scale up (for testing)
az containerapp update -n neurodata-worker -g neurodata-cloud --min-replicas 1

# Scale back to zero
az containerapp update -n neurodata-worker -g neurodata-cloud --min-replicas 0

# View revisions
az containerapp revision list -n neurodata-worker -g neurodata-cloud

# Delete everything (cleanup)
az group delete -n neurodata-cloud --yes
```

## How It Works

1. **Job Submission**: User submits workflow via `/api/workflows/cloud`
2. **Credits Deducted**: Credits charged based on node count
3. **Queue**: Job added to `cloud_compute_jobs` table with status `pending`
4. **Worker Polls**: Container App polls Supabase every 5 seconds
5. **Processing**: Worker picks up job, marks as `running`, processes nodes
6. **Progress Updates**: Real-time progress stored in Supabase
7. **Completion**: Results stored, status set to `completed`
8. **Client Polls**: Frontend polls for status and displays results

## Troubleshooting

### Worker not picking up jobs

1. Check if container is running:
   ```bash
   az containerapp show -n neurodata-worker -g neurodata-cloud --query properties.runningStatus
   ```

2. Force scale up:
   ```bash
   az containerapp update -n neurodata-worker -g neurodata-cloud --min-replicas 1
   ```

3. Check logs:
   ```bash
   az containerapp logs show -n neurodata-worker -g neurodata-cloud --follow
   ```

### Jobs stuck in pending

- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set (not anon key)
- Check RLS policies allow service role access
- Verify worker is running and polling

### High costs

- Reduce `--max-replicas` to 1
- Ensure `--min-replicas` is 0 for scale-to-zero
- Check for stuck jobs keeping container alive
