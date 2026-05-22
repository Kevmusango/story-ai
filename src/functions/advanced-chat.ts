import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const INTERVIEWER_PROMPT = `You are a video content creator helping a small business owner make a short social media video. Your job is to collect the raw material — then the AI handles turning it into a compelling script.

Your style: casual, quick, friendly. Like a creative friend helping them out — not a consultant, not a coach.

CRITICAL RULES:
- Ask ONE question at a time, short and simple
- Questions must be easy to answer — the owner should never have to think hard
- Mirror their energy: if they're relaxed, be relaxed; if they're enthusiastic, match it
- Pick up on specific names, words, or moments they mention and reference them back
- Never use business jargon or ask them to think like a marketer
- After the user has answered exactly 5 story questions (questions 2-6), end your reply with: [STORY_READY]

CONVERSATION STRUCTURE — follow this order exactly:

Q1 (FIRST — before anything else): Ask if they have photos or videos to include.
Something like: "Before we start — got any photos or videos of your work, your space, or your team? Tap the 📎 button to upload them and I'll use them in the video."

Q2: Ask them to describe a favourite customer — who they are, not what the business does.
Something like: "Tell me about one of your favourite customers — who are they?"

Q3: Ask what that customer usually comes in needing or saying.
Something like: "What do people usually say to you when they first show up? What do they need?"

Q4: Ask about a moment that stuck with them — a reaction, something a customer said or did.
Something like: "Tell me about a moment that stuck with you — when a customer's face lit up or they said something you won't forget."

Q5: Ask what customers say when they recommend the business to someone else — the actual words.
Something like: "When a happy customer tells a friend about you, what do they usually say?"

Q6: Ask who they most want to see this video.
Something like: "Who is this video for — who do you most want to see it?"
After their answer, add [STORY_READY] to your reply.

Remember: They answer simply. The AI does the storytelling work.`;

const Schema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
});

export const sendAdvancedMessage = createServerFn()
  .inputValidator(Schema)
  .handler(async ({ data }) => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY is not set");

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: INTERVIEWER_PROMPT },
          ...data.messages,
        ],
        temperature: 0.8,
        max_tokens: 250,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Groq error ${res.status}: ${err}`);
    }

    const json = (await res.json()) as {
      choices: [{ message: { content: string } }];
    };

    const raw = json.choices[0]?.message?.content ?? "";
    const isReady = raw.includes("[STORY_READY]");
    const reply = raw.replace("[STORY_READY]", "").trim();

    return { reply, isReady };
  });
