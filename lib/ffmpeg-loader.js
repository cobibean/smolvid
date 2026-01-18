// lib/ffmpeg-loader.js
// Wrapper for ffmpeg.wasm initialization and operations

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg = null;
let loaded = false;

export async function loadFFmpeg(onProgress) {
  if (loaded) return ffmpeg;

  try {
    // Create FFmpeg instance
    ffmpeg = new FFmpeg();

    ffmpeg.on('log', ({ message }) => {
      console.log('[ffmpeg]', message);
      if (message.includes('Discarded')) {
        console.warn('Audio/video stream discarded - may affect output');
      }
    });

    // Load from local vendor files (same-origin, no COEP issues)
    await ffmpeg.load({
      coreURL: '/vendor/ffmpeg/ffmpeg-core.js',
      wasmURL: '/vendor/ffmpeg/ffmpeg-core.wasm',
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
