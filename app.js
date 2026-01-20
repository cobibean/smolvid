// app.js - Full implementation for Phase 2

import { loadFFmpeg, writeInputFile, readOutputFile, deleteFile } from './lib/ffmpeg-loader.js';
import {
  compressToTargetSize,
  getOutputFileName
} from './lib/compressor.js';

const state = {
  file: null,
  duration: null,
  audioSize: null,
  targetSizeMB: 25,
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
  dom.themeToggle = document.getElementById('theme-toggle');
  dom.dropZone = document.getElementById('drop-zone');

  // Initialize theme from localStorage or default to dark
  initializeTheme();

  // Check browser compatibility
  if (!checkBrowserSupport()) {
    showError('Your browser doesn\'t support the features needed for video compression. Please use a modern browser like Chrome, Firefox, or Edge.');
    return;
  }

  // Event listeners
  dom.selectBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent bubbling to drop zone
    dom.fileInput.click();
  });
  dom.fileInput.addEventListener('change', handleFileSelect);
  dom.sizeSelect.addEventListener('change', handleSizeChange);
  dom.presetBtns.forEach(btn => {
    btn.addEventListener('click', () => handlePresetChange(btn.dataset.preset));
  });
  dom.compressBtn.addEventListener('click', handleCompress);
  dom.resetBtn.addEventListener('click', resetApp);
  dom.errorResetBtn.addEventListener('click', resetApp);
  dom.themeToggle.addEventListener('click', toggleTheme);

  // Drag and drop support
  setupDragAndDrop();

  window.addEventListener('beforeunload', cleanup);

  console.log('smolvids initialized');
}

// Theme Management
function initializeTheme() {
  const savedTheme = localStorage.getItem('smolvids-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = savedTheme || (prefersDark ? 'dark' : 'light');

  document.documentElement.setAttribute('data-theme', theme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('smolvids-theme', newTheme);
}

// Drag and Drop Support
function setupDragAndDrop() {
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dom.dropZone.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ['dragenter', 'dragover'].forEach(eventName => {
    dom.dropZone.addEventListener(eventName, () => {
      dom.dropZone.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dom.dropZone.addEventListener(eventName, () => {
      dom.dropZone.classList.remove('drag-over');
    });
  });

  dom.dropZone.addEventListener('drop', handleDrop);
  dom.dropZone.addEventListener('click', () => dom.fileInput.click());
}

function handleDrop(e) {
  const dt = e.dataTransfer;
  const files = dt.files;

  if (files.length > 0) {
    dom.fileInput.files = files;
    handleFileSelect({ target: { files: files } });
  }
}

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

function updateProgress(text, percent) {
  dom.progressText.textContent = text;
  dom.progressFill.style.width = `${percent}%`;
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

function checkBrowserSupport() {
  // Check for required APIs
  const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
  const hasFileReader = typeof FileReader !== 'undefined';
  const hasBlob = typeof Blob !== 'undefined';
  const hasURL = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function';

  // Log which feature is missing for debugging
  if (!hasSharedArrayBuffer) {
    console.error('SharedArrayBuffer not available. COOP/COEP headers may be missing.');
    console.error('Ensure server sends: Cross-Origin-Opener-Policy: same-origin');
    console.error('Ensure server sends: Cross-Origin-Embedder-Policy: require-corp');
  }
  if (!hasFileReader) console.error('FileReader not available');
  if (!hasBlob) console.error('Blob not available');
  if (!hasURL) console.error('URL.createObjectURL not available');

  return hasSharedArrayBuffer && hasFileReader && hasBlob && hasURL;
}

function cleanup() {
  // Revoke any object URLs to free memory
  if (dom.downloadLink && dom.downloadLink.href.startsWith('blob:')) {
    URL.revokeObjectURL(dom.downloadLink.href);
  }
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
