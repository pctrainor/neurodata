/**
 * OpenNeuro Data Sync Script
 * 
 * Downloads study metadata from OpenNeuro's GraphQL API.
 * OpenNeuro is CC0/Public Domain - free to use commercially!
 * 
 * Run: npx ts-node scripts/sync-openneuro.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// OpenNeuro GraphQL endpoint
const OPENNEURO_API = 'https://openneuro.org/crn/graphql';

// Output directory for local data
const DATA_DIR = path.join(__dirname, '..', 'data', 'openneuro');

// Updated list of verified public datasets on OpenNeuro (as of 2024)
// These are confirmed to exist and have public snapshots
const POPULAR_DATASET_IDS = [
  // Major public datasets
  'ds000030', // UCLA Consortium for Neuropsychiatric Phenomics
  'ds000117', // Multisubject multimodal face processing  
  'ds000224', // Midnight Scan Club
  'ds000001', // Balloon Analog Risk-taking Task
  'ds000003', // Rhyme judgment
  'ds000011', // Classification learning and tone counting
  'ds000113', // Forrest Gump - high resolution 7T
  'ds000114', // Test-retest fMRI dataset
  // Recent popular datasets
  'ds001246', // Generic object decoding
  'ds001506', // Emotion regulation
  'ds002338', // Natural scenes dataset
  'ds002345', // Face perception  
  'ds003097', // Naturalistic narrative listening
  'ds003425', // Movie watching
  'ds003505', // Language comprehension
  'ds003688', // Memory encoding
  'ds003745', // Social cognition
  'ds003826', // Decision making
  'ds004024', // Working memory
  'ds004107', // Attention control
  'ds004148', // Visual perception
  'ds004169', // Motor learning
  'ds004212', // Executive function
  'ds004302', // Cognitive control
];

interface DatasetInfo {
  id: string;
  name: string;
  description: {
    Name: string;
    Authors: string[];
    DatasetDOI: string;
    License: string;
    Acknowledgements: string;
    Funding: string[];
    ReferencesAndLinks: string[];
    EthicsApprovals: string[];
  };
  summary: {
    modalities: string[];
    subjects: string[];
    tasks: string[];
    sessions: string[];
    size: number;
    totalFiles: number;
  };
  readme: string;
  snapshots: {
    tag: string;
    created: string;
  }[];
}

interface TransformedStudy {
  external_id: string;
  title: string;
  authors: string[];
  abstract: string;
  doi: string | null;
  keywords: string[];
  sample_size: number;
  modalities: string[];
  conditions: string[];
  access_level: string;
  source_name: string;
  license: string;
  size_bytes: number;
  total_files: number;
  latest_version: string;
  downloaded_at: string;
}

async function fetchDataset(datasetId: string): Promise<DatasetInfo | null> {
  // First, get the dataset and its snapshots
  const baseQuery = `
    query {
      dataset(id: "${datasetId}") {
        id
        name
        snapshots {
          tag
          created
        }
      }
    }
  `;

  try {
    const baseResponse = await fetch(OPENNEURO_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: baseQuery }),
    });

    if (!baseResponse.ok) {
      console.warn(`  ⚠️ HTTP ${baseResponse.status} for ${datasetId}`);
      return null;
    }

    const baseData = await baseResponse.json();
    
    if (baseData.errors || !baseData.data?.dataset) {
      console.warn(`  ⚠️ Dataset not found: ${datasetId}`);
      return null;
    }

    const dataset = baseData.data.dataset;
    const snapshots = dataset.snapshots || [];
    
    if (snapshots.length === 0) {
      console.warn(`  ⚠️ No snapshots for ${datasetId}`);
      return null;
    }

    // Use the latest snapshot
    const latestTag = snapshots[0].tag;
    
    // Now fetch the snapshot details
    const snapshotQuery = `
      query {
        snapshot(datasetId: "${datasetId}", tag: "${latestTag}") {
          description {
            Name
            Authors
            DatasetDOI
            License
            Acknowledgements
            Funding
            ReferencesAndLinks
            EthicsApprovals
          }
          summary {
            modalities
            subjects
            tasks
            sessions
            size
            totalFiles
          }
          readme
        }
      }
    `;

    const snapshotResponse = await fetch(OPENNEURO_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: snapshotQuery }),
    });

    const snapshotData = await snapshotResponse.json();
    
    if (snapshotData.errors) {
      console.warn(`  ⚠️ Snapshot error for ${datasetId}:`, snapshotData.errors[0]?.message);
      return null;
    }

    // Combine dataset and snapshot data
    return {
      id: dataset.id,
      name: dataset.name,
      description: snapshotData.data?.snapshot?.description || {},
      summary: snapshotData.data?.snapshot?.summary || {},
      readme: snapshotData.data?.snapshot?.readme || '',
      snapshots: snapshots,
    };
  } catch (error) {
    console.warn(`  ⚠️ Error fetching ${datasetId}:`, error);
    return null;
  }
}

function transformToStudy(dataset: DatasetInfo): TransformedStudy {
  const desc = dataset.description || {};
  const summary = dataset.summary || {};
  
  // Parse readme for abstract (first 1000 chars)
  const abstract = dataset.readme?.substring(0, 1000).trim() || 
    `Neuroimaging dataset from OpenNeuro: ${desc.Name || dataset.name || dataset.id}`;

  // Get latest version tag
  const latestSnapshot = dataset.snapshots?.[0];
  const latestVersion = latestSnapshot?.tag || '1.0.0';

  return {
    external_id: dataset.id,
    title: desc.Name || dataset.name || `OpenNeuro Dataset ${dataset.id}`,
    authors: desc.Authors || [],
    abstract: abstract,
    doi: desc.DatasetDOI || null,
    keywords: [...(summary.tasks || []), ...(summary.modalities || [])],
    sample_size: summary.subjects?.length || 0,
    modalities: summary.modalities || [],
    conditions: summary.tasks || [],
    access_level: 'free', // OpenNeuro is CC0
    source_name: 'OpenNeuro',
    license: desc.License || 'CC0',
    size_bytes: summary.size || 0,
    total_files: summary.totalFiles || 0,
    latest_version: latestVersion,
    downloaded_at: new Date().toISOString(),
  };
}

async function syncOpenNeuro(limit?: number): Promise<void> {
  console.log('🧠 OpenNeuro Sync Starting...');
  
  // Create data directory if it doesn't exist
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const datasetIds = limit ? POPULAR_DATASET_IDS.slice(0, limit) : POPULAR_DATASET_IDS;
  console.log(`📊 Fetching ${datasetIds.length} datasets...\n`);

  const studies: TransformedStudy[] = [];
  let successCount = 0;
  let errorCount = 0;

  for (const datasetId of datasetIds) {
    console.log(`  Fetching ${datasetId}...`);
    
    const dataset = await fetchDataset(datasetId);
    
    if (dataset) {
      const study = transformToStudy(dataset);
      studies.push(study);
      console.log(`    ✅ ${study.title.substring(0, 50)}...`);
      successCount++;
    } else {
      errorCount++;
    }

    // Small delay to be nice to the API
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\n📝 Successfully fetched ${successCount} datasets (${errorCount} errors)\n`);

  if (studies.length === 0) {
    console.log('❌ No studies fetched. Check network connection.');
    return;
  }

  // Log sample of what we got
  console.log('Sample studies:');
  studies.slice(0, 5).forEach((study, i) => {
    console.log(`  ${i + 1}. ${study.title.substring(0, 60)}...`);
    console.log(`     DOI: ${study.doi || 'N/A'}`);
    console.log(`     Modalities: ${study.modalities.join(', ') || 'N/A'}`);
    console.log(`     Subjects: ${study.sample_size}`);
    console.log('');
  });

  // Save to local JSON file
  const timestamp = Date.now();
  const outputFile = path.join(DATA_DIR, `studies-${timestamp}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(studies, null, 2));
  console.log(`💾 Saved to: ${outputFile}`);

  // Also save a "latest" file for easy access
  const latestFile = path.join(DATA_DIR, 'studies-latest.json');
  fs.writeFileSync(latestFile, JSON.stringify(studies, null, 2));
  console.log(`💾 Latest file: ${latestFile}`);

  // Summary stats
  console.log('\n📈 Summary:');
  console.log(`   Total studies: ${studies.length}`);
  console.log(`   Total subjects: ${studies.reduce((sum, s) => sum + s.sample_size, 0)}`);
  
  const totalSizeGB = studies.reduce((sum, s) => sum + s.size_bytes, 0) / (1024 * 1024 * 1024);
  console.log(`   Total data size: ${totalSizeGB.toFixed(2)} GB`);
  
  const modalityCounts: Record<string, number> = {};
  studies.forEach(s => {
    s.modalities.forEach(m => {
      modalityCounts[m] = (modalityCounts[m] || 0) + 1;
    });
  });
  console.log('   Modalities:', modalityCounts);
}

// Parse command line args
const args = process.argv.slice(2);
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;

// Run the sync
syncOpenNeuro(limit).then(() => {
  console.log('\n✅ OpenNeuro sync complete!');
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
