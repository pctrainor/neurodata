/**
 * Upload Local Data to Supabase
 * 
 * Reads locally downloaded data files and uploads them to Supabase.
 * Run this after syncing data from sources.
 * 
 * Run: npx ts-node scripts/upload-to-supabase.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const DATA_DIR = path.join(__dirname, '..', 'data');

interface LocalStudy {
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
  raw_data: any;
}

interface LocalBrainRegion {
  external_id: string;
  name: string;
  abbreviation: string;
  atlas: string;
  parent_region_id: string | null;
  hemisphere: string;
  description: string;
  color_hex: string;
  depth: number;
}

async function getSourceId(sourceName: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('data_sources')
    .select('id')
    .eq('short_name', sourceName)
    .single();

  if (error || !data) {
    console.warn(`⚠️ Source '${sourceName}' not found in database`);
    return null;
  }
  return data.id;
}

async function uploadOpenNeuroStudies(): Promise<number> {
  const filePath = path.join(DATA_DIR, 'openneuro', 'studies-latest.json');
  
  if (!fs.existsSync(filePath)) {
    console.log('⏭️ No OpenNeuro data found, skipping...');
    return 0;
  }

  console.log('📤 Uploading OpenNeuro studies...');
  
  const studies: LocalStudy[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const sourceId = await getSourceId('OpenNeuro');

  if (!sourceId) {
    console.error('❌ OpenNeuro source not found in database. Run the schema first.');
    return 0;
  }

  let uploaded = 0;
  let errors = 0;

  // Process in batches of 20 to avoid rate limits
  const batchSize = 20;
  for (let i = 0; i < studies.length; i += batchSize) {
    const batch = studies.slice(i, i + batchSize);
    
    const rows = batch.map(study => ({
      source_id: sourceId,
      external_id: study.external_id,
      title: study.title,
      authors: study.authors,
      abstract: study.abstract,
      doi: study.doi,
      keywords: study.keywords,
      sample_size: study.sample_size,
      modalities: study.modalities,
      conditions: study.conditions,
      access_level: study.access_level,
    }));

    // Use insert instead of upsert (no unique constraint on external_id yet)
    // First check if any already exist
    const existingIds = await Promise.all(
      batch.map(async (study) => {
        const { data } = await supabase
          .from('studies')
          .select('id')
          .eq('external_id', study.external_id)
          .single();
        return data ? study.external_id : null;
      })
    );
    
    const newRows = rows.filter((_, idx) => !existingIds[idx]);
    
    if (newRows.length === 0) {
      console.log(`   Batch ${i / batchSize + 1}: All studies already exist`);
      continue;
    }

    const { data, error } = await supabase
      .from('studies')
      .insert(newRows)
      .select('id');

    if (error) {
      console.error(`   Batch ${i / batchSize + 1} error:`, error.message);
      errors += batch.length;
    } else {
      uploaded += data?.length || 0;
      console.log(`   Batch ${i / batchSize + 1}: ${data?.length || 0} studies uploaded`);
    }
  }

  console.log(`✅ OpenNeuro: ${uploaded} uploaded, ${errors} errors`);
  return uploaded;
}

async function uploadAllenBrainRegions(): Promise<number> {
  const filePath = path.join(DATA_DIR, 'allen', 'brain-regions-latest.json');
  
  if (!fs.existsSync(filePath)) {
    console.log('⏭️ No Allen Brain Atlas data found, skipping...');
    return 0;
  }

  console.log('📤 Uploading Allen brain regions...');
  
  const regions: LocalBrainRegion[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  // Filter to just the top-level important regions (depth <= 4) to avoid too much data
  const filteredRegions = regions.filter(r => r.depth <= 4);
  console.log(`   Filtered to ${filteredRegions.length} regions (depth <= 4)`);

  let uploaded = 0;
  let errors = 0;

  // Upload in batches
  const batchSize = 50;
  for (let i = 0; i < filteredRegions.length; i += batchSize) {
    const batch = filteredRegions.slice(i, i + batchSize);
    
    const rows = batch.map(region => ({
      name: region.name,
      abbreviation: region.abbreviation,
      atlas: region.atlas,
      hemisphere: region.hemisphere,
      description: region.description,
    }));

    // Check which regions already exist
    const existingNames = await Promise.all(
      batch.map(async (region) => {
        const { data } = await supabase
          .from('brain_regions')
          .select('id')
          .eq('name', region.name)
          .eq('atlas', region.atlas)
          .single();
        return data ? region.name : null;
      })
    );
    
    const newRows = rows.filter((_, idx) => !existingNames[idx]);
    
    if (newRows.length === 0) {
      continue; // All regions already exist
    }

    const { data, error } = await supabase
      .from('brain_regions')
      .insert(newRows)
      .select('id');

    if (error) {
      // May fail due to unique constraint - that's OK
      if (!error.message.includes('unique')) {
        console.error(`   Batch error:`, error.message);
        errors += batch.length;
      }
    } else {
      uploaded += data?.length || 0;
    }
  }

  console.log(`✅ Allen: ${uploaded} brain regions uploaded`);
  return uploaded;
}

async function updateSyncTimestamps(): Promise<void> {
  console.log('\n📅 Updating sync timestamps...');
  
  const now = new Date().toISOString();
  
  // Update OpenNeuro
  await supabase
    .from('data_sources')
    .update({ last_synced_at: now })
    .eq('short_name', 'OpenNeuro');

  // Update Allen
  await supabase
    .from('data_sources')
    .update({ last_synced_at: now })
    .eq('short_name', 'Allen');

  // Update HCP
  await supabase
    .from('data_sources')
    .update({ last_synced_at: now })
    .eq('short_name', 'HCP');

  console.log('✅ Timestamps updated');
}

async function uploadHCPData(): Promise<number> {
  const studiesPath = path.join(DATA_DIR, 'hcp', 'studies-latest.json');
  const datasetsPath = path.join(DATA_DIR, 'hcp', 'datasets-latest.json');
  
  if (!fs.existsSync(studiesPath)) {
    console.log('⏭️ No HCP data found, skipping...');
    return 0;
  }

  console.log('📤 Uploading HCP data...');
  
  const sourceId = await getSourceId('HCP');
  if (!sourceId) {
    console.error('❌ HCP source not found in database.');
    return 0;
  }

  let uploaded = 0;

  // Upload studies
  interface HCPStudy {
    external_id: string;
    title: string;
    authors: string[];
    abstract: string;
    doi: string | null;
    pubmed_id: string | null;
    journal: string | null;
    publication_date: string | null;
    keywords: string[];
    sample_size: number;
    age_range: string;
    modalities: string[];
    conditions: string[];
    access_level: string;
  }
  
  const studies: HCPStudy[] = JSON.parse(fs.readFileSync(studiesPath, 'utf-8'));
  
  for (const study of studies) {
    // Check if exists
    const { data: existing } = await supabase
      .from('studies')
      .select('id')
      .eq('external_id', study.external_id)
      .single();
    
    if (existing) {
      continue;
    }

    const { error } = await supabase
      .from('studies')
      .insert({
        source_id: sourceId,
        external_id: study.external_id,
        title: study.title,
        authors: study.authors,
        abstract: study.abstract,
        doi: study.doi,
        pubmed_id: study.pubmed_id,
        journal: study.journal,
        publication_date: study.publication_date,
        keywords: study.keywords,
        sample_size: study.sample_size,
        age_range: study.age_range,
        modalities: study.modalities,
        conditions: study.conditions,
        access_level: study.access_level,
      });

    if (!error) {
      uploaded++;
    }
  }
  console.log(`   Studies: ${uploaded} uploaded`);

  // Upload datasets
  if (fs.existsSync(datasetsPath)) {
    interface HCPDataset {
      name: string;
      description: string;
      file_type: string;
      modality: string;
      preprocessing_level: string;
      subjects_count: number;
      access_level: string;
      file_size_mb: number;
    }
    
    const datasets: HCPDataset[] = JSON.parse(fs.readFileSync(datasetsPath, 'utf-8'));
    let datasetCount = 0;

    for (const dataset of datasets) {
      // Check if exists
      const { data: existing } = await supabase
        .from('datasets')
        .select('id')
        .eq('name', dataset.name)
        .single();
      
      if (existing) {
        continue;
      }

      const { error } = await supabase
        .from('datasets')
        .insert({
          source_id: sourceId,
          name: dataset.name,
          description: dataset.description,
          file_type: dataset.file_type,
          modality: dataset.modality,
          preprocessing_level: dataset.preprocessing_level,
          subjects_count: dataset.subjects_count,
          access_level: dataset.access_level,
          file_size_mb: dataset.file_size_mb,
        });

      if (!error) {
        datasetCount++;
        uploaded++;
      }
    }
    console.log(`   Datasets: ${datasetCount} uploaded`);
  }

  console.log(`✅ HCP: ${uploaded} total uploaded`);
  return uploaded;
}

async function printStats(): Promise<void> {
  console.log('\n📊 Database Stats:');
  
  // Count studies
  const { count: studyCount } = await supabase
    .from('studies')
    .select('*', { count: 'exact', head: true });
  console.log(`   Studies: ${studyCount || 0}`);

  // Count brain regions
  const { count: regionCount } = await supabase
    .from('brain_regions')
    .select('*', { count: 'exact', head: true });
  console.log(`   Brain Regions: ${regionCount || 0}`);

  // Count datasets
  const { count: datasetCount } = await supabase
    .from('datasets')
    .select('*', { count: 'exact', head: true });
  console.log(`   Datasets: ${datasetCount || 0}`);
}

async function main(): Promise<void> {
  console.log('🚀 Starting upload to Supabase...\n');
  console.log(`📡 Supabase URL: ${SUPABASE_URL}\n`);

  try {
    // Test connection
    const { data, error } = await supabase
      .from('data_sources')
      .select('name')
      .limit(1);

    if (error) {
      throw new Error(`Connection failed: ${error.message}`);
    }
    console.log('✅ Connected to Supabase\n');

    // Upload data from each source
    const openNeuroCount = await uploadOpenNeuroStudies();
    const allenCount = await uploadAllenBrainRegions();
    const hcpCount = await uploadHCPData();

    // Update timestamps
    await updateSyncTimestamps();

    // Print final stats
    await printStats();

    console.log('\n🎉 Upload complete!');
    console.log(`   Total uploaded: ${openNeuroCount + allenCount + hcpCount} items`);

  } catch (error) {
    console.error('\n❌ Upload failed:', error);
    process.exit(1);
  }
}

main();
