import { useState } from "react";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Code2,
  FolderPlus,
  GitBranch,
  Plus,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardHeader from "../components/DashboardHeader";
import DashboardSidebar from "../components/DashboardSidebar";
import StatCard from "../components/StatCard";

const quickActions = [
  {
    title: "Analyze code",
    description: "Review code quality, readability and potential issues.",
    icon: Code2,
    action: "analysis",
  },
  {
    title: "Security review",
    description: "Identify potential security weaknesses in your code.",
    icon: ShieldCheck,
    action: "security",
  },
  {
    title: "Ask AI assistant",
    description: "Get help understanding code and development concepts.",
    icon: Bot,
    action: "assistant",
  },
];

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleQuickAction = (action: string) => {
    if (action === "analysis") {
      navigate("/devmind/code-analysis");
    } else if (action === "security") {
      navigate("/devmind/security");
    } else {
      navigate("/devmind/assistant");
    }
  };

  return (
    <div className="min-h-screen bg-[#090A09] text-white">
      <DashboardSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="min-h-screen lg:pl-[260px]">
        <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />

        <main className="mx-auto max-w-[1600px] px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
          <section className="relative overflow-hidden rounded-3xl border border-[#76B900]/20 bg-[#10130E] p-6 sm:p-9 lg:p-10">
            <div className="pointer-events-none absolute -right-20 -top-32 h-80 w-80 rounded-full bg-[#76B900]/10 blur-[100px]" />

            <div className="relative max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#76B900]/20 bg-[#76B900]/10 px-3 py-1.5 text-xs font-medium text-[#9de33b]">
                <Sparkles size={14} />
                Your AI developer workspace
              </div>

              <h2 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                Build better software.
                <span className="block text-[#76B900]">
                  Understand every line.
                </span>
              </h2>

              <p className="mt-5 max-w-xl text-sm leading-7 text-neutral-400 sm:text-base">
                Analyze your code, understand potential problems, improve
                security and get actionable development guidance — all in one
                workspace.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/devmind/code-analysis")}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#76B900] px-5 py-3 text-sm font-semibold text-black transition-all hover:bg-[#8bd500] hover:shadow-[0_0_30px_rgba(118,185,0,0.15)]"
                >
                  Start code analysis
                  <ArrowRight size={17} />
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/devmind/projects")}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-white/[0.07]"
                >
                  <FolderPlus size={17} />
                  View projects
                </button>
              </div>
            </div>

            <div className="relative mt-9 hidden border-t border-white/[0.08] pt-5 sm:flex sm:flex-wrap sm:items-center sm:gap-x-7 sm:gap-y-3">
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <CheckCircle2 size={15} className="text-[#76B900]" />
                Code quality insights
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <CheckCircle2 size={15} className="text-[#76B900]" />
                Security-focused development
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <CheckCircle2 size={15} className="text-[#76B900]" />
                AI-assisted explanations
              </div>
            </div>
          </section>

          <section className="mt-9">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Workspace overview</h3>
                <p className="mt-1 text-sm text-neutral-500">
                  Your project and analysis activity will appear here.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Projects"
                value="—"
                description="Connect project data to see totals"
                icon={GitBranch}
              />
              <StatCard
                title="Analyses"
                value="—"
                description="Your completed analyses"
                icon={Code2}
              />
              <StatCard
                title="Issues found"
                value="—"
                description="Findings from code analysis"
                icon={ShieldCheck}
              />
              <StatCard
                title="AI insights"
                value="—"
                description="Insights generated for your code"
                icon={Sparkles}
              />
            </div>
          </section>

          <section className="mt-10">
            <div className="mb-5">
              <h3 className="text-lg font-semibold">Get started</h3>
              <p className="mt-1 text-sm text-neutral-500">
                Choose what you want to work on next.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {quickActions.map(
                ({ title, description, icon: Icon, action }) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => handleQuickAction(action)}
                    className="group rounded-2xl border border-white/[0.08] bg-[#101110] p-5 text-left transition-all hover:-translate-y-1 hover:border-[#76B900]/30 hover:bg-[#121510]"
                  >
                    <div className="flex items-start justify-between">
                      <div className="rounded-xl border border-[#76B900]/20 bg-[#76B900]/10 p-3">
                        <Icon size={21} className="text-[#76B900]" />
                      </div>

                      <ArrowRight
                        size={18}
                        className="text-neutral-600 transition-all group-hover:translate-x-1 group-hover:text-[#76B900]"
                      />
                    </div>

                    <h4 className="mt-5 font-semibold text-white">{title}</h4>
                    <p className="mt-2 text-sm leading-6 text-neutral-400">
                      {description}
                    </p>
                  </button>
                ),
              )}
            </div>
          </section>

          <section className="mt-10 rounded-2xl border border-white/[0.08] bg-[#101110] p-6 sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-white/[0.05] p-3">
                  <Code2 size={22} className="text-neutral-300" />
                </div>

                <div>
                  <h3 className="font-semibold">Your recent activity</h3>
                  <p className="mt-1 text-sm leading-6 text-neutral-500">
                    Once you run your first analysis, your recent work will
                    appear here.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate("/devmind/code-analysis")}
                className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-white/10 px-4 py-2.5 text-sm text-neutral-300 transition-colors hover:border-[#76B900]/30 hover:text-[#76B900] sm:self-auto"
              >
                <Plus size={16} />
                New analysis
              </button>
            </div>
          </section>

          <footer className="mt-10 border-t border-white/[0.06] py-5 text-center text-xs text-neutral-600">
            DevMind · AI-powered developer platform
          </footer>
        </main>
      </div>
    </div>
  );
}
