#!/bin/bash
# =============================================================================
# Neurodata Cloud Worker - Azure Container Apps Deployment
# =============================================================================
# 
# Prerequisites:
#   - Azure CLI installed and logged in (az login)
#   - Docker installed
#
# Usage:
#   ./deploy-azure.sh
#
# Environment variables (set these before running):
#   SUPABASE_URL              - Your Supabase project URL
#   SUPABASE_SERVICE_ROLE_KEY - Supabase service role key (NOT anon key)
#   GEMINI_API_KEY            - Google Gemini API key
# =============================================================================

set -e

# Configuration
RESOURCE_GROUP="neurodata-cloud"
LOCATION="eastus"
CONTAINER_REGISTRY="neurodataacr"
CONTAINER_APP_ENV="neurodata-env"
CONTAINER_APP_NAME="neurodata-worker"
IMAGE_NAME="neurodata-worker"
IMAGE_TAG="latest"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     Deploying Neurodata Cloud Worker to Azure                ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check required environment variables
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ] || [ -z "$GEMINI_API_KEY" ]; then
  echo "❌ Missing required environment variables!"
  echo ""
  echo "Please set:"
  echo "  export SUPABASE_URL='https://your-project.supabase.co'"
  echo "  export SUPABASE_SERVICE_ROLE_KEY='your-service-role-key'"
  echo "  export GEMINI_API_KEY='your-gemini-api-key'"
  echo ""
  exit 1
fi

echo "✓ Environment variables configured"

# Step 1: Create Resource Group
echo ""
echo "Step 1/6: Creating resource group..."
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION \
  --output none
echo "✓ Resource group: $RESOURCE_GROUP"

# Step 2: Create Container Registry
echo ""
echo "Step 2/6: Creating container registry..."
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $CONTAINER_REGISTRY \
  --sku Basic \
  --admin-enabled true \
  --output none 2>/dev/null || echo "  (Registry already exists)"
echo "✓ Container registry: $CONTAINER_REGISTRY"

# Step 3: Build and push Docker image
echo ""
echo "Step 3/6: Building and pushing Docker image..."
az acr build \
  --registry $CONTAINER_REGISTRY \
  --image $IMAGE_NAME:$IMAGE_TAG \
  --file Dockerfile \
  . \
  --output none
echo "✓ Image built and pushed: $CONTAINER_REGISTRY.azurecr.io/$IMAGE_NAME:$IMAGE_TAG"

# Step 4: Create Container Apps Environment
echo ""
echo "Step 4/6: Creating Container Apps environment..."
az containerapp env create \
  --name $CONTAINER_APP_ENV \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --output none 2>/dev/null || echo "  (Environment already exists)"
echo "✓ Container Apps environment: $CONTAINER_APP_ENV"

# Get registry credentials
ACR_PASSWORD=$(az acr credential show --name $CONTAINER_REGISTRY --query "passwords[0].value" -o tsv)
ACR_USERNAME=$(az acr credential show --name $CONTAINER_REGISTRY --query "username" -o tsv)

# Step 5: Create/Update Container App
echo ""
echo "Step 5/6: Deploying Container App..."

# Check if app exists
APP_EXISTS=$(az containerapp show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --query "name" -o tsv 2>/dev/null || echo "")

if [ -z "$APP_EXISTS" ]; then
  # Create new app
  az containerapp create \
    --name $CONTAINER_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --environment $CONTAINER_APP_ENV \
    --image $CONTAINER_REGISTRY.azurecr.io/$IMAGE_NAME:$IMAGE_TAG \
    --registry-server $CONTAINER_REGISTRY.azurecr.io \
    --registry-username $ACR_USERNAME \
    --registry-password $ACR_PASSWORD \
    --cpu 1.0 \
    --memory 2.0Gi \
    --min-replicas 0 \
    --max-replicas 3 \
    --secrets \
      supabase-url="$SUPABASE_URL" \
      supabase-key="$SUPABASE_SERVICE_ROLE_KEY" \
      gemini-key="$GEMINI_API_KEY" \
    --env-vars \
      SUPABASE_URL=secretref:supabase-url \
      SUPABASE_SERVICE_ROLE_KEY=secretref:supabase-key \
      GEMINI_API_KEY=secretref:gemini-key \
    --scale-rule-name job-queue \
    --scale-rule-type azure-queue \
    --scale-rule-metadata "queueName=cloud-compute-jobs" "queueLength=1" \
    --output none
else
  # Update existing app
  az containerapp update \
    --name $CONTAINER_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --image $CONTAINER_REGISTRY.azurecr.io/$IMAGE_NAME:$IMAGE_TAG \
    --set-env-vars \
      SUPABASE_URL=secretref:supabase-url \
      SUPABASE_SERVICE_ROLE_KEY=secretref:supabase-key \
      GEMINI_API_KEY=secretref:gemini-key \
    --output none
fi

echo "✓ Container App deployed: $CONTAINER_APP_NAME"

# Step 6: Get deployment info
echo ""
echo "Step 6/6: Getting deployment information..."

APP_URL=$(az containerapp show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "properties.configuration.ingress.fqdn" \
  -o tsv 2>/dev/null || echo "N/A (no ingress)")

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "                    DEPLOYMENT COMPLETE!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Container App:    $CONTAINER_APP_NAME"
echo "Resource Group:   $RESOURCE_GROUP"
echo "Registry:         $CONTAINER_REGISTRY.azurecr.io"
echo ""
echo "Configuration:"
echo "  - CPU: 1.0 cores"
echo "  - Memory: 2.0 Gi"
echo "  - Min replicas: 0 (scale to zero when idle)"
echo "  - Max replicas: 3 (auto-scale on demand)"
echo ""
echo "Useful commands:"
echo "  View logs:     az containerapp logs show -n $CONTAINER_APP_NAME -g $RESOURCE_GROUP --follow"
echo "  Check status:  az containerapp show -n $CONTAINER_APP_NAME -g $RESOURCE_GROUP --query properties.runningStatus"
echo "  Scale up:      az containerapp update -n $CONTAINER_APP_NAME -g $RESOURCE_GROUP --min-replicas 1"
echo "  Scale down:    az containerapp update -n $CONTAINER_APP_NAME -g $RESOURCE_GROUP --min-replicas 0"
echo ""
echo "Estimated costs:"
echo "  - Idle: $0/month (scale to zero)"
echo "  - Running: ~$0.000024/vCPU-second + $0.000003/GiB-second"
echo "  - ~$0.10-0.50/day under normal usage"
echo ""
