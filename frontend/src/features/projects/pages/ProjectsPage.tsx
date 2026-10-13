import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  FolderKanban,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardHeader from "../../dashboard/components/DashboardHeader";
import DashboardSidebar from "../../dashboard/components/DashboardSidebar";
import ProjectCard from "../components/ProjectCard";
import { projectsApi, type Project } from "../services/projectsApi";

type ProjectInput = {
  name: string;
  description: string;
};

export default function ProjectsPage() {
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [form, setForm] = useState<ProjectInput>({
    name: "",
    description: "",
  });

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await projectsApi.list();
      setProjects(result.projects);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load projects.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const openCreateModal = () => {
    setEditingProject(null);
    setForm({ name: "", description: "" });
    setError("");
    setModalOpen(true);
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setForm({
      name: project.name,
      description: project.description ?? "",
    });
    setError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingProject(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = form.name.trim();
    const description = form.description.trim();

    if (!name) {
      setError("Enter a project name.");
      return;
    }

    if (name.length > 100) {
      setError("Project name cannot exceed 100 characters.");
      return;
    }

    if (description.length > 1000) {
      setError("Description cannot exceed 1000 characters.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (editingProject) {
        const result = await projectsApi.update(editingProject.id, {
          name,
          description: description || null,
        });

        setProjects((current) =>
          current.map((project) =>
            project.id === result.project.id ? result.project : project,
          ),
        );

        setSelectedProject((current) =>
          current?.id === result.project.id ? result.project : current,
        );
      } else {
        const result = await projectsApi.create({
          name,
          description: description || null,
        });

        setProjects((current) => [
          result.project,
          ...current.filter((project) => project.id !== result.project.id),
        ]);
      }

      setModalOpen(false);
      setEditingProject(null);
      setForm({ name: "", description: "" });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save the project.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (project: Project) => {
    const confirmed = window.confirm(
      `Delete "${project.name}"? This action cannot be undone.`,
    );

    if (!confirmed) return;

    setError("");

    try {
      await projectsApi.delete(project.id);

      setProjects((current) =>
        current.filter((item) => item.id !== project.id),
      );

      setSelectedProject((current) =>
        current?.id === project.id ? null : current,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to delete the project.",
      );
    }
  };

  const filteredProjects = projects.filter((project) => {
    const query = search.trim().toLowerCase();

    return (
      project.name.toLowerCase().includes(query) ||
      (project.description ?? "").toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-[#090A09] text-white">
      <DashboardSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="min-h-screen lg:pl-65">
        <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />

        <main className="mx-auto max-w-[1600px] px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
          <button
            type="button"
            onClick={() => navigate("/devmind/dashboard")}
            className="mb-6 inline-flex items-center gap-2 text-sm text-neutral-500 transition-colors hover:text-[#76B900]"
          >
            <ArrowLeft size={16} />
            Back to dashboard
          </button>

          <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-[#76B900]">
                <FolderKanban size={15} />
                Workspace
              </div>

              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Your projects
              </h2>

              <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-400">
                Organize your codebases and prepare them for code quality,
                security and AI-powered analysis.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#76B900] px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#8bd500]"
            >
              <Plus size={18} />
              New project
            </button>
          </section>

          <section className="mt-8 rounded-2xl border border-white/8 bg-[#101110] p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-white">
                  Project workspace
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  {loading
                    ? "Loading your projects..."
                    : `${projects.length} ${projects.length === 1 ? "project" : "projects"} in your workspace`}
                </p>
              </div>

              <div className="flex gap-2">
                <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 sm:w-72 sm:flex-none">
                  <Search size={17} className="shrink-0 text-neutral-500" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search projects..."
                    aria-label="Search projects"
                    className="w-full bg-transparent py-3 text-sm text-white outline-none placeholder:text-neutral-600"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => void loadProjects()}
                  disabled={loading}
                  aria-label="Refresh projects"
                  title="Refresh projects"
                  className="rounded-xl border border-white/10 px-3 text-neutral-400 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50"
                >
                  <RefreshCw
                    size={17}
                    className={loading ? "animate-spin" : ""}
                  />
                </button>
              </div>
            </div>
          </section>

          {error && !modalOpen && (
            <div
              role="alert"
              className="mt-5 flex flex-col gap-3 rounded-xl border border-red-500/20 bg-red-500/6 p-4 text-sm text-red-300 sm:flex-row sm:items-center sm:justify-between"
            >
              <p>{error}</p>
              <button
                type="button"
                onClick={() => void loadProjects()}
                className="self-start font-medium underline underline-offset-4 sm:self-auto"
              >
                Retry
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex min-h-64 items-center justify-center">
              <div className="flex items-center gap-3 text-sm text-neutral-400">
                <LoaderCircle
                  size={20}
                  className="animate-spin text-[#76B900]"
                />
                Loading projects...
              </div>
            </div>
          ) : filteredProjects.length > 0 ? (
            <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onEdit={openEditModal}
                  onDelete={(item) => void handleDelete(item)}
                  onOpen={setSelectedProject}
                />
              ))}
            </section>
          ) : (
            <section className="mt-6 flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-white/12 bg-white/15 px-6 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#76B900]/20 bg-[#76B900]/10">
                <FolderKanban size={26} className="text-[#76B900]" />
              </div>

              <h3 className="mt-5 text-lg font-semibold">
                {search ? "No matching projects" : "Start your first project"}
              </h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-neutral-500">
                {search
                  ? "Try another search term."
                  : "Create a project to organize your work and prepare your code for analysis."}
              </p>

              {!search && (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#76B900] px-4 py-2.5 text-sm font-semibold text-black hover:bg-[#8bd500]"
                >
                  <Plus size={17} />
                  Create your first project
                </button>
              )}
            </section>
          )}

          <footer className="mt-10 border-t border-white/6 py-5 text-center text-xs text-neutral-600">
            DevMind · Project workspace
          </footer>
        </main>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-modal-title"
            className="my-auto w-full max-w-lg rounded-2xl border border-white/10 bg-[#101110] p-5 shadow-2xl sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="project-modal-title" className="text-xl font-semibold">
                  {editingProject ? "Edit project" : "Create a project"}
                </h3>
                <p className="mt-2 text-sm text-neutral-400">
                  Give your project a name and a short description.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close dialog"
                className="rounded-lg p-2 text-neutral-400 hover:bg-white/5 hover:text-white"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="project-name"
                  className="mb-2 block text-sm font-medium text-neutral-300"
                >
                  Project name <span className="text-[#76B900]">*</span>
                </label>

                <input
                  id="project-name"
                  autoFocus
                  required
                  maxLength={100}
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="e.g. DevMind AI Platform"
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-neutral-600 focus:border-[#76B900]/60"
                />

                <p className="mt-1 text-right text-[11px] text-neutral-600">
                  {form.name.length}/100
                </p>
              </div>

              <div>
                <label
                  htmlFor="project-description"
                  className="mb-2 block text-sm font-medium text-neutral-300"
                >
                  Description
                </label>

                <textarea
                  id="project-description"
                  rows={4}
                  maxLength={1000}
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="What are you building?"
                  className="w-full resize-y rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white outline-none transition-colors placeholder:text-neutral-600 focus:border-[#76B900]/60"
                />

                <p className="mt-1 text-right text-[11px] text-neutral-600">
                  {form.description.length}/1000
                </p>
              </div>

              {error && (
                <p role="alert" className="text-sm text-red-400">
                  {error}
                </p>
              )}

              <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={saving}
                  onClick={closeModal}
                  className="rounded-xl border border-white/10 px-4 py-3 text-sm text-neutral-300 hover:bg-white/4 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#76B900] px-5 py-3 text-sm font-semibold text-black hover:bg-[#8bd500] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && (
                    <LoaderCircle size={16} className="animate-spin" />
                  )}
                  {saving
                    ? "Saving..."
                    : editingProject
                      ? "Save changes"
                      : "Create project"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {selectedProject && (
        <div className="fixed inset-0 z-65 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-details-title"
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#101110] p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-[#76B900]/20 bg-[#76B900]/10 p-3">
                  <FolderKanban size={22} className="text-[#76B900]" />
                </div>

                <div>
                  <h3
                    id="project-details-title"
                    className="text-lg font-semibold"
                  >
                    {selectedProject.name}
                  </h3>
                  <p className="mt-1 text-xs text-neutral-500">
                    Project details
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedProject(null)}
                aria-label="Close project details"
                className="rounded-lg p-2 text-neutral-400 hover:bg-white/5 hover:text-white"
              >
                <X size={19} />
              </button>
            </div>

            <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-neutral-400">
              {selectedProject.description || "No description added yet."}
            </p>

            <div className="mt-5 space-y-2 rounded-xl border border-white/[0.07] bg-black/20 p-4 text-xs text-neutral-400">
              <p className="break-all">
                <span className="text-neutral-500">Project ID: </span>
                {selectedProject.id}
              </p>
              <p>
                <span className="text-neutral-500">Created: </span>
                {new Date(selectedProject.createdAt).toLocaleString()}
              </p>
              <p>
                <span className="text-neutral-500">Last updated: </span>
                {new Date(selectedProject.updatedAt).toLocaleString()}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  const project = selectedProject;
                  setSelectedProject(null);
                  openEditModal(project);
                }}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-neutral-300 hover:bg-white/4"
              >
                Edit project
              </button>

              <button
                type="button"
                onClick={() => setSelectedProject(null)}
                className="rounded-xl bg-[#76B900] px-4 py-2.5 text-sm font-semibold text-black hover:bg-[#8bd500]"
              >
                Done
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
