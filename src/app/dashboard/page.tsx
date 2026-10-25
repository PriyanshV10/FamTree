"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import {
  Trees,
  Plus,
  Users,
  ArrowRight,
  Search,
  Calendar,
  AlertCircle,
  Trash2,
  Loader2,
  BarChart3,
  Clock,
  Database,
  HardDrive,
} from "lucide-react";
import { FamilyTree } from "@/types";
import { getTreeRepository, getRepositoryBackend } from "@/repositories";
import { useAuth } from "@/components/auth/AuthContext";
import { purgeTreeLocally } from "@/lib/sync/tree-cleanup";

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile, isLoading: isAuthLoading } = useAuth();
  const [trees, setTrees] = useState<FamilyTree[]>([]);
  const [isLoadingTrees, setIsLoadingTrees] = useState(true);
  const isLoading = isAuthLoading || isLoadingTrees;
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTreeName, setNewTreeName] = useState("");
  const [newTreeDesc, setNewTreeDesc] = useState("");
  const [treeToDelete, setTreeToDelete] = useState<FamilyTree | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const backend = getRepositoryBackend(Boolean(user));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDeleteTree = async () => {
    if (!treeToDelete) return;
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      const targetId = treeToDelete.id;

      // 1. Try server-side deletion route
      try {
        await fetch(`/api/trees/${encodeURIComponent(targetId)}`, { method: "DELETE" });
      } catch {
        // Continue
      }

      const repo = getTreeRepository(Boolean(user));
      await repo.deleteTree(targetId);

      // Also ensure LocalTreeRepository and local caches are purged
      const localRepo = getTreeRepository(false);
      try {
        await localRepo.deleteTree(targetId);
      } catch {
        // ignore if not present in local repo
      }
      purgeTreeLocally(targetId);

      setTrees((prev) => prev.filter((t) => t.id !== targetId));
      setTreeToDelete(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete tree.";
      setErrorMessage(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function loadTrees() {
      setIsLoadingTrees(true);
      try {
        const repo = getTreeRepository(Boolean(user));
        const loaded = await repo.listTrees();
        if (isMounted) {
          setTrees(loaded);
        }
      } catch (err) {
        console.warn("Could not list trees from repository:", err);
      } finally {
        if (isMounted) {
          setIsLoadingTrees(false);
        }
      }
    }

    if (!isAuthLoading) {
      loadTrees();
    }

    const handleSync = () => {
      if (!isAuthLoading) {
        loadTrees();
      }
    };
    window.addEventListener("famtree:data-synced", handleSync);

    return () => {
      isMounted = false;
      window.removeEventListener("famtree:data-synced", handleSync);
    };
  }, [user?.id, user, isAuthLoading]);

  const filteredTrees = trees.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateTree = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTreeName.trim()) return;

    setErrorMessage(null);
    const repo = getTreeRepository(Boolean(user));
    try {
      const ownerName = profile?.fullName || user?.email?.split("@")[0] || "Curator";
      const created = await repo.createTree({
        name: newTreeName.trim(),
        description: newTreeDesc.trim() || "A new family tree record.",
        ownerName,
        ownerId: user?.id,
        coverColor: "bg-emerald-800",
      });

      setTrees([created, ...trees]);
      setNewTreeName("");
      setNewTreeDesc("");
      setIsCreateOpen(false);
      router.push(`/trees/${created.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create family tree.";
      setErrorMessage(msg);
    }
  };

  const totalMembers = trees.reduce((acc, t) => acc + (t.memberCount || 0), 0);
  const avgMembers = trees.length > 0 ? Math.round(totalMembers / trees.length) : 0;
  const latestTree = trees.length > 0
    ? [...trees].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-[#FBF9F5] dark:bg-[#111513] transition-colors">
      <Navbar />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-8 border-b border-stone-200/80 dark:border-stone-800">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 dark:text-stone-100">
                Family Tree Dashboard
              </h1>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                  backend === "supabase"
                    ? "bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800"
                    : "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                }`}
                title={
                  backend === "supabase"
                    ? "Persisted to Supabase PostgreSQL cloud database"
                    : "Persisted locally in browser storage"
                }
              >
                {backend === "supabase" ? (
                  <>
                    <Database className="h-3 w-3" /> Supabase Cloud
                  </>
                ) : (
                  <>
                    <HardDrive className="h-3 w-3" /> Local Persistence
                  </>
                )}
              </span>
            </div>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              Manage your ancestral lineages, documented relatives, and lineage workspaces.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={() => setIsCreateOpen(true)} className="gap-2 shadow-xs">
              <Plus className="h-4 w-4" />
              Create Family Tree
            </Button>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-800 dark:text-red-300 border border-red-200 dark:border-red-900/60">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Stats Row */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-white/80 dark:bg-[#18201B]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <Trees className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">Family Trees</p>
                {isLoading ? (
                  <div className="h-7 w-8 bg-stone-200 dark:bg-stone-800 rounded-sm animate-pulse mt-0.5" />
                ) : (
                  <p className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100">{trees.length}</p>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white/80 dark:bg-[#18201B]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">Documented People</p>
                {isLoading ? (
                  <div className="h-7 w-12 bg-stone-200 dark:bg-stone-800 rounded-sm animate-pulse mt-0.5" />
                ) : (
                  <p className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100">{totalMembers}</p>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white/80 dark:bg-[#18201B]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">Avg. Tree Size</p>
                {isLoading ? (
                  <div className="h-7 w-12 bg-stone-200 dark:bg-stone-800 rounded-sm animate-pulse mt-0.5" />
                ) : (
                  <p className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100">
                    {avgMembers} <span className="text-xs font-normal text-stone-500 dark:text-stone-400">{avgMembers === 1 ? "person" : "people"}</span>
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white/80 dark:bg-[#18201B]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
                <Clock className="h-5 w-5 text-emerald-800 dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">Latest Activity</p>
                {isLoading ? (
                  <div className="h-7 w-20 bg-stone-200 dark:bg-stone-800 rounded-sm animate-pulse mt-0.5" />
                ) : latestTree ? (
                  <div className="mt-0.5 leading-tight">
                    <p className="text-sm font-serif font-bold text-stone-900 dark:text-stone-100 truncate max-w-[130px]" title={latestTree.name}>
                      {latestTree.name}
                    </p>
                    <p className="text-[11px] text-stone-400 dark:text-stone-500">
                      {new Date(latestTree.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm font-serif font-bold text-stone-500 dark:text-stone-400 mt-0.5">None yet</p>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Tree Search & Section Title */}
        <div className="mt-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100">
              Your Lineages
            </h2>
            {isLoading ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-300">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading...
              </span>
            ) : (
              <span className="rounded-full bg-stone-100 dark:bg-stone-800 px-2 py-0.5 text-xs font-semibold text-stone-600 dark:text-stone-300">
                {filteredTrees.length}
              </span>
            )}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400 dark:text-stone-500" />
            <input
              type="text"
              placeholder="Search trees..."
              value={searchTerm}
              disabled={isLoading}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 py-2 pl-9 pr-3 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:border-emerald-600 focus:outline-hidden focus:ring-1 focus:ring-emerald-600 disabled:opacity-60"
            />
          </div>
        </div>

        {/* Tree Cards Grid or Loading Skeleton or Empty State */}
        {isLoading ? (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((idx) => (
              <Card
                key={idx}
                className="flex flex-col justify-between overflow-hidden border border-stone-200/80 dark:border-stone-800 bg-white/70 dark:bg-[#18201B]/70 animate-pulse"
              >
                <div>
                  <div className="h-16 bg-stone-200 dark:bg-stone-800/80 p-4 flex items-center justify-between">
                    <div className="h-4 w-28 bg-stone-300 dark:bg-stone-700 rounded-sm" />
                    <div className="h-4 w-16 bg-stone-300 dark:bg-stone-700 rounded-full" />
                  </div>
                  <CardHeader className="space-y-2.5">
                    <div className="h-6 w-3/4 bg-stone-200 dark:bg-stone-800 rounded-sm" />
                    <div className="h-4 w-full bg-stone-100 dark:bg-stone-800/60 rounded-sm" />
                    <div className="h-4 w-2/3 bg-stone-100 dark:bg-stone-800/60 rounded-sm" />
                  </CardHeader>
                  <CardContent className="space-y-3 pt-2">
                    <div className="flex items-center justify-between border-t border-stone-100 dark:border-stone-800 pt-3">
                      <div className="h-4 w-24 bg-stone-200 dark:bg-stone-800 rounded-sm" />
                      <div className="h-4 w-20 bg-stone-200 dark:bg-stone-800 rounded-sm" />
                    </div>
                    <div className="h-3 w-28 bg-stone-100 dark:bg-stone-800/50 rounded-sm" />
                  </CardContent>
                </div>
                <CardFooter className="border-t border-stone-100 dark:border-stone-800 pt-4">
                  <div className="h-10 w-full bg-stone-200 dark:bg-stone-800 rounded-lg" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : filteredTrees.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrees.map((tree) => (
              <Card
                key={tree.id}
                className="group flex flex-col justify-between overflow-hidden hover:border-emerald-700/50 dark:hover:border-emerald-500/50 hover:shadow-md transition-all"
              >
                <div>
                  {/* Card Banner */}
                  <div className={`h-16 ${tree.coverColor || "bg-emerald-800"} p-4 flex items-center justify-between text-white`}>
                    <div className="flex items-center gap-2">
                      <Trees className="h-5 w-5" />
                      <span className="text-xs font-semibold uppercase tracking-wider opacity-90">
                        Family Archive
                      </span>
                    </div>
                    {tree.isDefault && (
                      <span className="rounded-full bg-white/20 backdrop-blur-xs px-2 py-0.5 text-[10px] font-semibold text-white">
                        Featured Demo
                      </span>
                    )}
                  </div>

                  <CardHeader>
                    <CardTitle className="group-hover:text-emerald-950 dark:group-hover:text-emerald-300 transition-colors">
                      {tree.name}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 mt-1">
                      {tree.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-2 text-xs text-stone-500 dark:text-stone-400">
                    <div className="flex items-center justify-between border-t border-stone-100 dark:border-stone-800 pt-3">
                      <span className="flex items-center gap-1.5 font-medium text-stone-700 dark:text-stone-300">
                        <Users className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
                        {tree.memberCount || 0} family members
                      </span>
                      <span className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400">
                        <Clock className="h-3.5 w-3.5 text-stone-400 dark:text-stone-500" />
                        {tree.updatedAt ? new Date(tree.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Active"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-stone-400 dark:text-stone-500 pt-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Curated by {tree.ownerName}</span>
                    </div>
                  </CardContent>
                </div>

                <CardFooter className="border-t border-stone-100 dark:border-stone-800 pt-4 flex items-center gap-2">
                  <Link href={`/trees/${tree.id}`} className="flex-1">
                    <Button className="w-full justify-between group-hover:bg-[#153D31] dark:group-hover:bg-emerald-700">
                      <span>Open Tree Canvas</span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setTreeToDelete(tree);
                    }}
                    className="h-9 px-2.5 text-stone-400 hover:text-red-600 hover:border-red-300 dark:hover:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/40"
                    title={`Delete ${tree.name}`}
                    aria-label={`Delete ${tree.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-stone-300 dark:border-stone-800 p-12 text-center bg-white/50 dark:bg-[#141A16]/50">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 mb-4">
              <Trees className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-100">
              {searchTerm ? "No Matching Lineages Found" : "No Family Trees Yet"}
            </h3>
            <p className="mt-1.5 text-sm text-stone-500 dark:text-stone-400 max-w-sm mx-auto">
              {searchTerm
                ? `We couldn't find any family tree matching "${searchTerm}". Try adjusting your keywords.`
                : "Create your first family lineage archive to start documenting generations, relationships, and oral histories."}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              {searchTerm ? (
                <Button variant="outline" size="sm" onClick={() => setSearchTerm("")}>
                  Clear Search Filter
                </Button>
              ) : (
                <Button onClick={() => setIsCreateOpen(true)} className="gap-2 shadow-xs">
                  <Plus className="h-4 w-4" />
                  Create Family Tree
                </Button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Delete Tree Confirmation Dialog */}
      <Dialog
        isOpen={Boolean(treeToDelete)}
        onClose={() => {
          if (!isDeleting) {
            setTreeToDelete(null);
            setErrorMessage(null);
          }
        }}
        title="Delete Family Tree?"
        description={`Are you sure you want to delete "${treeToDelete?.name}"? All associated family members, relationships, and lineage history will be permanently deleted.`}
        maxWidth="md"
      >
        <div className="space-y-4 pt-2">
          {errorMessage && (
            <div className="rounded-lg bg-red-100 dark:bg-red-950/80 border border-red-300 dark:border-red-800 p-3 text-xs text-red-900 dark:text-red-200 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <strong>Deletion Error:</strong> {errorMessage}
              </div>
            </div>
          )}
          <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-3 text-xs text-red-800 dark:text-red-300">
            <strong>Warning:</strong> This action cannot be undone. All recorded relatives ({treeToDelete?.memberCount || 0} people) will be permanently deleted from the database.
          </div>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100 dark:border-stone-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setTreeToDelete(null);
                setErrorMessage(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDeleteTree}
              isLoading={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              Delete Tree
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Create Tree Dialog */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Family Tree"
        description="Start an ancestral lineage record. You will be able to populate family members and draw relationships immediately."
      >
        <form onSubmit={handleCreateTree} className="space-y-4">
          <Input
            label="Family Tree Name *"
            placeholder="e.g. The Anderson-Cole Family Tree"
            value={newTreeName}
            onChange={(e) => setNewTreeName(e.target.value)}
            required
          />

          <Textarea
            label="Description / Scope"
            placeholder="Origins, geographic branches, or ancestral notes..."
            rows={3}
            value={newTreeDesc}
            onChange={(e) => setNewTreeDesc(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100 dark:border-stone-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!newTreeName.trim()}>
              Create Tree
            </Button>
          </div>
        </form>
      </Dialog>

      <Footer />
    </div>
  );
}
