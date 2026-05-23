// Maps raw database/network/API errors to clean, user-facing messages.
// NEVER show raw error strings to users.

export function getFriendlyError(err: unknown): string {
  const raw = String(err).toLowerCase();

  // Auth / session
  if (raw.includes("jwt") || raw.includes("session") || raw.includes("token"))
    return "Your session expired. Please refresh the page and try again.";

  // Profile / FK constraint — user exists in auth but profile row missing
  if (raw.includes("foreign key") || raw.includes("fkey") || raw.includes("profiles"))
    return "Account setup incomplete. Please sign out and sign back in.";

  // Quota / billing
  if (raw.includes("quota") || raw.includes("rate limit") || raw.includes("429"))
    return "Service is temporarily busy. Please wait a moment and try again.";

  // Storage
  if (raw.includes("storage") || raw.includes("bucket") || raw.includes("upload"))
    return "File upload failed. Check your file size and try again.";

  // Network
  if (raw.includes("fetch") || raw.includes("network") || raw.includes("failed to fetch"))
    return "Connection error. Check your internet and try again.";

  // OpenAI
  if (raw.includes("openai") || raw.includes("gpt"))
    return "AI analysis failed. Please try again in a moment.";

  // ElevenLabs
  if (raw.includes("elevenlabs") || raw.includes("audio") || raw.includes("voiceover"))
    return "Voiceover generation failed. Your video will still be queued.";

  // Generic fallback — never leak the raw message
  return "Something went wrong. Please try again.";
}
