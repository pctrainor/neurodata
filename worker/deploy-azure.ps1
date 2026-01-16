# =============================================================================
# Neurodata Cloud Worker - Azure Container Apps Deployment (PowerShell)
# =============================================================================
# 
# Prerequisites:
#   - Azure CLI installed and logged in (az login)
#   - Docker installed (for local testing)
#
# Usage:
#   .\deploy-azure.ps1
#
# Environment variables (set these before running):
#   $env:SUPABASE_URL              = "https://your-project.supabase.co"
#   $env:SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key"
#   $env:GEMINI_API_KEY            = "your-gemini-api-key"
# =============================================================================

$ErrorActionPreference = "Stop"

# Configuration
$RESOURCE_GROUP = "neurodata-cloud"
$LOCATION = "eastus"
$CONTAINER_REGISTRY = "neurodataacr"
$CONTAINER_APP_ENV = "neurodata-env"
$CONTAINER_APP_NAME = "neurodata-worker"
$IMAGE_NAME = "neurodata-worker"
$IMAGE_TAG = "latest"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     Deploying Neurodata Cloud Worker to Azure                ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check required environment variables
if (-not $env:SUPABASE_URL -or -not $env:SUPABASE_SERVICE_ROLE_KEY -or -not $env:GEMINI_API_KEY) {
    Write-Host "❌ Missing required environment variables!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please set:" -ForegroundColor Yellow
    Write-Host '  $env:SUPABASE_URL = "https://your-project.supabase.co"'
    Write-Host '  $env:SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key"'
    Write-Host '  $env:GEMINI_API_KEY = "your-gemini-api-key"'
    Write-Host ""
    exit 1
}

Write-Host "✓ Environment variables configured" -ForegroundColor Green

# Step 1: Create Resource Group
Write-Host ""
Write-Host "Step 1/6: Creating resource group..." -ForegroundColor Yellow
az group create --name $RESOURCE_GROUP --location $LOCATION --output none 2>$null
Write-Host "✓ Resource group: $RESOURCE_GROUP" -ForegroundColor Green

# Step 2: Create Container Registry
Write-Host ""
Write-Host "Step 2/6: Creating container registry..." -ForegroundColor Yellow
try {
    az acr create --resource-group $RESOURCE_GROUP --name $CONTAINER_REGISTRY --sku Basic --admin-enabled true --output none 2>$null
}
catch {
    Write-Host "  (Registry already exists)" -ForegroundColor Gray
}
Write-Host "✓ Container registry: $CONTAINER_REGISTRY" -ForegroundColor Green

# Step 3: Build and push Docker image
Write-Host ""
Write-Host "Step 3/6: Building and pushing Docker image..." -ForegroundColor Yellow
az acr build --registry $CONTAINER_REGISTRY --image "${IMAGE_NAME}:${IMAGE_TAG}" --file Dockerfile . --output none
Write-Host "✓ Image built and pushed: $CONTAINER_REGISTRY.azurecr.io/${IMAGE_NAME}:${IMAGE_TAG}" -ForegroundColor Green

# Step 4: Create Container Apps Environment
Write-Host ""
Write-Host "Step 4/6: Creating Container Apps environment..." -ForegroundColor Yellow
try {
    az containerapp env create --name $CONTAINER_APP_ENV --resource-group $RESOURCE_GROUP --location $LOCATION --output none 2>$null
}
catch {
    Write-Host "  (Environment already exists)" -ForegroundColor Gray
}
Write-Host "✓ Container Apps environment: $CONTAINER_APP_ENV" -ForegroundColor Green

# Get registry credentials
$ACR_PASSWORD = az acr credential show --name $CONTAINER_REGISTRY --query "passwords[0].value" -o tsv
$ACR_USERNAME = az acr credential show --name $CONTAINER_REGISTRY --query "username" -o tsv

# Step 5: Create/Update Container App
Write-Host ""
Write-Host "Step 5/6: Deploying Container App..." -ForegroundColor Yellow

# Check if app exists
$APP_EXISTS = az containerapp show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --query "name" -o tsv 2>$null

if (-not $APP_EXISTS) {
    # Create new app
    az containerapp create `
        --name $CONTAINER_APP_NAME `
        --resource-group $RESOURCE_GROUP `
        --environment $CONTAINER_APP_ENV `
        --image "$CONTAINER_REGISTRY.azurecr.io/${IMAGE_NAME}:${IMAGE_TAG}" `
        --registry-server "$CONTAINER_REGISTRY.azurecr.io" `
        --registry-username $ACR_USERNAME `
        --registry-password $ACR_PASSWORD `
        --cpu 1.0 `
        --memory 2.0Gi `
        --min-replicas 0 `
        --max-replicas 3 `
        --secrets "supabase-url=$env:SUPABASE_URL" "supabase-key=$env:SUPABASE_SERVICE_ROLE_KEY" "gemini-key=$env:GEMINI_API_KEY" `
        --env-vars "SUPABASE_URL=secretref:supabase-url" "SUPABASE_SERVICE_ROLE_KEY=secretref:supabase-key" "GEMINI_API_KEY=secretref:gemini-key" `
        --output none
}
else {
    # Update existing app
    az containerapp update `
        --name $CONTAINER_APP_NAME `
        --resource-group $RESOURCE_GROUP `
        --image "$CONTAINER_REGISTRY.azurecr.io/${IMAGE_NAME}:${IMAGE_TAG}" `
        --set-env-vars "SUPABASE_URL=secretref:supabase-url" "SUPABASE_SERVICE_ROLE_KEY=secretref:supabase-key" "GEMINI_API_KEY=secretref:gemini-key" `
        --output none
}

Write-Host "✓ Container App deployed: $CONTAINER_APP_NAME" -ForegroundColor Green

# Step 6: Summary
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "                    DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Container App:    $CONTAINER_APP_NAME"
Write-Host "Resource Group:   $RESOURCE_GROUP"
Write-Host "Registry:         $CONTAINER_REGISTRY.azurecr.io"
Write-Host ""
Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  - CPU: 1.0 cores"
Write-Host "  - Memory: 2.0 Gi"
Write-Host "  - Min replicas: 0 (scale to zero when idle)"
Write-Host "  - Max replicas: 3 (auto-scale on demand)"
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Yellow
Write-Host "  View logs:     az containerapp logs show -n $CONTAINER_APP_NAME -g $RESOURCE_GROUP --follow"
Write-Host "  Check status:  az containerapp show -n $CONTAINER_APP_NAME -g $RESOURCE_GROUP --query properties.runningStatus"
Write-Host "  Scale up:      az containerapp update -n $CONTAINER_APP_NAME -g $RESOURCE_GROUP --min-replicas 1"
Write-Host "  Scale down:    az containerapp update -n $CONTAINER_APP_NAME -g $RESOURCE_GROUP --min-replicas 0"
Write-Host ""
Write-Host "Estimated costs:" -ForegroundColor Yellow
Write-Host "  - Idle: `$0/month (scale to zero)"
Write-Host "  - Running: ~`$0.000024/vCPU-second + `$0.000003/GiB-second"
Write-Host "  - ~`$0.10-0.50/day under normal usage"
Write-Host ""
