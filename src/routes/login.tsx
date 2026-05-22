import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { Play, ArrowRight, ArrowLeft, Loader2, Mail, Lock, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Log in — StoryLens AI" },
      { name: "description", content: "Sign in to your StoryLens AI account." },
    ],
  }),
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back");
    navigate({ to: "/dashboard" });
  };

  const handleGoogle = async () => {
    setOauthLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) {
      setOauthLoading(false);
      toast.error("Google sign-in failed");
    }
  };

  return (
    <AuthShell mode="login">
      <button
        onClick={handleGoogle}
        disabled={oauthLoading}
        className="w-full flex items-center justify-center gap-3 border border-white/15 text-white/90 text-sm px-4 py-3 rounded-full hover:bg-white/5 transition disabled:opacity-50"
      >
        {oauthLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <GoogleIcon />
        )}
        Continue with Google
      </button>

      <Divider />

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          icon={<Mail className="w-4 h-4" />}
          type="email"
          placeholder="you@business.com"
          value={email}
          onChange={setEmail}
          required
        />
        <Field
          icon={<Lock className="w-4 h-4" />}
          type="password"
          placeholder="Password"
          value={password}
          onChange={setPassword}
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="group w-full inline-flex items-center justify-center gap-2 bg-[#c8ff00] text-black text-[11px] tracking-[0.15em] uppercase font-bold px-5 py-3.5 rounded-full hover:brightness-110 disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Sign In <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" /></>}
        </button>
      </form>

      <p className="text-center text-sm text-white/40 mt-8">
        Don't have an account?{" "}
        <Link to="/signup" className="text-[#c8ff00] hover:underline">
          Sign up
        </Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ mode, children }: { mode: "login" | "signup"; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#070709] text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(200,255,0,0.08),transparent)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative max-w-[1400px] mx-auto px-5 sm:px-8 py-8 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 w-fit">
          <span className="w-8 h-8 rounded-lg bg-[#c8ff00] flex items-center justify-center">
            <Play className="w-4 h-4 text-black fill-black" />
          </span>
          <span className="font-serif font-bold text-white text-base">
            StoryLens<span className="text-[#c8ff00]"> AI</span>
          </span>
        </Link>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-white/50 hover:text-white text-sm transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
      </div>

      <div className="relative flex items-start justify-center px-5 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md bg-[#0a0a0d]/80 backdrop-blur-xl border border-white/8 rounded-2xl p-8 sm:p-10"
        >
          <div className="absolute" />
          <div className="flex items-center gap-2 mb-6">
            <Circle className="w-2 h-2 fill-[#c8ff00] text-[#c8ff00]" />
            <span className="text-[10px] tracking-[0.2em] text-white/50 uppercase">
              {mode === "login" ? "Welcome back" : "Get started"}
            </span>
          </div>
          <h1 className="font-serif font-bold text-3xl sm:text-4xl leading-tight mb-2">
            {mode === "login" ? (
              <>Sign in to <span className="italic text-[#c8ff00]">StoryLens</span></>
            ) : (
              <>Create your <span className="italic text-[#c8ff00]">account</span></>
            )}
          </h1>
          <p className="text-white/40 text-sm mb-8">
            {mode === "login"
              ? "Pick up where you left off."
              : "Start turning your business into stories people actually watch."}
          </p>
          {children}
        </motion.div>
      </div>
    </main>
  );
}

export function Field({
  icon,
  type,
  placeholder,
  value,
  onChange,
  required,
}: {
  icon: React.ReactNode;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">{icon}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full bg-white/[0.03] border border-white/10 rounded-full pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#c8ff00]/50 focus:bg-white/[0.05] transition"
      />
    </div>
  );
}

export function Divider() {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px bg-white/10" />
      <span className="text-[10px] tracking-[0.2em] text-white/30 uppercase">or</span>
      <div className="flex-1 h-px bg-white/10" />
    </div>
  );
}

export function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path fill="#EA4335" d="M12 5c1.6 0 3 .55 4.1 1.6L19 3.7C17.1 2 14.7 1 12 1 7.3 1 3.3 3.7 1.4 7.7l3.4 2.6C5.7 7.3 8.6 5 12 5z"/>
      <path fill="#4285F4" d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.2c-.3 1.5-1.1 2.7-2.4 3.6l3.7 2.9c2.2-2 3.5-5 3.5-8.6z"/>
      <path fill="#FBBC05" d="M4.8 14.3c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2L1.4 7.7C.5 9 0 10.4 0 12s.5 3 1.4 4.3l3.4-2z"/>
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7L15.6 17.4c-1 .7-2.3 1.1-3.6 1.1-3.4 0-6.3-2.3-7.3-5.4l-3.4 2.6C3.3 19.3 7.3 23 12 23z"/>
    </svg>
  );
}
