-- =============================================
-- NeuroCompute Platform - Seed Data (Safe Migration)
-- Run AFTER 001_add_compute_infrastructure.sql
-- Uses ON CONFLICT for idempotency
-- =============================================

-- =============================================
-- ALGORITHM LIBRARY SEED DATA
-- =============================================

-- Input Sources
INSERT INTO algorithm_library (id, name, description, category, container_image, container_registry, input_schema, output_schema, config_schema, default_config, recommended_cpu, recommended_memory_gb, requires_gpu, is_official, tags, version, author, license)
VALUES 
(
  'a0000001-0001-4001-8001-000000000001',
  'EDF File Loader',
  'Load EEG data from European Data Format (.edf) files. Supports standard 10-20 montage and custom channel configurations.',
  'input_source',
  'mne-python',
  'ghcr.io/neurodata-hub',
  '{"type": "file", "formats": [".edf", ".bdf"], "description": "Path to EDF/BDF file"}'::jsonb,
  '{"type": "bids-raw", "modality": "eeg", "format": "mne.Raw", "outputs": ["raw_eeg", "channel_info", "events"]}'::jsonb,
  '{"type": "object", "properties": {"preload": {"type": "boolean", "default": true}, "stim_channel": {"type": "string"}}}'::jsonb,
  '{"preload": true}'::jsonb,
  0.5, 2.0, false, true,
  ARRAY['eeg', 'input', 'edf', 'loader'],
  '1.0.0', 'NeuroData Hub', 'MIT'
),
(
  'a0000001-0001-4001-8001-000000000002',
  'BIDS Dataset Loader',
  'Load neuroimaging data from BIDS-formatted datasets. Supports EEG, MEG, fMRI, and dMRI modalities.',
  'input_source',
  'mne-bids',
  'ghcr.io/neurodata-hub',
  '{"type": "bids-dataset", "description": "Path to BIDS root directory"}'::jsonb,
  '{"type": "bids-raw", "modality": "any", "format": "mne.Raw|nibabel.Nifti", "outputs": ["data", "metadata", "events"]}'::jsonb,
  '{"type": "object", "properties": {"subject": {"type": "string"}, "session": {"type": "string"}, "task": {"type": "string"}, "run": {"type": "integer"}}}'::jsonb,
  '{}'::jsonb,
  0.5, 4.0, false, true,
  ARRAY['bids', 'input', 'loader', 'mri', 'eeg', 'meg'],
  '1.0.0', 'NeuroData Hub', 'MIT'
),
(
  'a0000001-0001-4001-8001-000000000003',
  'NWB File Loader',
  'Load neural data from Neurodata Without Borders (.nwb) files. Full support for NWB 2.0 schema.',
  'input_source',
  'pynwb',
  'ghcr.io/neurodata-hub',
  '{"type": "file", "formats": [".nwb"], "description": "Path to NWB file"}'::jsonb,
  '{"type": "nwb", "outputs": ["acquisition", "processing", "epochs", "electrodes"]}'::jsonb,
  '{"type": "object", "properties": {"load_namespaces": {"type": "boolean", "default": true}}}'::jsonb,
  '{"load_namespaces": true}'::jsonb,
  0.5, 4.0, false, true,
  ARRAY['nwb', 'input', 'loader', 'ephys'],
  '1.0.0', 'NeuroData Hub', 'MIT'
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  container_image = EXCLUDED.container_image,
  input_schema = EXCLUDED.input_schema,
  output_schema = EXCLUDED.output_schema,
  updated_at = NOW();

-- Preprocessing Algorithms
INSERT INTO algorithm_library (id, name, description, category, container_image, container_registry, input_schema, output_schema, config_schema, default_config, recommended_cpu, recommended_memory_gb, requires_gpu, is_official, tags, version, author, license)
VALUES 
(
  'a0000002-0002-4002-8002-000000000001',
  'Bandpass Filter',
  'Apply zero-phase FIR bandpass filter to remove frequencies outside the band of interest. Essential for removing slow drifts and high-frequency noise.',
  'preprocessing',
  'mne-python',
  'ghcr.io/neurodata-hub',
  '{"type": "bids-raw", "modality": "eeg", "format": "mne.Raw"}'::jsonb,
  '{"type": "bids-derivative", "modality": "eeg", "format": "mne.Raw", "outputs": ["filtered_eeg"]}'::jsonb,
  '{"type": "object", "properties": {"l_freq": {"type": "number", "minimum": 0, "description": "Low cutoff frequency (Hz)"}, "h_freq": {"type": "number", "maximum": 500, "description": "High cutoff frequency (Hz)"}, "method": {"type": "string", "enum": ["fir", "iir"], "default": "fir"}}}'::jsonb,
  '{"l_freq": 0.1, "h_freq": 40.0, "method": "fir"}'::jsonb,
  1.0, 4.0, false, true,
  ARRAY['eeg', 'filter', 'preprocessing', 'bandpass'],
  '1.0.0', 'NeuroData Hub', 'MIT'
),
(
  'a0000002-0002-4002-8002-000000000002',
  'Notch Filter (Line Noise)',
  'Remove power line interference at 50Hz or 60Hz and their harmonics.',
  'preprocessing',
  'mne-python',
  'ghcr.io/neurodata-hub',
  '{"type": "bids-derivative", "modality": "eeg", "format": "mne.Raw"}'::jsonb,
  '{"type": "bids-derivative", "modality": "eeg", "format": "mne.Raw", "outputs": ["notched_eeg"]}'::jsonb,
  '{"type": "object", "properties": {"freqs": {"type": "array", "items": {"type": "number"}, "description": "Frequencies to notch out"}, "notch_widths": {"type": "number", "default": 2}}}'::jsonb,
  '{"freqs": [60, 120, 180], "notch_widths": 2}'::jsonb,
  1.0, 4.0, false, true,
  ARRAY['eeg', 'filter', 'preprocessing', 'notch', 'line-noise'],
  '1.0.0', 'NeuroData Hub', 'MIT'
),
(
  'a0000002-0002-4002-8002-000000000003',
  'ICA Artifact Removal',
  'Use Independent Component Analysis to identify and remove artifacts (eye blinks, muscle, heartbeat). Semi-automated with optional manual component selection.',
  'preprocessing',
  'mne-python',
  'ghcr.io/neurodata-hub',
  '{"type": "bids-derivative", "modality": "eeg", "format": "mne.Raw"}'::jsonb,
  '{"type": "bids-derivative", "modality": "eeg", "format": "mne.Raw", "outputs": ["cleaned_eeg", "ica_components", "excluded_components"]}'::jsonb,
  '{"type": "object", "properties": {"n_components": {"type": "integer", "description": "Number of ICA components"}, "method": {"type": "string", "enum": ["fastica", "infomax", "picard"], "default": "fastica"}, "max_iter": {"type": "integer", "default": 500}, "random_state": {"type": "integer", "default": 42}}}'::jsonb,
  '{"n_components": 20, "method": "fastica", "max_iter": 500, "random_state": 42}'::jsonb,
  2.0, 8.0, false, true,
  ARRAY['eeg', 'ica', 'preprocessing', 'artifact-removal', 'blink', 'muscle'],
  '1.0.0', 'NeuroData Hub', 'MIT'
),
(
  'a0000002-0002-4002-8002-000000000004',
  'Bad Channel Detection',
  'Automatically detect and interpolate bad channels using statistical methods (correlation, variance, noise).',
  'preprocessing',
  'mne-python',
  'ghcr.io/neurodata-hub',
  '{"type": "bids-raw", "modality": "eeg", "format": "mne.Raw"}'::jsonb,
  '{"type": "bids-derivative", "modality": "eeg", "format": "mne.Raw", "outputs": ["interpolated_eeg", "bad_channels"]}'::jsonb,
  '{"type": "object", "properties": {"method": {"type": "string", "enum": ["ransac", "correlation", "deviation"], "default": "ransac"}, "interpolate": {"type": "boolean", "default": true}}}'::jsonb,
  '{"method": "ransac", "interpolate": true}'::jsonb,
  1.0, 4.0, false, true,
  ARRAY['eeg', 'preprocessing', 'bad-channels', 'interpolation', 'quality'],
  '1.0.0', 'NeuroData Hub', 'MIT'
),
(
  'a0000002-0002-4002-8002-000000000005',
  'Re-Reference',
  'Apply spatial reference to EEG data. Options: average reference, mastoid reference, or custom reference.',
  'preprocessing',
  'mne-python',
  'ghcr.io/neurodata-hub',
  '{"type": "bids-derivative", "modality": "eeg", "format": "mne.Raw"}'::jsonb,
  '{"type": "bids-derivative", "modality": "eeg", "format": "mne.Raw", "outputs": ["rereferenced_eeg"]}'::jsonb,
  '{"type": "object", "properties": {"ref_channels": {"type": ["string", "array"], "description": "Reference channel(s) or average"}}}'::jsonb,
  '{"ref_channels": "average"}'::jsonb,
  0.5, 2.0, false, true,
  ARRAY['eeg', 'preprocessing', 'reference', 'average-reference'],
  '1.0.0', 'NeuroData Hub', 'MIT'
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  container_image = EXCLUDED.container_image,
  input_schema = EXCLUDED.input_schema,
  output_schema = EXCLUDED.output_schema,
  updated_at = NOW();

-- Analysis Algorithms
INSERT INTO algorithm_library (id, name, description, category, container_image, container_registry, input_schema, output_schema, config_schema, default_config, recommended_cpu, recommended_memory_gb, requires_gpu, is_official, tags, version, author, license)
VALUES 
(
  'a0000003-0003-4003-8003-000000000001',
  'Power Spectral Density',
  'Compute power spectral density using Welch method. Extract band power for delta, theta, alpha, beta, gamma.',
  'analysis',
  'mne-python',
  'ghcr.io/neurodata-hub',
  '{"type": "bids-derivative", "modality": "eeg", "format": "mne.Raw"}'::jsonb,
  '{"type": "spectral", "format": "array", "outputs": ["psd", "freqs", "band_powers"]}'::jsonb,
  '{"type": "object", "properties": {"fmin": {"type": "number", "default": 0.5}, "fmax": {"type": "number", "default": 50}, "n_fft": {"type": "integer", "default": 2048}}}'::jsonb,
  '{"fmin": 0.5, "fmax": 50, "n_fft": 2048}'::jsonb,
  1.0, 4.0, false, true,
  ARRAY['eeg', 'analysis', 'spectral', 'psd', 'band-power'],
  '1.0.0', 'NeuroData Hub', 'MIT'
),
(
  'a0000003-0003-4003-8003-000000000002',
  'Event-Related Potentials',
  'Epoch data around events and compute average ERPs. Supports baseline correction and rejection thresholds.',
  'analysis',
  'mne-python',
  'ghcr.io/neurodata-hub',
  '{"type": "bids-derivative", "modality": "eeg", "format": "mne.Raw", "required": ["events"]}'::jsonb,
  '{"type": "erp", "format": "mne.Evoked", "outputs": ["evoked", "epochs", "dropped_epochs"]}'::jsonb,
  '{"type": "object", "properties": {"tmin": {"type": "number", "default": -0.2}, "tmax": {"type": "number", "default": 0.8}, "baseline": {"type": "array", "default": [-0.2, 0]}}}'::jsonb,
  '{"tmin": -0.2, "tmax": 0.8, "baseline": [-0.2, 0]}'::jsonb,
  2.0, 8.0, false, true,
  ARRAY['eeg', 'analysis', 'erp', 'epochs', 'evoked'],
  '1.0.0', 'NeuroData Hub', 'MIT'
),
(
  'a0000003-0003-4003-8003-000000000003',
  'Connectivity Analysis',
  'Compute functional connectivity between channels/regions. Methods: coherence, PLV, PLI, wPLI, Granger causality.',
  'analysis',
  'mne-connectivity',
  'ghcr.io/neurodata-hub',
  '{"type": "bids-derivative", "modality": "eeg", "format": "mne.Epochs"}'::jsonb,
  '{"type": "connectivity", "format": "array", "outputs": ["connectivity_matrix", "node_labels"]}'::jsonb,
  '{"type": "object", "properties": {"method": {"type": "string", "enum": ["coh", "plv", "pli", "wpli", "gc"], "default": "wpli"}, "fmin": {"type": "number"}, "fmax": {"type": "number"}, "faverage": {"type": "boolean", "default": true}}}'::jsonb,
  '{"method": "wpli", "fmin": 8, "fmax": 13, "faverage": true}'::jsonb,
  4.0, 16.0, false, true,
  ARRAY['eeg', 'analysis', 'connectivity', 'coherence', 'plv', 'network'],
  '1.0.0', 'NeuroData Hub', 'MIT'
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  container_image = EXCLUDED.container_image,
  input_schema = EXCLUDED.input_schema,
  output_schema = EXCLUDED.output_schema,
  updated_at = NOW();

-- ML Inference Algorithms
INSERT INTO algorithm_library (id, name, description, category, container_image, container_registry, input_schema, output_schema, config_schema, default_config, recommended_cpu, recommended_memory_gb, requires_gpu, is_official, tags, version, author, license)
VALUES 
(
  'a0000004-0004-4004-8004-000000000001',
  'Sleep Stage Classification',
  'Classify sleep stages (Wake, N1, N2, N3, REM) from EEG using pre-trained YASA model.',
  'ml_inference',
  'yasa',
  'ghcr.io/neurodata-hub',
  '{"type": "bids-derivative", "modality": "eeg", "format": "mne.Raw"}'::jsonb,
  '{"type": "classification", "format": "array", "outputs": ["hypnogram", "probabilities", "confidence"]}'::jsonb,
  '{"type": "object", "properties": {"eeg_name": {"type": "string"}, "eog_name": {"type": "string"}, "emg_name": {"type": "string"}}}'::jsonb,
  '{}'::jsonb,
  2.0, 8.0, true, true,
  ARRAY['eeg', 'ml', 'sleep', 'classification', 'yasa'],
  '1.0.0', 'NeuroData Hub', 'MIT'
),
(
  'a0000004-0004-4004-8004-000000000002',
  'Motor Imagery Classification',
  'Classify motor imagery (left/right hand, feet, tongue) using CSP + LDA or deep learning.',
  'ml_inference',
  'braindecode',
  'ghcr.io/neurodata-hub',
  '{"type": "bids-derivative", "modality": "eeg", "format": "mne.Epochs"}'::jsonb,
  '{"type": "classification", "format": "array", "outputs": ["predictions", "probabilities", "class_labels"]}'::jsonb,
  '{"type": "object", "properties": {"model": {"type": "string", "enum": ["csp_lda", "eegnet", "shallow_fbcsp"], "default": "eegnet"}}}'::jsonb,
  '{"model": "eegnet"}'::jsonb,
  2.0, 8.0, true, true,
  ARRAY['eeg', 'ml', 'bci', 'motor-imagery', 'classification'],
  '1.0.0', 'NeuroData Hub', 'MIT'
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  container_image = EXCLUDED.container_image,
  input_schema = EXCLUDED.input_schema,
  output_schema = EXCLUDED.output_schema,
  updated_at = NOW();

-- Output Sinks
INSERT INTO algorithm_library (id, name, description, category, container_image, container_registry, input_schema, output_schema, config_schema, default_config, recommended_cpu, recommended_memory_gb, requires_gpu, is_official, tags, version, author, license)
VALUES 
(
  'a0000005-0005-4005-8005-000000000001',
  'BIDS Exporter',
  'Export processed data to BIDS-derivative format for sharing and reproducibility.',
  'output_sink',
  'mne-bids',
  'ghcr.io/neurodata-hub',
  '{"type": "any", "description": "Any MNE object or array"}'::jsonb,
  '{"type": "file", "format": "bids-derivative", "outputs": ["bids_path"]}'::jsonb,
  '{"type": "object", "properties": {"bids_root": {"type": "string"}, "subject": {"type": "string"}, "session": {"type": "string"}, "task": {"type": "string"}}}'::jsonb,
  '{}'::jsonb,
  0.5, 2.0, false, true,
  ARRAY['bids', 'output', 'export'],
  '1.0.0', 'NeuroData Hub', 'MIT'
),
(
  'a0000005-0005-4005-8005-000000000002',
  'Report Generator',
  'Generate HTML/PDF report with figures, statistics, and quality metrics.',
  'output_sink',
  'mne-python',
  'ghcr.io/neurodata-hub',
  '{"type": "any", "description": "Any analysis results"}'::jsonb,
  '{"type": "file", "format": "html", "outputs": ["report_path"]}'::jsonb,
  '{"type": "object", "properties": {"title": {"type": "string"}, "include_figures": {"type": "boolean", "default": true}}}'::jsonb,
  '{"include_figures": true}'::jsonb,
  0.5, 2.0, false, true,
  ARRAY['output', 'report', 'visualization'],
  '1.0.0', 'NeuroData Hub', 'MIT'
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  container_image = EXCLUDED.container_image,
  input_schema = EXCLUDED.input_schema,
  output_schema = EXCLUDED.output_schema,
  updated_at = NOW();

-- =============================================
-- TEMPLATE WORKFLOW: Standard EEG Cleaning
-- =============================================

INSERT INTO workflows (id, user_id, name, description, is_template, is_public, status, bids_dataset_name, tags)
VALUES (
  'b0000001-0001-4001-8001-000000000001',
  NULL,
  'Standard EEG Preprocessing Pipeline',
  'A complete EEG preprocessing pipeline following best practices: Load → Filter → Remove Line Noise → Detect Bad Channels → ICA Artifact Removal → Re-reference → Export. Based on MNE-Python recommendations.',
  TRUE,
  TRUE,
  'ready',
  'derivatives/preprocessed',
  ARRAY['eeg', 'preprocessing', 'mne', 'template', 'beginner-friendly']
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Create nodes for template workflow
INSERT INTO compute_nodes (id, workflow_id, name, description, category, algorithm_id, brain_region, color, icon, position_x, position_y, config_values, status)
VALUES 
-- Node 1: EDF Loader
('c0000001-0001-4001-8001-000000000001', 'b0000001-0001-4001-8001-000000000001',
 'Load EEG Data', 'Load raw EEG from EDF file', 'input_source',
 'a0000001-0001-4001-8001-000000000001', NULL, '#22c55e', 'upload', 100, 300, '{}'::jsonb, 'idle'),
-- Node 2: Bandpass
('c0000001-0001-4001-8001-000000000002', 'b0000001-0001-4001-8001-000000000001',
 'Bandpass Filter (0.1-40 Hz)', 'Remove slow drifts and high-frequency noise', 'preprocessing',
 'a0000002-0002-4002-8002-000000000001', 'Thalamus', '#6366f1', 'filter', 300, 300, '{"l_freq": 0.1, "h_freq": 40.0}'::jsonb, 'idle'),
-- Node 3: Notch
('c0000001-0001-4001-8001-000000000003', 'b0000001-0001-4001-8001-000000000001',
 'Remove 60Hz Line Noise', 'Notch filter at 60Hz and harmonics', 'preprocessing',
 'a0000002-0002-4002-8002-000000000002', 'Thalamus', '#6366f1', 'zap-off', 500, 300, '{"freqs": [60, 120, 180]}'::jsonb, 'idle'),
-- Node 4: Bad Channel
('c0000001-0001-4001-8001-000000000004', 'b0000001-0001-4001-8001-000000000001',
 'Detect & Fix Bad Channels', 'Find noisy channels and interpolate', 'preprocessing',
 'a0000002-0002-4002-8002-000000000004', 'Insula', '#f59e0b', 'scan', 700, 200, '{}'::jsonb, 'idle'),
-- Node 5: ICA
('c0000001-0001-4001-8001-000000000005', 'b0000001-0001-4001-8001-000000000001',
 'ICA Artifact Removal', 'Remove eye blinks, muscle artifacts via ICA', 'preprocessing',
 'a0000002-0002-4002-8002-000000000003', 'Prefrontal Cortex', '#8b5cf6', 'sparkles', 700, 400, '{"n_components": 20, "method": "fastica"}'::jsonb, 'idle'),
-- Node 6: Re-Reference
('c0000001-0001-4001-8001-000000000006', 'b0000001-0001-4001-8001-000000000001',
 'Average Reference', 'Apply common average reference', 'preprocessing',
 'a0000002-0002-4002-8002-000000000005', NULL, '#6366f1', 'git-merge', 900, 300, '{"ref_channels": "average"}'::jsonb, 'idle'),
-- Node 7: Export
('c0000001-0001-4001-8001-000000000007', 'b0000001-0001-4001-8001-000000000001',
 'Export to BIDS', 'Save preprocessed data in BIDS format', 'output_sink',
 'a0000005-0005-4005-8005-000000000001', NULL, '#ef4444', 'download', 1100, 300, '{}'::jsonb, 'idle')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  config_values = EXCLUDED.config_values,
  position_x = EXCLUDED.position_x,
  position_y = EXCLUDED.position_y,
  updated_at = NOW();

-- Create edges
INSERT INTO node_edges (id, workflow_id, source_node_id, target_node_id, data_mapping, is_valid)
VALUES 
('d0000001-0001-4001-8001-000000000001', 'b0000001-0001-4001-8001-000000000001', 
 'c0000001-0001-4001-8001-000000000001', 'c0000001-0001-4001-8001-000000000002', '{"raw_eeg": "input"}'::jsonb, TRUE),
('d0000001-0001-4001-8001-000000000002', 'b0000001-0001-4001-8001-000000000001',
 'c0000001-0001-4001-8001-000000000002', 'c0000001-0001-4001-8001-000000000003', '{"filtered_eeg": "input"}'::jsonb, TRUE),
('d0000001-0001-4001-8001-000000000003', 'b0000001-0001-4001-8001-000000000001',
 'c0000001-0001-4001-8001-000000000003', 'c0000001-0001-4001-8001-000000000004', '{"notched_eeg": "input"}'::jsonb, TRUE),
('d0000001-0001-4001-8001-000000000004', 'b0000001-0001-4001-8001-000000000001',
 'c0000001-0001-4001-8001-000000000003', 'c0000001-0001-4001-8001-000000000005', '{"notched_eeg": "input"}'::jsonb, TRUE),
('d0000001-0001-4001-8001-000000000005', 'b0000001-0001-4001-8001-000000000001',
 'c0000001-0001-4001-8001-000000000004', 'c0000001-0001-4001-8001-000000000006', '{"interpolated_eeg": "input"}'::jsonb, TRUE),
('d0000001-0001-4001-8001-000000000006', 'b0000001-0001-4001-8001-000000000001',
 'c0000001-0001-4001-8001-000000000005', 'c0000001-0001-4001-8001-000000000006', '{"cleaned_eeg": "input"}'::jsonb, TRUE),
('d0000001-0001-4001-8001-000000000007', 'b0000001-0001-4001-8001-000000000001',
 'c0000001-0001-4001-8001-000000000006', 'c0000001-0001-4001-8001-000000000007', '{"rereferenced_eeg": "data"}'::jsonb, TRUE)
ON CONFLICT (id) DO UPDATE SET
  data_mapping = EXCLUDED.data_mapping,
  is_valid = EXCLUDED.is_valid;

-- =============================================
-- VERIFICATION
-- =============================================

SELECT 'Seed data loaded successfully!' AS status;

SELECT 'Algorithm Library:' AS table_name, COUNT(*) AS count FROM algorithm_library
UNION ALL
SELECT 'Workflows:', COUNT(*) FROM workflows
UNION ALL
SELECT 'Compute Nodes:', COUNT(*) FROM compute_nodes
UNION ALL
SELECT 'Node Edges:', COUNT(*) FROM node_edges;
