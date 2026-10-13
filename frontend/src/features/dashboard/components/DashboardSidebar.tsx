import {
  Activity,
  Bot,
  Code2,
  FolderKanban,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";

interface DashboardSidebarProps {
  open: boolean;
  onClose: () => void;
}

const navigation = [
  { label: "Overview", path: "/devmind/dashboard", icon: LayoutDashboard },
  { label: "Projects", path: "/devmind/projects", icon: FolderKanban },
  { label: "Code Analysis", path: "/devmind/code-analysis", icon: Code2 },
  { label: "AI Assistant", path: "/devmind/assistant", icon: Bot },
  { label: "Security", path: "/devmind/security", icon: ShieldCheck },
  { label: "Activity", path: "/devmind/activity", icon: Activity },
];

export default function DashboardSidebar({
  open,
  onClose,
}: DashboardSidebarProps) {
  const navigate = useNavigate();

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/70 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-white/8 bg-[#090A09] transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-[76px] items-center justify-between border-b border-white/8] px-6">
          <button
            type="button"
            onClick={() => navigate("/devmind/dashboard")}
            className="flex items-center gap-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#76B900] text-black">
              <Code2 size={22} strokeWidth={2.5} />
            </div>

            <span className="text-xl font-semibold tracking-tight text-white">
              Dev<span className="text-[#76B900]">Mind</span>
            </span>
          </button>

          <button
            type="button"
            aria-label="Close sidebar"
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-400 hover:bg-white/5 lg:hidden"
          >
            <X size={19} />
          </button>
        </div>

        <div className="px-4 pt-7">
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-600">
            Workspace
          </p>

          <nav className="space-y-1">
            {navigation.map(({ label, path, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                onClick={onClose}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors ${
                    isActive
                      ? "border border-[#76B900]/20 bg-[#76B900]/10 font-medium text-[#76B900]"
                      : "text-neutral-400 hover:bg-white/[0.04] hover:text-white"
                  }`
                }
              >
                <Icon size={18} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-4">
          <div className="rounded-2xl border border-[#76B900]/15 bg-[#76B900]/[0.05] p-4">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[#76B900]/10">
              <Bot size={19} className="text-[#76B900]" />
            </div>

            <p className="text-sm font-medium text-white">
              Build smarter with AI
            </p>

            <p className="mt-2 text-xs leading-5 text-neutral-400">
              Understand code issues and improve your development workflow.
            </p>

            <button
              type="button"
              onClick={() => navigate("/devmind/code-analysis")}
              className="mt-4 w-full rounded-lg bg-[#76B900] px-3 py-2.5 text-xs font-semibold text-black transition-colors hover:bg-[#8bd500]"
            >
              Explore analysis
            </button>
          </div>

          <NavLink
            to="/devmind/settings"
            onClick={onClose}
            className="mt-4 flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-neutral-400 transition-colors hover:bg-white/4 hover:text-white"
          >
            <Settings size={18} />
            Settings
          </NavLink>

          <p className="mt-4 px-3 text-[10px] text-neutral-600">
            DEVMIND · DEVELOPER WORKSPACE
          </p>
        </div>
      </aside>
    </>
  );
}
