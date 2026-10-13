import { useState } from "react";
import {
  CalendarDays,
  Code2,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import type { Project } from "../services/projectsApi";

interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onOpen: (project: Project) => void;
}

export default function ProjectCard({
  project,
  onEdit,
  onDelete,
  onOpen,
}: ProjectCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const createdDate = new Date(project.createdAt).toLocaleDateString(
    undefined,
    { day: "numeric", month: "short", year: "numeric" },
  );

  return (
    <article className="group relative rounded-2xl border border-white/[0.08] bg-[#101110] p-5 transition-all duration-200 hover:-translate-y-1 hover:border-[#76B900]/30 hover:bg-[#121510]">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => onOpen(project)}
          aria-label={`Open ${project.name}`}
          className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#76B900]/20 bg-[#76B900]/10 text-[#76B900] transition-colors group-hover:bg-[#76B900]/15"
        >
          <Code2 size={23} />
        </button>

        <div className="relative">
          <button
            type="button"
            aria-label={`Options for ${project.name}`}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="rounded-lg p-2 text-neutral-500 hover:bg-white/[0.06] hover:text-white"
          >
            <MoreHorizontal size={20} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-10 z-20 w-36 rounded-xl border border-white/10 bg-[#171817] p-1 shadow-xl">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit(project);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-neutral-300 hover:bg-white/[0.06]"
              >
                <Pencil size={15} />
                Edit
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(project);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-400 hover:bg-red-400/10"
              >
                <Trash2 size={15} />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onOpen(project)}
        className="mt-5 block w-full text-left"
      >
        <h3 className="truncate text-base font-semibold text-white">
          {project.name}
        </h3>

        <p className="mt-2 min-h-[44px] text-sm leading-5 text-neutral-400">
          {project.description || "No description added yet."}
        </p>
      </button>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
        <span className="flex items-center gap-2 text-xs text-neutral-500">
          <CalendarDays size={14} />
          Created {createdDate}
        </span>

        <span className="rounded-full border border-[#76B900]/20 bg-[#76B900]/[0.08] px-2.5 py-1 text-[10px] font-medium text-[#9de33b]">
          Project
        </span>
      </div>
    </article>
  );
}
