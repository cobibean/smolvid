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
