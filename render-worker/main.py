import math
import os
import shutil
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import cv2
import librosa
import requests
from fastapi import BackgroundTasks, FastAPI, HTTPException
from pydantic import BaseModel, Field
from supabase import create_client

FPS = 30
WIDTH = 1080
HEIGHT = 1920
BUCKET = "videos"

app = FastAPI(title="Story AI Render Worker")


class RenderPayload(BaseModel):
    videoId: str
    userId: str
    scriptText: Optional[str] = ""
    openingLine: Optional[str] = "story"
    tone: Optional[str] = "trustworthy"
    stockUrls: Any = Field(default_factory=list)
    assetUrls: Any = None
    voiceoverUrl: Optional[str] = ""
    platform: Optional[str] = "tiktok"
    durationSeconds: Optional[int] = 30


def run(cmd: list[str]) -> None:
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr[-4000:] or "FFmpeg command failed")


def safe_name(value: str) -> str:
    cleaned = "".join(ch if ch.isalnum() else "-" for ch in value.lower()).strip("-")
    return cleaned[:40] or "story"


def css_escape_ass_path(path: Path) -> str:
    return str(path).replace("\\", "/").replace(":", "\\:")


def download(url: str, dest: Path) -> None:
    with requests.get(url, stream=True, timeout=90) as res:
        res.raise_for_status()
        with dest.open("wb") as f:
            for chunk in res.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    f.write(chunk)


def is_image(path: Path) -> bool:
    return path.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".heic"}


def split_sentences(script: str) -> list[str]:
    normalized = script.replace("! ", "!\n").replace("? ", "?\n").replace(". ", ".\n")
    return [s.strip() for s in normalized.splitlines() if len(s.strip()) > 2]


def detect_audio_duration(audio_path: Path, fallback: float) -> float:
    try:
        y, sr = librosa.load(str(audio_path), sr=None, mono=True)
        return float(librosa.get_duration(y=y, sr=sr))
    except Exception:
        return fallback


def detect_pause_points(audio_path: Path, total_duration: float) -> list[float]:
    try:
        y, sr = librosa.load(str(audio_path), sr=None, mono=True)
        intervals = librosa.effects.split(y, top_db=32, frame_length=2048, hop_length=512)
        pauses: list[float] = []
        previous_end = 0
        for start, end in intervals:
            start_sec = start / sr
            end_sec = end / sr
            if start_sec - (previous_end / sr) >= 0.2:
                pauses.append(round(start_sec, 3))
            previous_end = end
        return [p for p in pauses if 0.5 < p < total_duration - 0.5]
    except Exception:
        return []


def script_timings(script: str, clip_count: int, total_duration: float) -> list[float]:
    if clip_count <= 1:
        return [total_duration]
    sentences = split_sentences(script)
    if not sentences:
        return [total_duration / clip_count] * clip_count

    word_counts = [len(s.split()) for s in sentences]
    buckets = [0 for _ in range(clip_count)]
    for i, words in enumerate(word_counts):
        bucket = min(math.floor((i / len(sentences)) * clip_count), clip_count - 1)
        buckets[bucket] += words

    buckets = [max(w, 1) for w in buckets]
    total = sum(buckets)
    durations = [max(1.0, (w / total) * total_duration) for w in buckets]
    scale = total_duration / sum(durations)
    return [d * scale for d in durations]


def snap_to_pauses(durations: list[float], pauses: list[float], total_duration: float) -> list[float]:
    if not pauses or len(durations) <= 1:
        return durations

    cuts = []
    cursor = 0.0
    for d in durations[:-1]:
        target = cursor + d
        nearby = [p for p in pauses if abs(p - target) <= 0.45]
        cut = min(nearby, key=lambda p: abs(p - target)) if nearby else target
        cut = max(cursor + 1.0, min(cut, total_duration - 1.0))
        cuts.append(cut)
        cursor = cut

    starts = [0.0] + cuts
    ends = cuts + [total_duration]
    return [max(1.0, end - start) for start, end in zip(starts, ends)]


def sentence_is_punchy(script: str, index: int, clip_count: int) -> bool:
    sentences = split_sentences(script)
    if not sentences:
        return False
    sentence_idx = min(math.floor((index / max(clip_count, 1)) * len(sentences)), len(sentences) - 1)
    return len(sentences[sentence_idx].split()) <= 7


def make_ass(script: str, total_duration: float, out_path: Path) -> None:
    words = script.split()
    chunks = [" ".join(words[i:i + 3]) for i in range(0, len(words), 3)] or [script or ""]
    chunk_duration = total_duration / max(len(chunks), 1)

    def ts(seconds: float) -> str:
        h = int(seconds // 3600)
        m = int((seconds % 3600) // 60)
        s = seconds % 60
        return f"{h}:{m:02d}:{s:05.2f}"

    header = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,76,&H00FFFFFF,&H00FFFFFF,&H7A000000,&H99000000,-1,0,0,0,100,100,0,0,1,4,2,2,90,90,220,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = [header]
    for i, chunk in enumerate(chunks):
        start = i * chunk_duration
        end = min(total_duration, start + chunk_duration)
        text = chunk.replace("{", "").replace("}", "")
        lines.append(f"Dialogue: 0,{ts(start)},{ts(end)},Default,,0,0,0,,{text}\n")
    out_path.write_text("".join(lines), encoding="utf-8")


def face_crop_filter(path: Path) -> str:
    try:
        cap = cv2.VideoCapture(str(path))
        ok, frame = cap.read()
        cap.release()
        if not ok or frame is None:
            return f"scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=increase,crop={WIDTH}:{HEIGHT}"
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
        faces = cascade.detectMultiScale(gray, 1.1, 4)
        if len(faces) == 0:
            return f"scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=increase,crop={WIDTH}:{HEIGHT}:(iw-{WIDTH})/2:(ih-{HEIGHT})*0.22"
        x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
        frame_h, frame_w = frame.shape[:2]
        cx = (x + w / 2) / frame_w
        cy = (y + h / 2) / frame_h
        crop_x = f"max(0\\,min(iw-{WIDTH}\\,{cx:.4f}*iw-{WIDTH / 2:.0f}))"
        crop_y = f"max(0\\,min(ih-{HEIGHT}\\,{cy:.4f}*ih-{HEIGHT * 0.38:.0f}))"
        return f"scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=increase,crop={WIDTH}:{HEIGHT}:{crop_x}:{crop_y}"
    except Exception:
        return f"scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=increase,crop={WIDTH}:{HEIGHT}"


def render_clip(src: Path, dest: Path, duration: float, index: int) -> None:
    if is_image(src):
        variants = [
            "zoompan=z='min(zoom+0.0015,1.10)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'",
            "zoompan=z='max(1.10-0.0015*on,1.0)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'",
            "zoompan=z='1.06':d=1:x='(iw-iw/zoom)*on/120':y='ih/2-(ih/zoom/2)'",
            "zoompan=z='1.06':d=1:x='iw/2-(iw/zoom/2)':y='(ih-ih/zoom)*(1-on/120)'",
        ]
        vf = f"scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=increase,crop={WIDTH}:{HEIGHT},{variants[index % 4]}:s={WIDTH}x{HEIGHT}:fps={FPS},format=yuv420p"
        run(["ffmpeg", "-y", "-loop", "1", "-t", str(duration), "-i", str(src), "-vf", vf, "-an", str(dest)])
    else:
        vf = f"{face_crop_filter(src)},fps={FPS},format=yuv420p"
        run(["ffmpeg", "-y", "-stream_loop", "-1", "-t", str(duration), "-i", str(src), "-vf", vf, "-an", str(dest)])


def concat_clips(clips: list[Path], durations: list[float], tone: str, script: str, out_path: Path) -> None:
    if len(clips) == 1:
        shutil.copyfile(clips[0], out_path)
        return

    inputs = []
    for clip in clips:
        inputs.extend(["-i", str(clip)])

    filters = []
    current = "[0:v]"
    offset = durations[0]
    clip_count = len(clips)
    for i in range(1, clip_count):
        transition = 0.05 if sentence_is_punchy(script, i - 1, clip_count) or tone in {"energetic", "funny"} else 0.5
        offset = max(0.1, offset - transition)
        out_label = f"[v{i}]"
        filters.append(f"{current}[{i}:v]xfade=transition=fade:duration={transition}:offset={offset}{out_label}")
        current = out_label
        offset += durations[i]

    run(["ffmpeg", "-y", *inputs, "-filter_complex", ";".join(filters), "-map", current, "-an", "-pix_fmt", "yuv420p", str(out_path)])


def make_background_music(duration: float, out_path: Path) -> Optional[Path]:
    music_url = os.environ.get("BACKGROUND_MUSIC_URL")
    if not music_url:
        return None
    raw = out_path.with_suffix(".music")
    download(music_url, raw)
    looped = out_path.with_name("music_looped.mp3")
    run(["ffmpeg", "-y", "-stream_loop", "-1", "-t", str(duration), "-i", str(raw), "-vn", "-acodec", "libmp3lame", str(looped)])
    return looped


def assemble(payload: RenderPayload, workdir: Path) -> Path:
    urls = payload.stockUrls if isinstance(payload.stockUrls, list) else []
    if not urls:
        raise RuntimeError("No video assets available for export")

    voice_path = workdir / "voiceover.mp3"
    if payload.voiceoverUrl:
        download(payload.voiceoverUrl, voice_path)

    total_duration = detect_audio_duration(voice_path, float(payload.durationSeconds or 30)) if voice_path.exists() else float(payload.durationSeconds or 30)
    pauses = detect_pause_points(voice_path, total_duration) if voice_path.exists() else []
    durations = script_timings(payload.scriptText or "", len(urls), total_duration)
    durations = snap_to_pauses(durations, pauses, total_duration)

    source_paths: list[Path] = []
    for i, url in enumerate(urls):
        ext = Path(str(url).split("?")[0]).suffix or ".mp4"
        path = workdir / f"source_{i}{ext}"
        download(str(url), path)
        source_paths.append(path)

    rendered_clips: list[Path] = []
    for i, src in enumerate(source_paths):
        out = workdir / f"clip_{i}.mp4"
        render_clip(src, out, durations[i], i)
        rendered_clips.append(out)

    video_only = workdir / "video_only.mp4"
    concat_clips(rendered_clips, durations, payload.tone or "trustworthy", payload.scriptText or "", video_only)

    captions = workdir / "captions.ass"
    make_ass(payload.scriptText or "", total_duration, captions)

    captioned = workdir / "captioned.mp4"
    ass_path = css_escape_ass_path(captions)
    run(["ffmpeg", "-y", "-i", str(video_only), "-vf", f"ass='{ass_path}'", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-an", str(captioned)])

    final = workdir / "final.mp4"
    music = make_background_music(total_duration, workdir / "music.mp3")

    if voice_path.exists() and music:
        run([
            "ffmpeg", "-y", "-i", str(captioned), "-i", str(voice_path), "-i", str(music),
            "-filter_complex", "[1:a]volume=1.0[a1];[2:a]volume=0.25[a2];[a1][a2]amix=inputs=2:duration=first[a]",
            "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-shortest", str(final)
        ])
    elif voice_path.exists():
        run(["ffmpeg", "-y", "-i", str(captioned), "-i", str(voice_path), "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-shortest", str(final)])
    else:
        shutil.copyfile(captioned, final)

    return final


def upload_final(video_id: str, user_id: str, final_path: Path) -> str:
    supabase_url = os.environ["SUPABASE_URL"]
    supabase_key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    supabase = create_client(supabase_url, supabase_key)
    storage_path = f"{user_id}/exports/{video_id}.mp4"

    with final_path.open("rb") as f:
        try:
            supabase.storage.from_(BUCKET).remove([storage_path])
        except Exception:
            pass
        supabase.storage.from_(BUCKET).upload(
            storage_path,
            f.read(),
            {"content-type": "video/mp4"},
        )

    public = supabase.storage.from_(BUCKET).get_public_url(storage_path)
    final_url = public if isinstance(public, str) else public.get("publicUrl", "")
    if not final_url:
        raise RuntimeError("Failed to create public export URL")

    supabase.table("videos").update({
        "final_video_url": final_url,
        "render_status": "complete",
        "render_error": None,
        "rendered_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", video_id).eq("user_id", user_id).execute()

    return final_url


def render_job(payload: RenderPayload) -> None:
    supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    with tempfile.TemporaryDirectory(prefix=f"render-{payload.videoId}-") as tmp:
        workdir = Path(tmp)
        try:
            supabase.table("videos").update({"render_status": "rendering", "render_error": None}).eq("id", payload.videoId).eq("user_id", payload.userId).execute()
            final = assemble(payload, workdir)
            upload_final(payload.videoId, payload.userId, final)
        except Exception as exc:
            supabase.table("videos").update({"render_status": "failed", "render_error": "Video export failed. Please try again."}).eq("id", payload.videoId).eq("user_id", payload.userId).execute()
            print(f"[render-worker] failed video={payload.videoId}: {exc}")


@app.get("/health")
def health() -> dict[str, str]:
    return {"ok": "true"}


@app.post("/render")
def render(payload: RenderPayload, background_tasks: BackgroundTasks) -> dict[str, str]:
    if not os.environ.get("SUPABASE_URL") or not os.environ.get("SUPABASE_SERVICE_ROLE_KEY"):
        raise HTTPException(status_code=500, detail="Storage is not configured")

    if os.environ.get("RENDER_SYNC") == "true":
        with tempfile.TemporaryDirectory(prefix=f"render-{payload.videoId}-") as tmp:
            final = assemble(payload, Path(tmp))
            final_url = upload_final(payload.videoId, payload.userId, final)
            return {"finalVideoUrl": final_url}

    background_tasks.add_task(render_job, payload)
    return {"status": "queued"}
