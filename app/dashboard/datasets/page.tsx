'use client'

import { useState, useEffect } from 'react'
import { 
  Search, 
  Download,
  HardDrive,
  FileType,
  ExternalLink,
  Filter,
  Database,
  Lock,
  Unlock,
  Users,
  Layers
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createBrowserClient } from '@/lib/supabase'

interface Dataset {
  id: string
  study_id: string | null
  name: string
  description: string | null
  file_type: string | null
  file_size_mb: number | null
  subjects_count: number | null
  modality: string | null
  preprocessing_level: string | null
  access_level: string
  file_url: string | null
  created_at: string
  study?: { title: string; id: string } | null
}

// Format MB to human readable
function formatSize(sizeMb: number | null): string {
  if (!sizeMb) return '—'
  if (sizeMb < 1024) return `${sizeMb.toLocaleString()} MB`
  if (sizeMb < 1024 * 1024) return `${(sizeMb / 1024).toFixed(1)} GB`
  return `${(sizeMb / (1024 * 1024)).toFixed(1)} TB`
}

// Dataset Card Component
function DatasetCard({ 
  dataset, 
  onClick 
}: { 
  dataset: Dataset
  onClick: () => void
}) {
  const isOpen = dataset.access_level === 'free' || dataset.access_level === 'open'
  
  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all hover:border-indigo-300 dark:hover:border-indigo-700"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-2 rounded-lg",
              isOpen ? "bg-green-100 dark:bg-green-900/30" : "bg-amber-100 dark:bg-amber-900/30"
            )}>
              {isOpen ? 
                <Unlock className="h-4 w-4 text-green-600 dark:text-green-400" /> : 
                <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              }
            </div>
            <div>
              <CardTitle className="text-base line-clamp-1">{dataset.name}</CardTitle>
              {dataset.modality && (
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                  {dataset.modality}
                </p>
              )}
            </div>
          </div>
          {dataset.file_type && (
            <Badge variant="outline" className="shrink-0">
              {dataset.file_type.toUpperCase()}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {dataset.description && (
          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-4">
            {dataset.description}
          </p>
        )}
        
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg py-2 px-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">Size</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {formatSize(dataset.file_size_mb)}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg py-2 px-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">Subjects</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {dataset.subjects_count?.toLocaleString() || '—'}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg py-2 px-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">Access</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 capitalize">
              {dataset.access_level}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Sample public datasets library - real datasets available for download
const SAMPLE_DATASETS: Dataset[] = [
  // Human Connectome Project
  {
    id: 'hcp-behavioral',
    study_id: null,
    name: 'HCP Behavioral Data',
    description: 'Comprehensive behavioral and demographic data for all subjects including cognitive assessments, personality measures, and health metrics.',
    file_type: 'csv',
    file_size_mb: 100,
    subjects_count: 1200,
    modality: 'behavioral',
    preprocessing_level: 'processed',
    access_level: 'free',
    file_url: 'https://db.humanconnectome.org',
    created_at: new Date().toISOString(),
    study: null
  },
  {
    id: 'hcp-connectome',
    study_id: null,
    name: 'HCP Group Connectome Matrices',
    description: 'Pre-computed group-level structural and functional connectivity matrices for 1200 subjects.',
    file_type: 'mat',
    file_size_mb: 4900,
    subjects_count: 1200,
    modality: 'connectivity',
    preprocessing_level: 'processed',
    access_level: 'free',
    file_url: 'https://db.humanconnectome.org',
    created_at: new Date().toISOString(),
    study: null
  },
  {
    id: 'hcp-dti',
    study_id: null,
    name: 'HCP Diffusion Tensor Imaging',
    description: 'High-resolution DTI data with 270 directions per subject, preprocessed and ready for tractography analysis.',
    file_type: 'nifti',
    file_size_mb: 85000,
    subjects_count: 1200,
    modality: 'DTI',
    preprocessing_level: 'minimally processed',
    access_level: 'free',
    file_url: 'https://db.humanconnectome.org',
    created_at: new Date().toISOString(),
    study: null
  },
  // OpenNeuro datasets
  {
    id: 'openneuro-ds000117',
    study_id: null,
    name: 'Multi-subject, multi-modal neuroimaging',
    description: 'Faces, houses, and phase-scrambled images with MEG and fMRI from the same subjects for method comparison.',
    file_type: 'bids',
    file_size_mb: 47000,
    subjects_count: 19,
    modality: 'fMRI, MEG',
    preprocessing_level: 'raw',
    access_level: 'free',
    file_url: 'https://openneuro.org/datasets/ds000117',
    created_at: new Date().toISOString(),
    study: null
  },
  {
    id: 'openneuro-ds002338',
    study_id: null,
    name: 'Naturalistic Driving Study fMRI',
    description: 'fMRI data from subjects watching driving videos, useful for attention and navigation research.',
    file_type: 'bids',
    file_size_mb: 12000,
    subjects_count: 24,
    modality: 'fMRI',
    preprocessing_level: 'raw',
    access_level: 'free',
    file_url: 'https://openneuro.org/datasets/ds002338',
    created_at: new Date().toISOString(),
    study: null
  },
  {
    id: 'openneuro-ds003097',
    study_id: null,
    name: 'EEG Motor Imagery Dataset',
    description: 'High-density EEG during motor imagery tasks, ideal for BCI research and motor cortex studies.',
    file_type: 'bids',
    file_size_mb: 8500,
    subjects_count: 109,
    modality: 'EEG',
    preprocessing_level: 'raw',
    access_level: 'free',
    file_url: 'https://openneuro.org/datasets/ds003097',
    created_at: new Date().toISOString(),
    study: null
  },
  {
    id: 'openneuro-ds003688',
    study_id: null,
    name: 'Resting-State fMRI Aging Study',
    description: 'Cross-sectional resting-state fMRI from healthy adults aged 20-80 for aging research.',
    file_type: 'bids',
    file_size_mb: 34000,
    subjects_count: 316,
    modality: 'fMRI',
    preprocessing_level: 'raw',
    access_level: 'free',
    file_url: 'https://openneuro.org/datasets/ds003688',
    created_at: new Date().toISOString(),
    study: null
  },
  // ADNI
  {
    id: 'adni-baseline',
    study_id: null,
    name: 'ADNI Baseline Structural MRI',
    description: 'Baseline T1-weighted structural MRI from Alzheimer\'s Disease Neuroimaging Initiative.',
    file_type: 'nifti',
    file_size_mb: 156000,
    subjects_count: 2400,
    modality: 'structural MRI',
    preprocessing_level: 'processed',
    access_level: 'research',
    file_url: 'https://adni.loni.usc.edu',
    created_at: new Date().toISOString(),
    study: null
  },
  {
    id: 'adni-pet',
    study_id: null,
    name: 'ADNI Amyloid PET Imaging',
    description: 'Amyloid PET scans for Alzheimer\'s biomarker research with longitudinal follow-ups.',
    file_type: 'nifti',
    file_size_mb: 89000,
    subjects_count: 1800,
    modality: 'PET',
    preprocessing_level: 'processed',
    access_level: 'research',
    file_url: 'https://adni.loni.usc.edu',
    created_at: new Date().toISOString(),
    study: null
  },
  // UK Biobank
  {
    id: 'ukbb-brain-mri',
    study_id: null,
    name: 'UK Biobank Brain MRI Summary',
    description: 'Population-level brain MRI derived phenotypes including volumes, thickness, and white matter microstructure.',
    file_type: 'csv',
    file_size_mb: 2500,
    subjects_count: 50000,
    modality: 'structural MRI',
    preprocessing_level: 'processed',
    access_level: 'research',
    file_url: 'https://www.ukbiobank.ac.uk',
    created_at: new Date().toISOString(),
    study: null
  },
  // Allen Brain Atlas
  {
    id: 'allen-gene-expression',
    study_id: null,
    name: 'Allen Human Brain Atlas Gene Expression',
    description: 'Comprehensive gene expression data mapped to 3D brain coordinates from 6 donor brains.',
    file_type: 'csv',
    file_size_mb: 15000,
    subjects_count: 6,
    modality: 'gene expression',
    preprocessing_level: 'processed',
    access_level: 'free',
    file_url: 'https://human.brain-map.org',
    created_at: new Date().toISOString(),
    study: null
  },
  {
    id: 'allen-mouse-connectivity',
    study_id: null,
    name: 'Allen Mouse Brain Connectivity Atlas',
    description: 'Viral tracing experiments showing whole-brain connectivity patterns in mice.',
    file_type: 'json',
    file_size_mb: 8000,
    subjects_count: 2500,
    modality: 'connectivity',
    preprocessing_level: 'processed',
    access_level: 'free',
    file_url: 'https://connectivity.brain-map.org',
    created_at: new Date().toISOString(),
    study: null
  },
  // PhysioNet
  {
    id: 'physionet-eeg-sleep',
    study_id: null,
    name: 'Sleep-EDF Database',
    description: 'Whole-night polysomnographic sleep recordings with hypnogram annotations.',
    file_type: 'edf',
    file_size_mb: 4200,
    subjects_count: 197,
    modality: 'EEG',
    preprocessing_level: 'raw',
    access_level: 'free',
    file_url: 'https://physionet.org/content/sleep-edfx',
    created_at: new Date().toISOString(),
    study: null
  },
  {
    id: 'physionet-chb-mit',
    study_id: null,
    name: 'CHB-MIT Scalp EEG Database',
    description: 'EEG recordings from pediatric subjects with intractable seizures for seizure detection research.',
    file_type: 'edf',
    file_size_mb: 6500,
    subjects_count: 23,
    modality: 'EEG',
    preprocessing_level: 'raw',
    access_level: 'free',
    file_url: 'https://physionet.org/content/chbmit',
    created_at: new Date().toISOString(),
    study: null
  },
  // OASIS
  {
    id: 'oasis-3',
    study_id: null,
    name: 'OASIS-3 Longitudinal MRI',
    description: 'Longitudinal neuroimaging, clinical, cognitive, and biomarker data from the OASIS study.',
    file_type: 'nifti',
    file_size_mb: 210000,
    subjects_count: 1098,
    modality: 'structural MRI, fMRI, PET',
    preprocessing_level: 'minimally processed',
    access_level: 'free',
    file_url: 'https://www.oasis-brains.org',
    created_at: new Date().toISOString(),
    study: null
  },
  // IXI
  {
    id: 'ixi-brain',
    study_id: null,
    name: 'IXI Brain Development Dataset',
    description: 'Nearly 600 MRI scans from healthy subjects with T1, T2, PD, MRA, and DTI modalities.',
    file_type: 'nifti',
    file_size_mb: 45000,
    subjects_count: 581,
    modality: 'structural MRI, DTI',
    preprocessing_level: 'raw',
    access_level: 'free',
    file_url: 'https://brain-development.org/ixi-dataset/',
    created_at: new Date().toISOString(),
    study: null
  },
  // Cam-CAN
  {
    id: 'camcan-mri',
    study_id: null,
    name: 'Cam-CAN Lifespan MRI',
    description: 'Multi-modal MRI and MEG data from 700 healthy adults across the lifespan (18-88 years).',
    file_type: 'bids',
    file_size_mb: 125000,
    subjects_count: 700,
    modality: 'structural MRI, fMRI, MEG',
    preprocessing_level: 'processed',
    access_level: 'research',
    file_url: 'https://www.cam-can.org',
    created_at: new Date().toISOString(),
    study: null
  },
  // NKI Rockland
  {
    id: 'nki-rockland',
    study_id: null,
    name: 'NKI-Rockland Sample',
    description: 'Large-scale community sample with deep phenotyping and multi-modal neuroimaging.',
    file_type: 'bids',
    file_size_mb: 180000,
    subjects_count: 1500,
    modality: 'fMRI, structural MRI, DTI',
    preprocessing_level: 'raw',
    access_level: 'free',
    file_url: 'https://fcon_1000.projects.nitrc.org/indi/enhanced/',
    created_at: new Date().toISOString(),
    study: null
  },
  // GSP
  {
    id: 'gsp-brain',
    study_id: null,
    name: 'Brain Genomics Superstruct Project',
    description: 'Structural and functional MRI with genetic data from 1570 young adults.',
    file_type: 'nifti',
    file_size_mb: 95000,
    subjects_count: 1570,
    modality: 'fMRI, structural MRI',
    preprocessing_level: 'processed',
    access_level: 'research',
    file_url: 'https://dataverse.harvard.edu/dataverse/GSP',
    created_at: new Date().toISOString(),
    study: null
  },
  // ABIDE
  {
    id: 'abide-autism',
    study_id: null,
    name: 'ABIDE I & II Autism Dataset',
    description: 'Resting-state fMRI and structural data from individuals with autism and typical controls.',
    file_type: 'nifti',
    file_size_mb: 78000,
    subjects_count: 2156,
    modality: 'fMRI, structural MRI',
    preprocessing_level: 'preprocessed',
    access_level: 'free',
    file_url: 'https://fcon_1000.projects.nitrc.org/indi/abide/',
    created_at: new Date().toISOString(),
    study: null
  },
  // Sports/Performance datasets
  {
    id: 'athlete-eeg',
    study_id: null,
    name: 'Athlete Performance EEG',
    description: 'EEG recordings from professional athletes during cognitive tasks and reaction time tests.',
    file_type: 'edf',
    file_size_mb: 3200,
    subjects_count: 150,
    modality: 'EEG',
    preprocessing_level: 'raw',
    access_level: 'free',
    file_url: null,
    created_at: new Date().toISOString(),
    study: null
  },
  {
    id: 'concussion-mri',
    study_id: null,
    name: 'Sports Concussion MRI Study',
    description: 'Longitudinal MRI data from athletes with sports-related concussions and matched controls.',
    file_type: 'nifti',
    file_size_mb: 42000,
    subjects_count: 280,
    modality: 'structural MRI, DTI',
    preprocessing_level: 'processed',
    access_level: 'research',
    file_url: null,
    created_at: new Date().toISOString(),
    study: null
  },
  // === FUN WILDCARD DATASETS ===
  // Movies & Entertainment
  {
    id: 'imdb-movies',
    study_id: null,
    name: 'IMDb Movies Dataset',
    description: '85,000+ movies with ratings, genres, cast, crew, and box office data. Perfect for recommendation systems and trend analysis.',
    file_type: 'csv',
    file_size_mb: 450,
    subjects_count: 85000,
    modality: 'entertainment',
    preprocessing_level: 'processed',
    access_level: 'free',
    file_url: 'https://www.imdb.com/interfaces/',
    created_at: new Date().toISOString(),
    study: null
  },
  {
    id: 'tmdb-actors',
    study_id: null,
    name: 'TMDB Actors & Filmography',
    description: 'Comprehensive actor database with 500,000+ profiles, filmographies, and collaboration networks.',
    file_type: 'json',
    file_size_mb: 2800,
    subjects_count: 500000,
    modality: 'entertainment',
    preprocessing_level: 'processed',
    access_level: 'free',
    file_url: 'https://www.themoviedb.org/',
    created_at: new Date().toISOString(),
    study: null
  },
  {
    id: 'netflix-shows',
    study_id: null,
    name: 'Netflix TV Shows & Movies',
    description: 'Complete Netflix catalog with release dates, ratings, genres, and country availability.',
    file_type: 'csv',
    file_size_mb: 85,
    subjects_count: 8800,
    modality: 'entertainment',
    preprocessing_level: 'processed',
    access_level: 'free',
    file_url: 'https://www.kaggle.com/datasets/shivamb/netflix-shows',
    created_at: new Date().toISOString(),
    study: null
  },
  {
    id: 'spotify-tracks',
    study_id: null,
    name: 'Spotify Million Tracks',
    description: '1.2M songs with audio features: tempo, energy, danceability, valence, acousticness, and more.',
    file_type: 'csv',
    file_size_mb: 1200,
    subjects_count: 1200000,
    modality: 'audio',
    preprocessing_level: 'processed',
    access_level: 'free',
    file_url: 'https://www.kaggle.com/datasets/rodolfofigueroa/spotify-12m-songs',
    created_at: new Date().toISOString(),
    study: null
  },
  // Geography & Demographics
  {
    id: 'world-countries',
    study_id: null,
    name: 'World Countries Database',
    description: '250 countries with capitals, populations, GDP, languages, currencies, and geographic coordinates.',
    file_type: 'json',
    file_size_mb: 15,
    subjects_count: 250,
    modality: 'geography',
    preprocessing_level: 'processed',
    access_level: 'free',
    file_url: 'https://restcountries.com/',
    created_at: new Date().toISOString(),
    study: null
  },
  {
    id: 'us-states-data',
    study_id: null,
    name: 'US States Complete Dataset',
    description: 'All 50 states with demographics, economics, education, health metrics, and historical data.',
    file_type: 'csv',
    file_size_mb: 45,
    subjects_count: 50,
    modality: 'demographics',
    preprocessing_level: 'processed',
    access_level: 'free',
    file_url: 'https://www.census.gov/',
    created_at: new Date().toISOString(),
    study: null
  },
  {
    id: 'world-cities',
    study_id: null,
    name: 'World Cities Database',
    description: '43,000+ cities worldwide with populations, coordinates, timezones, and administrative regions.',
    file_type: 'csv',
    file_size_mb: 120,
    subjects_count: 43000,
    modality: 'geography',
    preprocessing_level: 'processed',
    access_level: 'free',
    file_url: 'https://simplemaps.com/data/world-cities',
    created_at: new Date().toISOString(),
    study: null
  },
  // Sports
  {
    id: 'nba-players',
    study_id: null,
    name: 'NBA Players & Stats (1950-2024)',
    description: '4,500+ NBA players with career stats, salaries, draft info, and performance metrics.',
    file_type: 'csv',
    file_size_mb: 250,
    subjects_count: 4500,
    modality: 'sports',
    preprocessing_level: 'processed',
    access_level: 'free',
    file_url: 'https://www.basketball-reference.com/',
    created_at: new Date().toISOString(),
    study: null
  },
  {
    id: 'fifa-players',
    study_id: null,
    name: 'FIFA Soccer Players Database',
    description: '18,000+ soccer players with skills, ratings, market values, and career trajectories.',
    file_type: 'csv',
    file_size_mb: 180,
    subjects_count: 18000,
    modality: 'sports',
    preprocessing_level: 'processed',
    access_level: 'free',
    file_url: 'https://www.kaggle.com/datasets/stefanoleone992/fifa-22-complete-player-dataset',
    created_at: new Date().toISOString(),
    study: null
  },
  {
    id: 'olympics-athletes',
    study_id: null,
    name: 'Olympic Athletes (1896-2024)',
    description: '270,000+ Olympic athletes with medals, events, countries, and physical attributes.',
    file_type: 'csv',
    file_size_mb: 95,
    subjects_count: 270000,
    modality: 'sports',
    preprocessing_level: 'processed',
    access_level: 'free',
    file_url: 'https://www.kaggle.com/datasets/heesoo37/120-years-of-olympic-history-athletes-and-results',
    created_at: new Date().toISOString(),
    study: null
  },
  {
    id: 'nfl-plays',
    study_id: null,
    name: 'NFL Play-by-Play Data',
    description: '400,000+ NFL plays with formations, outcomes, player tracking, and EPA analysis.',
    file_type: 'csv',
    file_size_mb: 850,
    subjects_count: 400000,
    modality: 'sports',
    preprocessing_level: 'processed',
    access_level: 'free',
    file_url: 'https://www.nflfastr.com/',
    created_at: new Date().toISOString(),
    study: null
  },
  // Science & Nature
  {
    id: 'nasa-exoplanets',
    study_id: null,
    name: 'NASA Exoplanet Archive',
    description: '5,500+ confirmed exoplanets with orbital parameters, host star data, and discovery methods.',
    file_type: 'csv',
    file_size_mb: 35,
    subjects_count: 5500,
    modality: 'astronomy',
    preprocessing_level: 'processed',
    access_level: 'free',
    file_url: 'https://exoplanetarchive.ipac.caltech.edu/',
    created_at: new Date().toISOString(),
    study: null
  },
  {
    id: 'animal-species',
    study_id: null,
    name: 'IUCN Animal Species Database',
    description: '70,000+ animal species with conservation status, habitats, population trends, and taxonomy.',
    file_type: 'json',
    file_size_mb: 280,
    subjects_count: 70000,
    modality: 'biology',
    preprocessing_level: 'processed',
    access_level: 'free',
    file_url: 'https://www.iucnredlist.org/',
    created_at: new Date().toISOString(),
    study: null
  },
  {
    id: 'global-weather',
    study_id: null,
    name: 'Global Weather Stations',
    description: '30+ years of daily weather data from 10,000+ stations: temperature, precipitation, wind, humidity.',
    file_type: 'csv',
    file_size_mb: 4500,
    subjects_count: 10000,
    modality: 'climate',
    preprocessing_level: 'processed',
    access_level: 'free',
    file_url: 'https://www.ncei.noaa.gov/',
    created_at: new Date().toISOString(),
    study: null
  },
  // Food & Beverages
  {
    id: 'wine-reviews',
    study_id: null,
    name: 'Wine Reviews Dataset',
    description: '130,000 wine reviews with ratings, prices, varieties, and tasting notes from Wine Enthusiast.',
    file_type: 'csv',
    file_size_mb: 65,
    subjects_count: 130000,
    modality: 'food',
    preprocessing_level: 'processed',
    access_level: 'free',
    file_url: 'https://www.kaggle.com/datasets/zynicide/wine-reviews',
    created_at: new Date().toISOString(),
    study: null
  },
  {
    id: 'recipes-database',
    study_id: null,
    name: 'Recipe Ingredients Dataset',
    description: '180,000+ recipes with ingredients, nutrition info, cuisine types, and preparation times.',
    file_type: 'json',
    file_size_mb: 320,
    subjects_count: 180000,
    modality: 'food',
    preprocessing_level: 'processed',
    access_level: 'free',
    file_url: 'https://www.kaggle.com/datasets/shuyangli94/food-com-recipes-and-user-interactions',
    created_at: new Date().toISOString(),
    study: null
  },
  // Gaming & Tech
  {
    id: 'steam-games',
    study_id: null,
    name: 'Steam Games Database',
    description: '27,000+ Steam games with player counts, reviews, pricing, genres, and release history.',
    file_type: 'csv',
    file_size_mb: 150,
    subjects_count: 27000,
    modality: 'gaming',
    preprocessing_level: 'processed',
    access_level: 'free',
    file_url: 'https://steamdb.info/',
    created_at: new Date().toISOString(),
    study: null
  },
  {
    id: 'pokemon-complete',
    study_id: null,
    name: 'Pokémon Complete Database',
    description: 'All 1,000+ Pokémon with stats, types, abilities, evolutions, and competitive tier data.',
    file_type: 'json',
    file_size_mb: 25,
    subjects_count: 1008,
    modality: 'gaming',
    preprocessing_level: 'processed',
    access_level: 'free',
    file_url: 'https://pokeapi.co/',
    created_at: new Date().toISOString(),
    study: null
  },
  // Books & Literature
  {
    id: 'goodreads-books',
    study_id: null,
    name: 'Goodreads Books Dataset',
    description: '10 million book ratings with genres, authors, publication years, and reader reviews.',
    file_type: 'csv',
    file_size_mb: 2100,
    subjects_count: 2360000,
    modality: 'literature',
    preprocessing_level: 'processed',
    access_level: 'free',
    file_url: 'https://www.kaggle.com/datasets/jealousleopard/goodreadsbooks',
    created_at: new Date().toISOString(),
    study: null
  },
  // Social & Trends
  {
    id: 'twitter-trends',
    study_id: null,
    name: 'Twitter/X Trending Topics Archive',
    description: '5 years of trending hashtags and topics with engagement metrics and geographic spread.',
    file_type: 'json',
    file_size_mb: 890,
    subjects_count: 5000000,
    modality: 'social',
    preprocessing_level: 'processed',
    access_level: 'free',
    file_url: null,
    created_at: new Date().toISOString(),
    study: null
  },
  {
    id: 'reddit-submissions',
    study_id: null,
    name: 'Reddit Posts & Comments',
    description: 'Massive archive of Reddit submissions with scores, comments, subreddits, and timestamps.',
    file_type: 'json',
    file_size_mb: 45000,
    subjects_count: 50000000,
    modality: 'social',
    preprocessing_level: 'raw',
    access_level: 'free',
    file_url: 'https://pushshift.io/',
    created_at: new Date().toISOString(),
    study: null
  },
  // Finance & Economics
  {
    id: 'stock-prices',
    study_id: null,
    name: 'S&P 500 Historical Prices',
    description: '20+ years of daily stock prices for all S&P 500 companies with volume and dividends.',
    file_type: 'csv',
    file_size_mb: 380,
    subjects_count: 500,
    modality: 'finance',
    preprocessing_level: 'processed',
    access_level: 'free',
    file_url: 'https://finance.yahoo.com/',
    created_at: new Date().toISOString(),
    study: null
  },
  {
    id: 'crypto-prices',
    study_id: null,
    name: 'Cryptocurrency Price History',
    description: 'Historical prices for 2,000+ cryptocurrencies with market cap, volume, and trading pairs.',
    file_type: 'csv',
    file_size_mb: 650,
    subjects_count: 2000,
    modality: 'finance',
    preprocessing_level: 'processed',
    access_level: 'free',
    file_url: 'https://www.coingecko.com/',
    created_at: new Date().toISOString(),
    study: null
  }
]

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null)
  const [accessFilter, setAccessFilter] = useState<'all' | 'free' | 'pro' | 'research'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'subjects' | 'date'>('date')
  
  // Fetch datasets from Supabase, fallback to sample data
  useEffect(() => {
    async function fetchDatasets() {
      try {
        const supabase = createBrowserClient()
        const { data, error } = await supabase
          .from('datasets')
          .select(`
            id,
            study_id,
            name,
            description,
            file_type,
            file_size_mb,
            subjects_count,
            modality,
            preprocessing_level,
            access_level,
            file_url,
            created_at,
            study:studies(id, title)
          `)
          .order('created_at', { ascending: false })
          .limit(100)

        if (error) throw error
        
        // Transform the data to handle the array from join
        const transformedData = (data || []).map(d => ({
          ...d,
          study: Array.isArray(d.study) ? d.study[0] : d.study
        })) as unknown as Dataset[]
        
        // Always include sample datasets, merged with any from DB
        // Remove duplicates based on id
        const allDatasets = [...SAMPLE_DATASETS]
        transformedData.forEach(dbDataset => {
          if (!allDatasets.some(d => d.id === dbDataset.id)) {
            allDatasets.unshift(dbDataset) // DB datasets at the top
          }
        })
        setDatasets(allDatasets)
      } catch (err) {
        console.error('Error fetching datasets:', err)
        // Fallback to sample datasets on error
        setDatasets(SAMPLE_DATASETS)
      } finally {
        setLoading(false)
      }
    }

    fetchDatasets()
  }, [])

  // Filter and sort datasets
  const filteredDatasets = datasets
    .filter(d => {
      if (accessFilter !== 'all' && d.access_level !== accessFilter) return false
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          d.name.toLowerCase().includes(query) ||
          d.description?.toLowerCase().includes(query) ||
          d.modality?.toLowerCase().includes(query) ||
          d.file_type?.toLowerCase().includes(query)
        )
      }
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'size':
          return (b.file_size_mb || 0) - (a.file_size_mb || 0)
        case 'subjects':
          return (b.subjects_count || 0) - (a.subjects_count || 0)
        case 'date':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

  // Stats
  const totalSizeMb = datasets.reduce((sum, d) => sum + (d.file_size_mb || 0), 0)
  const freeCount = datasets.filter(d => d.access_level === 'free').length
  const totalSubjects = datasets.reduce((sum, d) => sum + (d.subjects_count || 0), 0)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Datasets</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Browse and download neuroimaging datasets
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Advanced Filters
            </Button>
          </div>
        </div>
        
        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-indigo-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Total Datasets</span>
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
              {datasets.length}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Total Size</span>
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
              {formatSize(totalSizeMb)}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Unlock className="h-4 w-4 text-green-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Free Access</span>
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
              {freeCount}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Total Subjects</span>
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
              {totalSubjects.toLocaleString()}
            </p>
          </div>
        </div>
        
        {/* Search and Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search datasets by name, modality, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          <div className="flex gap-2">
            {/* Access Filter */}
            <select
              value={accessFilter}
              onChange={(e) => setAccessFilter(e.target.value as 'all' | 'free' | 'pro' | 'research')}
              className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Access Levels</option>
              <option value="free">Free Only</option>
              <option value="pro">Pro</option>
              <option value="research">Research</option>
            </select>
            
            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'size' | 'subjects' | 'date')}
              className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="date">Newest First</option>
              <option value="name">Name A-Z</option>
              <option value="size">Largest First</option>
              <option value="subjects">Most Subjects</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-6 bg-slate-50 dark:bg-slate-900">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : filteredDatasets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Database className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              No datasets found
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDatasets.map(dataset => (
              <DatasetCard 
                key={dataset.id} 
                dataset={dataset}
                onClick={() => setSelectedDataset(dataset)}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Dataset Detail Modal/Drawer */}
      {selectedDataset && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {selectedDataset.name}
                  </h2>
                  {selectedDataset.modality && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {selectedDataset.modality}
                    </p>
                  )}
                </div>
                <button 
                  onClick={() => setSelectedDataset(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Description */}
              {selectedDataset.description && (
                <div>
                  <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                    Description
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {selectedDataset.description}
                  </p>
                </div>
              )}
              
              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                    <FileType className="h-4 w-4" />
                    <span className="text-xs">Format</span>
                  </div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {selectedDataset.file_type?.toUpperCase() || 'Unknown'}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                    <HardDrive className="h-4 w-4" />
                    <span className="text-xs">Size</span>
                  </div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {formatSize(selectedDataset.file_size_mb)}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                    <Users className="h-4 w-4" />
                    <span className="text-xs">Subjects</span>
                  </div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {selectedDataset.subjects_count?.toLocaleString() || '—'}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                    <Layers className="h-4 w-4" />
                    <span className="text-xs">Processing</span>
                  </div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 capitalize">
                    {selectedDataset.preprocessing_level?.replace('_', ' ') || '—'}
                  </p>
                </div>
              </div>
              
              {/* Access Level */}
              <div className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                {selectedDataset.access_level === 'free' ? (
                  <>
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <Unlock className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">Free Access</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        This dataset is freely available for download
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                      <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100 capitalize">
                        {selectedDataset.access_level} Access
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Upgrade your plan or request access to download
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {/* Actions */}
            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3">
              <Button className="flex-1" disabled={!selectedDataset.file_url}>
                <Download className="h-4 w-4 mr-2" />
                Download Dataset
              </Button>
              <Button variant="outline">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Source
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
