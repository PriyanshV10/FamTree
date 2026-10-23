"use client";

import React, { useState } from "react";
import Link from "next/link";
import { TreePine, ArrowRight, AlertCircle, Sparkles } from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function LoginPage() {
  const { signIn, isConfigured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await signIn(email, password);
      if (res.error) {
        setErrorMessage(res.error);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to sign in.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FBF9F5] dark:bg-[#111513] transition-colors">
      <Navbar />

      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400 shadow-xs">
              <TreePine className="h-6 w-6" />
            </div>
            <h1 className="font-serif text-3xl font-bold text-stone-900 dark:text-stone-100">
              Welcome back
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Sign in to access and manage your private family lineages
            </p>
          </div>

          {/* Local Mode Notice */}
          {!isConfigured && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 p-3.5 text-xs text-amber-900 dark:text-amber-300 space-y-1">
              <div className="flex items-center gap-2 font-semibold">
                <Sparkles className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                <span>Local Offline Demo Mode Active</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-400/80">
                Supabase credentials are not configured in <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 py-0.5 rounded">.env.local</code>. You can use the app offline with full local storage persistence, or configure Supabase Auth for cloud syncing.
              </p>
              <div className="pt-1">
                <Link
                  href="/dashboard"
                  className="font-semibold underline hover:text-amber-950 dark:hover:text-amber-200"
                >
                  Continue to Local Dashboard &rarr;
                </Link>
              </div>
            </div>
          )}

          {/* Card */}
          <div className="rounded-2xl border border-stone-200/90 dark:border-stone-800 bg-white dark:bg-[#18201B] p-6 sm:p-8 shadow-xs">
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 p-3 text-xs text-red-800 dark:text-red-300">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                  <div className="flex-1 font-medium">{errorMessage}</div>
                </div>
              )}

              <Input
                label="Email Address"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="curator@example.com"
                autoComplete="email"
              />

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-[11px] font-medium text-emerald-800 dark:text-emerald-400 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:border-[#1B4D3E] focus:outline-hidden focus:ring-1 focus:ring-[#1B4D3E]"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 h-9 text-xs font-semibold gap-1.5"
              >
                <span>{isLoading ? "Signing in..." : "Sign In"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-stone-100 dark:border-stone-800 text-center text-xs text-stone-500 dark:text-stone-400">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="font-semibold text-emerald-800 dark:text-emerald-400 hover:underline"
              >
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
