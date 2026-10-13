import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
}

export default function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: StatCardProps) {
  return (
    <article className="rounded-2xl border border-white/8 bg-[#101110] p-5 transition-colors hover:border-[#76B900]/30">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-neutral-400">{title}</p>
        <div className="rounded-xl border border-[#76B900]/20 bg-[#76B900]/10 p-2">
          <Icon size={18} className="text-[#76B900]" />
        </div>
      </div>

      <p className="mt-5 text-3xl font-semibold tracking-tight text-white">
        {value}
      </p>

      <p className="mt-2 text-xs text-neutral-500">{description}</p>
    </article>
  );
}