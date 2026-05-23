import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState, useEffect, useCallback } from "react";
import {
  Upload, Film, CheckCircle2, Loader2, AlertCircle,
  ArrowRight, ArrowLeft, Wand2, Zap, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { analyzeMedia, type AngleOutput, type MediaAnalysis } from "@/functions/analyze-media";
import { generateVideo } from "@/functions/generate-video";
import {
  CONTENT_GOALS, PERSONAS, EMOTIONAL_ANGLES,
  type ContentGoalId, type PersonaId,
} from "@/lib/targeting";
import { VOICE_STYLES, type VoiceStyleId } from "@/lib/voice-styles";
import { getFriendlyError } from "@/lib/friendly-error";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/create")({
  component: CreatePage,
});

// ─── Step Progress Bar ────────────────────────────────────────

const STEPS = ["Upload", "Set Up", "Pick Angle"] as const;

function StepBar({ current }: { current: 0 | 1 | 2 }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
            i < current ? "text-[#c8ff00]" : i === current ? "text-white" : "text-white/25"
          }`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${
              i < current
                ? "bg-[#c8ff00] border-[#c8ff00] text-black"
                : i === current
                  ? "border-white text-white"
                  : "border-white/20 text-white/25"
            }`}>
              {i < current ? <CheckCircle2 className="w-3 h-3" /> : i + 1}
            </span>
            {label}
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-px w-8 transition-colors ${i < current ? "bg-[#c8ff00]/40" : "bg-white/10"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Step 1: Upload ───────────────────────────────────────────

function UploadStep({
  files, onFiles, onNext,
}: {
  files: File[];
  onFiles: (f: File[]) => void;
  onNext: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const addFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return;
    const valid = Array.from(incoming).filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
    );
    onFiles([...files, ...valid].slice(0, 5));
  }, [files, onFiles]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-6 max-w-xl">
      <StepBar current={0} />
      <div>
        <h1 className="font-serif font-bold text-2xl text-white mb-1">Upload your media</h1>
        <p className="text-white/40 text-sm">Photos or short videos of your product, service, or business. Up to 5 files.</p>
      </div>

      <div
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
          dragging ? "border-[#c8ff00] bg-[#c8ff00]/[0.04]" : "border-white/15 hover:border-white/30 bg-[#0e0e12]"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        <Upload className="w-8 h-8 text-white/20 mx-auto mb-3" />
        <p className="text-sm text-white/60 mb-1">Drag & drop or <span className="text-[#c8ff00]">browse files</span></p>
        <p className="text-xs text-white/25">JPG, PNG, WEBP, MP4 · Max 100MB per file</p>
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {files.map((file, i) => {
            const isImage = file.type.startsWith("image/");
            const preview = isImage ? URL.createObjectURL(file) : null;
            return (
              <div key={i} className="relative group bg-[#0e0e12] border border-white/[0.06] rounded-xl overflow-hidden aspect-square">
                {preview ? (
                  <img src={preview} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1.5">
                    <Film className="w-6 h-6 text-white/30" />
                    <span className="text-[10px] text-white/30 px-2 text-center truncate w-full">{file.name}</span>
                  </div>
                )}
                <button
                  className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  onClick={(e) => { e.stopPropagation(); onFiles(files.filter((_, fi) => fi !== i)); }}
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <button
        disabled={files.length === 0}
        onClick={onNext}
        className="w-full flex items-center justify-center gap-2 bg-[#c8ff00] text-black font-bold py-3.5 rounded-xl hover:brightness-110 transition disabled:opacity-30 disabled:cursor-not-allowed text-sm"
      >
        Continue <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Step 2: Configure ────────────────────────────────────────

const VIDEO_FORMATS = [
  { id: "portrait" as const,  label: "Portrait",  sub: "9:16  TikTok · Reels · Shorts",  icon: "📱" },
  { id: "landscape" as const, label: "Landscape", sub: "16:9  YouTube · Facebook",        icon: "🖥️" },
  { id: "square" as const,    label: "Square",    sub: "1:1   Instagram feed",            icon: "⬛" },
];

function ConfigureStep({
  businessType, onBusinessType,
  contentGoal, onContentGoal,
  personaId, onPersona,
  videoFormat, onVideoFormat,
  useOriginalAudio, onUseOriginalAudio,
  hasVideoFiles,
  onBack, onAnalyze, loading,
}: {
  businessType: string; onBusinessType: (v: string) => void;
  contentGoal: ContentGoalId | null; onContentGoal: (v: ContentGoalId) => void;
  personaId: PersonaId | null; onPersona: (v: PersonaId) => void;
  videoFormat: "portrait" | "landscape" | "square"; onVideoFormat: (v: "portrait" | "landscape" | "square") => void;
  useOriginalAudio: boolean; onUseOriginalAudio: (v: boolean) => void;
  hasVideoFiles: boolean;
  onBack: () => void; onAnalyze: () => void; loading: boolean;
}) {
  const canProceed = businessType.trim().length > 1 && contentGoal && personaId;

  return (
    <div className="space-y-7 max-w-xl">
      <StepBar current={1} />
      <div>
        <h1 className="font-serif font-bold text-2xl text-white mb-1">Set up your campaign</h1>
        <p className="text-white/40 text-sm">Tell the AI what you're selling and who you're targeting.</p>
      </div>

      {/* Business type */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-white/50 uppercase tracking-widest">Your Business</label>
        <input
          type="text"
          value={businessType}
          onChange={(e) => onBusinessType(e.target.value)}
          placeholder="e.g. Car mechanic, Fashion boutique, Dentist, Pizza restaurant..."
          className="w-full bg-[#0e0e12] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#c8ff00]/50 transition"
        />
      </div>

      {/* Content goal */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-white/50 uppercase tracking-widest">Content Goal</label>
        <div className="grid grid-cols-2 gap-3">
          {CONTENT_GOALS.map((goal) => (
            <button
              key={goal.id}
              onClick={() => onContentGoal(goal.id)}
              className={`p-4 rounded-xl border text-left transition-all ${
                contentGoal === goal.id
                  ? "border-[#c8ff00] bg-[#c8ff00]/[0.07]"
                  : "border-white/[0.07] bg-[#0e0e12] hover:border-white/20"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white">{goal.label}</span>
                {contentGoal === goal.id && <CheckCircle2 className="w-3.5 h-3.5 text-[#c8ff00]" />}
              </div>
              <p className="text-[11px] text-white/40 leading-snug">{goal.description}</p>
              <p className="text-[10px] text-white/25 mt-1 italic">{goal.tone}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Video format */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-white/50 uppercase tracking-widest">Video Format</label>
        <div className="grid grid-cols-3 gap-2">
          {VIDEO_FORMATS.map((f) => (
            <button
              key={f.id}
              onClick={() => onVideoFormat(f.id)}
              className={`p-3 rounded-xl border text-left transition-all ${
                videoFormat === f.id
                  ? "border-[#c8ff00] bg-[#c8ff00]/[0.07]"
                  : "border-white/[0.07] bg-[#0e0e12] hover:border-white/20"
              }`}
            >
              <div className="text-base mb-1">{f.icon}</div>
              <div className="text-xs font-bold text-white">{f.label}</div>
              <div className="text-[10px] text-white/30 leading-snug mt-0.5">{f.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Audio source — only show if user uploaded a video file */}
      {hasVideoFiles && (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-white/50 uppercase tracking-widest">Audio Source</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { val: false, icon: "🤖", label: "AI Voiceover", sub: "Generate voice from script" },
              { val: true,  icon: "🎬", label: "Keep Original", sub: "Use your video's audio" },
            ].map((opt) => (
              <button
                key={String(opt.val)}
                onClick={() => onUseOriginalAudio(opt.val)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  useOriginalAudio === opt.val
                    ? "border-[#c8ff00] bg-[#c8ff00]/[0.07]"
                    : "border-white/[0.07] bg-[#0e0e12] hover:border-white/20"
                }`}
              >
                <div className="text-base mb-1">{opt.icon}</div>
                <div className="text-xs font-bold text-white">{opt.label}</div>
                <div className="text-[10px] text-white/30 leading-snug mt-0.5">{opt.sub}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Persona picker */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-white/50 uppercase tracking-widest">Target Persona</label>
        <div className="grid grid-cols-1 gap-1.5 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
          {PERSONAS.map((p) => (
            <button
              key={p.id}
              onClick={() => onPersona(p.id as PersonaId)}
              className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                personaId === p.id
                  ? "border-[#c8ff00] bg-[#c8ff00]/[0.06]"
                  : "border-white/[0.06] bg-[#0e0e12] hover:border-white/15"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-white truncate">{p.label}</span>
                  {personaId === p.id && <CheckCircle2 className="w-3 h-3 text-[#c8ff00] flex-shrink-0" />}
                </div>
                <p className="text-[11px] text-white/35 leading-snug">{p.painPoint}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white px-4 py-3 rounded-xl border border-white/[0.07] hover:border-white/20 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        <button
          disabled={!canProceed || loading}
          onClick={onAnalyze}
          className="flex-1 flex items-center justify-center gap-2 bg-[#c8ff00] text-black font-bold py-3 rounded-xl hover:brightness-110 transition disabled:opacity-30 disabled:cursor-not-allowed text-sm"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {loading ? "Uploading..." : "Analyze & Generate"}
        </button>
      </div>
    </div>
  );
}

// ─── Step 3a: Analyzing (loading) ────────────────────────────

const ANALYSIS_MSGS = [
  "Scanning your media...",
  "Identifying visual elements...",
  "Building customer profile...",
  "Crafting psychological angles...",
  "Writing 5 scripts...",
];

function AnalyzingStep() {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIdx((i) => (i + 1) % ANALYSIS_MSGS.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center max-w-sm mx-auto space-y-6">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-2 border-[#c8ff00]/20 animate-ping" />
        <div className="w-16 h-16 rounded-full bg-[#c8ff00]/10 border border-[#c8ff00]/30 flex items-center justify-center">
          <Wand2 className="w-7 h-7 text-[#c8ff00]" />
        </div>
      </div>
      <div>
        <p className="text-white font-semibold text-sm mb-1 transition-all">{ANALYSIS_MSGS[msgIdx]}</p>
        <p className="text-white/30 text-xs">GPT-4o is analyzing your media</p>
      </div>
      <div className="flex gap-1">
        {ANALYSIS_MSGS.map((_, i) => (
          <div key={i} className={`h-1 rounded-full transition-all duration-500 ${
            i === msgIdx ? "w-6 bg-[#c8ff00]" : "w-1.5 bg-white/15"
          }`} />
        ))}
      </div>
    </div>
  );
}

// ─── Step 3b: Angles picker ───────────────────────────────────

function AnglesStep({
  angles, mediaAnalysis,
  selectedAngleId, onSelect,
  voiceStyle, onVoiceStyle,
  onBack, onGenerate, loading, error,
}: {
  angles: AngleOutput[];
  mediaAnalysis: MediaAnalysis | null;
  selectedAngleId: string | null;
  onSelect: (id: string) => void;
  voiceStyle: VoiceStyleId;
  onVoiceStyle: (v: VoiceStyleId) => void;
  onBack: () => void;
  onGenerate: () => void;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="space-y-6 max-w-xl">
      <StepBar current={2} />
      <div>
        <h1 className="font-serif font-bold text-2xl text-white mb-1">Pick your angle</h1>
        {mediaAnalysis && (
          <p className="text-white/40 text-sm">
            Detected: <span className="text-white/70">{mediaAnalysis.context}</span>
            {" · "}Pain point: <span className="text-white/70">{mediaAnalysis.pain_point}</span>
          </p>
        )}
      </div>

      <div className="space-y-3">
        {angles.map((angle) => {
          const meta = EMOTIONAL_ANGLES.find((a) => a.id === angle.id);
          const isSelected = selectedAngleId === angle.id;
          return (
            <button
              key={angle.id}
              onClick={() => onSelect(angle.id)}
              className={`w-full text-left p-4 rounded-2xl border transition-all ${
                isSelected
                  ? "border-[#c8ff00] bg-[#c8ff00]/[0.05]"
                  : "border-white/[0.07] bg-[#0e0e12] hover:border-white/20"
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">{meta?.emoji ?? "🎯"}</span>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                    style={{ backgroundColor: `${meta?.color ?? "#fff"}18`, color: meta?.color ?? "#fff" }}
                  >
                    {meta?.label ?? angle.id}
                  </span>
                </div>
                {isSelected && <CheckCircle2 className="w-4 h-4 text-[#c8ff00] flex-shrink-0 mt-0.5" />}
              </div>
              <p className="text-sm font-semibold text-white mb-1.5">{angle.headline}</p>
              <p className="text-xs text-[#c8ff00]/80 leading-snug mb-1">
                <span className="text-white/30">Hook: </span>{angle.hook}
              </p>
              <p className="text-xs text-white/40 leading-snug line-clamp-2">{angle.body}</p>
              <p className="text-[11px] text-white/25 mt-1.5 italic">CTA: {angle.cta}</p>
            </button>
          );
        })}
      </div>

      {/* Voice style */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-white/50 uppercase tracking-widest">Voice Style</label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.values(VOICE_STYLES) as typeof VOICE_STYLES[keyof typeof VOICE_STYLES][]).map((v) => (
            <button
              key={v.id}
              onClick={() => onVoiceStyle(v.id as VoiceStyleId)}
              className={`p-3 rounded-xl border text-left transition-all ${
                voiceStyle === v.id
                  ? "border-[#c8ff00] bg-[#c8ff00]/[0.06]"
                  : "border-white/[0.06] bg-[#0e0e12] hover:border-white/15"
              }`}
            >
              <p className="text-xs font-semibold text-white mb-0.5">{v.label}</p>
              <p className="text-[10px] text-white/35">{v.hint}</p>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white px-4 py-3 rounded-xl border border-white/[0.07] hover:border-white/20 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        <button
          disabled={!selectedAngleId || loading}
          onClick={onGenerate}
          className="flex-1 flex items-center justify-center gap-2 bg-[#c8ff00] text-black font-bold py-3 rounded-xl hover:brightness-110 transition disabled:opacity-30 disabled:cursor-not-allowed text-sm"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />}
          {loading ? "Generating..." : "Generate Video"}
        </button>
      </div>
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────

type WizardStep = "upload" | "configure" | "analyzing" | "angles" | "generating";

function CreatePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<WizardStep>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [businessType, setBusinessType] = useState("");
  const [contentGoal, setContentGoal] = useState<ContentGoalId | null>(null);
  const [personaId, setPersonaId] = useState<PersonaId | null>(null);
  const [voiceStyle, setVoiceStyle] = useState<VoiceStyleId>("warm");
  const [videoFormat, setVideoFormat] = useState<"portrait" | "landscape" | "square">("portrait");
  const [useOriginalAudio, setUseOriginalAudio] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [angles, setAngles] = useState<AngleOutput[]>([]);
  const [mediaAnalysis, setMediaAnalysis] = useState<MediaAnalysis | null>(null);
  const [selectedAngleId, setSelectedAngleId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFileToStorage = async (file: File, pid: string, idx: number): Promise<string> => {
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${user!.id}/${pid}/${idx}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("media")
      .upload(path, file, { upsert: true });
    if (upErr) throw upErr;
    const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(path);
    return publicUrl;
  };

  const handleAnalyze = async () => {
    if (!user || !contentGoal || !personaId) return;
    setUploading(true);
    setError(null);
    try {
      // 0. Ensure profile exists (defensive — never block on this)
      await supabase
        .from("profiles")
        .upsert({ id: user.id, updated_at: new Date().toISOString() }, { onConflict: "id", ignoreDuplicates: true })
        .then(({ error }) => { if (error) console.warn("[profile upsert]", error.message); });

      // 1. Create project
      const { data: project, error: pErr } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          business_type: businessType.trim() || null,
          content_goal: contentGoal,
          persona: personaId,
          status: "draft",
        })
        .select()
        .single();
      if (pErr || !project) throw new Error(pErr?.message ?? "Failed to create project");

      setProjectId(project.id);

      // 2. Upload files to storage + create upload records
      const uploadedUrls = await Promise.all(
        files.map((f, i) => uploadFileToStorage(f, project.id, i))
      );
      const uploadRows = uploadedUrls.map((url, i) => ({
        project_id: project.id,
        user_id: user.id,
        file_url: url,
        file_type: files[i].type.startsWith("video/") ? "video" : "image",
        mime_type: files[i].type,
        sort_order: i,
      }));
      const { error: ulErr } = await supabase.from("uploads").insert(uploadRows);
      if (ulErr) throw new Error(ulErr.message);

      setUploading(false);
      setStep("analyzing");

      // 3. Call AI analysis server function
      const result = await analyzeMedia({ data: { projectId: project.id } });
      setGenerationId(result.generationId);
      setAngles(result.angles);
      setMediaAnalysis(result.mediaAnalysis);
      setStep("angles");
    } catch (err) {
      const msg = getFriendlyError(err);
      setError(msg);
      toast.error(msg);
      setUploading(false);
      setStep("configure");
    }
  };

  const handleGenerate = async () => {
    if (!generationId || !selectedAngleId) return;
    setGenerating(true);
    setError(null);
    setStep("generating");
    try {
      await generateVideo({
        data: { generationId, selectedAngleId, voiceStyle, videoFormat, useOriginalAudio },
      });
      navigate({ to: "/dashboard/videos" });
    } catch (err) {
      const msg = getFriendlyError(err);
      setError(msg);
      toast.error(msg);
      setGenerating(false);
      setStep("angles");
    }
  };

  const centered = "w-full flex justify-center px-4 py-6";
  const inner = "w-full max-w-xl";

  if (step === "upload") {
    return (
      <div className={centered}>
        <div className={inner}>
          <UploadStep files={files} onFiles={setFiles} onNext={() => setStep("configure")} />
        </div>
      </div>
    );
  }

  if (step === "configure") {
    return (
      <div className={centered}>
        <div className={inner}>
          {error && (
            <div className="flex items-start gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {error}
            </div>
          )}
          <ConfigureStep
            businessType={businessType} onBusinessType={setBusinessType}
            contentGoal={contentGoal} onContentGoal={setContentGoal}
            personaId={personaId} onPersona={(id) => setPersonaId(id)}
            videoFormat={videoFormat} onVideoFormat={setVideoFormat}
            useOriginalAudio={useOriginalAudio} onUseOriginalAudio={setUseOriginalAudio}
            hasVideoFiles={files.some(f => f.type.startsWith("video/"))}
            onBack={() => setStep("upload")}
            onAnalyze={handleAnalyze}
            loading={uploading}
          />
        </div>
      </div>
    );
  }

  if (step === "analyzing") {
    return <AnalyzingStep />;
  }

  if (step === "angles") {
    return (
      <div className={centered}>
        <div className={inner}>
          <AnglesStep
            angles={angles}
            mediaAnalysis={mediaAnalysis}
            selectedAngleId={selectedAngleId}
            onSelect={setSelectedAngleId}
            voiceStyle={voiceStyle}
            onVoiceStyle={setVoiceStyle}
            onBack={() => setStep("configure")}
            onGenerate={handleGenerate}
            loading={generating}
            error={error}
          />
        </div>
      </div>
    );
  }

  // generating step
  return (
    <div className="w-full flex flex-col items-center justify-center py-20 text-center space-y-5">
      <div className="w-16 h-16 rounded-full bg-[#c8ff00]/10 border border-[#c8ff00]/30 flex items-center justify-center">
        <Loader2 className="w-7 h-7 text-[#c8ff00] animate-spin" />
      </div>
      <div>
        <p className="text-white font-semibold text-sm mb-1">Creating your video...</p>
        <p className="text-white/30 text-xs">Generating voiceover and rendering. This takes ~30 seconds.</p>
      </div>
    </div>
  );
}
