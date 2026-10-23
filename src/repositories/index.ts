import { ITreeRepository } from "./types";
import { LocalTreeRepository } from "./local-tree-repository";
import { SupabaseTreeRepository } from "./supabase-tree-repository";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export * from "./types";
export * from "./local-tree-repository";
export * from "./supabase-tree-repository";

let localRepositoryInstance: LocalTreeRepository | null = null;
let supabaseRepositoryInstance: SupabaseTreeRepository | null = null;

export function isUserAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  if (!isSupabaseConfigured()) return false;
  try {
    const authId = localStorage.getItem("famtree_auth_user_id");
    if (authId) return true;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
        const val = localStorage.getItem(key);
        if (val) {
          const parsed = JSON.parse(val);
          if (parsed?.user?.id) return true;
        }
      }
    }
  } catch {
    return false;
  }
  return false;
}

export function getRepositoryBackend(): "supabase" | "local" {
  return isSupabaseConfigured() ? "supabase" : "local";
}

export function getTreeRepository(): ITreeRepository {
  if (isSupabaseConfigured()) {
    if (!supabaseRepositoryInstance) {
      const client = getSupabaseBrowserClient();
      if (client) {
        supabaseRepositoryInstance = new SupabaseTreeRepository(client);
      }
    }
    if (supabaseRepositoryInstance) {
      return supabaseRepositoryInstance;
    }
  }

  // Fallback to robust offline/local repository
  if (!localRepositoryInstance) {
    localRepositoryInstance = new LocalTreeRepository();
  }
  return localRepositoryInstance;
}

export function resetRepositoryInstance(): void {
  localRepositoryInstance = null;
  supabaseRepositoryInstance = null;
}
