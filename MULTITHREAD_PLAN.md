# Multi-threaded ffmpeg.wasm Implementation Plan

## Overview

Upgrade smolvids from single-threaded `@ffmpeg/core` to multi-threaded `@ffmpeg/core-mt` for 2-4x faster video compression.

## Current State

- Using `@ffmpeg/core@0.12.6` (single-threaded)
- Files located in `/vendor/ffmpeg/`
- COEP/COOP headers already configured (required for SharedArrayBuffer)

## Target State

- Using `@ffmpeg/core-mt@0.12.6` (multi-threaded)
- Leverage multiple CPU cores for parallel encoding
- No changes to user-facing functionality

---

## Implementation Steps

### Step 1: Download Multi-threaded Core Files

Replace the single-threaded core files with multi-threaded versions.

```bash
cd vendor/ffmpeg

# Remove old single-threaded core files
rm ffmpeg-core.js ffmpeg-core.wasm

# Download multi-threaded core files
curl -L -o ffmpeg-core.js "https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm/ffmpeg-core.js"
curl -L -o ffmpeg-core.wasm "https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm/ffmpeg-core.wasm"
curl -L -o ffmpeg-core.worker.js "https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm/ffmpeg-core.worker.js"
```

**New file required:** `ffmpeg-core.worker.js` - this is the threading worker used by the multi-threaded build.

### Step 2: Update ffmpeg-loader.js

Modify `/lib/ffmpeg-loader.js` to load the worker file:

```javascript
// Load from local vendor files (same-origin, no COEP issues)
await ffmpeg.load({
  coreURL: '/vendor/ffmpeg/ffmpeg-core.js',
  wasmURL: '/vendor/ffmpeg/ffmpeg-core.wasm',
  workerURL: '/vendor/ffmpeg/ffmpeg-core.worker.js',  // ADD THIS LINE
});
```

### Step 3: Update Build Script

Modify `package.json` build script to include the new worker file:

The existing build script already copies all files from `vendor/ffmpeg/*`, so no change needed if using glob. Verify the worker file is included in dist after build.

### Step 4: Verify Headers

The multi-threaded version requires these headers (already configured):

- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

Verify in `serve.json` and `vercel.json` - both should already have these.

### Step 5: Test

1. Run `npm run dev`
2. Open browser console
3. Look for `[ffmpeg]` logs showing thread initialization
4. Compare compression speed with same video file
5. Verify output quality is unchanged

---

## Files to Modify

| File | Change |
|------|--------|
| `vendor/ffmpeg/ffmpeg-core.js` | Replace with multi-threaded version |
| `vendor/ffmpeg/ffmpeg-core.wasm` | Replace with multi-threaded version |
| `vendor/ffmpeg/ffmpeg-core.worker.js` | **New file** - threading worker |
| `lib/ffmpeg-loader.js` | Add `workerURL` to load config |

## Expected Outcome

- 2-4x faster compression on multi-core devices
- Same output quality and file sizes
- No UI changes required
- Console logs should show multi-threaded activity

## Rollback

If issues occur, revert to single-threaded by:
1. Downloading original `@ffmpeg/core@0.12.6` files (without `-mt`)
2. Removing `workerURL` from ffmpeg-loader.js
3. Deleting `ffmpeg-core.worker.js`

## Verification Checklist

- [ ] `ffmpeg-core.worker.js` exists in `/vendor/ffmpeg/`
- [ ] `ffmpeg-loader.js` includes `workerURL` in load config
- [ ] No console errors on page load
- [ ] Compression starts successfully
- [ ] Speed improvement observed (check `speed=` in console logs)
- [ ] Output file plays correctly
- [ ] Vercel deployment works with new files
