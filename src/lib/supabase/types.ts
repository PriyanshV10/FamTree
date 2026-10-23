export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type GenderType = 'male' | 'female' | 'other' | 'unknown';
export type DbRelationshipType =
  | 'parent-child'
  | 'adoptive-parent-child'
  | 'step-parent-child'
  | 'spouse'
  | 'former-spouse';

export type TreeMemberRole = 'owner' | 'editor' | 'viewer';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      family_trees: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          owner_id: string | null;
          owner_name: string;
          cover_color: string | null;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          description?: string | null;
          owner_id?: string | null;
          owner_name?: string;
          cover_color?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          owner_id?: string | null;
          owner_name?: string;
          cover_color?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      family_tree_members: {
        Row: {
          id: string;
          tree_id: string;
          user_id: string;
          role: TreeMemberRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          tree_id: string;
          user_id: string;
          role: TreeMemberRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          tree_id?: string;
          user_id?: string;
          role?: TreeMemberRole;
          created_at?: string;
        };
        Relationships: [];
      };
      people: {
        Row: {
          id: string;
          tree_id: string;
          first_name: string;
          middle_name: string | null;
          last_name: string;
          maiden_name: string | null;
          display_name: string | null;
          gender: GenderType;
          birth_date: string | null;
          death_date: string | null;
          is_living: boolean;
          birth_place: string | null;
          occupation: string | null;
          bio: string | null;
          photo_url: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          tree_id: string;
          first_name: string;
          middle_name?: string | null;
          last_name: string;
          maiden_name?: string | null;
          display_name?: string | null;
          gender?: GenderType;
          birth_date?: string | null;
          death_date?: string | null;
          is_living?: boolean;
          birth_place?: string | null;
          occupation?: string | null;
          bio?: string | null;
          photo_url?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tree_id?: string;
          first_name?: string;
          middle_name?: string | null;
          last_name?: string;
          maiden_name?: string | null;
          display_name?: string | null;
          gender?: GenderType;
          birth_date?: string | null;
          death_date?: string | null;
          is_living?: boolean;
          birth_place?: string | null;
          occupation?: string | null;
          bio?: string | null;
          photo_url?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      relationships: {
        Row: {
          id: string;
          tree_id: string;
          person_id_1: string;
          person_id_2: string;
          type: DbRelationshipType;
          start_date: string | null;
          end_date: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          tree_id: string;
          person_id_1: string;
          person_id_2: string;
          type: DbRelationshipType;
          start_date?: string | null;
          end_date?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tree_id?: string;
          person_id_1?: string;
          person_id_2?: string;
          type?: DbRelationshipType;
          start_date?: string | null;
          end_date?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
