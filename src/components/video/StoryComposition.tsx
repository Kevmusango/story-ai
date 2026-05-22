import {
  AbsoluteFill,
  Audio,
  Sequence,
  Video,
  Img,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

function isImageUrl(url: string) {
  return /\.(jpe?g|png|webp|gif|heic|avif)(\?|$)/i.test(url);
}

export interface StoryCompositionProps {
  stockClips: string[];
  voiceoverUrl: string;
  captionLines: string[];
  script?: string;
  platform?: string;
  tone?: string;
  editTimings?: { startFrame: number; durationFrames: number }[];
}

const PRELOAD_FRAMES = 60;

/** Crossfade frames based on tone — energetic/funny = near-hard-cut, emotional = slow dissolve */
function getFadeDuration(tone?: string): number {
  if (tone === "energetic" || tone === "funny") return 5;
  if (tone === "emotional" || tone === "inspirational") return 22;
  return 12; // trustworthy / default
}

/** Portrait platforms crop upward so faces/subjects stay in frame instead of being centred out */
function getObjectPosition(isPortrait: boolean): string {
  return isPortrait ? "50% 22%" : "50% 50%";
}

/**
 * Split script into sentences and allocate frames proportionally by word count.
 * Fast punchy lines → short clips. Slow emotional lines → long clips.
 * Falls back to equal splits if script is empty.
 */
function scriptToClipDurations(script: string, totalFrames: number, clipCount: number): number[] {
  if (clipCount === 0) return [];
  const equal = () => {
    const base = Math.floor(totalFrames / clipCount);
    return Array.from({ length: clipCount }, (_, i) =>
      i === clipCount - 1 ? totalFrames - base * (clipCount - 1) : base
    );
  };
  if (!script || !script.trim()) return equal();

  const sentences = script
    .replace(/([.!?])\s+/g, "$1\n")
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 2);

  if (sentences.length === 0) return equal();

  const wordCounts = sentences.map((s) => s.split(/\s+/).length);
  const totalWords = wordCounts.reduce((a, b) => a + b, 0);

  // Group sentences evenly into clipCount buckets
  const buckets: number[] = Array(clipCount).fill(0);
  for (let i = 0; i < sentences.length; i++) {
    const bucket = Math.min(Math.floor((i / sentences.length) * clipCount), clipCount - 1);
    buckets[bucket] += wordCounts[i];
  }
  // Any empty bucket gets a floor word count so it still gets some time
  const filled = buckets.map((w) => Math.max(w, 1));
  const total = filled.reduce((a, b) => a + b, 0);

  const MIN_FRAMES = 30; // 1 second minimum per clip
  let frames = filled.map((w) => Math.max(Math.round((w / total) * totalFrames), MIN_FRAMES));

  // Normalise to exactly totalFrames
  let diff = frames.reduce((a, b) => a + b, 0) - totalFrames;
  while (diff !== 0) {
    const idx = diff > 0
      ? frames.indexOf(Math.max(...frames))
      : frames.indexOf(Math.max(...frames));
    frames[idx] += diff > 0 ? -1 : 1;
    diff += diff > 0 ? -1 : 1;
  }

  return frames;
}

function normalizeEditTimings(
  editTimings: { startFrame: number; durationFrames: number }[] | undefined,
  totalFrames: number,
  clipCount: number
): { startFrame: number; durationFrames: number }[] | null {
  if (!editTimings || editTimings.length !== clipCount) return null;
  const valid = editTimings.every(
    (t) => Number.isFinite(t.startFrame) && Number.isFinite(t.durationFrames) && t.durationFrames > 0
  );
  if (!valid) return null;

  const sourceTotal = Math.max(
    1,
    editTimings[editTimings.length - 1].startFrame + editTimings[editTimings.length - 1].durationFrames
  );
  const scale = totalFrames / sourceTotal;

  return editTimings.map((t, i) => {
    const startFrame = Math.max(0, Math.round(t.startFrame * scale));
    return {
      startFrame,
      durationFrames: i === clipCount - 1
        ? Math.max(1, totalFrames - startFrame)
        : Math.max(1, Math.round(t.durationFrames * scale)),
    };
  });
}

function ClipLayer({
  url,
  isFirst,
  clipIndex,
  fadeDuration,
  isPortrait,
}: {
  url: string;
  isFirst: boolean;
  clipIndex: number;
  fadeDuration: number;
  isPortrait: boolean;
}) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const opacity = isFirst
    ? 1
    : interpolate(
        frame,
        [PRELOAD_FRAMES, PRELOAD_FRAMES + fadeDuration],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      );

  // Scale punch on fast/energetic cuts — brief zoom-in snap that settles immediately
  const scalePunch = fadeDuration <= 6
    ? interpolate(frame, [PRELOAD_FRAMES, PRELOAD_FRAMES + 10], [1.04, 1.0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;

  const objectPosition = getObjectPosition(isPortrait);

  // Ken Burns for images — 4 variants cycling so no two consecutive clips move the same way
  const progress = Math.min(frame / Math.max(durationInFrames - 1, 1), 1);
  const variant = clipIndex % 4;
  const kbScale =
    variant === 0 ? interpolate(progress, [0, 1], [1.0, 1.07]) :
    variant === 1 ? interpolate(progress, [0, 1], [1.07, 1.0]) :
    1.05;
  const kbX = variant === 2 ? interpolate(progress, [0, 1], [-2.5, 2.5]) : 0;
  const kbY = variant === 3 ? interpolate(progress, [0, 1], [2.5, -2.5]) : 0;

  return (
    <AbsoluteFill style={{ opacity, transform: `scale(${scalePunch})` }}>
      {isImageUrl(url) ? (
        <Img
          src={url}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition,
            transform: `scale(${kbScale}) translate(${kbX}%, ${kbY}%)`,
            transformOrigin: "center center",
          }}
        />
      ) : (
        <Video
          src={url}
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition }}
          muted
          loop
        />
      )}
    </AbsoluteFill>
  );
}

// Off-screen native <video> elements that start buffering immediately on mount,
// before Remotion's Sequence even activates. Same URL → browser reuses the fetch.
function VideoPreloader({ urls }: { urls: string[] }) {
  return (
    <>
      {urls.filter((u) => !isImageUrl(u)).map((url, i) => (
        <video
          key={i}
          src={url}
          muted
          preload="auto"
          playsInline
          style={{
            position: "fixed",
            top: "-9999px",
            left: "-9999px",
            width: "1px",
            height: "1px",
            opacity: 0,
            pointerEvents: "none",
          }}
        />
      ))}
    </>
  );
}

function CaptionLayer({ captionLines }: { captionLines: string[] }) {
  const { durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();

  const lineDuration = durationInFrames / captionLines.length;
  const lineIndex = Math.min(
    Math.floor(frame / lineDuration),
    captionLines.length - 1
  );
  const isLast = lineIndex === captionLines.length - 1;
  const lineFrame = frame - lineIndex * lineDuration;

  // Last caption stays — never fades out
  const opacity = interpolate(
    lineFrame,
    isLast
      ? [0, 6, lineDuration]
      : [0, 6, lineDuration - 6, lineDuration],
    isLast ? [0, 1, 1] : [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const translateY = interpolate(lineFrame, [0, 10], [10, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        paddingBottom: 80,
        paddingLeft: 28,
        paddingRight: 28,
      }}
    >
      <p
        style={{
          opacity,
          transform: `translateY(${translateY}px)`,
          color: "#fff",
          fontSize: 38,
          fontWeight: 800,
          textAlign: "center",
          lineHeight: 1.25,
          textShadow: "0 2px 16px rgba(0,0,0,0.8), 0 1px 3px rgba(0,0,0,0.9)",
          fontFamily: "system-ui, -apple-system, sans-serif",
          letterSpacing: "-0.5px",
        }}
      >
        {captionLines[lineIndex]}
      </p>
    </AbsoluteFill>
  );
}

export function StoryComposition({
  stockClips,
  voiceoverUrl,
  captionLines,
  script,
  platform,
  tone,
  editTimings,
}: StoryCompositionProps) {
  const { durationInFrames } = useVideoConfig();

  const clips = stockClips.length > 0 ? stockClips : [];
  const isPortrait = platform !== "youtube" && platform !== "facebook";
  const fadeDuration = getFadeDuration(tone);

  const normalizedTimings = normalizeEditTimings(editTimings, durationInFrames, clips.length);
  const clipDurations = normalizedTimings
    ? normalizedTimings.map((t) => t.durationFrames)
    : scriptToClipDurations(script ?? "", durationInFrames, clips.length);
  const clipStarts = normalizedTimings
    ? normalizedTimings.map((t) => t.startFrame)
    : clipDurations.reduce<number[]>((acc, _, i) => {
        acc.push(i === 0 ? 0 : acc[i - 1] + clipDurations[i - 1]);
        return acc;
      }, []);

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <VideoPreloader urls={clips} />

      {clips.map((url, i) => {
        const clipStart = clipStarts[i];
        const clipEnd = i === clips.length - 1 ? durationInFrames : clipStart + clipDurations[i];
        // Start PRELOAD_FRAMES early (opacity=0) so browser buffers before clip becomes visible
        const from = i === 0 ? 0 : Math.max(0, clipStart - PRELOAD_FRAMES);
        const duration = clipEnd - from;
        if (duration <= 0) return null;

        return (
          <Sequence key={i} from={from} durationInFrames={duration}>
            <ClipLayer url={url} isFirst={i === 0} clipIndex={i} fadeDuration={fadeDuration} isPortrait={isPortrait} />
          </Sequence>
        );
      })}

      {/* Gradient for caption legibility */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.08) 40%, transparent 65%)",
          pointerEvents: "none",
        }}
      />

      {captionLines.length > 0 && (
        <CaptionLayer captionLines={captionLines} />
      )}

      {voiceoverUrl && <Audio src={voiceoverUrl} />}
    </AbsoluteFill>
  );
}
