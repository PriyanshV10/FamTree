import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import {
  Trees,
  GitFork,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Compass,
  Layers,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#FBF9F5] dark:bg-[#111513] transition-colors">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            {/* Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/60 px-3 py-1 text-xs font-semibold text-emerald-900 dark:text-emerald-300 shadow-2xs">
              <Sparkles className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
              <span>Next-Generation Genealogical Workspace</span>
            </div>

            {/* Headline */}
            <h1 className="mt-6 font-serif text-4xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100 sm:text-6xl md:text-7xl">
              Understand your lineage.{" "}
              <span className="text-[#1B4D3E] dark:text-emerald-400 underline decoration-emerald-300 dark:decoration-emerald-600 decoration-wavy decoration-2">
                Discover every link.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-6 text-lg md:text-xl leading-relaxed text-stone-600 dark:text-stone-400 font-normal">
              FamTree is a visual, privacy-first family tree builder and deterministic
              relationship discovery engine. Map generations, connect complex families,
              and trace how any two ancestors are related.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/trees/tree-sterling-chen">
                <Button size="lg" className="w-full sm:w-auto gap-2 text-base px-7 shadow-md">
                  <Compass className="h-5 w-5" />
                  Explore Live Tree Canvas
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto gap-2 text-base px-7"
                >
                  <Trees className="h-5 w-5 text-emerald-800 dark:text-emerald-400" />
                  View Family Trees
                </Button>
              </Link>
            </div>
          </div>

          {/* Interactive Teaser Banner / Preview */}
          <div className="mt-14 relative mx-auto max-w-5xl rounded-2xl border border-stone-200/90 dark:border-stone-800 bg-white dark:bg-[#18201B] p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3 px-3">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-rose-400" />
                <div className="h-3 w-3 rounded-full bg-amber-400" />
                <div className="h-3 w-3 rounded-full bg-emerald-400" />
                <span className="ml-2 text-xs font-medium text-stone-400 dark:text-stone-500">
                  FamTree Canvas · The Sterling-Chen Lineage
                </span>
              </div>
              <Link
                href="/trees/tree-sterling-chen"
                className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 hover:text-emerald-950 dark:hover:text-emerald-300 flex items-center gap-1"
              >
                Launch Full Workspace
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Mock Mini Visualizer Preview */}
            <div className="relative bg-[#FAF8F5] dark:bg-[#111513] rounded-xl p-8 overflow-hidden min-h-[300px] flex flex-col items-center justify-center">
              <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#C8C4B7_1px,transparent_1px)] dark:bg-[radial-gradient(#27332C_1px,transparent_1px)] [background-size:16px_16px]" />

              <div className="relative z-10 flex flex-col items-center gap-6 max-w-2xl text-center">
                {/* Generation 1 Preview */}
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#18201B] px-4 py-2.5 shadow-xs text-left">
                    <p className="text-xs font-bold text-stone-900 dark:text-stone-100">Arthur Sterling</p>
                    <p className="text-[10px] text-stone-500 dark:text-stone-400">1934 – 2018 · Edinburgh</p>
                  </div>
                  <div className="h-0.5 w-6 bg-rose-400 rounded-full" />
                  <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#18201B] px-4 py-2.5 shadow-xs text-left">
                    <p className="text-xs font-bold text-stone-900 dark:text-stone-100">Eleanor Vance</p>
                    <p className="text-[10px] text-stone-500 dark:text-stone-400">1938 – 2021 · Boston</p>
                  </div>
                </div>

                {/* Connector line */}
                <div className="h-6 w-0.5 bg-emerald-700/40 dark:bg-emerald-500/40" />

                {/* Generation 2 Preview */}
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <div className="rounded-xl border-2 border-emerald-700 dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 px-4 py-2.5 shadow-xs text-left">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
                      <p className="text-xs font-bold text-stone-900 dark:text-stone-100">David Sterling</p>
                    </div>
                    <p className="text-[10px] text-stone-500 dark:text-stone-400">b. 1965 · Architect</p>
                  </div>
                  <div className="h-0.5 w-6 bg-rose-400 rounded-full" />
                  <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#18201B] px-4 py-2.5 shadow-xs text-left">
                    <p className="text-xs font-bold text-stone-900 dark:text-stone-100">Dr. Hannah Chen</p>
                    <p className="text-[10px] text-stone-500 dark:text-stone-400">b. 1968 · Surgeon</p>
                  </div>
                </div>

                <Link href="/trees/tree-sterling-chen">
                  <Button size="sm" className="mt-3 gap-2 shadow-xs">
                    <Sparkles className="h-3.5 w-3.5" />
                    Interact with all 12 members on React Flow Canvas
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="border-t border-stone-200/80 dark:border-stone-800 bg-white dark:bg-[#141A16] py-16 md:py-24 transition-colors">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-serif text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100 sm:text-4xl">
              Engineered for genuine genealogical depth
            </h2>
            <p className="mt-3 text-base text-stone-600 dark:text-stone-400">
              FamTree eliminates the confusion of legacy genealogical software with clean visual canvases and mathematical certainty.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-[#FAF8F5] dark:bg-[#18201B] p-6 shadow-xs space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400">
                <Layers className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-xl font-bold text-stone-900 dark:text-stone-100">
                Multi-Generational Canvas
              </h3>
              <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                High-performance React Flow canvas supporting smooth pan, zoom, fit-to-view,
                and custom node layout for biological, adoptive, and blended family branches.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-[#FAF8F5] dark:bg-[#18201B] p-6 shadow-xs space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400">
                <GitFork className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-xl font-bold text-stone-900 dark:text-stone-100">
                Deterministic Relationship Finder
              </h3>
              <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                Pick any two people to instantly discover their genealogical relationship, common
                ancestors, and step-by-step path without guessing or hallucinated AI claims.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-[#FAF8F5] dark:bg-[#18201B] p-6 shadow-xs space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-xl font-bold text-stone-900 dark:text-stone-100">
                Privacy-First Architecture
              </h3>
              <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                Family stories are deeply personal. Designed from day one with private default
                trees, secure data models, and zero advertising or commercial broker tracking.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
