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
      businesses: {
        Row: {
          city: string | null
          created_at: string | null
          goal: string | null
          id: string
          location: string | null
          logo_url: string | null
          name: string | null
          neighbourhood: string | null
          type: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          goal?: string | null
          id?: string
          location?: string | null
          logo_url?: string | null
          name?: string | null
          neighbourhood?: string | null
          type: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string | null
          goal?: string | null
          id?: string
          location?: string | null
          logo_url?: string | null
          name?: string | null
          neighbourhood?: string | null
          type?: string
          user_id?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          business_id: string | null
          created_at: string | null
          id: string
          messages: Json | null
          user_id: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          id?: string
          messages?: Json | null
          user_id: string
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          id?: string
          messages?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          plan: Database["public"]["Enums"]["subscription_plan"] | null
          updated_at: string | null
          video_credits: number | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          plan?: Database["public"]["Enums"]["subscription_plan"] | null
          updated_at?: string | null
          video_credits?: number | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"] | null
          updated_at?: string | null
          video_credits?: number | null
        }
        Relationships: []
      }
      variation_memory: {
        Row: {
          business_id: string
          id: string
          last_3_archetypes: Json | null
          last_3_openers: Json | null
          last_3_scripts: Json | null
          last_3_tones: Json | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          id?: string
          last_3_archetypes?: Json | null
          last_3_openers?: Json | null
          last_3_scripts?: Json | null
          last_3_tones?: Json | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          id?: string
          last_3_archetypes?: Json | null
          last_3_openers?: Json | null
          last_3_scripts?: Json | null
          last_3_tones?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "variation_memory_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          archetype_used: string | null
          asset_urls: Json | null
          business_id: string | null
          created_at: string | null
          duration_seconds: number | null
          final_video_url: string | null
          id: string
          mode: Database["public"]["Enums"]["video_mode"]
          opening_line: string | null
          output_url: string | null
          platform: Database["public"]["Enums"]["platform_format"] | null
          render_error: string | null
          render_status: string
          rendered_at: string | null
          script_text: string | null
          status: Database["public"]["Enums"]["video_status"] | null
          stock_urls: Json | null
          thumbnail_url: string | null
          tone_used: string | null
          user_id: string
        }
        Insert: {
          archetype_used?: string | null
          asset_urls?: Json | null
          business_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          final_video_url?: string | null
          id?: string
          mode: Database["public"]["Enums"]["video_mode"]
          opening_line?: string | null
          output_url?: string | null
          platform?: Database["public"]["Enums"]["platform_format"] | null
          render_error?: string | null
          render_status?: string
          rendered_at?: string | null
          script_text?: string | null
          status?: Database["public"]["Enums"]["video_status"] | null
          stock_urls?: Json | null
          thumbnail_url?: string | null
          tone_used?: string | null
          user_id: string
        }
        Update: {
          archetype_used?: string | null
          asset_urls?: Json | null
          business_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          final_video_url?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["video_mode"]
          opening_line?: string | null
          output_url?: string | null
          platform?: Database["public"]["Enums"]["platform_format"] | null
          render_error?: string | null
          render_status?: string
          rendered_at?: string | null
          script_text?: string | null
          status?: Database["public"]["Enums"]["video_status"] | null
          stock_urls?: Json | null
          thumbnail_url?: string | null
          tone_used?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "videos_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      platform_format:
        | "tiktok"
        | "instagram_reels"
        | "youtube_shorts"
        | "facebook_reels"
        | "instagram_square"
        | "youtube"
        | "facebook"
      subscription_plan: "free" | "starter" | "growth" | "agency"
      video_mode: "quick" | "advanced" | "upload"
      video_status: "pending" | "generating" | "complete" | "failed"
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
      platform_format: [
        "tiktok",
        "instagram_reels",
        "youtube_shorts",
        "facebook_reels",
        "instagram_square",
        "youtube",
        "facebook",
      ],
      subscription_plan: ["free", "starter", "growth", "agency"],
      video_mode: ["quick", "advanced", "upload"],
      video_status: ["pending", "generating", "complete", "failed"],
    },
  },
} as const
