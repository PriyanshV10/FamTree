"use client";

import React, { useState } from "react";
import Link from "next/link";
import { TreePine, ArrowRight, AlertCircle, CheckCircle2, ChevronLeft } from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await resetPassword(email);
      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setIsSuccess(true);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to send reset link.");
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
              Reset your password
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Enter your email and we will send you a recovery link
            </p>
          </div>

          {isSuccess ? (
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#18201B] p-6 sm:p-8 text-center space-y-4 shadow-xs">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h2 className="font-serif text-xl font-bold text-stone-900 dark:text-stone-100">
                Recovery email sent
              </h2>
              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                If an account exists for <span className="font-semibold text-stone-900 dark:text-white">{email}</span>, you will receive an email with instructions on how to reset your password.
              </p>
              <div className="pt-2">
                <Link href="/login">
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    Return to Sign In
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
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

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 h-9 text-xs font-semibold gap-1.5"
                >
                  <span>{isLoading ? "Sending link..." : "Send Reset Link"}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </form>

              <div className="mt-6 pt-4 border-t border-stone-100 dark:border-stone-800 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
