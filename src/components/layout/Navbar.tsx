"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trees, Settings, Plus, Menu, X, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useAuth } from "@/components/auth/AuthContext";

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { user, profile, signOut } = useAuth();

  const navLinks = [
    { href: "/dashboard", label: "My Trees", icon: Trees },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const displayName = profile?.fullName || user?.email?.split("@")[0] || "Curator";
  const initials = getInitials(displayName);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-stone-200/80 dark:border-stone-800 bg-[#FBF9F5]/90 dark:bg-[#111513]/90 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 group focus:outline-none focus:ring-2 focus:ring-emerald-700 rounded-lg p-1"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1B4D3E] dark:bg-emerald-800 text-white shadow-xs group-hover:bg-[#153D31] dark:group-hover:bg-emerald-700 transition-colors">
              <Trees className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100 group-hover:text-[#1B4D3E] dark:group-hover:text-emerald-400 transition-colors font-serif">
              FamTree
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-emerald-50 dark:bg-emerald-950/50 text-[#1B4D3E] dark:text-emerald-300 font-semibold"
                      : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right CTA & Controls */}
        <div className="hidden md:flex items-center gap-3">
          {/* Theme Toggle */}
          <ThemeToggle />

          <div className="h-5 w-px bg-stone-200 dark:bg-stone-800" />

          {/* User Auth controls */}
          {user ? (
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-200/80 dark:border-stone-700">
                <div className={cn("flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold border", getAvatarColor(user.id))}>
                  {initials}
                </div>
                <span className="text-xs font-medium text-stone-700 dark:text-stone-200 max-w-[120px] truncate">
                  {displayName}
                </span>
              </div>
              <button
                type="button"
                onClick={() => signOut()}
                className="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-stone-700 dark:text-stone-300">
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Sign In</span>
                </Button>
              </Link>
            </div>
          )}

          <Link href="/dashboard">
            <Button size="sm" className="h-8 gap-1.5 text-xs shadow-xs">
              <Plus className="h-3.5 w-3.5" />
              New Tree
            </Button>
          </Link>
        </div>

        {/* Mobile controls & menu trigger */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-white focus:outline-hidden"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-[#18201B] px-4 pt-2 pb-4 space-y-2 animate-fade-in shadow-lg">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-[#1B4D3E] dark:text-emerald-300 font-semibold"
                    : "text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                )}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}

          <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex flex-col gap-2">
            {user ? (
              <div className="flex items-center justify-between p-2 rounded-lg bg-stone-50 dark:bg-stone-800/60">
                <div className="flex items-center gap-2">
                  <div className={cn("flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold border", getAvatarColor(user.id))}>
                    {initials}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-stone-900 dark:text-white">{displayName}</p>
                    <p className="text-[10px] text-stone-500 dark:text-stone-400">{user.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    signOut();
                    setMobileMenuOpen(false);
                  }}
                  className="text-xs text-red-600 dark:text-red-400 font-medium px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700"
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </Link>
            )}

            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold text-white bg-[#1B4D3E] dark:bg-emerald-800 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              New Family Tree
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
