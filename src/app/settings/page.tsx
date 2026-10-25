"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  User,
  Shield,
  Download,
  CheckCircle2,
  Lock,
  Layers,
  Palette,
  LogOut,
  LogIn,
  Database,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useAuth } from "@/components/auth/AuthContext";
import {
  getPreferences,
  savePreferences,
  DateFormatOption,
  MaidenNameConvention,
  DefaultViewMode,
} from "@/lib/preferences";
import { getTreeRepository, getRepositoryBackend } from "@/repositories";
import { getCurrentTimestamp } from "@/lib/utils";

function CuratorProfileSection({
  initialName,
  email,
  isUserLoggedIn,
  onUpdateProfile,
}: {
  initialName: string;
  email: string;
  isUserLoggedIn: boolean;
  onUpdateProfile: (name: string) => Promise<void>;
}) {
  const [curatorName, setCuratorName] = useState(initialName);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      await onUpdateProfile(curatorName);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3500);
    } catch (err) {
      console.error("Failed to update profile:", err);
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <form onSubmit={handleSaveProfile} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Curator Display Name"
          value={curatorName}
          onChange={(e) => setCuratorName(e.target.value)}
          placeholder="e.g. Maya Sterling-Chen"
        />
        <div>
          <Input
            label="Email Address"
            type="email"
            value={email}
            disabled
          />
          <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">
            {isUserLoggedIn ? "Managed by your Supabase account" : "Local demo mode email"}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        {profileSuccess && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-400 animate-fade-in">
            <CheckCircle2 className="h-4 w-4" />
            Curator profile saved successfully!
          </span>
        )}
        <Button type="submit" size="sm" disabled={profileSaving} className="ml-auto">
          {profileSaving ? "Saving..." : "Save Profile"}
        </Button>
      </div>
    </form>
  );
}

export default function SettingsPage() {
  const { user, profile, isConfigured, signOut, updateProfile } = useAuth();

  const initialCuratorName =
    profile?.fullName ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    (typeof window !== "undefined" ? localStorage.getItem("famtree_curator_name") : null) ||
    "Maya Sterling-Chen";

  // Display Preferences State (initialized directly from preferences store)
  const [dateFormat, setDateFormat] = useState<DateFormatOption>(() => getPreferences().dateFormat);
  const [maidenNameConvention, setMaidenNameConvention] =
    useState<MaidenNameConvention>(() => getPreferences().maidenNameConvention);
  const [defaultViewMode, setDefaultViewMode] = useState<DefaultViewMode>(() => getPreferences().defaultViewMode);
  const [prefSaving, setPrefSaving] = useState(false);
  const [prefSuccess, setPrefSuccess] = useState(false);

  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  // Preferences Save
  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setPrefSaving(true);
    savePreferences({
      dateFormat,
      maidenNameConvention,
      defaultViewMode,
    });
    setPrefSuccess(true);
    setTimeout(() => {
      setPrefSuccess(false);
      setPrefSaving(false);
    }, 1500);
  };

  // Full Database / Repository Export
  const handleExportAllData = async () => {
    setIsExporting(true);
    setExportMessage(null);
    try {
      const repo = getTreeRepository(Boolean(user));
      const trees = await repo.listTrees();

      const allData: {
        version: string;
        generator: string;
        exportedAt: string;
        backend: string;
        trees: unknown[];
      } = {
        version: "1.0.0",
        generator: "FamTree Ancestry Engine",
        exportedAt: getCurrentTimestamp(),
        backend: getRepositoryBackend(Boolean(user)),
        trees: [],
      };

      for (const tree of trees) {
        const graph = await repo.getTreeGraph(tree.id);
        if (graph) {
          allData.trees.push({
            tree: graph.tree,
            people: graph.people,
            relationships: graph.relationships,
          });
        }
      }

      const jsonStr = JSON.stringify(allData, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      link.download = `famtree_backup_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportMessage(`Export complete: ${trees.length} family tree(s) backed up.`);
      setTimeout(() => setExportMessage(null), 5000);
    } catch (err) {
      console.error("Export error:", err);
      setExportMessage("Failed to export family trees. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FBF9F5] dark:bg-[#111513] transition-colors">
      <Navbar />

      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 dark:text-stone-100">
            Account & Preferences
          </h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Configure your genealogical display preferences, dark/light theme, curator identity, and data backups.
          </p>
        </div>

        {/* Appearance & Theme Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Palette className="h-5 w-5 text-emerald-800 dark:text-emerald-400" />
              Appearance & Theme
            </CardTitle>
            <CardDescription>
              Choose your interface color scheme. FamTree is designed with a warm heirloom aesthetic for both light and dark environments.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-stone-200/90 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40">
              <div>
                <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">Theme Mode</p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Select Light, Dark, or System automatic synchronization
                </p>
              </div>
              <ThemeToggle variant="segmented" />
            </div>
          </CardContent>
        </Card>

        {/* Curator Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-emerald-800 dark:text-emerald-400" />
              Curator Profile
            </CardTitle>
            <CardDescription>
              {isConfigured && user
                ? `Signed in as ${user.email} (Supabase Cloud)`
                : "Local offline curator identity"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CuratorProfileSection
              key={user?.id || profile?.fullName || "guest"}
              initialName={initialCuratorName}
              email={user?.email || "curator@famtree.local"}
              isUserLoggedIn={Boolean(user)}
              onUpdateProfile={updateProfile}
            />
          </CardContent>
        </Card>

        {/* Genealogical Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Layers className="h-5 w-5 text-emerald-800 dark:text-emerald-400" />
              Genealogical Display Preferences
            </CardTitle>
            <CardDescription>
              Customize how dates, names, and tree canvas layouts are rendered across the application.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSavePreferences} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Select
                  label="Date Representation"
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value as DateFormatOption)}
                  options={[
                    { value: "YYYY-MM-DD", label: "Standard ISO (1934-03-12)" },
                    { value: "DD MMM YYYY", label: "Genealogical (12 Mar 1934)" },
                    { value: "YYYY", label: "Year only (1934)" },
                  ]}
                />

                <Select
                  label="Maiden Name Convention"
                  value={maidenNameConvention}
                  onChange={(e) =>
                    setMaidenNameConvention(e.target.value as MaidenNameConvention)
                  }
                  options={[
                    { value: "parentheses", label: "Parentheses (née Vance)" },
                    { value: "slash", label: "Slash / Maiden" },
                    { value: "birth_only", label: "Original Birth Name" },
                  ]}
                />

                <Select
                  label="Default Canvas View"
                  value={defaultViewMode}
                  onChange={(e) => setDefaultViewMode(e.target.value as DefaultViewMode)}
                  options={[
                    { value: "standard", label: "Standard (Avatars & Full Details)" },
                    { value: "compact", label: "Compact (Streamlined Cards)" },
                  ]}
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-800">
                {prefSuccess && (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-400 animate-fade-in">
                    <CheckCircle2 className="h-4 w-4" />
                    Display preferences saved and applied across trees!
                  </span>
                )}
                <Button type="submit" size="sm" disabled={prefSaving} className="ml-auto">
                  {prefSaving ? "Saving..." : "Save Display Preferences"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Account & Session Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-800 dark:text-emerald-400" />
              Account & Authentication Status
            </CardTitle>
            <CardDescription>
              Manage your active login session and database connection.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-stone-200/90 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                    {user ? user.email : "Local Offline Mode"}
                  </span>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                    {isConfigured ? (user ? "Cloud Synchronized" : "Supabase Ready") : "Offline Demo"}
                  </span>
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {user
                    ? `User ID: ${user.id}`
                    : "Running locally with in-browser storage and sample lineage datasets."}
                </p>
              </div>

              {user ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => signOut()}
                  className="gap-2 text-rose-700 dark:text-rose-400 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/login">
                    <Button size="sm" className="gap-2">
                      <LogIn className="h-4 w-4" />
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/signup">
                    <Button variant="outline" size="sm">
                      Create Account
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Data Protection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="h-5 w-5 text-emerald-800 dark:text-emerald-400" />
              Privacy & Data Backups
            </CardTitle>
            <CardDescription>
              FamTree is built with strict privacy guarantees for sensitive ancestral and living family records.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs text-stone-600 dark:text-stone-300">
            <div className="rounded-xl border border-stone-200/90 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 p-4 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-stone-800 dark:text-stone-200">
                <Lock className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
                <span>Private by Default with Row Level Security (RLS)</span>
              </div>
              <p>
                All family trees created are private to the creator by default. Database-enforced Row Level Security
                ensures that no other user can access or modify your records without explicit membership authorization.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-stone-100 dark:border-stone-800 pt-4">
              <div>
                <p className="font-semibold text-stone-800 dark:text-stone-200">Export All Family Data</p>
                <p className="text-stone-400 dark:text-stone-500">
                  Download a comprehensive JSON backup of all your family trees, people, and relationships.
                </p>
                {exportMessage && (
                  <p className="mt-1 text-xs font-medium text-emerald-800 dark:text-emerald-400">
                    {exportMessage}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportAllData}
                disabled={isExporting}
                className="gap-2 shrink-0"
              >
                <Download className="h-3.5 w-3.5" />
                {isExporting ? "Exporting..." : "Export Family Data (JSON)"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
