# CLAUDE.md - Project Context for AI Agents

## Project Overview

**smolvids** is a privacy-first, browser-based video compression tool. It runs 100% locally using ffmpeg.wasm - no uploads, no backend, no accounts.

**Live site:** https://video-compressor-lac.vercel.app

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JavaScript (no framework)
- **Video processing:** ffmpeg.wasm (currently single-threaded, v0.12.6)
- **Hosting:** Vercel (static deployment)
- **Dev server:** `serve` with custom headers via `serve.json`

## Project Structure

```
/
├── index.html          # Main HTML with importmap for ES modules
├── styles.css          # Minimal, calm UI styling
├── app.js              # Main application logic, state management, UI
├── lib/
│   ├── ffmpeg-loader.js    # FFmpeg initialization and file operations
│   └── compressor.js       # Compression logic, bitrate calculation, presets
├── vendor/
│   ├── ffmpeg/             # @ffmpeg/ffmpeg + @ffmpeg/core files (local)
│   └── ffmpeg-util/        # @ffmpeg/util files (local)
├── serve.json          # Dev server COEP/COOP headers
├── vercel.json         # Production headers + deployment config
├── _headers            # Netlify headers (if deploying there)
├── package.json        # Dev dependencies (serve only)
├── PRD.md              # Product requirements document
├── IMPLEMENTATION_PLAN.md  # Original 5-phase build plan
└── MULTITHREAD_PLAN.md     # Plan for multi-threaded upgrade
```

## Key Technical Details

### Why vendor/ instead of CDN?

ffmpeg.wasm files are served locally from `/vendor/` because:
1. COEP (`require-corp`) blocks cross-origin workers from CDNs
2. Local files are same-origin, avoiding CORS/COEP issues
3. The importmap in `index.html` maps `@ffmpeg/ffmpeg` and `@ffmpeg/util` to local paths

### Required Headers

SharedArrayBuffer (needed by ffmpeg.wasm) requires these headers:
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Configured in:
- `serve.json` (local dev)
- `vercel.json` (production)

### Compression Flow

1. User selects video → metadata extracted via HTML5 `<video>` element
2. User picks target size (25/40/50/100 MB) and preset (Fast/Balanced/Smallest)
3. `compressor.js` calculates target bitrate based on duration and audio size
4. ffmpeg.wasm encodes to H.264 MP4, audio copied unchanged
5. Multi-pass with automatic downscaling if target unreachable
6. Output blob downloaded as `{filename}_compressed.mp4`

## Commands

```bash
npm run dev      # Start dev server on localhost:3000
npm run build    # Copy files to dist/
npm run preview  # Serve dist/ folder
npx vercel --prod  # Deploy to Vercel
```

## Current Limitations

- **Single-threaded:** Using `@ffmpeg/core` (not `-mt`), compression is slow (~0.15x realtime)
- **Browser memory:** Large files (>500MB) may cause issues
- **No progress bar:** Progress only visible in console logs

## Planned Improvements

See `MULTITHREAD_PLAN.md` for upgrading to `@ffmpeg/core-mt` (2-4x faster).

## Development Notes

- No build step - all files served directly
- ES modules via importmap (no bundler)
- State managed in `app.js` via simple `state` object
- DOM cached in `dom` object at init

## Testing

Manual testing only. Test with:
1. Small video (<50MB) - should complete quickly
2. Large video (200-500MB) - tests memory handling
3. Different presets - verify speed/quality tradeoffs
4. Edge cases: very short clips, audio-heavy files

## Don't

- Add a build system/bundler (keep it simple)
- Upload videos anywhere (privacy is core feature)
- Add accounts/auth (explicitly out of scope per PRD)
- Modify audio (must remain unchanged per PRD)
