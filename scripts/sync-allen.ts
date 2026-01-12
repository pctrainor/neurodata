/**
 * Allen Brain Atlas Data Sync Script
 * 
 * Downloads brain structure and gene expression data from Allen Brain Atlas API.
 * Allen Institute data is free for research and commercial use with attribution.
 * 
 * Run: npx ts-node scripts/sync-allen.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Allen Brain Atlas API endpoints
const ALLEN_API_BASE = 'http://api.brain-map.org/api/v2';

// Output directory for local data
const DATA_DIR = path.join(__dirname, '..', 'data', 'allen');

interface AllenStructure {
  id: number;
  atlas_id: number;
  ontology_id: number;
  acronym: string;
  name: string;
  color_hex_triplet: string;
  graph_order: number;
  structure_id_path: string;
  hemisphere_id: number;
  parent_structure_id: number | null;
  depth: number;
  safe_name: string;
}

interface AllenGene {
  id: number;
  acronym: string;
  name: string;
  entrez_id: number;
  gene_symbol: string;
  organism_id: number;
  chromosome_id: number;
  original_name: string;
}

interface AllenExperiment {
  id: number;
  specimen_id: number;
  plane_of_section_id: number;
  data_set_id: number;
  genes: AllenGene[];
  section_thickness: number;
  structure_unionizes: {
    structure_id: number;
    expression_density: number;
    expression_energy: number;
  }[];
}

interface TransformedBrainRegion {
  external_id: string;
  name: string;
  abbreviation: string;
  atlas: string;
  parent_region_id: string | null;
  hemisphere: string;
  description: string;
  color_hex: string;
  depth: number;
  source_name: string;
  downloaded_at: string;
}

interface TransformedGeneExpression {
  gene_symbol: string;
  gene_name: string;
  entrez_id: number;
  region_id: string;
  region_name: string;
  expression_density: number;
  expression_energy: number;
  source_name: string;
  downloaded_at: string;
}

async function fetchAllenStructures(): Promise<AllenStructure[]> {
  // Fetch human brain structures from Allen Human Brain Atlas
  const url = `${ALLEN_API_BASE}/data/query.json?criteria=model::Structure,rma::criteria,[ontology_id$eq1],rma::options[order$eq'structures.graph_order'][num_rows$eq2000]`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.msg || [];
  } catch (error) {
    console.error('Error fetching Allen structures:', error);
    throw error;
  }
}

async function fetchAllenGenes(limit: number = 100): Promise<AllenGene[]> {
  // Fetch genes with expression data
  const url = `${ALLEN_API_BASE}/data/query.json?criteria=model::Gene,rma::criteria,[organism_id$eq2],rma::options[num_rows$eq${limit}]`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.msg || [];
  } catch (error) {
    console.error('Error fetching Allen genes:', error);
    throw error;
  }
}

function transformStructure(structure: AllenStructure): TransformedBrainRegion {
  // Determine hemisphere from structure name or hemisphere_id
  let hemisphere = 'bilateral';
  if (structure.hemisphere_id === 1) hemisphere = 'left';
  if (structure.hemisphere_id === 2) hemisphere = 'right';
  if (structure.name.toLowerCase().includes('left')) hemisphere = 'left';
  if (structure.name.toLowerCase().includes('right')) hemisphere = 'right';

  return {
    external_id: `allen_${structure.id}`,
    name: structure.name,
    abbreviation: structure.acronym,
    atlas: 'Allen',
    parent_region_id: structure.parent_structure_id ? `allen_${structure.parent_structure_id}` : null,
    hemisphere: hemisphere,
    description: structure.safe_name || structure.name,
    color_hex: structure.color_hex_triplet || 'CCCCCC',
    depth: structure.depth,
    source_name: 'Allen Brain Atlas',
    downloaded_at: new Date().toISOString(),
  };
}

async function syncAllenData(): Promise<void> {
  console.log('🧬 Allen Brain Atlas Sync Starting...\n');

  // Create data directory if it doesn't exist
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  try {
    // Fetch brain structures
    console.log('📊 Fetching brain structures...');
    const structures = await fetchAllenStructures();
    console.log(`✅ Fetched ${structures.length} brain structures\n`);

    // Transform structures
    const regions: TransformedBrainRegion[] = structures.map(transformStructure);

    // Log sample of structures
    console.log('Sample brain regions:');
    regions.slice(0, 10).forEach((region, i) => {
      console.log(`  ${i + 1}. ${region.abbreviation}: ${region.name}`);
      console.log(`     Depth: ${region.depth}, Hemisphere: ${region.hemisphere}`);
    });
    console.log('');

    // Save structures
    const structuresFile = path.join(DATA_DIR, 'brain-regions-latest.json');
    fs.writeFileSync(structuresFile, JSON.stringify(regions, null, 2));
    console.log(`💾 Saved brain regions to: ${structuresFile}`);

    // Also save timestamped version
    const structuresTimestamped = path.join(DATA_DIR, `brain-regions-${Date.now()}.json`);
    fs.writeFileSync(structuresTimestamped, JSON.stringify(regions, null, 2));

    // Fetch genes
    console.log('\n📊 Fetching gene data...');
    const genes = await fetchAllenGenes(100);
    console.log(`✅ Fetched ${genes.length} genes\n`);

    // Log sample genes
    console.log('Sample genes:');
    genes.slice(0, 10).forEach((gene, i) => {
      console.log(`  ${i + 1}. ${gene.acronym}: ${gene.name}`);
    });

    // Save genes
    const genesFile = path.join(DATA_DIR, 'genes-latest.json');
    fs.writeFileSync(genesFile, JSON.stringify(genes, null, 2));
    console.log(`\n💾 Saved genes to: ${genesFile}`);

    // Summary
    console.log('\n📈 Summary:');
    console.log(`   Brain regions: ${regions.length}`);
    console.log(`   Genes: ${genes.length}`);
    
    // Count by depth level
    const depthCounts: Record<number, number> = {};
    regions.forEach(r => {
      depthCounts[r.depth] = (depthCounts[r.depth] || 0) + 1;
    });
    console.log('   Regions by depth:', depthCounts);

  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

// Run the sync
syncAllenData().then(() => {
  console.log('\n✅ Allen Brain Atlas sync complete!');
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
