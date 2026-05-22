export interface ScriptInput {
  businessType: string;
  goal: string;
  platform: string;
  duration: number;
  businessName?: string;
  websiteUrl?: string;
}

export interface StoryScript {
  script: string;
  opening_line: string;
  archetype: string;
  tone: string;
  visual_prompts: string[];
  voiceover_style: string;
}

const SYSTEM_PROMPT = `You are a social media video scriptwriter. You write directly to the person watching — not about the business.

THE GOLDEN RULE: The viewer must think "wait, that's me" within the first 3 seconds. If the opening line starts with the business name, "we", or "our", you have failed.

SCRIPT STRUCTURE:
1. HOOK: Voice the viewer's exact pain, frustration, or desire. Speak to them as "you". Be so specific it feels personal.
2. RECOGNITION: Deepen it. Make them feel completely understood before offering anything.
3. SHIFT: Introduce the business as the transformation — describe what changes, not what it does.
4. PROOF: One real, specific detail that makes it believable (a moment, a reaction, a result).
5. CLOSE: A line that makes them want to act right now.

RULES:
- NEVER open with the business name, "we", or "our"
- NEVER use: "quality service", "passionate team", "dedicated to excellence", "state of the art"
- Speak to the viewer as "you" / "your"
- 15s = ~38 words, 30s = ~75 words, 60s = ~150 words
- Opening line = a contradiction, a confession, or a mirror held up to the viewer's life

Return ONLY valid JSON in this exact format, no markdown:
{
  "script": "full script as one continuous piece",
  "opening_line": "first sentence only — viewer's pain or desire, never the business",
  "archetype": "one of: The Pain Mirror, The Transformation, The Insider Truth, The Community Champion, The Before & After",
  "tone": "one of: emotional, energetic, trustworthy, funny, inspirational",
  "visual_prompts": ["3 to 5 short 2-4 word stock video search queries reflecting the customer's world"],
  "voiceover_style": "one brief style note e.g. warm and direct"
}`;

export async function generateStoryFromConversation(
  conversationText: string,
  platform: string,
  duration: number
): Promise<StoryScript> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not set");

  const wordCount = duration === 15 ? 38 : duration === 30 ? 75 : 150;

  const userPrompt = `Write a ${duration}-second video script (~${wordCount} words) for ${platform}.

INTERVIEW TRANSCRIPT:
${conversationText}

STEP 1 — Read the transcript and extract:
- Who the typical customer is (from how the owner describes them)
- What that customer was struggling with or looking for BEFORE finding this business
- The specific moment or transformation the owner described (a customer reaction, a result, a real detail)
- The exact words customers use when they talk about this business

STEP 2 — Write the script speaking DIRECTLY to that customer:
- Open with their pain or desire — so specific they stop scrolling
- Do NOT mention the business name or "we" in the first sentence
- Make them feel seen and understood first
- Then reveal the business as the answer to exactly what they needed
- Use the real customer words and moments from the transcript — never generic language
- Close with a line that makes them want to go right now`;


  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.85,
      max_tokens: 800,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error ${res.status}: ${err}`);
  }

  const json = (await res.json()) as {
    choices: [{ message: { content: string } }];
  };

  try {
    return JSON.parse(json.choices[0].message.content) as StoryScript;
  } catch {
    throw new Error("Groq returned invalid JSON");
  }
}

export async function generateStoryScript(input: ScriptInput): Promise<StoryScript> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not set");

  const wordCount =
    input.duration === 15 ? 38 : input.duration === 30 ? 75 : 150;

  const userPrompt = `Write a ${input.duration}-second video script (~${wordCount} words) for ${input.platform}.

Business type: ${input.businessType}
Goal: ${input.goal}
${input.businessName ? `Business name: ${input.businessName}` : ""}
${input.websiteUrl ? `Social/web presence: ${input.websiteUrl}` : ""}

You already know what kind of business this is. You know who their typical customer is and what that customer struggles with before finding them.

Think: what is the most common frustration, fear, or desire for someone who needs a ${input.businessType}?
- What have they probably already tried that didn't work?
- What do they feel before they walk in?
- What changes for them after?

Write the script speaking DIRECTLY to that customer:
- Open with their pain or desire — not the business
- Make them feel understood in the first 3 seconds
- Reveal the ${input.businessType} as exactly what they've been looking for
- End with a line that makes them act now

NEVER open with the business name or "we". The viewer must think "that's me" before they even know what the business is.`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.85,
      max_tokens: 800,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error ${res.status}: ${err}`);
  }

  const json = (await res.json()) as {
    choices: [{ message: { content: string } }];
  };

  try {
    return JSON.parse(json.choices[0].message.content) as StoryScript;
  } catch {
    throw new Error("Groq returned invalid JSON");
  }
}
