export interface EditTiming {
  startFrame: number;
  durationFrames: number;
}

function equalTimings(totalFrames: number, clipCount: number): EditTiming[] {
  if (clipCount <= 0) return [];
  const base = Math.floor(totalFrames / clipCount);
  let cursor = 0;
  return Array.from({ length: clipCount }, (_, i) => {
    const durationFrames = i === clipCount - 1 ? totalFrames - cursor : base;
    const timing = { startFrame: cursor, durationFrames };
    cursor += durationFrames;
    return timing;
  });
}

export function createEditTimings(script: string, totalFrames: number, clipCount: number): EditTiming[] {
  if (clipCount <= 0) return [];
  if (!script.trim()) return equalTimings(totalFrames, clipCount);

  const sentences = script
    .replace(/([.!?])\s+/g, "$1\n")
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 2);

  if (sentences.length === 0) return equalTimings(totalFrames, clipCount);

  const wordCounts = sentences.map((s) => s.split(/\s+/).length);
  const buckets = Array(clipCount).fill(0) as number[];

  for (let i = 0; i < sentences.length; i++) {
    const bucket = Math.min(Math.floor((i / sentences.length) * clipCount), clipCount - 1);
    buckets[bucket] += wordCounts[i];
  }

  const filled = buckets.map((w) => Math.max(w, 1));
  const total = filled.reduce((a, b) => a + b, 0);
  const minFrames = 30;
  const frames = filled.map((w) => Math.max(Math.round((w / total) * totalFrames), minFrames));

  let diff = frames.reduce((a, b) => a + b, 0) - totalFrames;
  while (diff !== 0) {
    const idx = frames.indexOf(Math.max(...frames));
    frames[idx] += diff > 0 ? -1 : 1;
    diff += diff > 0 ? -1 : 1;
  }

  let cursor = 0;
  return frames.map((durationFrames) => {
    const timing = { startFrame: cursor, durationFrames };
    cursor += durationFrames;
    return timing;
  });
}
