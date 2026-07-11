export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      match_sets: {
        Row: {
          created_at: string
          id: string
          match_id: string
          score_left: number
          score_right: number
          set_number: number
          winner: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          score_left?: number
          score_right?: number
          set_number: number
          winner?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          score_left?: number
          score_right?: number
          set_number?: number
          winner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_sets_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          auto_rules: boolean
          best_of: number
          category: string | null
          created_at: string
          created_by: string
          finished_at: string | null
          id: string
          initial_server: string
          match_code: string
          match_status: string
          notes: string | null
          operator_id: string | null
          player_left_name: string
          player_left_photo: string | null
          player_left_team: string | null
          player_right_name: string
          player_right_photo: string | null
          player_right_team: string | null
          round_name: string | null
          score_left: number
          score_right: number
          serving_player: string
          sets_left: number
          sets_right: number
          started_at: string | null
          table_number: string | null
          target_score: number
          theme_id: string | null
          timer_duration: number | null
          timer_elapsed: number
          timer_mode: string
          timer_paused_at: string | null
          timer_started_at: string | null
          tournament_id: string | null
          updated_at: string
          winner: string | null
        }
        Insert: {
          auto_rules?: boolean
          best_of?: number
          category?: string | null
          created_at?: string
          created_by: string
          finished_at?: string | null
          id?: string
          initial_server?: string
          match_code: string
          match_status?: string
          notes?: string | null
          operator_id?: string | null
          player_left_name: string
          player_left_photo?: string | null
          player_left_team?: string | null
          player_right_name: string
          player_right_photo?: string | null
          player_right_team?: string | null
          round_name?: string | null
          score_left?: number
          score_right?: number
          serving_player?: string
          sets_left?: number
          sets_right?: number
          started_at?: string | null
          table_number?: string | null
          target_score?: number
          theme_id?: string | null
          timer_duration?: number | null
          timer_elapsed?: number
          timer_mode?: string
          timer_paused_at?: string | null
          timer_started_at?: string | null
          tournament_id?: string | null
          updated_at?: string
          winner?: string | null
        }
        Update: {
          auto_rules?: boolean
          best_of?: number
          category?: string | null
          created_at?: string
          created_by?: string
          finished_at?: string | null
          id?: string
          initial_server?: string
          match_code?: string
          match_status?: string
          notes?: string | null
          operator_id?: string | null
          player_left_name?: string
          player_left_photo?: string | null
          player_left_team?: string | null
          player_right_name?: string
          player_right_photo?: string | null
          player_right_team?: string | null
          round_name?: string | null
          score_left?: number
          score_right?: number
          serving_player?: string
          sets_left?: number
          sets_right?: number
          started_at?: string | null
          table_number?: string | null
          target_score?: number
          theme_id?: string | null
          timer_duration?: number | null
          timer_elapsed?: number
          timer_mode?: string
          timer_paused_at?: string | null
          timer_started_at?: string | null
          tournament_id?: string | null
          updated_at?: string
          winner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      score_events: {
        Row: {
          action_type: string
          created_at: string
          id: string
          match_id: string
          new_value: string | null
          operator_id: string | null
          player_side: string | null
          previous_value: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          match_id: string
          new_value?: string | null
          operator_id?: string | null
          player_side?: string | null
          previous_value?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          match_id?: string
          new_value?: string | null
          operator_id?: string | null
          player_side?: string | null
          previous_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "score_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      themes: {
        Row: {
          accent_color: string
          background_opacity: number | null
          background_url: string | null
          created_at: string
          created_by: string | null
          custom_css: string | null
          font_family: string | null
          id: string
          is_preset: boolean
          left_player_color: string
          logo_url: string | null
          primary_color: string
          right_player_color: string
          secondary_color: string
          text_color: string
          theme_name: string
          updated_at: string
        }
        Insert: {
          accent_color?: string
          background_opacity?: number | null
          background_url?: string | null
          created_at?: string
          created_by?: string | null
          custom_css?: string | null
          font_family?: string | null
          id?: string
          is_preset?: boolean
          left_player_color?: string
          logo_url?: string | null
          primary_color?: string
          right_player_color?: string
          secondary_color?: string
          text_color?: string
          theme_name: string
          updated_at?: string
        }
        Update: {
          accent_color?: string
          background_opacity?: number | null
          background_url?: string | null
          created_at?: string
          created_by?: string | null
          custom_css?: string | null
          font_family?: string | null
          id?: string
          is_preset?: boolean
          left_player_color?: string
          logo_url?: string | null
          primary_color?: string
          right_player_color?: string
          secondary_color?: string
          text_color?: string
          theme_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      tournaments: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          logo_url: string | null
          organizer_name: string | null
          poster_url: string | null
          theme_id: string | null
          tournament_name: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          logo_url?: string | null
          organizer_name?: string | null
          poster_url?: string | null
          theme_id?: string | null
          tournament_name: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          logo_url?: string | null
          organizer_name?: string | null
          poster_url?: string | null
          theme_id?: string | null
          tournament_name?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "operator"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "operator"],
    },
  },
} as const
