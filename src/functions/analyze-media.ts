import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  getPersona,
  getContentGoal,
  mapVisionLabelsToIndustry,
  type PersonaId,
  type ContentGoalId,
} from "@/lib/targeting";

// ─── Types ────────────────────────────────────────────────────

export interface AngleOutput {
  id: string;
  headline: string;
  hook: string;
  body: string;
  cta: string;
}

export interface MediaAnalysis {
  object: string;
  context: string;
  pain_point: string;
  desired_outcome: string;
}

interface GPT4oOutput {
  media_analysis: MediaAnalysis;
  angles: AngleOutput[];
}

// ─── Google Vision ────────────────────────────────────────────

async function runGoogleVision(imageUrl: string): Promise<string[]> {
  const key = process.env.GOOGLE_VISION_API_KEY;
  if (!key) return [];
  try {
    const res = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { source: { imageUri: imageUrl } },
              features: [
                { type: "LABEL_DETECTION", maxResults: 20 },
                { type: "OBJECT_LOCALIZATION", maxResults: 10 },
                { type: "WEB_DETECTION", maxResults: 5 },
              ],
            },
          ],
        }),
      }
    );
    if (!res.ok) return [];
    const json = await res.json();
    const r = json.responses?.[0];
    const labels = new Set<string>();
    r?.labelAnnotations?.forEach((l: { description: string }) => labels.add(l.description));
    r?.localizedObjectAnnotations?.forEach((o: { name: string }) => labels.add(o.name));
    r?.webDetection?.bestGuessLabels?.forEach((l: { label: string }) => labels.add(l.label));
    return [...labels];
  } catch {
    return [];
  }
}

// ─── GPT-4o Angle Generation ──────────────────────────────────

async function generateAngles(params: {
  imageUrls: string[];
  visionLabels: string[];
  persona: ReturnType<typeof getPersona>;
  contentGoal: ReturnType<typeof getContentGoal>;
  businessType: string | null;
  durationSeconds: number;
}): Promise<GPT4oOutput> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const labelsCtx =
    params.visionLabels.length > 0
      ? `Visual scan detected: ${params.visionLabels.slice(0, 15).join(", ")}.`
      : "";

  const goalRule =
    params.contentGoal.id === "organic"
      ? "CONTENT TYPE: Organic social (TikTok/Reels/Shorts). NO hard selling. Build authority and trust. CTA = follow/save/share. Sound like a knowledgeable friend, not an advertiser."
      : "CONTENT TYPE: Paid advertisement (Facebook/Instagram Ads). High urgency. Amplify the problem. Hard CTA = click/book/buy now. Every word must push action.";

  const businessCtx = params.businessType
    ? `Business: ${params.businessType}\n`
    : "";

  const imageContent = params.imageUrls.slice(0, 4).map((url) => ({
    type: "image_url" as const,
    image_url: { url, detail: "high" as const },
  }));

  const prompt = `You are a world-class direct-response marketing strategist.
${businessCtx}${labelsCtx}

TARGET PERSONA: "${params.persona.label}"
Core Emotion: ${params.persona.coreEmotion}
Their Pain: ${params.persona.painPoint}
What They Want: ${params.persona.desiredOutcome}
Power Words: ${params.persona.powerWords.join(", ")}

${goalRule}

Generate exactly 5 x ${params.durationSeconds}-second video scripts. Each script must be approximately ${Math.round(params.durationSeconds * 2.5)} spoken words total (hook + body + cta combined). Each uses a different psychological angle.
Scripts must be tight, punchy, and speak ONLY to this persona's deepest emotions.

ANGLES (use these exact IDs):
1. fear_risk — danger/consequence of inaction
2. cost_saving — financial logic, savings, avoiding expensive mistakes
3. confidence_status — aspiration, transformation, how they look/feel after
4. time_convenience — speed, ease, zero friction
5. community_belonging — social proof, FOMO, belonging

Output ONLY valid JSON — no markdown, no explanation:
{
  "media_analysis": { "object": "", "context": "", "pain_point": "", "desired_outcome": "" },
  "angles": [
    { "id": "fear_risk", "headline": "", "hook": "", "body": "", "cta": "" },
    { "id": "cost_saving", "headline": "", "hook": "", "body": "", "cta": "" },
    { "id": "confidence_status", "headline": "", "hook": "", "body": "", "cta": "" },
    { "id": "time_convenience", "headline": "", "hook": "", "body": "", "cta": "" },
    { "id": "community_belonging", "headline": "", "hook": "", "body": "", "cta": "" }
  ]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 2500,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You are a direct-response marketing strategist. Output only valid JSON.",
      },
      {
        role: "user",
        content: [...imageContent, { type: "text" as const, text: prompt }],
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from GPT-4o");
  return JSON.parse(content) as GPT4oOutput;
}

// ─── Server Function ──────────────────────────────────────────

export const analyzeMedia = createServerFn()
  .inputValidator(z.object({
    projectId: z.string().uuid(),
    durationSeconds: z.number().int().min(10).max(60).default(30),
  }))
  .handler(async ({ data: { projectId, durationSeconds } }) => {
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projErr || !project) throw new Error("Project not found");

    const { data: uploads } = await supabase
      .from("uploads")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order");

    if (!uploads?.length) throw new Error("No uploads found for this project");

    await supabase
      .from("projects")
      .update({ status: "analyzing" })
      .eq("id", projectId);

    const { data: generation, error: genErr } = await supabase
      .from("generations")
      .insert({ project_id: projectId, user_id: project.user_id, status: "analyzing" })
      .select()
      .single();

    if (genErr || !generation) throw new Error("Failed to create generation record");

    try {
      // Google Vision on first image
      const firstImage = uploads.find((u) => u.file_type === "image") ?? uploads[0];
      let visionLabels: string[] = [];

      if (firstImage.file_type === "image") {
        visionLabels = await runGoogleVision(firstImage.file_url);
        if (visionLabels.length > 0) {
          await supabase
            .from("uploads")
            .update({ vision_labels: visionLabels })
            .eq("id", firstImage.id);
        }
      }

      // Map to industry bucket
      const industryBucket = mapVisionLabelsToIndustry(visionLabels);
      if (industryBucket) {
        await supabase
          .from("projects")
          .update({ industry_bucket: industryBucket })
          .eq("id", projectId);
      }

      // GPT-4o: generate 5 angles
      const persona = getPersona(project.persona as PersonaId);
      const contentGoal = getContentGoal(project.content_goal as ContentGoalId);
      const imageUrls = uploads
        .filter((u) => u.file_type === "image")
        .map((u) => u.file_url)
        .slice(0, 4);

      const result = await generateAngles({
        imageUrls,
        visionLabels,
        persona,
        contentGoal,
        businessType: project.business_type,
        durationSeconds,
      });

      await supabase
        .from("generations")
        .update({
          media_analysis: result.media_analysis as unknown as import("@/integrations/supabase/types").Json,
          angles: result.angles as unknown as import("@/integrations/supabase/types").Json,
          status: "angles_ready",
        })
        .eq("id", generation.id);

      await supabase
        .from("projects")
        .update({ status: "angles_ready" })
        .eq("id", projectId);

      return {
        generationId: generation.id,
        mediaAnalysis: result.media_analysis,
        angles: result.angles,
      };
    } catch (err) {
      await supabase
        .from("generations")
        .update({ status: "failed", error_message: String(err) })
        .eq("id", generation.id);
      await supabase
        .from("projects")
        .update({ status: "failed" })
        .eq("id", projectId);
      throw err;
    }
  });
