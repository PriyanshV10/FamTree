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
    if (authId && authId.trim().length > 0) return true;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("sb-") && key.includes("-auth-token")) {
        const val = localStorage.getItem(key);
        if (val) {
          try {
            const parsed = JSON.parse(val);
            if (parsed?.user?.id || parsed?.access_token) return true;
          } catch {
            // ignore JSON parse error
          }
        }
      }
    }

    if (typeof document !== "undefined" && document.cookie) {
      const cookies = document.cookie.split(";");
      for (const cookie of cookies) {
        const trimmed = cookie.trim();
        if (trimmed.startsWith("sb-") && trimmed.includes("-auth-token=")) {
          const val = trimmed.split("=")[1];
          if (val && val !== '""' && val !== "base64-") {
            return true;
          }
        }
      }
    }
  } catch {
    return false;
  }
  return false;
}

export function getRepositoryBackend(authenticated?: boolean): "supabase" | "local" {
  if (!isSupabaseConfigured()) return "local";
  const authed = authenticated !== undefined ? authenticated : isUserAuthenticated();
  return authed ? "supabase" : "local";
}

export function getTreeRepository(authenticated?: boolean): ITreeRepository {
  if (isSupabaseConfigured()) {
    const authed = authenticated !== undefined ? authenticated : isUserAuthenticated();
    if (authed) {
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
