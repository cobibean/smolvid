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

/**
 * Compress video with iterative refinement to hit target size
 * @param {FFmpeg} ffmpeg - Loaded ffmpeg instance
 * @param {string} inputFileName - Input file name in vfs
 * @param {object} options - Compression options
 * @param {function} onProgress - Progress callback
 * @returns {Promise<{blob: Blob, warning: string|null}>}
 */
export async function compressToTargetSize(ffmpeg, inputFileName, options, onProgress) {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/49bf7071-3c19-420f-8483-86ceb2bf6a83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'compressor.js:compressToTargetSize:entry',message:'Starting compression',data:{inputFileName,optionsKeys:Object.keys(options||{}),outputFileName:options?.outputFileName,targetSizeMB:options?.targetSizeMB,preset:options?.preset},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
  // #endregion
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

export { PRESETS };
