import Link from "next/link";
import { Trees, ShieldCheck, GitFork, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-stone-200/80 dark:border-stone-800 bg-white/50 dark:bg-[#141A16] text-stone-600 dark:text-stone-400 mt-auto transition-colors">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1B4D3E] dark:bg-emerald-800 text-white">
              <Trees className="h-4 w-4" />
            </div>
            <span className="font-serif font-bold text-stone-900 dark:text-stone-100 tracking-tight">FamTree</span>
            <span className="text-xs text-stone-400 dark:text-stone-500">· Family Tree Generator</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-stone-500 dark:text-stone-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
              Secure RLS & Privacy First
            </span>
            <span className="flex items-center gap-1.5">
              <GitFork className="h-3.5 w-3.5 text-stone-400" />
              Deterministic Graph Engine
            </span>
            <Link href="/trees/tree-sterling-chen" className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors">
              Sterling-Chen Lineage
            </Link>
            <Link href="/settings" className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors">
              Settings & Theme
            </Link>
          </div>

          <p className="text-xs text-stone-400 dark:text-stone-500 flex items-center gap-1">
            Built with care for families <Heart className="h-3 w-3 text-rose-500 fill-rose-500 inline" />
          </p>
        </div>
      </div>
    </footer>
  );
}
