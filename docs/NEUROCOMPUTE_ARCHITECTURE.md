# NeuroCompute Platform Architecture

## Vision

NeuroCompute is an **"AWS for Neuroscience"** - a platform that treats compute infrastructure as biological nodes. We bridge the gap between neuroscience research and cloud computing by representing compute pipelines as brain-inspired workflows.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      NEUROCOMPUTE PLATFORM                               │
│                                                                          │
│   "Every Brain Region is a Compute Node. Every Synapse is a Data Flow." │
└─────────────────────────────────────────────────────────────────────────┘
```

## Core Metaphor

| Biological Concept | Platform Equivalent | Database Table |
|-------------------|---------------------|----------------|
| Brain | Workflow Blueprint | `workflows` |
| Brain Region | Compute Node | `compute_nodes` |
| Synapse | Data Connection | `node_edges` |
| Neural Pathway | Data Pipeline | Ordered edges |
| Neurotransmitter | Data Payload | BIDS/NWB files |
| Memory | Saved Workflow | `is_template = true` |
| Learning | Workflow Forking | `forked_from_id` |

## Architecture Overview

```
                                   ┌──────────────────┐
                                   │   USER INTERFACE │
                                   │  (Next.js + 3D)  │
                                   └────────┬─────────┘
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    │                       │                       │
           ┌────────▼────────┐    ┌─────────▼────────┐    ┌────────▼────────┐
           │  WORKFLOW       │    │   ALGORITHM      │    │   DATA          │
           │  CANVAS         │    │   LIBRARY        │    │   BROWSER       │
           │  (React Flow)   │    │   (Containers)   │    │   (BIDS/NWB)    │
           └────────┬────────┘    └─────────┬────────┘    └────────┬────────┘
                    │                       │                       │
                    └───────────────────────┼───────────────────────┘
                                            │
                               ┌────────────▼────────────┐
                               │      SUPABASE           │
                               │  ┌───────────────────┐  │
                               │  │ workflows         │  │
                               │  │ compute_nodes     │  │
                               │  │ node_edges        │  │
                               │  │ algorithm_library │  │
                               │  │ workflow_runs     │  │
                               │  └───────────────────┘  │
                               └────────────┬────────────┘
                                            │
                               ┌────────────▼────────────┐
                               │   COMPUTE ORCHESTRATOR  │
                               │  (Docker/Kubernetes)    │
                               │                         │
                               │  ┌─────┐ ┌─────┐ ┌─────┐│
                               │  │ MNE │ │ FSL │ │ GPU ││
                               │  │ Pod │ │ Pod │ │ Pod ││
                               │  └─────┘ └─────┘ └─────┘│
                               └─────────────────────────┘
```

## Data Model

### The Two Islands

#### Island A: Biology Layer (The Map)
Data about the brain and neuroscience research.

```sql
brain_regions       -- Atlas of brain regions (HCP, AAL, Brodmann)
brain_scans         -- Individual subject scan metadata
connectomes         -- Connectivity matrices
studies             -- Research papers and publications
datasets            -- Downloadable data files
data_sources        -- HCP, Allen, OpenNeuro, etc.
```

#### Island B: Compute Layer (The Factory)
Infrastructure for running analysis pipelines.

```sql
algorithm_library   -- Pre-built algorithm templates (Docker)
agents              -- AI agents (Gemini, Claude)
workflows           -- User-created workflow blueprints
compute_nodes       -- Instances on the canvas
node_edges          -- Data flow connections
workflow_runs       -- Execution history
bci_devices         -- BCI hardware registry (future)
```

### The Bridge: compute_nodes

This is the **magic table** that connects biology to compute:

```sql
compute_nodes (
  -- Identity
  id, workflow_id, name, category,
  
  -- THE BRIDGE
  algorithm_id    → algorithm_library (what code to run)
  agent_id        → agents (or AI to query)
  brain_region_id → brain_regions (where to visualize)
  
  -- Infrastructure
  container_image, resource_cpu, resource_gpu, config_values,
  
  -- Canvas Position
  position_x, position_y,
  
  -- State
  status, progress, logs_url
)
```

## Node Categories

```
┌─────────────────────────────────────────────────────────────────┐
│                        NODE CATEGORIES                           │
├─────────────────┬───────────────────────────────────────────────┤
│ input_source    │ Data ingestion - files, BIDS datasets, BCI    │
│ preprocessing   │ Signal cleaning - filters, artifact removal    │
│ analysis        │ Feature extraction - PSD, ERPs, connectivity   │
│ ml_inference    │ Model inference - classification, prediction   │
│ ml_training     │ Model training - requires GPU                  │
│ visualization   │ Real-time visualization output                 │
│ output_sink     │ File export - BIDS, reports, databases         │
└─────────────────┴───────────────────────────────────────────────┘
```

## Data Standards

### BIDS (Brain Imaging Data Structure)
All file inputs/outputs follow BIDS organization:
```
dataset/
├── sub-001/
│   └── ses-01/
│       └── eeg/
│           ├── sub-001_ses-01_task-rest_eeg.edf
│           └── sub-001_ses-01_task-rest_events.tsv
└── derivatives/
    └── preprocessed/
        └── sub-001/
            └── eeg/
                └── sub-001_ses-01_task-rest_proc-clean_eeg.fif
```

### NWB (Neurodata Without Borders)
For electrophysiology and complex neural data, we support NWB 2.0 format.

### Schema Contracts
Each node defines its input/output schema:
```json
{
  "input_schema": {
    "type": "bids-raw",
    "modality": "eeg", 
    "format": ".edf"
  },
  "output_schema": {
    "type": "bids-derivative",
    "modality": "eeg",
    "format": ".fif",
    "outputs": ["cleaned_data", "bad_channels"]
  }
}
```

## Workflow Execution Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     WORKFLOW EXECUTION                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. USER CLICKS "RUN"                                           │
│         │                                                        │
│         ▼                                                        │
│  2. VALIDATE EDGES ─────────────────┐                           │
│     Check schema compatibility       │ if invalid               │
│         │                            ▼                          │
│         │ valid              ┌──────────────┐                   │
│         │                    │ Show Errors  │                   │
│         ▼                    └──────────────┘                   │
│  3. CREATE workflow_runs RECORD                                 │
│     Snapshot current workflow state                             │
│         │                                                        │
│         ▼                                                        │
│  4. TOPOLOGICAL SORT                                            │
│     Order nodes by dependencies                                  │
│         │                                                        │
│         ▼                                                        │
│  5. FOR EACH NODE:                                              │
│     ┌─────────────────────────────────────┐                     │
│     │ if algorithm_id:                    │                     │
│     │   → Spawn Docker container          │                     │
│     │   → Mount input data                │                     │
│     │   → Run with config_values          │                     │
│     │   → Capture output                  │                     │
│     │                                     │                     │
│     │ if agent_id:                        │                     │
│     │   → Dispatch to AI agent queue      │                     │
│     │   → Wait for completion             │                     │
│     └─────────────────────────────────────┘                     │
│         │                                                        │
│         ▼                                                        │
│  6. PASS DATA VIA data_mapping                                  │
│     Route outputs to next node's inputs                         │
│         │                                                        │
│         ▼                                                        │
│  7. UPDATE STATUS                                               │
│     compute_nodes.status, workflow_runs.status                  │
│         │                                                        │
│         ▼                                                        │
│  8. STORE RESULTS                                               │
│     workflow_runs.output_files                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Pre-Built Algorithm Library

### Input Sources
| Name | Container | Description |
|------|-----------|-------------|
| EDF File Loader | `mne-python` | Load .edf/.bdf EEG files |
| BIDS Dataset Loader | `mne-bids` | Load BIDS-formatted datasets |
| NWB File Loader | `pynwb` | Load NWB electrophysiology |

### Preprocessing
| Name | Container | Description |
|------|-----------|-------------|
| Bandpass Filter | `mne-python` | FIR bandpass (0.1-40 Hz default) |
| Notch Filter | `mne-python` | Remove 50/60 Hz line noise |
| ICA Artifact Removal | `mne-python` | Remove eye blinks, muscle |
| Bad Channel Detection | `mne-python` | RANSAC-based detection |
| Re-Reference | `mne-python` | Average or custom reference |

### Analysis
| Name | Container | Description |
|------|-----------|-------------|
| Power Spectral Density | `mne-python` | Welch PSD, band powers |
| Event-Related Potentials | `mne-python` | Epoching, averaging |
| Time-Frequency | `mne-python` | Wavelets, ERSP |
| Connectivity | `mne-connectivity` | Coherence, PLV, wPLI |

### ML Inference
| Name | Container | GPU | Description |
|------|-----------|-----|-------------|
| Sleep Stage Classification | `yasa` | ✓ | YASA model |
| Motor Imagery Classification | `braindecode` | ✓ | EEGNet, CSP+LDA |

### Output Sinks
| Name | Container | Description |
|------|-----------|-------------|
| BIDS Exporter | `mne-bids` | Export to BIDS derivatives |
| Report Generator | `mne-python` | HTML/PDF reports |

## Future: BCI Device Integration

The `bci_devices` table is ready for hardware integration:

```sql
bci_devices (
  device_type    -- 'openbci', 'emotiv', 'muse', 'neurosky'
  connection_type -- 'usb', 'bluetooth', 'wifi'
  channels        -- Number of EEG channels
  sampling_rate   -- Hz
  is_connected    -- Live connection status
)
```

### Supported Devices (Planned)
- **OpenBCI** - Cyton, Ganglion, Ultracortex
- **Emotiv** - EPOC, Insight
- **Muse** - Muse 2, Muse S
- **NeuroSky** - MindWave

### Real-Time Pipeline
```
BCI Device → input_source node → preprocessing → visualization
                                      ↓
                              ml_inference (Motor Imagery)
                                      ↓
                              output_sink (Control Signal)
```

## Security & Access Control

Row-Level Security (RLS) ensures:
- Users can only modify their own workflows
- Public/template workflows are read-only
- Algorithm library is publicly readable
- BCI devices are private per user

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, TypeScript |
| Styling | Tailwind CSS, Framer Motion |
| 3D Visualization | React Three Fiber (planned) |
| Workflow Canvas | React Flow (planned) |
| Backend | Supabase (PostgreSQL + Auth) |
| Compute | Docker containers |
| Orchestration | Edge Functions → Docker/K8s |
| Storage | Supabase Storage / S3 |

## Getting Started

### 1. Set Up Database
```bash
# Run the schema
psql -f database/neuro-schema.sql

# Seed the algorithm library and example workflows
psql -f database/neuro-seed-compute.sql
```

### 2. Start Development
```bash
npm install
npm run dev
```

### 3. Fork a Template Workflow
Navigate to Algorithms → My Workflows → Browse Templates → Fork "Standard EEG Preprocessing Pipeline"

### 4. Customize Nodes
Click on any node to adjust parameters (e.g., change bandpass filter from 0.1-40 Hz to 1-30 Hz)

### 5. Run the Workflow
Click "Run" to execute. Watch nodes turn from idle → running → completed in real-time.

## Roadmap

- [x] Database schema design
- [x] Algorithm library seeding
- [x] Example workflow templates
- [ ] React Flow canvas integration
- [ ] Docker orchestration layer
- [ ] Real-time execution status
- [ ] BCI device support
- [ ] Multi-user collaboration
- [ ] Workflow marketplace
