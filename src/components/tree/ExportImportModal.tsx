"use client";

import React, { useState, useRef } from "react";
import { Download, Upload, FileText, FileCode, Printer, CheckCircle2, AlertCircle, FileArchive } from "lucide-react";
import { FamilyTree, Person, Relationship } from "@/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { exportToGedcom, importFromGedcom } from "@/domain/export/gedcom";
import { exportToJson, importFromJson } from "@/domain/export/json-export";

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tree: FamilyTree;
  people: Person[];
  relationships: Relationship[];
  onImportData: (
    importedPeople: Person[],
    importedRelationships: Relationship[],
    mode: "append" | "replace"
  ) => Promise<void>;
}

export function ExportImportModal({
  isOpen,
  onClose,
  tree,
  people,
  relationships,
  onImportData,
}: ExportImportModalProps) {
  const [activeTab, setActiveTab] = useState<"export" | "import">("export");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importFormat, setImportFormat] = useState<"gedcom" | "json" | null>(null);
  const [importMode, setImportMode] = useState<"append" | "replace">("append");
  const [previewData, setPreviewData] = useState<{
    people: Person[];
    relationships: Relationship[];
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to trigger file download
  const triggerDownload = (filename: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportGedcom = () => {
    const gedcom = exportToGedcom(tree, people, relationships);
    const safeName = (tree.name || "famtree").toLowerCase().replace(/[^a-z0-9_-]/g, "_");
    triggerDownload(`${safeName}_5.5.1.ged`, gedcom, "text/plain;charset=utf-8");
  };

  const handleExportJson = () => {
    const jsonStr = exportToJson(tree, people, relationships);
    const safeName = (tree.name || "famtree").toLowerCase().replace(/[^a-z0-9_-]/g, "_");
    triggerDownload(`${safeName}_backup.json`, jsonStr, "application/json;charset=utf-8");
  };

  const handlePrintSummary = () => {
    window.print();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setErrorMessage(null);
    setSuccessMessage(null);
    setPreviewData(null);

    const fileName = file.name.toLowerCase();
    const isGed = fileName.endsWith(".ged") || fileName.endsWith(".gedcom");
    const isJson = fileName.endsWith(".json");

    if (!isGed && !isJson) {
      setErrorMessage("Unsupported file type. Please upload a GEDCOM (.ged) or JSON (.json) file.");
      return;
    }

    try {
      const text = await file.text();
      if (isGed) {
        setImportFormat("gedcom");
        const parsed = importFromGedcom(text, tree.id);
        if (parsed.people.length === 0) {
          throw new Error("No individual records (INDI) could be parsed from this GEDCOM file.");
        }
        setPreviewData(parsed);
      } else {
        setImportFormat("json");
        const parsed = importFromJson(text, tree.id);
        setPreviewData({ people: parsed.people, relationships: parsed.relationships });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to parse file.";
      setErrorMessage(msg);
      setPreviewData(null);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewData) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      await onImportData(previewData.people, previewData.relationships, importMode);
      setSuccessMessage(
        `Successfully imported ${previewData.people.length} individuals and ${previewData.relationships.length} relationships!`
      );
      setTimeout(() => {
        setSuccessMessage(null);
        setPreviewData(null);
        setImportFile(null);
        onClose();
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Import failed.";
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Data Export & Import Center"
      description="Backup your family tree to industry standard formats or import lineages from external genealogy systems."
      maxWidth="xl"
    >
      {/* Tabs */}
      <div className="flex border-b border-stone-200 dark:border-stone-800 mb-5">
        <button
          onClick={() => setActiveTab("export")}
          className={`flex items-center gap-2 border-b-2 py-2 px-4 text-xs font-semibold transition-colors ${
            activeTab === "export"
              ? "border-emerald-600 text-emerald-800 dark:text-emerald-300"
              : "border-transparent text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
          }`}
        >
          <Download className="h-4 w-4" />
          Export & Backup
        </button>
        <button
          onClick={() => setActiveTab("import")}
          className={`flex items-center gap-2 border-b-2 py-2 px-4 text-xs font-semibold transition-colors ${
            activeTab === "import"
              ? "border-emerald-600 text-emerald-800 dark:text-emerald-300"
              : "border-transparent text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
          }`}
        >
          <Upload className="h-4 w-4" />
          Import Lineage
        </button>
      </div>

      {activeTab === "export" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* GEDCOM Card */}
            <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/60 p-4 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                      GEDCOM 5.5.1 (.ged)
                    </h4>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      Universal Genealogy Standard
                    </p>
                  </div>
                </div>
                <p className="mt-2.5 text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                  Compatible with Ancestry, MyHeritage, FamilySearch, Gramps, and RootsMagic. Includes individuals, life events, places, and family units.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportGedcom}
                className="w-full gap-2 text-xs font-medium border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200"
              >
                <Download className="h-3.5 w-3.5" />
                Download GEDCOM (.ged)
              </Button>
            </div>

            {/* JSON Archive Card */}
            <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/60 p-4 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                    <FileCode className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                      Lossless JSON Archive (.json)
                    </h4>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      High-Fidelity FamTree Backup
                    </p>
                  </div>
                </div>
                <p className="mt-2.5 text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                  Complete dataset preservation including custom relationship types, biographical narratives, timestamps, and metadata.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportJson}
                className="w-full gap-2 text-xs font-medium border-blue-300 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-900 dark:text-blue-200"
              >
                <Download className="h-3.5 w-3.5" />
                Download JSON Backup (.json)
              </Button>
            </div>
          </div>

          {/* Print Section */}
          <div className="rounded-xl border border-stone-200 dark:border-stone-800 p-4 flex items-center justify-between bg-white dark:bg-[#141A16]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                <Printer className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                  Print Lineage / PDF Export
                </h4>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  Formatted summary suitable for printing or saving via browser PDF export.
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handlePrintSummary} className="gap-1.5 text-xs">
              <Printer className="h-3.5 w-3.5" />
              Print / Save PDF
            </Button>
          </div>
        </div>
      ) : (
        /* Import Tab */
        <div className="space-y-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".ged,.gedcom,.json"
            className="hidden"
          />

          {!previewData ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl p-8 text-center cursor-pointer transition-colors bg-stone-50/50 dark:bg-stone-900/40"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 mb-3">
                <FileArchive className="h-6 w-6" />
              </div>
              <p className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                Click to browse or drop your GEDCOM (.ged) or JSON backup file
              </p>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                Supports GEDCOM 5.5 / 5.5.1 and FamTree JSON archives up to 25MB.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Preview Banner */}
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                      File Parsed Successfully: {importFile?.name} ({importFormat?.toUpperCase()})
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPreviewData(null);
                      setImportFile(null);
                    }}
                    className="h-7 text-[11px] text-stone-600 dark:text-stone-300"
                  >
                    Choose Different File
                  </Button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-white/80 dark:bg-stone-900/80 border border-emerald-100 dark:border-emerald-900">
                    <span className="text-[10px] text-stone-500 uppercase tracking-wider block">
                      Individuals
                    </span>
                    <span className="text-base font-bold text-stone-900 dark:text-stone-100">
                      {previewData.people.length}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/80 dark:bg-stone-900/80 border border-emerald-100 dark:border-emerald-900">
                    <span className="text-[10px] text-stone-500 uppercase tracking-wider block">
                      Relationships
                    </span>
                    <span className="text-base font-bold text-stone-900 dark:text-stone-100">
                      {previewData.relationships.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Mode Selection */}
              <div className="rounded-xl border border-stone-200 dark:border-stone-800 p-4 bg-stone-50/50 dark:bg-stone-900/40 space-y-2">
                <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 block">
                  Select Import Action:
                </span>
                <div className="space-y-2 text-xs">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === "append"}
                      onChange={() => setImportMode("append")}
                      className="text-emerald-700 focus:ring-emerald-600"
                    />
                    <div>
                      <span className="font-semibold text-stone-900 dark:text-stone-100">
                        Append to existing tree
                      </span>
                      <p className="text-[11px] text-stone-500">
                        Keep current family members and add imported records alongside them.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === "replace"}
                      onChange={() => setImportMode("replace")}
                      className="text-emerald-700 focus:ring-emerald-600"
                    />
                    <div>
                      <span className="font-semibold text-amber-900 dark:text-amber-400">
                        Replace existing tree
                      </span>
                      <p className="text-[11px] text-stone-500">
                        Replace all members and connections in this tree with the imported file.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/60 p-3 text-xs text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 p-3 text-xs text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {previewData && (
            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
              <Button variant="outline" size="sm" onClick={() => setPreviewData(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmImport}
                isLoading={isProcessing}
                className="gap-1.5"
              >
                <Upload className="h-3.5 w-3.5" />
                Complete Import
              </Button>
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}
