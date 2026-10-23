"use client";

import React, { useState } from "react";
import { Eye, Copy, Check, Users, ShieldCheck } from "lucide-react";
import { FamilyTree } from "@/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ShareTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  tree: FamilyTree;
}

export function ShareTreeModal({ isOpen, onClose, tree }: ShareTreeModalProps) {
  const [copiedType, setCopiedType] = useState<"viewer" | "editor" | null>(null);

  const getOrigin = () => {
    if (typeof window !== "undefined") {
      return window.location.origin;
    }
    return process.env.NEXT_PUBLIC_APP_URL || "https://famtree.app";
  };

  const origin = getOrigin();
  const viewerLink = `${origin}/trees/${tree.id}?share=viewer`;
  const editorLink = `${origin}/trees/${tree.id}?share=editor`;

  const handleCopy = async (type: "viewer" | "editor", link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2500);
    } catch (err) {
      console.warn("Clipboard write failed, using prompt fallback:", err);
      window.prompt("Copy link:", link);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Share Family Tree"
      description={`Generate sharing links for "${tree.name}". Choose whether recipients can only view or clone and edit their own copy.`}
      maxWidth="lg"
    >
      <div className="space-y-4 pt-2">
        {/* Viewer Share Option */}
        <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#18201B] p-4 transition-all hover:border-emerald-300 dark:hover:border-emerald-700/60 shadow-2xs">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                <Eye className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  Viewer Link
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                    Read-Only
                  </span>
                </h4>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Anyone with this link can view the tree with or without logging in. Nothing can be modified or saved.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                readOnly
                value={viewerLink}
                className="w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50/80 dark:bg-stone-900/80 px-3 py-1.5 text-xs text-stone-800 dark:text-stone-200 font-mono select-all focus:outline-hidden"
              />
            </div>
            <Button
              type="button"
              variant={copiedType === "viewer" ? "secondary" : "outline"}
              size="sm"
              onClick={() => handleCopy("viewer", viewerLink)}
              className="gap-1.5 shrink-0 text-xs"
            >
              {copiedType === "viewer" ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-stone-500" />
                  <span>Copy Link</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Editor Share Option */}
        <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#18201B] p-4 transition-all hover:border-emerald-300 dark:hover:border-emerald-700/60 shadow-2xs">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  Editor Link
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300">
                    Login Required · Duplicate & Edit
                  </span>
                </h4>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  When a logged-in user opens this link, the entire tree is duplicated into their profile, giving them an editable personal copy without altering yours.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                readOnly
                value={editorLink}
                className="w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50/80 dark:bg-stone-900/80 px-3 py-1.5 text-xs text-stone-800 dark:text-stone-200 font-mono select-all focus:outline-hidden"
              />
            </div>
            <Button
              type="button"
              variant={copiedType === "editor" ? "secondary" : "outline"}
              size="sm"
              onClick={() => handleCopy("editor", editorLink)}
              className="gap-1.5 shrink-0 text-xs"
            >
              {copiedType === "editor" ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-stone-500" />
                  <span>Copy Link</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Security & Integrity Note */}
        <div className="rounded-lg bg-stone-50 dark:bg-stone-900/50 border border-stone-200/80 dark:border-stone-800 p-3 text-xs text-stone-600 dark:text-stone-400 space-y-1">
          <div className="flex items-center gap-1.5 font-medium text-stone-800 dark:text-stone-200">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
            <span>Privacy & Ownership Protection</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Your original lineage remains secure. Editors receive an independent clone with freshly isolated record IDs, guaranteeing that their changes will never overwrite your master family tree.
          </p>
        </div>

        {/* Modal Close Action */}
        <div className="flex justify-end pt-3 border-t border-stone-100 dark:border-stone-800">
          <Button type="button" variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
