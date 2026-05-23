import { useRouterState, Link } from "@tanstack/react-router";
import { Menu, Bell, ChevronDown, LogOut, Settings, User } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/quick": "Quick Video",
  "/dashboard/advanced": "Advanced Mode",
  "/dashboard/upload": "Upload Mode",
  "/dashboard/videos": "My Videos",
  "/dashboard/settings": "Settings",
};

interface TopBarProps {
  onMobileMenuOpen: () => void;
}

export function TopBar({ onMobileMenuOpen }: TopBarProps) {
  const { location } = useRouterState();
  const { user, displayName, signOut } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pageTitle = PAGE_TITLES[location.pathname] ?? "Storyline";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setDropdownOpen(false);
    await signOut();
    toast.success("Signed out");
    navigate({ to: "/login" });
  };

  return (
    <header className="sticky top-0 z-30 h-[60px] bg-[#0b0b0e]/90 backdrop-blur-md border-b border-white/[0.06] flex items-center px-4 gap-3 flex-shrink-0">
      <button
        onClick={onMobileMenuOpen}
        className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.06] transition flex-shrink-0"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-semibold text-white truncate">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="w-9 h-9 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.06] transition relative"
          aria-label="Notifications"
        >
          <Bell className="w-4.5 h-4.5" />
        </button>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-2 h-9 pl-1 pr-2 rounded-lg hover:bg-white/[0.06] transition"
            aria-label="User menu"
          >
            <div className="w-7 h-7 rounded-full bg-[#c8ff00]/20 border border-[#c8ff00]/30 flex items-center justify-center flex-shrink-0">
              <span className="text-[11px] font-bold text-[#c8ff00] uppercase">
                {displayName.charAt(0)}
              </span>
            </div>
            <span className="hidden sm:block text-sm text-white/70 max-w-[100px] truncate">
              {displayName}
            </span>
            <ChevronDown
              className={`hidden sm:block w-3.5 h-3.5 text-white/30 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
            />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-[#111116] border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-white/[0.06]">
                <p className="text-xs font-semibold text-white truncate">{displayName}</p>
                <p className="text-[11px] text-white/40 truncate mt-0.5">{user?.email}</p>
              </div>
              <div className="p-1.5 space-y-0.5">
                <Link
                  to="/dashboard"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/[0.05] rounded-lg transition"
                >
                  <User className="w-4 h-4" />
                  Profile
                </Link>
                <Link
                  to="/dashboard/settings"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/[0.05] rounded-lg transition"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
              </div>
              <div className="p-1.5 border-t border-white/[0.06]">
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/[0.05] rounded-lg transition"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

