import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import {
  Upload, X, Check, ImageIcon, Video, Zap, ArrowRight,
  Loader2, RotateCcw, Users, Shield, TrendingUp, Eye, Tag,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { generateAdvancedStory } from "@/functions/generate-advanced";
import { useAuth } from "@/hooks/use-auth";
import { VOICE_STYLES, type VoiceStyleId } from "@/lib/voice-styles";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/upload")({
  component: UploadMode,
});

const TONES = [
  { id: "emotional", label: "Emotional", desc: "Heartfelt, connection-driven" },
  { id: "energetic", label: "Energetic", desc: "Hype, fast-paced, bold" },
  { id: "trustworthy", label: "Trustworthy", desc: "Calm, credible, reliable" },
  { id: "funny", label: "Funny", desc: "Light, relatable, shareable" },
];

const GOALS = [
  { id: "get more customers", label: "Get More Customers", icon: Users },
  { id: "build trust", label: "Build Trust", icon: Shield },
  { id: "increase engagement", label: "More Engagement", icon: TrendingUp },
  { id: "raise awareness", label: "More Awareness", icon: Eye },
  { id: "promote an offer", label: "Promote an Offer", icon: Tag },
];

const PLATFORMS = [
  { id: "tiktok",          label: "TikTok",    ratio: "9:16" },
  { id: "instagram_reels", label: "Reels",     ratio: "9:16" },
  { id: "youtube_shorts",  label: "YT Shorts", ratio: "9:16" },
  { id: "facebook_reels",  label: "Facebook",  ratio: "9:16" },
];

const DURATIONS = [
  { value: 30,  label: "30s" },
  { value: 60,  label: "60s" },
];

const GEN_STEPS = [
  "Uploading your media...",
  "Writing your story script...",
  "Finding supporting visuals...",
  "Generating voiceover...",
  "Assembling your video...",
];

interface UploadedFile {
  id: string;
  file: File;
  previewUrl: string;
  type: "image" | "video";
  selected: boolean;
}

type Step = "upload" | "configure" | "generating";

function UploadMode() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("upload");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [goal, setGoal] = useState("");
  const [tone, setTone] = useState("");
  const [platform, setPlatform] = useState("tiktok");
  const [duration, setDuration] = useState(30);
  const [voiceStyle] = useState<VoiceStyleId>("warm");
  const [genStep, setGenStep] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const genRef = useRef<Promise<unknown> | null>(null);

  const handleFiles = (picked: FileList | null) => {
    if (!picked) return;
    const newFiles: UploadedFile[] = Array.from(picked)
      .filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"))
      .slice(0, 12 - files.length)
      .map((f) => ({
        id: `${Date.now()}-${Math.random()}`,
        file: f,
        previewUrl: URL.createObjectURL(f),
        type: f.type.startsWith("image/") ? "image" : "video",
        selected: true,
      }));
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const toggleSelect = (id: string) =>
    setFiles((prev) => prev.map((f) => f.id === id ? { ...f, selected: !f.selected } : f));

  const removeFile = (id: string) => {
    const f = files.find((x) => x.id === id);
    if (f) URL.revokeObjectURL(f.previewUrl);
    setFiles((prev) => prev.filter((x) => x.id !== id));
  };

  const selectedFiles = files.filter((f) => f.selected);
  const selectedCount = selectedFiles.length;

  const reset = () => {
    files.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    setFiles([]);
    setGoal("");
    setTone("");
    setPlatform("tiktok");
    setDuration(30);
    setGenStep(0);
    setStep("upload");
  };

  const handleGenerate = async () => {
    if (!user || !goal || !tone || selectedCount === 0) return;
    setStep("generating");
    setGenStep(0);

    const iv = setInterval(
      () => setGenStep((s) => (s < GEN_STEPS.length - 1 ? s + 1 : s)),
      3500
    );

    try {
      // Upload selected files to Supabase Storage
      const uploadedUrls: string[] = [];
      for (const f of selectedFiles) {
        const ext = f.file.name.split(".").pop();
        const path = `${user.id}/user-media/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("videos").upload(path, f.file, { upsert: true });
        if (error) throw new Error("Media upload failed. Please try again.");
        const { data } = supabase.storage.from("videos").getPublicUrl(path);
        uploadedUrls.push(data.publicUrl);
      }

      // Build a synthetic interview transcript from goal + tone
      const conversationText = [
        `Interviewer: Tell me about your business — what do you do and who do you love helping?`,
        `Business owner: I run a business focused on helping my customers. I uploaded my own photos and videos that show my work.`,
        `Interviewer: What makes you different or special?`,
        `Business owner: My dedication to quality and my community. The media I've shared captures that authentically.`,
        `Interviewer: Tell me about a real customer moment.`,
        `Business owner: Every customer who walks away happy is a moment I'm proud of. My media shows real moments from my business.`,
        `Interviewer: How are you connected to your local community?`,
        `Business owner: We're rooted here. Every piece of media I've shared shows that local connection.`,
        `Interviewer: What feeling do you want people to have after watching?`,
        `Business owner: I want them to feel confident coming to us. My goal is to ${goal} and the tone should feel ${tone}.`,
      ].join("\n");

      genRef.current = generateAdvancedStory({
        data: {
          userId: user.id,
          conversationText,
          platform,
          duration,
          voiceStyle,
          userMediaUrls: uploadedUrls,
        },
      }).then((result: any) => {
        clearInterval(iv);
        if (result.voiceoverError) {
          toast.error(`No audio: ${result.voiceoverError}`, { duration: 8000 });
        }
        navigate({ to: "/dashboard/result/$videoId", params: { videoId: result.videoId } });
      }).catch((err: Error) => {
        clearInterval(iv);
        toast.error(err.message ?? "Generation failed. Please try again.");
        setStep("configure");
      });
    } catch (err: any) {
      clearInterval(iv);
      toast.error(err.message ?? "Upload failed.");
      setStep("configure");
    }
  };

  if (step === "generating") {
    return (
      <div className="max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="relative w-16 h-16 mb-6">
          <div className="absolute inset-0 rounded-2xl bg-[#38bdf8]/10 border border-[#38bdf8]/20" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-7 h-7 text-[#38bdf8] animate-spin" />
          </div>
        </div>
        <h2 className="font-serif font-bold text-xl text-white mb-2">Creating your story</h2>
        <p className="text-white/40 text-sm mb-6 max-w-xs">Building your video from {selectedCount} file{selectedCount !== 1 ? "s" : ""}.</p>
        <div className="w-full max-w-xs space-y-2">
          {GEN_STEPS.map((label, i) => (
            <div key={i} className={`flex items-center gap-2.5 text-sm transition-all ${i === genStep ? "text-[#38bdf8]" : i < genStep ? "text-white/30 line-through" : "text-white/20"}`}>
              {i < genStep ? (
                <Check className="w-3.5 h-3.5 flex-shrink-0" />
              ) : i === genStep ? (
                <Loader2 className="w-3.5 h-3.5 flex-shrink-0 animate-spin" />
              ) : (
                <span className="w-3.5 h-3.5 flex-shrink-0" />
              )}
              {label}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (step === "configure") {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.15em] text-[#38bdf8]/70 font-semibold mb-1">Upload Mode</p>
          <h1 className="font-serif font-bold text-xl text-white mb-1">Shape your story</h1>
          <p className="text-white/40 text-sm">{selectedCount} file{selectedCount !== 1 ? "s" : ""} ready</p>
        </div>

        <div>
          <p className="text-sm font-semibold text-white mb-3">Main goal</p>
          <div className="space-y-2">
            {GOALS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setGoal(id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all ${
                  goal === id
                    ? "bg-[#38bdf8]/10 border-[#38bdf8]/40 text-[#38bdf8]"
                    : "bg-[#0e0e12] border-white/[0.07] text-white/70 hover:border-white/20 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-medium">{label}</span>
                {goal === id && <Check className="w-4 h-4 ml-auto" />}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-white mb-3">Tone</p>
          <div className="grid grid-cols-2 gap-2.5">
            {TONES.map(({ id, label, desc }) => (
              <button
                key={id}
                onClick={() => setTone(id)}
                className={`flex flex-col items-start px-4 py-3.5 rounded-xl border text-left transition-all ${
                  tone === id
                    ? "bg-[#38bdf8]/10 border-[#38bdf8]/40"
                    : "bg-[#0e0e12] border-white/[0.07] hover:border-white/20"
                }`}
              >
                <span className={`text-sm font-semibold mb-0.5 ${tone === id ? "text-[#38bdf8]" : "text-white"}`}>{label}</span>
                <span className="text-[11px] text-white/35">{desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-white mb-3">Platform</p>
          <div className="grid grid-cols-2 gap-2">
            {PLATFORMS.map(({ id, label, ratio }) => (
              <button
                key={id}
                onClick={() => setPlatform(id)}
                className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all ${
                  platform === id
                    ? "bg-[#38bdf8]/10 border-[#38bdf8]/40 text-[#38bdf8]"
                    : "bg-[#0e0e12] border-white/[0.07] text-white/60 hover:border-white/20 hover:text-white"
                }`}
              >
                <span className="font-medium">{label}</span>
                <span className="text-[10px] font-mono opacity-60">{ratio}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-white mb-3">Video length</p>
          <div className="flex gap-2.5">
            {DURATIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setDuration(value)}
                className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all ${
                  duration === value
                    ? "bg-[#38bdf8]/10 border-[#38bdf8]/40 text-[#38bdf8]"
                    : "bg-[#0e0e12] border-white/[0.07] text-white/60 hover:border-white/20 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2.5">
          <button
            onClick={() => setStep("upload")}
            className="flex items-center gap-2 px-4 py-3.5 rounded-xl border border-white/[0.08] text-white/50 text-sm hover:text-white hover:border-white/20 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Back
          </button>
          <button
            onClick={handleGenerate}
            disabled={!goal || !tone}
            className="flex-1 flex items-center justify-center gap-2 bg-[#38bdf8] text-black text-sm font-bold py-3.5 rounded-xl hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none transition"
          >
            <Zap className="w-4 h-4" /> Generate Story
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div>
        <p className="text-[11px] uppercase tracking-[0.15em] text-[#38bdf8]/70 font-semibold mb-1">Upload Mode</p>
        <h1 className="font-serif font-bold text-xl text-white mb-1">Select your media</h1>
        <p className="text-white/40 text-sm">Your photos and videos become the story. Up to 12 files.</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {files.length === 0 ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-dashed border-white/[0.1] rounded-2xl py-14 flex flex-col items-center gap-3 hover:border-[#38bdf8]/40 hover:bg-[#38bdf8]/[0.03] transition group"
        >
          <div className="w-12 h-12 rounded-xl bg-[#38bdf8]/10 border border-[#38bdf8]/20 flex items-center justify-center group-hover:scale-105 transition">
            <Upload className="w-5 h-5 text-[#38bdf8]" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-white/70">Tap to select photos or videos</p>
            <p className="text-xs text-white/30 mt-1">JPG, PNG, MP4, MOV · Up to 12 files</p>
          </div>
        </button>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            {files.map((f) => (
              <div key={f.id} className="relative aspect-square rounded-xl overflow-hidden bg-[#0e0e12] border border-white/[0.07]">
                {f.type === "image" ? (
                  <img src={f.previewUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#111116]">
                    <Video className="w-6 h-6 text-white/30" />
                  </div>
                )}
                <button
                  onClick={() => toggleSelect(f.id)}
                  className={`absolute top-1.5 left-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                    f.selected ? "bg-[#38bdf8] border-[#38bdf8]" : "bg-black/40 border-white/40"
                  }`}
                >
                  {f.selected && <Check className="w-2.5 h-2.5 text-black" />}
                </button>
                <button
                  onClick={() => removeFile(f.id)}
                  className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/60 border border-white/20 flex items-center justify-center hover:bg-red-500/80 transition"
                >
                  <X className="w-2.5 h-2.5 text-white" />
                </button>
                {f.type === "video" && (
                  <div className="absolute bottom-1.5 left-1.5">
                    <span className="text-[9px] bg-black/60 text-white px-1.5 py-0.5 rounded font-medium">VID</span>
                  </div>
                )}
              </div>
            ))}
            {files.length < 12 && (
              <button
                onClick={() => inputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-white/[0.08] flex flex-col items-center justify-center gap-1 hover:border-white/20 transition text-white/30 hover:text-white/60"
              >
                <ImageIcon className="w-5 h-5" />
                <span className="text-[10px]">Add more</span>
              </button>
            )}
          </div>

          <div className="flex items-center justify-between px-1">
            <p className="text-xs text-white/40">{selectedCount} of {files.length} selected</p>
            <button onClick={() => inputRef.current?.click()} className="text-xs text-[#38bdf8]/70 hover:text-[#38bdf8] transition">
              + Add more
            </button>
          </div>

          <button
            onClick={() => setStep("configure")}
            disabled={selectedCount === 0}
            className="w-full flex items-center justify-center gap-2 bg-[#38bdf8] text-black text-sm font-bold py-4 rounded-xl hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none transition"
          >
            Continue <ArrowRight className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
}
