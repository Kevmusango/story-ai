import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";

export const Route = createFileRoute("/dashboard/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif font-bold text-2xl text-white">Settings</h1>
        <p className="text-white/40 text-sm mt-1">Manage your account and preferences.</p>
      </div>

      <div className="flex flex-col items-center justify-center py-20 px-4 bg-[#0e0e12] border border-white/[0.06] rounded-2xl text-center">
        <div className="w-14 h-14 rounded-full bg-white/[0.04] flex items-center justify-center mb-4">
          <Settings className="w-6 h-6 text-white/20" />
        </div>
        <p className="text-sm font-medium text-white/50">Settings coming soon</p>
        <p className="text-xs text-white/25 mt-1">Profile, billing, and notification preferences.</p>
      </div>
    </div>
  );
}
