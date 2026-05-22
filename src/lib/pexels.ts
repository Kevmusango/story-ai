interface PexelsVideoFile {
  quality: string;
  file_type: string;
  width: number;
  height: number;
  link: string;
}

interface PexelsVideo {
  id: number;
  url: string;
  image: string;
  duration: number;
  video_files: PexelsVideoFile[];
}

interface PexelsVideoResponse {
  videos: PexelsVideo[];
}

function getOrientation(platform: string): string {
  if (platform === "youtube") return "landscape";
  if (platform === "instagram_square") return "square";
  return "portrait";
}

function getBestFile(video: PexelsVideo, orientation: string): string {
  const files = video.video_files;
  if (orientation === "portrait") {
    const portrait = files.find((f) => f.height > f.width && f.quality === "hd");
    if (portrait) return portrait.link;
  }
  const hd = files.find((f) => f.quality === "hd");
  return (hd ?? files[0])?.link ?? video.url;
}

export interface StockClip {
  id: number;
  videoUrl: string;
  thumbnailUrl: string;
}

export async function fetchStockClips(
  queries: string[],
  platform: string,
  maxTotal = 4,
  minDurationSecs = 6
): Promise<StockClip[]> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) throw new Error("PEXELS_API_KEY is not set");

  const orientation = getOrientation(platform);
  const clips: StockClip[] = [];

  for (const query of queries.slice(0, 4)) {
    if (clips.length >= maxTotal) break;
    try {
      // Request more results per query so we have candidates to filter by duration
      const res = await fetch(
        `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=8&orientation=${orientation}&size=medium`,
        { headers: { Authorization: apiKey } }
      );
      if (!res.ok) continue;
      const data = (await res.json()) as PexelsVideoResponse;
      for (const video of data.videos ?? []) {
        if (clips.length >= maxTotal) break;
        // Only include clips that are at least as long as their slot
        if (video.duration < minDurationSecs) continue;
        clips.push({
          id: video.id,
          videoUrl: getBestFile(video, orientation),
          thumbnailUrl: video.image,
        });
      }
    } catch {
      continue;
    }
  }

  return clips;
}
