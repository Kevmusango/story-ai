import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Wand2,
  Film,
  Settings,
  LogOut,
  Play,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard", exact: true },
  { icon: Wand2, label: "Create", to: "/dashboard/create", exact: false },
  { icon: Film, label: "My Videos", to: "/dashboard/videos", exact: false },
];

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onMobileClose }: SidebarProps) {
  const { location } = useRouterState();
  const { signOut, displayName, user } = useAuth();
  const navigate = useNavigate();

  const isActive = (to: string, exact: boolean) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate({ to: "/login" });
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className={`flex items-center h-[60px] px-4 border-b border-white/[0.06] flex-shrink-0 ${collapsed ? "justify-center" : "justify-between"}`}>
        {!collapsed && (
          <Link to="/" className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-[#c8ff00] flex items-center justify-center flex-shrink-0">
              <Play className="w-3.5 h-3.5 text-black fill-black" />
            </span>
            <span className="font-serif font-bold text-white text-[15px] leading-none">
              AdEngine<span className="text-[#c8ff00]"> AI</span>
            </span>
          </Link>
        )}
        {collapsed && (
          <span className="w-7 h-7 rounded-lg bg-[#c8ff00] flex items-center justify-center">
            <Play className="w-3.5 h-3.5 text-black fill-black" />
          </span>
        )}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex w-7 h-7 rounded-md items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.06] transition flex-shrink-0"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
        <button
          onClick={onMobileClose}
          className="lg:hidden w-7 h-7 rounded-md flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.06] transition"
          aria-label="Close sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map(({ icon: Icon, label, to, exact }) => {
          const active = isActive(to, exact);
          return (
            <Link
              key={to}
              to={to}
              onClick={onMobileClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative ${
                active
                  ? "bg-[#c8ff00]/10 text-[#c8ff00]"
                  : "text-white/60 hover:text-white hover:bg-white/[0.05]"
              } ${collapsed ? "justify-center" : ""}`}
            >
              <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${active ? "text-[#c8ff00]" : ""}`} />
              {!collapsed && <span className="truncate">{label}</span>}
              {collapsed && (
                <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#1a1a1f] border border-white/10 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
                  {label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="flex-shrink-0 border-t border-white/[0.06] p-2 space-y-0.5">
        {!collapsed && (
          <div className="mx-1 mb-2 px-3 py-2.5 rounded-lg bg-[#c8ff00]/[0.07] border border-[#c8ff00]/15">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-[#c8ff00]" />
              <span className="text-[11px] font-semibold text-[#c8ff00] uppercase tracking-wider">Free Plan</span>
            </div>
            <p className="text-[11px] text-white/40 leading-snug">0 credits remaining</p>
            <Link
              to="/dashboard"
              className="mt-2 flex items-center justify-center w-full py-1.5 bg-[#c8ff00] text-black text-[11px] font-bold rounded-md hover:brightness-110 transition"
            >
              Upgrade
            </Link>
          </div>
        )}

        <Link
          to="/dashboard/settings"
          onClick={onMobileClose}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/[0.05] transition group relative ${collapsed ? "justify-center" : ""}`}
        >
          <Settings className="w-[18px] h-[18px] flex-shrink-0" />
          {!collapsed && <span>Settings</span>}
          {collapsed && (
            <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#1a1a1f] border border-white/10 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
              Settings
            </span>
          )}
        </Link>

        {!collapsed && (
          <div className="px-3 py-2 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#c8ff00]/20 border border-[#c8ff00]/30 flex items-center justify-center flex-shrink-0">
              <span className="text-[11px] font-bold text-[#c8ff00] uppercase">
                {displayName.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{displayName}</p>
              <p className="text-[10px] text-white/30 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="w-7 h-7 rounded-md flex items-center justify-center text-white/30 hover:text-white hover:bg-white/[0.06] transition flex-shrink-0"
              aria-label="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {collapsed && (
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center px-3 py-2.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.05] transition group relative"
            aria-label="Sign out"
          >
            <LogOut className="w-[18px] h-[18px]" />
            <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#1a1a1f] border border-white/10 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
              Sign out
            </span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full bg-[#0b0b0e] border-r border-white/[0.06] z-50 flex flex-col transition-all duration-300 ease-in-out
          lg:relative lg:translate-x-0 lg:flex
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${collapsed ? "lg:w-[68px]" : "lg:w-[248px]"}
          w-[280px]
        `}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

