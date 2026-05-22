import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Loader2, Mail, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AuthShell, Field, Divider, GoogleIcon } from "./login";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
  head: () => ({
    meta: [
      { title: "Sign up — StoryLens AI" },
      { name: "description", content: "Create your StoryLens AI account and turn your business into cinematic story videos." },
    ],
  }),
});

function SignupPage() {
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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) {
      toast.success("Account created");
      navigate({ to: "/dashboard" });
    } else {
      toast.success("Check your inbox to confirm your email");
    }
  };

  const handleGoogle = async () => {
    setOauthLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setOauthLoading(false);
      toast.error("Google sign-in failed");
    }
  };

  return (
    <AuthShell mode="signup">
      <button
        onClick={handleGoogle}
        disabled={oauthLoading}
        className="w-full flex items-center justify-center gap-3 border border-white/15 text-white/90 text-sm px-4 py-3 rounded-full hover:bg-white/5 transition disabled:opacity-50"
      >
        {oauthLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon />}
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
          placeholder="Create a password (min 6 chars)"
          value={password}
          onChange={setPassword}
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="group w-full inline-flex items-center justify-center gap-2 bg-[#c8ff00] text-black text-[11px] tracking-[0.15em] uppercase font-bold px-5 py-3.5 rounded-full hover:brightness-110 disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Create Account <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" /></>}
        </button>
      </form>

      <p className="text-[10px] tracking-[0.15em] text-white/30 uppercase text-center mt-5">
        First story free · Cancel anytime
      </p>

      <p className="text-center text-sm text-white/40 mt-6">
        Already have an account?{" "}
        <Link to="/login" className="text-[#c8ff00] hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
