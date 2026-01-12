/**
 * Master Data Sync Script for NeuroData Hub
 * 
 * Orchestrates syncing from all data sources:
 * 1. Downloads data locally from each source
 * 2. Uploads to Supabase
 * 
 * Run: npm run sync:all
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCRIPTS_DIR = __dirname;
const DATA_DIR = path.join(__dirname, '..', 'data');

interface SyncResult {
  source: string;
  success: boolean;
  message: string;
  duration: number;
}

function runScript(scriptPath: string, description: string): SyncResult {
  const startTime = Date.now();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔄 ${description}`);
  console.log('='.repeat(60));

  try {
    execSync(`npx ts-node "${scriptPath}"`, {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
    });

    return {
      source: description,
      success: true,
      message: 'Completed successfully',
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      source: description,
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    };
  }
}

async function main(): Promise<void> {
  console.log('🧠 NeuroData Hub - Data Sync Pipeline');
  console.log('=====================================\n');
  console.log(`📅 Started at: ${new Date().toLocaleString()}`);
  console.log(`📁 Data directory: ${DATA_DIR}\n`);

  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const results: SyncResult[] = [];

  // Parse command line args
  const args = process.argv.slice(2);
  const skipDownload = args.includes('--skip-download');
  const skipUpload = args.includes('--skip-upload');
  const sourceFilter = args.find(a => a.startsWith('--source='))?.split('=')[1];

  // Step 1: Download from sources
  if (!skipDownload) {
    console.log('\n📥 PHASE 1: Downloading from sources...');
    
    if (!sourceFilter || sourceFilter === 'openneuro') {
      results.push(runScript(
        path.join(SCRIPTS_DIR, 'sync-openneuro.ts'),
        'OpenNeuro Sync'
      ));
    }

    if (!sourceFilter || sourceFilter === 'allen') {
      results.push(runScript(
        path.join(SCRIPTS_DIR, 'sync-allen.ts'),
        'Allen Brain Atlas Sync'
      ));
    }

    if (!sourceFilter || sourceFilter === 'hcp') {
      results.push(runScript(
        path.join(SCRIPTS_DIR, 'sync-hcp.ts'),
        'HCP Metadata Sync'
      ));
    }
  } else {
    console.log('\n⏭️ Skipping download phase (--skip-download)');
  }

  // Step 2: Upload to Supabase
  if (!skipUpload) {
    console.log('\n📤 PHASE 2: Uploading to Supabase...');
    results.push(runScript(
      path.join(SCRIPTS_DIR, 'upload-to-supabase.ts'),
      'Upload to Supabase'
    ));
  } else {
    console.log('\n⏭️ Skipping upload phase (--skip-upload)');
  }

  // Summary
  console.log('\n');
  console.log('='.repeat(60));
  console.log('📊 SYNC SUMMARY');
  console.log('='.repeat(60));
  
  let allSuccess = true;
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const duration = (result.duration / 1000).toFixed(1);
    console.log(`${status} ${result.source}: ${result.message} (${duration}s)`);
    if (!result.success) allSuccess = false;
  });

  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  console.log(`\n⏱️ Total time: ${(totalDuration / 1000).toFixed(1)}s`);
  console.log(`📅 Finished at: ${new Date().toLocaleString()}`);

  if (!allSuccess) {
    console.log('\n⚠️ Some syncs failed. Check logs above for details.');
    process.exit(1);
  }

  console.log('\n🎉 All syncs completed successfully!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
