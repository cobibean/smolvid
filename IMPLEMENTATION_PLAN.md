# Implementation Plan — smolvids

## Overview

**smolvids** is a privacy-first, browser-based video compression tool using ffmpeg.wasm. This plan covers 5 phases to deliver a fully functional v1.

**Tech Stack:**
- Vanilla HTML/CSS/JavaScript (no framework - keeps it simple and static-hosting friendly)
- ffmpeg.wasm (v0.12.x) for local video processing
- Static files only - deployable anywhere

**Key Constraints:**
- 100% client-side processing
- Output: MP4 (H.264) with unchanged audio
- Target size presets: 50MB, 100MB
- Compression presets: Fast, Balanced, Smallest

---

## Phase 1: Project Setup & Static Shell

### Goal
Establish project structure, tooling, and the static HTML/CSS skeleton with placeholder UI.

### Deliverables
- Project directory structure
- Base HTML with semantic structure
- CSS styling (minimal, calm aesthetic)
- Development server setup
- README with setup instructions

### File-by-File Tasks

#### `index.html`
Create the main HTML structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>smolvids — Simple Video Compression</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <main class="container">
    <!-- Header -->
    <header class="header">
      <h1>smolvids</h1>
      <p class="privacy-note">Runs locally. No uploads. Your video never leaves your device.</p>
    </header>

    <!-- File Selection Panel -->
    <section id="file-section" class="panel">
      <button id="select-btn" class="btn btn-primary">Select Video</button>
      <input type="file" id="file-input" accept="video/*" hidden>
      <div id="file-info" class="file-info hidden">
        <p><strong>File:</strong> <span id="file-name"></span></p>
        <p><strong>Size:</strong> <span id="file-size"></span></p>
        <p id="duration-row"><strong>Duration:</strong> <span id="file-duration"></span></p>
      </div>
    </section>

    <!-- Controls Panel -->
    <section id="controls-section" class="panel hidden">
      <div class="control-group">
        <label for="size-select">Max file size</label>
        <select id="size-select">
          <option value="50">50 MB</option>
          <option value="100">100 MB</option>
        </select>
      </div>
      <div class="control-group">
        <label>Compression preset</label>
        <div class="preset-buttons">
          <button class="preset-btn" data-preset="fast">Fast</button>
          <button class="preset-btn active" data-preset="balanced">Balanced</button>
          <button class="preset-btn" data-preset="smallest">Smallest</button>
        </div>
      </div>
      <button id="compress-btn" class="btn btn-primary">Compress</button>
    </section>

    <!-- Progress Panel -->
    <section id="progress-section" class="panel hidden">
      <p id="progress-text">Compressing...</p>
      <div class="progress-bar">
        <div id="progress-fill" class="progress-fill"></div>
      </div>
    </section>

    <!-- Result Panel -->
    <section id="result-section" class="panel hidden">
      <p id="result-message"></p>
      <p><strong>Output size:</strong> <span id="output-size"></span></p>
      <a id="download-link" class="btn btn-primary" download>Download</a>
      <button id="reset-btn" class="btn btn-secondary">Compress Another</button>
    </section>

    <!-- Error Panel -->
    <section id="error-section" class="panel hidden">
      <p id="error-message" class="error-text"></p>
      <button id="error-reset-btn" class="btn btn-secondary">Try Again</button>
    </section>
  </main>
  <script type="module" src="app.js"></script>
</body>
</html>
```

#### `styles.css`
Create minimal, calm styling:

```css
:root {
  --color-bg: #fafafa;
  --color-surface: #ffffff;
  --color-text: #1a1a1a;
  --color-text-muted: #666666;
  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
  --color-border: #e5e5e5;
  --color-error: #dc2626;
  --color-warning: #d97706;
  --color-success: #16a34a;
  --radius: 8px;
  --shadow: 0 1px 3px rgba(0,0,0,0.1);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--color-bg);
  color: var(--color-text);
  line-height: 1.5;
  min-height: 100vh;
  padding: 2rem 1rem;
}

.container {
  max-width: 480px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 2rem;
}

.header h1 {
  font-size: 2rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.privacy-note {
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 1.5rem;
  margin-bottom: 1rem;
  box-shadow: var(--shadow);
}

.hidden {
  display: none !important;
}

.btn {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: var(--radius);
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  text-align: center;
  transition: background 0.15s;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--color-bg);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.file-info {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.file-info p {
  margin-bottom: 0.25rem;
}

.control-group {
  margin-bottom: 1.25rem;
}

.control-group label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

select {
  width: 100%;
  padding: 0.625rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 1rem;
  background: white;
}

.preset-buttons {
  display: flex;
  gap: 0.5rem;
}

.preset-btn {
  flex: 1;
  padding: 0.625rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: white;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.15s;
}

.preset-btn.active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.progress-bar {
  height: 8px;
  background: var(--color-border);
  border-radius: 4px;
  overflow: hidden;
  margin-top: 0.75rem;
}

.progress-fill {
  height: 100%;
  background: var(--color-primary);
  width: 0%;
  transition: width 0.3s;
}

.error-text {
  color: var(--color-error);
}

.warning-text {
  color: var(--color-warning);
}

#result-section .btn {
  display: block;
  width: 100%;
  margin-bottom: 0.5rem;
}

#controls-section .btn {
  width: 100%;
  margin-top: 0.5rem;
}
```

#### `app.js`
Create placeholder module structure:

```javascript
// app.js - Main entry point (placeholder for Phase 1)

// State management
const state = {
  file: null,
  duration: null,
  targetSizeMB: 50,
  preset: 'balanced',
  isCompressing: false
};

// DOM references (will be populated in init)
const dom = {};

// Initialize app
function init() {
  console.log('smolvids initialized');
  // DOM setup will be added in Phase 2
}

document.addEventListener('DOMContentLoaded', init);
```

#### `README.md`
Create setup and deployment instructions:

```markdown
# smolvids

A simple, privacy-first video compression tool that runs 100% in your browser.

## Features

- Compress videos locally - no uploads, no servers
- Target specific file sizes (50MB, 100MB)
- Three compression presets: Fast, Balanced, Smallest
- Outputs MP4 (H.264) with original audio preserved

## Development

### Prerequisites

- Node.js 18+ (for local dev server)
- Modern browser (Chrome, Firefox, Safari, Edge)

### Setup

```bash
# Clone the repository
git clone <repo-url>
cd smolvids

# Install dev dependencies
npm install

# Start development server
npm run dev
```

### Build

```bash
npm run build
```

Output is in the `dist/` folder - pure static files.

## Deployment

Deploy the contents of `dist/` to any static hosting:

- GitHub Pages
- Netlify
- Vercel
- Any web server

No backend required.

## License

MIT
```

#### `package.json`
Minimal package config for dev tooling:

```json
{
  "name": "smolvids",
  "version": "1.0.0",
  "description": "Simple, privacy-first video compression in the browser",
  "type": "module",
  "scripts": {
    "dev": "npx serve .",
    "build": "mkdir -p dist && cp index.html styles.css app.js dist/ && cp -r lib dist/"
  },
  "devDependencies": {
    "serve": "^14.2.0"
  }
}
```

### Completion Checks
- [ ] `npm run dev` serves the app at localhost
- [ ] Page renders with header, file selection panel visible
- [ ] Controls/progress/result panels exist but are hidden
- [ ] CSS applies correctly (centered layout, calm aesthetic)
- [ ] No console errors on load
- [ ] README contains accurate setup instructions

---

## Phase 2: File Selection & Metadata Extraction

### Goal
Implement video file selection and extract metadata (name, size, duration) for display.

### Deliverables
- File input handling with drag-and-drop
- Video metadata extraction using HTML5 Video element
- File info display with proper formatting
- Duration extraction (best-effort, non-blocking)

### File-by-File Tasks

#### `app.js` — Update with file handling

```javascript
// app.js - Full implementation for Phase 2

const state = {
  file: null,
  duration: null,
  audioSize: null,
  targetSizeMB: 50,
  preset: 'balanced',
  isCompressing: false
};

const dom = {};

function init() {
  // Cache DOM references
  dom.selectBtn = document.getElementById('select-btn');
  dom.fileInput = document.getElementById('file-input');
  dom.fileInfo = document.getElementById('file-info');
  dom.fileName = document.getElementById('file-name');
  dom.fileSize = document.getElementById('file-size');
  dom.fileDuration = document.getElementById('file-duration');
  dom.durationRow = document.getElementById('duration-row');
  dom.controlsSection = document.getElementById('controls-section');
  dom.sizeSelect = document.getElementById('size-select');
  dom.presetBtns = document.querySelectorAll('.preset-btn');
  dom.compressBtn = document.getElementById('compress-btn');
  dom.progressSection = document.getElementById('progress-section');
  dom.progressText = document.getElementById('progress-text');
  dom.progressFill = document.getElementById('progress-fill');
  dom.resultSection = document.getElementById('result-section');
  dom.resultMessage = document.getElementById('result-message');
  dom.outputSize = document.getElementById('output-size');
  dom.downloadLink = document.getElementById('download-link');
  dom.resetBtn = document.getElementById('reset-btn');
  dom.errorSection = document.getElementById('error-section');
  dom.errorMessage = document.getElementById('error-message');
  dom.errorResetBtn = document.getElementById('error-reset-btn');

  // Event listeners
  dom.selectBtn.addEventListener('click', () => dom.fileInput.click());
  dom.fileInput.addEventListener('change', handleFileSelect);
  dom.sizeSelect.addEventListener('change', handleSizeChange);
  dom.presetBtns.forEach(btn => {
    btn.addEventListener('click', () => handlePresetChange(btn.dataset.preset));
  });
  dom.compressBtn.addEventListener('click', handleCompress);
  dom.resetBtn.addEventListener('click', resetApp);
  dom.errorResetBtn.addEventListener('click', resetApp);

  console.log('smolvids initialized');
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validate it's a video
  if (!file.type.startsWith('video/')) {
    showError('Please select a video file.');
    return;
  }

  state.file = file;
  state.duration = null;

  // Display basic file info
  dom.fileName.textContent = file.name;
  dom.fileSize.textContent = formatBytes(file.size);
  dom.fileInfo.classList.remove('hidden');

  // Extract duration using HTML5 Video element
  extractDuration(file);

  // Show controls
  dom.controlsSection.classList.remove('hidden');
}

function extractDuration(file) {
  const video = document.createElement('video');
  video.preload = 'metadata';

  const objectUrl = URL.createObjectURL(file);

  video.onloadedmetadata = () => {
    if (video.duration && isFinite(video.duration)) {
      state.duration = video.duration;
      dom.fileDuration.textContent = formatDuration(video.duration);
      dom.durationRow.classList.remove('hidden');
    } else {
      dom.durationRow.classList.add('hidden');
    }
    URL.revokeObjectURL(objectUrl);
  };

  video.onerror = () => {
    // Duration extraction failed - not blocking
    dom.durationRow.classList.add('hidden');
    URL.revokeObjectURL(objectUrl);
  };

  video.src = objectUrl;
}

function handleSizeChange(event) {
  state.targetSizeMB = parseInt(event.target.value, 10);
}

function handlePresetChange(preset) {
  state.preset = preset;
  dom.presetBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.preset === preset);
  });
}

async function handleCompress() {
  // Placeholder - will be implemented in Phase 3
  console.log('Compress clicked', state);
}

function resetApp() {
  state.file = null;
  state.duration = null;
  state.audioSize = null;
  state.isCompressing = false;

  dom.fileInput.value = '';
  dom.fileInfo.classList.add('hidden');
  dom.controlsSection.classList.add('hidden');
  dom.progressSection.classList.add('hidden');
  dom.resultSection.classList.add('hidden');
  dom.errorSection.classList.add('hidden');
  dom.progressFill.style.width = '0%';
}

function showError(message) {
  dom.errorMessage.textContent = message;
  dom.errorSection.classList.remove('hidden');
  dom.controlsSection.classList.add('hidden');
  dom.progressSection.classList.add('hidden');
}

// Utility functions
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

document.addEventListener('DOMContentLoaded', init);
```

### Completion Checks
- [ ] Clicking "Select Video" opens file picker
- [ ] Selecting a video displays file name and size
- [ ] Duration displays if extractable (hidden otherwise)
- [ ] Controls section appears after file selection
- [ ] Preset buttons toggle correctly (only one active)
- [ ] Size dropdown changes state.targetSizeMB
- [ ] "Try Again" / reset buttons clear state and hide panels
- [ ] Non-video files show error message

---

## Phase 3: ffmpeg.wasm Integration & Basic Compression

### Goal
Integrate ffmpeg.wasm and implement the core compression pipeline with bitrate calculation.

### Deliverables
- ffmpeg.wasm loaded and initialized
- Bitrate calculation based on target size and duration
- Basic video compression (single-pass)
- Progress reporting during compression
- Downloadable output file

### File-by-File Tasks

#### `lib/ffmpeg-loader.js` — Create ffmpeg wrapper module

```javascript
// lib/ffmpeg-loader.js
// Wrapper for ffmpeg.wasm initialization and operations

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg = null;
let loaded = false;

export async function loadFFmpeg(onProgress) {
  if (loaded) return ffmpeg;

  ffmpeg = new FFmpeg();

  // Progress callback for loading
  ffmpeg.on('log', ({ message }) => {
    console.log('[ffmpeg]', message);
  });

  // Load ffmpeg core from CDN
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  loaded = true;
  return ffmpeg;
}

export async function getVideoDuration(ffmpeg, inputFileName) {
  // Use ffprobe-style approach via ffmpeg
  // Returns duration in seconds or null if not extractable
  try {
    await ffmpeg.exec(['-i', inputFileName, '-f', 'null', '-']);
  } catch (e) {
    // ffmpeg exits with error but logs contain duration
  }
  // Duration is typically logged - for now return null and rely on HTML5 extraction
  return null;
}

export async function writeInputFile(ffmpeg, file) {
  const data = await fetchFile(file);
  await ffmpeg.writeFile(file.name, data);
  return file.name;
}

export async function readOutputFile(ffmpeg, fileName) {
  const data = await ffmpeg.readFile(fileName);
  return new Blob([data.buffer], { type: 'video/mp4' });
}

export async function deleteFile(ffmpeg, fileName) {
  try {
    await ffmpeg.deleteFile(fileName);
  } catch (e) {
    // Ignore deletion errors
  }
}

export { fetchFile };
```

#### `lib/compressor.js` — Compression logic module

```javascript
// lib/compressor.js
// Core compression logic and bitrate calculations

// Preset configurations
// CRF: lower = better quality, higher = smaller file
// preset: encoding speed (ultrafast -> veryslow)
const PRESETS = {
  fast: {
    ffmpegPreset: 'veryfast',
    crfBase: 28,
    maxPasses: 2
  },
  balanced: {
    ffmpegPreset: 'medium',
    crfBase: 23,
    maxPasses: 3
  },
  smallest: {
    ffmpegPreset: 'slow',
    crfBase: 18,
    maxPasses: 4
  }
};

// Resolution steps for downscaling
const RESOLUTIONS = [
  { height: 1080, label: '1080p' },
  { height: 720, label: '720p' },
  { height: 480, label: '480p' },
  { height: 360, label: '360p' }
];

/**
 * Calculate target video bitrate
 * @param {number} targetSizeMB - Target file size in MB
 * @param {number} durationSec - Video duration in seconds
 * @param {number} estimatedAudioBytes - Estimated audio size (or 0)
 * @returns {number} Target video bitrate in kbps
 */
export function calculateTargetBitrate(targetSizeMB, durationSec, estimatedAudioBytes = 0) {
  const targetBytes = targetSizeMB * 1024 * 1024;
  const videoBudgetBytes = targetBytes - estimatedAudioBytes;

  if (videoBudgetBytes <= 0) {
    // Audio alone exceeds target - return minimum viable bitrate
    return 100; // 100 kbps minimum
  }

  // bitrate (kbps) = (bytes * 8) / (seconds * 1000)
  const bitrate = (videoBudgetBytes * 8) / (durationSec * 1000);

  // Clamp to reasonable range
  return Math.max(100, Math.min(bitrate, 50000));
}

/**
 * Estimate audio size from file (rough estimate)
 * Assumes ~128kbps audio if we can't measure
 * @param {number} durationSec
 * @returns {number} Estimated audio bytes
 */
export function estimateAudioSize(durationSec) {
  // Assume 128kbps AAC audio as default
  const audioBitrate = 128; // kbps
  return (audioBitrate * 1000 * durationSec) / 8;
}

/**
 * Build ffmpeg arguments for compression
 * @param {string} inputFile
 * @param {string} outputFile
 * @param {object} options
 * @returns {string[]} ffmpeg arguments
 */
export function buildFFmpegArgs(inputFile, outputFile, options) {
  const { preset, targetBitrate, scaleHeight } = options;
  const presetConfig = PRESETS[preset];

  const args = [
    '-i', inputFile,
    '-c:v', 'libx264',           // H.264 codec
    '-preset', presetConfig.ffmpegPreset,
    '-b:v', `${Math.round(targetBitrate)}k`,
    '-maxrate', `${Math.round(targetBitrate * 1.5)}k`,
    '-bufsize', `${Math.round(targetBitrate * 2)}k`,
    '-c:a', 'copy',              // Copy audio unchanged
    '-movflags', '+faststart',   // Web-optimized MP4
  ];

  // Add scaling if needed
  if (scaleHeight) {
    args.push('-vf', `scale=-2:${scaleHeight}`);
  }

  args.push('-y', outputFile);   // Overwrite output

  return args;
}

/**
 * Get downscale resolution if needed
 * @param {number} currentHeight - Current video height
 * @param {number} step - Downscale step (0 = no change)
 * @returns {number|null} Target height or null for no scaling
 */
export function getScaleHeight(currentHeight, step) {
  if (step === 0) return null;

  // Find current position in resolution ladder
  let currentIndex = RESOLUTIONS.findIndex(r => r.height <= currentHeight);
  if (currentIndex === -1) currentIndex = 0;

  // Get target resolution (step down from current)
  const targetIndex = Math.min(currentIndex + step, RESOLUTIONS.length - 1);
  return RESOLUTIONS[targetIndex].height;
}

/**
 * Generate output filename
 * @param {string} originalName
 * @returns {string}
 */
export function getOutputFileName(originalName) {
  const lastDot = originalName.lastIndexOf('.');
  const baseName = lastDot > 0 ? originalName.substring(0, lastDot) : originalName;
  return `${baseName}_compressed.mp4`;
}

export { PRESETS };
```

#### `app.js` — Update with compression integration

Add to the existing app.js (replace handleCompress function and add imports):

```javascript
// Add at top of app.js
import { loadFFmpeg, writeInputFile, readOutputFile, deleteFile } from './lib/ffmpeg-loader.js';
import {
  calculateTargetBitrate,
  estimateAudioSize,
  buildFFmpegArgs,
  getOutputFileName,
  getScaleHeight
} from './lib/compressor.js';

// Update handleCompress function
async function handleCompress() {
  if (state.isCompressing || !state.file) return;

  state.isCompressing = true;
  dom.compressBtn.disabled = true;
  dom.controlsSection.classList.add('hidden');
  dom.progressSection.classList.remove('hidden');
  updateProgress('Loading compression engine...', 5);

  try {
    // Load ffmpeg
    const ffmpeg = await loadFFmpeg();
    updateProgress('Preparing video...', 10);

    // Set up progress logging
    ffmpeg.on('progress', ({ progress }) => {
      const percent = Math.round(10 + progress * 80); // 10-90% range
      updateProgress('Compressing...', percent);
    });

    // Write input file to ffmpeg virtual filesystem
    const inputFileName = await writeInputFile(ffmpeg, state.file);
    const outputFileName = getOutputFileName(state.file.name);

    // Calculate target bitrate
    const duration = state.duration || 60; // Default to 60s if unknown
    const estimatedAudio = estimateAudioSize(duration);
    const targetBitrate = calculateTargetBitrate(state.targetSizeMB, duration, estimatedAudio);

    updateProgress('Compressing...', 15);

    // Build and run ffmpeg command
    const args = buildFFmpegArgs(inputFileName, outputFileName, {
      preset: state.preset,
      targetBitrate: targetBitrate,
      scaleHeight: null // No scaling in first attempt
    });

    await ffmpeg.exec(args);

    updateProgress('Finalizing...', 95);

    // Read output file
    const outputBlob = await readOutputFile(ffmpeg, outputFileName);

    // Clean up
    await deleteFile(ffmpeg, inputFileName);
    await deleteFile(ffmpeg, outputFileName);

    // Show result
    showResult(outputBlob, outputFileName);

  } catch (error) {
    console.error('Compression failed:', error);
    showError('This file couldn\'t be processed in your browser. Try a different video.');
  } finally {
    state.isCompressing = false;
    dom.compressBtn.disabled = false;
  }
}

function updateProgress(text, percent) {
  dom.progressText.textContent = text;
  dom.progressFill.style.width = `${percent}%`;
}

function showResult(blob, fileName) {
  const url = URL.createObjectURL(blob);

  dom.downloadLink.href = url;
  dom.downloadLink.download = fileName;
  dom.outputSize.textContent = formatBytes(blob.size);

  // Check if target was met
  const targetBytes = state.targetSizeMB * 1024 * 1024;
  if (blob.size > targetBytes) {
    dom.resultMessage.textContent = 'Compression complete. Output is larger than target (see note below).';
    dom.resultMessage.classList.add('warning-text');
  } else {
    dom.resultMessage.textContent = 'Compression complete!';
    dom.resultMessage.classList.remove('warning-text');
  }

  dom.progressSection.classList.add('hidden');
  dom.resultSection.classList.remove('hidden');
}
```

#### Update `index.html`
Change script tag to module type (should already be done in Phase 1):
```html
<script type="module" src="app.js"></script>
```

### Completion Checks
- [ ] ffmpeg.wasm loads successfully (check console for "[ffmpeg]" logs)
- [ ] Progress bar updates during compression
- [ ] Compression completes without errors for test video
- [ ] Output file is downloadable MP4
- [ ] Output filename follows `{original}_compressed.mp4` pattern
- [ ] Audio is preserved (copy codec)
- [ ] Output size is displayed
- [ ] Memory is cleaned up after compression

---

## Phase 4: Multi-Pass Compression & Target Size Logic

### Goal
Implement the iterative compression strategy to reliably hit target file sizes, including automatic downscaling when needed.

### Deliverables
- Multi-pass compression loop
- Automatic bitrate adjustment
- Resolution downscaling when target unreachable
- "Target unreachable due to audio" warning
- Improved progress reporting

### File-by-File Tasks

#### `lib/compressor.js` — Add multi-pass compression

Add the following function to compressor.js:

```javascript
/**
 * Compress video with iterative refinement to hit target size
 * @param {FFmpeg} ffmpeg - Loaded ffmpeg instance
 * @param {string} inputFileName - Input file name in vfs
 * @param {object} options - Compression options
 * @param {function} onProgress - Progress callback
 * @returns {Promise<{blob: Blob, warning: string|null}>}
 */
export async function compressToTargetSize(ffmpeg, inputFileName, options, onProgress) {
  const {
    outputFileName,
    targetSizeMB,
    durationSec,
    preset,
    originalFileSize
  } = options;

  const targetBytes = targetSizeMB * 1024 * 1024;
  const presetConfig = PRESETS[preset];
  const maxAttempts = presetConfig.maxPasses;

  // Estimate audio size
  const estimatedAudioBytes = estimateAudioSize(durationSec);

  // Check if target is unreachable due to audio
  let warning = null;
  if (estimatedAudioBytes >= targetBytes * 0.95) {
    warning = `Couldn't hit ${targetSizeMB}MB because the audio track alone is too large (audio is kept unchanged). Output is as small as possible.`;
  }

  // If original file is already smaller than target, just copy
  if (originalFileSize <= targetBytes) {
    // Still need to ensure MP4/H.264 output
    const args = [
      '-i', inputFileName,
      '-c:v', 'libx264',
      '-preset', presetConfig.ffmpegPreset,
      '-crf', String(presetConfig.crfBase),
      '-c:a', 'copy',
      '-movflags', '+faststart',
      '-y', outputFileName
    ];
    await ffmpeg.exec(args);
    return { warning: null };
  }

  let currentBitrate = calculateTargetBitrate(targetSizeMB, durationSec, estimatedAudioBytes);
  let scaleStep = 0;
  let lastOutputSize = Infinity;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const progressBase = (attempt - 1) / maxAttempts;
    onProgress(`Pass ${attempt}/${maxAttempts}...`, 15 + progressBase * 70);

    const scaleHeight = getScaleHeight(1080, scaleStep); // Assume 1080p input max

    const args = buildFFmpegArgs(inputFileName, outputFileName, {
      preset,
      targetBitrate: currentBitrate,
      scaleHeight
    });

    // Set up progress for this pass
    const passProgressHandler = ({ progress }) => {
      const passProgress = progressBase + (progress / maxAttempts);
      onProgress(`Pass ${attempt}/${maxAttempts}...`, 15 + passProgress * 70);
    };
    ffmpeg.on('progress', passProgressHandler);

    await ffmpeg.exec(args);

    ffmpeg.off('progress', passProgressHandler);

    // Check output size
    const outputData = await ffmpeg.readFile(outputFileName);
    const outputSize = outputData.length;
    lastOutputSize = outputSize;

    // Success - within target
    if (outputSize <= targetBytes) {
      return { warning: null };
    }

    // Need to compress more
    if (attempt < maxAttempts) {
      // Reduce bitrate by 20%
      currentBitrate = currentBitrate * 0.8;

      // If bitrate is getting too low, try downscaling instead
      if (currentBitrate < 500 && scaleStep < 3) {
        scaleStep++;
        // Reset bitrate after downscale
        currentBitrate = calculateTargetBitrate(targetSizeMB, durationSec, estimatedAudioBytes);
      }

      // Minimum bitrate floor
      if (currentBitrate < 100) {
        currentBitrate = 100;
      }
    }
  }

  // Couldn't hit target after all attempts
  if (!warning) {
    warning = `Output is ${formatBytes(lastOutputSize)} - couldn't reach ${targetSizeMB}MB target. This is as small as it can get while maintaining watchable quality.`;
  }

  return { warning };
}

// Helper to format bytes (duplicate from app.js for module use)
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}
```

#### `app.js` — Update handleCompress to use multi-pass

Replace the handleCompress function:

```javascript
async function handleCompress() {
  if (state.isCompressing || !state.file) return;

  state.isCompressing = true;
  dom.compressBtn.disabled = true;
  dom.controlsSection.classList.add('hidden');
  dom.progressSection.classList.remove('hidden');
  updateProgress('Loading compression engine...', 5);

  try {
    // Load ffmpeg
    const ffmpeg = await loadFFmpeg();
    updateProgress('Preparing video...', 10);

    // Write input file to ffmpeg virtual filesystem
    const inputFileName = state.file.name;
    await writeInputFile(ffmpeg, state.file);
    const outputFileName = getOutputFileName(state.file.name);

    // Calculate duration (use extracted or estimate from file size)
    const duration = state.duration || estimateDurationFromSize(state.file.size);

    // Run multi-pass compression
    const { warning } = await compressToTargetSize(ffmpeg, inputFileName, {
      outputFileName,
      targetSizeMB: state.targetSizeMB,
      durationSec: duration,
      preset: state.preset,
      originalFileSize: state.file.size
    }, updateProgress);

    updateProgress('Finalizing...', 95);

    // Read output file
    const outputBlob = await readOutputFile(ffmpeg, outputFileName);

    // Clean up
    await deleteFile(ffmpeg, inputFileName);
    await deleteFile(ffmpeg, outputFileName);

    // Show result with potential warning
    showResult(outputBlob, outputFileName, warning);

  } catch (error) {
    console.error('Compression failed:', error);
    showError('This file couldn\'t be processed in your browser. Try a different video or a smaller file.');
  } finally {
    state.isCompressing = false;
    dom.compressBtn.disabled = false;
  }
}

// Rough duration estimate if metadata extraction failed
function estimateDurationFromSize(fileSize) {
  // Assume ~5 Mbps average video = 625 KB/s
  const estimatedBytesPerSecond = 625 * 1024;
  return Math.max(10, fileSize / estimatedBytesPerSecond);
}

function showResult(blob, fileName, warning = null) {
  const url = URL.createObjectURL(blob);

  dom.downloadLink.href = url;
  dom.downloadLink.download = fileName;
  dom.outputSize.textContent = formatBytes(blob.size);

  if (warning) {
    dom.resultMessage.textContent = warning;
    dom.resultMessage.classList.add('warning-text');
  } else {
    dom.resultMessage.textContent = 'Compression complete!';
    dom.resultMessage.classList.remove('warning-text');
  }

  dom.progressSection.classList.add('hidden');
  dom.resultSection.classList.remove('hidden');
}
```

#### Update imports in `app.js`

```javascript
import { loadFFmpeg, writeInputFile, readOutputFile, deleteFile } from './lib/ffmpeg-loader.js';
import {
  compressToTargetSize,
  getOutputFileName
} from './lib/compressor.js';
```

### Completion Checks
- [ ] Multi-pass compression runs (check "Pass X/Y" in progress)
- [ ] Large video gets downscaled when bitrate alone insufficient
- [ ] Warning message appears when target unreachable
- [ ] Compression still completes even with warning
- [ ] Small files (already under target) still get processed to MP4/H.264
- [ ] Progress accurately reflects multi-pass status
- [ ] Output size in warning message is accurate

---

## Phase 5: Polish, Error Handling & Production Build

### Goal
Finalize the app with robust error handling, edge cases, and production-ready build.

### Deliverables
- Comprehensive error handling
- Audio codec incompatibility detection
- Memory management for large files
- Double-click prevention
- Browser compatibility checks
- Production build configuration
- Final README updates

### File-by-File Tasks

#### `app.js` — Add error handling and edge cases

Add browser compatibility check at init:

```javascript
function init() {
  // Check browser compatibility
  if (!checkBrowserSupport()) {
    showError('Your browser doesn\'t support the features needed for video compression. Please use a modern browser like Chrome, Firefox, or Edge.');
    return;
  }

  // ... rest of init
}

function checkBrowserSupport() {
  // Check for required APIs
  const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
  const hasFileReader = typeof FileReader !== 'undefined';
  const hasBlob = typeof Blob !== 'undefined';
  const hasURL = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function';

  return hasSharedArrayBuffer && hasFileReader && hasBlob && hasURL;
}
```

Add file size validation:

```javascript
function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validate it's a video
  if (!file.type.startsWith('video/')) {
    showError('Please select a video file.');
    return;
  }

  // Warn about large files
  const MAX_RECOMMENDED_SIZE = 1024 * 1024 * 1024; // 1GB
  if (file.size > MAX_RECOMMENDED_SIZE) {
    if (!confirm('This file is over 1GB and may cause your browser to slow down or crash. Continue anyway?')) {
      dom.fileInput.value = '';
      return;
    }
  }

  // ... rest of file handling
}
```

Add cleanup on page unload:

```javascript
// Add to init()
window.addEventListener('beforeunload', cleanup);

function cleanup() {
  // Revoke any object URLs to free memory
  if (dom.downloadLink && dom.downloadLink.href.startsWith('blob:')) {
    URL.revokeObjectURL(dom.downloadLink.href);
  }
}
```

#### `lib/ffmpeg-loader.js` — Add error handling

```javascript
export async function loadFFmpeg(onProgress) {
  if (loaded) return ffmpeg;

  ffmpeg = new FFmpeg();

  ffmpeg.on('log', ({ message }) => {
    console.log('[ffmpeg]', message);

    // Detect common errors
    if (message.includes('Discarded')) {
      console.warn('Audio/video stream discarded - may affect output');
    }
  });

  try {
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    loaded = true;
    return ffmpeg;
  } catch (error) {
    console.error('Failed to load ffmpeg:', error);

    // Check for specific errors
    if (error.message.includes('SharedArrayBuffer')) {
      throw new Error('Your browser needs to enable SharedArrayBuffer for video compression. Try Chrome or Firefox.');
    }

    throw new Error('Failed to load video compression engine. Please refresh and try again.');
  }
}
```

#### `lib/compressor.js` — Add audio incompatibility handling

Update compressToTargetSize to catch audio copy errors:

```javascript
export async function compressToTargetSize(ffmpeg, inputFileName, options, onProgress) {
  // ... existing code ...

  try {
    await ffmpeg.exec(args);
  } catch (execError) {
    const errorStr = execError.toString().toLowerCase();

    // Check for audio codec incompatibility
    if (errorStr.includes('audio') && (errorStr.includes('incompatible') || errorStr.includes('codec'))) {
      return {
        warning: 'The audio format in this video isn\'t compatible with MP4. Audio couldn\'t be preserved.'
      };
    }

    throw execError;
  }

  // ... rest of function
}
```

#### `styles.css` — Add loading state styling

```css
/* Add to styles.css */

.loading {
  position: relative;
  pointer-events: none;
}

.loading::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

#progress-section .progress-fill {
  animation: none;
}

#progress-section.active .progress-fill {
  animation: pulse 1.5s ease-in-out infinite;
}

/* Responsive adjustments */
@media (max-width: 480px) {
  body {
    padding: 1rem 0.75rem;
  }

  .panel {
    padding: 1rem;
  }

  .preset-buttons {
    flex-direction: column;
  }

  .preset-btn {
    flex: none;
  }
}
```

#### `index.html` — Add meta tags and CORS headers hint

```html
<!-- Add to <head> -->
<meta name="description" content="Compress videos locally in your browser. No uploads, no servers, 100% private.">
<meta name="theme-color" content="#2563eb">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📹</text></svg>">
```

#### `_headers` — Netlify/Vercel headers for SharedArrayBuffer

Create `_headers` file for proper CORS headers (required for ffmpeg.wasm):

```
/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
```

#### `vercel.json` — Vercel deployment config

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
      ]
    }
  ]
}
```

#### `package.json` — Final build script

```json
{
  "name": "smolvids",
  "version": "1.0.0",
  "description": "Simple, privacy-first video compression in the browser",
  "type": "module",
  "scripts": {
    "dev": "npx serve . --cors -l 3000",
    "build": "rm -rf dist && mkdir -p dist/lib && cp index.html styles.css app.js _headers vercel.json dist/ && cp lib/*.js dist/lib/",
    "preview": "npx serve dist --cors -l 3000"
  },
  "devDependencies": {
    "serve": "^14.2.0"
  }
}
```

#### `README.md` — Final documentation

```markdown
# smolvids

A simple, privacy-first video compression tool that runs 100% in your browser.

**[Try it live →](https://smolvids.example.com)** *(replace with actual URL)*

## Features

- **100% local processing** - Your video never leaves your device
- **No uploads, no servers** - Works completely offline after initial load
- **Simple controls** - Just pick a target size and compress
- **MP4 output** - H.264 video with original audio preserved
- **Free and open source** - MIT license

## How It Works

1. Select a video from your device
2. Choose a target file size (50MB or 100MB)
3. Pick a compression preset (Fast, Balanced, or Smallest)
4. Click Compress and wait
5. Download your compressed video

## Development

### Prerequisites

- Node.js 18+
- Modern browser (Chrome 89+, Firefox 89+, Safari 15.2+, Edge 89+)

### Local Setup

```bash
git clone https://github.com/yourusername/smolvids.git
cd smolvids
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

### Build

```bash
npm run build
```

Static files are output to `dist/`.

## Deployment

Deploy the `dist/` folder to any static host. Important: The host must support setting these headers:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

These headers are required for ffmpeg.wasm to work (it uses SharedArrayBuffer).

### Supported Hosts

- **Vercel** - Headers configured via `vercel.json`
- **Netlify** - Headers configured via `_headers`
- **GitHub Pages** - Requires custom worker (not recommended)
- **Self-hosted** - Configure headers in your web server

## Technical Details

- Uses [ffmpeg.wasm](https://ffmpegwasm.netlify.app/) for video processing
- H.264 encoding with automatic bitrate calculation
- Multi-pass compression with automatic downscaling
- Audio stream copied unchanged (no re-encoding)

## Limitations

- Best for videos under 500MB (can handle up to ~1GB)
- Requires modern browser with SharedArrayBuffer support
- Some audio codecs may not be compatible with MP4 container
- Processing time depends on video length and device performance

## License

MIT
```

### Completion Checks
- [ ] Browser compatibility check shows error on unsupported browsers
- [ ] Large file (>1GB) shows confirmation dialog
- [ ] Page unload cleans up blob URLs
- [ ] ffmpeg load errors show human-readable messages
- [ ] Audio incompatibility shows clear error (if testable)
- [ ] `npm run build` produces working dist folder
- [ ] App works when served from dist folder
- [ ] Headers file properly configured for deployment
- [ ] README contains accurate deployment instructions
- [ ] No console errors during normal operation
- [ ] Mobile/responsive layout works

---

## Summary

| Phase | Key Deliverable | Critical Files |
|-------|-----------------|----------------|
| 1 | Static shell with UI structure | `index.html`, `styles.css`, `app.js` |
| 2 | File selection & metadata | `app.js` (file handling) |
| 3 | Basic ffmpeg compression | `lib/ffmpeg-loader.js`, `lib/compressor.js` |
| 4 | Multi-pass target size logic | `lib/compressor.js` (compressToTargetSize) |
| 5 | Error handling & production build | All files + `_headers`, `vercel.json` |

Each phase builds on the previous. Phase 3 is the highest-risk (ffmpeg.wasm integration) and should be tested thoroughly before proceeding.
