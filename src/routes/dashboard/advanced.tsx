import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import {
  Send, Loader2, Zap, RotateCcw, Sparkles, Check, ArrowRight, Paperclip, X,
} from "lucide-react";
import { sendAdvancedMessage } from "@/functions/advanced-chat";
import { generateAdvancedStory } from "@/functions/generate-advanced";
import { useAuth } from "@/hooks/use-auth";
import { VOICE_STYLES, type VoiceStyleId } from "@/lib/voice-styles";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/advanced")({
  component: AdvancedMode,
});

const OPENING = "Before we dive in — do you have any photos or videos of your work, your space, or your people? You can tap the 📎 button below to upload them and I'll weave them into your story.";

const PLATFORMS = [
  { id: "tiktok",           label: "TikTok",     ratio: "9:16" },
  { id: "instagram_reels",  label: "Reels",      ratio: "9:16" },
  { id: "youtube_shorts",   label: "YT Shorts",  ratio: "9:16" },
  { id: "facebook_reels",   label: "Facebook",   ratio: "9:16" },
];

const DURATIONS = [
  { value: 30,  label: "30s", desc: "Quick & punchy" },
  { value: 60,  label: "60s", desc: "Full story" },
];

const GENERATING_STEPS = [
  "Reading your story...",
  "Writing the script...",
  "Finding your visuals...",
  "Generating voiceover...",
  "Assembling your video...",
];

interface Message {
  id: string;
  role: "ai" | "user";
  text: string;
  mediaUrls?: string[];
}

type Phase = "chat" | "settings" | "generating";

function AdvancedMode() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>("chat");
  const [messages, setMessages] = useState<Message[]>([
    { id: "0", role: "ai", text: OPENING },
  ]);
  const [input, setInput] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [userAnswerCount, setUserAnswerCount] = useState(0);
  const [userMediaUrls, setUserMediaUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [platform, setPlatform] = useState("tiktok");
  const [duration, setDuration] = useState(30);
  const [voiceStyle, setVoiceStyle] = useState<VoiceStyleId>("warm");
  const [genStep, setGenStep] = useState(0);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const genRef = useRef<Promise<unknown> | null>(null);

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !user) return;
    setIsUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const ext = file.name.split(".").pop();
        const path = `${user.id}/user-media/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("videos").upload(path, file, { upsert: true });
        if (error) throw error;
        const { data } = supabase.storage.from("videos").getPublicUrl(path);
        uploaded.push(data.publicUrl);
      }
      setUserMediaUrls((prev) => [...prev, ...uploaded]);
      // Show uploaded media as a message in the chat
      const mediaMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        text: `${uploaded.length} file${uploaded.length > 1 ? "s" : ""} uploaded`,
        mediaUrls: uploaded,
      };
      setMessages((m) => [...m, mediaMsg]);
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAiTyping]);

  useEffect(() => {
    if (phase === "generating") {
      const iv = setInterval(
        () => setGenStep((s) => (s < GENERATING_STEPS.length - 1 ? s + 1 : s)),
        3500
      );
      return () => clearInterval(iv);
    }
  }, [phase]);

  const buildGroqHistory = (msgs: Message[]) =>
    msgs.map((m) => ({
      role: m.role === "ai" ? ("assistant" as const) : ("user" as const),
      content: m.text,
    }));

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isAiTyping) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setIsAiTyping(true);
    setUserAnswerCount((c) => c + 1);

    try {
      const { reply, isReady: ready } = await sendAdvancedMessage({
        data: { messages: buildGroqHistory(nextMessages) },
      });

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        text: reply,
      };
      setMessages((m) => [...m, aiMsg]);
      if (ready) setIsReady(true);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleGenerate = () => {
    if (!user) return;
    setPhase("generating");

    const conversationText = messages
      .map((m) => `${m.role === "ai" ? "Interviewer" : "Business owner"}: ${m.text}`)
      .join("\n");

    genRef.current = generateAdvancedStory({
      data: { userId: user.id, conversationText, platform, duration, voiceStyle, userMediaUrls },
    })
      .then((result: any) => {
        if (result.voiceoverError) {
          toast.error(`No audio: ${result.voiceoverError}`, { duration: 8000 });
        }
        navigate({ to: "/dashboard/result/$videoId", params: { videoId: result.videoId } });
      })
      .catch((err: Error) => {
        toast.error(err.message ?? "Generation failed.");
        setPhase("settings");
      });
  };

  const reset = () => {
    setPhase("chat");
    setMessages([{ id: "0", role: "ai", text: OPENING }]);
    setInput("");
    setIsAiTyping(false);
    setIsReady(false);
    setUserAnswerCount(0);
    setUserMediaUrls([]);
    setGenStep(0);
  };

  // Q1 is the media question (not a story question), so story progress is answers 2-6
  const storyAnswers = Math.max(0, userAnswerCount - 1);
  const progress = Math.min((storyAnswers / 5) * 100, 100);

  if (phase === "generating") {
    return (
      <div className="max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="relative w-16 h-16 mb-6">
          <div className="absolute inset-0 rounded-2xl bg-[#a78bfa]/10 border border-[#a78bfa]/20" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-7 h-7 text-[#a78bfa] animate-spin" />
          </div>
        </div>
        <h2 className="font-serif font-bold text-xl text-white mb-2">Crafting your story</h2>
        <p className="text-[#a78bfa]/70 text-sm mb-6 transition-all duration-500">
          {GENERATING_STEPS[genStep]}
        </p>
        <div className="w-48 h-1 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#a78bfa] rounded-full transition-all duration-[3500ms]"
            style={{ width: `${((genStep + 1) / GENERATING_STEPS.length) * 100}%` }}
          />
        </div>
      </div>
    );
  }

  if (phase === "settings") {
    return (
      <div className="max-w-lg mx-auto space-y-5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.15em] text-[#a78bfa]/70 font-semibold mb-1">Advanced Mode</p>
          <h2 className="font-serif font-bold text-xl text-white mb-0.5">Set up your video</h2>
          <p className="text-white/40 text-sm">Where will you post it and what style do you want?</p>
        </div>

        <div>
          <p className="text-sm font-semibold text-white mb-3">Platform</p>
          <div className="grid grid-cols-2 gap-2.5">
            {PLATFORMS.map(({ id, label, ratio }) => (
              <button
                key={id}
                onClick={() => setPlatform(id)}
                className={`flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${
                  platform === id
                    ? "bg-[#a78bfa]/10 border-[#a78bfa]/40"
                    : "bg-[#0e0e12] border-white/[0.07] hover:border-white/20"
                }`}
              >
                <span className={`text-sm font-semibold ${platform === id ? "text-[#a78bfa]" : "text-white"}`}>{label}</span>
                <span className="text-[10px] font-mono text-white/30 bg-white/[0.05] px-1.5 py-0.5 rounded">{ratio}</span>
                {platform === id && <Check className="w-3.5 h-3.5 text-[#a78bfa] ml-1" />}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-white mb-3">Video length</p>
          <div className="grid grid-cols-2 gap-2.5">
            {DURATIONS.map(({ value, label, desc }) => (
              <button
                key={value}
                onClick={() => setDuration(value)}
                className={`flex flex-col items-center gap-0.5 px-4 py-3.5 rounded-xl border transition-all ${
                  duration === value
                    ? "bg-[#a78bfa]/10 border-[#a78bfa]/40 text-[#a78bfa]"
                    : "bg-[#0e0e12] border-white/[0.07] text-white/60 hover:border-white/20"
                }`}
              >
                <span className="text-base font-bold">{label}</span>
                <span className={`text-[10px] ${duration === value ? "text-[#a78bfa]/60" : "text-white/30"}`}>{desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-white mb-3">Voice style</p>
          <div className="grid grid-cols-2 gap-2.5">
            {(Object.values(VOICE_STYLES) as typeof VOICE_STYLES[VoiceStyleId][]).map((vs) => (
              <button
                key={vs.id}
                onClick={() => setVoiceStyle(vs.id)}
                className={`flex flex-col items-start px-4 py-3.5 rounded-xl border text-left transition-all ${
                  voiceStyle === vs.id
                    ? "bg-[#a78bfa]/10 border-[#a78bfa]/40"
                    : "bg-[#0e0e12] border-white/[0.07] hover:border-white/20"
                }`}
              >
                <span className={`text-sm font-semibold mb-0.5 ${voiceStyle === vs.id ? "text-[#a78bfa]" : "text-white"}`}>
                  {vs.label}
                </span>
                <span className="text-[11px] text-white/35">{vs.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleGenerate}
          className="w-full flex items-center justify-center gap-2.5 bg-[#a78bfa] text-white text-sm font-bold py-4 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all"
        >
          <Zap className="w-4 h-4" /> Generate My Story
        </button>
        <button onClick={() => setPhase("chat")} className="w-full text-center text-xs text-white/30 hover:text-white/60 transition py-1">
          ← Back to conversation
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto flex flex-col" style={{ height: "calc(100vh - 140px)" }}>
      <div className="flex-shrink-0 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-[11px] uppercase tracking-[0.15em] text-[#a78bfa]/70 font-semibold">Advanced Mode</p>
            <h1 className="font-serif font-bold text-lg text-white">Your Story Session</h1>
          </div>
          <button
            onClick={reset}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/[0.06] transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#a78bfa] rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-[10px] text-white/25 mt-1.5">
          {isReady ? "Story ready" : storyAnswers > 0 ? `${storyAnswers} / 5 story questions` : "Let's capture your story"}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pb-4 min-h-0">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "ai" && (
              <div className="w-7 h-7 rounded-full bg-[#a78bfa]/20 border border-[#a78bfa]/30 flex items-center justify-center flex-shrink-0 mr-2.5 mt-0.5">
                <Sparkles className="w-3 h-3 text-[#a78bfa]" />
              </div>
            )}
            <div className="max-w-[80%] flex flex-col gap-2">
              {msg.mediaUrls && msg.mediaUrls.length > 0 && (
                <div className="flex flex-wrap gap-1.5 justify-end">
                  {msg.mediaUrls.map((url, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-[#a78bfa]/30">
                      {url.match(/\.(mp4|mov|webm|avi)$/i) ? (
                        <video src={url} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                  ))}
                </div>
              )}
              {msg.text && (
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "ai"
                      ? "bg-[#111116] border border-white/[0.07] text-white rounded-tl-sm"
                      : "bg-[#a78bfa]/15 border border-[#a78bfa]/20 text-white rounded-tr-sm"
                  }`}
                >
                  {msg.text}
                </div>
              )}
            </div>
          </div>
        ))}

        {isAiTyping && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full bg-[#a78bfa]/20 border border-[#a78bfa]/30 flex items-center justify-center flex-shrink-0 mr-2.5 mt-0.5">
              <Sparkles className="w-3 h-3 text-[#a78bfa]" />
            </div>
            <div className="bg-[#111116] border border-white/[0.07] px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {isReady ? (
        <div className="flex-shrink-0 pt-3 border-t border-white/[0.06]">
          <div className="bg-[#a78bfa]/10 border border-[#a78bfa]/20 rounded-xl p-4 mb-3">
            <p className="text-sm font-semibold text-[#a78bfa] mb-0.5">Story captured</p>
            <p className="text-xs text-white/50">I have everything I need to build your video.</p>
          </div>
          <button
            onClick={() => setPhase("settings")}
            className="w-full flex items-center justify-center gap-2.5 bg-[#a78bfa] text-white text-sm font-bold py-4 rounded-xl hover:brightness-110 transition"
          >
            Set up your video <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex-shrink-0 pt-3 border-t border-white/[0.06]">
          {/* Show uploaded media strip */}
          {userMediaUrls.length > 0 && (
            <div className="flex gap-1.5 mb-2 flex-wrap">
              {userMediaUrls.map((url, i) => (
                <div key={i} className="relative w-12 h-12 rounded-lg overflow-hidden border border-[#a78bfa]/30">
                  {url.match(/\.(mp4|mov|webm|avi)$/i) ? (
                    <video src={url} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  )}
                  <button
                    onClick={() => setUserMediaUrls((u) => u.filter((_, j) => j !== i))}
                    className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/70 rounded-full flex items-center justify-center"
                  >
                    <X className="w-2.5 h-2.5 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={handleMediaUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-11 h-11 rounded-xl bg-[#0e0e12] border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-[#a78bfa] hover:border-[#a78bfa]/40 disabled:opacity-40 transition flex-shrink-0"
              title="Attach photos or videos"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
            </button>
            <div className="flex-1 flex items-center bg-[#0e0e12] border border-white/[0.08] rounded-xl px-4 gap-2 focus-within:border-[#a78bfa]/40 transition">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Type your answer..."
                disabled={isAiTyping}
                className="flex-1 bg-transparent py-3.5 text-sm text-white placeholder:text-white/25 focus:outline-none disabled:opacity-50"
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isAiTyping}
              className="w-11 h-11 rounded-xl bg-[#a78bfa] flex items-center justify-center disabled:opacity-30 hover:brightness-110 transition flex-shrink-0"
            >
              {isAiTyping ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <Send className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
