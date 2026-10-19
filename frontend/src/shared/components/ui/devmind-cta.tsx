import { ArrowRight, Code2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Reveal } from "./devmind-reveal";

export default function DevMindCta() {
  return (
    <>
      <section className="px-5 pb-24 pt-8 sm:px-8 lg:px-14">
        <Reveal className="mx-auto max-w-6xl">
          <div className="relative overflow-hidden rounded-3xl border border-[#76B900]/30 bg-[#0d1209] px-6 py-16 text-center sm:px-12 sm:py-20">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-0 h-72 w-[600px] -translate-x-1/2 rounded-full bg-[#76B900]/20 blur-[120px]"
            />
            <h2 className="relative mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-[#f4f5ed] sm:text-5xl">
              Start building better software with DevMind
            </h2>
            <p className="relative mx-auto mt-5 max-w-xl text-white/65 sm:text-lg">
              Create your first project and see what your code is really doing.
            </p>
            <Link
              to="/login"
              className="group relative mt-9 inline-flex items-center gap-3 rounded-full bg-[#76B900] py-1.5 pl-6 pr-1.5 font-semibold text-[#101509] transition-colors hover:bg-[#91d51b]"
            >
              Get started free
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#101509] text-[#e8f4d7] transition-transform group-hover:-rotate-45">
                <ArrowRight size={19} />
              </span>
            </Link>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-white/10 px-5 py-10 sm:px-8 lg:px-14">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg border border-[#76B900]/50 bg-[#76B900]/15 text-[#a7e64c]">
              <Code2 size={17} />
            </span>
            <span className="font-semibold text-white">
              Dev<span className="text-[#76B900]">Mind</span>
            </span>
          </div>
          <p className="text-sm text-white/40">
            © {new Date().getFullYear()} DevMind. Think deeper. Build better.
          </p>
        </div>
      </footer>
    </>
  );
}
