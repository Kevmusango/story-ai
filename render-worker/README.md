# Story AI Render Worker

A separate FastAPI service for rendering final MP4 exports. This service is intentionally outside the Cloudflare/TanStack app because it needs FFmpeg, OpenCV, and audio analysis libraries.

## Recommended host

Use Railway first. It is the fastest option for this project because it supports Docker, FFmpeg, Python, long-running CPU work, and environment variables without complex infrastructure.

Render.com also works with the included Dockerfile.

## What it does

`POST /render` receives the payload sent by `src/functions/export-video.ts` and:

1. Downloads stock/uploaded clips and the ElevenLabs voiceover.
2. Uses `librosa` to detect natural voiceover pause gaps of ~200ms+.
3. Combines those pauses with sentence-aware timing.
4. Applies Ken Burns motion to still images.
5. Uses OpenCV Haar face detection to bias vertical crop around faces where possible.
6. Uses FFmpeg xfade transitions: fast cuts for punchy/energetic moments, crossfades for slower scenes.
7. Overlays the voiceover.
8. Optionally mixes background music at 25% volume if `BACKGROUND_MUSIC_URL` is set.
9. Burns bold centered captions into the MP4.
10. Exports 1080x1920 MP4.
11. Uploads it to Supabase Storage and updates the `videos` row.

## Environment variables

Required:

```bash
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Optional:

```bash
BACKGROUND_MUSIC_URL=https://...
RENDER_SYNC=false
```

- `BACKGROUND_MUSIC_URL` should be a direct downloadable MP3/WAV URL.
- `RENDER_SYNC=true` makes `/render` wait and return `finalVideoUrl` directly. Leave unset/false in production so requests queue in the background.

## Railway deployment

1. Create a new Railway project.
2. Choose **Deploy from GitHub repo**.
3. Set the root directory to `render-worker`.
4. Railway should detect the Dockerfile.
5. Add environment variables above.
6. Deploy.
7. Copy the deployed URL and set this in the main app environment:

```bash
RENDER_SERVICE_URL=https://your-worker.up.railway.app/render
```

## Health check

```bash
GET /health
```

Returns:

```json
{ "ok": "true" }
```

## Notes

This worker is designed to be robust and safe rather than pretending to be a full CapCut clone immediately. Whisper captions can be added later if you want exact word-level timings. For now captions are generated from the script and paced across the voiceover duration.
