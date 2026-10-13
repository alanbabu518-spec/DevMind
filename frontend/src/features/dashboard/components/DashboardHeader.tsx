import { Bell, Menu, Search } from "lucide-react";

interface DashboardHeaderProps {
  onMenuClick: () => void;
}

export default function DashboardHeader({ onMenuClick }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between gap-4 border-b border-white/[0.08] bg-[#090A09]/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          aria-label="Open navigation"
          onClick={onMenuClick}
          className="rounded-xl border border-white/10 p-2 text-neutral-400 hover:bg-white/5 hover:text-white lg:hidden"
        >
          <Menu size={20} />
        </button>

        <div className="min-w-0">
          <p className="text-xs text-neutral-500">Workspace</p>
          <h1 className="truncate text-sm font-semibold text-white sm:text-base">
            Developer Overview
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 md:flex">
          <Search size={16} className="text-neutral-500" />
          <span className="text-xs text-neutral-500">Search workspace</span>
          <kbd className="ml-5 rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-neutral-500">
            Ctrl K
          </kbd>
        </div>

        <button
          type="button"
          aria-label="Notifications"
          title="Notifications"
          className="relative rounded-xl border border-white/10 p-2.5 text-neutral-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <Bell size={18} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#76B900]" />
        </button>

        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#76B900]/30 bg-[#76B900]/10 text-sm font-semibold text-[#76B900]">
          D
        </div>
      </div>
    </header>
  );
}
