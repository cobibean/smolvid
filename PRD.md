# PRD — smolvids (Simple Video Compression Tool)

## 1) Summary

**smolvids** is a super simple, privacy-first video compression **web app** that runs **100% locally in the user’s browser** using **ffmpeg.wasm**.
Users select a video from their computer, pick a **maximum output size** (preset dropdown), choose a compression preset (**Fast / Balanced / Smallest**), and export a new **MP4 (H.264)** file that aims to fit the target size.

No accounts. No uploads. No backend. No storage. No bloat.

---

## 2) Goals

### Primary goal

* Let users **shrink a video file size** without uploading it anywhere.

### Product goals

* **Runs entirely on-device** (local-only processing)
* **Simple mental model**: “Make this video smaller.”
* **One important number**: Max file size (MB)
* **Export an MP4 (H.264)** that aims to meet the size target
* Keep the tool **lean and calm**, no settings overload
* **Open source** and easy to self-host

---

## 3) Non-goals (explicitly out of scope)

smolvids is **not**:

* A video editor / timeline editor
* A cloud media pipeline
* A social export/share tool
* A preset marketplace
* A professional encoding lab UI
* A watermarking tool
* An account/login product
* A database-backed product

---

## 4) Target Users

### Primary users

* Normal people trying to send/upload a video and getting blocked by file size limits
* Anyone compressing:

  * phone recordings
  * screen recordings
  * short clips for messaging/email

### Typical clip size range

* Best for videos **under ~500MB**
* Can handle up to **~1GB** depending on device/browser capacity

---

## 5) Core User Flow (must match product description)

1. User opens the website (cheap domain, static hosted)
2. User clicks **Select Video**
3. App displays basic info:

   * file name
   * current size
   * duration (optional)
4. User sets a target:

   * **Max file size (MB)** (preset dropdown)
5. User selects a preset:

   * **Fast**
   * **Balanced** (default)
   * **Smallest**
6. User clicks **Compress**
7. App outputs a new downloadable file:

   * `originalname_compressed.mp4`
8. User downloads the compressed file

---

## 6) Key Behaviors / Hard Constraints

### Local processing + privacy-first

* Compression runs **locally** using **ffmpeg.wasm**
* **No uploads**
* **No backend**
* **No file storage**
* App should not send the video anywhere (only download/export locally)

### Output requirements

* Output file format: **MP4**
* Video codec: **H.264**
* Audio: **kept as-is** (no audio compression changes)

### Target size behavior

* Tool **aims** to hit the target size
* It may sacrifice quality (bitrate + resolution downscaling) to try to reach target
* If target cannot be reached due to audio alone (or audio constraint):

  * The app should **still finish**
  * It should **show a message** explaining target is unreachable due to audio size
  * Output may be **larger than the selected max size**

---

## 7) Target Size Selection (as confirmed)

* Target max file size is selected via **dropdown presets only**
* No freeform “custom MB” input in v1

**Minimum required presets (based on product description examples):**

* 50MB
* 100MB

> (As an open-source tool, adding more preset sizes later is trivial, but not required for v1.)

---

## 8) Presets (Fast / Balanced / Smallest)

Presets should be simple “intent modes” with no extra knobs exposed to the user.

### Fast (quickest)

* Prioritize speed over quality
* Use simpler encoding settings
* Will compress aggressively if needed to hit size target

### Balanced (default)

* Best tradeoff of speed and quality
* Intended default for most users

### Smallest (slowest, highest compression)

* Prioritize smallest output
* Slower encoding behavior allowed
* Most aggressive compression approach

---

## 9) Compression Logic (simple + automatic)

Users should never think about bitrates/codecs.

### Inputs used for calculation

* Selected target size in MB (from dropdown)
* Video duration (if duration is available / extractable)
* Original file size (for display + sanity checks)
* Audio stream size (estimated or measured)

### Required behavior

The app automatically:

* Calculates the **video bitrate required** to hit the selected max size based on duration
* Uses a size-targeted strategy (2-pass style behavior *if supported*)
* If aggressive compression is required, the job should still complete rather than “failing” due to strict quality expectations

### Important constraint: audio unchanged

Since audio must remain as-is:

* The app must allocate part of the target size for audio, and compress **video** to fit the remainder.

---

## 10) Functional Requirements

### FR1 — Load app (static web)

* User can open smolvids via a URL
* App loads without any authentication or account system

**Acceptance Criteria**

* Site loads and is usable in modern desktop browsers
* No login prompt, no backend dependency required for core use

---

### FR2 — Select a local video file

* User clicks **Select Video**
* Browser file picker opens
* User selects a local video file

**Acceptance Criteria**

* User can pick a file from their device
* App stores the file in memory for processing (no upload)
* If a user cancels selection, app stays in idle state

---

### FR3 — Display file info

After selection, display:

* File name
* Current size (MB)
* Duration (**optional**)

**Acceptance Criteria**

* File name and file size always display
* Duration displays if it can be derived (and failure to detect duration does not block compression)

---

### FR4 — Target max size selection (dropdown only)

* User selects max file size (MB) from dropdown presets
* Default selection can be 50MB (or 100MB) — not critical, but must exist

**Acceptance Criteria**

* Dropdown exists
* Only preset sizes are available
* Selected target is used for compression

---

### FR5 — Preset selection

User chooses preset:

* Fast / Balanced / Smallest

**Acceptance Criteria**

* Balanced is selected by default
* Switching presets affects compression approach (speed vs final size)

---

### FR6 — Compress video locally

* Clicking **Compress** starts local encoding via ffmpeg.wasm
* The app should not require the user to know anything about encoding settings

**Acceptance Criteria**

* Compression runs fully in-browser
* App remains usable and does not reload
* Errors are handled gracefully with human-readable messaging

---

### FR7 — Output downloadable compressed file

* Result is always an MP4 (H.264)
* Download filename is:

  * `originalname_compressed.mp4`

**Acceptance Criteria**

* Download becomes available after completion
* File name format matches spec exactly
* Download works without an account or upload

---

### FR8 — “Target not reachable due to audio size” handling (confirmed behavior)

If the app cannot reach the target max size because audio is unchanged:

* Still output a file
* Display a clear message explaining why target wasn’t reachable
* The output may exceed target size

**Acceptance Criteria**

* Compression completes
* User sees a message like:

  * “Couldn’t hit 50MB because the audio track alone is too large (audio is kept unchanged). Output is as small as possible.”
* Download still works

---

## 11) UI/UX Requirements

### UI Principles

* Minimal, calm, purpose-built
* No settings overload
* One job: **Make this video smaller**
* One number that matters: **Max file size (MB)**

### Required UI sections (minimum)

1. **Header**

   * “smolvids”
   * A short privacy message is acceptable if minimal (ex: “Runs locally. No uploads.”)

2. **File selection panel**

   * “Select Video” button
   * File info display area after selection

3. **Controls**

   * Max file size dropdown
   * Preset selector (Fast / Balanced / Smallest)
   * “Compress” button

4. **Compression progress state**

   * Must show “working” state (at least basic status)
   * Prevent double-click repeated jobs

5. **Result panel**

   * Download button/link
   * Show output size (nice-to-have but practical)
   * Warning message if target wasn’t reachable

---

## 12) Error States & Edge Cases

### Unsupported or weird input file

If ffmpeg.wasm fails to read the file:

* Show a clean error:

  * “This file couldn’t be processed in your browser.”
* Do not crash the page

### Duration missing/unreadable

* Still allow compression
* Use best available approach (even if estimate is rough)
* Communicate minimally (no scary dev logs)

### Very large files (near ~1GB)

* Compression may be slow / memory-heavy
* App should:

  * start job if possible
  * fail gracefully if browser runs out of memory

### Audio codec incompatibility with MP4 container (rare)

Given:

* output is always MP4
* audio must be unchanged

Some inputs may have audio that cannot be copied into MP4 without re-encoding.

* If that happens, show a clear failure message
* This is acceptable as a limitation because the product targets “typical clips”

---

## 13) Non-Functional Requirements

### NFR1 — Privacy

* Video never leaves the device
* No file upload endpoints
* No server-side processing

### NFR2 — Performance (reasonable expectations)

* Designed for typical clips, best under 500MB
* Should still attempt up to ~1GB depending on device

### NFR3 — Reliability / completion-first

* App should prefer “complete the job” over strict perfection
* If target requires extreme compression:

  * continue and output something usable

### NFR4 — Compatibility

* Works on modern Chromium-based browsers + modern Firefox/Safari where ffmpeg.wasm runs reliably
* Must function as a static site (cheap hosting)

### NFR5 — Self-hosting friendliness

* No backend required
* Build should produce static assets
* Include basic README instructions to run locally + deploy

---

## 14) Compression Strategy (implementation-level behavior, still within scope)

### Step A — Extract metadata (best-effort)

* Duration (if possible)
* Audio stream info (best-effort)
* If extraction fails, compression still proceeds

### Step B — Compute target video size budget

* `target_total_bytes = targetMB * 1024 * 1024`
* Estimate or measure audio bytes (since audio is unchanged)
* `target_video_bytes = target_total_bytes - audio_bytes`

If `target_video_bytes <= 0`:

* Target is unreachable due to audio constraint
* Still compress video as much as possible
* Display warning after completion

### Step C — Compute target video bitrate

If duration is known:

* `target_video_bitrate = (target_video_bytes * 8) / duration_seconds`

### Step D — Encode attempt + “hit target” behavior

* Use preset-specific settings (Fast/Balanced/Smallest)
* If output exceeds target:

  * reduce bitrate and/or downscale resolution
  * retry in a limited loop until:

    * target achieved, OR
    * minimum viable quality floor reached (still completes)

### Downscaling policy (confirmed allowed)

* If needed, apply automatic downscale steps such as:

  * 1080p → 720p → 480p (best-effort)
* Keep it automatic; no UI toggles

---

## 15) Requirements Traceability (Product Description → PRD)

* “Runs 100% locally” → ffmpeg.wasm required, no backend
* “No accounts / no DB” → explicitly excluded
* “Max file size + preset” → primary control set
* “Always MP4 (H.264)” → fixed output format
* “Audio kept as-is” → audio unchanged behavior + edge-case messaging
* “Hit target no matter what” → completion-first strategy + aggressive compression allowed
* “Open source + self-host” → static deployment + simple packaging

---

## 16) Launch Criteria (Definition of Done)

smolvids v1 is “done” when:

✅ A user can:

* Open the site
* Select a local video
* Pick max size (dropdown)
* Pick preset
* Compress locally
* Download `originalname_compressed.mp4`

✅ The app:

* Never uploads the file
* Outputs MP4 (H.264)
* Leaves audio unchanged
* Completes even under aggressive compression needs
* Warns clearly when target size is unreachable due to audio