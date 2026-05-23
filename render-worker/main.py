import math
import os
import random
import shutil
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import requests
try:
    import cv2 as _cv2
except Exception:
    _cv2 = None  # type: ignore
try:
    import librosa as _librosa
except Exception:
    _librosa = None  # type: ignore
from fastapi import BackgroundTasks, FastAPI, HTTPException
from pydantic import BaseModel, Field
from supabase import create_client

FPS = 30
BUCKET = "media"
XFADE_DUR = 0.3  # crossfade duration between clips (seconds)

FORMATS = {
    "portrait":  (720, 1280),
    "landscape": (1280, 720),
    "square":    (720, 720),
}


def get_dimensions(fmt: str) -> tuple[int, int]:
    return FORMATS.get(fmt or "portrait", (720, 1280))

app = FastAPI(title="Story AI Render Worker")


class RenderPayload(BaseModel):
    video_id: str
    user_id: str
    script_text: Optional[str] = ""
    clip_urls: Any = Field(default_factory=list)
    voiceover_url: Optional[str] = ""
    tone: Optional[str] = "trustworthy"
    duration_seconds: Optional[int] = 30
    bucket: Optional[str] = "media"
    format: Optional[str] = "portrait"         # portrait | landscape | square
    use_original_audio: Optional[bool] = False  # keep source video audio
    caption_style: Optional[str] = "tiktok"     # tiktok | business | luxury
    music_style: Optional[str]   = "auto"       # auto | acoustic | upbeat | cinematic | none


def run(cmd: list[str]) -> None:
    if cmd and cmd[0] == "ffmpeg":
        cmd = ["ffmpeg", "-threads", "1"] + cmd[1:]
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if proc.returncode != 0:
        err = proc.stderr[-4000:] or "FFmpeg command failed"
        print(f"[ffmpeg-error] rc={proc.returncode} tail={proc.stderr[-300:]}")
        raise RuntimeError(err)


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
    if _librosa is None:
        return fallback
    try:
        y, sr = _librosa.load(str(audio_path), sr=None, mono=True)
        return float(_librosa.get_duration(y=y, sr=sr))
    except Exception:
        return fallback


def detect_pause_points(audio_path: Path, total_duration: float) -> list[float]:
    if _librosa is None:
        return []
    try:
        y, sr = _librosa.load(str(audio_path), sr=None, mono=True)
        intervals = _librosa.effects.split(y, top_db=32, frame_length=2048, hop_length=512)
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


def extract_hook(script: str) -> str:
    sentences = split_sentences(script)
    first = sentences[0] if sentences else script.strip()
    return " ".join(first.split()[:8])


def _ass_ts(s: float) -> str:
    h = int(s // 3600)
    m = int((s % 3600) // 60)
    sec = s % 60
    return f"{h}:{m:02d}:{sec:05.2f}"


def _hook_event(hook: str, total_dur: float) -> str:
    """Big hook text pop-in at top of frame for first 3 seconds."""
    if not hook or total_dur < 4.5:
        return ""
    words = hook.upper().split()
    lines: list[str] = []
    cur: list[str] = []
    for w in words:
        cur.append(w)
        if len(" ".join(cur)) > 14 and len(cur) > 1:
            lines.append(" ".join(cur[:-1]))
            cur = [w]
    if cur:
        lines.append(" ".join(cur))
    wrapped = "\\N".join(lines[:3])
    return (
        f"Dialogue: 1,{_ass_ts(0)},{_ass_ts(3.0)},Hook,,0,0,0,,"
        f"{{\\an8\\fscx65\\fscy65\\alpha&HFF&"
        f"\\t(0,350,\\fscx100\\fscy100\\alpha&H00&)"
        f"\\t(2600,3000,\\alpha&HFF&)}}"
        f"{wrapped}\n"
    )


_ASS_INFO   = "[Script Info]\nScriptType: v4.00+\nPlayResX: 720\nPlayResY: 1280\n\n"
_ASS_SFMT   = (
    "[V4+ Styles]\n"
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, "
    "Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, "
    "Alignment, MarginL, MarginR, MarginV, Encoding\n"
)
_ASS_HOOK_S = "Style: Hook,Liberation Sans,110,&H00FFFFFF,&H00FFFFFF,&H00000000,&H99000000,-1,0,0,0,100,100,3,0,1,6,3,8,60,60,120,1\n"
_ASS_EVENTS = "\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"


def make_ass(script: str, total_duration: float, out_path: Path, style: str = "tiktok") -> None:
    hook = extract_hook(script)
    if style == "business":
        _make_ass_business(script, total_duration, out_path, hook)
    elif style == "luxury":
        _make_ass_luxury(script, total_duration, out_path, hook)
    else:
        _make_ass_tiktok(script, total_duration, out_path, hook)


def _make_ass_tiktok(script: str, total_duration: float, out_path: Path, hook: str = "") -> None:
    """Word-by-word: current word brand-yellow bold, others dimmed."""
    words = [w for w in script.split() if w] or [script.strip() or "..."]
    BRAND  = "&H0000FFC8&"
    WHITE  = "&H00FFFFFF&"
    SHADOW = "&H99000000&"
    CHUNK  = 2
    chunks: list[list[str]] = [words[i:i + CHUNK] for i in range(0, len(words), CHUNK)]
    chunk_dur = total_duration / max(len(chunks), 1)
    header = (
        _ASS_INFO + _ASS_SFMT
        + f"Style: Default,Liberation Sans,68,{WHITE},{WHITE},&H00000000,{SHADOW},-1,0,0,0,100,100,1,0,1,4,2,2,60,60,180,1\n"
        + _ASS_HOOK_S + _ASS_EVENTS
    )
    lines = [header, _hook_event(hook, total_duration)]
    for i, chunk in enumerate(chunks):
        chunk_start = i * chunk_dur
        word_dur = chunk_dur / max(len(chunk), 1)
        for j, word in enumerate(chunk):
            w_start = chunk_start + j * word_dur
            w_end   = chunk_start + (j + 1) * word_dur
            parts = []
            for k, w in enumerate(chunk):
                clean = w.replace("{", "").replace("}", "")
                if k == j:
                    parts.append(f"{{\\c{BRAND}\\b1\\fscx110\\fscy110}}{clean}{{\\r}}")
                else:
                    parts.append(f"{{\\alpha&H60&}}{clean}{{\\r}}")
            lines.append(f"Dialogue: 0,{_ass_ts(w_start)},{_ass_ts(w_end)},Default,,0,0,0,,{' '.join(parts)}\n")
    out_path.write_text("".join(lines), encoding="utf-8")


def _make_ass_business(script: str, total_duration: float, out_path: Path, hook: str = "") -> None:
    """Sentence-by-sentence, clean white text, subtle fade-in."""
    sentences = split_sentences(script) or [script.strip() or "..."]
    sent_dur  = total_duration / max(len(sentences), 1)
    header = (
        _ASS_INFO + _ASS_SFMT
        + "Style: Default,Liberation Sans,52,&H00FFFFFF,&H00FFFFFF,&H00000000,&H88000000,0,0,0,0,100,100,1,0,1,3,2,2,80,80,150,1\n"
        + _ASS_HOOK_S + _ASS_EVENTS
    )
    lines = [header, _hook_event(hook, total_duration)]
    for i, sent in enumerate(sentences):
        start = i * sent_dur
        end   = min(total_duration, start + sent_dur)
        clean = sent.replace("{", "").replace("}", "")
        lines.append(
            f"Dialogue: 0,{_ass_ts(start)},{_ass_ts(end)},Default,,0,0,0,,"
            f"{{\\alpha&HFF&\\t(0,200,\\alpha&H00&)}}{clean}\n"
        )
    out_path.write_text("".join(lines), encoding="utf-8")


def _make_ass_luxury(script: str, total_duration: float, out_path: Path, hook: str = "") -> None:
    """One word at a time, uppercase, center-screen, elegant fade in/out."""
    words = [w for w in script.split() if w] or [script.strip() or "..."]
    word_dur = total_duration / max(len(words), 1)
    fade_ms  = max(100, min(200, int(word_dur * 1000 * 0.25)))
    header = (
        _ASS_INFO + _ASS_SFMT
        + "Style: Default,Liberation Sans,60,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,8,0,1,2,1,5,80,80,200,1\n"
        + _ASS_HOOK_S + _ASS_EVENTS
    )
    lines = [header, _hook_event(hook, total_duration)]
    for i, word in enumerate(words):
        start  = i * word_dur
        end    = start + word_dur
        clean  = word.replace("{", "").replace("}", "").upper()
        out_ms = int(word_dur * 1000)
        lines.append(
            f"Dialogue: 0,{_ass_ts(start)},{_ass_ts(end)},Default,,0,0,0,,"
            f"{{\\alpha&HFF&\\t(0,{fade_ms},\\alpha&H00&)\\t({out_ms - fade_ms},{out_ms},\\alpha&HFF&)}}{clean}\n"
        )
    out_path.write_text("".join(lines), encoding="utf-8")


def face_crop_filter(path: Path, width: int, height: int) -> str:
    if _cv2 is None:
        return f"scale={width}:{height}:force_original_aspect_ratio=increase,crop={width}:{height}"
    try:
        cap = _cv2.VideoCapture(str(path))
        ok, frame = cap.read()
        cap.release()
        if not ok or frame is None:
            return f"scale={width}:{height}:force_original_aspect_ratio=increase,crop={width}:{height}"
        gray = _cv2.cvtColor(frame, _cv2.COLOR_BGR2GRAY)
        cascade = _cv2.CascadeClassifier(_cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
        faces = cascade.detectMultiScale(gray, 1.1, 4)
        if len(faces) == 0:
            return f"scale={width}:{height}:force_original_aspect_ratio=increase,crop={width}:{height}:(iw-{width})/2:(ih-{height})*0.22"
        x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
        frame_h, frame_w = frame.shape[:2]
        cx = (x + w / 2) / frame_w
        cy = (y + h / 2) / frame_h
        crop_x = f"max(0\\,min(iw-{width}\\,{cx:.4f}*iw-{width / 2:.0f}))"
        crop_y = f"max(0\\,min(ih-{height}\\,{cy:.4f}*ih-{height * 0.38:.0f}))"
        return f"scale={width}:{height}:force_original_aspect_ratio=increase,crop={width}:{height}:{crop_x}:{crop_y}"
    except Exception:
        return f"scale={width}:{height}:force_original_aspect_ratio=increase,crop={width}:{height}"


def render_clip(src: Path, dest: Path, duration: float, index: int,
                width: int = 1080, height: int = 1920, keep_audio: bool = False) -> None:
    if is_image(src):
        big_w = int(width * 1.10)
        big_h = int(height * 1.10)
        d = max(duration, 0.1)
        # Real Ken Burns: scale eval=frame zooms per-frame (no buffering) + time-varying crop pans
        variants = [
            (f"iw*(1+0.05*t/{d:.3f})",       f"ih*(1+0.05*t/{d:.3f})",       f"(iw-{width})*t/{d:.3f}",         f"(ih-{height})/2"),
            (f"iw*(1.05-0.05*t/{d:.3f})",     f"ih*(1.05-0.05*t/{d:.3f})",     f"(iw-{width})*(1-t/{d:.3f})",     f"(ih-{height})/2"),
            (f"iw*(1+0.05*t/{d:.3f})",       f"ih*(1+0.05*t/{d:.3f})",       f"(iw-{width})/2",                 f"(ih-{height})*t/{d:.3f}"),
            (f"iw*(1+0.05*t/{d:.3f})",       f"ih*(1+0.05*t/{d:.3f})",       f"(iw-{width})*(1-t/{d:.3f})",     f"(ih-{height})*(1-t/{d:.3f})"),
        ]
        sw, sh, cx, cy = variants[index % 4]
        vf = (
            f"scale={big_w}:{big_h}:force_original_aspect_ratio=increase,"
            f"scale=w='{sw}':h='{sh}':eval=frame:flags=bilinear,"
            f"crop={width}:{height}:x='{cx}':y='{cy}',"
            f"fps={FPS},setsar=1,format=yuv420p"
        )
        run(["ffmpeg", "-y", "-loop", "1", "-t", str(duration), "-i", str(src), "-vf", vf,
             "-c:v", "libx264", "-preset", "ultrafast", "-an", "-pix_fmt", "yuv420p", str(dest)])
    else:
        vf = f"{face_crop_filter(src, width, height)},fps={FPS},setsar=1,format=yuv420p"
        if keep_audio:
            # Preserve original audio — no duration cap, let clip run naturally
            run(["ffmpeg", "-y", "-i", str(src), "-vf", vf,
                 "-c:v", "libx264", "-preset", "ultrafast", "-c:a", "aac", "-pix_fmt", "yuv420p", str(dest)])
        else:
            run(["ffmpeg", "-y", "-stream_loop", "-1", "-t", str(duration), "-i", str(src),
                 "-vf", vf, "-c:v", "libx264", "-preset", "ultrafast", "-an", "-pix_fmt", "yuv420p", str(dest)])


def concat_clips_with_audio(clips: list[Path], out_path: Path) -> None:
    """Concatenate clips preserving their original audio streams."""
    if len(clips) == 1:
        shutil.copyfile(clips[0], out_path)
        return
    concat_file = out_path.with_name("concat_list.txt")
    concat_file.write_text("\n".join(f"file '{c}'" for c in clips), encoding="utf-8")
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat_file),
         "-c:v", "libx264", "-preset", "ultrafast", "-c:a", "aac", "-pix_fmt", "yuv420p", str(out_path)])


def concat_clips(clips: list[Path], durations: list[float], tone: str, script: str, out_path: Path) -> None:
    if len(clips) == 1:
        shutil.copyfile(clips[0], out_path)
        return

    FADE = XFADE_DUR  # seconds crossfade overlap
    current = clips[0]
    cur_dur = durations[0]

    for i in range(1, len(clips)):
        is_last = (i == len(clips) - 1)
        merged = out_path if is_last else out_path.with_name(f"merge_{i}.mp4")
        offset = max(0.5, cur_dur - FADE)
        run([
            "ffmpeg", "-y", "-i", str(current), "-i", str(clips[i]),
            "-filter_complex",
            f"[0:v][1:v]xfade=transition=fade:duration={FADE}:offset={offset:.3f}[v]",
            "-map", "[v]", "-an",
            "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
            str(merged)
        ])
        current = merged
        cur_dur = cur_dur + durations[i] - FADE


TONE_QUERIES: dict[str, str] = {
    "trustworthy": "corporate",
    "energetic":   "upbeat energetic",
    "funny":       "fun happy",
    "premium":     "cinematic",
    "calm":        "calm relaxing",
    "warm":        "acoustic inspirational",
}
MUSIC_STYLE_QUERIES: dict[str, str] = {
    "acoustic":  "acoustic guitar warm inspirational",
    "upbeat":    "upbeat energetic pop fun",
    "cinematic": "cinematic dramatic orchestral",
}


def pick_music(tone_or_style: str) -> str:
    api_key = os.environ.get("PIXABAY_API_KEY", "")
    if api_key:
        query = (
            MUSIC_STYLE_QUERIES.get(tone_or_style)
            or TONE_QUERIES.get(tone_or_style, "corporate background music")
        )
        try:
            res = requests.get(
                "https://pixabay.com/api/",
                params={
                    "key": api_key,
                    "q": query,
                    "media_type": "music",
                    "per_page": 20,
                    "page": random.randint(1, 3),
                },
                timeout=10,
            )
            hits = res.json().get("hits", [])
            if hits:
                track = random.choice(hits)
                url = track.get("audio", track.get("url", ""))
                if url:
                    print(f"[music] Pixabay track: {url}")
                    return url
        except Exception as exc:
            print(f"[music] Pixabay fetch failed: {exc}")
    fallback = os.environ.get("BACKGROUND_MUSIC_URL", "")
    if fallback:
        print(f"[music] fallback: {fallback}")
    return fallback


def make_background_music(duration: float, out_path: Path, music_url: str) -> Optional[Path]:
    if not music_url:
        return None
    try:
        raw = out_path.with_suffix(".music")
        download(music_url, raw)
        if raw.stat().st_size < 1024:
            print("[music] downloaded file too small, skipping")
            return None
        looped = out_path.with_name("music_looped.mp3")
        run(["ffmpeg", "-y", "-stream_loop", "-1", "-t", str(duration), "-i", str(raw), "-vn", "-acodec", "libmp3lame", str(looped)])
        return looped
    except Exception as e:
        print(f"[music] failed to prepare music, skipping: {e}")
        return None


def assemble(payload: RenderPayload, workdir: Path) -> Path:
    urls = payload.clip_urls if isinstance(payload.clip_urls, list) else []
    if not urls:
        raise RuntimeError("No media assets provided for rendering")

    width, height = get_dimensions(payload.format)
    keep_audio = payload.use_original_audio or False

    # Download source files
    source_paths: list[Path] = []
    for i, url in enumerate(urls):
        ext = Path(str(url).split("?")[0]).suffix or ".mp4"
        path = workdir / f"source_{i}{ext}"
        download(str(url), path)
        source_paths.append(path)

    if keep_audio:
        # ── Original audio path ─────────────────────────────────
        # Render clips preserving audio, use natural durations
        rendered_clips: list[Path] = []
        for i, src in enumerate(source_paths):
            out = workdir / f"clip_{i}.mp4"
            render_clip(src, out, 0, i, width, height, keep_audio=True)
            rendered_clips.append(out)

        video_with_audio = workdir / "video_only.mp4"
        concat_clips_with_audio(rendered_clips, video_with_audio)

        # Estimate duration from file sizes / fallback
        total_duration = float(payload.duration_seconds or 30)
        captions = workdir / "captions.ass"
        make_ass(payload.script_text or "", total_duration, captions, payload.caption_style or "tiktok")

        final = workdir / "final.mp4"
        ass_path = css_escape_ass_path(captions)
        run(["ffmpeg", "-y", "-i", str(video_with_audio),
             "-vf", f"ass='{ass_path}'",
             "-c:v", "libx264", "-c:a", "aac", "-pix_fmt", "yuv420p", str(final)])
        return final

    # ── AI voiceover path ────────────────────────────────────────
    voice_path = workdir / "voiceover.mp3"
    print(f"[render] voiceover={'downloading' if payload.voiceover_url else 'NONE (no URL received)'}")
    if payload.voiceover_url:
        try:
            download(payload.voiceover_url, voice_path)
            print(f"[render] voiceover downloaded {voice_path.stat().st_size} bytes")
        except Exception as e:
            print(f"[render] voiceover download failed: {e}")

    total_duration = detect_audio_duration(voice_path, float(payload.duration_seconds or 30)) if voice_path.exists() else float(payload.duration_seconds or 30)
    pauses = detect_pause_points(voice_path, total_duration) if voice_path.exists() else []
    durations = script_timings(payload.script_text or "", len(urls), total_duration)
    durations = snap_to_pauses(durations, pauses, total_duration)

    # Compensate for xfade overlap so final video length matches voiceover
    if len(source_paths) > 1:
        fade_bonus = (len(source_paths) - 1) * XFADE_DUR / len(source_paths)
        durations = [d + fade_bonus for d in durations]

    rendered_clips2: list[Path] = []
    for i, src in enumerate(source_paths):
        print(f"[render] rendering clip {i+1}/{len(source_paths)}")
        out = workdir / f"clip_{i}.mp4"
        render_clip(src, out, durations[i], i, width, height, keep_audio=False)
        rendered_clips2.append(out)

    print("[render] concatenating clips")
    video_only = workdir / "video_only.mp4"
    concat_clips(rendered_clips2, durations, payload.tone or "trustworthy", payload.script_text or "", video_only)

    print("[render] burning captions")
    captions = workdir / "captions.ass"
    make_ass(payload.script_text or "", total_duration, captions, payload.caption_style or "tiktok")

    captioned = workdir / "captioned.mp4"
    ass_path = css_escape_ass_path(captions)
    try:
        COLOR_GRADE = "eq=contrast=1.08:brightness=0.02:saturation=1.12,vignette=PI/6"
        run(["ffmpeg", "-y", "-i", str(video_only), "-vf", f"{COLOR_GRADE},ass='{ass_path}'", "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", "-an", str(captioned)])
    except Exception as e:
        print(f"[render] caption burn failed ({e}), skipping captions")
        shutil.copyfile(video_only, captioned)

    print("[render] fetching music")
    final = workdir / "final.mp4"
    _mstyle = payload.music_style or "auto"
    if _mstyle == "none":
        music = None
        print("[render] music disabled by user")
    else:
        _mquery = _mstyle if _mstyle != "auto" else (payload.tone or "trustworthy")
        music = make_background_music(total_duration, workdir / "music.mp3", pick_music(_mquery))
    print(f"[render] music={'found' if music else 'none'}")

    has_voice = voice_path.exists()
    print(f"[render] mixing audio voice={has_voice} music={bool(music)}")
    if has_voice and music:
        try:
            run([
                "ffmpeg", "-y", "-i", str(captioned), "-i", str(voice_path), "-i", str(music),
                "-filter_complex",
                "[2:a]volume=0.6,aformat=fltp:44100:stereo[music];"
                "[1:a]aformat=fltp:44100:stereo[voice];"
                "[music][voice]sidechaincompress=threshold=0.02:ratio=8:attack=100:release=500[ducked];"
                "[voice][ducked]amix=inputs=2:duration=first[a]",
                "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-shortest", str(final)
            ])
        except RuntimeError:
            print("[render] sidechaincompress unavailable, falling back to simple mix")
            run([
                "ffmpeg", "-y", "-i", str(captioned), "-i", str(voice_path), "-i", str(music),
                "-filter_complex", "[1:a]volume=1.0[a1];[2:a]volume=0.25[a2];[a1][a2]amix=inputs=2:duration=first[a]",
                "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-shortest", str(final)
            ])
    elif has_voice:
        run(["ffmpeg", "-y", "-i", str(captioned), "-i", str(voice_path),
             "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-shortest", str(final)])
    elif music:
        run([
            "ffmpeg", "-y", "-i", str(captioned), "-i", str(music),
            "-filter_complex", "[1:a]volume=0.75[a]",
            "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-shortest", str(final)
        ])
    else:
        print("[render] WARNING: no voice and no music — output will be silent")
        shutil.copyfile(captioned, final)

    print("[render] pipeline complete, uploading")
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
        "video_url": final_url,
        "render_status": "complete",
        "render_error": None,
        "rendered_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", video_id).eq("user_id", user_id).execute()

    return final_url


def render_job(payload: RenderPayload) -> None:
    supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    with tempfile.TemporaryDirectory(prefix=f"render-{payload.video_id}-") as tmp:
        workdir = Path(tmp)
        try:
            supabase.table("videos").update({"render_status": "rendering", "render_error": None}).eq("id", payload.video_id).eq("user_id", payload.user_id).execute()
            final = assemble(payload, workdir)
            upload_final(payload.video_id, payload.user_id, final)
        except Exception as exc:
            supabase.table("videos").update({"render_status": "failed", "render_error": "Video export failed. Please try again."}).eq("id", payload.video_id).eq("user_id", payload.user_id).execute()
            print(f"[render-worker] failed video={payload.video_id}: {exc}")


@app.api_route("/health", methods=["GET", "HEAD"])
def health() -> dict[str, str]:
    return {"ok": "true"}


@app.post("/render")
def render(payload: RenderPayload, background_tasks: BackgroundTasks) -> dict[str, str]:
    if not os.environ.get("SUPABASE_URL") or not os.environ.get("SUPABASE_SERVICE_ROLE_KEY"):
        raise HTTPException(status_code=500, detail="Storage is not configured")

    if os.environ.get("RENDER_SYNC") == "true":
        with tempfile.TemporaryDirectory(prefix=f"render-{payload.video_id}-") as tmp:
            final = assemble(payload, Path(tmp))
            final_url = upload_final(payload.video_id, payload.user_id, final)
            return {"video_url": final_url}

    background_tasks.add_task(render_job, payload)
    return {"status": "queued", "video_id": payload.video_id}
