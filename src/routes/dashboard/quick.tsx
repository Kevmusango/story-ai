import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { generateQuickStory } from "@/functions/generate-quick";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { VOICE_STYLES, type VoiceStyleId } from "@/lib/voice-styles";
import {
  Scissors, Sparkles, UtensilsCrossed, Coffee, Dumbbell,
  ShoppingBag, Home, Car, Heart, Package,
  Users, TrendingUp, Eye, Tag, Shield,
  ArrowLeft, ArrowRight, Zap, Check, Loader2,
  Globe, Link as LinkIcon,
} from "lucide-react";

export const Route = createFileRoute("/dashboard/quick")({
  component: QuickMode,
});

const BUSINESS_TYPES = [
  { id: "barbershop", label: "Barbershop", icon: Scissors },
  { id: "salon", label: "Hair Salon", icon: Sparkles },
  { id: "restaurant", label: "Restaurant", icon: UtensilsCrossed },
  { id: "cafe", label: "Café", icon: Coffee },
  { id: "gym", label: "Gym", icon: Dumbbell },
  { id: "clothing", label: "Clothing", icon: ShoppingBag },
  { id: "realestate", label: "Real Estate", icon: Home },
  { id: "auto", label: "Auto", icon: Car },
  { id: "medical", label: "Medical", icon: Heart },
  { id: "other", label: "Other", icon: Package },
];

const GOALS = [
  { id: "customers", label: "Get More Customers", desc: "Attract new people to your business", icon: Users },
  { id: "trust", label: "Build Trust", desc: "Show why customers can rely on you", icon: Shield },
  { id: "engagement", label: "More Engagement", desc: "Get people commenting and sharing", icon: TrendingUp },
  { id: "awareness", label: "More Awareness", desc: "Make more people know you exist", icon: Eye },
  { id: "offer", label: "Promote an Offer", desc: "Push a specific deal or promotion", icon: Tag },
];

const PLATFORMS = [
  { id: "tiktok", label: "TikTok", ratio: "9:16", dot: "#010101", border: "#ffffff20" },
  { id: "instagram_reels", label: "Reels", ratio: "9:16", dot: "#E1306C", border: "#E1306C30" },
  { id: "youtube_shorts", label: "Shorts", ratio: "9:16", dot: "#FF0000", border: "#FF000030" },
  { id: "facebook_reels", label: "Facebook", ratio: "9:16", dot: "#1877F2", border: "#1877F230" },
  { id: "youtube", label: "YouTube", ratio: "16:9", dot: "#FF0000", border: "#FF000030" },
  { id: "instagram_square", label: "Instagram", ratio: "1:1", dot: "#E1306C", border: "#E1306C30" },
];

const DURATIONS = [
  { value: 15, label: "15s", desc: "Quick hook" },
  { value: 30, label: "30s", desc: "Standard" },
  { value: 60, label: "60s", desc: "Full story" },
];

const GENERATING_STEPS = [
  "Understanding your business...",
  "Selecting story archetype...",
  "Writing your script...",
  "Finding visuals...",
  "Generating voiceover...",
  "Assembling your video...",
];

interface FormState {
  businessType: string;
  goal: string;
  platform: string;
  duration: number;
  voiceStyle: VoiceStyleId;
  businessName: string;
  websiteUrl: string;
}

function QuickMode() {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | "generating">(1);
  const [form, setForm] = useState<FormState>({
    businessType: "",
    goal: "",
    platform: "",
    duration: 30,
    voiceStyle: "warm",
    businessName: "",
    websiteUrl: "",
  });
  const { user } = useAuth();
  const navigate = useNavigate();
  const generationRef = useRef<Promise<unknown> | null>(null);

  const set = (key: keyof FormState, value: string | number) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleGenerate = () => {
    if (!user) { toast.error("Please sign in"); return; }
    setStep("generating");
    generationRef.current = generateQuickStory({
      data: {
        userId: user.id,
        businessType: form.businessType,
        goal: form.goal,
        platform: form.platform,
        duration: form.duration,
        businessName: form.businessName,
        websiteUrl: form.websiteUrl,
        voiceStyle: form.voiceStyle,
      },
    })
      .then((result: any) => {
        if (result.voiceoverError) {
          toast.error(`No audio: ${result.voiceoverError}`, { duration: 8000 });
        }
        navigate({ to: "/dashboard/result/$videoId", params: { videoId: result.videoId } });
      })
      .catch((err: Error) => {
        toast.error(err.message ?? "Generation failed. Please try again.");
        setStep(4);
      });
  };

  if (step === "generating") return <GeneratingScreen />;

  const totalSteps = 4;
  const currentStep = step as number;
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => step > 1 ? setStep((s) => (s as number) - 1 as any) : undefined}
            className={`flex items-center gap-1.5 text-sm font-medium transition ${step > 1 ? "text-white/60 hover:text-white" : "text-white/20 pointer-events-none"}`}
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <span className="text-xs text-white/30 font-medium tracking-wide">Step {currentStep} of {totalSteps}</span>
          <span className="w-16" />
        </div>
        <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#c8ff00] rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {step === 1 && (
        <Step1
          selected={form.businessType}
          onSelect={(v) => { set("businessType", v); setStep(2); }}
        />
      )}
      {step === 2 && (
        <Step2
          selected={form.goal}
          onSelect={(v) => { set("goal", v); setStep(3); }}
        />
      )}
      {step === 3 && (
        <Step3
          platform={form.platform}
          duration={form.duration}
          voiceStyle={form.voiceStyle}
          onPlatform={(v) => set("platform", v)}
          onDuration={(v) => set("duration", v)}
          onVoiceStyle={(v) => set("voiceStyle", v)}
          onNext={() => setStep(4)}
        />
      )}
      {step === 4 && (
        <Step4
          form={form}
          onChange={set}
          onGenerate={handleGenerate}
        />
      )}
    </div>
  );
}

function Step1({ selected, onSelect }: { selected: string; onSelect: (v: string) => void }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.15em] text-[#c8ff00]/70 font-semibold mb-2">Quick Mode</p>
      <h2 className="font-serif font-bold text-xl sm:text-2xl text-white mb-1">What type of business?</h2>
      <p className="text-white/40 text-sm mb-6">Select the one that best describes you.</p>
      <div className="grid grid-cols-2 gap-2.5">
        {BUSINESS_TYPES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all ${
              selected === id
                ? "bg-[#c8ff00]/10 border-[#c8ff00]/40 text-[#c8ff00]"
                : "bg-[#0e0e12] border-white/[0.07] text-white/70 hover:border-white/20 hover:text-white"
            }`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Step2({ selected, onSelect }: { selected: string; onSelect: (v: string) => void }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.15em] text-[#c8ff00]/70 font-semibold mb-2">Quick Mode</p>
      <h2 className="font-serif font-bold text-xl sm:text-2xl text-white mb-1">What is your main goal?</h2>
      <p className="text-white/40 text-sm mb-6">This shapes the story angle and message.</p>
      <div className="space-y-2.5">
        {GOALS.map(({ id, label, desc, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl border text-left transition-all ${
              selected === id
                ? "bg-[#c8ff00]/10 border-[#c8ff00]/40"
                : "bg-[#0e0e12] border-white/[0.07] hover:border-white/20"
            }`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${selected === id ? "bg-[#c8ff00]/20" : "bg-white/[0.05]"}`}>
              <Icon className={`w-4 h-4 ${selected === id ? "text-[#c8ff00]" : "text-white/50"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${selected === id ? "text-[#c8ff00]" : "text-white"}`}>{label}</p>
              <p className="text-xs text-white/40 mt-0.5">{desc}</p>
            </div>
            {selected === id && <Check className="w-4 h-4 text-[#c8ff00] flex-shrink-0" />}
          </button>
        ))}
      </div>
    </div>
  );
}

function Step3({ platform, duration, voiceStyle, onPlatform, onDuration, onVoiceStyle, onNext }: {
  platform: string; duration: number; voiceStyle: VoiceStyleId;
  onPlatform: (v: string) => void; onDuration: (v: number) => void;
  onVoiceStyle: (v: VoiceStyleId) => void; onNext: () => void;
}) {
  const canContinue = !!platform;
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.15em] text-[#c8ff00]/70 font-semibold mb-2">Quick Mode</p>
      <h2 className="font-serif font-bold text-xl sm:text-2xl text-white mb-1">Where will you post it?</h2>
      <p className="text-white/40 text-sm mb-5">Choose your platform and video length.</p>

      <div className="grid grid-cols-2 gap-2.5 mb-6">
        {PLATFORMS.map(({ id, label, ratio, dot, border }) => (
          <button
            key={id}
            onClick={() => onPlatform(id)}
            className={`relative flex flex-col items-start gap-2 px-3.5 py-3.5 rounded-xl border text-left transition-all ${
              platform === id ? "bg-[#0e0e12] border-white/30" : "bg-[#0e0e12] border-white/[0.07] hover:border-white/20"
            }`}
            style={platform === id ? { borderColor: dot } : {}}
          >
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: dot === "#010101" ? "#ffffff" : dot }} />
              <span className={`text-sm font-semibold ${platform === id ? "text-white" : "text-white/70"}`}>{label}</span>
            </div>
            <span className="text-[10px] font-mono text-white/30 bg-white/[0.05] px-1.5 py-0.5 rounded">{ratio}</span>
            {platform === id && <Check className="absolute top-2.5 right-2.5 w-3.5 h-3.5 text-[#c8ff00]" />}
          </button>
        ))}
      </div>

      <p className="text-sm font-semibold text-white mb-3">Video length</p>
      <div className="grid grid-cols-3 gap-2.5 mb-6">
        {DURATIONS.map(({ value, label, desc }) => (
          <button
            key={value}
            onClick={() => onDuration(value)}
            className={`flex flex-col items-center gap-0.5 px-3 py-3.5 rounded-xl border transition-all ${
              duration === value
                ? "bg-[#c8ff00]/10 border-[#c8ff00]/40 text-[#c8ff00]"
                : "bg-[#0e0e12] border-white/[0.07] text-white/60 hover:border-white/20 hover:text-white"
            }`}
          >
            <span className="text-base font-bold">{label}</span>
            <span className={`text-[10px] ${duration === value ? "text-[#c8ff00]/60" : "text-white/30"}`}>{desc}</span>
          </button>
        ))}
      </div>

      <p className="text-sm font-semibold text-white mb-3">Voice style</p>
      <div className="grid grid-cols-2 gap-2.5 mb-6">
        {(Object.values(VOICE_STYLES) as typeof VOICE_STYLES[VoiceStyleId][]).map((vs) => (
          <button
            key={vs.id}
            onClick={() => onVoiceStyle(vs.id)}
            className={`flex flex-col items-start px-4 py-3.5 rounded-xl border text-left transition-all ${
              voiceStyle === vs.id
                ? "bg-[#c8ff00]/10 border-[#c8ff00]/40"
                : "bg-[#0e0e12] border-white/[0.07] hover:border-white/20"
            }`}
          >
            <span className={`text-sm font-semibold mb-0.5 ${
              voiceStyle === vs.id ? "text-[#c8ff00]" : "text-white"
            }`}>{vs.label}</span>
            <span className="text-[11px] text-white/35">{vs.hint}</span>
          </button>
        ))}
      </div>

      <button
        onClick={onNext}
        disabled={!canContinue}
        className="w-full flex items-center justify-center gap-2 bg-[#c8ff00] text-black text-sm font-bold py-4 rounded-xl hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none transition"
      >
        Continue <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function Step4({ form, onChange, onGenerate }: {
  form: FormState; onChange: (k: keyof FormState, v: string | number) => void; onGenerate: () => void;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.15em] text-[#c8ff00]/70 font-semibold mb-2">Quick Mode</p>
      <h2 className="font-serif font-bold text-xl sm:text-2xl text-white mb-1">Almost there</h2>
      <p className="text-white/40 text-sm mb-6">These details are optional but make the story more specific.</p>

      <div className="space-y-3 mb-6">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">
            <Globe className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Business name (optional)"
            value={form.businessName}
            onChange={(e) => onChange("businessName", e.target.value)}
            className="w-full bg-[#0e0e12] border border-white/[0.08] rounded-xl pl-11 pr-4 py-4 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#c8ff00]/40 transition"
          />
        </div>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">
            <LinkIcon className="w-4 h-4" />
          </span>
          <input
            type="url"
            placeholder="Website, Facebook or Instagram URL (optional)"
            value={form.websiteUrl}
            onChange={(e) => onChange("websiteUrl", e.target.value)}
            className="w-full bg-[#0e0e12] border border-white/[0.08] rounded-xl pl-11 pr-4 py-4 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#c8ff00]/40 transition"
          />
        </div>
      </div>

      <div className="bg-[#0e0e12] border border-white/[0.06] rounded-xl p-4 mb-6 space-y-2">
        <p className="text-[11px] text-white/30 uppercase tracking-wider font-semibold mb-3">Your story summary</p>
        <SummaryRow label="Business" value={BUSINESS_TYPES.find((b) => b.id === form.businessType)?.label ?? ""} />
        <SummaryRow label="Goal" value={GOALS.find((g) => g.id === form.goal)?.label ?? ""} />
        <SummaryRow label="Platform" value={PLATFORMS.find((p) => p.id === form.platform)?.label ?? ""} />
        <SummaryRow label="Length" value={`${form.duration} seconds`} />
        <SummaryRow label="Voice" value={VOICE_STYLES[form.voiceStyle]?.label ?? ""} />
      </div>

      <button
        onClick={onGenerate}
        className="w-full flex items-center justify-center gap-2.5 bg-[#c8ff00] text-black text-sm font-bold py-4 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all"
      >
        <Zap className="w-4 h-4 fill-black" />
        Generate My Story
      </button>
      <p className="text-center text-[11px] text-white/20 mt-3">Takes about 60 seconds · No editing required</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-white/40">{label}</span>
      <span className="text-xs font-medium text-white">{value}</span>
    </div>
  );
}

function GeneratingScreen() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((s) => {
        if (s < GENERATING_STEPS.length - 1) {
          setCompleted((c) => [...c, s]);
          return s + 1;
        }
        return s;
      });
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-[#c8ff00]/10 border border-[#c8ff00]/20 flex items-center justify-center mb-6">
        <Loader2 className="w-7 h-7 text-[#c8ff00] animate-spin" />
      </div>
      <h2 className="font-serif font-bold text-xl text-white mb-2">Creating your story</h2>
      <p className="text-white/40 text-sm mb-8">AI is working on it. This takes about 60 seconds.</p>

      <div className="w-full max-w-sm space-y-3 text-left">
        {GENERATING_STEPS.map((label, i) => {
          const isDone = completed.includes(i);
          const isActive = currentStep === i;
          return (
            <div key={i} className={`flex items-center gap-3 transition-all ${i > currentStep ? "opacity-20" : ""}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                isDone ? "bg-[#c8ff00]" : isActive ? "border-2 border-[#c8ff00]" : "border border-white/15"
              }`}>
                {isDone ? <Check className="w-3 h-3 text-black" /> : isActive ? <Loader2 className="w-3 h-3 text-[#c8ff00] animate-spin" /> : null}
              </div>
              <span className={`text-sm ${isDone ? "text-white/50 line-through" : isActive ? "text-white font-medium" : "text-white/30"}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

